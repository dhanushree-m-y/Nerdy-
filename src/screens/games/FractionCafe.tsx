// FRACTION CAFÉ — fractions by slicing a real pizza. The fraction is revealed AFTER the child makes it.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, useWindowDimensions, View, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';
import { AskNumi, AskNumiButton, Reply } from '../../components/AskNumi';
import { Buddy, Numi } from '../../components/characters';
import { Burst } from '../../components/effects';
import { DropProvider, DropZone, Draggable } from '../../components/dragdrop';
import { Bob, Drift, Enter, Highlight, Pop, Wobble } from '../../components/motion';
import { Scratchpad } from '../../components/Scratchpad';
import { StuckChoice, StuckSheet } from '../../components/sheets';
import { AutoScale, ChunkyButton, Eyebrow, GameBody, Purse, Tap, TopBar, useFitScale } from '../../components/ui';
import { CharacterId } from '../../data/world';
import { HINT_LADDER, HintKind, Intent, nextRepresentation } from '../../learning/engine';
import { genCafeService, lastKindOf, newSeed, pickDifficulty, tagKind } from '../../learning/generator';
import { useSignalTracker, useStuckDetector } from '../../learning/session';
import { finishChallenge } from '../../navigation/flow';
import { RootScreen } from '../../navigation/types';
import { haptic, say } from '../../services/feedback';
import { useGame } from '../../store/game';
import { C, F, Mood, softShadow, T } from '../../theme/tokens';

// ─── Orders ────────────────────────────────────────────────────────────────────
type Order = { num: number; den: number; ask: string; name: string; short: string };

/** Turns a generated fraction into the words Milo, Numi and the ticket all use. */
function orderInfo(o: { num: number; den: number }): Order {
  const short = `${o.num}/${o.den}`;
  if (o.den === 2) return { ...o, name: 'half', short, ask: 'Can I have half, please?' };
  const words = ['', 'a quarter', 'two quarters', 'three quarters'];
  const name = words[o.num] ?? short;
  return {
    ...o,
    name,
    short,
    ask: o.num === 1 ? 'A quarter please!' : o.num === 3 ? 'Three quarters, please — I’m hungry!' : 'Two quarters, please!',
  };
}
const CUSTOMERS: CharacterId[] = ['zuri', 'pip'];
const BG = '#f7ece0';

// ─── Pizza geometry (angles in degrees, screen space: 0° → right, 90° → down) ──
const P = 220;
const CX = P / 2;
const CY = P / 2;
const R = 100;
const TOPPINGS: [number, number][] = [
  [0.62, 25], [0.62, 65], [0.62, 115], [0.62, 155], [0.62, 205], [0.62, 245], [0.62, 295], [0.62, 335],
  [0.3, 45], [0.3, 135], [0.3, 225], [0.3, 315],
];
const rad = (d: number) => (d * Math.PI) / 180;
const pt = (r: number, a: number) => ({ x: CX + r * Math.cos(rad(a)), y: CY + r * Math.sin(rad(a)) });

function wedgePath(r: number, a1: number, a2: number) {
  if (a2 - a1 >= 360) return `M ${CX - r} ${CY} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
  const p1 = pt(r, a1), p2 = pt(r, a2);
  return `M ${CX} ${CY} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${p2.x} ${p2.y} Z`;
}

type Box = { x: number; y: number; w: number; h: number };
type SliceInfo = { id: string; i: number; a1: number; a2: number; box: Box; off: { x: number; y: number } };

function sliceInfo(n: number, i: number, base: number): SliceInfo {
  const step = 360 / n;
  const a1 = base + i * step, a2 = a1 + step;
  const pts = n === 1 ? [] : [{ x: CX, y: CY }];
  for (let a = a1; a <= a2 + 0.01; a += 5) pts.push(pt(R + 2, a));
  if (n === 1) pts.push(pt(R + 2, 0), pt(R + 2, 90), pt(R + 2, 180), pt(R + 2, 270));
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const x = Math.floor(Math.min(...xs)), y = Math.floor(Math.min(...ys));
  const box = { x, y, w: Math.ceil(Math.max(...xs)) - x, h: Math.ceil(Math.max(...ys)) - y };
  const mid = a1 + step / 2;
  const spread = n > 1 ? 4 : 0;
  return { id: `w${i}`, i, a1, a2, box, off: { x: spread * Math.cos(rad(mid)), y: spread * Math.sin(rad(mid)) } };
}

function PizzaWedge({ s, scale = 1 }: { s: SliceInfo; scale?: number }) {
  const { a1, a2, box } = s;
  const inside = (t: number) => (((t - a1) % 360) + 360) % 360 < a2 - a1;
  return (
    <Svg width={box.w * scale} height={box.h * scale} viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}>
      <Path d={wedgePath(R, a1, a2)} fill="#d99045" stroke="#b86f2c" strokeWidth={2} strokeLinejoin="round" />
      <Path d={wedgePath(R - 9, a1, a2)} fill="#d9472d" />
      <Path d={wedgePath(R - 14, a1, a2)} fill="#f6cf5c" />
      {TOPPINGS.filter(([, t]) => inside(t)).map(([rf, t], k) => {
        const p = pt(R * rf, t);
        return (
          <G key={k}>
            <Circle cx={p.x} cy={p.y} r={9} fill="#b8322a" />
            <Circle cx={p.x - 2.5} cy={p.y - 2.5} r={2.4} fill="#e0665f" />
          </G>
        );
      })}
    </Svg>
  );
}

function pieceWord(n: number, count: number) {
  if (n === 1) return count === 1 ? 'the whole pizza' : `${count} whole pizzas`;
  const [one, many] = n === 2 ? ['half', 'halves'] : ['quarter', 'quarters'];
  return `${count} ${count === 1 ? one : many}`;
}

/** The knife sweeping through the pizza: a line that grows from one side to the other. */
function CutStroke({ angle }: { angle: number }) {
  const v = useSharedValue(0);
  useEffect(() => { v.value = withTiming(1, { duration: 440, easing: Easing.out(Easing.quad) }); }, []);
  const L = R * 2 + 24;
  const line = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle}deg` }, { translateX: -(1 - v.value) * L / 2 }, { scaleX: Math.max(0.001, v.value) }] }));
  const knife = useAnimatedStyle(() => ({ opacity: v.value < 0.98 ? 1 : 0, transform: [{ rotate: `${angle}deg` }, { translateX: -L / 2 + v.value * L }, { translateY: -16 }] }));
  return (
    <>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: CX - L / 2, top: CY - 2, width: L, height: 4, borderRadius: 2, backgroundColor: C.cream }, line]} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: CX - 15, top: CY - 15, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }, knife]}>
        <Text style={{ fontSize: 24 }}>🔪</Text>
      </Animated.View>
    </>
  );
}

