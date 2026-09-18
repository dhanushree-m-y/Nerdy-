// NUMI round generator: endless, sensibly-varied puzzles for each school grade.
//
// Everything here is PURE and deterministic given a seed, so a round can be replayed,
// unit-tested, or reproduced from a bug report. Nothing imports React or the store.
//
// Two dials decide a round:
//  • GRADE sets the mathematics — number size, which ideas appear (crossing ten, three
//    addends, remainders, equivalent fractions). Grade 1 and Grade 2 never share a range.
//  • DIFFICULTY (from the child's own recent signals) nudges the numbers kinder or
//    tougher *inside* that grade.
// And each game has several KINDS of problem, rotated so a child never gets the same
// kind twice in a row.
import { LearningSignal } from './engine';
import { Grade, MissionId, SkillId } from '../data/world';

// ─── Seeded randomness ─────────────────────────────────────────────────────────

/** A fresh seed for a new round. Cheap, no crypto needed — variety is all we want. */
export const newSeed = (): number => (Date.now() ^ ((Math.random() * 1e9) | 0)) | 0;

/** mulberry32 — tiny, fast, good enough spread for picking small numbers. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type R = () => number;
const int = (r: R, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const pick = <T,>(r: R, xs: readonly T[]): T => xs[Math.min(xs.length - 1, Math.floor(r() * xs.length))];
const shuffle = <T,>(r: R, xs: readonly T[]): T[] => {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};
/** Prefer candidates that pass `like`; fall back to the whole list so we never fail. */
const prefer = <T,>(r: R, xs: readonly T[], like: (x: T) => boolean): T => {
  const good = xs.filter(like);
  return pick(r, good.length ? good : xs);
};
const range = (lo: number, hi: number) => Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i);
/** "Kind" numbers: the ones a child can hold in their head — 5, 10, 15, 20… */
const isRound = (n: number) => n % 5 === 0;
/** Split a band so 'easier' / 'harder' actually feel different inside a grade. */
const bandFor = ([lo, hi]: [number, number], d: Difficulty): [number, number] => {
  const third = Math.max(1, Math.floor((hi - lo) / 3));
  return d === 'easier' ? [lo, Math.min(hi, lo + third * 2)] : d === 'harder' ? [Math.max(lo, hi - third * 2), hi] : [lo, hi];
};

// ─── Difficulty from the learner's own history ─────────────────────────────────

export type Difficulty = 'easier' | 'same' | 'harder';

const wrongCount = (s: LearningSignal) => s.attempts.filter(a => !a.correct).length;
const usedDeepHint = (s: LearningSignal) => s.hints.some(h => h === 'guided' || h === 'demo');
/** A "struggle": two or more misses, or help deep enough that Numi had to lead. */
const struggled = (s: LearningSignal) => wrongCount(s) >= 2 || usedDeepHint(s);
/** "Fast and clean": solved without a miss, without deep help, without stalling. */
const breezed = (s: LearningSignal) => wrongCount(s) === 0 && !usedDeepHint(s) && s.completedMs > 0 && s.completedMs < 45000;

/**
 * Reads the last ~3 signals for one skill and says which way the next round should lean.
 * Pedagogy: a child who is fluent gets bored before they get tired, and a child who is
 * struggling needs the *same* idea with kinder numbers — never a different topic.
 */
export function pickDifficulty(signals: LearningSignal[], skill: SkillId): Difficulty {
  const recent = signals.filter(s => s.skill === skill).slice(-3);
  if (recent.length === 0) return 'same';
  if (recent.filter(struggled).length >= 2) return 'easier';
  if (recent.every(breezed)) return 'harder';
  return 'same';
}

// ─── Kind rotation ─────────────────────────────────────────────────────────────

/**
 * Games tag each round's challenge as "[kind] …". This reads the last one back so the
 * next round can pick a different kind — the variety survives restarts because it
 * lives in the child's own signal history.
 */
export function lastKindOf(signals: LearningSignal[], mission: MissionId): string | undefined {
  for (let i = signals.length - 1; i >= 0; i--) {
    if (signals[i].mission !== mission) continue;
    return /^\[([\w-]+)\]/.exec(signals[i].challenge)?.[1];
  }
  return undefined;
}
/** Label a challenge with its kind, e.g. "[three] 4 + 6 + 7". */
export const tagKind = (kind: string, text: string) => `[${kind}] ${text}`;

