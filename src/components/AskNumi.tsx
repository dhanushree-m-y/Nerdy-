// ASK NUMI — a small, game-aware voice companion that never covers the math.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation, Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSpring, withTiming,
} from 'react-native-reanimated';
import { HintKind, Intent, parseIntent } from '../learning/engine';
import { haptic, hush, say } from '../services/feedback';
import { speechInputSupported, startListening } from '../services/listen';
import { useGame } from '../store/game';
import { C, F, M, Mood, softShadow, T } from '../theme/tokens';
import { Numi, NumiState } from './characters';
import { PulseRing, useLoop, useMotionOK } from './motion';
import { Tap } from './ui';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'interrupted' | 'unclear' | 'hint' | 'success';

export type Reply = {
  line: string;
  mood?: Mood;
  highlight?: string[];     // ids of objects the game should glow
  expectNumber?: boolean;   // keep listening for a short numeric answer
  chips?: string[];         // suggested replies for the next turn
  hint?: HintKind;
  done?: boolean;           // this exchange solved something
  command?: Intent;         // voice-controlled gameplay → handed to the game
};

const STATE_UI: Record<VoiceState, { label: string; tone: string; mood: Mood; numi: NumiState }> = {
  idle: { label: 'NUMI · READY', tone: C.faint, mood: 'happy', numi: 'idle' },
  listening: { label: "I'M LISTENING…", tone: C.violet, mood: 'happy', numi: 'listening' },
  thinking: { label: 'THINKING…', tone: C.sunDeep, mood: 'think', numi: 'thinking' },
  speaking: { label: 'NUMI IS TALKING', tone: C.teal, mood: 'happy', numi: 'speaking' },
  interrupted: { label: 'GO AHEAD', tone: C.violet, mood: 'happy', numi: 'listening' },
  unclear: { label: "DIDN'T CATCH THAT", tone: C.coral, mood: 'worried', numi: 'idle' },
  hint: { label: 'CLUE READY', tone: C.violet, mood: 'happy', numi: 'speaking' },
  success: { label: 'YOU FOUND IT', tone: C.teal, mood: 'wow', numi: 'celebrate' },
};

export function Waveform({ active, color = C.violet, bars = 22, height = 30 }: { active: boolean; color?: string; bars?: number; height?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height }} accessibilityElementsHidden>
      {Array.from({ length: bars }, (_, i) => <WaveBar key={i} i={i} active={active} color={color} height={height} />)}
    </View>
  );
}

function WaveBar({ i, active, color, height }: { i: number; active: boolean; color: string; height: number }) {
  const ok = useMotionOK();
  const v = useSharedValue(0.25);
  useEffect(() => {
    if (!active || !ok) { cancelAnimation(v); v.value = withTiming(0.2); return; }
    v.value = withDelay(i * 40, withRepeat(withTiming(0.35 + ((i * 7) % 5) / 7, { duration: 280 + (i % 5) * 90, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(v);
  }, [active, ok]);
  const a = useAnimatedStyle(() => ({ transform: [{ scaleY: v.value }] }));
  return <Animated.View style={[{ flex: 1, height, borderRadius: 3, backgroundColor: color, opacity: 0.85 }, a]} />;
}

function ThinkingDots() {
  return (
    <View style={{ flexDirection: 'row', gap: 6, height: 20, alignItems: 'center' }}>
      {[0, 1, 2].map(i => <Dot key={i} i={i} />)}
    </View>
  );
}
function Dot({ i }: { i: number }) {
  const v = useLoop(420, { delay: i * 140 });
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * v.value }], opacity: 0.4 + 0.6 * v.value }));
  return <Animated.View style={[{ width: 9, height: 9, borderRadius: 5, backgroundColor: C.sun }, a]} />;
}