function Steam({ x }: { x: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: 10, width: 60, height: 80 }}>
      {[0, 1, 2].map(k => (
        <Drift key={k} from={k * 14} to={k * 14 + 6} rise={46} duration={1800 + k * 300} delay={k * 250} style={{ position: 'absolute', left: 0, bottom: 0 }}>
          <View style={{ width: 16 - k * 3, height: 16 - k * 3, borderRadius: 10, backgroundColor: 'rgba(255,255,255,.75)' }} />
        </Drift>
      ))}
    </View>
  );
}

/** Fraction strip: the same pizza as a bar split into equal parts. */
function FractionBar({ n, servedCount, glow }: { n: number; servedCount: number; glow: boolean }) {
  return (
    <Highlight active={glow} color={C.violet} style={{ width: 220, alignSelf: 'center' }}>
      <View style={{ height: 26, borderRadius: 8, overflow: 'hidden', flexDirection: 'row', borderWidth: 2, borderColor: C.woodDeep, backgroundColor: '#f6cf5c' }}>
        {Array.from({ length: n }, (_, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: i < servedCount ? C.teal : 'transparent', borderRightWidth: i < n - 1 ? 2 : 0, borderRightColor: C.woodDeep }}>
            <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11, color: i < servedCount ? C.cream : C.woodDeep }}>{n === 1 ? '1 whole' : `1/${n}`}</Text>
          </View>
        ))}
      </View>
    </Highlight>
  );
}

type RoundProps = RootScreen<'Cafe'> & { seed: number; twin: boolean; onPlayAnother: () => void; onTwin: () => void };

