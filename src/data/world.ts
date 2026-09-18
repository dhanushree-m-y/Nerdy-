// Static content for the Numbershire world.
import { C } from '../theme/tokens';

export type SkillId = 'addition' | 'subtraction' | 'multiplication' | 'division' | 'fractions' | 'geometry' | 'money';
export type StrategyId = 'make-ten' | 'double' | 'count-on' | 'break' | 'groups' | 'jump' | 'skip' | 'estimate';
export type MissionId = 'bridge' | 'market' | 'cafe' | 'farm' | 'picnic' | 'mystery' | 'boss';
export type AreaId = 'village' | 'market' | 'cafe' | 'garden' | 'mountain' | 'space';
export type CharacterId = 'nia' | 'milo' | 'pip' | 'zuri' | 'nova';
export type ItemId = 'apples' | 'wood' | 'gems' | 'coins' | 'eggs' | 'strawberries' | 'fuel' | 'lantern';

export const SKILLS: Record<SkillId, { name: string; power: string; icon: string; color: string; deep: string }> = {
  addition: { name: 'Addition', power: 'Addition Power', icon: '⚡', color: C.sun, deep: C.sunDeep },
  subtraction: { name: 'Subtraction', power: 'Subtraction Power', icon: '💨', color: C.hill, deep: C.hillDeep },
  multiplication: { name: 'Multiplication', power: 'Multiplication Power', icon: '🔥', color: C.coral, deep: C.coralDeep },
  division: { name: 'Division', power: 'Division Power', icon: '💧', color: C.water, deep: '#3d86b5' },
  fractions: { name: 'Fractions', power: 'Fraction Power', icon: '🍕', color: C.violet, deep: C.violetDeep },
  geometry: { name: 'Geometry', power: 'Geometry Power', icon: '🔷', color: C.teal, deep: C.tealDeep },
  money: { name: 'Money', power: 'Coin Sense', icon: '🪙', color: '#e0a02a', deep: '#b07d16' },
};

export const STRATEGIES: { id: StrategyId; name: string; icon: string; desc: string }[] = [
  { id: 'make-ten', name: 'Make a Ten', icon: '10', desc: 'Fill to ten, then add the rest.' },
  { id: 'double', name: 'Double It', icon: '×2', desc: 'Two of the same is quicker.' },
  { id: 'count-on', name: 'Count On', icon: '→', desc: 'Start at the big number and step up.' },
  { id: 'break', name: 'Break Apart', icon: '÷|', desc: 'Split a number into friendlier bits.' },
  { id: 'groups', name: 'Equal Groups', icon: '⁘', desc: 'Same amount in every group.' },
  { id: 'jump', name: 'Number Line Jump', icon: '⤳', desc: 'Hop along the line to the answer.' },
  { id: 'skip', name: 'Skip Counting', icon: '5s', desc: '5, 10, 15 — counting in steps.' },
  { id: 'estimate', name: 'Estimate First', icon: '≈', desc: 'Guess the size before you work it out.' },
];

export const CHARACTERS: Record<CharacterId, {
  name: string; role: string; focus: string; body: string; deep: string; soft: string; accent: string; line: string;
}> = {
  nia: { name: 'Nia', role: 'the Builder', focus: 'ADDITION · SUBTRACTION · MEASURING', body: C.coral, deep: C.coralDeep, soft: C.coralSoft, accent: C.sun, line: '"This bridge is broken and I need to get home. Can you help me measure what\'s missing?"' },
  milo: { name: 'Milo', role: 'the Chef', focus: 'FRACTIONS · DIVISION', body: C.sun, deep: C.sunDeep, soft: C.sunSoft, accent: C.cream, line: '"Half a cake for table two! Don\'t let me cut it wonky."' },
  pip: { name: 'Pip', role: 'the Shopkeeper', focus: 'MONEY · COMPARING', body: C.teal, deep: C.tealDeep, soft: C.tealSoft, accent: C.sun, line: '"Twenty coins today. What can we take home without borrowing?"' },
  zuri: { name: 'Zuri', role: 'the Explorer', focus: 'GEOMETRY · PATTERNS', body: C.violet, deep: C.violetDeep, soft: C.violetSoft, accent: C.coral, line: '"The path repeats — triangle, square, triangle. What comes next?"' },
  nova: { name: 'Nova', role: 'the Astronaut', focus: 'MIXED REASONING', body: C.water, deep: '#3d86b5', soft: '#e5eff5', accent: C.cream, line: '"12 food packs, 4 astronauts. Nobody goes hungry on my ship!"' },
};

