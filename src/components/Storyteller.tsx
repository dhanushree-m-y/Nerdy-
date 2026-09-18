// Storytelling UI: karaoke captions, speaker badges and the "Read to me" button.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { CHARACTERS } from '../data/world';
import { Speaker, speakLine } from '../services/narrator';
import { useGame } from '../store/game';
import { C, F, T } from '../theme/tokens';
import { PulseRing, useLoop } from './motion';
import { Tap } from './ui';

/**
 * Text whose words light up as they're read.
 * `state`: 'past' (already read), 'active' (being read, `charIndex` = current word), 'future'.
 */
export function KaraokeText({ text, state, charIndex = -1, style, color = C.ink, activeColor = C.coral, dimColor }: {
  text: string; state: 'past' | 'active' | 'future'; charIndex?: number;
  style?: StyleProp<TextStyle>; color?: string; activeColor?: string; dimColor?: string;
}) {
  const dim = dimColor ?? color;
  if (state !== 'active') {
    return <Text style={[style, { color: state === 'past' ? color : dim, opacity: state === 'past' ? 1 : 0.35 }]}>{text}</Text>;
  }
  const parts: { w: string; start: number }[] = [];
  const re = /\S+\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) parts.push({ w: m[0], start: m.index });
  return (
    <Text style={[style, { color }]}>
      {parts.map((p, i) => {
        const end = p.start + p.w.length;
        const current = charIndex >= p.start && charIndex < end;
        const read = charIndex >= end;
        return (
          <Text
            key={i}
            style={current
              ? { color: activeColor }
              : { color: read || charIndex < 0 ? color : dim, opacity: read || charIndex < 0 ? 1 : 0.55 }}
          >
            {p.w}
          </Text>
        );
      })}
    </Text>
  );
}

const SPEAKER_META: Record<Speaker, { label: string; bg: string; fg: string }> = {
  narrator: { label: '📖 Storyteller', bg: C.sun, fg: C.ink },
  numi: { label: '🤖 Numi', bg: C.teal, fg: C.cream },
  nia: { label: `${CHARACTERS.nia.name}`, bg: CHARACTERS.nia.body, fg: C.cream },
  milo: { label: `${CHARACTERS.milo.name}`, bg: CHARACTERS.milo.body, fg: C.ink },
  pip: { label: `${CHARACTERS.pip.name}`, bg: CHARACTERS.pip.body, fg: C.cream },
  zuri: { label: `${CHARACTERS.zuri.name}`, bg: CHARACTERS.zuri.body, fg: C.cream },
  nova: { label: `${CHARACTERS.nova.name}`, bg: CHARACTERS.nova.body, fg: C.cream },
};

export function SpeakerTag({ speaker, style }: { speaker: Speaker; style?: StyleProp<ViewStyle> }) {
  const m = SPEAKER_META[speaker];
  return (
    <View style={[{ alignSelf: 'flex-start', backgroundColor: m.bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }, style]}>
      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 10.5, letterSpacing: 0.6, color: m.fg }}>{m.label.toUpperCase()}</Text>
    </View>
  );
}

function SoundBars({ active, color }: { active: boolean; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 16 }}>
      {[0, 1, 2].map(i => <Bar key={i} i={i} active={active} color={color} />)}
    </View>
  );
}
function Bar({ i, active, color }: { i: number; active: boolean; color: string }) {
  const v = useLoop(260 + i * 90, { enabled: active, delay: i * 80 });
  const a = useAnimatedStyle(() => ({ transform: [{ scaleY: active ? 0.35 + v.value * 0.65 : 0.45 }] }));
  return <Animated.View style={[{ width: 3, height: 16, borderRadius: 2, backgroundColor: color }, a]} />;
}

/** Big friendly play/pause for narration. */
export function ReadAloudButton({ playing, onPlay, onStop, dark, label = 'Read to me', style }: {
  playing: boolean; onPlay: () => void; onStop: () => void; dark?: boolean; label?: string; style?: StyleProp<ViewStyle>;
}) {
  const bg = playing ? C.violet : dark ? 'rgba(253,245,232,.14)' : C.sandLine;
  const fg = playing || dark ? C.cream : C.ink;
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      {playing && <PulseRing color={C.violet} size={40} duration={1400} />}
      <Tap onPress={playing ? onStop : onPlay} a11y={playing ? 'Pause the story' : label} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: bg, borderRadius: 16, paddingVertical: 9, paddingHorizontal: 12 }}>
        {playing ? <SoundBars active color={fg} /> : <Text style={{ fontSize: 14 }}>🔊</Text>}
        <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12.5, color: fg }}>{playing ? 'Pause' : label}</Text>
      </Tap>
    </View>
  );
}

// ─── Tap to hear ──────────────────────────────────────────────────────────────
/**
 * Any text a child might not be able to read yet: tap it and NUMI reads it.
 * `autoRead` speaks it once on mount (used for goals on the youngest trail),
 * and it stays quiet whenever the grown-up switched the voice off.
 */
export function SpeakableText({
  children, text, speaker = 'numi', style, variant, autoRead = false, showIcon = true, iconColor,
}: {
  children?: React.ReactNode;
  text: string;
  speaker?: Speaker;
  style?: StyleProp<TextStyle>;
  variant?: keyof typeof T;
  autoRead?: boolean;
  showIcon?: boolean;
  iconColor?: string;
}) {
  const [talking, setTalking] = useState(false);
  const stop = useRef<() => void>(() => {});
  const voiceOn = useGame(s => s.settings.voice && s.settings.sound);
  const autoSpeak = useGame(s => s.settings.autoSpeak);
  // Early readers (grades 1–2) hear screens read to them automatically.
  const earlyReader = useGame(s => s.grade <= 2);

  const read = useCallback(() => {
    stop.current();
    setTalking(true);
    stop.current = speakLine(text, speaker, { onDone: () => setTalking(false) });
  }, [text, speaker]);

  useEffect(() => {
    // Youngest explorers get the goal read to them without asking.
    if (autoRead && autoSpeak && voiceOn && earlyReader) {
      const t = setTimeout(read, 600);
      return () => { clearTimeout(t); stop.current(); };
    }
    return () => stop.current();
  }, [text]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Read aloud: ${text}`}
      onPress={read}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, flexShrink: 1 })}
    >
      <Text style={[variant ? T[variant] : undefined, style]}>
        {children ?? text}
        {showIcon && voiceOn ? <Text style={{ color: iconColor ?? C.violet, fontSize: 13 }}>{talking ? '  🔊' : '  🔈'}</Text> : null}
      </Text>
    </Pressable>
  );
}

/** A standalone "hear this" button for headings and cards. */
export function SpeakButton({ text, speaker = 'numi', dark, style }: { text: string; speaker?: Speaker; dark?: boolean; style?: StyleProp<ViewStyle> }) {
  const [talking, setTalking] = useState(false);
  const stop = useRef<() => void>(() => {});
  useEffect(() => () => stop.current(), []);
  const onPress = () => {
    if (talking) { stop.current(); setTalking(false); return; }
    setTalking(true);
    stop.current = speakLine(text, speaker, { onDone: () => setTalking(false) });
  };
  return (
    <Tap
      onPress={onPress}
      a11y={talking ? 'Stop reading' : 'Read this aloud'}
      style={[{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: talking ? C.violet : dark ? 'rgba(253,245,232,.16)' : C.sandLine }, style]}
    >
      <Text style={{ fontSize: 16 }}>{talking ? '⏸' : '🔊'}</Text>
    </Tap>
  );
}
