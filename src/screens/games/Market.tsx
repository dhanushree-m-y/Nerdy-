// MARKET STREET — money sense through shopping. Kids spend real (pretend) coins; the sum is revealed at checkout.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AskNumi, AskNumiButton, Reply } from '../../components/AskNumi';
import { Buddy, Numi } from '../../components/characters';
import { Burst } from '../../components/effects';
import { DropProvider, DropZone, Draggable } from '../../components/dragdrop';
import { Bob, Enter, FloatUp, Highlight, Pop, Squash, Wobble } from '../../components/motion';
import { Scratchpad } from '../../components/Scratchpad';
import { StuckChoice, StuckSheet } from '../../components/sheets';
import { AutoScale, ChunkyButton, Eyebrow, GameBody, ProgressBar, Purse, Tap, TopBar, useFitScale } from '../../components/ui';
import { HINT_LADDER, HintKind, Intent, nextRepresentation } from '../../learning/engine';
import { genMarket, lastKindOf, newSeed, pickDifficulty, tagKind } from '../../learning/generator';
import { useSignalTracker, useStuckDetector } from '../../learning/session';
import { finishChallenge } from '../../navigation/flow';
import { RootScreen } from '../../navigation/types';
import { haptic, say } from '../../services/feedback';
import { useGame } from '../../store/game';
import { C, F, M, Mood, softShadow, T } from '../../theme/tokens';

type Kind = 'food' | 'drink';
type Item = { id: string; name: string; emoji: string; price: number; kind: Kind };

const AWNING = 12;
const COIN = '#e0a02a';
const COIN_DEEP = '#b07d16';

function Awning() {
  return (
    <View>
      <View style={{ flexDirection: 'row', height: 34, borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden' }}>
        {Array.from({ length: AWNING }, (_, i) => <View key={i} style={{ flex: 1, backgroundColor: i % 2 ? C.cream : C.coral }} />)}
      </View>
      {/* scalloped edge */}
      <View style={{ flexDirection: 'row' }}>
        {Array.from({ length: AWNING }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 12, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: i % 2 ? C.cream : C.coral }} />
        ))}
      </View>
    </View>
  );
}

/**
 * Money by place value: a green note is 100, a stack is 10, a coin is 1. Used once
 * amounts are too big to show coin-by-coin (grades 3–5), and it quietly teaches
 * hundreds, tens and ones while the child shops.
 */
function PlaceValueMoney({ n, size = 1 }: { n: number; size?: number }) {
  const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), o = n % 10;
  const k = size;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 * k, alignItems: 'flex-end', justifyContent: 'center' }}>
      {Array.from({ length: h }, (_, i) => (
        <View key={`h${i}`} style={{ width: 30 * k, height: 17 * k, borderRadius: 4 * k, backgroundColor: '#6fb07e', borderBottomWidth: 2 * k, borderBottomColor: '#4d8a5c', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.bodyHeavy, fontSize: 9 * k, lineHeight: 11 * k, color: C.cream }}>100</Text>
        </View>
      ))}
      {Array.from({ length: t }, (_, i) => (
        <View key={`t${i}`} style={{ width: 14 * k, height: 20 * k, borderRadius: 4 * k, backgroundColor: COIN, borderBottomWidth: 3 * k, borderBottomColor: COIN_DEEP, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.bodyHeavy, fontSize: 7.5 * k, lineHeight: 9 * k, color: C.cream }}>10</Text>
        </View>
      ))}
      {Array.from({ length: o }, (_, i) => (
        <View key={`o${i}`} style={{ width: 9 * k, height: 9 * k, borderRadius: 5 * k, backgroundColor: COIN, borderBottomWidth: 1.5, borderBottomColor: COIN_DEEP }} />
      ))}
    </View>
  );
}

/** A price shown as coin dots — one dot per coin (or notes/stacks once it's big). */
function CoinDots({ n, size = 6, max = 10, color = COIN }: { n: number; size?: number; max?: number; color?: string }) {
  if (n > 20) return <View style={{ maxWidth: 70 }}><PlaceValueMoney n={n} size={0.62} /></View>;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, justifyContent: 'center', maxWidth: max * (size + 2) }}>
      {Array.from({ length: n }, (_, i) => <View key={i} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />)}
    </View>
  );
}

/** One coin in the purse row. Spent coins shrink + fade away; returned coins spring back. */
function PurseCoin({ spent, size, index }: { spent: boolean; size: number; index: number }) {
  const v = useSharedValue(spent ? 0 : 1);
  useEffect(() => {
    v.value = spent
      ? withDelay(index * 25, withTiming(0, { duration: 260 }))
      : withDelay(index * 25, withSpring(1, M.bouncy));
  }, [spent]);
  const a = useAnimatedStyle(() => ({ opacity: 0.15 + 0.85 * v.value, transform: [{ scale: 0.55 + 0.45 * v.value }, { translateY: (1 - v.value) * -6 }] }));
  return (
    <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: COIN, borderBottomWidth: 2, borderBottomColor: COIN_DEEP, alignItems: 'center', justifyContent: 'center' }, a]}>
      <View style={{ width: size * 0.45, height: size * 0.45, borderRadius: size, borderWidth: 1.5, borderColor: 'rgba(253,245,232,.7)' }} />
    </Animated.View>
  );
}