export type Area = {
  id: AreaId; name: string; mission?: MissionId; character: CharacterId;
  x: number; y: number; // % of map
  color: string; deep: string; icon: string;
  requires?: { skill: SkillId; level: number } | { area: AreaId };
};

export const AREAS: Area[] = [
  { id: 'village', name: 'Number Village', mission: 'bridge', character: 'nia', x: 27, y: 88, color: C.coral, deep: C.coralDeep, icon: '🌉' },
  { id: 'market', name: 'Market Street', mission: 'market', character: 'pip', x: 70, y: 73, color: C.sun, deep: C.sunDeep, icon: '🧺', requires: { area: 'village' } },
  { id: 'cafe', name: 'Fraction Café', mission: 'cafe', character: 'milo', x: 29, y: 58, color: C.violet, deep: C.violetDeep, icon: '🍰', requires: { area: 'market' } },
  { id: 'garden', name: 'Geometry Garden', mission: 'farm', character: 'zuri', x: 71, y: 44, color: C.teal, deep: C.tealDeep, icon: '🥕', requires: { area: 'cafe' } },
  { id: 'mountain', name: 'Measurement Mountain', mission: 'picnic', character: 'nia', x: 30, y: 29, color: C.hillDeep, deep: '#4d8a78', icon: '🍓', requires: { skill: 'multiplication', level: 3 } },
  { id: 'space', name: 'Math Space Station', mission: 'boss', character: 'nova', x: 69, y: 13, color: C.night, deep: C.inkDeep, icon: '🚀', requires: { skill: 'division', level: 2 } },
];

export const MISSIONS: Record<MissionId, {
  title: string; area: AreaId; character: CharacterId; skill: SkillId; route: string;
  story: { oh: string; problem: string; ask: string }; cta: string; reward: ItemId; restores: string;
}> = {
  bridge: {
    title: 'The Broken Bridge', area: 'village', character: 'nia', skill: 'addition', route: 'Bridge',
    story: { oh: 'OH NO!', problem: 'The river washed the bridge away. Nia is stuck on the wrong side!', ask: 'Help Nia repair the bridge!' },
    cta: 'Fix it!', reward: 'wood', restores: 'The bridge is back — villagers can cross again.',
  },
  market: {
    title: 'Breakfast for Numi', area: 'market', character: 'pip', skill: 'money', route: 'Market',
    story: { oh: 'RUMBLE…', problem: 'Numi skipped breakfast and Pip\'s stall just opened.', ask: 'Buy breakfast without spending more than 20 coins!' },
    cta: 'Go shopping', reward: 'apples', restores: 'Market Street is bustling again.',
  },
  cafe: {
    title: 'Half, Please!', area: 'cafe', character: 'milo', skill: 'fractions', route: 'Cafe',
    story: { oh: 'DING DING!', problem: 'A hungry customer wants exactly half a pizza. Milo\'s hands are full.', ask: 'Slice the pizza fairly!' },
    cta: 'Start slicing', reward: 'lantern', restores: 'Fraction Café\'s lights are on.',
  },
  farm: {
    title: 'Carrot Rows', area: 'garden', character: 'zuri', skill: 'multiplication', route: 'Farm',
    story: { oh: 'HMM…', problem: 'Zuri\'s garden is a mess — carrots everywhere!', ask: 'Plant 12 carrots in 3 equal rows.' },
    cta: 'Start planting', reward: 'gems', restores: 'Geometry Garden is blooming.',
  },
  picnic: {
    title: 'The Fair Picnic', area: 'mountain', character: 'nia', skill: 'division', route: 'Picnic',
    story: { oh: 'UH OH…', problem: 'Four friends, twelve strawberries, and nobody wants to be left out.', ask: 'Make sure everyone gets the same amount.' },
    cta: 'Share them', reward: 'strawberries', restores: 'The mountain picnic spot is open.',
  },
  mystery: {
    title: 'The Cookie Case', area: 'village', character: 'milo', skill: 'subtraction', route: 'Mystery',
    story: { oh: 'GASP!', problem: 'Cookies disappeared from Milo\'s kitchen!', ask: 'Inspect the clues and crack the case.' },
    cta: 'Investigate', reward: 'gems', restores: 'The bakery is safe again.',
  },
  boss: {
    title: 'Rocket Launch', area: 'space', character: 'nova', skill: 'addition', route: 'Boss',
    story: { oh: 'COUNTDOWN!', problem: 'Nova\'s rocket is ready — but fuel, food and cargo are a mess.', ask: 'Help NUMI launch the rocket!' },
    cta: 'Prepare launch', reward: 'fuel', restores: 'The Space Station is powered up!',
  },
};

