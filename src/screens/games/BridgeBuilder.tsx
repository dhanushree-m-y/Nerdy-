// BRIDGE BUILDER — addition through physical building. The equation is revealed, never asked.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AskNumi, AskNumiButton, Reply } from '../../components/AskNumi';
import { Buddy, Numi } from '../../components/characters';
import { Burst } from '../../components/effects';
import { DropProvider, DropZone, Draggable } from '../../components/dragdrop';
import { Bob, Enter, FloatUp, Highlight, Pop, Squash, Wobble } from '../../components/motion';
import { DriftingClouds, House, River, Tree } from '../../components/scenery';
import { Scratchpad } from '../../components/Scratchpad';
import { StuckChoice, StuckSheet } from '../../components/sheets';
import { ChunkyButton, Eyebrow, GameBody, MuteButton, Purse, ScaleBox, Tap, TopBar, useFitScale } from '../../components/ui';
import { HINT_LADDER, HintKind, Intent, nextRepresentation } from '../../learning/engine';
import { genBridge, lastKindOf, newSeed, pickDifficulty, tagKind } from '../../learning/generator';
import { useSignalTracker, useStuckDetector } from '../../learning/session';
import { finishChallenge } from '../../navigation/flow';
import { RootScreen } from '../../navigation/types';
import { haptic, say } from '../../services/feedback';
import { useGame } from '../../store/game';
import Svg, { Circle, Path } from 'react-native-svg';
import { alpha, outline, shade, tint } from '../../theme/palette';
import { C, F, Mood, softShadow, T } from '../../theme/tokens';

type Piece = { id: string; v: number };
type TutorStep = 'none' | 'ask-ten' | 'ask-rest' | 'ask-gap';

const PIECE_COLORS = [C.sun, '#f0a24a', '#e9c46a', '#f3b877', '#e8a86b'];