function chooseKind<K extends string>(r: R, kinds: readonly K[], avoid?: string): K {
  const fresh = kinds.filter(k => k !== avoid);
  return pick(r, fresh.length ? fresh : kinds);
}

// ─── Bridge Builder · addition ─────────────────────────────────────────────────
//
// Kinds:
//  pair    — two planks fill the gap exactly.
//  started — one plank is already laid; find the one that finishes it (a missing addend).
//  three   — it takes three planks (three addends; the child has to plan, not just spot).
//
// Grades 3–5 build with long timbers: every block on the bridge is worth 10, 25 or 50,
// so the numbers grow into the hundreds and thousands while the bridge stays readable.

export type BridgeKind = 'pair' | 'started' | 'three';
export type BridgePuzzle = {
  kind: BridgeKind;
  gap: number;
  /** What one block of the bridge is worth. 1 for grades 1–2. */
  scale: number;
  /** Planks in the pile (not including a pre-laid plank). */
  pieces: number[];
  /** The planks that fill the gap, biggest first. Includes `fixed` when there is one. */
  solution: number[];
  /** A plank already on the bridge when the round starts. */
  fixed: number | null;
  /** First plank and "everything else" — kept for the make-ten tutor. */
  pair: [number, number];
};

const BRIDGE: Record<Grade, { scale: number; ticks: [number, number]; kinds: BridgeKind[] }> = {
  1: { scale: 1, ticks: [5, 10], kinds: ['pair', 'started'] },
  2: { scale: 1, ticks: [11, 20], kinds: ['pair', 'started', 'three'] },
  3: { scale: 10, ticks: [6, 20], kinds: ['pair', 'started', 'three'] },
  4: { scale: 25, ticks: [8, 20], kinds: ['pair', 'started', 'three'] },
  5: { scale: 50, ticks: [12, 30], kinds: ['pair', 'started', 'three'] },
};

/** Every subset (size ≥ min) of `xs` that sums to `target`. */
function subsetsSumming(xs: number[], target: number, min = 2): number[][] {
  const out: number[][] = [];
  const walk = (i: number, acc: number[], sum: number) => {
    if (sum === target && acc.length >= min) out.push(acc.slice());
    if (i >= xs.length || sum >= target) return;
    walk(i + 1, [...acc, xs[i]], sum + xs[i]);
    walk(i + 1, acc, sum);
  };
  walk(0, [], 0);
  return out;
}

/**
 * A plank gap with exactly ONE way to fill it from the pile.
 * Pedagogy: 'easier' lands on friendly totals and bonds a child already owns; 'harder'
 * picks awkward totals and pairs that must cross a ten (or a hundred). Grade 1 never
 * regroups without help: the gap is ten or less.
 */
