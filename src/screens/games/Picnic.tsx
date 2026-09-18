// DIVISION PICNIC — sharing fairly, one strawberry at a time.
import React, { useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AskNumi, AskNumiButton, Reply } from '../../components/AskNumi';
import { Buddy, Numi } from '../../components/characters';
import { Burst } from '../../components/effects';
import { DropProvider, DropZone, Draggable } from '../../components/dragdrop';
import { Bob, Enter, Highlight, Pop, Squash, Wobble } from '../../components/motion';
import { Mountain } from '../../components/scenery';
import { Scratchpad } from '../../components/Scratchpad';
import { StuckChoice, StuckSheet } from '../../components/sheets';
import { AutoScale, ChunkyButton, Eyebrow, GameBody, Purse, Tap, TopBar, useFitScale } from '../../components/ui';
import { CharacterId } from '../../data/world';
import { HINT_LADDER, HintKind, Intent, nextRepresentation } from '../../learning/engine';
import { genPicnic, lastKindOf, newSeed, pickDifficulty, tagKind } from '../../learning/generator';
import { ReplayFrame, useSignalTracker, useStuckDetector } from '../../learning/session';
import { finishChallenge } from '../../navigation/flow';
import { RootScreen } from '../../navigation/types';
import { haptic, say } from '../../services/feedback';
import { useGame } from '../../store/game';
import { C, F, Mood, softShadow, T } from '../../theme/tokens';

/** Most strawberries the bowl draws at once; the rest show as "+N more". */
const BOWL_SHOWN = 14;

const FRIENDS: CharacterId[] = ['nia', 'milo', 'pip', 'nova', 'zuri'];

type RoundProps = RootScreen<'Picnic'> & { seed: number; twin: boolean; onPlayAnother: () => void; onTwin: () => void };