/** Grassy river bank with a soil edge and a couple of pebbles. */
function Bank({ side, w, h }: { side: 'left' | 'right'; w: number; h: number }) {
  const flip = side === 'right';
  return (
    <View pointerEvents="none" style={{ position: 'absolute', [side]: 0, bottom: 0, width: w, height: h, transform: [{ scaleX: flip ? -1 : 1 }] }}>
      <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <Path d={`M0 18 q${w * 0.55} -12 ${w} 6 L${w} ${h} L0 ${h} Z`} fill="#8b6a42" />
        <Path d={`M0 18 q${w * 0.55} -12 ${w} 6 v16 q-${w * 0.5} -12 -${w} -2z`} fill={C.grass} />
        <Path d={`M0 30 q${w * 0.5} -10 ${w} 4`} stroke={tint(C.grass, 0.25)} strokeWidth={3} fill="none" />
        <Circle cx={w * 0.25} cy={h - 18} r={7} fill="#7d6047" opacity={0.8} />
        <Circle cx={w * 0.62} cy={h - 32} r={5} fill="#7d6047" opacity={0.6} />
        <Path d={`M${w * 0.2} 22 q-3 -8 -5 -11 M${w * 0.2} 22 q0 -9 1 -13 M${w * 0.2} 22 q4 -7 6 -10`} stroke="#6fb07e" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

function Plank({ v, unit, color = C.sun, showUnits, height = 44, label = true, dim = false, scale = 1, locked = false }: { v: number; unit: number; color?: string; showUnits?: boolean; height?: number; label?: boolean; dim?: boolean; scale?: number; locked?: boolean }) {
  const blocks = Math.max(1, Math.round(v / scale));
  const w = v * unit;
  // Big timbers carry numbers like 1350 — shrink the label so it always fits the plank.
  const labelSize = Math.max(11, Math.min(20, (w - 12) / (String(v).length * 0.62)));
  return (
    <View style={{ width: v * unit, height, borderRadius: 9, backgroundColor: color, borderWidth: 2, borderColor: outline(color, 0.34), borderBottomWidth: 6, borderBottomColor: shade(color, 0.3), flexDirection: 'row', overflow: 'hidden', opacity: dim ? 0.5 : 1 }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 3, height: height * 0.3, borderRadius: 6, backgroundColor: 'rgba(255,255,255,.28)' }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 6, right: 6, top: height * 0.62, height: 2, borderRadius: 2, backgroundColor: alpha('#7a4f26', 0.22) }} />
      {Array.from({ length: blocks }, (_, i) => (
        <View key={i} style={{ flex: 1, borderRightWidth: i < blocks - 1 ? (showUnits ? 2 : 1) : 0, borderRightColor: showUnits ? 'rgba(34,48,59,.35)' : 'rgba(120,70,20,.18)', alignItems: 'center', justifyContent: 'center' }}>
          {showUnits && <View style={{ width: Math.min(8, unit * scale * 0.35), height: Math.min(8, unit * scale * 0.35), borderRadius: 4, backgroundColor: 'rgba(34,48,59,.35)' }} />}
        </View>
      ))}
      {label && (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
          <View style={{ backgroundColor: 'rgba(253,245,232,.92)', borderRadius: 10, paddingHorizontal: labelSize < 16 ? 3 : 6, paddingVertical: 1, alignItems: 'center', flexDirection: 'row', gap: 2 }}>
            {locked && <Text style={{ fontSize: labelSize * 0.6 }}>📌</Text>}
            <Text style={{ fontFamily: F.display, fontSize: labelSize, lineHeight: labelSize * 1.3, color: C.ink }}>{v}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

type RoundProps = RootScreen<'Bridge'> & { seed: number; onPlayAnother: () => void };

function BridgeRound({ navigation, route, seed, onPlayAnother }: RoundProps) {
  const twin = !!route.params?.twin;
  const grade = useGame(s => s.grade);
  const micAllowed = useGame(s => s.settings.micAllowed);
  const signals = useGame(s => s.signals);
  // The round itself: this child's grade sets the numbers, their recent history nudges
  // them kinder or tougher, and the kind of problem never repeats back-to-back.
  const cfg = useMemo(() => genBridge(grade, pickDifficulty(signals, 'addition'), seed, lastKindOf(signals, 'bridge')), [seed]);
  const startConcrete = useMemo(() => ['blocks', 'groups'].includes(nextRepresentation(signals, 'addition')), [seed]);
  const T_ = cfg.gap;
  /** What one block on the bridge is worth (1, or 10/25/50 for the long timbers). */
  const SC = cfg.scale;
  const TICKS = T_ / SC;
  /** The planks in the pile that belong to the answer. */
  const pileSolution = cfg.fixed === null ? cfg.solution : cfg.solution.slice(1);
  const { width: W } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const width = Math.min(W, 440);
  const CLIFF = 46;
  const gapPx = width - 40 - CLIFF * 2 + 20;
  const unit = gapPx / T_;
  const trayUnit = Math.min(unit * 0.9, (width - 60) / Math.max(...cfg.pieces) );

  // A pre-laid plank ("started" rounds) lives on the bridge from the first frame and can't be lifted.
  const fixedPiece: Piece | null = useMemo(() => (cfg.fixed === null ? null : { id: 'fixed', v: cfg.fixed }), [cfg]);
  const pile: Piece[] = useMemo(() => cfg.pieces.map((v, i) => ({ id: `p${i}`, v })), [cfg]);
  const pieces: Piece[] = useMemo(() => (fixedPiece ? [fixedPiece, ...pile] : pile), [pile, fixedPiece]);
  const [placed, setPlaced] = useState<Piece[]>(() => (fixedPiece ? [fixedPiece] : []));
  const [hoverItem, setHoverItem] = useState<Piece | null>(null);
  const [overhang, setOverhang] = useState<{ v: number; k: number } | null>(null);
  const opening = twin
    ? `Your turn! This gap is ${T_} long. Try it on your own.`
    : cfg.kind === 'started'
      ? `Someone already nailed down a ${cfg.fixed} plank. The gap is ${T_} long — which plank finishes the bridge?`
      : cfg.kind === 'three'
        ? `This gap is ${T_} long, and it takes THREE planks to fill it. Plan it out!`
        : `The gap is ${T_} long. Pick up any piece — let's see what it makes!`;
  const [coach, setCoach] = useState<{ text: string; mood: Mood }>({ text: SC > 1 ? `${opening} Each block is worth ${SC}.` : opening, mood: 'happy' });
  const [hintLevel, setHintLevel] = useState(-1);
  const [highlight, setHighlight] = useState<string[]>([]);
  const [showUnits, setShowUnits] = useState(startConcrete);
  const [showTen, setShowTen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [stuckOpen, setStuckOpen] = useState(false);
  const [padOpen, setPadOpen] = useState(false);
  const [solved, setSolved] = useState(false);
  const [burst, setBurst] = useState(0);
  const [wob, setWob] = useState(0);
  const [plus, setPlus] = useState<{ k: number; text: string } | null>(null);
  const [revealStep, setRevealStep] = useState(0);
  const [demo, setDemo] = useState(false);
  const tutor = useRef<{ step: TutorStep; base: number; usedTen: boolean }>({ step: 'none', base: 0, usedTen: false });
  const recordPractice = useGame(s => s.recordPractice);
  const trk = useSignalTracker('bridge', 'addition', tagKind(cfg.kind, `${cfg.solution.join(' + ')} = ${T_}`), showUnits ? 'blocks' : 'symbolic');

  const sum = placed.reduce((a, p) => a + p.v, 0);
  // tryPlace runs from gesture callbacks, so it reads live values rather than render-time ones.
  const placedRef = useRef(placed);
  placedRef.current = placed;
  const solvedRef = useRef(false);
  const left = T_ - sum;
  const tray = pieces.filter(p => !placed.find(q => q.id === p.id));

  // Make-ten only makes sense when the gap passes ten AND the big plank stops short of it.
  const tenUseful = SC === 1 && cfg.kind !== 'three' && T_ > 10 && cfg.pair[0] < 10 && cfg.pair[1] > 10 - cfg.pair[0];

  useStuckDetector({
    wrongStreak: trk.wrongStreak, idleMs: trk.idleMs, paused: voiceOpen || stuckOpen || padOpen || solved || demo,
    onStuck: () => { haptic.nudge(); setStuckOpen(true); say('Hmm… this one\'s tricky. Want to solve it together?'); },
  });

  // ─── Placement ──────────────────────────────────────────────────────────────
  const tryPlace = useCallback((p: Piece, source: 'drag' | 'tap' | 'voice' = 'drag'): boolean => {
    const placed = placedRef.current;
    if (solvedRef.current || placed.find(q => q.id === p.id)) return false;
    const sum = placed.reduce((a, q) => a + q.v, 0);
    const tray = pieces.filter(q => !placed.find(x => x.id === q.id));
    const next = sum + p.v;
    if (next > T_) {
      trk.attempt(`${sum}+${p.v}=${next}`, false);
      setOverhang({ v: p.v, k: Date.now() });
      setTimeout(() => setOverhang(null), 1100);
      setWob(w => w + 1);
      const line = sum === 0
        ? `That piece is ${p.v}. The gap is only ${T_}!`
        : `${sum} and ${p.v} make ${next} — that pokes out by ${next - T_}. Try a shorter piece.`;
      setCoach({ text: line, mood: 'worried' });
      return false;
    }
    setPlaced(ps => [...ps, p]);
    setHighlight([]);
    if (next === T_) {
      trk.attempt(`${[...placed, p].map(x => x.v).join('+')}=${T_}`, true);
      if (tutor.current.usedTen) trk.strategy('make-ten');
      win();
    } else {
      trk.touch();
      const canFinish = tray.some(q => q.id !== p.id && q.v === T_ - next);
      if (!canFinish) {
        trk.attempt(`${[...placed, p].map(x => x.v).join('+')}=${next}`, false);
        setWob(w => w + 1);
        const built = placed.length ? `${[...placed, p].map(x => x.v).join(' + ')} makes ${next}` : `Your ${p.v} is in`;
        setCoach({ text: `${built}. We need ${T_ - next} more — but is there a ${T_ - next} piece? Tap a plank on the bridge to take it back.`, mood: 'think' });
      } else {
        setPlus({ k: Date.now(), text: `+${p.v}` });
        setCoach({ text: `${next} built! The gap still needs ${T_ - next} more.`, mood: 'happy' });
      }
    }
    if (source === 'voice') haptic.snap();
    return true;
  }, [pieces, T_]);

  const removePiece = (p: Piece) => {
    if (solved) return;
    if (p.id === 'fixed') {
      haptic.nudge();
      setCoach({ text: `That ${p.v} is nailed down — it's part of the bridge. Find what goes with it!`, mood: 'happy' });
      return;
    }
    haptic.tap();
    trk.touch();
    setPlaced(ps => ps.filter(q => q.id !== p.id));
    setCoach({ text: `Took the ${p.v} back. Changing your mind is a great move!`, mood: 'happy' });
  };

  const win = () => {
    solvedRef.current = true;
    setSolved(true);
    setHintLevel(-1);
    setHighlight([]);
    setVoiceOpen(false);
    haptic.success();
    setBurst(b => b + 1);
    setCoach({ text: 'The bridge holds! Look — Nia can cross!', mood: 'wow' });
    say('You did it! The bridge holds!');
    walk.value = withDelay(500, withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }));
    [1, 2, 3, 4].forEach(k => setTimeout(() => setRevealStep(k), 1400 + k * 450));
  };

  // ─── Hints (never "wrong") ─────────────────────────────────────────────────
  const applyHint = (lvl: number) => {
    const kind: HintKind = HINT_LADDER[Math.min(lvl, 4)];
    trk.hint(kind);
    setHintLevel(lvl);
    const pair = cfg.pair;
    if (kind === 'gentle') {
      setCoach({ text: sum ? `Look carefully at how much space is left after your ${sum}.` : `Look carefully at the gap. How long is it?`, mood: 'happy' });
    } else if (kind === 'visual') {
      setShowUnits(true); trk.represent('blocks');
      setHighlight(['gap', ...placed.map(p => p.id)]);
      setCoach({ text: SC === 1 ? `Watch what lights up. Each block is 1 — count the empty ones.` : `Watch what lights up. Each block is worth ${SC} — count the empty ones in ${SC}s.`, mood: 'happy' });
    } else if (kind === 'strategy') {
      if (tenUseful) {
        setShowTen(true);
        setCoach({ text: `Let's first make 10. See the 10 line? Fill up to it, then add the rest.`, mood: 'happy' });
      } else if (cfg.kind === 'three') {
        setCoach({ text: `Three planks! Put the biggest one in first, then find two that fill what's left.`, mood: 'happy' });
      } else if (cfg.kind === 'started') {
        setCoach({ text: `${cfg.fixed} is already down. Think: ${cfg.fixed} and how much more make ${T_}? That's the plank you need.`, mood: 'happy' });
      } else {
        setCoach({ text: `Start at the biggest plank you can use, then count on to ${T_}.`, mood: 'happy' });
      }
    } else if (kind === 'guided') {
      // Match what's on the bridge against the answer; anything extra has to come off first.
      const solLeft = [...cfg.solution];
      const offPlan: Piece[] = [];
      placed.forEach(p => { const k = solLeft.indexOf(p.v); if (k >= 0) solLeft.splice(k, 1); else offPlan.push(p); });
      if (offPlan.length) {
        setHighlight(offPlan.map(p => p.id));
        setCoach({ text: `Let's take the ${offPlan.map(p => p.v).join(' and the ')} back first — tap it on the bridge.`, mood: 'happy' });
      } else {
        const nextV = solLeft[0];
        const piece = tray.find(p => p.v === nextV);
        setHighlight(piece ? [piece.id] : []);
        const onlyFirst = placed.length === 1 && placed[0].v === pair[0];
        const text = !placed.length
          ? `Let's start with the ${nextV}. I'll make it glow — you drag it in.`
          : tenUseful && onlyFirst
            ? `${pair[0]} + ${10 - pair[0]} makes 10, then ${pair[1] - (10 - pair[0])} more. That's the glowing ${pair[1]}!`
            : solLeft.length > 1
              ? `You have ${sum}, and ${T_} − ${sum} is ${T_ - sum}. Two planks make ${T_ - sum} — start with the glowing ${nextV}.`
              : `You have ${sum}, and ${T_} − ${sum} is ${nextV}. That's the glowing ${nextV}!`;
        setCoach({ text, mood: 'happy' });
      }
    } else {
      runDemo();
    }
    say(coachRef.current);
  };
  const coachRef = useRef('');
  coachRef.current = coach.text;

  const runDemo = () => {
    setDemo(true);
    const base = fixedPiece ? [fixedPiece] : [];
    const used = new Set<string>();
    const seq = pileSolution.map(v => { const p = pile.find(q => q.v === v && !used.has(q.id))!; used.add(p.id); return p; });
    setPlaced(base);
    setCoach({ text: fixedPiece ? `Watch me. ${fixedPiece.v} is already down…` : `Watch me: ${seq[0].v}…`, mood: 'happy' });
    let t = 700;
    seq.forEach((p, k) => {
      const now = [...base, ...seq.slice(0, k + 1)];
      const built = now.reduce((a, q) => a + q.v, 0);
      setTimeout(() => {
        setPlaced(now);
        haptic.snap();
        if (built < T_) {
          if (tenUseful && k === 0) setShowTen(true);
          setCoach({ text: `${built} built — ${T_ - built} still to fill…`, mood: 'think' });
        }
      }, t);
      t += 1100;
    });
    const eqLine = `${cfg.solution.join(' + ')} = ${T_}`;
    setTimeout(() => { setCoach({ text: `${eqLine}! Now a twin puzzle — just for you.`, mood: 'wow' }); say(`${cfg.solution.join(' plus ')} is ${T_}. Now try a twin puzzle on your own!`); }, t);
    setTimeout(() => navigation.replace('Bridge', { twin: true }), t + 3300);
  };

  // ─── Stuck choices ─────────────────────────────────────────────────────────
  const onStuck = (c: StuckChoice) => {
    setStuckOpen(false);
    trk.resetIdle();
    if (c === 'talk') { trk.asked(true); setVoiceOpen(true); }
    if (c === 'show') applyHint(Math.max(1, hintLevel + 1));
    if (c === 'objects') { setShowUnits(true); trk.represent('blocks'); trk.hint('visual'); setCoach({ text: 'Now every piece shows its blocks. Count them with your finger!', mood: 'happy' }); }
    if (c === 'draw') setPadOpen(true);
  };

  // ─── Voice tutor (reads the real board) ────────────────────────────────────
  const respond = (intent: Intent): Reply => {
    trk.asked(true);
    const t = tutor.current;
    const ids = placed.map(p => p.id);
    const findPiece = (v: number) => tray.find(p => p.v === v);
    if (intent.kind === 'command') {
      if (intent.action === 'remove') return { line: 'Okay — taking the pieces back so you can try again.', command: intent };
      if (intent.action === 'use' && intent.values.length) return { line: `Moving the ${intent.values.join(' and the ')} to the bridge!`, command: intent };
    }
    if (intent.kind === 'answer' && t.step === 'ask-ten') {
      const need = 10 - t.base;
      if (intent.n === need) {
        t.step = 'ask-rest'; t.usedTen = true;
        setShowTen(true);
        return { line: `Exactly! ${t.base} and ${need} make 10. Now we're at 10. How many more do we need to reach ${T_}?`, highlight: ['ten', ...ids], expectNumber: true, chips: [String(T_ - 10 - 1), String(T_ - 10), String(T_ - 10 + 1)], hint: 'strategy' };
      }
      return { line: `Let's count on together: ${t.base}… ${t.base + 1}… ${t.base + 2}… how many steps until 10?`, highlight: ['gap'], expectNumber: true, chips: [String(need - 1), String(need), String(need + 1)], hint: 'visual' };
    }
    if (intent.kind === 'answer' && t.step === 'ask-rest') {
      const need = T_ - 10;
      if (intent.n === need) {
        t.step = 'none';
        const partner = T_ - t.base;
        const piece = findPiece(partner);
        setHighlight(piece ? [piece.id] : []);
        trk.strategy('make-ten');
        return { line: `You found it! ${10 - t.base} and ${need} make ${partner}. So the bridge needs the ${partner} piece — look, it's glowing!`, highlight: piece ? [piece.id] : [], done: true };
      }
      return { line: `From 10, count on to ${T_}: 11, 12… how many jumps?`, highlight: ['ten'], expectNumber: true, chips: [String(need - 1), String(need), String(need + 1)] };
    }
    // "how many more from here to the gap?" — used when make-ten doesn't fit these numbers
    if (intent.kind === 'answer' && t.step === 'ask-gap') {
      const need = T_ - t.base;
      if (intent.n === need) {
        t.step = 'none';
        const piece = findPiece(need);
        trk.strategy('count-on');
        if (piece) {
          setHighlight([piece.id]);
          return { line: `You found it! ${t.base} and ${need} make ${T_}. The bridge needs the ${need} piece — look, it's glowing!`, highlight: [piece.id], done: true };
        }
        // No single plank is that long: point at the planks that make it together.
        const ids = pileSolution.map(v => tray.find(p => p.v === v)?.id).filter((x): x is string => !!x);
        setHighlight(ids);
        return { line: `Yes — ${need} more! No single plank is ${need}, but the glowing ones make ${need} together.`, highlight: ids, done: true };
      }
      return { line: `Count on from ${t.base}: ${t.base + 1}, ${t.base + 2}… how many steps until ${T_}?`, highlight: ['gap'], expectNumber: true, chips: [String(need - 1), String(need), String(need + 1)], hint: 'visual' };
    }
    if (intent.kind === 'answer' && t.step === 'none') {
      const piece = findPiece(intent.n);
      if (piece) return { line: sum + intent.n === T_ ? `Try the ${intent.n}! Drag it to the gap.` : `The ${intent.n} would make ${sum + intent.n}. We need ${T_}. Want to try it and see?`, highlight: [piece.id] };
    }
    if (intent.kind === 'why-wrong') {
      return { line: sum ? `Nothing's wrong! You built ${sum}. The gap needs ${T_}, so we just need a different size to finish.` : `Nothing's wrong at all — every try tells us something. Pick a piece and let's see what it makes.`, highlight: ids };
    }
    if (intent.kind === 'another-way') {
      setShowUnits(true); trk.represent('numberLine');
      return { line: `Let's use a number line: start at ${sum} and jump one block at a time to ${T_}. Count the jumps!`, highlight: ['gap'], hint: 'visual' };
    }
    if (intent.kind === 'explain-concept') {
      return { line: `Adding means putting amounts together. Our bridge shows it: ${sum || 'some pieces'} and more pieces together make ${T_} long.` };
    }
    if (intent.kind === 'explanation' || intent.kind === 'feeling') {
      return { line: 'I love hearing how you think! Let\'s finish the bridge and you can tell me more.' };
    }
    // confused / clue / generic help → reference the ACTUAL board
    trk.hint('gentle');
    if (sum === 0) {
      const big = pile.find(p => p.v === cfg.solution[0]) ?? pile[0];
      return { line: `The gap is ${T_} long and it's empty. Let's start with a big piece — how about the ${big.v}?`, highlight: [big.id, 'gap'], hint: 'gentle' };
    }
    const onlyBig = placed.length === 1 && placed[0].v === cfg.solution[0];
    if (!onlyBig) {
      return { line: `You built ${placed.map(p => p.v).join(' and ')} — that's ${sum}. We need ${T_}, but there's no ${left} piece. Tap a piece on the bridge to take it off, then try again.`, highlight: ids, hint: 'gentle', chips: ['Take them back', 'Give me a clue', 'Show me another way'] };
    }
    t.base = sum;
    if (tenUseful && sum < 10) {
      t.step = 'ask-ten';
      return { line: `You already built ${sum}. We need ${T_} altogether. Let's make 10 first — how many more would make 10?`, highlight: [...ids, 'gap'], expectNumber: true, chips: [String(10 - sum - 1), String(10 - sum), String(10 - sum + 1)], hint: 'gentle' };
    }
    t.step = 'ask-gap';
    const gapNeed = T_ - sum;
    return { line: `You already built ${sum}. We need ${T_} altogether. How many more would fill the gap?`, highlight: [...ids, 'gap'], expectNumber: true, chips: [String(gapNeed - 1), String(gapNeed), String(gapNeed + 1)], hint: 'gentle' };
  };

  const onReply = (r: Reply) => {
    setHighlight(r.highlight ?? []);
    setCoach({ text: r.line, mood: r.done ? 'wow' : 'happy' });
    if (r.hint) setHintLevel(h => Math.max(h, HINT_LADDER.indexOf(r.hint!)));
    if (r.command?.kind === 'command') {
      const cmd = r.command;
      if (cmd.action === 'remove') setTimeout(() => setPlaced([]), 500);
      if (cmd.action === 'use') {
        let delay = 500;
        let running = sum;
        const avail = [...tray];
        cmd.values.forEach(v => {
          const idx = avail.findIndex(p => p.v === v);
          if (idx < 0) return;
          const piece = avail.splice(idx, 1)[0];
          const willFit = running + piece.v <= T_;
          running += willFit ? piece.v : 0;
          setTimeout(() => tryPlaceRef.current(piece, 'voice'), delay);
          delay += 650;
        });
      }
    }
    if (r.done) setTimeout(() => setVoiceOpen(false), 3800);
  };
  const tryPlaceRef = useRef(tryPlace);
  tryPlaceRef.current = tryPlace;

  const finish = () => {
    const sig = trk.finish();
    if (twin) sig.hints.push('demo');
    // Strategy discovery is celebrated on the Explain screen (or recorded silently if skipped).
    finishChallenge(navigation, 'bridge', sig, { suggested: tenUseful ? 'make-ten' : 'count-on' });
  };

  // ─── Animations ────────────────────────────────────────────────────────────
  const walk = useSharedValue(0);
  const nia = useAnimatedStyle(() => ({ transform: [{ translateX: walk.value * (gapPx + CLIFF + 6) }, { translateY: -Math.sin(walk.value * Math.PI * 10) * 2 }] }));
  const glow = useSharedValue(0);
  useEffect(() => { if (solved) glow.value = withSequence(withTiming(1, { duration: 300 }), withTiming(0.35, { duration: 900 })); }, [solved]);
  const glowA = useAnimatedStyle(() => ({ opacity: glow.value }));

  const hovering = hoverItem && !placed.find(p => p.id === hoverItem.id) ? hoverItem : null;
  const ghostOver = hovering ? sum + hovering.v - T_ : 0;
  const ghostColor = !hovering ? C.sun : ghostOver === 0 ? C.teal : ghostOver > 0 ? C.coral : C.sun;
  const eq = placed.map(p => p.v);
  const SCENE_H = 292;
  // Short phones draw the river scene smaller so the plank pile stays on screen.
  const fit = useFitScale();

  return (
    <DropProvider onHoverChange={(z, item) => setHoverItem(z === 'gap' && item ? pieces.find(p => p.id === item) ?? null : null)}>
      <View style={{ flex: 1, backgroundColor: C.sky }}>
        <GameBody>
        <DriftingClouds width={width} tops={[ins.top + 120, ins.top + 190]} />
        <View style={{ paddingTop: ins.top + 8, paddingHorizontal: 20 }}>
          <TopBar back="← Map" onBack={() => navigation.goBack()} right={<><Purse /><MuteButton /><AskNumiButton onPress={() => { trk.asked(true); setVoiceOpen(true); }} glowing={trk.wrongStreak > 0 && !voiceOpen} /></>} />
          <Enter delay={80}>
            <View style={[{ marginTop: 10, backgroundColor: 'rgba(253,245,232,.96)', borderRadius: 22, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, softShadow(0.1, 4)]}>
              <View style={{ minWidth: 50, height: 50, paddingHorizontal: 6, borderRadius: 15, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: C.tealDeep }}>
                <Text style={{ fontFamily: F.display, fontSize: T_ >= 1000 ? 19 : 24, color: C.cream }}>{T_}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Eyebrow>{twin ? 'TWIN PUZZLE · ON YOUR OWN' : cfg.kind === 'started' ? 'FINISH THE BRIDGE' : cfg.kind === 'three' ? 'THREE PLANKS FILL THIS GAP' : 'THE GAP IS THIS LONG'}</Eyebrow>
                <Text style={[T.body, { marginTop: 2 }]}>{solved ? 'Bridge repaired!' : sum ? `${sum} built · ${left} to go` : 'Fill it exactly — no gaps, no overhang'}</Text>
                {SC > 1 && !solved && <Text style={[T.bodySm, { fontSize: 11, marginTop: 1 }]}>Each block on the bridge is worth {SC}</Text>}
              </View>
              {hintLevel >= 0 && (
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {HINT_LADDER.map((h, i) => <View key={h} style={{ width: 7, height: 7 + i * 3, borderRadius: 3, alignSelf: 'flex-end', backgroundColor: i <= hintLevel ? C.violet : C.sand }} />)}
                </View>
              )}
            </View>
          </Enter>
        </View>

        {/* ─── scene ─── */}
        <ScaleBox k={fit} width={width} height={SCENE_H} style={{ marginTop: 14 * fit }}>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 172 }}>
            <River width={width} height={172} />
          </View>
          <Bank side="left" w={CLIFF + 26} h={190} />
          <Bank side="right" w={CLIFF + 26} h={190} />
          <House w={40} roof={C.violet} lit={solved} style={{ position: 'absolute', right: 6, bottom: 186 }} />
          <Tree size={26} style={{ position: 'absolute', left: 4, bottom: 186 }} />
          {/* piers */}
          {[0.3, 0.7].map(p => (
            <View key={p} style={{ position: 'absolute', left: CLIFF + 20 + gapPx * p, bottom: 0, width: 11, height: 178 }}>
              <View style={{ flex: 1, backgroundColor: C.woodDeep, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
              <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3.5, backgroundColor: 'rgba(255,255,255,.14)' }} />
            </View>
          ))}

          <Wobble trigger={wob} style={{ position: 'absolute', left: CLIFF + 20, bottom: 182 - 2, width: gapPx }}>
            <DropZone id="gap" pad={40} style={{ width: gapPx, height: 52 }}>
              <Highlight active={highlight.includes('gap')} color={C.violet} style={{ width: gapPx, height: 48 }}>
                {/* empty slot with unit ruler */}
                <View style={{ position: 'absolute', left: 0, top: 2, width: gapPx, height: 44, borderRadius: 8, borderWidth: 2.5, borderStyle: 'dashed', borderColor: C.tealDeep, backgroundColor: 'rgba(253,245,232,.45)', flexDirection: 'row' }}>
                  {Array.from({ length: TICKS }, (_, i) => (
                    <View key={i} style={{ flex: 1, borderRightWidth: i < TICKS - 1 ? 1 : 0, borderRightColor: showUnits ? 'rgba(29,111,97,.45)' : 'rgba(29,111,97,.12)', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 }}>
                      {showUnits && i >= sum / SC && unit * SC >= String((i + 1) * SC).length * 5.5 && <Text style={{ fontFamily: F.bodyHeavy, fontSize: Math.min(9, unit * SC * 0.45), color: C.tealDeep }}>{(i + 1) * SC}</Text>}
                    </View>
                  ))}
                </View>
                {/* placed */}
                <View style={{ position: 'absolute', left: 0, top: 2, flexDirection: 'row' }}>
                  {placed.map((p, i) => (
                    <Tap key={p.id} onPress={() => removePiece(p)} a11y={`Placed piece ${p.v}. Tap to take it back`}>
                      <Squash trigger={1}>
                        <Highlight active={highlight.includes(p.id)}>
                          <Plank v={p.v} unit={unit} scale={SC} locked={p.id === 'fixed'} color={p.id === 'fixed' ? '#c9a27a' : PIECE_COLORS[i % PIECE_COLORS.length]} showUnits={showUnits} />
                        </Highlight>
                      </Squash>
                    </Tap>
                  ))}
                  {hovering && (
                    <View style={{ opacity: 0.55 }} pointerEvents="none">
                      <View style={{ width: hovering.v * unit, height: 44, borderRadius: 8, backgroundColor: ghostColor, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.cream }}>{ghostOver === 0 ? '✓' : ghostOver > 0 ? `+${ghostOver}` : `${-ghostOver} left`}</Text>
                      </View>
                    </View>
                  )}
                  {overhang && (
                    <Pop key={overhang.k}>
                      <View style={{ width: overhang.v * unit, height: 44, borderRadius: 8, backgroundColor: C.coral, opacity: 0.75, transform: [{ rotate: '7deg' }, { translateY: 8 }], alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.cream }}>{overhang.v} is too long</Text>
                      </View>
                    </Pop>
                  )}
                </View>
                {showTen && (
                  <Highlight active={highlight.includes('ten')} color={C.violet} style={{ position: 'absolute', left: unit * 10 - 2, top: -18, alignItems: 'center' }}>
                    <View style={{ backgroundColor: C.violet, borderRadius: 8, paddingHorizontal: 5 }}><Text style={{ fontFamily: F.display, fontSize: 11, color: C.cream }}>10</Text></View>
                    <View style={{ width: 4, height: 62, backgroundColor: C.violet, borderRadius: 2 }} />
                  </Highlight>
                )}
                {solved && <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -6, right: -6, top: -4, height: 56, borderRadius: 12, backgroundColor: C.sun }, glowA]} />}
              </Highlight>
            </DropZone>
          </Wobble>

          {/* Nia on the left cliff, crosses when solved */}
          <Animated.View style={[{ position: 'absolute', left: 6, bottom: 180 }, nia]}>
            <Buddy id="nia" size={54} mood={solved ? 'happy' : trk.wrongStreak ? 'worried' : 'happy'} walking={solved} />
          </Animated.View>
          <Burst trigger={burst} x={CLIFF + 20 + gapPx / 2} y={SCENE_H - 130} count={20} dist={130} />
          {plus && <FloatUp key={plus.k} style={{ position: 'absolute', left: CLIFF + 20 + sum * unit - 20, bottom: 170 }}><Text style={{ fontFamily: F.display, fontSize: 26, color: C.sunDeep }}>{plus.text}</Text></FloatUp>}

          {/* equation reveal */}
          {solved && (
            <View style={{ position: 'absolute', bottom: 22, left: 0, right: 0, alignItems: 'center' }}>
              {tutor.current.usedTen && revealStep >= 1 && (
                <Pop><Text style={{ fontFamily: F.display, fontSize: 16, color: C.cream, marginBottom: 2 }}>{eq[0]} + {10 - eq[0]} + {T_ - 10} = {T_}</Text></Pop>
              )}
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: 'rgba(34,48,59,.75)', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 4 }}>
                {eq.flatMap((v, i) => (i ? ['+', String(v)] : [String(v)])).concat(['=', String(T_)]).map((tok, i) => (
                  revealStep >= Math.min(4, 1 + Math.floor(i / 2)) ? <Pop key={i}><Text style={{ fontFamily: F.display, fontSize: 30, color: tok === String(T_) && i > 1 ? C.sun : C.cream }}>{tok}</Text></Pop> : null
                ))}
              </View>
            </View>
          )}
        </ScaleBox>

        {/* ─── coach ─── */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, marginTop: 8 }}>
          <Bob amp={3} duration={1600}><Numi size={58} mood={coach.mood} state={solved ? 'celebrate' : 'idle'} /></Bob>
          <View style={[{ flex: 1, backgroundColor: C.cream, borderRadius: 20, padding: 12 }, softShadow(0.08, 3)]}>
            <Text style={[T.body, { fontSize: 13.5 }]}>{coach.text}</Text>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        {/* ─── tray ─── */}
        {solved ? (
          <Enter style={{ paddingHorizontal: 20, paddingBottom: ins.bottom + 16, flexDirection: 'row', gap: 10 }}>
            <ChunkyButton style={{ flex: 1 }} size="md" icon="🔁" label="Play another" color={C.sun} shadow={C.sunDeep} textColor={C.ink} a11y="Play another bridge with new numbers" onPress={() => { recordPractice(trk.finish()); onPlayAnother(); }} />
            <ChunkyButton style={{ flex: 1 }} size="md" label={twin ? 'I did it!' : 'Continue'} color={C.teal} shadow={C.tealDeep} onPress={finish} />
          </Enter>
        ) : (
          <View style={[{ backgroundColor: C.sand, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 18, paddingTop: 14, paddingBottom: ins.bottom + 14 }, softShadow(0.14, -6)]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Eyebrow color="#8c8377">PLANK PILE · DRAG OR TAP</Eyebrow>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Tap onPress={() => setPadOpen(true)} a11y="Open scratchpad" style={{ backgroundColor: C.cream, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10 }}><Text style={{ fontSize: 15 }}>✏️</Text></Tap>
                <Tap onPress={() => { setShowUnits(u => !u); trk.represent('blocks'); }} a11y="Show blocks" style={{ backgroundColor: showUnits ? C.ink : C.cream, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10 }}><Text style={{ fontSize: 15 }}>🧩</Text></Tap>
                <Tap onPress={() => applyHint(hintLevel + 1)} a11y="Get a hint" style={{ backgroundColor: C.violet, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10 }}><Text style={{ fontSize: 15 }}>💡</Text></Tap>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12, minHeight: 110, alignContent: 'flex-start' }}>
              {pile.map((p, i) => {
                const used = !!placed.find(q => q.id === p.id);
                if (used) return <View key={p.id} style={{ width: p.v * trayUnit, height: 50, borderRadius: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: C.sandDeep }} />;
                return (
                  <Draggable key={p.id} id={p.id} a11y={`Plank ${p.v}`} disabled={demo} onDrop={z => (z === 'gap' ? (tryPlace(p) ? 'accept' : 'reject') : 'ignore')} onTap={() => tryPlace(p, 'tap')}>
                    <Highlight active={highlight.includes(p.id)}>
                      <Plank v={p.v} unit={trayUnit} scale={SC} height={50} color={PIECE_COLORS[i % PIECE_COLORS.length]} showUnits={showUnits} />
                    </Highlight>
                  </Draggable>
                );
              })}
            </View>
            <Text style={[T.bodySm, { fontSize: 11, marginTop: 6 }]}>Hints never end a try — Numi counts them as curiosity.</Text>
          </View>
        )}

        </GameBody>
        <AskNumi
          open={voiceOpen}
          onClose={() => { setVoiceOpen(false); trk.resetIdle(); }}
          respond={respond}
          onReply={onReply}
          opener={sum ? `I can see your bridge: ${sum} built, ${left} to go. What are you thinking?` : `I can see your bridge. What are you thinking?`}
          chips={["I don't understand", 'Give me a clue', 'Show me another way', 'Why is this wrong?', `Use ${pileSolution.join(' and ')}`].slice(0, micAllowed ? 5 : 4)}
          style={{ position: 'absolute', left: 12, right: 12, bottom: ins.bottom + 10 }}
        />
        <StuckSheet open={stuckOpen} onChoose={onStuck} onClose={() => { setStuckOpen(false); trk.resetIdle(); }} />
        <Scratchpad open={padOpen} onClose={() => { setPadOpen(false); trk.resetIdle(); }} title={`Bridge gap: ${T_}${sum ? ` · built ${sum}` : ''}`} />
        {demo && <View style={{ position: 'absolute', top: ins.top + 64, alignSelf: 'center', backgroundColor: C.violet, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 }}><Text style={{ fontFamily: F.bodyHeavy, color: C.cream, fontSize: 12 }}>NUMI IS SHOWING YOU</Text></View>}
      </View>
    </DropProvider>
  );
}

/**
 * Endless rounds: each "Play another" remounts the round with a fresh seed, so the board,
 * the coach lines and — crucially — the signal tracker all start clean for a new attempt.
 */
export default function BridgeBuilder(props: RootScreen<'Bridge'>) {
  const [round, setRound] = useState(() => ({ n: 0, seed: newSeed() }));
  return (
    <BridgeRound
      key={round.n}
      {...props}
      seed={round.seed}
      onPlayAnother={() => setRound(r => ({ n: r.n + 1, seed: newSeed() }))}
    />
  );
}