export function genBridge(grade: Grade, difficulty: Difficulty, seed: number, avoid?: string): BridgePuzzle {
  const r = rng(seed);
  const cfg = BRIDGE[grade];
  const kind = chooseKind(r, cfg.kinds, avoid);
  const [lo, hi] = bandFor(cfg.ticks, difficulty);
  let gaps = range(lo, hi);
  if (kind === 'three') gaps = gaps.filter(g => g >= 9);
  if (!gaps.length) gaps = [cfg.ticks[1]];
  const gap =
    difficulty === 'easier' ? prefer(r, gaps, isRound)
      : difficulty === 'harder' ? prefer(r, gaps, n => !isRound(n))
        : pick(r, gaps);
  const minPiece = gap <= 10 ? 1 : Math.ceil(gap * 0.15);

  // ── the solution ──
  let solution: number[];
  if (kind === 'three') {
    const triples: number[][] = [];
    for (let a = minPiece; a < gap; a++) for (let b = minPiece; b < a; b++) {
      const c = gap - a - b;
      if (c >= minPiece && c < b) triples.push([a, b, c]);
    }
    solution = triples.length ? pick(r, triples) : [gap - 2 * minPiece, minPiece, minPiece];
  } else {
    let pairs: number[][] = [];
    for (let b = minPiece; b < gap / 2; b++) pairs.push([gap - b, b]);
    if (!pairs.length) pairs = [[gap - 1, 1]];
    const crossesTen = ([a, b]: number[]) => grade === 2 && a < 10 && b < 10;
    solution =
      difficulty === 'easier' ? prefer(r, pairs, ([a, b]) => a === 10 || b <= 3 || isRound(a))
        : difficulty === 'harder' ? prefer(r, pairs, p => (grade === 2 ? crossesTen(p) : !isRound(p[0])) && p[1] >= 3)
          : pick(r, pairs);
  }
  solution = [...solution].sort((a, b) => b - a);
  const fixed = kind === 'started' ? solution[0] : null;
  const inPile = kind === 'started' ? solution.slice(1) : solution;

  // ── distractors: never a second way to fill the gap ──
  const extras = kind === 'three' ? 2 : grade >= 3 || difficulty === 'harder' ? 3 : 2;
  const pool = range(minPiece, gap - 1).filter(v => !inPile.includes(v));
  const target = fixed === null ? gap : gap - fixed;
  const minParts = fixed === null ? 2 : 1;
  const unique = (xs: number[]) => subsetsSumming(xs, target, minParts).length === 1;
  const pieces = [...inPile];
  for (let tries = 0; tries < 400 && pieces.length < inPile.length + extras; tries++) {
    const d = pick(r, pool);
    if (!pieces.includes(d) && unique([...pieces, d])) pieces.push(d);
  }
  for (const d of pool) {
    if (pieces.length >= inPile.length + extras) break;
    if (!pieces.includes(d) && unique([...pieces, d])) pieces.push(d);
  }

  const S = cfg.scale;
  const sol = solution.map(v => v * S);
  return {
    kind,
    gap: gap * S,
    scale: S,
    pieces: shuffle(r, pieces).map(v => v * S),
    solution: sol,
    fixed: fixed === null ? null : fixed * S,
    pair: [sol[0], sol.slice(1).reduce((a, b) => a + b, 0)],
  };
}

// ─── Market Street · money ─────────────────────────────────────────────────────
//
// Kinds:
//  breakfast — a drink and some food, without going over the purse.
//  feast     — a drink and TWO foods: three prices to add and keep under the budget.
//  exact     — a drink and a food that use up every single coin (no change).

export type MarketItem = { name: string; icon: string; price: number; kind: 'food' | 'drink' };
export type MarketKind = 'breakfast' | 'feast' | 'exact';
export type MarketPuzzle = { kind: MarketKind; budget: number; items: MarketItem[]; foods: number; exact: boolean };

const DRINKS: Omit<MarketItem, 'price'>[] = [
  { name: 'Milk', icon: '🥛', kind: 'drink' },
  { name: 'Juice', icon: '🧃', kind: 'drink' },
  { name: 'Water', icon: '💧', kind: 'drink' },
  { name: 'Smoothie', icon: '🥤', kind: 'drink' },
  { name: 'Cocoa', icon: '☕', kind: 'drink' },
];
const FOODS: Omit<MarketItem, 'price'>[] = [
  { name: 'Apple', icon: '🍎', kind: 'food' },
  { name: 'Bread', icon: '🍞', kind: 'food' },
  { name: 'Cheese', icon: '🧀', kind: 'food' },
  { name: 'Banana', icon: '🍌', kind: 'food' },
  { name: 'Egg', icon: '🥚', kind: 'food' },
  { name: 'Honey', icon: '🍯', kind: 'food' },
  { name: 'Pear', icon: '🍐', kind: 'food' },
  { name: 'Muffin', icon: '🧁', kind: 'food' },
  { name: 'Melon', icon: '🍉', kind: 'food' },
];

const MARKET: Record<Grade, { budget: [number, number]; price: [number, number]; step: number; kinds: MarketKind[] }> = {
  1: { budget: [6, 10], price: [1, 6], step: 1, kinds: ['breakfast', 'exact'] },
  2: { budget: [12, 20], price: [2, 11], step: 1, kinds: ['breakfast', 'feast', 'exact'] },
  3: { budget: [30, 100], price: [5, 55], step: 5, kinds: ['breakfast', 'feast', 'exact'] },
  4: { budget: [100, 300], price: [12, 160], step: 1, kinds: ['breakfast', 'feast', 'exact'] },
  5: { budget: [300, 900], price: [45, 480], step: 1, kinds: ['breakfast', 'feast', 'exact'] },
};

