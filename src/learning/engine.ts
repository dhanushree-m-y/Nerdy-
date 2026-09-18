// NUMI learning engine: signals → interpretation → adaptation.
// Everything here is pure so it can be unit-tested and reused by the tutor.
import { MissionId, SkillId, StrategyId } from '../data/world';

export type Representation = 'symbolic' | 'numberLine' | 'blocks' | 'groups' | 'voice';
export const REPRESENTATION_LADDER: Representation[] = ['symbolic', 'numberLine', 'blocks', 'groups', 'voice'];

export type HintKind = 'gentle' | 'visual' | 'strategy' | 'guided' | 'demo';
export const HINT_LADDER: HintKind[] = ['gentle', 'visual', 'strategy', 'guided', 'demo'];

export type Attempt = { value: string; correct: boolean; at: number };

export type LearningSignal = {
  id: string;
  mission: MissionId;
  skill: SkillId;
  challenge: string;          // e.g. "8 + 7"
  startedAt: number;
  firstInteractionMs: number | null;
  completedMs: number;
  attempts: Attempt[];
  longestPauseMs: number;
  hints: HintKind[];
  askedNumi: number;
  representation: Representation;
  strategy: StrategyId | null;
  selfCorrected: boolean;
  explained: 'none' | 'correct' | 'partial';
  voiceUsed: boolean;
  confidence?: Confidence;
};

export type Confidence = 'easy' | 'got-it' | 'tricky' | 'need-help';

export type Interpretation = {
  concept: 'GOOD' | 'DEVELOPING' | 'NEEDS SUPPORT';
  strategy: 'GOOD' | 'DEVELOPING' | 'NOT YET SEEN';
  fluency: 'GOOD' | 'NEEDS PRACTICE';
  note: string;
};

export function interpret(sig: LearningSignal): Interpretation {
  const wrong = sig.attempts.filter(a => !a.correct).length;
  const deepHints = sig.hints.filter(h => h === 'guided' || h === 'demo').length;
  const concept: Interpretation['concept'] =
    deepHints > 0 && sig.explained === 'none' ? 'NEEDS SUPPORT'
      : wrong <= 1 || sig.explained === 'correct' ? 'GOOD' : 'DEVELOPING';
  const strategy: Interpretation['strategy'] =
    sig.strategy && sig.explained === 'correct' ? 'GOOD' : sig.strategy ? 'DEVELOPING' : 'NOT YET SEEN';
  const fluency: Interpretation['fluency'] =
    sig.completedMs < 25000 && wrong === 0 && sig.hints.length === 0 ? 'GOOD' : 'NEEDS PRACTICE';
  let note = '';
  if (sig.selfCorrected) note = 'Changed strategy and self-corrected.';
  else if (sig.longestPauseMs > 15000) note = `Paused ${Math.round(sig.longestPauseMs / 1000)}s before getting help.`;
  else if (wrong === 0) note = 'Solved first try.';
  return { concept, strategy, fluency, note };
}

// Mastery XP: rewards understanding and explanation more than raw speed.
export function xpFor(sig: LearningSignal): number {
  const wrong = sig.attempts.filter(a => !a.correct).length;
  let xp = 20;
  xp -= Math.min(8, wrong * 3);
  xp -= sig.hints.reduce((a, h) => a + (h === 'demo' ? 6 : h === 'guided' ? 4 : 1), 0);
  if (sig.selfCorrected) xp += 5;
  if (sig.explained === 'correct') xp += 10;
  if (sig.strategy) xp += 4;
  return Math.max(6, xp);
}

export const XP_PER_LEVEL = 40;
export const levelFromXp = (xp: number) => Math.min(9, 1 + Math.floor(xp / XP_PER_LEVEL));
export const levelProgress = (xp: number) => (xp % XP_PER_LEVEL) / XP_PER_LEVEL;
export const masteryPct = (xp: number) => Math.min(99, Math.round(18 + xp * 0.45));