/** Caption that "types" in as Numi speaks. */
function TypedLine({ text, color = C.ink }: { text: string; color?: string }) {
  const [n, setN] = useState(0);
  const ok = useMotionOK();
  useEffect(() => {
    if (!ok) { setN(text.length); return; }
    setN(0);
    const id = setInterval(() => setN(k => { if (k >= text.length) { clearInterval(id); return k; } return k + 2; }), 22);
    return () => clearInterval(id);
  }, [text, ok]);
  return <Text style={{ fontFamily: F.bodyBold, fontSize: 14.5, lineHeight: 21, color }}>{text.slice(0, n)}<Text style={{ color: 'transparent' }}>{text.slice(n)}</Text></Text>;
}

export function AskNumiButton({ onPress, glowing, style, label = 'Ask NUMI' }: { onPress: () => void; glowing?: boolean; style?: StyleProp<ViewStyle>; label?: string }) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      {glowing && <PulseRing color={C.violet} size={46} duration={1600} />}
      <Tap onPress={onPress} a11y="Ask NUMI for help" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.violet, borderRadius: 16, paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 4, borderBottomColor: C.violetDeep }}>
        <Text style={{ fontSize: 14 }}>🎙</Text>
        <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12.5, color: C.cream }}>{label}</Text>
      </Tap>
    </View>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** The game's tutor: receives the parsed intent and returns what Numi says/does. */
  respond: (intent: Intent, heard: string) => Reply;
  onReply?: (r: Reply) => void;
  chips: string[];
  opener?: string;
  style?: StyleProp<ViewStyle>;
};