/**
 * A stall of 8 goods and a purse. Always solvable for its kind.
 * Pedagogy: 'easier' uses round budgets and friendly prices; 'harder' uses awkward ones,
 * so the child must actually add rather than recognise.
 */
export function genMarket(grade: Grade, difficulty: Difficulty, seed: number, avoid?: string): MarketPuzzle {
  const r = rng(seed);
  const cfg = MARKET[grade];
  const kind = chooseKind(r, cfg.kinds, avoid);
  const step = cfg.step;
  const snap = (n: number) => Math.max(step, Math.round(n / step) * step);
  const [blo, bhi] = bandFor(cfg.budget, difficulty);
  const budgets = range(Math.ceil(blo / step), Math.floor(bhi / step)).map(n => n * step);
  const budget =
    difficulty === 'easier' ? prefer(r, budgets, n => (grade <= 2 ? n === 10 || n === 20 : n % (step * 10) === 0))
      : difficulty === 'harder' ? prefer(r, budgets, n => (step === 1 ? !isRound(n) : n % 10 !== 0))
        : pick(r, budgets);
  // Prices scale with the purse so a feast still fits and one item never swallows it.
  const top = Math.max(step, Math.min(cfg.price[1], snap(budget * (kind === 'feast' ? 0.45 : 0.62))));
  const lowest = Math.min(cfg.price[0], top);
  const priceFor = (): number => {
    const p = snap(int(r, lowest, top));
    if (difficulty === 'easier' && step === 1 && grade <= 2) return isRound(p) || p <= 3 ? p : Math.max(lowest, p - 1);
    if (difficulty === 'harder' && step === 1 && isRound(p)) return Math.min(top, p + 1);
    return p;
  };

  const drinks = shuffle(r, DRINKS).slice(0, 3).map(d => ({ ...d, price: priceFor() }));
  const foods = shuffle(r, FOODS).slice(0, 5).map(f => ({ ...f, price: priceFor() }));
  const byPrice = <T extends { price: number }>(xs: T[]) => [...xs].sort((a, b) => a.price - b.price);

  if (kind === 'exact') {
    // One exact pair on purpose: the drink costs part of the purse, a food the rest.
    const share = snap(int(r, Math.round(budget * 0.25), Math.round(budget * 0.5)));
    drinks[0].price = Math.min(Math.max(step, share), budget - step);
    foods[0].price = budget - drinks[0].price;
  } else {
    const needFoods = kind === 'feast' ? 2 : 1;
    const cheapD = byPrice(drinks)[0];
    const cheapF = byPrice(foods).slice(0, needFoods);
    const cost = cheapD.price + cheapF.reduce((a, f) => a + f.price, 0);
    if (cost > budget) {
      const each = Math.max(step, Math.floor(budget / (needFoods + 1) / step) * step);
      cheapD.price = each;
      cheapF.forEach(f => { f.price = each; });
    }
  }
  return { kind, budget, items: shuffle(r, [...drinks, ...foods]), foods: kind === 'feast' ? 2 : 1, exact: kind === 'exact' };
}

// ─── The Fair Picnic · division ────────────────────────────────────────────────
//
// Kinds:
//  share    — everything shares out exactly.
//  leftover — a few can't be shared fairly and stay in the bowl (a remainder). Grade 3+.

export type PicnicKind = 'share' | 'leftover';
export type PicnicPuzzle = { kind: PicnicKind; total: number; friends: number; each: number; rest: number };

const PICNIC: Record<Grade, { friends: number[]; each: [number, number]; max: number; kinds: PicnicKind[] }> = {
  1: { friends: [2], each: [2, 5], max: 10, kinds: ['share'] },
  2: { friends: [3, 4], each: [2, 5], max: 20, kinds: ['share'] },
  3: { friends: [3, 4, 5], each: [4, 7], max: 36, kinds: ['share', 'leftover'] },
  4: { friends: [4, 5], each: [5, 8], max: 44, kinds: ['share', 'leftover'] },
  5: { friends: [5], each: [7, 9], max: 49, kinds: ['share', 'leftover'] },
};

/**
 * Pedagogy: 'easier' keeps the share small enough to deal round-by-round on fingers;
 * 'harder' pushes the share up so skip-counting beats one-by-one dealing.
 */
