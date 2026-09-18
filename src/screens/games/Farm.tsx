// MULTIPLICATION FARM — equal rows through planting. The equation is revealed, never asked.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AskNumi, AskNumiButton, Reply } from '../../components/AskNumi';
import { Buddy, Numi } from '../../components/characters';
import { Burst } from '../../components/effects';
import { DropProvider, DropZone, Draggable } from '../../components/dragdrop';
import { Bob, Drift, Enter, FloatUp, Highlight, Pop, Squash, Sway, Wobble } from '../../components/motion';
import { Scratchpad } from '../../components/Scratchpad';
import { StuckChoice, StuckSheet } from '../../components/sheets';
import { AutoScale, ChunkyButton, Eyebrow, GameBody, MuteButton, Purse, Tap, TopBar, useFitScale } from '../../components/ui';
import { HINT_LADDER, HintKind, Intent, nextRepresentation } from '../../learning/engine';
import { genFarm, lastKindOf, newSeed, pickDifficulty, tagKind } from '../../learning/generator';
import { ReplayFrame, useSignalTracker, useStuckDetector } from '../../learning/session';
import { finishChallenge } from '../../navigation/flow';
import { RootScreen } from '../../navigation/types';
import { haptic, say } from '../../services/feedback';
import { useGame } from '../../store/game';
import { C, F, Mood, softShadow, T } from '../../theme/tokens';

type Carrot = { id: string; row: number | null; k: number };

const SOIL = '#c9a96a';
const ROW_BG = '#b0925a';
const BG = '#e9f2d9';

const makeCarrots = (n: number, tag: string): Carrot[] => Array.from({ length: n }, (_, i) => ({ id: `${tag}c${i}`, row: null, k: 0 }));
const countRows = (cs: Carrot[], rows: number) => Array.from({ length: rows }, (_, r) => cs.filter(c => c.row === r).length);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const listRows =(counts: number[]) => counts.map((n, i) => `row ${i + 1} has ${n}`).join(', ');

function CarrotTile({ size = 40, sprout = true }: { size?: number; sprout?: boolean }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: sprout ? '#dcefc4' : 'transparent', alignItems: 'center', justifyContent: 'center', borderBottomWidth: sprout ? 3 : 0, borderBottomColor: '#a9cf8a' }}>
      <Text style={{ fontSize: size * 0.58 }}>🥕</Text>
    </View>
  );
}

type RoundProps = RootScreen<'Farm'> & { seed: number; twin: boolean; onPlayAnother: () => void; onTwin: () => void };