export function AskNumi({ open, onClose, respond, onReply, chips, opener, style }: Props) {
  const settings = useGame(s => s.settings);
  const [state, setState] = useState<VoiceState>('idle');
  const [line, setLine] = useState(opener ?? 'Tap the mic and tell me what you\'re thinking. I can see your board.');
  const [heard, setHeard] = useState('');
  const [partial, setPartial] = useState('');
  const [nextChips, setNextChips] = useState<string[] | null>(null);
  const [expectNumber, setExpectNumber] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [micFailed, setMicFailed] = useState(false);
  const canListen = settings.micAllowed && speechInputSupported() && !micFailed;

  const y = useSharedValue(40);
  const o = useSharedValue(0);
  useEffect(() => {
    y.value = withSpring(open ? 0 : 40, M.spring);
    o.value = withTiming(open ? 1 : 0, { duration: 220 });
    if (open) { haptic.sheet(); listen(); } else { cleanup(); setState('idle'); }
    return cleanup;
  }, [open]);

  const cleanup = () => {
    stopRef.current(); hush();
    timers.current.forEach(clearTimeout); timers.current = [];
  };

  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  const listen = useCallback(() => {
    cleanup();
    setPartial('');
    setState(s => (s === 'speaking' ? 'interrupted' : 'listening'));
    later(() => setState('listening'), 900);
    if (canListen) {
      stopRef.current = startListening({
        onPartial: setPartial,
        onFinal: t => heardRef.current(t),
        // Mic denied/unavailable → keep going with touch phrases instead of failing.
        onError: e => (e === 'silence' ? setState('unclear') : setMicFailed(true)),
      });
    }
  }, [canListen, expectNumber]);

  const handleHeard = (text: string) => {
    stopRef.current();
    haptic.tap();
    setHeard(text);
    setPartial('');
    setState('thinking');
    const intent = parseIntent(text, expectNumber);
    later(() => {
      let r: Reply;
      if (intent.kind === 'unclear') {
        r = { line: 'I missed that one. Say it again — or just tap a piece and I\'ll follow along.', mood: 'worried' };
        setState('unclear');
        setLine(r.line);
        say(r.line);
        return;
      }
      if (intent.kind === 'off-topic') {
        r = { line: 'Ooh, fun! I\'m your math buddy though — let\'s get back to our puzzle together.' };
      } else {
        r = respond(intent, text);
      }
      setLine(r.line);
      setNextChips(r.chips ?? null);
      setExpectNumber(!!r.expectNumber);
      setState(r.done ? 'success' : r.hint ? 'hint' : 'speaking');
      onReply?.(r);
      if (r.done) haptic.correct();
      say(r.line, {
        onDone: () => {
          if (r.expectNumber) later(() => listenRef.current(), 250);
          else if (!r.done) setState(r.hint ? 'hint' : 'idle');
        },
      });
    }, 750);
  };
  const listenRef = useRef(listen);
  listenRef.current = listen;
  const heardRef = useRef(handleHeard);
  heardRef.current = handleHeard;

  const ui = STATE_UI[state];
  const shown = nextChips ?? chips;
  const listening = state === 'listening' || state === 'interrupted';

  const a = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }, { scale: interpolate(o.value, [0, 1], [0.96, 1]) }] }));
  if (!open) return null;

  return (
    <Animated.View style={[{ backgroundColor: C.cream, borderRadius: 26, padding: 14, zIndex: 100 }, softShadow(0.22, 12), style, a]} accessibilityLiveRegion="polite">
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <Numi size={54} mood={ui.mood} state={ui.numi} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[T.eyebrow, { color: ui.tone }]}>{ui.label}</Text>
          {state === 'thinking' ? (
            <View style={{ gap: 6 }}>
              {heard ? <Text style={{ fontFamily: F.body, fontSize: 12.5, color: C.muted }}>You said: “{heard}”</Text> : null}
              <ThinkingDots />
            </View>
          ) : listening ? (
            <Text style={{ fontFamily: F.bodyBold, fontSize: 14.5, lineHeight: 21, color: C.ink }}>
              {partial ? `“${partial}”` : canListen ? 'Go ahead — tell me what you\'re thinking.' : 'Say it out loud, then tap what you said ↓'}
            </Text>
          ) : settings.captions ? (
            <TypedLine text={line} />
          ) : (
            <Text style={T.bodySm}>🔊 Numi is talking…</Text>
          )}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close Ask Numi" hitSlop={10} onPress={() => { cleanup(); onClose(); }} style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: C.sandLine, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.bodyHeavy, fontSize: 14, color: C.ink }}>✕</Text>
        </Pressable>
      </View>

      {listening && <View style={{ marginTop: 10 }}><Waveform active color={C.violet} /></View>}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 11 }}>
        {shown.map(c => (
          <Tap key={c} onPress={() => handleHeard(c)} a11y={`Say: ${c}`} style={{ backgroundColor: listening ? '#efeafa' : C.sandLine, borderRadius: 15, paddingVertical: 10, paddingHorizontal: 12, borderWidth: listening ? 1.5 : 0, borderColor: '#d6cef2' }}>
            <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12.5, color: C.ink }}>{listening ? '🗣 ' : ''}{c}</Text>
          </Tap>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <MicButton state={state} onPress={() => (listening ? (canListen ? stopRef.current() : null) : listen())} />
        <Text style={[T.bodySm, { flex: 1, fontSize: 11.5 }]}>
          {!settings.micAllowed ? 'Microphone is off in grown-up settings — tap a phrase instead.' : listening ? (canListen ? 'Listening… tap to stop' : 'Voice or touch — both work.') : state === 'speaking' ? 'Tap the mic to interrupt me anytime.' : 'Tap the mic to talk again.'}
        </Text>
      </View>
    </Animated.View>
  );
}

function MicButton({ state, onPress }: { state: VoiceState; onPress: () => void }) {
  const listening = state === 'listening' || state === 'interrupted';
  const bg = listening ? C.violet : C.teal;
  const sh = listening ? C.violetDeep : C.tealDeep;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {listening && <PulseRing color={C.violet} size={56} duration={1500} />}
      <Tap onPress={onPress} a11y={listening ? 'Stop listening' : 'Talk to Numi'} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: bg, borderBottomWidth: 5, borderBottomColor: sh, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 22 }}>{listening ? '◼︎' : '🎙'}</Text>
      </Tap>
    </View>
  );
}