/** A shop item on the stall: emoji, name, price tag (optionally as coin dots). */
function Goods({ it, dots, dim, bought, w = 76 }: { it: Item; dots: boolean; dim: boolean; bought?: boolean; w?: number }) {
  return (
    <View style={[{ width: w, minHeight: 86, backgroundColor: C.paper, borderRadius: 16, alignItems: 'center', paddingTop: 6, paddingBottom: 6, opacity: dim ? 0.4 : 1, borderBottomWidth: 4, borderBottomColor: C.sandDeep }, softShadow(0.06, 2)]}>
      <Text style={{ fontSize: 30, lineHeight: 36 }}>{it.emoji}</Text>
      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11, color: C.muted }}>{it.name}</Text>
      <View style={{ marginTop: 3, backgroundColor: COIN, borderRadius: 9, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Text style={{ fontFamily: F.display, fontSize: 14, lineHeight: 19, color: C.cream }}>{it.price}</Text>
        <Text style={{ fontSize: 9 }}>🪙</Text>
      </View>
      {dots && <View style={{ marginTop: 4 }}><CoinDots n={it.price} size={it.price > 10 ? 4 : 6} max={it.price > 10 ? 12 : 8} color={COIN_DEEP} /></View>}
      {bought && <Text style={{ position: 'absolute', top: 4, right: 6, fontFamily: F.bodyHeavy, fontSize: 11, color: C.teal }}>✓</Text>}
    </View>
  );
}

type RoundProps = RootScreen<'Market'> & { seed: number; onPlayAnother: () => void };