export function genPicnic(grade: Grade, difficulty: Difficulty, seed: number, avoid?: string): PicnicPuzzle {
  const r = rng(seed);
  const cfg = PICNIC[grade];
  const kind = chooseKind(r, cfg.kinds, avoid);
  const friends =
    difficulty === 'easier' ? Math.min(...cfg.friends)
      : difficulty === 'harder' ? Math.max(...cfg.friends)
        : pick(r, cfg.friends);
  const [elo, ehi] = bandFor(cfg.each, difficulty);
  const rest = kind === 'leftover' ? int(r, 1, friends - 1) : 0;
  const options = range(elo, ehi).filter(e => e * friends + rest <= cfg.max);
  const each = options.length ? pick(r, options) : Math.max(1, Math.floor((cfg.max - rest) / friends));
  return { kind, total: each * friends + rest, friends, each, rest };
}

// ─── Carrot Rows · multiplication ──────────────────────────────────────────────
//
// Kinds:
//  plant — an empty garden: plant every carrot so all the rows match.
//  fix   — a rabbit has already planted some, unevenly. Plant the rest AND even it out.

export type FarmKind = 'plant' | 'fix';
export type FarmPuzzle = { kind: FarmKind; total: number; rows: number; start: number[] };

const FARM: Record<Grade, { rows: number[]; per: [number, number]; max: number; kinds: FarmKind[] }> = {
  1: { rows: [2], per: [2, 5], max: 10, kinds: ['plant'] },
  2: { rows: [3, 4], per: [2, 5], max: 20, kinds: ['plant', 'fix'] },
  3: { rows: [3, 4, 5], per: [4, 7], max: 35, kinds: ['plant', 'fix'] },
  4: { rows: [4, 5], per: [6, 9], max: 45, kinds: ['plant', 'fix'] },
  5: { rows: [5, 6], per: [7, 9], max: 54, kinds: ['plant', 'fix'] },
};

/**
 * Equal rows only — `total % rows === 0` — because the mission's whole idea is that every
 * row matches. Pedagogy: 'easier' stays inside the smaller tables; 'harder' reaches the
 * trickier ones where skip-counting has to be deliberate.
 */
export function genFarm(grade: Grade, difficulty: Difficulty, seed: number, avoid?: string): FarmPuzzle {
  const r = rng(seed);
  const cfg = FARM[grade];
  const kind = chooseKind(r, cfg.kinds, avoid);
  const rows =
    difficulty === 'easier' ? Math.min(...cfg.rows)
      : difficulty === 'harder' ? Math.max(...cfg.rows)
        : pick(r, cfg.rows);
  const [plo, phi] = bandFor(cfg.per, difficulty);
  const options = range(plo, phi).filter(p => p * rows <= cfg.max);
  const per = options.length ? pick(r, options) : Math.max(2, Math.floor(cfg.max / rows));
  const total = per * rows;

  // The rabbit plants roughly half the carrots, lopsided on purpose — never all equal.
  const start = Array(rows).fill(0) as number[];
  if (kind === 'fix') {
    const planted = Math.max(rows, Math.round(total * 0.45));
    for (let i = 0; i < planted; i++) {
      const row = r() < 0.55 ? 0 : int(r, 0, rows - 1);
      if (start[row] < per + 2) start[row] += 1;
    }
    if (Math.max(...start) === Math.min(...start)) {
      start[0] += 1;
      start[rows - 1] = Math.max(0, start[rows - 1] - 1);
    }
  }
  return { kind, total, rows, start };
}

// ─── Fraction Café · fractions ─────────────────────────────────────────────────
//
// Kinds:
//  cut    — a whole pizza; cut it, then serve the order.
//  precut — the pizza arrives already in quarters and someone orders a HALF: the child
//           has to see that 2/4 is the same amount (equivalent fractions). Grade 3+.

export type CafeKind = 'cut' | 'precut';
export type CafeOrder = { num: number; den: 2 | 4 };
export type CafeService = { kind: CafeKind; orders: CafeOrder[] };
export type CafePuzzle = { order: CafeOrder; cuts: number };

