// The post-challenge learning loop: EXPLAIN → FEEL → REPLAY → REWARD → WORLD CHANGE → MASTERY.
import type { NavigationProp } from '@react-navigation/native';
import { MissionId, StrategyId } from '../data/world';
import { LearningSignal } from '../learning/engine';
import { ReplayFrame, useSession } from '../learning/session';
import { useGame } from '../store/game';
import { RootParams } from './types';

type Nav = NavigationProp<RootParams>;
type Step = 'game' | 'explain' | 'confidence' | 'replay' | 'reward';

export function finishChallenge(nav: Nav, mission: MissionId, signal: LearningSignal, opts: { stars?: number; replay?: ReplayFrame[]; suggested?: StrategyId } = {}) {
  const wrong = signal.attempts.filter(a => !a.correct).length;
  const stars = opts.stars ?? (wrong === 0 && signal.hints.length === 0 ? 3 : wrong <= 2 ? 2 : 1);
  useSession.getState().set({ signal, stars, replay: opts.replay ?? null });
  nav.dispatch({ type: 'REPLACE', payload: { name: 'Explain', params: { mission, suggested: opts.suggested } } } as never);
  // Explain is special — it decides whether to actually ask (see shouldAskExplain).
}

/** "Explain your thinking" is occasional so it stays special: always on the first bridge, then ~every third mission. */
export function shouldAskExplain(mission: MissionId): boolean {
  const s = useSession.getState();
  const done = useGame.getState().completed[mission];
  const count = Object.values(s.explainAsked).reduce((a, b) => a + (b ?? 0), 0);
  if (mission === 'bridge' && !done) return true;
  if (mission === 'boss') return false;
  return count % 3 === 0;
}

export function markExplainAsked(mission: MissionId) {
  const s = useSession.getState();
  s.set({ explainAsked: { ...s.explainAsked, [mission]: (s.explainAsked[mission] ?? 0) + 1 } });
}

export function goNext(nav: Nav, from: Step, mission: MissionId) {
  const s = useSession.getState();
  const game = useGame.getState();
  const replace = (name: keyof RootParams, params: object) => nav.dispatch({ type: 'REPLACE', payload: { name, params } } as never);
  if (from === 'game' || from === 'explain') {
    const askFeel = mission === 'bridge' || game.confidence.length % 2 === 0;
    if (askFeel) return replace('Confidence', { mission });
    from = 'confidence';
  }
  if (from === 'confidence') {
    if (s.replay && s.signal?.selfCorrected) return replace('Replay', { mission });
    from = 'replay';
  }
  if (from === 'replay') return replace('Reward', { mission });
}
