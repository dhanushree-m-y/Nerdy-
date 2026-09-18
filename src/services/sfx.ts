// Sound effects: small, soft, and always optional.
// Everything is mixed low, ducks under NUMI's voice, and obeys the Sound setting.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useGame } from '../store/game';

export type Sfx = 'tap' | 'place' | 'correct' | 'nudge' | 'reward' | 'chime' | 'levelup' | 'whoosh';

const SOURCES: Record<Sfx | 'ambience', number> = {
  tap: require('../../assets/sfx/tap.wav'),
  place: require('../../assets/sfx/place.wav'),
  correct: require('../../assets/sfx/correct.wav'),
  nudge: require('../../assets/sfx/nudge.wav'),
  reward: require('../../assets/sfx/reward.wav'),
  chime: require('../../assets/sfx/chime.wav'),
  levelup: require('../../assets/sfx/levelup.wav'),
  whoosh: require('../../assets/sfx/whoosh.wav'),
  ambience: require('../../assets/sfx/ambience.wav'),
};

/** Per-sound level so nothing jumps out. */
const GAIN: Record<Sfx, number> = {
  tap: 0.22, place: 0.34, correct: 0.4, nudge: 0.26, reward: 0.5, chime: 0.45, levelup: 0.5, whoosh: 0.2,
};

const players = new Map<string, AudioPlayer>();
let ambience: AudioPlayer | null = null;
let ducked = false;
let ready = false;

function init() {
  if (ready) return;
  ready = true;
  // Play alongside other audio, and don't grab the "now playing" slot.
  // playsInSilentMode MUST be true: this is a children's app, and kids' phones are silenced
  // as often as not — sound effects should still play (browsers already ignore the ringer,
  // which is why this bug only showed up once tested on a real device).
  setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
}

function get(name: Sfx): AudioPlayer | null {
  init();
  try {
    let p = players.get(name);
    if (!p) {
      p = createAudioPlayer(SOURCES[name]);
      players.set(name, p);
    }
    return p;
  } catch {
    return null; // audio unavailable (e.g. restricted web context) — stay silent
  }
}

const soundOn = () => useGame.getState().settings.sound;

/** Play a one-shot effect. Safe to call from anywhere; never throws. */
export function play(name: Sfx, volume = 1) {
  if (!soundOn()) return;
  const p = get(name);
  if (!p) return;
  try {
    p.volume = GAIN[name] * volume * (ducked ? 0.35 : 1);
    p.seekTo(0);
    p.play();
  } catch { /* ignore */ }
}

/** Quiet looping pad for the world map. */
export function startAmbience() {
  if (!soundOn() || !useGame.getState().settings.ambience) return;
  init();
  try {
    if (!ambience) {
      ambience = createAudioPlayer(SOURCES.ambience);
      ambience.loop = true;
    }
    ambience.volume = ducked ? 0.04 : 0.12;
    ambience.play();
  } catch { /* ignore */ }
}

export function stopAmbience() {
  try { ambience?.pause(); } catch { /* ignore */ }
}

/** Drop everything back while NUMI is talking, so speech stays clear. */
export function duck(on: boolean) {
  ducked = on;
  try { if (ambience) ambience.volume = on ? 0.04 : 0.12; } catch { /* ignore */ }
}

export function releaseAll() {
  players.forEach(p => { try { p.remove(); } catch { /* ignore */ } });
  players.clear();
  try { ambience?.remove(); } catch { /* ignore */ }
  ambience = null;
}
