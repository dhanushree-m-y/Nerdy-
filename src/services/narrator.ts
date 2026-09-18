// Storyteller + voice. Reads scripted scenes line by line, each speaker with their own
// voice, and reports the word being spoken so captions can light up.
//
// Tone: a soft, bright child's voice — never shrill, never an adult announcer.
// Real child voices (e.g. Microsoft Ana) are used when the device has them; otherwise
// a soft female voice is lifted into a child's register. Everything obeys the Voice setting.
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CharacterId } from '../data/world';
import { useGame } from '../store/game';
import { duck } from './sfx';

export type Speaker = 'narrator' | 'numi' | CharacterId;
export type StoryLine = { text: string; speaker?: Speaker; pause?: number };

/** Voices that are recorded from children — these need no pitch lift. */
const CHILD_VOICE = /\b(ana|ivy|justin|kevin|junior|child|kid)\b/i;
/** Soft, warm voices that sound young once lifted. Harsh or announcer-style voices are last resort. */
const SOFT = /(jenny|aria|ava|ana|emma|michelle|libby|sonia|samantha|google us english|allison|zira|female)/i;

// pitch = lift applied to an adult voice; kidPitch = the gentler lift for a real child voice.
type Profile = { pitch: number; kidPitch: number; rate: number; prefer: RegExp };
const PROFILES: Record<Speaker, Profile> = {
  narrator: { pitch: 1.28, kidPitch: 1.04, rate: 0.86, prefer: SOFT },
  numi: { pitch: 1.36, kidPitch: 1.1, rate: 0.88, prefer: SOFT },
  nia: { pitch: 1.34, kidPitch: 1.12, rate: 0.9, prefer: /(ana|ivy|jenny|aria|ava|female)/i },
  milo: { pitch: 1.2, kidPitch: 1.0, rate: 0.88, prefer: /(justin|kevin|guy|ryan)/i },
  pip: { pitch: 1.26, kidPitch: 1.04, rate: 0.92, prefer: /(justin|kevin|andrew)/i },
  zuri: { pitch: 1.32, kidPitch: 1.08, rate: 0.9, prefer: /(ivy|ana|emma|michelle|female)/i },
  nova: { pitch: 1.24, kidPitch: 1.0, rate: 0.88, prefer: /(ana|ava|aria|sonia|female)/i },
};
let childPicked: Partial<Record<Speaker, boolean>> = {};

let voiceCache: Partial<Record<Speaker, string | undefined>> | null = null;
let loading: Promise<void> | null = null;

async function loadVoices() {
  if (voiceCache) return;
  if (!loading) {
    loading = (async () => {
      let voices: Speech.Voice[] = [];
      try { voices = await Speech.getAvailableVoicesAsync(); } catch { /* none */ }
      const en = voices.filter(v => /^en/i.test(v.language));
      // Browsers often report no voices until they finish loading — try again next time.
      if (!en.length) { loading = null; return; }
      // Prefer the nicest engines available.
      // A real child voice beats everything; then natural engines; then anything soft.
      const quality = (v: Speech.Voice) =>
        (CHILD_VOICE.test(v.name) ? 4 : 0)
        + (/(natural|enhanced|premium|neural)/i.test(v.name) ? 2 : /google|siri/i.test(v.name) ? 1 : 0)
        + (SOFT.test(v.name) ? 1 : 0);
      const ranked = [...en].sort((a, b) => quality(b) - quality(a));
      const used = new Set<string>();
      const cache: Partial<Record<Speaker, string | undefined>> = {};
      (Object.keys(PROFILES) as Speaker[]).forEach(sp => {
        const p = PROFILES[sp];
        const pick = ranked.find(v => CHILD_VOICE.test(v.name) && p.prefer.test(v.name) && !used.has(v.identifier))
          ?? ranked.find(v => p.prefer.test(v.name) && !used.has(v.identifier))
          ?? ranked.find(v => !used.has(v.identifier))
          ?? ranked[0];
        cache[sp] = pick?.identifier;
        childPicked[sp] = !!pick && CHILD_VOICE.test(pick.name);
        // Only spread speakers across voices when the device has good ones. With just the old
        // system voices, every character shares the softest one at their own pitch — a gruff
        // adult voice lifted an octave still sounds harsh to a child.
        if (pick && quality(pick) >= 3) used.add(pick.identifier);
      });
      voiceCache = cache;
    })();
  }
  await loading;
}
loadVoices();

/** Voice settings for a speaker. */
export function voiceFor(sp: Speaker) {
  const p = PROFILES[sp];
  const playful = useGame.getState().settings.voiceStyle === 'playful';
  return {
    voice: voiceCache?.[sp],
    pitch: Math.min(1.5, (childPicked[sp] ? p.kidPitch : p.pitch) + (playful ? 0.08 : 0)),
    rate: p.rate + (playful ? 0.05 : 0),
  };
}

/** Split into sentences so we can breathe between them; long clauses break at commas. */
export function sentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?…])\s+/).flatMap(s => (s.length > 95 ? s.split(/(?<=,)\s+/) : [s]));
  return parts.map(s => s.trim()).filter(Boolean);
}

