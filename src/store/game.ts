import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AREAS, AreaId, Grade, ItemId, levelOfGrade, LevelN, MissionId, MISSIONS, SkillId, StrategyId } from '../data/world';
import { Confidence, LearningSignal, levelFromXp, xpFor } from '../learning/engine';

export type Explorer = { name: string; avatar: number; skin: number; hair: number; hairStyle: number; outfit: number };

export type Settings = {
  reducedMotion: boolean;
  sound: boolean;
  ambience: boolean;        // quiet background pad
  voice: boolean;          // Numi speaks aloud (TTS)
  voiceStyle: 'calm' | 'playful';
  autoSpeak: boolean;      // read things out without being asked
  speechRate: number;      // 0.7 – 1.2
  captions: boolean;
  bigTargets: boolean;
  micAllowed: boolean;     // parent-controlled
  cameraAllowed: boolean;  // parent-controlled
  reportsAllowed: boolean;
  haptics: boolean;
  breakMinutes: number;     // gentle "time for a stretch" nudge; 0 = off
};

export type Struggle = { skill: SkillId; context: string; at: number; resolved: boolean };

export type Moment =
  | { kind: 'strategy'; id: StrategyId }
  | { kind: 'mastery'; skill: SkillId; level: number };

type State = {
  onboarded: boolean;
  explorer: Explorer;
  /** Broad level, always derived from `grade`. */
  level: LevelN;
  grade: Grade;
  coins: number;
  stars: number;
  completed: Partial<Record<MissionId, { stars: number; at: number; times: number }>>;
  strategies: Partial<Record<StrategyId, number>>; // id → discoveredAt
  skillXp: Record<SkillId, number>;
  backpack: Record<ItemId, number>;
  signals: LearningSignal[];
  struggles: Struggle[];
  confidence: { mission: MissionId; value: Confidence; at: number }[];
  todayDone: { date: string; stops: number[] };
  todayRewarded: string | null;
  classPower: number;
  parentPin: string | null;
  settings: Settings;
  pendingMoments: Moment[];
  lastRestored: AreaId | null;
  seenTips: string[];        // first-play coach marks already shown
  seasons: number;           // times the whole world has been restored
  streakDays: string[];

  // actions
  setExplorer: (e: Partial<Explorer>) => void;
  setGrade: (g: Grade) => void;
  finishOnboarding: () => void;
  completeMission: (m: MissionId, sig: LearningSignal, stars: number) => void;
  discoverStrategy: (s: StrategyId) => boolean;
  addStruggle: (s: Omit<Struggle, 'at' | 'resolved'>) => void;
  recordConfidence: (m: MissionId, c: Confidence) => void;
  addItem: (i: ItemId, n: number) => void;
  addCoins: (n: number) => void;
  toggleTodayStop: (i: number) => void;
  /** Grants today's treasure-chest reward once per calendar day. Returns true if granted now. */
  claimTodayReward: () => boolean;
  contributeClass: (n: number) => void;
  resetClassPower: () => void;
  setPin: (p: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
  /** A practice round ("Play another"): feeds the learning engine, pays no stars or coins. */
  recordPractice: (sig: LearningSignal) => void;
  shiftMoment: () => void;
  markTipSeen: (id: string) => void;
  startNewSeason: () => void;
  resetAll: () => void;
};

const today = () => new Date().toISOString().slice(0, 10);

const initial = {
  onboarded: false,
  explorer: { name: '', avatar: 0, skin: 1, hair: 0, hairStyle: 0, outfit: 0 },
  level: 1 as LevelN,
  grade: 2 as Grade,
  coins: 20,
  stars: 0,
  completed: {},
  strategies: { 'count-on': Date.now() - 86400000 * 3 } as Partial<Record<StrategyId, number>>,
  // A little prior history so the world and dashboards feel lived-in.
  skillXp: { addition: 150, subtraction: 125, multiplication: 70, division: 30, fractions: 50, geometry: 20, money: 60 } as Record<SkillId, number>,
  backpack: { apples: 6, wood: 12, gems: 3, coins: 20, eggs: 4, strawberries: 0, fuel: 0, lantern: 1 } as Record<ItemId, number>,
  signals: [] as LearningSignal[],
  struggles: [{ skill: 'division' as SkillId, context: 'Nova\'s food packs (12 ÷ 4)', at: Date.now() - 86400000, resolved: false }],
  confidence: [],
  todayDone: { date: today(), stops: [] as number[] },
  todayRewarded: null as string | null,
  classPower: 58,
  parentPin: null,
  settings: {
    reducedMotion: false, sound: true, ambience: true, voice: true, voiceStyle: 'calm' as const, autoSpeak: true, speechRate: 0.92, captions: true, bigTargets: false,
    micAllowed: true, cameraAllowed: false, reportsAllowed: true, haptics: true, breakMinutes: 20,
  },
  pendingMoments: [] as Moment[],
  lastRestored: null,
  seenTips: [] as string[],
  seasons: 0,
  streakDays: [] as string[],
};

export const useGame = create<State>()(
  persist(
    (set, get) => ({
      ...initial,
      setExplorer: e => set({ explorer: { ...get().explorer, ...e } }),
      setGrade: g => set({ grade: g, level: levelOfGrade(g) }),
      finishOnboarding: () => set({ onboarded: true }),
      completeMission: (m, sig, stars) => {
        const s = get();
        const mission = MISSIONS[m];
        const prevXp = s.skillXp[sig.skill] ?? 0;
        const gained = xpFor(sig);
        const nextXp = prevXp + gained;
        const moments = [...s.pendingMoments];
        if (levelFromXp(nextXp) > levelFromXp(prevXp)) moments.push({ kind: 'mastery', skill: sig.skill, level: levelFromXp(nextXp) });
        const prev = s.completed[m];
        const d = today();
        set({
          completed: { ...s.completed, [m]: { stars: Math.max(stars, prev?.stars ?? 0), at: Date.now(), times: (prev?.times ?? 0) + 1 } },
          skillXp: { ...s.skillXp, [sig.skill]: nextXp },
          signals: [...s.signals, sig].slice(-200),
          stars: s.stars + stars,
          coins: s.coins + 5 + stars * 2,
          backpack: { ...s.backpack, [mission.reward]: (s.backpack[mission.reward] ?? 0) + 3 },
          pendingMoments: moments,
          lastRestored: prev ? s.lastRestored : mission.area,
          streakDays: s.streakDays.includes(d) ? s.streakDays : [...s.streakDays, d].slice(-30),
          // a struggle on this skill counts as resolved once solved with light help
          struggles: s.struggles.map(st => st.skill === sig.skill && sig.hints.length <= 2 ? { ...st, resolved: true } : st),
        });
      },
      discoverStrategy: id => {
        const s = get();
        if (s.strategies[id]) return false;
        set({ strategies: { ...s.strategies, [id]: Date.now() }, pendingMoments: [...s.pendingMoments, { kind: 'strategy', id }] });
        return true;
      },
      addStruggle: st => set({ struggles: [...get().struggles, { ...st, at: Date.now(), resolved: false }].slice(-20) }),
      recordConfidence: (m, c) => {
        const s = get();
        const signals = s.signals.slice();
        const i = signals.map(x => x.mission).lastIndexOf(m);
        if (i >= 0) signals[i] = { ...signals[i], confidence: c };
        set({ confidence: [...s.confidence, { mission: m, value: c, at: Date.now() }].slice(-50), signals });
      },
      addItem: (i, n) => set({ backpack: { ...get().backpack, [i]: Math.max(0, (get().backpack[i] ?? 0) + n) } }),
      addCoins: n => set({ coins: Math.max(0, get().coins + n) }),
      toggleTodayStop: i => {
        const t = get().todayDone;
        const stops = t.date === today() ? t.stops : [];
        set({ todayDone: { date: today(), stops: stops.includes(i) ? stops.filter(x => x !== i) : [...stops, i] } });
      },
      claimTodayReward: () => {
        const s = get();
        const d = today();
        if (s.todayRewarded === d) return false;
        set({
          todayRewarded: d,
          coins: s.coins + 10,
          backpack: { ...s.backpack, gems: (s.backpack.gems ?? 0) + 1 },
        });
        return true;
      },
      contributeClass: n => set({ classPower: Math.min(100, get().classPower + n) }),
      resetClassPower: () => set({ classPower: 12 }),
      setPin: p => set({ parentPin: p }),
      updateSettings: p => set({ settings: { ...get().settings, ...p } }),
      recordPractice: sig => {
        const s = get();
        set({
          signals: [...s.signals, sig].slice(-200),
          skillXp: { ...s.skillXp, [sig.skill]: (s.skillXp[sig.skill] ?? 0) + Math.round(xpFor(sig) / 2) },
        });
      },
      shiftMoment: () => set({ pendingMoments: get().pendingMoments.slice(1) }),
      markTipSeen: id => { const s = get(); if (!s.seenTips.includes(id)) set({ seenTips: [...s.seenTips, id] }); },
      /** The world is whole: keep the powers and backpack, reopen the missions for a fresh season. */
      startNewSeason: () => {
        const s = get();
        set({ seasons: s.seasons + 1, completed: {}, lastRestored: null, pendingMoments: [] });
      },
      resetAll: () => set({ ...initial, todayDone: { date: today(), stops: [] } }),
    }),
    {
      name: 'numi-save-v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // A save written before a setting existed must still pick up that setting's default,
      // otherwise old players get undefined toggles instead of the new sound/voice controls.
      merge: (saved, current) => {
        const p = (saved ?? {}) as Partial<State>;
        // Saves from before grades existed only know the broad level — map it to a grade.
        const grade: Grade = p.grade ?? (p.level === 3 ? 5 : p.level === 2 ? 3 : current.grade);
        return { ...current, ...p, grade, level: levelOfGrade(grade), settings: { ...current.settings, ...(p.settings ?? {}) } };
      },
    },
  ),
);

// ─── Selectors ────────────────────────────────────────────────────────────────
export function areaStatus(area: (typeof AREAS)[number], s: Pick<State, 'completed' | 'skillXp'>): 'restored' | 'damaged' | 'locked' {
  const done = area.mission && s.completed[area.mission];
  if (done) return 'restored';
  const req = area.requires;
  if (!req) return 'damaged';
  if ('area' in req) {
    const other = AREAS.find(a => a.id === req.area)!;
    return other.mission && s.completed[other.mission] ? 'damaged' : 'locked';
  }
  return levelFromXp(s.skillXp[req.skill] ?? 0) >= req.level ? 'damaged' : 'locked';
}

export function worldRestoredPct(s: Pick<State, 'completed'>): number {
  const total = AREAS.length;
  const done = AREAS.filter(a => a.mission && s.completed[a.mission]).length;
  return Math.round(8 + (done / total) * 92);
}

export const useSettings = () => useGame(s => s.settings);