function CafeRound({ navigation, seed, twin, onPlayAnother, onTwin }: RoundProps) {
  const grade = useGame(s => s.grade);
  const micAllowed = useGame(s => s.settings.micAllowed);
  const signals = useGame(s => s.signals);
  const ins = useSafeAreaInsets();
  // Short phones draw the main scene smaller so the pieces stay on screen.
  const fit = useFitScale();
  const { width: W } = useWindowDimensions();
  // One service: a short queue of generated orders, from the child's recent fraction history.
  // One service: grade decides how many customers and which fractions; history nudges it;
  // and some services arrive pre-cut into quarters so a "half" order means seeing 2/4 = 1/2.
  const service = useMemo(() => genCafeService(grade, pickDifficulty(signals, 'fractions'), seed, lastKindOf(signals, 'cafe')), [seed]);
  const rounds: Order[] = useMemo(() => service.orders.map(orderInfo), [service]);
  const precutFirst = service.kind === 'precut';
  const startConcrete = useMemo(() => ['blocks', 'groups'].includes(nextRepresentation(signals, 'fractions')), [seed]);

  const [roundIdx, setRoundIdx] = useState(0);
  const [cuts, setCuts] = useState<number[]>(() => (precutFirst ? [90, 0] : []));
  const [cutting, setCutting] = useState<{ angle: number; k: number } | null>(null);
  const [served, setServed] = useState<string[]>([]);
  const [mode, setMode] = useState<'knife' | 'serve'>(precutFirst ? 'serve' : 'knife');
  const [coach, setCoach] = useState<{ text: string; mood: Mood; who: 'numi' | 'milo' }>({
    text: twin
      ? `Your turn! This customer wants ${rounds[0].name}. Try it on your own — swipe to cut.`
      : precutFirst
        ? `I already cut this pizza into 4 quarters! But the customer wants ${rounds[0].name}. How many quarters make that?`
        : 'Swipe across the pizza with the knife to cut it!',
    mood: 'happy',
    who: 'milo',
  });
  const [solved, setSolved] = useState(false);
  const [burst, setBurst] = useState(0);
  const [slip, setSlip] = useState(0);
  const [plateWob, setPlateWob] = useState(0);
  const [revealStep, setRevealStep] = useState(0);
  const [hintLevel, setHintLevel] = useState(-1);
  const [highlight, setHighlight] = useState<string[]>([]);
  const [guides, setGuides] = useState(false);
  const [showBar, setShowBar] = useState(startConcrete);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [stuckOpen, setStuckOpen] = useState(false);
  const [padOpen, setPadOpen] = useState(false);
  const [demo, setDemo] = useState(false);
  const [winInfo, setWinInfo] = useState<{ count: number; n: number } | null>(null);
  const tutor = useRef<{ step: 'none' | 'ask-pieces' }>({ step: 'none' });
  const usedBreak = useRef(false);

  const order = rounds[roundIdx];
  const n = 2 ** cuts.length;
  const base = cuts[0] ?? 0;
  const slices = useMemo(() => Array.from({ length: n }, (_, i) => sliceInfo(n, i, base)), [n, base]);
  const customer = CUSTOMERS[roundIdx % CUSTOMERS.length];
  const recordPractice = useGame(s => s.recordPractice);
  const trk = useSignalTracker('cafe', 'fractions', tagKind(service.kind, `${rounds.map(o => o.short).join(' & ')} of a pizza`));

  // ─── Cutting ────────────────────────────────────────────────────────────────
  const doCut = (source: 'swipe' | 'tap' | 'voice' | 'hint', swipeAngle?: number) => {
    if (solved || cutting) return;
    if (cuts.length >= 2) {
      setCoach({ text: '4 quarters is as small as we slice today!', mood: 'happy', who: 'milo' });
      return;
    }
    const angle = cuts.length === 0 ? (swipeAngle === undefined ? 90 : snapAngle(swipeAngle)) : (cuts[0] + 90) % 180;
    trk.touch();
    haptic.snap();
    setServed([]);
    setCutting({ angle, k: Date.now() });
    setTimeout(() => {
      setCutting(null);
      setCuts(c => [...c, angle]);
      const pieces = 2 ** (cuts.length + 1);
      setCoach(pieces === 2
        ? { text: 'Snip! Now there are 2 pieces. Are they the same size?', mood: 'wow', who: 'milo' }
        : { text: 'Snip again! 4 pieces now — all the same size.', mood: 'wow', who: 'milo' });
      if (pieces === 4) setMode('serve');
    }, 480);
  };

  const cutRef = useRef(doCut);
  cutRef.current = doCut;

  // ─── Swiping (gesture → JS) ─────────────────────────────────────────────────
  const onSwipe = (sx0: number, sy0: number, sx1: number, sy1: number) => {
    if (solved || demo || cutting) return;
    // On web the gesture reports on-screen pixels; when the board is drawn smaller on a short
    // phone, map them back to the board's own units before judging the cut.
    const u = Platform.OS === 'web' ? 1 / fit : 1;
    const x0 = sx0 * u, y0 = sy0 * u, x1 = sx1 * u, y1 = sy1 * u;
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (cuts.length >= 2) { doCut('swipe'); return; }
    if (len < R) {
      trk.touch();
      setCoach({ text: 'Swipe all the way across the pizza — like a real knife!', mood: 'happy', who: 'milo' });
      return;
    }
    const dist = Math.abs(dx * (CY - y0) - dy * (CX - x0)) / len;
    if (dist > R * 0.22) {
      trk.attempt('cut off-center', false);
      haptic.nudge();
      setSlip(s => s + 1);
      setGuides(true);
      setCoach({ text: 'Whoa, the knife slipped! Cuts go through the middle so pieces are equal!', mood: 'worried', who: 'milo' });
      return;
    }
    doCut('swipe', (Math.atan2(dy, dx) * 180) / Math.PI);
  };
  const swipeRef = useRef(onSwipe);
  swipeRef.current = onSwipe;
  const swipeJS = useCallback((a: number, b: number, c: number, d: number) => swipeRef.current(a, b, c, d), []);
  const knifeTapJS = useCallback(() => {
    if (cutsLen.current === 0) setCoach({ text: 'Drag your finger across the pizza to slice it — or tap “Cut in half”.', mood: 'happy', who: 'milo' });
    else setCoach({ text: 'The knife is out! Tap 🍽 Serve to pick up slices.', mood: 'happy', who: 'milo' });
  }, []);
  const cutsLen = useRef(0);
  cutsLen.current = cuts.length;

  const sx = useSharedValue(0), sy = useSharedValue(0), ex = useSharedValue(0), ey = useSharedValue(0), trail = useSharedValue(0);
  const pan = Gesture.Pan()
    .minDistance(8)
    .onBegin(e => { sx.value = e.x; sy.value = e.y; ex.value = e.x; ey.value = e.y; })
    .onUpdate(e => { ex.value = e.x; ey.value = e.y; trail.value = 1; })
    .onEnd(e => {
      trail.value = withTiming(0, { duration: 260 });
      scheduleOnRN(swipeJS, sx.value, sy.value, e.x, e.y);
    })
    .onFinalize(() => { trail.value = withTiming(0, { duration: 260 }); });
  const tapKnife = Gesture.Tap().onEnd((_e, ok) => { if (ok) scheduleOnRN(knifeTapJS); });
  const knifeGesture = Gesture.Exclusive(pan, tapKnife);
  const trailA = useAnimatedStyle(() => {
    const dx = ex.value - sx.value, dy = ey.value - sy.value;
    const len = Math.sqrt(dx * dx + dy * dy);
    return {
      opacity: trail.value * 0.85,
      left: (sx.value + ex.value) / 2 - len / 2,
      top: (sy.value + ey.value) / 2 - 2,
      width: len,
      transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
    };
  });

  // ─── Serving ────────────────────────────────────────────────────────────────
  const eqText = (k: number, pieces: number) => (k === 0 ? '' : `${Array.from({ length: k }, () => `1/${pieces}`).join(' + ')}${k > 1 ? ` = ${k}/${pieces}` : ''}`);

  const evaluate = (next: string[], bell: boolean) => {
    const k = next.length;
    const lhs = k * order.den, rhs = order.num * n;
    const possible = rhs % order.den === 0;
    const need = rhs / order.den;
    if (possible && lhs === rhs) { win(k); return; }
    if (!possible && k > 0) {
      trk.attempt(`${k}/${n}`, false);
      haptic.nudge();
      setPlateWob(w => w + 1);
      const text = n === 1
        ? `That's the whole pizza! The order was ${order.name} — let's cut it first.`
        : order.den === 4 && order.num === 1
          ? `That's ${pieceWord(n, k)}. A quarter is smaller — cut again!`
          : `That's ${pieceWord(n, k)}. ${cap(order.name)} needs smaller pieces — cut again to make quarters!`;
      setCoach({ text, mood: 'think', who: 'milo' });
      setGuides(true);
      return;
    }
    if (lhs > rhs) {
      trk.attempt(`${k}/${n}`, false);
      haptic.nudge();
      setPlateWob(w => w + 1);
      setCoach({ text: `That's ${pieceWord(n, k)} — the order was ${order.name}. ${cap(order.name)} is ${need} of ${n} equal pieces. Tap a slice on the plate to take it back.`, mood: 'think', who: 'milo' });
      return;
    }
    if (bell) {
      trk.attempt(`${k}/${n}`, false);
      haptic.nudge();
      setPlateWob(w => w + 1);
      setCoach({ text: k === 0 ? `The plate is empty! The order is ${order.name}.` : `That's ${pieceWord(n, k)} — the order was ${order.name}. ${cap(order.name)} is ${need} of ${n} equal pieces. ${need - k} more!`, mood: 'think', who: 'milo' });
      return;
    }
    setCoach({ text: `${eqText(k, n)} on the plate so far…`, mood: 'happy', who: 'numi' });
  };

  const serve = (id: string, source: 'drag' | 'tap'): boolean => {
    if (solved || demo || served.includes(id)) return false;
    const next = [...served, id];
    setServed(next);
    setHighlight([]);
    trk.touch();
    if (source === 'tap') haptic.snap();
    evaluate(next, false);
    return true;
  };

  const takeBack = (id: string) => {
    if (solved || demo) return;
    haptic.tap();
    trk.touch();
    setServed(s => s.filter(x => x !== id));
    setCoach({ text: 'Slice back on the board. Changing your mind is a great chef move!', mood: 'happy', who: 'milo' });
  };

  const win = (k: number) => {
    trk.attempt(`${k}/${n}`, true);
    if (n !== order.den) { usedBreak.current = true; trk.strategy('break'); }
    setSolved(true);
    setWinInfo({ count: k, n });
    setHintLevel(-1);
    setHighlight([]);
    setGuides(false);
    setVoiceOpen(false);
    haptic.success();
    setBurst(b => b + 1);
    setCoach({ text: `Order up! That's exactly ${order.name}. Yum!`, mood: 'wow', who: 'milo' });
    say(`Order up! That's exactly ${order.name}!`);
    setRevealStep(0);
    [1, 2].forEach(s => setTimeout(() => setRevealStep(s), 700 + s * 700));
  };

  const resetBoard = () => {
    setCuts([]); setServed([]); setSolved(false); setWinInfo(null); setRevealStep(0);
    setMode('knife'); setGuides(false); setHighlight([]); setHintLevel(-1);
    tutor.current.step = 'none';
  };

  const nextRound = () => {
    if (roundIdx + 1 < rounds.length) {
      const nk = rounds[roundIdx + 1];
      resetBoard();
      setRoundIdx(i => i + 1);
      setCoach({ text: `Ding! A new customer wants ${nk.name}. Fresh pizza — ready to slice!`, mood: 'happy', who: 'milo' });
      say(nk.ask);
      return;
    }
    const sig = trk.finish();
    if (twin && !sig.hints.includes('demo')) sig.hints.push('demo');
    finishChallenge(navigation, 'cafe', sig, { suggested: 'break' });
  };

  // ─── Stuck detection ────────────────────────────────────────────────────────
  useStuckDetector({
    wrongStreak: trk.wrongStreak, idleMs: trk.idleMs, paused: voiceOpen || stuckOpen || padOpen || solved || demo,
    onStuck: () => { haptic.nudge(); setStuckOpen(true); say('Hmm… this one\'s tricky. Want to solve it together?'); },
  });

  const needCuts = order.den === 2 ? 1 : 2;
  const needPieces = (order.num * n) / order.den;
  const sliceIdsToServe = () => slices.filter(s => !served.includes(s.id)).slice(0, Math.max(0, needPieces - served.length)).map(s => s.id);

  // ─── Hint ladder (visual, never "wrong") ────────────────────────────────────
  const applyHint = (lvl: number) => {
    const kind: HintKind = HINT_LADDER[Math.min(lvl, 4)];
    trk.hint(kind);
    setHintLevel(lvl);
    let line = '';
    if (kind === 'gentle') {
      line = cuts.length === 0
        ? `Look at the order: ${order.name}. What could you do to the pizza first?`
        : `Look at your pieces. Are they the right size for ${order.name}?`;
      setHighlight(['ticket']);
    } else if (kind === 'visual') {
      setGuides(true);
      setHighlight(['pizza']);
      line = cuts.length < 2 ? 'See the dashed lines? That\'s where the knife goes — right through the middle.' : 'Each piece is the same size. Count how many the customer needs.';
    } else if (kind === 'strategy') {
      setGuides(true);
      setShowBar(true);
      line = order.den === 2
        ? 'One cut through the middle makes 2 equal pieces — halves. One half is 1 of those 2.'
        : 'Half then half again makes quarters! Cut once, then cut the other way.';
    } else if (kind === 'guided') {
      if (cuts.length === 0) {
        doCut('hint');
        line = needCuts > 1 ? 'I made the first cut, straight through the middle. You make the next one — swipe the other way!' : 'I made the cut. Now serve the customer!';
        setGuides(true);
      } else if (cuts.length < needCuts) {
        setGuides(true);
        setMode('knife');
        line = 'One more cut — swipe across the other dashed line!';
      } else {
        const ids = sliceIdsToServe();
        setHighlight(ids);
        setMode('serve');
        line = `Serve the glowing ${ids.length === 1 ? 'slice' : 'slices'} to the plate.`;
      }
    } else {
      runDemo();
      return;
    }
    setCoach({ text: line, mood: 'happy', who: 'numi' });
    say(line);
  };

  const runDemo = () => {
    setDemo(true);
    const o = order;
    const cutsNeeded = o.den === 2 ? 1 : 2;
    setCuts([]); setServed([]); setHighlight([]);
    setCoach({ text: `Watch me: one cut through the middle…`, mood: 'happy', who: 'numi' });
    const cutAt = (angle: number, list: number[], delay: number) => setTimeout(() => {
      haptic.snap();
      setCutting({ angle, k: Date.now() });
      setTimeout(() => { setCutting(null); setCuts(list); }, 480);
    }, delay);
    cutAt(90, [90], 600);
    if (cutsNeeded > 1) {
      setTimeout(() => setCoach({ text: '…then half again, the other way. Now there are 4 equal quarters!', mood: 'think', who: 'numi' }), 1500);
      cutAt(0, [90, 0], 1700);
    }
    const pieces = 2 ** cutsNeeded;
    const k = (o.num * pieces) / o.den;
    const t0 = 1400 + cutsNeeded * 1100;
    for (let j = 0; j < k; j++) setTimeout(() => { haptic.snap(); setServed(s => [...s, `w${j}`]); }, t0 + j * 600);
    setTimeout(() => {
      const line = `${k} of ${pieces} equal pieces is ${o.short}. That's ${o.name}! Now a new order — just for you.`;
      setCoach({ text: line, mood: 'wow', who: 'numi' });
      say(line);
    }, t0 + k * 600 + 200);
    setTimeout(onTwin, t0 + k * 600 + 4200);
  };

  // ─── Stuck choices ──────────────────────────────────────────────────────────
  const onStuck = (c: StuckChoice) => {
    setStuckOpen(false);
    trk.resetIdle();
    if (c === 'talk') { trk.asked(true); setVoiceOpen(true); }
    if (c === 'show') applyHint(Math.max(1, hintLevel + 1));
    if (c === 'objects') {
      setShowBar(true); trk.represent('blocks'); trk.hint('visual');
      setHighlight(['bar']);
      setCoach({ text: 'Here\'s your pizza as a strip. Same cuts, same equal parts — count them!', mood: 'happy', who: 'numi' });
    }
    if (c === 'draw') setPadOpen(true);
  };

  // ─── Voice tutor (reads the live board) ─────────────────────────────────────
  const sliceIds = slices.filter(s => !served.includes(s.id)).map(s => s.id);
  const respond = (intent: Intent, heard: string): Reply => {
    trk.asked(true);
    const t = tutor.current;
    const text = heard.toLowerCase();
    if (intent.kind === 'command' && intent.action === 'cut') {
      if (solved) return { line: 'This order is done — look how happy they are!' };
      if (cuts.length >= 2) return { line: 'It\'s already in 4 quarters — that\'s as small as we slice today!', highlight: sliceIds };
      const wantsHalf = /half|halves/.test(text) || intent.values.includes(2);
      if (wantsHalf && cuts.length === 1) return { line: 'It\'s already cut in half — 2 equal pieces! Want to cut it again?', highlight: sliceIds, chips: ['Cut it again', 'What does half mean?'] };
      return { line: cuts.length === 0 ? 'Okay! One cut, right through the middle…' : 'Cutting again — the other way!', command: intent };
    }
    if (intent.kind === 'explain-concept') {
      if (/half/.test(intent.topic)) {
        return n >= 2
          ? { line: n === 2 ? 'Half means 2 equal pieces — look, your 2 pieces are the same size.' : 'Half means 1 of 2 equal pieces. With quarters, 2 quarters make a half — look!', highlight: n === 2 ? sliceIds : sliceIds.slice(0, 2) }
          : { line: 'Half means 2 equal pieces. Cut the pizza once through the middle and you\'ll see!', highlight: ['pizza'] };
      }
      if (/quarter/.test(intent.topic)) return { line: 'A quarter means 1 of 4 equal pieces. Half, then half again!', highlight: n === 4 ? sliceIds.slice(0, 1) : ['pizza'] };
      return { line: 'A fraction is a piece of a whole. The bottom number says how many equal pieces; the top says how many you have.', highlight: ['pizza'] };
    }
    if (intent.kind === 'answer' && t.step === 'ask-pieces') {
      if (intent.n === order.den) {
        t.step = 'none';
        const more = cuts.length < needCuts;
        return { line: more ? `Yes! ${order.den} equal pieces. ${n === 1 ? 'Cut it in half first!' : 'Cut it again to make them!'}` : `Yes! ${order.den} equal pieces — and you have them. Now serve ${needPieces}!`, highlight: more ? ['pizza'] : sliceIdsToServe(), chips: more ? [n === 1 ? 'Cut it in half' : 'Cut it again'] : undefined, done: true };
      }
      return { line: `Let's look: ${order.name} is ${order.num} of ${order.den} equal pieces. Count the pieces in the word — how many pieces make the whole?`, expectNumber: true, chips: ['2', '3', '4'], highlight: ['ticket'], hint: 'visual' };
    }
    if (intent.kind === 'why-wrong') {
      return { line: served.length ? `Nothing's wrong! The plate has ${pieceWord(n, served.length)}. The order is ${order.name} — let's compare.` : `Nothing's wrong at all. Every cut teaches us something!`, highlight: ['plate'] };
    }
    if (intent.kind === 'another-way') {
      setShowBar(true); trk.represent('blocks');
      return { line: 'Here\'s the pizza as a strip. Same equal parts — see how many the order needs?', highlight: ['bar'], hint: 'visual' };
    }
    if (intent.kind === 'explanation' || intent.kind === 'feeling') {
      return { line: 'I love hearing how you think! Let\'s finish this order and you can tell me more.' };
    }
    // confused / clue / anything else → describe the actual pizza
    trk.hint('gentle');
    if (n === 1) {
      return { line: `The pizza is still whole. The customer wants ${order.name}. What could you do to make equal pieces?`, highlight: ['pizza'], hint: 'gentle', chips: ['Cut it in half', 'What does half mean?'] };
    }
    if (n < order.den) {
      t.step = 'ask-pieces';
      return { line: `Your pizza is in ${n} pieces. The customer wants ${order.name} — that's ${order.num} of ${order.den} pieces. How many pieces do we need?`, highlight: sliceIds, expectNumber: true, chips: ['2', '3', '4'], hint: 'gentle' };
    }
    const k = served.length;
    if (k > needPieces) return { line: `The plate has ${pieceWord(n, k)}, but ${order.name} is only ${needPieces} of ${n}. Tap a slice on the plate to take it back.`, highlight: ['plate'], hint: 'gentle' };
    return { line: `Your pizza is in ${n} equal pieces. ${cap(order.name)} is ${needPieces} of them${k ? ` — you've served ${k}` : ''}. ${k ? `${needPieces - k} more!` : 'Tap 🍽 Serve and move them to the plate.'}`, highlight: sliceIdsToServe(), hint: 'gentle' };
  };

  const onReply = (r: Reply) => {
    setHighlight(r.highlight ?? []);
    setCoach({ text: r.line, mood: r.done ? 'wow' : 'happy', who: 'numi' });
    if (r.hint) setHintLevel(h => Math.max(h, HINT_LADDER.indexOf(r.hint!)));
    if (r.command?.kind === 'command' && r.command.action === 'cut') {
      setMode('knife');
      setTimeout(() => cutRef.current('voice'), 600);
    }
    if (r.done) setTimeout(() => setVoiceOpen(false), 3800);
  };

  // ─── Render helpers ─────────────────────────────────────────────────────────
  const pieceLabel = n === 1 ? '1 whole' : n === 2 ? '2 halves · each is 1/2' : '4 quarters · each is 1/4';
  const guideAngles = !guides ? [] : cuts.length === 0 ? (needCuts > 1 ? [90, 0] : [90]) : cuts.length === 1 ? [(cuts[0] + 90) % 180] : [];
  const servedSlices = slices.filter(s => served.includes(s.id));
  const PLATE_S = 0.36;
  const knifeOn = mode === 'knife' && !solved && !demo;
  const canCut = !solved && !demo && !cutting && cuts.length < 2;

  return (
    <DropProvider>
      <View style={{ flex: 1, backgroundColor: BG }}>
        <GameBody>
        <View style={{ paddingTop: ins.top + 8, paddingHorizontal: 20 }}>
          <TopBar back="← Map" onBack={() => navigation.goBack()} right={<><Purse /><AskNumiButton onPress={() => { trk.asked(true); setVoiceOpen(true); }} glowing={trk.wrongStreak > 0 && !voiceOpen} /></>} />
          {/* ─── order ticket ─── */}
          <Enter delay={80}>
            <Highlight active={highlight.includes('ticket')} color={C.violet}>
              <View style={[{ marginTop: 10, backgroundColor: C.paper, borderRadius: 22, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 6, borderLeftColor: C.coral }, softShadow(0.1, 4)]}>
                <Buddy id={customer} size={46} mood={solved ? 'wow' : 'happy'} cheering={solved} />
                <View style={{ flex: 1 }}>
                  <Eyebrow>{`ORDER ${roundIdx + 1} OF ${rounds.length}${twin ? ' · ON YOUR OWN' : ''}`}</Eyebrow>
                  <View style={{ marginTop: 3, backgroundColor: C.sunSoft, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' }}>
                    <Text style={[T.body, { fontSize: 15 }]}>“{solved ? 'Yum — thank you!' : order.ask}”</Text>
                  </View>
                </View>
                {hintLevel >= 0 && (
                  <View style={{ flexDirection: 'row', gap: 3 }}>
                    {HINT_LADDER.map((h, i) => <View key={h} style={{ width: 7, height: 7 + i * 3, borderRadius: 3, alignSelf: 'flex-end', backgroundColor: i <= hintLevel ? C.violet : C.sand }} />)}
                  </View>
                )}
              </View>
            </Highlight>
          </Enter>
        </View>

        {/* ─── pizza on the board ─── */}
        <AutoScale k={fit}>
        <View style={{ height: 240, marginTop: 8, alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
          {solved && <><Steam x={W / 2 - 110} /><Steam x={W / 2 + 60} /></>}
          <Wobble trigger={slip} style={[{ width: P + 16, height: P + 16, borderRadius: 32, backgroundColor: C.wood, borderBottomWidth: 6, borderBottomColor: C.woodShadow, alignItems: 'center', justifyContent: 'center' }, softShadow(0.14, 5)]}>
            <View pointerEvents="none" style={{ position: 'absolute', left: 14, right: 14, top: 40, height: 2, backgroundColor: 'rgba(120,70,20,.25)' }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: 30, right: 20, bottom: 50, height: 2, backgroundColor: 'rgba(120,70,20,.2)' }} />
            <Highlight active={highlight.includes('pizza')} style={{ width: P, height: P }}>
              {slices.map(s => served.includes(s.id) ? (
                <View key={s.id} pointerEvents="none" style={{ position: 'absolute', left: s.box.x, top: s.box.y, opacity: 0.16 }}>
                  <PizzaWedge s={s} />
                </View>
              ) : (
                <Draggable
                  key={`${n}-${s.id}`}
                  id={s.id}
                  a11y={`Pizza slice, one ${n === 2 ? 'half' : n === 4 ? 'quarter' : 'whole'}`}
                  style={{ position: 'absolute', left: s.box.x + s.off.x, top: s.box.y + s.off.y }}
                  disabled={solved || demo || knifeOn}
                  onDrop={z => (z === 'plate' ? (serve(s.id, 'drag') ? 'accept' : 'reject') : 'ignore')}
                  onTap={() => serve(s.id, 'tap')}
                >
                  <Highlight active={highlight.includes(s.id)}>
                    <PizzaWedge s={s} />
                  </Highlight>
                </Draggable>
              ))}
              {guideAngles.length > 0 && (
                <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
                  <Svg width={P} height={P}>
                    {guideAngles.map(a => {
                      const p1 = pt(R + 8, a), p2 = pt(R + 8, a + 180);
                      return <Line key={a} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={C.violet} strokeWidth={4} strokeDasharray="10 8" strokeLinecap="round" />;
                    })}
                  </Svg>
                </View>
              )}
              {cutting && <CutStroke key={cutting.k} angle={cutting.angle} />}
              {knifeOn && (
                <GestureDetector gesture={knifeGesture}>
                  <View collapsable={false} accessibilityLabel="Pizza. Swipe across it to cut" style={{ position: 'absolute', left: 0, top: 0, width: P, height: P }}>
                    <Animated.View pointerEvents="none" style={[{ position: 'absolute', height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.95)' }, trailA]} />
                  </View>
                </GestureDetector>
              )}
            </Highlight>
          </Wobble>
          <Burst trigger={burst} x={W / 2} y={120} count={20} dist={130} />
        </View>

        <View style={{ alignItems: 'center', marginTop: 4, gap: 6 }}>
          <Pop key={n}><Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: C.woodDeep }}>{pieceLabel}</Text></Pop>
          {showBar && <FractionBar n={n} servedCount={served.length} glow={highlight.includes('bar')} />}
        </View>

        {/* ─── the customer's plate ─── */}
        <Wobble trigger={plateWob} style={{ marginHorizontal: 16, marginTop: 8 }}>
          <DropZone id="plate" pad={24}>
            <Highlight active={highlight.includes('plate')} color={C.teal}>
              <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.paper, borderRadius: 24, padding: 8, borderWidth: 3, borderColor: solved ? C.teal : '#eadfce' }, softShadow(0.08, 3)]}>
                <View style={{ width: P * PLATE_S + 16, height: P * PLATE_S + 16, borderRadius: 60, backgroundColor: C.white, borderWidth: 3, borderColor: C.sandLine, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: P * PLATE_S, height: P * PLATE_S }}>
                    {servedSlices.map(s => (
                      <Tap key={s.id} onPress={() => takeBack(s.id)} a11y="Served slice. Tap to take it back" style={{ position: 'absolute', left: s.box.x * PLATE_S, top: s.box.y * PLATE_S }}>
                        <PizzaWedge s={s} scale={PLATE_S} />
                      </Tap>
                    ))}
                    {!servedSlices.length && <Text style={{ position: 'absolute', alignSelf: 'center', top: P * PLATE_S / 2 - 14, fontSize: 22, opacity: 0.4 }}>🍽</Text>}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Eyebrow>{solved ? 'ORDER UP!' : 'CUSTOMER’S PLATE'}</Eyebrow>
                  {solved && winInfo ? (
                    <View style={{ marginTop: 2 }}>
                      {revealStep >= 1 && <Pop><Text style={[T.body, { color: C.tealDeep }]}>{winInfo.count} of {winInfo.n} equal pieces</Text></Pop>}
                      {revealStep >= 2 && <Pop><Text style={{ fontFamily: F.display, fontSize: 28, lineHeight: 34, color: C.ink }}>{winInfo.n !== order.den ? `${winInfo.count}/${winInfo.n} = ${order.short}` : order.short}</Text></Pop>}
                    </View>
                  ) : served.length ? (
                    <Text style={{ fontFamily: F.display, fontSize: served.length > 2 ? 18 : 22, lineHeight: 28, color: C.ink }}>{eqText(served.length, n)}</Text>
                  ) : (
                    <Text style={[T.bodySm, { marginTop: 2 }]}>{n === 1 ? 'Cut the pizza, then serve slices here.' : 'Drag or tap slices to serve them.'}</Text>
                  )}
                </View>
              </View>
            </Highlight>
          </DropZone>
        </Wobble>

        </AutoScale>

        {/* ─── coach ─── */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, marginTop: 10 }}>
          <Bob amp={3} duration={1600}>
            {coach.who === 'milo'
              ? <Buddy id="milo" size={50} mood={coach.mood} cheering={solved} />
              : <Numi size={54} mood={coach.mood} state={solved ? 'celebrate' : 'idle'} />}
          </Bob>
          <View style={[{ flex: 1, backgroundColor: C.cream, borderRadius: 20, padding: 11 }, softShadow(0.08, 3)]}>
            <Text style={[T.eyebrow, { fontSize: 9.5, color: coach.who === 'milo' ? C.coralDeep : C.violet }]}>{coach.who === 'milo' ? 'CHEF MILO' : 'NUMI'}</Text>
            <Text style={[T.body, { fontSize: 13.5 }]}>{coach.text}</Text>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        {/* ─── chef tools ─── */}
        {solved ? (
          <Enter style={{ paddingHorizontal: 20, paddingBottom: ins.bottom + 16, flexDirection: 'row', gap: 10 }}>
            {roundIdx + 1 >= rounds.length && (
              <ChunkyButton style={{ flex: 1 }} size="md" icon="🔁" label="New order" color={C.sun} shadow={C.sunDeep} textColor={C.ink} a11y="Serve another customer with a new order" onPress={() => { recordPractice(trk.finish()); onPlayAnother(); }} />
            )}
            <ChunkyButton style={{ flex: 1 }} size="md" label={roundIdx + 1 < rounds.length ? 'Next customer →' : twin ? 'I did it!' : 'Continue'} color={C.teal} shadow={C.tealDeep} onPress={nextRound} />
          </Enter>
        ) : (
          <View style={[{ backgroundColor: C.sand, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 12, paddingBottom: ins.bottom + 12 }, softShadow(0.14, -6)]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Eyebrow color="#8c8377">CHEF TOOLS</Eyebrow>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Tap onPress={() => setPadOpen(true)} a11y="Open scratchpad" style={{ backgroundColor: C.cream, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10 }}><Text style={{ fontSize: 15 }}>✏️</Text></Tap>
                <Tap onPress={() => { const on = !showBar; setShowBar(on); if (on) { trk.represent('blocks'); trk.touch(); } }} a11y="Show fraction strip" style={{ backgroundColor: showBar ? C.ink : C.cream, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10 }}><Text style={{ fontSize: 15 }}>🧩</Text></Tap>
                <Tap onPress={() => applyHint(hintLevel + 1)} disabled={demo} a11y="Get a hint" style={{ backgroundColor: C.violet, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10 }}><Text style={{ fontSize: 15 }}>💡</Text></Tap>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', backgroundColor: C.sandDeep, borderRadius: 16, padding: 3 }}>
                {(['knife', 'serve'] as const).map(m => (
                  <Tap key={m} onPress={() => { setMode(m); trk.touch(); }} disabled={demo} a11y={m === 'knife' ? 'Knife mode: swipe to cut' : 'Serve mode: move slices'} style={{ backgroundColor: mode === m ? C.ink : 'transparent', borderRadius: 13, paddingVertical: 8, paddingHorizontal: 10 }}>
                    <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12.5, color: mode === m ? C.cream : C.ink }}>{m === 'knife' ? '🔪 Knife' : '🍽 Serve'}</Text>
                  </Tap>
                ))}
              </View>
              <ChunkyButton
                size="sm"
                style={{ flex: 1 }}
                label={cuts.length === 0 ? 'Cut in half' : 'Cut again'}
                color={C.coral}
                shadow={C.coralDeep}
                disabled={!canCut}
                onPress={() => { setMode('knife'); doCut('tap'); }}
              />
              <ChunkyButton size="sm" icon="🛎" a11y="Ring the bell: serve the order" color={C.sun} shadow={C.sunDeep} disabled={demo || !served.length} onPress={() => evaluate(served, true)} />
            </View>
            <Text style={[T.bodySm, { fontSize: 11, marginTop: 6 }]}>{knifeOn ? 'Swipe across the pizza to cut it.' : 'Drag a slice to the plate — or tap it.'}</Text>
          </View>
        )}

        </GameBody>
        <AskNumi
          open={voiceOpen}
          onClose={() => { setVoiceOpen(false); trk.resetIdle(); }}
          respond={respond}
          onReply={onReply}
          opener={n === 1 ? `I can see a whole pizza. The order is ${order.name}. What are you thinking?` : `I can see your pizza in ${n} pieces. The order is ${order.name}. What are you thinking?`}
          chips={["I don't understand", 'Cut it in half', 'Cut it again', 'What does half mean?', 'Give me a clue'].slice(0, micAllowed ? 5 : 4)}
          style={{ position: 'absolute', left: 12, right: 12, bottom: ins.bottom + 10 }}
        />
        <StuckSheet open={stuckOpen} onChoose={onStuck} onClose={() => { setStuckOpen(false); trk.resetIdle(); }} />
        <Scratchpad open={padOpen} onClose={() => { setPadOpen(false); trk.resetIdle(); }} title={`Order: ${order.name}${n > 1 ? ` · pizza in ${n} pieces` : ''}`} />
        {demo && <View style={{ position: 'absolute', top: ins.top + 64, alignSelf: 'center', backgroundColor: C.violet, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 }}><Text style={{ fontFamily: F.bodyHeavy, color: C.cream, fontSize: 12 }}>NUMI IS SHOWING YOU</Text></View>}
      </View>
    </DropProvider>
  );
}

/** Endless service: "New order" (and the demo's twin) remount with a fresh seed and tracker. */
export default function FractionCafe(props: RootScreen<'Cafe'>) {
  const [round, setRound] = useState(() => ({ n: 0, seed: newSeed(), twin: false }));
  return (
    <CafeRound
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

function snapAngle(a: number) {
  const m = ((a % 180) + 180) % 180;
  return m < 45 || m > 135 ? 0 : 90;
}