// Adaptive representation: if struggling, move DOWN the ladder (more concrete); when fluent, move back up.
export function nextRepresentation(history: LearningSignal[], skill: SkillId): Representation {
  const recent = history.filter(h => h.skill === skill).slice(-3);
  if (recent.length === 0) return 'blocks';
  const last = recent[recent.length - 1];
  const idx = REPRESENTATION_LADDER.indexOf(last.representation);
  const struggled = recent.filter(r => r.attempts.filter(a => !a.correct).length >= 2 || r.hints.includes('demo')).length;
  const fluent = recent.filter(r => interpret(r).fluency === 'GOOD').length;
  if (struggled >= 2) return REPRESENTATION_LADDER[Math.min(REPRESENTATION_LADDER.length - 1, idx + 1)];
  if (fluent >= 2) return REPRESENTATION_LADDER[Math.max(0, idx - 1)];
  return last.representation;
}

// Confidence × performance → a private note for grown-ups.
export function confidenceInsight(conf: Confidence, sig?: LearningSignal): string {
  const accurate = sig ? sig.attempts.filter(a => !a.correct).length <= 1 : true;
  if (accurate && (conf === 'need-help' || conf === 'tricky'))
    return 'High accuracy, lower confidence. The skill is there — reassurance will help more than new content.';
  if (!accurate && conf === 'easy')
    return 'Felt easy but took a few tries. Worth a gentle "show me how" conversation.';
  if (conf === 'easy') return 'Felt easy and was accurate — Numi will nudge the challenge up.';
  if (conf === 'got-it') return 'Confidence matches performance. Staying at this level one more session.';
  return 'Found it hard and needed help. Numi will switch to a more visual representation next time.';
}

// ─── Language understanding (kid speech → intent) ──────────────────────────────
const NUM_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, to: 2, too: 2, three: 3, four: 4, for: 4, five: 5, six: 6, seven: 7, eight: 8, ate: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30,
};

export function extractNumbers(text: string, loose = false): number[] {
  const out: number[] = [];
  const tokens = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/[\s-]+/).filter(Boolean);
  for (const t of tokens) {
    if (/^\d+$/.test(t)) out.push(parseInt(t, 10));
    else if (t in NUM_WORDS) {
      // "to"/"for"/"too"/"ate" are only numbers when the utterance is short
      if (['to', 'too', 'for', 'ate'].includes(t) && !loose) continue;
      out.push(NUM_WORDS[t]);
    }
  }
  return out;
}

export type Intent =
  | { kind: 'confused' }
  | { kind: 'clue' }
  | { kind: 'another-way' }
  | { kind: 'why-wrong' }
  | { kind: 'explain-concept'; topic: string }
  | { kind: 'answer'; n: number }
  | { kind: 'command'; action: 'use' | 'remove' | 'buy' | 'share' | 'cut'; values: number[]; words: string[] }
  | { kind: 'explanation'; strategy: StrategyId | null }
  | { kind: 'feeling'; value: Confidence }
  | { kind: 'off-topic' }
  | { kind: 'unclear' };