function PicnicRound({ navigation, seed, twin, onPlayAnother, onTwin }: RoundProps) {
  const grade = useGame(s => s.grade);
  const signals = useGame(s => s.signals);
  const ins = useSafeAreaInsets();
  // Short phones draw the main scene smaller so the pieces stay on screen.
  const fit = useFitScale();
  // This round's sharing problem: grade sets the numbers (and whether leftovers appear),
  // history nudges them, and the kind never repeats back-to-back.
  const cfg = useMemo(() => genPicnic(grade, pickDifficulty(signals, 'division'), seed, lastKindOf(signals, 'picnic')), [seed]);
  const startConcrete = useMemo(() => ['blocks', 'groups'].includes(nextRepresentation(signals, 'division')), [seed]);
  const N = cfg.total;
  const F_ = cfg.friends;
  const each = cfg.each;
  /** Strawberries that can't be shared fairly (a remainder). 0 in an exact share. */
  const REST = cfg.rest;
  const crowded = F_ >= 4;
  const recordPractice = useGame(s => s.recordPractice);
  const trk = useSignalTracker('picnic', 'division', tagKind(cfg.kind, REST ? `${N} ÷ ${F_} = ${each} r ${REST}` : `${N} ÷ ${F_}`), 'groups');

  const [plates, setPlates] = useState<number[]>(Array(F_).fill(0));
  const [coach, setCoach] = useState<{ text: string; mood: Mood }>({
    text: twin
      ? `Your turn! ${N} strawberries, ${F_} friends — make it fair all on your own.`
      : REST
        ? `${N} strawberries, ${F_} friends. Share them fairly — if some can't be shared, they stay in the bowl.`
        : `${N} strawberries, ${F_} friends. Drag them onto the plates so it's fair!`,
    mood: 'happy',
  });
  const [hint, setHint] = useState(-1);
  const [slots, setSlots] = useState(startConcrete);
  // Big shares (grade 3+) start with "Deal a round" so the child skip-counts instead of tapping 40 times.
  const [dealBtn, setDealBtn] = useState(N > 20);
  const [highlight, setHighlight] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [reveal, setReveal] = useState(0);
  const [burst, setBurst] = useState(0);
  const [wob, setWob] = useState(0);
  const [voice, setVoice] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [pad, setPad] = useState(false);
  const [demo, setDemo] = useState(false);
  const frames = useRef<ReplayFrame[]>([]);
  const tutor = useRef<'none' | 'ask-round' | 'ask-rounds'>('none');

  const used = plates.reduce((a, b) => a + b, 0);
  const bowl = N - used;
  const fair = bowl === REST && plates.every(p => p === each);
  const friends = FRIENDS.slice(0, F_);

  useStuckDetector({ wrongStreak: trk.wrongStreak, idleMs: trk.idleMs, paused: voice || stuck || pad || solved || demo, onStuck: () => { haptic.nudge(); setStuck(true); say('Hmm… this one\'s tricky. Want to solve it together?'); } });

  const check = (next: number[]) => {
    const left = N - next.reduce((a, b) => a + b, 0);
    const equal = next.every(p => p === next[0]);
    if (REST > 0 && left > 0) {
      // Fair AND nobody can get one more: that's the answer, leftovers and all.
      if (left < F_ && equal) return win(next);
      if (left < F_) setCoach({ text: `Only ${left} left in the bowl — not enough for everyone to get one more. Are the plates equal?`, mood: 'think' });
      return;
    }
    if (left > 0) return;
    if (equal && next[0] === each) return win(next);
    trk.attempt(next.join('/'), false);
    setWob(w => w + 1);
    if (!frames.current.length) frames.current.push({ label: 'FIRST TRY', groups: next, say: `You shared them as ${next.join(', ')} — some friends had more than others.`, tone: 'first' });
    const hi = Math.max(...next), lo = Math.min(...next);
    const a = friends[next.indexOf(hi)], b = friends[next.indexOf(lo)];
    setCoach({ text: `${cap(b)} has ${lo}, ${cap(a)} has ${hi} — that's not fair yet! Tap a strawberry on a plate to move it.`, mood: 'worried' });
  };

  const platesRef = useRef(plates);
  platesRef.current = plates;
  const give = (k: number, silent = false) => {
    const ps = platesRef.current;
    if (solvedRef.current || N - ps.reduce((a, b) => a + b, 0) <= 0) return false;
    const next = ps.slice(); next[k] += 1;
    platesRef.current = next;
    setPlates(next);
    check(next);
    trk.touch();
    if (!silent) haptic.snap();
    return true;
  };
  const solvedRef = useRef(false);
  solvedRef.current = solved;
  const takeBack = (k: number) => {
    if (solved || plates[k] === 0) return;
    haptic.tap(); trk.touch();
    const next = plates.slice(); next[k] -= 1;
    if (frames.current.length === 1) frames.current.push({ label: 'THE MOMENT', groups: next, say: 'You noticed it wasn\'t fair and started moving strawberries around.', tone: 'change' });
    setPlates(next);
    setCoach({ text: `Moved one back to the bowl. ${cap(friends[k])} has ${next[k]} now.`, mood: 'happy' });
  };
  const giveFewest = () => {
    const ps = platesRef.current;
    give(ps.indexOf(Math.min(...ps)));
  };
  const dealRound = () => {
    if (bowl < F_) return;
    friends.forEach((_, k) => setTimeout(() => give(k), k * 220));
    setCoach({ text: `One round dealt — that used ${F_}. Keep going!`, mood: 'happy' });
  };

  const win = (final: number[]) => {
    solvedRef.current = true;
    setSolved(true); setVoice(false);
    trk.attempt(final.join('/'), true);
    haptic.success(); setBurst(b => b + 1);
    if (frames.current.length) frames.current.push({ label: 'FINAL', groups: final, say: REST ? `${N} shared ${F_} ways is ${each} each, with ${REST} left over.` : `${N} shared ${F_} ways is ${each} each. Equal groups, every time.`, tone: 'final' });
    const line = REST
      ? `Everyone has ${each}, and ${REST} ${REST === 1 ? 'is' : 'are'} left over — not enough for everyone, so ${REST === 1 ? 'it stays' : 'they stay'} in the bowl. Fair!`
      : `Everyone has ${each}! That's a fair picnic.`;
    setCoach({ text: line, mood: 'wow' });
    say(line);
    [1, 2, 3].forEach(i => setTimeout(() => setReveal(i), 700 + i * 700));
  };

  const reset = () => { platesRef.current = Array(F_).fill(0); setPlates(platesRef.current); trk.touch(); };

  const applyHint = (lvl: number) => {
    const kind: HintKind = HINT_LADDER[Math.min(4, lvl)];
    trk.hint(kind); setHint(lvl);
    if (kind === 'gentle') setCoach({ text: REST ? 'Fair means every friend gets the same number — even if a few are left over.' : 'Fair means every friend gets the same number.', mood: 'happy' });
    if (kind === 'visual') { setSlots(true); setCoach({ text: 'See the empty spots on each plate? Fill them all.', mood: 'happy' }); }
    if (kind === 'strategy') setCoach({ text: 'Try dealing: one for Nia, one for Milo… round and round!', mood: 'happy' });
    if (kind === 'guided') { setDealBtn(true); setCoach({ text: 'Tap "Deal a round" and count how many rounds you can do.', mood: 'happy' }); }
    if (kind === 'demo') runDemo();
  };
  const runDemo = () => {
    setDemo(true); reset();
    setCoach({ text: `Watch: I'll deal one to each friend, round and round…`, mood: 'think' });
    let t = 400;
    for (let r = 0; r < each; r++) friends.forEach((_, k) => { setTimeout(() => setPlates(ps => { const n = ps.slice(); n[k] += 1; return n; }), t); t += 180; });
    setTimeout(() => { setCoach({ text: `${each} rounds, so ${each} each${REST ? `, and ${REST} left over` : ''}! Now a twin picnic — your turn.`, mood: 'wow' }); say(`${each} each${REST ? `, and ${REST} left over` : ''}! Now you try a twin picnic on your own.`); }, t + 200);
    setTimeout(onTwin, t + 3600);
  };

  const onStuck = (c: StuckChoice) => {
    setStuck(false); trk.resetIdle();
    if (c === 'talk') { trk.asked(true); setVoice(true); }
    if (c === 'show') applyHint(Math.max(1, hint + 1));
    if (c === 'objects') { setSlots(true); trk.represent('groups'); trk.hint('visual'); setCoach({ text: 'Each plate now shows spots. One strawberry per spot!', mood: 'happy' }); }
    if (c === 'draw') setPad(true);
  };

  const respond = (intent: Intent): Reply => {
    trk.asked(true);
    const ids = friends.map((_, k) => `plate${k}`);
    if (intent.kind === 'command' && (intent.action === 'share' || intent.action === 'use')) {
      const v = intent.values[0] ?? 1;
      if (v * F_ > N) return { line: `${v} each would need ${v * F_} strawberries — we only have ${N}. Try a smaller number?`, highlight: ['bowl'] };
      return { line: `Giving ${v} to everyone!`, command: intent };
    }
    if (intent.kind === 'command' && intent.action === 'remove') return { line: 'Putting them all back in the bowl.', command: intent };
    if (intent.kind === 'answer' && tutor.current === 'ask-round') {
      if (intent.n === F_) { tutor.current = 'ask-rounds'; return { line: `Yes! Each round uses ${F_}. We have ${N}. How many rounds can we deal?`, expectNumber: true, chips: [String(each - 1), String(each), String(each + 1)], highlight: ['bowl'], hint: 'strategy' }; }
      return { line: `Count the friends: ${friends.map(cap).join(', ')}. One each — how many is that?`, highlight: ids, expectNumber: true, chips: [String(F_ - 1), String(F_), String(F_ + 1)] };
    }
    if (intent.kind === 'answer' && tutor.current === 'ask-rounds') {
      if (intent.n === each) { tutor.current = 'none'; trk.strategy('groups'); setDealBtn(true); return { line: `You found it! ${each} rounds means ${each} each. Deal them out and watch!`, done: true, highlight: ids }; }
      return { line: `Let's count by ${F_}s: ${Array.from({ length: each }, (_, i) => (i + 1) * F_).join(', ')}. How many jumps fit into ${N}?`, expectNumber: true, chips: [String(each - 1), String(each), String(each + 1)] };
    }
    if (intent.kind === 'answer' && intent.n === each) return { line: `${each} for each friend? Let's check — give ${each} to everyone and see if the bowl is empty!`, highlight: ids };
    if (intent.kind === 'explain-concept') return { line: REST ? `Dividing means sharing into equal groups. When some can't be shared fairly, they're the remainder — they stay in the bowl.` : `Dividing means sharing into equal groups. ${N} strawberries into ${F_} equal groups.`, highlight: ids };
    if (intent.kind === 'why-wrong') return { line: bowl ? `Nothing's wrong — there are still ${bowl} in the bowl.` : `The plates have ${plates.join(', ')}. They aren't all the same yet — that's the only thing to fix.`, highlight: ids };
    if (intent.kind === 'another-way') { setSlots(true); return { line: `Look at the spots on each plate — fill every spot, one friend at a time.`, highlight: ids, hint: 'visual' }; }
    trk.hint('gentle');
    if (used > 0) {
      return { line: `Right now: ${plates.map((p, k) => `${cap(friends[k])} ${p}`).join(', ')}, and ${bowl} in the bowl. Fair means everyone ends with the same. Who needs one next?`, highlight: [...ids, 'bowl'], hint: 'gentle', chips: ['Give me a clue', 'Show me another way', `Give ${each} to everyone`] };
    }
    tutor.current = 'ask-round';
    return { line: `We have ${N} strawberries and ${F_} hungry friends. Let's deal one to each friend. How many strawberries does one round use?`, highlight: [...ids, 'bowl'], expectNumber: true, chips: [String(F_ - 1), String(F_), String(F_ + 1)], hint: 'gentle' };
  };

  const onReply = (r: Reply) => {
    setHighlight(r.highlight ?? []);
    setCoach({ text: r.line, mood: r.done ? 'wow' : 'happy' });
    if (r.hint) setHint(h => Math.max(h, HINT_LADDER.indexOf(r.hint!)));
    const c = r.command;
    if (c?.kind === 'command') {
      if (c.action === 'remove') setTimeout(reset, 400);
      else {
        const v = c.values[0] ?? 1;
        const target = Array(F_).fill(v);
        let t = 400;
        platesRef.current = Array(F_).fill(0);
        setPlates(platesRef.current);
        for (let r2 = 0; r2 < v; r2++) friends.forEach((_, k) => { setTimeout(() => give(k, true), t); t += 170; });
        setTimeout(() => { if (target.reduce((a, b) => a + b, 0) < N) setCoach({ text: `Everyone has ${v}, and ${N - v * F_} are still in the bowl. Keep sharing!`, mood: 'think' }); }, t + 100);
      }
    }
    if (r.done) setTimeout(() => setVoice(false), 3500);
  };

  const finish = () => {
    const sig = trk.finish();
    if (twin && !sig.hints.includes('demo')) sig.hints.push('demo');
    finishChallenge(navigation, 'picnic', sig, { suggested: 'groups', replay: frames.current.length >= 2 ? frames.current : undefined });
  };

  return (
    <DropProvider>
      <View style={{ flex: 1, backgroundColor: '#d9ead4' }}>
        <GameBody>
        <Mountain w={320} h={210} color={C.hill} style={{ position: 'absolute', top: ins.top + 60, right: -80 }} />
        <View style={{ paddingTop: ins.top + 8, paddingHorizontal: 20 }}>
          <TopBar back="← Map" right={<><Purse /><AskNumiButton onPress={() => { trk.asked(true); setVoice(true); }} glowing={trk.wrongStreak > 0 && !voice} /></>} />
          <Enter delay={60}>
            <View style={[{ marginTop: 10, backgroundColor: 'rgba(253,245,232,.96)', borderRadius: 22, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, softShadow(0.1, 4)]}>
              <Highlight active={highlight.includes('bowl')} style={{ width: 54, height: 50, borderRadius: 16, backgroundColor: C.coral, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: C.coralDeep }}>
                <Text style={{ fontFamily: F.display, fontSize: 22, color: C.cream }}>{bowl}</Text>
              </Highlight>
              <View style={{ flex: 1 }}>
                <Eyebrow>{twin ? 'TWIN PUZZLE · ON YOUR OWN' : REST ? 'MAKE IT FAIR · LEFTOVERS ALLOWED' : 'MAKE IT FAIR'}</Eyebrow>
                <Text style={[T.body, { marginTop: 2 }]}>{solved ? `${F_} happy friends!` : `${bowl} in the bowl · ${F_} friends to share with`}</Text>
              </View>
              {hint >= 0 && <View style={{ flexDirection: 'row', gap: 3 }}>{HINT_LADDER.map((h, i) => <View key={h} style={{ width: 7, height: 7 + i * 3, alignSelf: 'flex-end', borderRadius: 3, backgroundColor: i <= hint ? C.violet : C.sand }} />)}</View>}
            </View>
          </Enter>
        </View>

        {/* blanket */}
        <AutoScale k={fit}>
        <Wobble trigger={wob} style={{ marginHorizontal: 16, marginTop: 14 }}>
          <View style={{ backgroundColor: C.coral, borderRadius: 26, padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 10, borderBottomWidth: 6, borderBottomColor: C.coralDeep }}>
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', flexWrap: 'wrap', borderRadius: 26, overflow: 'hidden', opacity: 0.25 }}>
              {Array.from({ length: 64 }, (_, i) => <View key={i} style={{ width: '12.5%', height: 30, backgroundColor: (Math.floor(i / 8) + i) % 2 ? C.cream : 'transparent' }} />)}
            </View>
            {friends.map((id, k) => {
              const mood: Mood = solved ? 'happy' : bowl === 0 && plates[k] < Math.max(...plates) ? 'worried' : plates[k] > 0 ? 'happy' : 'wow';
              return (
                <View key={id} style={{ width: crowded ? '30%' : '48%', flexGrow: 1, alignItems: 'center' }}>
                  <Bob amp={solved ? 8 : 2} duration={solved ? 420 : 1500 + k * 130}>
                    <Buddy id={id} size={crowded ? 38 : F_ > 2 ? 52 : 64} mood={mood} cheering={solved} />
                  </Bob>
                  <DropZone id={`plate${k}`} pad={10}>
                    <Highlight active={highlight.includes(`plate${k}`)}>
                      <View style={{ width: crowded ? 98 : 132, minHeight: crowded ? 54 : 66, borderRadius: 40, backgroundColor: C.cream, borderWidth: 5, borderColor: solved ? C.teal : C.sandLine, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', padding: 6, gap: 1 }}>
                        {plates[k] === 0 && !slots && <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11, color: C.faint }}>{cap(id)}'s plate</Text>}
                        {Array.from({ length: Math.max(plates[k], slots ? each : 0) }, (_, j) => j < plates[k] ? (
                          <Tap key={j} onPress={() => takeBack(k)} a11y={`Take a strawberry from ${id}`}>
                            <Squash trigger={1}><Text style={{ fontSize: crowded ? 12 : F_ > 2 && each > 4 ? 15 : 19 }}>🍓</Text></Squash>
                          </Tap>
                        ) : (
                          <View key={j} style={{ width: crowded ? 14 : 20, height: crowded ? 14 : 20, margin: 1, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: C.sandDeep }} />
                        ))}
                      </View>
                    </Highlight>
                  </DropZone>
                  <Text style={{ fontFamily: F.display, fontSize: 14, color: C.cream, marginTop: 2 }}>{plates[k]}</Text>
                </View>
              );
            })}
            <Burst trigger={burst} x={170} y={120} count={22} dist={140} />
          </View>
        </Wobble>

        </AutoScale>

        {solved && (
          <View style={{ alignItems: 'center', gap: 4, marginTop: 10 }}>
            {reveal >= 1 && <Pop><Text style={{ fontFamily: F.display, fontSize: 18, color: C.tealDeep }}>{N} shared by {F_} → {each} each{REST ? `, ${REST} left over` : ''}</Text></Pop>}
            {reveal >= 2 && <Pop><Text style={{ fontFamily: F.display, fontSize: 18, color: C.ink }}>{Array(F_).fill(each).join(' + ')}{REST ? ` + ${REST}` : ''} = {N}</Text></Pop>}
            {reveal >= 3 && <Pop><View style={{ backgroundColor: C.ink, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4 }}><Text style={{ fontFamily: F.display, fontSize: 30, color: C.sun }}>{N} ÷ {F_} = {each}{REST ? ` r ${REST}` : ''}</Text></View></Pop>}
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, marginTop: 10 }}>
          <Numi size={52} mood={coach.mood} state={solved ? 'celebrate' : 'idle'} />
          <View style={[{ flex: 1, backgroundColor: C.cream, borderRadius: 20, padding: 11 }, softShadow(0.08, 3)]}>
            <Text style={[T.body, { fontSize: 13 }]}>{coach.text}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }} />

        {solved ? (
          <View style={{ paddingHorizontal: 20, paddingBottom: ins.bottom + 16, flexDirection: 'row', gap: 10 }}>
            <ChunkyButton style={{ flex: 1 }} size="md" icon="🔁" label="Share again" color={C.sun} shadow={C.sunDeep} textColor={C.ink} a11y="Share again with new numbers" onPress={() => { recordPractice(trk.finish()); onPlayAnother(); }} />
            <ChunkyButton style={{ flex: 1 }} size="md" label={twin ? 'I did it!' : 'Continue'} color={C.teal} shadow={C.tealDeep} onPress={finish} />
          </View>
        ) : (
          <View style={[{ backgroundColor: C.sand, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 18, paddingTop: 12, paddingBottom: ins.bottom + 12 }, softShadow(0.14, -6)]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Eyebrow color="#8c8377">STRAWBERRY BOWL · DRAG OR TAP</Eyebrow>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Tap onPress={reset} a11y="Put all back" style={{ backgroundColor: C.cream, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10 }}><Text style={{ fontSize: 15 }}>↺</Text></Tap>
                <Tap onPress={() => setPad(true)} a11y="Open scratchpad" style={{ backgroundColor: C.cream, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10 }}><Text style={{ fontSize: 15 }}>✏️</Text></Tap>
                <Tap onPress={() => { setSlots(s => !s); trk.represent('groups'); }} a11y="Show spots" style={{ backgroundColor: slots ? C.ink : C.cream, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10 }}><Text style={{ fontSize: 15 }}>🧩</Text></Tap>
                <Tap onPress={() => applyHint(hint + 1)} a11y="Get a hint" style={{ backgroundColor: C.violet, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10 }}><Text style={{ fontSize: 15 }}>💡</Text></Tap>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <View style={{ flex: 1, backgroundColor: C.cream, borderRadius: 40, minHeight: 86, padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center', alignContent: 'center', borderBottomWidth: 6, borderBottomColor: C.sandDeep }}>
                {bowl === 0 && <Text style={{ fontFamily: F.bodyHeavy, color: C.faint }}>Bowl empty!</Text>}
                {/* A big bowl shows a handful to grab plus a count — every one drawn would push the plates off screen. */}
                {Array.from({ length: Math.min(bowl, BOWL_SHOWN) }, (_, i) => (
                  <Draggable key={i} id={`b${i}`} a11y="Strawberry in the bowl" disabled={demo} onTap={giveFewest} onDrop={z => (z?.startsWith('plate') ? (give(Number(z.slice(5))) ? 'accept' : 'reject') : 'ignore')}>
                    <View style={{ width: N > 20 ? 25 : 36, height: N > 20 ? 25 : 36, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: N > 20 ? 18 : 26 }}>🍓</Text></View>
                  </Draggable>
                ))}
                {bowl > BOWL_SHOWN && (
                  <View style={{ backgroundColor: C.coral, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'center' }}>
                    <Text style={{ fontFamily: F.display, fontSize: 14, color: C.cream }}>+{bowl - BOWL_SHOWN} more</Text>
                  </View>
                )}
              </View>
              {dealBtn && bowl >= F_ && (
                <Pop><ChunkyButton size="md" label="Deal a round" color={C.teal} shadow={C.tealDeep} onPress={dealRound} /></Pop>
              )}
            </View>
          </View>
        )}

        </GameBody>
        <AskNumi open={voice} onClose={() => { setVoice(false); trk.resetIdle(); }} respond={respond} onReply={onReply}
          opener={`I can see the picnic: ${bowl} strawberries in the bowl. What are you thinking?`}
          chips={["I don't understand", 'Give me a clue', `Give ${each} to everyone`, 'What does divide mean?']}
          style={{ position: 'absolute', left: 12, right: 12, bottom: ins.bottom + 10 }} />
        <StuckSheet open={stuck} onChoose={onStuck} onClose={() => { setStuck(false); trk.resetIdle(); }} />
        <Scratchpad open={pad} onClose={() => { setPad(false); trk.resetIdle(); }} title={`Share ${N} between ${F_}`} />
      </View>
    </DropProvider>
  );
}

/** Endless rounds: "Share again" (and the demo's twin) remount with a fresh seed and tracker. */
export default function Picnic(props: RootScreen<'Picnic'>) {
  const [round, setRound] = useState(() => ({ n: 0, seed: newSeed(), twin: false }));
  return (
    <PicnicRound
      key={round.n}
      {...props}
      seed={round.seed}
      twin={round.twin}
      onPlayAnother={() => setRound(r => ({ n: r.n + 1, seed: newSeed(), twin: false }))}
      onTwin={() => setRound(r => ({ n: r.n + 1, seed: newSeed(), twin: true }))}
    />
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