const O = (num: number, den: 2 | 4): CafeOrder => ({ num, den });
const CAFE: Record<Grade, { orders: [number, number]; bank: Record<Difficulty, CafeOrder[]>; kinds: CafeKind[] }> = {
  1: { orders: [1, 1], kinds: ['cut'], bank: { easier: [O(1, 2)], same: [O(1, 2)], harder: [O(1, 2), O(1, 4)] } },
  2: { orders: [1, 2], kinds: ['cut'], bank: { easier: [O(1, 2), O(1, 4)], same: [O(1, 2), O(1, 4), O(3, 4)], harder: [O(1, 4), O(3, 4), O(2, 4)] } },
  3: { orders: [2, 2], kinds: ['cut', 'precut'], bank: { easier: [O(1, 2), O(1, 4), O(3, 4)], same: [O(1, 4), O(2, 4), O(3, 4), O(1, 2)], harder: [O(2, 4), O(3, 4), O(1, 2)] } },
  4: { orders: [2, 3], kinds: ['cut', 'precut'], bank: { easier: [O(1, 2), O(1, 4), O(3, 4)], same: [O(1, 2), O(2, 4), O(3, 4), O(1, 4)], harder: [O(1, 2), O(2, 4), O(3, 4)] } },
  5: { orders: [3, 3], kinds: ['cut', 'precut'], bank: { easier: [O(1, 2), O(1, 4), O(3, 4)], same: [O(1, 2), O(2, 4), O(3, 4), O(1, 4)], harder: [O(1, 2), O(2, 4), O(3, 4)] } },
};

/** One café service: a short queue of different orders, and how the pizza arrives. */
export function genCafeService(grade: Grade, difficulty: Difficulty, seed: number, avoid?: string): CafeService {
  const r = rng(seed);
  const cfg = CAFE[grade];
  const kind = chooseKind(r, cfg.kinds, avoid);
  const count = int(r, cfg.orders[0], cfg.orders[1]);
  // A pre-cut pizza is only interesting when someone wants halves from quarters.
  const bank = kind === 'precut' ? cfg.bank[difficulty].filter(o => o.den === 4) : cfg.bank[difficulty];
  const out: CafeOrder[] = kind === 'precut' ? [O(1, 2)] : [];
  for (const o of shuffle(r, bank)) {
    if (out.length >= count) break;
    if (!out.some(x => x.num === o.num && x.den === o.den)) out.push(o);
  }
  while (out.length < count) out.push(bank[0] ?? O(1, 2));
  return { kind, orders: kind === 'precut' ? out : shuffle(r, out) };
}

/** Single-order form, for code that only wants one order. */
export function genCafe(grade: Grade, difficulty: Difficulty, seed: number): CafePuzzle {
  const order = genCafeService(grade, difficulty, seed).orders[0];
  return { order, cuts: order.den === 2 ? 1 : 2 };
}

// ─── The Cookie Case · subtraction ─────────────────────────────────────────────

export type MysteryPuzzle = { total: number; left: number };

const MYSTERY: Record<Grade, { total: [number, number]; gone: [number, number] }> = {
  1: { total: [6, 10], gone: [2, 4] },
  2: { total: [11, 20], gone: [3, 9] },
  3: { total: [21, 35], gone: [5, 12] },
  4: { total: [30, 50], gone: [8, 15] },
  5: { total: [45, 70], gone: [11, 19] },
};

/**
 * A batch, a jar, and some cookies gone. The gap stays small enough to hop along a
 * number line on one screen — the strategy the case is really teaching.
 * Pedagogy: 'easier' lands the jar on a friendly number; 'harder' makes the gap cross
 * the next ten so the child has to bridge it.
 */
export function genMystery(grade: Grade, difficulty: Difficulty, seed: number): MysteryPuzzle {
  const r = rng(seed);
  const cfg = MYSTERY[grade];
  const totals = range(...bandFor(cfg.total, difficulty));
  const total =
    difficulty === 'easier' ? prefer(r, totals, n => isRound(n) || n % 2 === 0)
      : difficulty === 'harder' ? prefer(r, totals, n => !isRound(n))
        : pick(r, totals);
  const [glo, ghi] = bandFor(cfg.gone, difficulty);
  const gones = range(glo, Math.min(ghi, total - 2));
  const crossesTen = (g: number) => Math.floor((total - g) / 10) !== Math.floor(total / 10);
  const gone =
    difficulty === 'easier' ? prefer(r, gones, g => isRound(total - g))
      : difficulty === 'harder' ? prefer(r, gones, crossesTen)
        : pick(r, gones.length ? gones : [glo]);
  return { total, left: total - gone };
}
