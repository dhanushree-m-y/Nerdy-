import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { useGame } from '../store/game';
import { speakLine, stopSpeech } from './narrator';
import { play } from './sfx';

const hapticsOn = () => Platform.OS !== 'web' && useGame.getState().settings.haptics;

/**
 * Touch feedback: a quiet sound plus (on device) a haptic.
 * Everything here is optional — it obeys the Sound and Haptics settings.
 */
export const haptic = {
  tap: () => { play('tap'); if (hapticsOn()) Haptics.selectionAsync().catch(() => {}); },
  snap: () => { play('place'); if (hapticsOn()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); },
  heavy: () => { play('place', 1.15); if (hapticsOn()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}); },
  success: () => { play('reward'); if (hapticsOn()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
  // "Not quite" is a soft nudge, never an error buzz.
  nudge: () => { play('nudge'); if (hapticsOn()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
  correct: () => { play('correct'); if (hapticsOn()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); },
  chime: () => { play('chime'); if (hapticsOn()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
  levelUp: () => { play('levelup'); if (hapticsOn()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
  sheet: () => { play('whoosh'); if (hapticsOn()) Haptics.selectionAsync().catch(() => {}); },
};

/**
 * NUMI says one line, in her own gentle voice.
 * Long lines are split into sentences with small breaths so she never races.
 */
export function say(text: string, opts: { onDone?: () => void; onStart?: () => void } = {}) {
  return speakLine(text, 'numi', opts);
}

export const hush = () => stopSpeech();

export { Speech };