const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;
const clean = (t: string) => t.replace(emoji, '').replace(/\s+/g, ' ').trim();

let stopCurrent: (() => void) | null = null;

export function stopSpeech() {
  stopCurrent?.();
  stopCurrent = null;
  Speech.stop();
  duck(false);
}

/**
 * Speak one line (possibly several sentences) in a speaker's voice.
 * Returns a stop function. Falls back to a timed no-audio pass when voice is off,
 * so captions and UI timing still work.
 */
export function speakLine(text: string, speaker: Speaker = 'numi', cb: {
  onStart?: () => void; onWord?: (charIndex: number) => void; onDone?: () => void;
} = {}) {
  stopSpeech();
  const { voice, sound, speechRate } = useGame.getState().settings;
  const body = clean(text);
  const parts = sentences(body);
  let cancelled = false;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const stop = () => { cancelled = true; timers.forEach(clearTimeout); Speech.stop(); duck(false); };
  stopCurrent = stop;

  if (!body) { cb.onDone?.(); return stop; }
  cb.onStart?.();

  if (!voice || !sound) {
    // Silent mode: step through at reading pace so captions still animate.
    const estimate = Math.min(6000, 700 + body.length * 46 / Math.max(0.6, speechRate));
    const words = body.split(/\s+/);
    let c = 0;
    words.forEach((w, k) => { const at = c; timers.push(setTimeout(() => !cancelled && cb.onWord?.(at), (estimate / words.length) * k)); c += w.length + 1; });
    timers.push(setTimeout(() => { if (!cancelled) cb.onDone?.(); }, estimate));
    return stop;
  }

  duck(true);
  const p = voiceFor(speaker);
  let offset = 0; // char offset of the current sentence within the line

  const speakPart = async (i: number) => {
    if (cancelled) return;
    if (i >= parts.length) { duck(false); cb.onDone?.(); return; }
    await loadVoices();
    if (cancelled) return;
    const part = parts[i];
    const base = offset;
    let done = false;
    const next = () => {
      if (done || cancelled) return;
      done = true;
      offset += part.length + 1;
      // a small breath between sentences
      timers.push(setTimeout(() => speakPart(i + 1), 260));
    };
    // Safety net: some engines never fire onDone.
    timers.push(setTimeout(next, 1800 + part.length * 90));
    Speech.speak(part, {
      language: 'en-US',
      voice: p.voice,
      pitch: p.pitch,
      rate: p.rate * speechRate,
      volume: 0.95,
      onBoundary: (e: { charIndex: number }) => cb.onWord?.(base + e.charIndex),
      onDone: next,
      onError: next,
    });
  };
  speakPart(0);
  return stop;
}

export type NarrationState = { playing: boolean; line: number; word: number };

/** Plays a script, one line at a time. */
export function narrate(lines: StoryLine[], cb: { onLine?: (i: number) => void; onWord?: (i: number, charIndex: number) => void; onDone?: () => void }) {
  let cancelled = false;
  let stopLine: (() => void) | null = null;
  const timers: ReturnType<typeof setTimeout>[] = [];

  const playLine = (i: number) => {
    if (cancelled) return;
    if (i >= lines.length) { cb.onDone?.(); return; }
    const ln = lines[i];
    cb.onLine?.(i);
    stopLine = speakLine(ln.text, ln.speaker ?? 'narrator', {
      onWord: ch => cb.onWord?.(i, ch),
      onDone: () => { if (!cancelled) timers.push(setTimeout(() => playLine(i + 1), ln.pause ?? 420)); },
    });
  };

  playLine(0);
  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
    stopLine?.();
    stopSpeech();
  };
}

/** React hook for a scripted scene. */
export function useNarration(lines: StoryLine[], { autoplay = true, delay = 500, onDone }: { autoplay?: boolean; delay?: number; onDone?: () => void } = {}) {
  const [state, setState] = useState<NarrationState>({ playing: false, line: -1, word: -1 });
  const stopRef = useRef<() => void>(() => {});
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const play = useCallback(() => {
    stopRef.current();
    setState({ playing: true, line: 0, word: -1 });
    stopRef.current = narrate(lines, {
      onLine: i => setState({ playing: true, line: i, word: -1 }),
      onWord: (i, ch) => setState(s => (s.line === i ? { ...s, word: ch } : s)),
      onDone: () => { setState({ playing: false, line: lines.length, word: -1 }); doneRef.current?.(); },
    });
  }, [lines]);

  const stop = useCallback(() => { stopRef.current(); setState(s => ({ ...s, playing: false })); }, []);

  useEffect(() => {
    // "Read things out automatically" can be switched off for kids who prefer quiet.
    if (!autoplay || !useGame.getState().settings.autoSpeak) return;
    const t = setTimeout(play, delay);
    return () => { clearTimeout(t); stopRef.current(); };
  }, []);
  useEffect(() => () => stopRef.current(), []);

  /** Fast-forward: show everything, stop talking. */
  const skip = useCallback(() => { stopRef.current(); setState({ playing: false, line: lines.length, word: -1 }); doneRef.current?.(); }, [lines]);

  return { ...state, play, stop, skip };
}