function FarmRound({ navigation, seed, twin, onPlayAnother, onTwin }: RoundProps) {
  const grade = useGame(s => s.grade);
  const micAllowed = useGame(s => s.settings.micAllowed);
  const signals = useGame(s => s.signals);
  const { width: W } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  // Short phones draw the main scene smaller so the pieces stay on screen.
  const fit = useFitScale();
  const width = Math.min(W, 440);

  // This round's garden, chosen from the child's recent multiplication history.
  // Grade sets the rows and table; history nudges them; the kind (empty garden, or the
  // rabbit's wonky rows) never repeats back-to-back.
  const prob = useMemo(() => genFarm(grade, pickDifficulty(signals, 'multiplication'), seed, lastKindOf(signals, 'farm')), [seed]);
  const startConcrete = useMemo(() => ['blocks', 'groups'].includes(nextRepresentation(signals, 'multiplication')), [seed]);
  const { total, rows } = prob;
  const per = total / rows;
  // "fix" rounds start with the rabbit's lopsided planting already in the ground.
  const [carrots, setCarrots] = useState<Carrot[]>(() => {
    const cs = makeCarrots(prob.total, 'a');
    let i = 0;
    prob.start.forEach((n, row) => { for (let k = 0; k < n; k++) cs[i++].row = row; });
    return cs;
  });
  const [coach, setCoach] = useState<{ text: string; mood: Mood }>({
    text: twin
      ? `Your turn! Plant ${total} carrots in ${rows} equal rows — all on your own.`
      : prob.kind === 'fix'
        ? `Oh no — a rabbit planted some carrots all wonky! Zuri needs all ${total} in ${rows} EQUAL rows. Move them and plant the rest.`
        : `Zuri needs ${total} carrots in ${rows} equal rows. Drag a carrot into a row — or tap it!`,
    mood: 'happy',
  });
  const [zuriLine, setZuriLine] = useState<string | null>(null);
  const [hintLevel, setHintLevel] = useState(-1);
  const [highlight, setHighlight] = useState<string[]>([]);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [stuckOpen, setStuckOpen] = useState(false);
  const [padOpen, setPadOpen] = useState(false);
  const [solved, setSolved] = useState(false);
  const [demo, setDemo] = useState(false);
  const [burst, setBurst] = useState(0);
  const [wob, setWob] = useState(0);
  const [ghost, setGhost] = useState(false);   // visual hint: dashed slots per row
  const [skip, setSkip] = useState(false);     // strategy hint: skip-count labels
  // "Plant a round" — a hint for small gardens, available from the start for big ones.
  const [guided, setGuided] = useState(prob.total > 20);
  // Most carrots the seed basket draws at once (the rest show as "+N more"); tall gardens get one row.
  const basketShown = prob.rows >= 4 ? 6 : 13;
  const [round, setRound] = useState(0);
  const [dots, setDots] = useState(startConcrete); // objects view: numbered array grid
  const tutor = useRef<{ step: 'none' | 'ask-per' }>({ step: 'none' });

  const recordPractice = useGame(s => s.recordPractice);
  const trk = useSignalTracker('farm', 'multiplication', tagKind(prob.kind, `${rows} × ${per}`), 'groups');

  const counts = countRows(carrots, rows);
  const planted = counts.reduce((a, b) => a + b, 0);
  const left = total - planted;
  const basket = carrots.filter(c => c.row === null);

  useStuckDetector({
    wrongStreak: trk.wrongStreak, idleMs: trk.idleMs, paused: voiceOpen || stuckOpen || padOpen || solved || demo,
    onStuck: () => { haptic.nudge(); setStuckOpen(true); say("Hmm… this one's tricky. Want to solve it together?"); },
  });

  // ─── Planting ──────────────────────────────────────────────────────────────
  const plant = (id: string, row?: number) => {
    if (solved) return;
    setCarrots(cs => {
      const c = cs.find(x => x.id === id);
      if (!c || c.row !== null) return cs;
      const cn = countRows(cs, rows);
      const target = row ?? cn.indexOf(Math.min(...cn));
      return cs.map(x => (x.id === id ? { ...x, row: target, k: Date.now() } : x));
    });
    haptic.snap();
    trk.touch();
  };

  const unplant = (id: string) => {
    if (solved || demo) return;
    haptic.tap();
    trk.touch();
    setCarrots(cs => cs.map(x => (x.id === id ? { ...x, row: null } : x)));
    setCoach({ text: 'Pulled it back to the basket. Moving carrots around is how farmers figure it out!', mood: 'happy' });
  };

  // timers (staggered animations) — always cleaned up
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => clearTimers, []);

  /** Plant the next basket carrot straight into `row`. */
  const plantInto = (row: number) => {
    setCarrots(cs => {
      const c = cs.find(x => x.row === null);
      if (!c) return cs;
      return cs.map(x => (x.id === c.id ? { ...x, row, k: Date.now() } : x));
    });
    haptic.snap();
  };
  /** Plant one carrot into the emptiest row that still has fewer than `n`. */
  const plantUpTo = (n: number) => {
    setCarrots(cs => {
      const c = cs.find(x => x.row === null);
      if (!c) return cs;
      const cn = countRows(cs, rows);
      let best = -1;
      cn.forEach((v, r) => { if (v < n && (best < 0 || v < cn[best])) best = r; });
      if (best < 0) return cs;
      return cs.map(x => (x.id === c.id ? { ...x, row: best, k: Date.now() } : x));
    });
    haptic.snap();
  };

  // ─── Live evaluation ───────────────────────────────────────────────────────
  const firstFrame = useRef<number[] | null>(null);
  const lastWrong = useRef<number[] | null>(null);
  const usedDeep = useRef(false);
  const differ = planted > 0 && Math.max(...counts) !== Math.min(...counts);
  const rowSig = counts.join(',');

  useEffect(() => {
    if (solved) return;
    const spread = Math.max(...counts) - Math.min(...counts);
    setZuriLine(differ && (spread >= 2 || left === 0)
      ? `${cap(counts.slice(0, 3).map((n, i) => `row ${i + 1} has ${n}`).join(', '))}${rows > 3 ? '…' : ''} — are they equal?`
      : null);
    if (left !== 0 || demo) return;
    if (!differ) {
      trk.attempt(`${rows}x${per}=${total}`, true);
      win();
      return;
    }
    trk.attempt(counts.join('+'), false);
    if (!firstFrame.current) firstFrame.current = counts;
    else lastWrong.current = counts;
    setWob(w => w + 1);
    haptic.nudge();
    const most = counts.indexOf(Math.max(...counts));
    setHighlight([`row${most}`]);
    setCoach({ text: `All ${total} are planted! ${cap(listRows(counts))}. Zuri wants every row the same — tap a carrot to pull it back and move it.`, mood: 'think' });
  }, [rowSig]);

  // ─── Success: count the rows, then the columns, then reveal ────────────────
  const [grown, setGrown] = useState(false);
  const [reveal, setReveal] = useState(0);
  const win = () => {
    setSolved(true);
    setHintLevel(-1);
    setVoiceOpen(false);
    setZuriLine(null);
    setGuided(false);
    haptic.success();
    setBurst(b => b + 1);
    say(`Every row matches! ${Array.from({ length: rows }, (_, r) => per * (r + 1)).join(', ')}.`);
    let t = 400;
    for (let r = 0; r < rows; r++) {
      const so = Array.from({ length: r + 1 }, (_, i) => per * (i + 1)).join('… ');
      later(() => { setHighlight([`row${r}`]); setCoach({ text: `${so}${r === rows - 1 ? '!' : '…'}`, mood: 'wow' }); haptic.tap(); }, t);
      t += 850;
    }
    for (let c = 0; c < per; c++) {
      later(() => { setHighlight([`col${c}`]); if (c === 0) setCoach({ text: `And every column has ${rows}, all the way across.`, mood: 'wow' }); }, t);
      t += 380;
    }
    later(() => {
      setHighlight([]);
      setGrown(true);
      setBurst(b => b + 1);
      haptic.success();
      setCoach({ text: `The carrots are growing! You made ${rows} rows of ${per}.`, mood: 'wow' });
    }, t);
    [1, 2, 3].forEach(k => later(() => setReveal(k), t + 300 + (k - 1) * 1000));
  };

  // ─── Hints (never "wrong") ─────────────────────────────────────────────────
  const skipList = Array.from({ length: rows }, (_, r) => per * (r + 1));
  const applyHint = (lvl: number) => {
    if (solved || demo) return;
    const kind: HintKind = HINT_LADDER[Math.min(lvl, 4)];
    trk.hint(kind);
    setHintLevel(Math.min(lvl, 4));
    let line = '';
    if (kind === 'gentle') {
      line = `Each row needs the same number of carrots. ${planted ? `Right now ${listRows(counts)}.` : 'Look at your rows.'}`;
      setHighlight(counts.map((_, r) => `row${r}`));
    } else if (kind === 'visual') {
      setGhost(true);
      line = 'See the dashed spots? Fill every spot in every row — then each row has the same.';
    } else if (kind === 'strategy') {
      setSkip(true);
      trk.strategy('skip');
      line = `Skip count by rows: ${skipList.join(', ')}. That's ${per} in each row!`;
    } else if (kind === 'guided') {
      usedDeep.current = true;
      setGuided(true);
      setGhost(true);
      line = 'Tap "Plant a round" — every row gets one carrot. Count how many rounds until the basket is empty!';
    } else {
      runDemo();
      return;
    }
    setCoach({ text: line, mood: 'happy' });
    say(line);
  };

  const plantRound = () => {
    if (solved || !basket.length) return;
    trk.touch();
    const k = round + 1;
    setRound(k);
    for (let r = 0; r < rows; r++) later(() => plantInto(r), r * 220);
    setCoach({ text: `Round ${k}: every row got one. ${basket.length - rows > 0 ? 'Keep going!' : 'Basket empty — how many rounds was that?'}`, mood: 'happy' });
  };

  const runDemo = () => {
    usedDeep.current = true;
    clearTimers();
    setDemo(true);
    setGuided(false);
    setGhost(true);
    setHighlight([]);
    setCarrots(cs => cs.map(c => ({ ...c, row: null })));
    const line = `Watch me: one carrot in each row, again and again…`;
    setCoach({ text: line, mood: 'happy' });
    say(line);
    for (let i = 0; i < total; i++) later(() => plantInto(i % rows), 600 + i * 260);
    const t = 600 + total * 260 + 400;
    later(() => {
      setHighlight(counts.map((_, r) => `row${r}`));
      const ex = `${per} in every row! ${skipList.join(', ')}. So ${rows} × ${per} = ${total}. Now a twin puzzle — just for you.`;
      setCoach({ text: ex, mood: 'wow' });
      say(`${rows} rows of ${per} is ${total}. Now try a twin puzzle on your own!`);
    }, t);
    later(() => { clearTimers(); onTwin(); }, t + 4200);
  };

  // ─── Stuck choices ─────────────────────────────────────────────────────────
  const onStuck = (c: StuckChoice) => {
    setStuckOpen(false);
    trk.resetIdle();
    if (c === 'talk') { trk.asked(true); setVoiceOpen(true); }
    if (c === 'show') applyHint(Math.max(1, hintLevel + 1));
    if (c === 'objects') {
      setDots(true);
      trk.represent('blocks');
      trk.hint('visual');
      setCoach({ text: 'Now the garden is a grid with numbers. Count along each row with your finger!', mood: 'happy' });
    }
    if (c === 'draw') setPadOpen(true);
  };

  // ─── Voice tutor (reads the real garden) ───────────────────────────────────
  const perChips = [String(Math.max(1, per - 1)), String(per), String(per + 1)];
  const rowIds = counts.map((_, r) => `row${r}`);
  const respond = (intent: Intent, heard: string): Reply => {
    trk.asked(true);
    const t = tutor.current;
    const h = heard.toLowerCase();
    if (intent.kind === 'command') {
      if (intent.action === 'remove') return { line: 'Okay — pulling the carrots back into the basket.', command: intent };
      if (intent.action === 'use' || intent.action === 'share') {
        const n = intent.values[0];
        if (!n) {
          t.step = 'ask-per';
          return { line: `Let's share them fairly! ${total} carrots in ${rows} rows — how many in each row?`, expectNumber: true, chips: perChips, highlight: rowIds };
        }
        const need = n * rows;
        const extra = need > total ? ` That needs ${need} carrots and we have ${total} — let's see what happens!` : need < total ? ` That uses ${need}, so ${total - need} will stay in the basket.` : '';
        return { line: `Planting ${n} in each row!${extra}`, command: { ...intent, values: [n] }, highlight: rowIds };
      }
    }
    if (intent.kind === 'answer') {
      const n = intent.n;
      if (n === per) {
        t.step = 'none';
        setGhost(true);
        return { line: `Yes! ${n} in each row: ${skipList.join('… ')} — that's all ${total}. See the dashed spots? Plant ${n} in every row.`, highlight: rowIds, done: true, hint: 'visual' };
      }
      if (t.step === 'ask-per' || n > 0) {
        t.step = 'ask-per';
        const made = n * rows;
        return {
          line: `${n} in each of ${rows} rows makes ${made}. We have ${total}. ${made < total ? 'Carrots would be left over — try a bigger number.' : "That's more than the basket holds — try a smaller number."} How many in each row?`,
          expectNumber: true, chips: perChips, highlight: rowIds, hint: 'gentle',
        };
      }
    }
    if (/how many.*(each|every|in a) row/.test(h)) {
      t.step = 'ask-per';
      return { line: `Great question! ${total} carrots, ${rows} rows, every row the same. What do you think — how many in each row?`, expectNumber: true, chips: perChips, highlight: rowIds };
    }
    if (intent.kind === 'why-wrong') {
      return { line: planted ? `Nothing's wrong! ${cap(listRows(counts))}. The rows just need to match.` : `Nothing's wrong at all — the rows are empty. Plant a carrot and let's see!`, highlight: rowIds };
    }
    if (intent.kind === 'another-way') {
      setDots(true);
      trk.represent('blocks');
      return { line: `Let's look at it as a grid. Count along each row — every row should end on the same number.`, highlight: rowIds, hint: 'visual' };
    }
    if (intent.kind === 'explain-concept') {
      return { line: `Multiplying means counting equal groups fast. Here the groups are rows — ${rows} rows, each with the same number of carrots.` };
    }
    if (intent.kind === 'explanation' || intent.kind === 'feeling') {
      return { line: "I love hearing how you think! Let's finish Zuri's garden and you can tell me more." };
    }
    // confused / clue / anything else → describe the ACTUAL garden
    trk.hint('gentle');
    if (planted === 0) {
      t.step = 'ask-per';
      return { line: `We have ${total} carrots and ${rows} empty rows. Every row gets the same number. How many in each row?`, expectNumber: true, chips: perChips, highlight: rowIds, hint: 'gentle' };
    }
    const lo = Math.min(...counts), hi = Math.max(...counts);
    if (left === 0) {
      const big = counts.map((v, r) => (v === hi ? `row${r}` : '')).filter(Boolean);
      return { line: `All ${total} are planted. ${cap(listRows(counts))} — which row has too many? Move one to a shorter row.`, highlight: big, hint: 'gentle', chips: ['How many in each row?', 'Give me a clue', 'Take them back'] };
    }
    const small = counts.map((v, r) => (v === lo ? `row${r}` : '')).filter(Boolean);
    return {
      line: `You planted ${planted}. ${left} ${left === 1 ? 'is' : 'are'} left. ${cap(listRows(counts))} — which row needs one more?`,
      highlight: small, hint: 'gentle', chips: ['How many in each row?', 'Give me a clue', 'Show me another way'],
    };
  };

  const onReply = (r: Reply) => {
    setHighlight(r.highlight ?? []);
    setCoach({ text: r.line, mood: r.done ? 'wow' : 'happy' });
    if (r.hint) setHintLevel(hl => Math.max(hl, HINT_LADDER.indexOf(r.hint!)));
    const cmd = r.command;
    if (cmd?.kind === 'command') {
      if (cmd.action === 'remove') later(() => setCarrots(cs => cs.map(c => ({ ...c, row: null }))), 500);
      if ((cmd.action === 'use' || cmd.action === 'share') && cmd.values[0]) {
        const n = cmd.values[0];
        const need = Math.min(basket.length, counts.reduce((a, v) => a + Math.max(0, n - v), 0));
        for (let i = 0; i < need; i++) later(() => plantUpTo(n), 500 + i * 320);
      }
    }
    if (r.done) later(() => setVoiceOpen(false), 3800);
  };

  const finish = () => {
    const sig = trk.finish();
    const final = countRows(carrots, rows);
    let replay: ReplayFrame[] | undefined;
    const first = firstFrame.current;
    if (first && !twin && !usedDeep.current) {
      const mid = lastWrong.current;
      replay = [
        { label: 'Your first try', groups: first, say: `First you planted ${first.join(', ')}. All the carrots were in, but the rows didn't match.`, tone: 'first' },
        mid
          ? { label: 'You kept trying', groups: mid, say: `Then you moved carrots: ${mid.join(', ')}. Closer!`, tone: 'change' }
          : { label: 'You moved carrots', groups: final, say: 'Then you pulled carrots from the long rows and moved them to the short ones.', tone: 'change' },
        { label: 'Equal rows!', groups: final, say: `${rows} rows of ${per}. ${rows} × ${per} = ${total}.`, tone: 'final' },
      ];
    }
    if (twin && !sig.hints.includes('demo')) sig.hints.push('demo');
    finishChallenge(navigation, 'farm', sig, { suggested: 'groups', replay });
  };

  // ─── Layout maths ──────────────────────────────────────────────────────────
  const lo = Math.min(...counts), hi = Math.max(...counts);
  const BADGE = 40, SKIPW = skip ? 44 : 0, GAP = 4;
  const inner = width - 28 - 20 - 16 - BADGE - SKIPW - 8;
  const maxN = Math.max(per, hi, 1);
  const slot = Math.max(20, Math.min(40, Math.floor(inner / maxN) - GAP));
  const rowH = slot + 14 + (dots ? 16 : 0);
  const SKY_H = 62;
  const bedH = rows * (rowH + 8) + 12;
  const trayTile = total > 12 ? 34 : 42;
  const rowOffset = (r: number) => counts.slice(0, r).reduce((a, b) => a + b, 0);
  const badgeColor = (n: number) => (!differ ? (solved ? C.teal : 'rgba(253,245,232,.92)') : n === hi ? C.sun : C.coral);
  const badgeInk = (n: number) => (!differ && !solved ? C.ink : C.cream);

  return (
    <DropProvider>
      <View style={{ flex: 1, backgroundColor: BG }}>
        <GameBody>
        <View style={{ paddingTop: ins.top + 8, paddingHorizontal: 20 }}>
          <TopBar back="← Map" onBack={() => navigation.goBack()} right={<><Purse /><MuteButton /><AskNumiButton onPress={() => { trk.asked(true); setVoiceOpen(true); }} glowing={trk.wrongStreak > 0 && !voiceOpen} /></>} />
          <Enter delay={80}>
            <View style={[{ marginTop: 10, backgroundColor: C.paper, borderRadius: 22, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, softShadow(0.1, 4)]}>
              <View style={{ width: 50, height: 50, borderRadius: 15, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: C.tealDeep }}>
                <Text style={{ fontSize: 17 }}>🥕</Text>
                <Text style={{ fontFamily: F.display, fontSize: 15, lineHeight: 17, color: C.cream }}>{total}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Eyebrow>{twin ? 'TWIN PUZZLE · ON YOUR OWN' : prob.kind === 'fix' ? "ZURI'S MISSION · FIX THE RABBIT'S ROWS" : "ZURI'S MISSION"}</Eyebrow>
                <Text style={[T.body, { marginTop: 2 }]}>Plant {total} carrots in {rows} equal rows.</Text>
                <Text style={[T.bodySm, { fontSize: 12 }]}>{solved ? 'Garden planted!' : `${planted} planted · ${left} in the basket`}</Text>
              </View>
              {hintLevel >= 0 && (
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {HINT_LADDER.map((hk, i) => <View key={hk} style={{ width: 7, height: 7 + i * 3, borderRadius: 3, alignSelf: 'flex-end', backgroundColor: i <= hintLevel ? C.violet : C.sand }} />)}
                </View>
              )}
            </View>
          </Enter>
        </View>

        {/* ─── garden ─── */}
        <AutoScale k={fit}>
        <View style={{ marginTop: 12, marginHorizontal: 14, borderRadius: 24, overflow: 'hidden' }}>
          {/* sky strip with Zuri */}
          <View style={{ height: SKY_H, backgroundColor: C.sky, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10 }}>
            <Drift from={-60} to={width} duration={30000} style={{ position: 'absolute', top: 6 }}><Text style={{ fontSize: 22, opacity: 0.85 }}>☁️</Text></Drift>
            <Drift from={-60} to={width} duration={38000} phase={0.55} style={{ position: 'absolute', top: 22 }}><Text style={{ fontSize: 16, opacity: 0.7 }}>☁️</Text></Drift>
            <Text style={{ position: 'absolute', right: 12, top: 6, fontSize: 22 }}>☀️</Text>
            <Buddy id="zuri" size={52} mood={solved ? 'happy' : zuriLine ? 'think' : 'happy'} cheering={solved} />
            {(zuriLine || solved) && (
              <Pop key={zuriLine ?? 'yay'} style={{ marginLeft: 6, marginBottom: 14, flexShrink: 1 }}>
                <View style={{ backgroundColor: C.cream, borderRadius: 14, borderBottomLeftRadius: 4, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.ink }}>{solved ? 'My garden is perfect! Thank you!' : zuriLine}</Text>
                </View>
              </Pop>
            )}
          </View>

          {/* soil bed */}
          <Wobble trigger={wob}>
            <View style={{ height: bedH, backgroundColor: SOIL, paddingHorizontal: 10, paddingTop: 10, gap: 8 }}>
              {Array.from({ length: rows }, (_, r) => {
                const inRow = carrots.filter(c => c.row === r);
                return (
                  <Highlight key={r} active={highlight.includes(`row${r}`)} color={C.violet} style={{ borderRadius: 16 }}>
                    <DropZone id={`row${r}`} pad={6} style={{ height: rowH, borderRadius: 16, backgroundColor: ROW_BG, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: 3, borderBottomColor: 'rgba(90,60,20,.25)' }}>
                      {skip && (
                        <View style={{ width: SKIPW - 6, marginRight: 6, backgroundColor: C.violet, borderRadius: 10, paddingVertical: 2, alignItems: 'center' }}>
                          <Text style={{ fontFamily: F.display, fontSize: 14, color: C.cream }}>{per * (r + 1)}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1, height: slot + (dots ? 16 : 0), flexDirection: 'row', gap: GAP }}>
                        {ghost && Array.from({ length: per }, (_, i) => (
                          <View key={`g${i}`} pointerEvents="none" style={{ position: 'absolute', left: i * (slot + GAP), top: 0, width: slot, height: slot, borderRadius: slot * 0.3, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(253,245,232,.7)' }} />
                        ))}
                        {inRow.map((c, i) => (
                          <Tap key={c.id} onPress={() => unplant(c.id)} a11y={`Carrot in row ${r + 1}. Tap to pull it back`} disabled={solved || demo}>
                            <Highlight active={highlight.includes(c.id) || highlight.includes(`col${i}`)} style={{ borderRadius: slot * 0.3 }}>
                              <Squash trigger={c.k}>
                                {grown ? (
                                  <Sway deg={5} duration={1100 + (i % 3) * 150}>
                                    <View style={{ transform: [{ scale: 1.22 }, { translateY: -3 }] }}><CarrotTile size={slot} sprout={false} /></View>
                                  </Sway>
                                ) : (
                                  <CarrotTile size={slot} sprout={false} />
                                )}
                              </Squash>
                            </Highlight>
                            {c.k > 0 && Date.now() - c.k < 900 && (
                              <FloatUp key={c.k} distance={16} duration={700} style={{ position: 'absolute', bottom: dots ? 16 : 0, left: 0, right: 0, alignItems: 'center' }}>
                                <View style={{ width: slot * 0.8, height: 8, borderRadius: 4, backgroundColor: 'rgba(120,85,40,.55)' }} />
                              </FloatUp>
                            )}
                            {dots && (
                              <View style={{ marginTop: 2, alignSelf: 'center', width: 14, height: 14, borderRadius: 7, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 8, color: C.ink }}>{rowOffset(r) + i + 1}</Text>
                              </View>
                            )}
                          </Tap>
                        ))}
                      </View>
                      <Pop key={`${r}-${counts[r]}`} from={0.7}>
                        <View style={{ width: BADGE - 4, height: BADGE - 4, borderRadius: (BADGE - 4) / 2, backgroundColor: badgeColor(counts[r]), alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontFamily: F.display, fontSize: 18, lineHeight: 22, color: badgeInk(counts[r]) }}>{counts[r]}</Text>
                        </View>
                      </Pop>
                    </DropZone>
                  </Highlight>
                );
              })}
            </View>
          </Wobble>
          <Burst trigger={burst} x={(width - 28) / 2} y={SKY_H + bedH / 2} count={22} dist={140} />

          {/* equation reveal */}
          {solved && reveal > 0 && (
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 8, alignItems: 'center', gap: 4 }}>
              <View style={{ backgroundColor: 'rgba(34,48,59,.8)', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 4, alignItems: 'center' }}>
                <Pop><Text style={{ fontFamily: F.displayBold, fontSize: 16, color: C.cream }}>{rows} rows of {per}</Text></Pop>
                {reveal >= 2 && <Pop><Text style={{ fontFamily: F.display, fontSize: 20, color: C.cream }}>{Array(rows).fill(per).join(' + ')} = {total}</Text></Pop>}
                {reveal >= 3 && <Pop><Text style={{ fontFamily: F.display, fontSize: 32, lineHeight: 38, color: C.sun }}>{rows} × {per} = {total}</Text></Pop>}
              </View>
            </View>
          )}
        </View>

        </AutoScale>

        {/* ─── coach ─── */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, marginTop: 8 }}>
          <Bob amp={3} duration={1600}><Numi size={54} mood={coach.mood} state={solved ? 'celebrate' : 'idle'} /></Bob>
          <View style={[{ flex: 1, backgroundColor: C.cream, borderRadius: 20, padding: 12 }, softShadow(0.08, 3)]}>
            <Text style={[T.body, { fontSize: 13.5 }]}>{coach.text}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }} />
        {/* ─── tray ─── */}
        {solved ? (
          <Enter style={{ paddingHorizontal: 20, paddingBottom: ins.bottom + 16, flexDirection: 'row', gap: 10 }}>
            {reveal >= 3 && <ChunkyButton style={{ flex: 1 }} size="md" icon="🔁" label="Plant again" color={C.sun} shadow={C.sunDeep} textColor={C.ink} a11y="Plant a new garden with new numbers" onPress={() => { recordPractice(trk.finish()); onPlayAnother(); }} />}
            {reveal >= 3 && <ChunkyButton style={{ flex: 1 }} size="md" label={twin ? 'I did it!' : 'Continue'} color={C.teal} shadow={C.tealDeep} onPress={finish} />}
          </Enter>
        ) : (
          <View style={[{ backgroundColor: C.sand, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 18, paddingTop: 14, paddingBottom: ins.bottom + 14 }, softShadow(0.14, -6)]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Eyebrow color="#8c8377">SEED BASKET · DRAG OR TAP</Eyebrow>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Tap onPress={() => setPadOpen(true)} a11y="Open scratchpad" style={{ backgroundColor: C.cream, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10 }}><Text style={{ fontSize: 15 }}>✏️</Text></Tap>
                <Tap onPress={() => { setDots(d => !d); trk.represent('blocks'); }} a11y="Show numbered grid" style={{ backgroundColor: dots ? C.ink : C.cream, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10 }}><Text style={{ fontSize: 15 }}>🧩</Text></Tap>
                <Tap onPress={() => applyHint(hintLevel + 1)} a11y="Get a hint" disabled={demo} style={{ backgroundColor: C.violet, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10 }}><Text style={{ fontSize: 15 }}>💡</Text></Tap>
              </View>
            </View>
            {guided && !demo && (
              <Tap onPress={plantRound} disabled={!basket.length} a11y="Plant a round: one carrot in every row" style={{ marginTop: 10, alignSelf: 'flex-start', backgroundColor: basket.length ? C.teal : C.locked, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: 3, borderBottomColor: basket.length ? C.tealDeep : C.lockedDeep }}>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: C.cream }}>🌱 Plant a round{round ? ` · round ${round}` : ''}</Text>
              </Tap>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, minHeight: trayTile * 2 + 8, alignContent: 'flex-start' }}>
              {/* Big baskets draw a handful to grab plus a count, so the garden stays on screen. */}
              {basket.slice(0, basketShown).map(c => (
                <Draggable
                  key={c.id}
                  id={c.id}
                  a11y="Carrot in the basket"
                  disabled={demo}
                  onDrop={z => {
                    if (!z || !z.startsWith('row')) return 'ignore';
                    plant(c.id, Number(z.slice(3)));
                    return 'accept';
                  }}
                  onTap={() => plant(c.id)}
                >
                  <Highlight active={highlight.includes(c.id)}>
                    <CarrotTile size={trayTile} />
                  </Highlight>
                </Draggable>
              ))}
              {basket.length > basketShown && (
                <View style={{ alignSelf: 'center', backgroundColor: C.teal, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 14, color: C.cream }}>+{basket.length - basketShown} more</Text>
                </View>
              )}
              {!basket.length && (
                <Text style={[T.bodySm, { alignSelf: 'center' }]}>The basket is empty — tap a carrot in the garden to pull it back.</Text>
              )}
            </View>
            <Text style={[T.bodySm, { fontSize: 11, marginTop: 6 }]}>Tap a basket carrot to plant it in the shortest row.</Text>
          </View>
        )}

        </GameBody>
        <AskNumi
          open={voiceOpen}
          onClose={() => { setVoiceOpen(false); trk.resetIdle(); }}
          respond={respond}
          onReply={onReply}
          opener={planted ? `I can see your garden: ${listRows(counts)}. What are you thinking?` : `I can see Zuri's garden. What are you thinking?`}
          chips={["I don't understand", 'How many in each row?', 'Give me a clue', 'Why is this wrong?', `Put ${per} in each row`].slice(0, micAllowed ? 5 : 4)}
          style={{ position: 'absolute', left: 12, right: 12, bottom: ins.bottom + 10 }}
        />
        <StuckSheet open={stuckOpen} onChoose={onStuck} onClose={() => { setStuckOpen(false); trk.resetIdle(); }} />
        <Scratchpad open={padOpen} onClose={() => { setPadOpen(false); trk.resetIdle(); }} title={`${total} carrots · ${rows} rows${planted ? ` · ${listRows(counts)}` : ''}`} />
        {demo && <View style={{ position: 'absolute', top: ins.top + 64, alignSelf: 'center', backgroundColor: C.violet, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 }}><Text style={{ fontFamily: F.bodyHeavy, color: C.cream, fontSize: 12 }}>NUMI IS SHOWING YOU</Text></View>}
      </View>
    </DropProvider>
  );
}

/** Endless rounds: "Plant again" (and the demo's twin) remount with a fresh seed and tracker. */
export default function Farm(props: RootScreen<'Farm'>) {
  const [round, setRound] = useState(() => ({ n: 0, seed: newSeed(), twin: false }));
  return (
    <FarmRound
      key={round.n}
      {...props}
      seed={round.seed}
      twin={round.twin}
      onPlayAnother={() => setRound(r => ({ n: r.n + 1, seed: newSeed(), twin: false }))}
      onTwin={() => setRound(r => ({ n: r.n + 1, seed: newSeed(), twin: true }))}
    />
  );
}
