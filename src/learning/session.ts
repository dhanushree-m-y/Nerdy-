// Live session tracking for one challenge + hand-off to the post-game flow.
import { useCallback, useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { MissionId, SkillId, StrategyId } from '../data/world';
import { HintKind, LearningSignal, Representation, uid } from './engine';

export type ReplayFrame = { label: string; groups: number[]; say: string; tone: 'first' | 'change' | 'final' };

type SessionState = {
  signal: LearningSignal | null;
  stars: number;
  replay: ReplayFrame[] | null;
  explainAsked: Partial<Record<MissionId, number>>;
  set: (p: Partial<Omit<SessionState, 'set'>>) => void;
};

export const useSession = create<SessionState>(set => ({
  signal: null, stars: 3, replay: null, explainAsked: {},
  set: p => set(p),
}));

export function useSignalTracker(mission: MissionId, skill: SkillId, challenge: string, representation: Representation = 'blocks') {
  const sig = useRef<LearningSignal>({
    id: uid(), mission, skill, challenge, startedAt: Date.now(), firstInteractionMs: null, completedMs: 0,
    attempts: [], longestPauseMs: 0, hints: [], askedNumi: 0, representation, strategy: null,
    selfCorrected: false, explained: 'none', voiceUsed: false,
  });
  const lastAction = useRef(Date.now());
  const [wrongStreak, setWrongStreak] = useState(0);
  const [idleMs, setIdleMs] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdleMs(Date.now() - lastAction.current), 1000);
    return () => clearInterval(id);
  }, []);

  const touch = useCallback(() => {
    const now = Date.now();
    const s = sig.current;
    if (s.firstInteractionMs === null) s.firstInteractionMs = now - s.startedAt;
    s.longestPauseMs = Math.max(s.longestPauseMs, now - lastAction.current);
    lastAction.current = now;
    setIdleMs(0);
  }, []);

  const attempt = useCallback((value: string, correct: boolean) => {
    touch();
    const s = sig.current;
    const hadWrong = s.attempts.some(a => !a.correct);
    s.attempts.push({ value, correct, at: Date.now() });
    if (correct && hadWrong && s.hints.filter(h => h === 'demo' || h === 'guided').length === 0) s.selfCorrected = true;
    setWrongStreak(w => (correct ? 0 : w + 1));
  }, [touch]);

  const hint = useCallback((k: HintKind) => { touch(); sig.current.hints.push(k); }, [touch]);
  const asked = useCallback((voice: boolean) => { touch(); sig.current.askedNumi += 1; if (voice) sig.current.voiceUsed = true; }, [touch]);
  const strategy = useCallback((st: StrategyId) => { sig.current.strategy = st; }, []);
  const represent = useCallback((r: Representation) => { sig.current.representation = r; }, []);
  const finish = useCallback((): LearningSignal => {
    const s = sig.current;
    s.completedMs = Date.now() - s.startedAt;
    s.longestPauseMs = Math.max(s.longestPauseMs, Date.now() - lastAction.current);
    return { ...s, attempts: [...s.attempts], hints: [...s.hints] };
  }, []);
  const resetIdle = useCallback(() => { lastAction.current = Date.now(); setIdleMs(0); }, []);

  return { sig, touch, attempt, hint, asked, strategy, represent, finish, wrongStreak, idleMs, resetIdle };
}

/**
 * Detects struggle: two or more misses in a row followed by a pause,
 * or any miss followed by a long pause. Fires at most once per new miss, so a
 * dismissed offer comes back only if the child keeps struggling.
 */
export function useStuckDetector({ wrongStreak, idleMs, paused, onStuck }: { wrongStreak: number; idleMs: number; paused: boolean; onStuck: () => void }) {
  const firedAt = useRef(0);
  useEffect(() => {
    if (wrongStreak === 0) firedAt.current = 0;
  }, [wrongStreak]);
  useEffect(() => {
    if (paused || wrongStreak <= firedAt.current) return;
    if ((wrongStreak >= 2 && idleMs >= 5000) || (wrongStreak >= 1 && idleMs >= 11000)) {
      firedAt.current = wrongStreak;
      onStuck();
    }
  }, [idleMs, wrongStreak, paused]);
}