export function parseIntent(raw: string, expectingNumber = false): Intent {
  const t = raw.toLowerCase().trim();
  if (!t) return { kind: 'unclear' };
  if (/(don'?t|do not) (understand|get it|know)|confus|lost|stuck|help me/.test(t)) return { kind: 'confused' };
  if (/clue|hint|tip|how (much|many)|what('s| is) (left|missing)/.test(t)) return { kind: 'clue' };
  if (/another way|different way|show me|other way/.test(t)) return { kind: 'another-way' };
  if (/why.*(wrong|not)|what.*wrong/.test(t)) return { kind: 'why-wrong' };
  const concept = t.match(/what (does|is) (\w+)( mean)?/);
  if (concept) return { kind: 'explain-concept', topic: concept[2] };
  if (/^(put (them|it) back|take (it|them) (out|back)|remove|undo)/.test(t)) return { kind: 'command', action: 'remove', values: extractNumbers(t, true), words: [] };
  if (/^(use|try|put|add|place|drag)\b/.test(t)) return { kind: 'command', action: 'use', values: extractNumbers(t, true), words: [] };
  if (/^(buy|get|i want|grab)\b/.test(t)) return { kind: 'command', action: 'buy', values: [], words: t.split(/\s+|,|and/).filter(Boolean) };
  if (/^(give|share|split)\b/.test(t)) return { kind: 'command', action: 'share', values: extractNumbers(t, true), words: [] };
  if (/^(cut|slice)\b/.test(t)) return { kind: 'command', action: 'cut', values: extractNumbers(t, true), words: t.split(/\s+/) };
  const nums = extractNumbers(t, expectingNumber || t.split(/\s+/).length <= 3);
  if (/(because|first|then|i knew|i made|i added|i counted|i split|i shared|so i)/.test(t))
    return { kind: 'explanation', strategy: detectStrategy(t) };
  if (nums.length && t.split(/\s+/).length <= 4) return { kind: 'answer', n: nums[nums.length - 1] };
  if (/easy/.test(t)) return { kind: 'feeling', value: 'easy' };
  if (/tricky|hard/.test(t)) return { kind: 'feeling', value: 'tricky' };
  if (/(game|video|youtube|dinosaur|pokemon|song|joke|weather|where do you live|your name)/.test(t)) return { kind: 'off-topic' };
  return { kind: 'unclear' };
}

export function detectStrategy(text: string): StrategyId | null {
  const t = text.toLowerCase();
  const n = extractNumbers(t, true);
  if (/(make|made|makes|get to|got to) (a )?(10|ten)|(10|ten) first/.test(t) || (n.includes(10) && /(then|and then|another|more)/.test(t))) return 'make-ten';
  if (/double|twice|same number/.test(t)) return 'double';
  if (/number line|jump|hop/.test(t)) return 'jump';
  if (/groups?|each|every(one|body)|equal/.test(t)) return 'groups';
  if (/skip|in (twos|fives|tens)|2, 4|5, 10/.test(t)) return 'skip';
  if (/split|break|broke|apart/.test(t)) return 'break';
  if (/count(ed)? on|counted up|started at/.test(t)) return 'count-on';
  if (/guess|estimate|about|around/.test(t)) return 'estimate';
  return null;
}

// ─── Personalized daily adventure ──────────────────────────────────────────────
export type AdventureStop = { title: string; sub: string; mission: MissionId; slot: 'review' | 'current' | 'struggle' | 'mystery' };

export function buildTodaysAdventure(opts: {
  skillXp: Partial<Record<SkillId, number>>;
  struggles: { skill: SkillId; context: string }[];
  explorerName: string;
}): { title: string; icon: string; minutes: number; stops: AdventureStop[] } {
  const xp = opts.skillXp;
  const bySkill = (Object.keys(xp) as SkillId[]).sort((a, b) => (xp[b] ?? 0) - (xp[a] ?? 0));
  const strongest = bySkill[0] ?? 'addition';
  const struggle = opts.struggles[opts.struggles.length - 1];
  const missionFor: Partial<Record<SkillId, MissionId>> = {
    addition: 'bridge', subtraction: 'mystery', money: 'market', fractions: 'cafe', multiplication: 'farm', division: 'picnic',
  };
  return {
    title: 'Fix the Number Train',
    icon: '🚂',
    minutes: 5,
    stops: [
      { title: 'Warm up the boiler', sub: 'An old friend', mission: missionFor[strongest] ?? 'bridge', slot: 'review' },
      { title: 'Load the crates', sub: 'Pip needs a hand', mission: 'market', slot: 'current' },
      { title: 'Two carriages of carrots', sub: 'Zuri\'s delivery', mission: 'farm', slot: 'current' },
      { title: struggle ? 'Share the lunches' : 'Slice the train cake', sub: struggle ? 'Nova remembers this one' : 'Milo\'s treat', mission: struggle ? (missionFor[struggle.skill] ?? 'picnic') : 'cafe', slot: 'struggle' },
      { title: 'The whistle mystery', sub: 'Who took the cookies?', mission: 'mystery', slot: 'mystery' },
    ],
  };
}

export const uid = () => Math.random().toString(36).slice(2, 10);
