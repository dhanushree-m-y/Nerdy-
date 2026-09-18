// NUMBER MYSTERY — a detective case, not a lesson. 14 − ? = 8
import React, { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';
import { AskNumi, AskNumiButton, Reply } from '../../components/AskNumi';
import { Buddy, Numi } from '../../components/characters';
import { Burst, Stars } from '../../components/effects';
import { DropProvider, DropZone, Draggable } from '../../components/dragdrop';
import { Bob, Enter, Highlight, Pop, Shimmer, Squash, Stamp, Sway, Wobble } from '../../components/motion';
import { Scratchpad } from '../../components/Scratchpad';
import { StuckChoice, StuckSheet } from '../../components/sheets';
import { ChunkyButton, Eyebrow, GameBody, Purse, Tap, TopBar } from '../../components/ui';
import { HINT_LADDER, HintKind, Intent, nextRepresentation } from '../../learning/engine';
import { genMystery, newSeed, pickDifficulty } from '../../learning/generator';
import { useSignalTracker, useStuckDetector } from '../../learning/session';
import { finishChallenge } from '../../navigation/flow';
import { RootScreen } from '../../navigation/types';
import { haptic, say } from '../../services/feedback';
import { useGame } from '../../store/game';
import { C, F, Mood, softShadow, T } from '../../theme/tokens';

type ClueId = 'jar' | 'note' | 'crumbs' | 'hole';

type RoundProps = RootScreen<'Mystery'> & { seed: number; onPlayAnother: () => void };

function MysteryRound({ navigation, seed, onPlayAnother }: RoundProps) {
  const grade = useGame(s => s.grade);
  const signals = useGame(s => s.signals);
  const ins = useSafeAreaInsets();
  // This case's numbers: the grade sets how big the batch is, history nudges it.
  const cfg = useMemo(() => genMystery(grade, pickDifficulty(signals, 'subtraction'), seed), [seed]);
  const startConcrete = useMemo(() => ['blocks', 'groups'].includes(nextRepresentation(signals, 'subtraction')), [seed]);
  const TOTAL = cfg.total;
  const LEFT = cfg.left;
  const MISSING = TOTAL - LEFT;
  /**
   * The jar, as things a child can count. Small jars are loose cookies; big jars come in
   * trays of ten plus loose ones, so a grade-4 detective counts by tens instead of
   * tapping 50 times.
   */
  const jarUnits = useMemo(() => {
    if (LEFT <= 12) return Array.from({ length: LEFT }, () => 1);
    return [...Array.from({ length: Math.floor(LEFT / 10) }, () => 10), ...Array.from({ length: LEFT % 10 }, () => 1)];
  }, [LEFT]);
  const recordPractice = useGame(s => s.recordPractice);
  const trk = useSignalTracker('mystery', 'subtraction', `${TOTAL} − ? = ${LEFT}`, 'groups');

  const [clues, setClues] = useState<ClueId[]>([]);
  const [counted, setCounted] = useState<number[]>([]);
  const [inspect, setInspect] = useState<ClueId | null>(null);
  const [missing, setMissing] = useState(0);
  const [coach, setCoach] = useState<{ text: string; mood: Mood }>({ text: 'Detective! Tap around the kitchen. Press and HOLD things to inspect them closely.', mood: 'think' });
  const [hint, setHint] = useState(-1);
  const [highlight, setHighlight] = useState<string[]>([]);
  const [line, setLine] = useState(startConcrete);
  const [solved, setSolved] = useState(false);
  const [reveal, setReveal] = useState(0);
  const [burst, setBurst] = useState(0);
  const [wob, setWob] = useState(0);
  const [voice, setVoice] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [pad, setPad] = useState(false);
  const [boardW, setBoardW] = useState(320);
  const tutor = useRef<'none' | 'ask-jumps'>('none');

  const ready = clues.includes('jar') && clues.includes('note');
  const has = (c: ClueId) => clues.includes(c);

  useStuckDetector({ wrongStreak: trk.wrongStreak, idleMs: ready ? trk.idleMs : 0, paused: voice || stuck || pad || solved, onStuck: () => { haptic.nudge(); setStuck(true); say('Hmm… this case is tricky. Want to crack it together?'); } });

  const addClue = (c: ClueId, text: string) => {
    trk.touch();
    if (has(c)) return;
    haptic.success();
    setClues(cs => [...cs, c]);
    setCoach({ text, mood: 'wow' });
    say(text);
  };
  const countCookie = (i: number) => {
    if (counted.includes(i)) return;
    haptic.tap();
    const next = [...counted, i];
    setCounted(next);
    if (next.length === jarUnits.length) addClue('jar', `${LEFT} cookies left in the jar. Clue found!`);
  };
  const countedSoFar = counted.reduce((a, i) => a + jarUnits[i], 0);

  const solve = () => {
    if (solved) return;
    const got = LEFT + missing;
    if (missing === MISSING) {
      trk.attempt(`${TOTAL}-${missing}=${LEFT}`, true);
      if (!line) trk.strategy('count-on'); else trk.strategy('jump');
      setSolved(true); setVoice(false); haptic.success(); setBurst(b => b + 1);
      say('Case solved!');
      setCoach({ text: `${LEFT} in the jar and ${MISSING} missing makes ${TOTAL}. The culprits: a family of mice! 🐭`, mood: 'wow' });
      [1, 2, 3].forEach(i => setTimeout(() => setReveal(i), 500 + i * 650));
      return;
    }
    trk.attempt(`${TOTAL}-${missing}`, false);
    setWob(w => w + 1);
    setCoach({ text: missing === 0 ? 'The Missing pile is empty. How many cookies vanished? Drag some in!' : got < TOTAL ? `You marked ${missing}. ${LEFT} + ${missing} makes ${got}, but Milo baked ${TOTAL}. A few more went missing!` : `You marked ${missing}. ${LEFT} + ${missing} makes ${got} — that's more than Milo baked (${TOTAL}).`, mood: 'think' });
  };

  const applyHint = (lvl: number) => {
    const kind: HintKind = HINT_LADDER[Math.min(4, lvl)];
    trk.hint(kind); setHint(lvl);
    if (!ready) { setHighlight(has('jar') ? ['note'] : ['jar']); setCoach({ text: has('jar') ? 'Clue: Milo always leaves notes on the fridge.' : 'Clue: hold the cookie jar to look inside.', mood: 'happy' }); return; }
    if (kind === 'gentle') setCoach({ text: `Milo baked ${TOTAL}. ${LEFT} are left. The rest went missing.`, mood: 'happy' });
    if (kind === 'visual') { setHighlight(['jarGroup', 'missing']); setCoach({ text: 'Jar cookies + missing cookies should make the full batch.', mood: 'happy' }); }
    if (kind === 'strategy') { setLine(true); trk.represent('numberLine'); setCoach({ text: `Count up! Start at ${LEFT} and hop to ${TOTAL} on the number line.`, mood: 'happy' }); }
    if (kind === 'guided') { setLine(true); setHighlight(['missing']); setCoach({ text: `Each hop is one missing cookie. Drag one cookie per hop: ${LEFT + 1}, ${LEFT + 2}…`, mood: 'happy' }); }
    if (kind === 'demo') {
      setLine(true); setMissing(0);
      Array.from({ length: MISSING }, (_, i) => setTimeout(() => { setMissing(i + 1); haptic.tap(); }, 400 + i * 380));
      setTimeout(() => setCoach({ text: `${MISSING} hops from ${LEFT} to ${TOTAL}. Now press "Solve the case" to close it!`, mood: 'wow' }), 600 + MISSING * 380);
    }
    say(coachRef.current);
  };
  const coachRef = useRef('');
  coachRef.current = coach.text;

  const onStuck = (c: StuckChoice) => {
    setStuck(false); trk.resetIdle();
    if (c === 'talk') { trk.asked(true); setVoice(true); }
    if (c === 'show') applyHint(Math.max(1, hint + 1));
    if (c === 'objects') { setLine(true); trk.represent('numberLine'); trk.hint('visual'); setCoach({ text: 'Here\'s a number line. Hop from the jar number to the batch number!', mood: 'happy' }); }
    if (c === 'draw') setPad(true);
  };

  const respond = (intent: Intent): Reply => {
    trk.asked(true);
    if (!ready) return { line: has('jar') ? `You counted ${LEFT} in the jar. Now find out how many Milo baked — check the fridge!` : 'Let\'s find clues first. Try holding the cookie jar to look inside.', highlight: [has('jar') ? 'note' : 'jar'], hint: 'gentle' };
    if (intent.kind === 'command' && intent.values.length) return { line: `Putting ${intent.values[0]} cookies in the Missing pile.`, command: intent };
    if (intent.kind === 'answer' && tutor.current === 'ask-jumps') {
      if (intent.n === MISSING) { tutor.current = 'none'; trk.strategy('count-on'); return { line: `You cracked it! ${MISSING} hops, so ${MISSING} cookies are missing. Put them in the Missing pile and solve the case!`, done: true, highlight: ['missing'] }; }
      return { line: `Let's hop together: ${Array.from({ length: Math.min(3, MISSING) }, (_, i) => LEFT + i + 1).join(', ')}… keep going to ${TOTAL}. How many hops?`, expectNumber: true, chips: [String(MISSING - 1), String(MISSING), String(MISSING + 1)], highlight: ['line'] };
    }
    if (intent.kind === 'answer') return { line: intent.n === MISSING ? `${MISSING}? Test it: drag ${MISSING} cookies into the Missing pile and see if it makes ${TOTAL}!` : `Let's test ${intent.n}: ${LEFT} + ${intent.n} = ${LEFT + intent.n}. Milo baked ${TOTAL}. Is that a match?`, highlight: ['missing'] };
    if (intent.kind === 'explain-concept') return { line: `Taking away means some are gone. ${TOTAL} take away the missing ones leaves ${LEFT}. We're finding the missing part!` };
    if (intent.kind === 'another-way') { setLine(true); return { line: `Use the number line: start at ${LEFT}, hop to ${TOTAL}. Each hop is a missing cookie.`, highlight: ['line'], hint: 'visual' }; }
    trk.hint('gentle');
    tutor.current = 'ask-jumps';
    setLine(true);
    return { line: `There were ${TOTAL} cookies. Now there are ${LEFT}. Let's count up from ${LEFT} to ${TOTAL} — how many hops is that?`, highlight: ['line', 'jarGroup'], expectNumber: true, chips: [String(MISSING - 1), String(MISSING), String(MISSING + 1)], hint: 'strategy' };
  };
  const onReply = (r: Reply) => {
    setHighlight(r.highlight ?? []);
    setCoach({ text: r.line, mood: r.done ? 'wow' : 'think' });
    if (r.hint) setHint(h => Math.max(h, HINT_LADDER.indexOf(r.hint!)));
    if (r.command?.kind === 'command') {
      const v = Math.min(20, r.command.values[0] ?? 0);
      setMissing(0);
      Array.from({ length: v }, (_, i) => setTimeout(() => setMissing(i + 1), 400 + i * 200));
    }
    if (r.done) setTimeout(() => setVoice(false), 3800);
  };

  const finish = () => finishChallenge(navigation, 'mystery', trk.finish(), { suggested: line ? 'jump' : 'count-on' });

  const cards: { id: ClueId; icon: string; text: string }[] = [
    { id: 'note', icon: '📝', text: `Note: "Baked ${TOTAL} cookies!"` },
    { id: 'jar', icon: '🫙', text: `Jar: only ${LEFT} left` },
    { id: 'crumbs', icon: '👣', text: 'Crumbs lead to the wall' },
    { id: 'hole', icon: '🕳️', text: 'Tiny squeaks inside…' },
  ];
  const found = cards.filter(c => has(c.id));

  return (
    <DropProvider>
      <View style={{ flex: 1, backgroundColor: C.dusk }}>
        <GameBody>
        <Stars count={10} />
        <View style={{ paddingTop: ins.top + 8, paddingHorizontal: 20 }}>
          <TopBar dark back="← Map" title={`CASE FILE #${TOTAL}`} right={<><Purse /><AskNumiButton onPress={() => { trk.asked(true); setVoice(true); }} glowing={trk.wrongStreak > 0 && !voice} /></>} />
        </View>

        {/* kitchen scene */}
        <View style={{ height: 176, marginHorizontal: 16, marginTop: 8, borderRadius: 26, overflow: 'hidden', backgroundColor: '#4a4262' }}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 44, backgroundColor: '#5a4a66' }} />
          <View style={{ position: 'absolute', bottom: 44, left: 0, right: 0, height: 14, backgroundColor: '#6f5f7d' }} />
          <Shimmer style={{ position: 'absolute', top: -30, left: 80, width: 140, height: 140, borderRadius: 70, backgroundColor: C.sun }} min={0.04} max={0.12} duration={2600} />
          {/* fridge with note */}
          <View style={{ position: 'absolute', left: 14, bottom: 44, width: 64, height: 112, borderRadius: 10, backgroundColor: '#dfe7ea' }}>
            <View style={{ height: 3, backgroundColor: '#b7c3c8', marginTop: 40 }} />
            <Highlight active={highlight.includes('note')} style={{ position: 'absolute', left: 16, top: 12 }}>
              <Tap onPress={() => setInspect('note')} onLongPress={() => setInspect('note')} a11y="Inspect the note on the fridge">
                <Sway deg={4} duration={1800}><View style={{ width: 30, height: 26, backgroundColor: has('note') ? C.sun : '#fff7c7', borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 14 }}>📝</Text></View></Sway>
              </Tap>
            </Highlight>
          </View>
          {/* jar */}
          <Highlight active={highlight.includes('jar')} style={{ position: 'absolute', left: 110, bottom: 56 }}>
            <Tap onPress={() => setInspect('jar')} onLongPress={() => setInspect('jar')} a11y="Inspect the cookie jar">
              <View style={{ width: 64, height: 74, borderRadius: 16, backgroundColor: 'rgba(191,227,239,.35)', borderWidth: 4, borderColor: 'rgba(253,245,232,.7)', alignItems: 'center', justifyContent: 'flex-end', padding: 4 }}>
                <View style={{ position: 'absolute', top: -10, width: 44, height: 12, borderRadius: 4, backgroundColor: C.coral }} />
                <Text style={{ fontSize: 11, textAlign: 'center' }}>{'🍪'.repeat(Math.min(LEFT, 6))}</Text>
              </View>
            </Tap>
          </Highlight>
          {/* crumbs */}
          <Tap onPress={() => addClue('crumbs', 'Crumbs! They lead toward the wall…')} a11y="Inspect the crumbs" style={{ position: 'absolute', left: 190, bottom: 12, flexDirection: 'row', gap: 10, padding: 6 }}>
            {[0, 1, 2].map(i => <Text key={i} style={{ fontSize: 12, opacity: has('crumbs') ? 1 : 0.55 }}>🟤</Text>)}
          </Tap>
          {/* mouse hole */}
          <Tap onPress={() => (has('crumbs') ? addClue('hole', 'Squeak! Something small lives in there…') : setCoach({ text: 'A dark little hole. Hmm, anything leading to it?', mood: 'think' }))} a11y="Inspect the hole in the wall" style={{ position: 'absolute', right: 18, bottom: 44, width: 44, height: 34, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#241f33', alignItems: 'center', justifyContent: 'flex-end' }}>
            {solved && <Bob amp={3} duration={500}><Text style={{ fontSize: 16 }}>🐭</Text></Bob>}
          </Tap>
          <Buddy id="milo" size={58} mood={solved ? 'happy' : 'wow'} cheering={solved} style={{ position: 'absolute', right: 70, bottom: 30 }} />
          <Bob amp={5} duration={1100} style={{ position: 'absolute', right: 10, top: 8 }}><Text style={{ fontSize: 26 }}>🔍</Text></Bob>
        </View>

        {/* detective board */}
        <Wobble trigger={wob} style={{ marginHorizontal: 16, marginTop: 10 }}>
          <View onLayout={(e: LayoutChangeEvent) => setBoardW(e.nativeEvent.layout.width)} style={{ backgroundColor: '#b98b55', borderRadius: 22, padding: 10, borderWidth: 5, borderColor: '#8c6436', minHeight: 170 }}>
            <Svg width={boardW} height={60} style={{ position: 'absolute', top: 10, left: 0 }} pointerEvents="none">
              {found.slice(1).map((_, i) => <Line key={i} x1={40 + i * ((boardW - 60) / 3)} y1={24} x2={40 + (i + 1) * ((boardW - 60) / 3)} y2={24 + (i % 2 ? -6 : 8)} stroke="#d0342c" strokeWidth={2.5} />)}
            </Svg>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {cards.map(c => (
                <View key={c.id} style={{ flex: 1 }}>
                  {has(c.id) ? (
                    <Pop>
                      <View style={{ backgroundColor: '#fffaf0', borderRadius: 6, padding: 5, minHeight: 58, transform: [{ rotate: `${c.id.length % 2 ? -3 : 3}deg` }] }}>
                        <View style={{ position: 'absolute', top: -4, alignSelf: 'center', width: 10, height: 10, borderRadius: 5, backgroundColor: '#d0342c' }} />
                        <Text style={{ fontSize: 15, textAlign: 'center' }}>{c.icon}</Text>
                        <Text style={{ fontFamily: F.bodyHeavy, fontSize: 9.5, lineHeight: 12, color: C.ink, textAlign: 'center' }}>{c.text}</Text>
                      </View>
                    </Pop>
                  ) : (
                    <View style={{ borderRadius: 6, minHeight: 58, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(253,245,232,.5)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: F.display, fontSize: 18, color: 'rgba(253,245,232,.6)' }}>?</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {ready ? (
              <Enter>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 28, color: C.cream }}>{TOTAL} − </Text>
                  <View style={{ minWidth: 44, height: 40, borderRadius: 10, backgroundColor: solved ? C.teal : C.coral, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 26, color: C.cream }}>{solved && reveal >= 1 ? MISSING : '?'}</Text>
                  </View>
                  <Text style={{ fontFamily: F.display, fontSize: 28, color: C.cream }}> = {LEFT}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <Highlight active={highlight.includes('jarGroup')} style={{ flex: 1 }}>
                    <View style={{ backgroundColor: 'rgba(253,245,232,.9)', borderRadius: 14, padding: 6, minHeight: 64 }}>
                      <Text style={[T.eyebrow, { fontSize: 9 }]}>IN THE JAR · {LEFT}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>{jarUnits.map((u, i) => u === 10
                        ? <View key={i} style={{ backgroundColor: '#c98a4a', borderRadius: 5, paddingHorizontal: 3 }}><Text style={{ fontFamily: F.bodyHeavy, fontSize: 9.5, color: C.cream }}>🍪×10</Text></View>
                        : <Text key={i} style={{ fontSize: 13 }}>🍪</Text>)}</View>
                    </View>
                  </Highlight>
                  <DropZone id="missing" pad={16} style={{ flex: 1 }}>
                    <Highlight active={highlight.includes('missing')}>
                      <View style={{ backgroundColor: 'rgba(253,245,232,.9)', borderRadius: 14, padding: 6, minHeight: 64, borderWidth: 2, borderStyle: 'dashed', borderColor: C.coral }}>
                        <Text style={[T.eyebrow, { fontSize: 9, color: C.coralDeep }]}>MISSING · {missing}</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                          {Array.from({ length: missing }, (_, i) => (
                            <Tap key={i} onPress={() => { trk.touch(); setMissing(m => Math.max(0, m - 1)); }} a11y="Remove a missing cookie">
                              <Squash trigger={1}><Text style={{ fontSize: 13, opacity: 0.6 }}>🍪</Text></Squash>
                            </Tap>
                          ))}
                        </View>
                      </View>
                    </Highlight>
                  </DropZone>
                </View>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12, color: C.cream, textAlign: 'center', marginTop: 4 }}>{LEFT} + {missing} = {LEFT + missing}{LEFT + missing === TOTAL ? '  ← matches the note!' : ''}</Text>
              </Enter>
            ) : (
              <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12.5, color: C.cream, textAlign: 'center', marginTop: 14 }}>Find the note and count the jar to open the case.</Text>
            )}
            <Burst trigger={burst} x={boardW / 2} y={90} count={22} dist={140} />
          </View>
        </Wobble>

        {line && ready && (
          <Highlight active={highlight.includes('line')} style={{ marginHorizontal: 16, marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', backgroundColor: 'rgba(253,245,232,.1)', borderRadius: 14, padding: 8 }}>
              {Array.from({ length: TOTAL - LEFT + 1 }, (_, i) => {
                const n = LEFT + i;
                const hopped = i > 0 && i <= missing;
                return (
                  <View key={n} style={{ alignItems: 'center', flex: 1 }}>
                    {hopped ? <Pop><Text style={{ fontSize: 10, color: C.sun }}>⌒</Text></Pop> : <Text style={{ fontSize: 10, color: 'transparent' }}>⌒</Text>}
                    <View style={{ width: 2, height: 8, backgroundColor: C.cream }} />
                    <Text style={{ fontFamily: F.bodyHeavy, fontSize: 10, color: i === 0 || n === TOTAL ? C.sun : C.cream }}>{n}</Text>
                  </View>
                );
              })}
            </View>
          </Highlight>
        )}

        {solved && (
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            {reveal >= 2 && <Pop><Text style={{ fontFamily: F.display, fontSize: 26, color: C.sun }}>{TOTAL} − {MISSING} = {LEFT}</Text></Pop>}
            {reveal >= 3 && (
              <Stamp rotate={-6}>
                <View style={{ borderWidth: 4, borderColor: C.coral, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 2, backgroundColor: 'rgba(239,106,79,.12)' }}>
                  <Text style={{ fontFamily: F.display, fontSize: 30, color: C.coral }}>CASE SOLVED!</Text>
                </View>
              </Stamp>
            )}
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, marginTop: 8 }}>
          <Numi size={48} mood={coach.mood} state={solved ? 'celebrate' : 'idle'} />
          <View style={{ flex: 1, backgroundColor: 'rgba(253,245,232,.12)', borderRadius: 18, padding: 10 }}>
            <Text style={{ fontFamily: F.bodyBold, fontSize: 13, lineHeight: 18, color: C.cream }}>{coach.text}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }} />

        {solved ? (
          <View style={{ paddingHorizontal: 20, paddingBottom: ins.bottom + 16, flexDirection: 'row', gap: 10 }}>
            <ChunkyButton style={{ flex: 1 }} size="md" icon="🔁" label="New case" color={C.violet} shadow={C.violetDeep} a11y="Open a new case with new numbers" onPress={() => { recordPractice(trk.finish()); onPlayAnother(); }} />
            <ChunkyButton style={{ flex: 1 }} size="md" label="Close the case" color={C.sun} shadow={C.sunDeep} textColor={C.ink} onPress={finish} />
          </View>
        ) : (
          <View style={[{ backgroundColor: '#2d2940', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 10, paddingBottom: ins.bottom + 10 }, softShadow(0.2, -6)]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Eyebrow color="rgba(253,245,232,.55)" style={{ flex: 1 }}>{ready ? 'DRAG COOKIES INTO "MISSING"' : 'EVIDENCE KIT'}</Eyebrow>
              <Tap onPress={() => setPad(true)} a11y="Scratchpad" style={{ backgroundColor: 'rgba(253,245,232,.14)', borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10 }}><Text style={{ fontSize: 15 }}>✏️</Text></Tap>
              <Tap onPress={() => { setLine(l => !l); trk.represent('numberLine'); }} a11y="Number line" style={{ backgroundColor: line ? C.sun : 'rgba(253,245,232,.14)', borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10 }}><Text style={{ fontSize: 15 }}>📏</Text></Tap>
              <Tap onPress={() => applyHint(hint + 1)} a11y="Hint" style={{ backgroundColor: C.violet, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10 }}><Text style={{ fontSize: 15 }}>💡</Text></Tap>
            </View>
            {ready && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Draggable key={`${i}-${missing}`} id={`c${i}`} a11y="Cookie for the Missing pile" onTap={() => { trk.touch(); haptic.tap(); setMissing(m => m + 1); }} onDrop={z => (z === 'missing' ? (trk.touch(), setMissing(m => m + 1), 'accept') : 'ignore')}>
                      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(253,245,232,.12)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 26 }}>🍪</Text></View>
                    </Draggable>
                  ))}
                </View>
                <ChunkyButton size="md" label="Solve!" icon="🔍" color={C.sun} shadow={C.sunDeep} textColor={C.ink} onPress={solve} />
              </View>
            )}
          </View>
        )}

        {/* inspect overlay (hold to inspect) */}
        {inspect && (
          <Pressable onPress={() => setInspect(null)} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(20,16,30,.78)', alignItems: 'center', justifyContent: 'center', padding: 24 }} accessibilityLabel="Close inspector">
            <Pop>
              <View style={{ width: 290, borderRadius: 150, aspectRatio: 1, backgroundColor: inspect === 'jar' ? '#5b6d7a' : '#fff7c7', borderWidth: 12, borderColor: '#6b5a4a', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
                {inspect === 'jar' ? (
                  <>
                    <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12, color: C.cream, marginBottom: 8, textAlign: 'center' }}>{LEFT > 12 ? 'TAP EACH TRAY (10) AND EACH COOKIE' : 'TAP EACH COOKIE TO COUNT'}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, width: 210 }}>
                      {jarUnits.map((u, i) => {
                        const on = counted.includes(i);
                        const upTo = counted.slice(0, counted.indexOf(i) + 1).reduce((a, k) => a + jarUnits[k], 0);
                        return u === 10 ? (
                          <Tap key={i} onPress={() => countCookie(i)} a11y={`Tray of ten, number ${i + 1}`} style={{ width: 62, height: 40, borderRadius: 10, backgroundColor: on ? C.sun : 'rgba(253,245,232,.18)', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 12 }}>🍪🍪🍪🍪🍪</Text>
                            <Text style={{ fontSize: 12, marginTop: -3 }}>🍪🍪🍪🍪🍪</Text>
                            {on && <Text style={{ position: 'absolute', bottom: -6, right: -2, fontFamily: F.display, fontSize: 13, color: C.cream }}>{upTo}</Text>}
                          </Tap>
                        ) : (
                          <Tap key={i} onPress={() => countCookie(i)} a11y={`Cookie ${i + 1}`} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: on ? C.sun : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 24 }}>🍪</Text>
                            {on && <Text style={{ position: 'absolute', bottom: -4, right: -2, fontFamily: F.display, fontSize: 13, color: C.cream }}>{upTo}</Text>}
                          </Tap>
                        );
                      })}
                    </View>
                    <Text style={{ fontFamily: F.display, fontSize: 22, color: C.cream, marginTop: 8 }}>{countedSoFar} counted</Text>
                  </>
                ) : (
                  <Tap onPress={() => { addClue('note', `Milo's note says he baked ${TOTAL} cookies this morning!`); setInspect(null); }} a11y="Read the note">
                    <Text style={{ fontFamily: F.display, fontSize: 16, color: C.muted, textAlign: 'center' }}>Milo's note</Text>
                    <Text style={{ fontFamily: F.display, fontSize: 30, color: C.ink, textAlign: 'center', transform: [{ rotate: '-4deg' }] }}>Baked {TOTAL} cookies! 🍪</Text>
                    <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12, color: C.coralDeep, textAlign: 'center', marginTop: 10 }}>TAP TO PIN THIS CLUE</Text>
                  </Tap>
                )}
              </View>
            </Pop>
            <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12, color: 'rgba(253,245,232,.7)', marginTop: 16 }}>Tap outside to close</Text>
          </Pressable>
        )}

        </GameBody>
        <AskNumi open={voice} onClose={() => { setVoice(false); trk.resetIdle(); }} respond={respond} onReply={onReply}
          opener={ready ? `Jar: ${LEFT}. Note: ${TOTAL}. What are you thinking, detective?` : 'What have you found so far, detective?'}
          chips={["I don't understand", 'How many are missing?', 'Show me another way', 'Give me a clue']}
          style={{ position: 'absolute', left: 12, right: 12, bottom: ins.bottom + 10 }} />
        <StuckSheet open={stuck} onChoose={onStuck} onClose={() => { setStuck(false); trk.resetIdle(); }} />
        <Scratchpad open={pad} onClose={() => { setPad(false); trk.resetIdle(); }} title={`${TOTAL} − ? = ${LEFT}`} />
      </View>
    </DropProvider>
  );
}

/** Endless cases: "New case" remounts with a fresh seed, fresh clues and a fresh tracker. */
export default function Mystery(props: RootScreen<'Mystery'>) {
  const [round, setRound] = useState(() => ({ n: 0, seed: newSeed() }));
  return <MysteryRound key={round.n} {...props} seed={round.seed} onPlayAnother={() => setRound(r => ({ n: r.n + 1, seed: newSeed() }))} />;
}
