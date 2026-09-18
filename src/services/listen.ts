// Speech input. Uses the platform recognizer where one is reachable from JS (Web Speech API).
// On native builds without a recognizer module, NUMI falls back to "say-it chips":
// the child taps the phrase they'd say, which keeps every voice feature usable by touch.
import { Platform } from 'react-native';

/** 'unavailable' = mic blocked/denied/missing (switch to touch); 'silence' = nothing heard (just retry). */
export type ListenError = 'unavailable' | 'silence';

type Handlers = { onPartial?: (t: string) => void; onFinal: (t: string) => void; onEnd?: () => void; onError?: (e: ListenError) => void };

type WebRec = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error?: string }) => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};

function webCtor(): (new () => WebRec) | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as (new () => WebRec) | null;
}

export const speechInputSupported = () => !!webCtor();

export function startListening(h: Handlers): () => void {
  const Ctor = webCtor();
  if (!Ctor) return () => {};
  let finalSent = false;
  const rec = new Ctor();
  rec.lang = 'en-US';
  rec.interimResults = true;
  rec.continuous = false;
  rec.onresult = e => {
    let text = '';
    let isFinal = false;
    for (let i = 0; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
      if (e.results[i].isFinal) isFinal = true;
    }
    if (isFinal && !finalSent) { finalSent = true; h.onFinal(text); } else h.onPartial?.(text);
  };
  rec.onend = () => h.onEnd?.();
  rec.onerror = e => {
    if (e?.error === 'aborted') return;
    h.onError?.(e?.error === 'no-speech' ? 'silence' : 'unavailable');
  };
  try { rec.start(); } catch { h.onError?.('unavailable'); }
  return () => { try { rec.abort(); } catch { /* already stopped */ } };
}