function MarketRound({ navigation, seed, onPlayAnother }: RoundProps) {
  const grade = useGame(s => s.grade);
  const micAllowed = useGame(s => s.settings.micAllowed);
  const signals = useGame(s => s.signals);
  const ins = useSafeAreaInsets();
  // Short phones draw the main scene smaller so the pieces stay on screen.
  const fit = useFitScale();
  // Stall + purse for this round: grade sets the money, history nudges it, and the kind
  // of shopping trip (breakfast / feast / exact change) never repeats back-to-back.
  const cfg = useMemo(() => genMarket(grade, pickDifficulty(signals, 'money'), seed, lastKindOf(signals, 'market')), [seed]);
  const MEAL = cfg.kind === 'feast' ? 'feast' : 'breakfast';
  const startConcrete = useMemo(() => ['blocks', 'groups'].includes(nextRepresentation(signals, 'money')), [seed]);
  const BUDGET = cfg.budget;
  const items: Item[] = useMemo(
    () => cfg.items.map((b, i) => ({ id: `${b.name.toLowerCase()}${i}`, name: b.name, emoji: b.icon, price: b.price, kind: b.kind })),
    [cfg],
  );

  const [basket, setBasket] = useState<Item[]>([]);
  const [coach, setCoach] = useState<{ text: string; mood: Mood }>({
    text: cfg.kind === 'feast'
      ? `You have ${BUDGET} coins. Numi is extra hungry — a drink AND two foods! Keep it to ${BUDGET} or less.`
      : cfg.kind === 'exact'
        ? `You have ${BUDGET} coins. Pip's challenge: a drink and some food that cost EXACTLY ${BUDGET}. Every coin!`
        : `You have ${BUDGET} coins. Numi needs a drink and some food. Drag things into the basket!`,
    mood: 'happy',
  });
  const [solved, setSolved] = useState(false);
  const [wob, setWob] = useState(0);
  const [burst, setBurst] = useState(0);
  const [plus, setPlus] = useState<{ k: number; text: string } | null>(null);
  const [hintLevel, setHintLevel] = useState(-1);
  const [highlight, setHighlight] = useState<string[]>([]);
  const [showDots, setShowDots] = useState(startConcrete);
  const [dimUnaffordable, setDimUnaffordable] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [stuckOpen, setStuckOpen] = useState(false);
  const [padOpen, setPadOpen] = useState(false);
  const [demo, setDemo] = useState(false);
  const [checkout, setCheckout] = useState<Item[] | null>(null);
  const [revealStep, setRevealStep] = useState(0);
  const [demoBasket, setDemoBasket] = useState<string[]>([]);
  const [hoverItem, setHoverItem] = useState<Item | null>(null);
  const { width: W } = useWindowDimensions();
  const tutor = useRef<{ step: 'none' | 'ask-left'; item: Item | null; countedOn: boolean }>({ step: 'none', item: null, countedOn: false });
  const demoCombo = useRef<string[] | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const recordPractice = useGame(s => s.recordPractice);
  const trk = useSignalTracker('market', 'money', tagKind(cfg.kind, cfg.exact ? `drink + food = ${BUDGET}` : `drink + ${cfg.foods} food ≤ ${BUDGET}`), 'symbolic');

  const spent = basket.reduce((a, it) => a + it.price, 0);
  const left = BUDGET - spent;
  const hasDrink = basket.some(it => it.kind === 'drink');
  const hasFood = basket.some(it => it.kind === 'food');
  const isCopy = !!demoCombo.current && basket.length === demoCombo.current.length && basket.every(x => demoCombo.current!.includes(x.id));
  const foodCount = (xs: Item[]) => xs.filter(x => x.kind === 'food').length;
  const costOf = (xs: Item[]) => xs.reduce((a, x) => a + x.price, 0);
  /** Has the basket got everything this trip asks for? */
  const complete = (xs: Item[]) => xs.some(x => x.kind === 'drink') && foodCount(xs) >= cfg.foods;
  /** …and does it obey the money rule (under budget, or exactly on it)? */
  const ready = (xs: Item[]) => complete(xs) && (cfg.exact ? costOf(xs) === BUDGET : costOf(xs) <= BUDGET);
  const valid = ready(basket) && !isCopy;
  const shelf = items.filter(it => !basket.find(b => b.id === it.id));

  // Live basket ref so staggered voice/demo adds see the latest state.
  const basketRef = useRef<Item[]>([]);
  basketRef.current = basket;

  useStuckDetector({
    wrongStreak: trk.wrongStreak, idleMs: trk.idleMs, paused: voiceOpen || stuckOpen || padOpen || solved || demo || !!checkout,
    onStuck: () => { haptic.nudge(); setStuckOpen(true); say('Hmm… shopping on a budget is tricky. Want to work it out together?'); },
  });

  // ─── Basket ────────────────────────────────────────────────────────────────
  const add = (it: Item, source: 'drag' | 'tap' | 'voice' = 'drag'): boolean => {
    const cur = basketRef.current;
    if (solved || checkout || cur.find(b => b.id === it.id)) return false;
    const sp = cur.reduce((a, x) => a + x.price, 0);
    const lf = BUDGET - sp;
    if (it.price > lf) {
      trk.attempt(`${sp}+${it.price}=${sp + it.price}>${BUDGET}`, false);
      setWob(w => w + 1);
      haptic.nudge();
      const line = sp === 0
        ? `${it.name} is ${it.price} — that's more than all ${BUDGET} of your coins.`
        : `${it.name} is ${it.price} but you have ${lf} left — that's ${it.price - lf} short.`;
      setCoach({ text: line, mood: 'worried' });
      say(line);
      return false;
    }
    const next = [...cur, it];
    basketRef.current = next;
    setBasket(next);
    setHighlight(h => h.filter(x => x !== it.id));
    setPlus({ k: Date.now(), text: `−${it.price}` });
    if (source !== 'drag') haptic.snap();
    const nsp = sp + it.price;
    const drink = next.some(x => x.kind === 'drink');
    const nFood = foodCount(next);
    const copied = demoCombo.current && next.length === demoCombo.current.length && next.every(x => demoCombo.current!.includes(x.id));
    const lf2 = BUDGET - nsp;
    if (ready(next) && copied) {
      trk.touch();
      setCoach({ text: `That's the same ${MEAL} I made! Can you swap something to make a different one? You have ${lf2} coins left.`, mood: 'think' });
    } else if (ready(next)) {
      trk.attempt(`${next.map(x => x.price).join('+')}=${nsp}${cfg.exact ? '=' : '≤'}${BUDGET}`, true);
      setCoach({
        text: cfg.exact
          ? `${next.map(x => x.price).join(' + ')} makes exactly ${BUDGET} — not one coin left over! Tap Checkout.`
          : `Everything's in — the ${MEAL} is ready! You spent ${nsp}, so ${lf2} are left. Tap Checkout when you're happy.`,
        mood: 'wow',
      });
    } else if (complete(next) && cfg.exact) {
      // Right items, wrong total: exact change is the whole point of this trip.
      trk.attempt(`${next.map(x => x.price).join('+')}=${nsp}≠${BUDGET}`, false);
      setWob(w => w + 1);
      setCoach({ text: `That's ${nsp} — ${lf2} coins still left over. Pip wants EVERY coin spent. Swap something for one that costs more!`, mood: 'think' });
    } else {
      trk.touch();
      const needKind: Kind = drink ? 'food' : 'drink';
      const need = !drink ? 'a drink' : cfg.foods === 2 ? (nFood === 0 ? 'two foods' : 'one more food') : 'some food';
      const fits = items.some(x => !next.find(b => b.id === x.id) && x.kind === needKind && (cfg.exact ? x.price <= lf2 : x.price <= lf2));
      if (!fits) {
        trk.attempt(`${next.map(x => x.price).join('+')}=${nsp}`, false);
        setWob(w => w + 1);
        setCoach({ text: `${it.name} is in — ${lf2} left. But no ${needKind} costs ${lf2} or less now. Tap something in the basket to put it back.`, mood: 'think' });
      } else {
        setCoach({ text: `${it.name} is in! ${lf2} coins left. Now Numi needs ${need}.`, mood: 'happy' });
      }
    }
    return true;
  };
  const addRef = useRef(add);
  addRef.current = add;

  const remove = (it: Item) => {
    if (solved || checkout || demo) return;
    haptic.tap();
    trk.touch();
    const next = basketRef.current.filter(x => x.id !== it.id);
    basketRef.current = next;
    setBasket(next);
    setPlus({ k: Date.now(), text: `+${it.price}` });
    setCoach({ text: `${it.name} went back on the shelf — ${it.price} coins came back to you.`, mood: 'happy' });
  };

  const clearBasket = () => { basketRef.current = []; setBasket([]); };

  // ─── Checkout: the equation is revealed only now ───────────────────────────
  const doCheckout = () => {
    if (!valid || checkout) return;
    const bought = [...basket];
    setCheckout(bought);
    setHintLevel(-1);
    setHighlight([]);
    setVoiceOpen(false);
    haptic.snap();
    setCoach({ text: 'Pip is ringing it up…', mood: 'think' });
    later(() => setRevealStep(1), 600);
    later(() => { setRevealStep(2); haptic.tap(); }, 1500);
    later(() => {
      setRevealStep(3);
      setSolved(true);
      haptic.success();
      setBurst(b => b + 1);
      const exact = spent === BUDGET;
      if (tutor.current.countedOn) trk.strategy('count-on');
      const bought = cfg.kind === 'feast' ? 'Feast bought' : 'Breakfast bought';
      const line = exact
        ? `${bought}! You spent exactly ${BUDGET} — every single coin!`
        : `${bought}! You spent ${spent} and kept ${left} coins.`;
      setCoach({ text: line, mood: 'wow' });
      say(line);
    }, 2500);
  };

  const finish = () => {
    finishChallenge(navigation, 'market', trk.finish(), { suggested: 'count-on' });
  };

  // ─── Hints (never "wrong") ─────────────────────────────────────────────────
  const cheapest = (kind: Kind, budget: number, exclude: string[] = []) =>
    items.filter(x => x.kind === kind && x.price <= budget && !exclude.includes(x.id)).sort((a, b) => a.price - b.price)[0];

  /** A basket that solves this trip — the cheapest one, or the exact-change one. */
  const solutionCombo = (): Item[] | null => {
    const drinks = items.filter(x => x.kind === 'drink');
    const foods = items.filter(x => x.kind === 'food');
    if (cfg.exact) {
      for (const d of drinks) for (const fo of foods) if (d.price + fo.price === BUDGET) return [d, fo];
      return null;
    }
    const d = [...drinks].sort((a, b) => a.price - b.price)[0];
    const fs = [...foods].sort((a, b) => a.price - b.price).slice(0, cfg.foods);
    const combo = [d, ...fs];
    return costOf(combo) <= BUDGET ? combo : null;
  };
  /** How many different baskets would pass — so the demo never blocks the only answer. */
  const countSolutions = () => {
    let n = 0;
    for (let mask = 1; mask < 1 << items.length; mask++) {
      const xs = items.filter((_, i) => mask & (1 << i));
      if (xs.length <= 4 && ready(xs)) n++;
      if (n > 1) break;
    }
    return n;
  };

  const applyHint = (lvl: number) => {
    if (solved || checkout || demo) return;
    const kind: HintKind = HINT_LADDER[Math.min(lvl, 4)];
    trk.hint(kind);
    setHintLevel(Math.min(lvl, 4));
    let line = '';
    if (kind === 'gentle') {
      line = !hasDrink
        ? 'Pick a drink first — which drink fits?'
        : cfg.exact
          ? `You have ${left} coins left. Which food costs exactly ${left}?`
          : `You have a drink! Now ${cfg.foods === 2 && foodCount(basket) === 1 ? 'one more food' : 'some food'} — which fits in your ${left} coins?`;
      setHighlight(hasDrink ? [] : ['purse']);
    } else if (kind === 'visual') {
      setShowDots(true); setDimUnaffordable(true); trk.represent('groups');
      line = `Each price tag shows its coins now. Things that don't fit your ${left} coins went pale.`;
      setHighlight(['purse']);
    } else if (kind === 'strategy') {
      tutor.current.countedOn = true;
      line = spent
        ? `Count on from what you've spent: start at ${spent}, then count up the price. Stop if you pass ${BUDGET}!`
        : `Count on from what you've spent: start at 0, count up the drink's price, then keep counting for the food. Stay at ${BUDGET} or less.`;
    } else if (kind === 'guided') {
      const combo = solutionCombo() ?? [];
      const extra = basket.filter(b => !combo.find(c => c.id === b.id));
      if (extra.length) {
        line = `Let's put the ${extra.map(x => x.name.toLowerCase()).join(' and the ')} back first — tap it in the basket.`;
        setHighlight(extra.map(x => x.id));
      } else {
        const todo = combo.filter(c => !basket.find(b => b.id === c.id));
        line = `Look at the glowing ones: ${combo.map(c => `${c.name} is ${c.price}`).join(', ')}. Add them up — do they ${cfg.exact ? `make exactly ${BUDGET}` : `fit in your ${BUDGET}`}?`;
        setHighlight(todo.map(c => c.id));
      }
    } else {
      runDemo();
      return;
    }
    setCoach({ text: line, mood: 'happy' });
    say(line);
  };

  const runDemo = () => {
    const combo = solutionCombo();
    if (!combo) return;
    setDemo(true);
    clearBasket();
    const total = costOf(combo);
    // Only ask for a *different* basket when a different one actually exists.
    const mustDiffer = countSolutions() > 1;
    demoCombo.current = mustDiffer ? combo.map(c => c.id) : null;
    setCoach({ text: `Watch me. First a drink: ${combo[0].name} is ${combo[0].price}.`, mood: 'happy' });
    let t = 800;
    let running = 0;
    combo.forEach((it, k) => {
      const before = running;
      running += it.price;
      const ids = combo.slice(0, k + 1).map(c => c.id);
      later(() => {
        setDemoBasket(ids); haptic.snap(); setHighlight([it.id]);
        if (k > 0) setCoach({ text: `${BUDGET} − ${before} leaves ${BUDGET - before}. ${it.name} is ${it.price} — it fits!`, mood: 'think' });
      }, t);
      t += 1100;
    });
    later(() => {
      const line = `${combo.map(c => c.price).join(' + ')} = ${total}${cfg.exact ? ` — exactly ${BUDGET}!` : `, and ${total} is not more than ${BUDGET}.`} ${mustDiffer ? `Now YOU make a different ${MEAL}!` : 'Now you try it!'}`;
      setCoach({ text: line, mood: 'wow' });
      say(line);
    }, t);
    later(() => {
      setDemoBasket([]); setHighlight([]); setDemo(false);
      setCoach({ text: mustDiffer ? `Your turn! Build a ${MEAL} that's different from mine.` : `Your turn! Build it yourself — drag them into the basket.`, mood: 'happy' });
    }, t + 3800);
  };

  // ─── Stuck choices ─────────────────────────────────────────────────────────
  const onStuck = (c: StuckChoice) => {
    setStuckOpen(false);
    trk.resetIdle();
    if (c === 'talk') { trk.asked(true); setVoiceOpen(true); }
    if (c === 'show') applyHint(Math.max(1, hintLevel + 1));
    if (c === 'objects') {
      setShowDots(true); trk.represent('groups'); trk.hint('visual');
      setCoach({ text: 'Now every price tag shows its coins. Match them with the coins in your purse!', mood: 'happy' });
    }
    if (c === 'draw') setPadOpen(true);
  };

  // ─── Voice tutor (reads the live basket) ───────────────────────────────────
  const matchItems = (words: string[]) => {
    const ws = words.map(w => w.toLowerCase().replace(/[^a-z]/g, '')).filter(Boolean);
    return items.filter(it => {
      const n = it.name.toLowerCase();
      return ws.some(w => w === n || w === `${n}s` || w === `${n}es` || (w.length > 3 && n.startsWith(w)));
    });
  };
  const listNames = (xs: Item[]) => xs.map(x => x.name.toLowerCase()).join(' and ');
  const numChips = (n: number) => [String(Math.max(0, n - 1)), String(n), String(n + 1)];

  const respond = (intent: Intent, heard: string): Reply => {
    trk.asked(true);
    const t = tutor.current;
    const cur = basketRef.current;
    const sp = cur.reduce((a, x) => a + x.price, 0);
    const lf = BUDGET - sp;
    const inIds = cur.map(x => x.id);
    const drinkIn = cur.some(x => x.kind === 'drink');
    const low = heard.toLowerCase();

    if (checkout || demo) return { line: demo ? 'Watch me first — then it\'s your turn!' : 'Pip is ringing up your breakfast!' };

    if (intent.kind === 'command') {
      if (intent.action === 'remove') return { line: 'Okay — putting everything back on the shelf so you can try again.', command: intent };
      if (intent.action === 'buy' || intent.action === 'use') {
        const found = matchItems([...intent.words, ...low.split(/\s+/)]).filter(x => !inIds.includes(x.id));
        if (!found.length) return { line: `Which one? I can see ${shelf.map(x => x.name.toLowerCase()).join(', ')}.`, chips: shelf.slice(0, 3).map(x => `Buy the ${x.name.toLowerCase()}`) };
        const total = found.reduce((a, x) => a + x.price, 0);
        if (total > lf) {
          return { line: `Popping the ${listNames(found)} in your basket! Hmm, together they cost ${total} and you have ${lf} — let's see what fits.`, command: { ...intent, words: found.map(x => x.id) }, highlight: ['purse'] };
        }
        return { line: `Popping the ${listNames(found)} in your basket!`, command: { ...intent, words: found.map(x => x.id) } };
      }
    }

    // follow-up: "If you buy X, how many coins will be left?"
    if (intent.kind === 'answer' && t.step === 'ask-left' && t.item) {
      const it = t.item;
      const want = lf - it.price;
      if (intent.n === want) {
        t.step = 'none'; t.countedOn = true;
        trk.strategy('count-on');
        return want >= 0
          ? { line: `Yes! ${lf} take away ${it.price} is ${want}. So the ${it.name.toLowerCase()} fits — drag it in!`, highlight: [it.id], done: true }
          : { line: `Right — it doesn't fit. Let's pick something cheaper.`, done: true };
      }
      return { line: `Let's count back together from ${lf}: take away ${it.price} coins one at a time… how many are left?`, highlight: ['purse', it.id], expectNumber: true, chips: numChips(Math.max(0, want)), hint: 'visual' };
    }

    if (/how much|how many|left|money|coins/.test(low) && intent.kind !== 'confused') {
      return { line: sp ? `You have ${lf} coins left. You've spent ${sp} of your ${BUDGET}.` : `You have all ${BUDGET} coins — nothing spent yet!`, highlight: ['purse'] };
    }

    if (intent.kind === 'answer') {
      const it = shelf.find(x => x.price === intent.n);
      if (it) return { line: intent.n <= lf ? `The ${it.name.toLowerCase()} costs ${intent.n} — and ${intent.n} is not more than ${lf}. It fits!` : `The ${it.name.toLowerCase()} costs ${intent.n}, but you only have ${lf}.`, highlight: [it.id] };
    }
    if (intent.kind === 'why-wrong') {
      return { line: sp ? `Nothing's wrong! You spent ${sp}, so ${lf} are left. We just need a ${drinkIn ? 'food' : 'drink'} that costs ${lf} or less.` : 'Nothing is wrong at all! Pick a drink and let\'s see what it costs.', highlight: inIds };
    }
    if (intent.kind === 'another-way') {
      setShowDots(true); trk.represent('groups');
      return { line: 'Look — every price tag shows its coins now. Match them to the coins in your purse!', highlight: ['purse'], hint: 'visual' };
    }
    if (intent.kind === 'explain-concept') {
      return { line: `A budget is how much you can spend. Yours is ${BUDGET} coins — the things you buy can add up to ${BUDGET}, but not more.` };
    }
    if (intent.kind === 'explanation') {
      if (intent.strategy === 'count-on') { t.countedOn = true; trk.strategy('count-on'); }
      return { line: 'I love how you think! Finish the breakfast and Pip will show us the math.' };
    }
    if (intent.kind === 'feeling') {
      return { line: intent.value === 'easy' ? 'You\'re a great shopper! Can you spend as close to the budget as possible?' : 'Tricky is okay! Let\'s do it one item at a time.' };
    }

    // confused / clue → reference the ACTUAL basket, then ask a number question
    trk.hint('gentle');
    const nextKind: Kind = drinkIn ? 'food' : 'drink';
    const target = cfg.exact && drinkIn
      ? items.find(x => x.kind === 'food' && x.price === lf && !inIds.includes(x.id)) ?? cheapest(nextKind, lf, inIds)
      : cheapest(nextKind, lf, inIds);
    if (!target) {
      return { line: `You've spent ${sp}. You have ${lf} left, and no ${nextKind} costs that little. Tap something in your basket to put it back.`, highlight: ['basket', ...inIds], hint: 'gentle', chips: ['Put them back', 'Give me a clue'] };
    }
    if (intent.kind === 'clue' && t.step === 'none' && sp > 0) {
      t.step = 'ask-left'; t.item = target;
      return { line: `If you buy the ${target.name.toLowerCase()}, how many coins will be left?`, highlight: [target.id, 'purse'], expectNumber: true, chips: numChips(lf - target.price), hint: 'strategy' };
    }
    if (sp === 0) {
      return { line: `You have ${BUDGET} coins. Start with a drink. ${target.name} costs ${target.price} — is ${target.price} less than ${BUDGET}?`, highlight: [target.id, 'purse'], hint: 'gentle', chips: ['What is left?', `Buy the ${target.name.toLowerCase()}`, 'Give me a clue'] };
    }
    return { line: `You've spent ${sp}. You have ${lf} left. ${target.name} costs ${target.price} — is ${target.price} less than ${lf}?`, highlight: [target.id, 'purse'], hint: 'gentle', chips: ['What is left?', `Buy the ${target.name.toLowerCase()}`, 'Give me a clue'] };
  };

  const onReply = (r: Reply) => {
    setHighlight(r.highlight ?? []);
    setCoach({ text: r.line, mood: r.done ? 'wow' : 'happy' });
    if (r.hint) setHintLevel(h => Math.max(h, HINT_LADDER.indexOf(r.hint!)));
    if (r.command?.kind === 'command') {
      const cmd = r.command;
      if (cmd.action === 'remove') later(clearBasket, 500);
      if (cmd.action === 'buy' || cmd.action === 'use') {
        cmd.words.forEach((id, i) => {
          const it = items.find(x => x.id === id);
          if (it) later(() => addRef.current(it, 'voice'), 600 + i * 650);
        });
      }
    }
    if (r.done) later(() => setVoiceOpen(false), 3800);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  const shown: Item[] = demo ? demoBasket.map(id => items.find(x => x.id === id)!).filter(Boolean) : basket;
  const shownSpent = shown.reduce((a, x) => a + x.price, 0);
  const shownLeft = BUDGET - shownSpent;
  const hovering = hoverItem && !shown.find(x => x.id === hoverItem.id) ? hoverItem : null;
  const coinSize = BUDGET <= 10 ? 22 : BUDGET <= 20 ? 14 : 10;
  // Four goods to a shelf on every phone: a 320-wide SE gets slimmer cards, not a third row.
  const goodsW = Math.min(76, Math.floor((Math.min(W, 440) - 24 - 16 - 18) / 4));
  const bought = checkout ?? [];
  const boughtSum = bought.reduce((a, x) => a + x.price, 0);

  const Check = ({ ok, label }: { ok: boolean; label: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ok ? C.tealSoft : C.sandLine, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 }}>
      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: ok ? C.teal : C.cream, borderWidth: ok ? 0 : 1.5, borderColor: C.sandDeep, alignItems: 'center', justifyContent: 'center' }}>
        {ok && <Text style={{ fontFamily: F.bodyHeavy, fontSize: 9, color: C.cream }}>✓</Text>}
      </View>
      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11.5, color: ok ? C.tealDeep : C.muted }}>{label}</Text>
    </View>
  );

  return (
    <DropProvider onHoverChange={(z, id) => setHoverItem(z === 'basket' && id ? items.find(x => x.id === id) ?? null : null)}>
      <View style={{ flex: 1, backgroundColor: C.cream }}>
        <GameBody>
        <View style={{ paddingTop: ins.top + 8, paddingHorizontal: 16 }}>
          <TopBar back="← Map" onBack={() => navigation.goBack()} right={<><Purse /><AskNumiButton onPress={() => { trk.asked(true); setVoiceOpen(true); }} glowing={trk.wrongStreak > 0 && !voiceOpen} /></>} />

          {/* ─── goal card ─── */}
          <Enter delay={80}>
            <View style={[{ marginTop: 8, backgroundColor: C.paper, borderRadius: 20, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }, softShadow(0.08, 3)]}>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: COIN, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: COIN_DEEP }}>
                <Text style={{ fontFamily: F.display, fontSize: 20, lineHeight: 26, color: C.cream }}>{BUDGET}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Eyebrow>{cfg.kind === 'feast' ? 'MARKET STREET · FEAST DAY' : cfg.kind === 'exact' ? 'MARKET STREET · EXACT CHANGE' : 'MARKET STREET · BREAKFAST RUN'}</Eyebrow>
                <Text style={[T.body, { fontSize: 13, marginTop: 1 }]}>
                  {cfg.kind === 'feast' ? `A drink and two foods for ${BUDGET} or less.` : cfg.kind === 'exact' ? `A drink and food that cost exactly ${BUDGET}.` : `Buy breakfast for Numi without spending more than ${BUDGET}.`}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
                  <Check ok={shown.some(x => x.kind === 'drink')} label="🥛 A drink" />
                  <Check ok={foodCount(shown) >= cfg.foods} label={cfg.foods === 2 ? '🍞🍞 Two foods' : '🍞 Some food'} />
                  {cfg.exact && <Check ok={shownSpent === BUDGET} label="🪙 Every coin" />}
                </View>
              </View>
              {hintLevel >= 0 && (
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {HINT_LADDER.map((h, i) => <View key={h} style={{ width: 6, height: 7 + i * 3, borderRadius: 3, alignSelf: 'flex-end', backgroundColor: i <= hintLevel ? C.violet : C.sand }} />)}
                </View>
              )}
            </View>
          </Enter>
        </View>

        {/* ─── stall ─── */}
        <AutoScale k={fit}>
        <View style={{ marginTop: 10, marginHorizontal: 12 }}>
          <Awning />
          <View style={[{ backgroundColor: C.sunSoft, paddingHorizontal: 8, paddingBottom: 8, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, marginTop: -12, paddingTop: 16 }, softShadow(0.08, 3)]}>
            <View style={{ position: 'absolute', right: 8, top: -30 }} pointerEvents="none">
              <Bob amp={2} duration={1800}><Buddy id="pip" size={52} mood={solved ? 'wow' : trk.wrongStreak ? 'think' : 'happy'} cheering={solved} /></Bob>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 }}>
              {items.map(it => {
                const inB = !!shown.find(x => x.id === it.id);
                const dim = !inB && dimUnaffordable && it.price > shownLeft;
                if (inB) return <View key={it.id} style={{ width: goodsW, height: 86, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: C.sandDeep, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 22, opacity: 0.25 }}>{it.emoji}</Text></View>;
                return (
                  <Draggable key={it.id} id={it.id} a11y={`${it.name}, ${it.kind}, ${it.price} coins`} disabled={demo || !!checkout} onDrop={z => (z === 'basket' ? (add(it) ? 'accept' : 'reject') : 'ignore')} onTap={() => add(it, 'tap')}>
                    <Highlight active={highlight.includes(it.id)} color={C.violet}>
                      <Goods it={it} dots={showDots} dim={dim} w={goodsW} />
                    </Highlight>
                  </Draggable>
                );
              })}
            </View>
            {/* wooden counter */}
            <View style={{ height: 10, marginTop: 8, marginHorizontal: -8, backgroundColor: C.wood, borderBottomWidth: 4, borderBottomColor: C.woodDeep }} />

            {/* receipt: the math is revealed only after the child has shopped */}
            {checkout && (
              <View style={{ position: 'absolute', left: 16, right: 16, top: 20, bottom: 20, backgroundColor: 'rgba(34,48,59,.88)', borderRadius: 18, alignItems: 'center', justifyContent: 'center', padding: 12, gap: 6 }}>
                <Eyebrow color={C.sun}>PIP RINGS IT UP</Eyebrow>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {bought.map((x, i) => revealStep >= 1 ? <Pop key={x.id} delay={i * 120}><Text style={{ fontSize: 26 }}>{x.emoji}</Text></Pop> : null)}
                </View>
                {revealStep >= 1 && (
                  <Pop><Text style={{ fontFamily: F.display, fontSize: 28, lineHeight: 34, color: C.cream }}>{bought.map(x => x.price).join(' + ')} = <Text style={{ color: C.sun }}>{boughtSum}</Text></Text></Pop>
                )}
                {revealStep >= 2 && (
                  <Pop><Text style={{ fontFamily: F.display, fontSize: 28, lineHeight: 34, color: C.cream }}>{BUDGET} − {boughtSum} = <Text style={{ color: C.sun }}>{BUDGET - boughtSum}</Text> left</Text></Pop>
                )}
                {revealStep >= 3 && boughtSum === BUDGET && (
                  <Pop><Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: C.sun }}>⭐ Bonus: you spent exactly {BUDGET}!</Text></Pop>
                )}
              </View>
            )}
          </View>
        </View>

        </AutoScale>

        {/* ─── basket ─── */}
        <Wobble trigger={wob} style={{ marginHorizontal: 16, marginTop: 10 }}>
          <DropZone id="basket" pad={30} style={{ minHeight: 74 }}>
            <Highlight active={highlight.includes('basket')} color={C.violet}>
              <View style={{ minHeight: 74, borderRadius: 20, borderWidth: 2.5, borderStyle: 'dashed', borderColor: hovering ? (hovering.price > shownLeft ? C.coral : C.teal) : C.woodDeep, backgroundColor: 'rgba(176,122,74,.10)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 8 }}>
                <Text style={{ fontSize: 30 }}>🧺</Text>
                <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  {shown.length === 0 && !hovering && <Text style={[T.bodySm, { fontSize: 12 }]}>Drag (or tap) food and drinks into the basket</Text>}
                  {shown.map(x => (
                    <Tap key={x.id} onPress={() => remove(x)} a11y={`${x.name}, ${x.price} coins, in basket. Tap to put it back`} disabled={demo || !!checkout}>
                      <Squash trigger={1}>
                        <Highlight active={highlight.includes(x.id)} color={C.violet}>
                          <View style={{ backgroundColor: C.paper, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center' }}>
                            <Text style={{ fontSize: 24, lineHeight: 30 }}>{x.emoji}</Text>
                            <Text style={{ fontFamily: F.bodyHeavy, fontSize: 10, color: COIN_DEEP }}>{x.price}</Text>
                          </View>
                        </Highlight>
                      </Squash>
                    </Tap>
                  ))}
                  {hovering && (
                    <View style={{ opacity: 0.6, backgroundColor: hovering.price > shownLeft ? C.coralSoft : C.tealSoft, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 }} pointerEvents="none">
                      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11.5, color: hovering.price > shownLeft ? C.coralDeep : C.tealDeep }}>
                        {hovering.emoji} {hovering.price > shownLeft ? `${hovering.price - shownLeft} short` : `leaves ${shownLeft - hovering.price}`}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Highlight>
          </DropZone>
        </Wobble>

        {/* ─── coin purse ─── */}
        <Highlight active={highlight.includes('purse')} color={C.violet} style={{ marginHorizontal: 16, marginTop: 10 }}>
          <View style={[{ backgroundColor: C.paper, borderRadius: 18, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }, softShadow(0.06, 2)]}>
            <View style={{ alignItems: 'center', minWidth: 58 }}>
              <Text style={{ fontFamily: F.display, fontSize: 34, lineHeight: 38, color: shownLeft === 0 ? C.coralDeep : C.ink }}>{shownLeft}</Text>
              <Text style={{ fontFamily: F.bodyHeavy, fontSize: 10, letterSpacing: 1, color: C.faint }}>LEFT</Text>
              {plus && <FloatUp key={plus.k} style={{ position: 'absolute', top: -8 }}><Text style={{ fontFamily: F.display, fontSize: 22, color: plus.text.startsWith('+') ? C.teal : COIN_DEEP }}>{plus.text}</Text></FloatUp>}
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              {BUDGET <= 30 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
                  {Array.from({ length: BUDGET }, (_, i) => <PurseCoin key={i} index={BUDGET - 1 - i} size={coinSize} spent={i >= shownLeft} />)}
                </View>
              ) : (
                <View style={{ alignItems: 'flex-start' }}>
                  <PlaceValueMoney n={Math.max(0, shownLeft)} />
                  <Text style={{ fontFamily: F.bodyHeavy, fontSize: 9.5, color: C.faint, marginTop: 3 }}>green note = 100 · stack = 10 · coin = 1</Text>
                </View>
              )}
              <ProgressBar value={shownSpent / BUDGET} height={8} colors={[COIN]} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 10.5, color: C.muted }}>SPENT {shownSpent}</Text>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 10.5, color: C.muted }}>BUDGET {BUDGET}</Text>
              </View>
            </View>
          </View>
        </Highlight>

        {/* ─── coach ─── */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 14, marginTop: 8 }}>
          <Bob amp={3} duration={1600}><Numi size={52} mood={coach.mood} state={solved ? 'celebrate' : 'idle'} /></Bob>
          <View style={[{ flex: 1, backgroundColor: C.paper, borderRadius: 18, padding: 10 }, softShadow(0.08, 3)]}>
            <Text style={[T.body, { fontSize: 13 }]}>{coach.text}</Text>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        {/* ─── actions + tools ─── */}
        <View style={{ paddingHorizontal: 16, paddingBottom: ins.bottom + 12, gap: 8 }}>
          {solved ? (
            <Enter style={{ flexDirection: 'row', gap: 10 }}>
              <ChunkyButton style={{ flex: 1 }} size="md" icon="🔁" label="Shop again" color={C.sun} shadow={C.sunDeep} textColor={C.ink} a11y="Shop again with a new stall and budget" onPress={() => { recordPractice(trk.finish()); onPlayAnother(); }} />
              <ChunkyButton style={{ flex: 1 }} size="md" label="Continue" color={C.teal} shadow={C.tealDeep} onPress={finish} />
            </Enter>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                {valid && !checkout && !demo ? (
                  <Pop><ChunkyButton label={`Checkout · ${spent} coins`} size="md" color={C.teal} shadow={C.tealDeep} onPress={doCheckout} /></Pop>
                ) : (
                  <Text style={[T.bodySm, { fontSize: 11 }]}>{demo ? 'Numi is showing you…' : checkout ? 'Pip is counting…' : `Checkout appears when the ${MEAL} is ready. Hints never end a try.`}</Text>
                )}
              </View>
              <Tap onPress={() => setPadOpen(true)} a11y="Open scratchpad" style={{ backgroundColor: C.sandLine, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 11 }}><Text style={{ fontSize: 16 }}>✏️</Text></Tap>
              <Tap onPress={() => { setShowDots(d => !d); trk.represent('groups'); }} a11y="Show prices as coins" style={{ backgroundColor: showDots ? C.ink : C.sandLine, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 11 }}><Text style={{ fontSize: 16 }}>🧩</Text></Tap>
              <Tap onPress={() => applyHint(hintLevel + 1)} a11y="Get a hint" disabled={demo || !!checkout} style={{ backgroundColor: C.violet, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 11 }}><Text style={{ fontSize: 16 }}>💡</Text></Tap>
            </View>
          )}
        </View>

        <Burst trigger={burst} x={Math.min(W, 440) / 2} y={ins.top + 260} count={22} dist={140} />

        </GameBody>
        <AskNumi
          open={voiceOpen}
          onClose={() => { setVoiceOpen(false); trk.resetIdle(); }}
          respond={respond}
          onReply={onReply}
          opener={spent ? `I can see your basket: you spent ${spent}, so ${left} coins are left. What are you thinking?` : `You have ${BUDGET} coins to spend. What are you thinking?`}
          chips={["I don't understand", 'Give me a clue', 'What is left?', 'Why is this wrong?', `Buy the ${(cheapest('drink', left) ?? items[1]).name.toLowerCase()}`].slice(0, micAllowed ? 5 : 4)}
          style={{ position: 'absolute', left: 12, right: 12, bottom: ins.bottom + 10 }}
        />
        <StuckSheet open={stuckOpen} onChoose={onStuck} onClose={() => { setStuckOpen(false); trk.resetIdle(); }} />
        <Scratchpad open={padOpen} onClose={() => { setPadOpen(false); trk.resetIdle(); }} title={`Budget ${BUDGET} · spent ${spent} · left ${left}`} />
        {demo && <View pointerEvents="none" style={{ position: 'absolute', top: ins.top + 64, alignSelf: 'center', backgroundColor: C.violet, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 }}><Text style={{ fontFamily: F.bodyHeavy, color: C.cream, fontSize: 12 }}>NUMI IS SHOWING YOU</Text></View>}
      </View>
    </DropProvider>
  );
}

/** Endless rounds: a fresh seed remounts the stall, the purse and the signal tracker. */
export default function Market(props: RootScreen<'Market'>) {
  const [round, setRound] = useState(() => ({ n: 0, seed: newSeed() }));
  return <MarketRound key={round.n} {...props} seed={round.seed} onPlayAnother={() => setRound(r => ({ n: r.n + 1, seed: newSeed() }))} />;
}