export const ITEMS: Record<ItemId, { name: string; icon: string; color: string; use: string }> = {
  apples: { name: 'Apples', icon: '🍎', color: '#fdeee9', use: 'Group them in the Farm' },
  wood: { name: 'Wood', icon: '🪵', color: '#f3e4d2', use: 'Build longer bridges' },
  gems: { name: 'Gems', icon: '💎', color: '#e5eff5', use: 'Open mystery doors' },
  coins: { name: 'Coins', icon: '🪙', color: '#f9f1dc', use: 'Spend at Market Street' },
  eggs: { name: 'Eggs', icon: '🥚', color: '#fbf6ea', use: 'Share at the picnic' },
  strawberries: { name: 'Strawberries', icon: '🍓', color: '#fdeee9', use: 'Divide between friends' },
  fuel: { name: 'Fuel cells', icon: '🔋', color: '#eaf5f2', use: 'Power the rocket' },
  lantern: { name: 'Lanterns', icon: '🏮', color: '#fdeee9', use: 'Light up the village' },
};

export const LEVELS = [
  { n: 1 as const, name: 'Explorer 1', grades: 'GRADES 1–2', desc: 'Counting, totals to 10, sharing by hand.', env: 'Meadow trail' },
  { n: 2 as const, name: 'Explorer 2', grades: 'GRADES 3–4', desc: 'Bonds to 20, tables, halves and quarters.', env: 'River valley' },
  { n: 3 as const, name: 'Explorer 3', grades: 'GRADE 5', desc: 'Bigger numbers, fractions of amounts, reasoning.', env: 'Mountain peaks' },
];
export type LevelN = 1 | 2 | 3;

/**
 * School grade. Every game reads this — not the three broad levels above — so a
 * first grader and a second grader never get the same numbers.
 */
export type Grade = 1 | 2 | 3 | 4 | 5;
export const GRADES: { g: Grade; name: string; desc: string; skills: string; env: LevelN }[] = [
  { g: 1, name: 'Grade 1', desc: 'Adding and taking away within 10, halves, sharing between two.', skills: 'Within 10 · halves', env: 1 },
  { g: 2, name: 'Grade 2', desc: 'Within 20 and crossing ten, three numbers at once, quarters, equal rows.', skills: 'Within 20 · quarters', env: 1 },
  { g: 3, name: 'Grade 3', desc: 'Tens and hundreds, times tables, sharing with leftovers.', skills: 'Hundreds · tables', env: 2 },
  { g: 4, name: 'Grade 4', desc: 'Bigger hundreds, harder tables, remainders, equal fractions.', skills: 'Remainders · equal fractions', env: 2 },
  { g: 5, name: 'Grade 5', desc: 'Thousands, multi-step shopping, the trickiest tables.', skills: 'Thousands · multi-step', env: 3 },
];
/** The broad level a grade belongs to (used for scenery and the rocket boss). */
export const levelOfGrade = (g: Grade): LevelN => (g <= 2 ? 1 : g <= 4 ? 2 : 3);

// Bridge Builder tuning per explorer level. Pieces always contain exactly one perfect pair.
type BridgePuzzle = { gap: number; pieces: number[]; pair: [number, number] };
export const BRIDGE_CFG: Record<LevelN, BridgePuzzle & { twin: BridgePuzzle }> = {
  1: { gap: 10, pieces: [6, 3, 4, 2], pair: [6, 4], twin: { gap: 10, pieces: [7, 5, 3, 1], pair: [7, 3] } },
  2: { gap: 15, pieces: [8, 7, 5, 4], pair: [8, 7], twin: { gap: 15, pieces: [9, 4, 6, 3], pair: [9, 6] } },
  3: { gap: 20, pieces: [13, 9, 7, 5], pair: [13, 7], twin: { gap: 20, pieces: [12, 9, 8, 6], pair: [12, 8] } },
};
