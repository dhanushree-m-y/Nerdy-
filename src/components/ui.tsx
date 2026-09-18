// NUMI UI kit: chunky buttons, cards, bubbles, bars, toggles, headers.
import { useNavigation } from '@react-navigation/native';
import React, { createContext, PropsWithChildren, ReactNode, useContext, useState } from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, Text, TextProps, TextStyle, useWindowDimensions, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '../services/feedback';
import { useGame } from '../store/game';
import { C, F, M, R, softShadow, T } from '../theme/tokens';
import { Enter, useFill } from './motion';

export function Txt({ style, variant = 'body', ...p }: TextProps & { variant?: keyof typeof T; style?: StyleProp<TextStyle> }) {
  return <Text {...p} style={[T[variant], style]} />;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
// Every screen can scroll: on a tall phone the content simply fits, on a short one (iPhone SE,
// small Androids) the bottom button stays reachable instead of falling off the screen.
export function Screen({
  children, bg = C.cream, scroll = true, pad = true, style, dark = false, bottomInset = true,
}: PropsWithChildren<{ bg?: string; scroll?: boolean; pad?: boolean; style?: StyleProp<ViewStyle>; dark?: boolean; bottomInset?: boolean }>) {
  const ins = useSafeAreaInsets();
  const padding: ViewStyle = pad ? { paddingHorizontal: 20, paddingTop: ins.top + 10, paddingBottom: (bottomInset ? ins.bottom : 0) + 18 } : {};
  const body = scroll ? (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[padding, { flexGrow: 1 }, style]} showsVerticalScrollIndicator={false}>
      <Enter style={{ flexGrow: 1 }}>{children}</Enter>
    </ScrollView>
  ) : (
    <Enter style={[{ flex: 1 }, padding, style]}>{children}</Enter>
  );
  return <View style={{ flex: 1, backgroundColor: bg }} accessibilityLanguage="en">{body}</View>;
}

// ─── Fitting game scenes on short phones ──────────────────────────────────────
/**
 * How much a game's main scene should shrink on this phone. 1 on anything as tall as an
 * iPhone 14; down to ~0.64 on an iPhone SE (1st gen), so the scene, the coach and the
 * pile of pieces all fit on one screen without scrolling.
 */
export function useFitScale(designFor = 800) {
  const { height } = useWindowDimensions();
  if (height >= designFor) return 1;
  return Math.max(0.62, Math.min(1, (height - 175) / (designFor - 175)));
}

/**
 * Draws children at their design size, then scales them down by k and only takes up
 * the scaled space. Hit-testing and drop zones follow the transform, so dragging still
 * lands where the child sees it.
 */
export function ScaleBox({ k, width, height, children, style }: PropsWithChildren<{ k: number; width: number; height: number; style?: StyleProp<ViewStyle> }>) {
  if (k >= 0.999) return <View style={[{ width, height }, style]}>{children}</View>;
  return (
    <View style={[{ width: width * k, height: height * k, alignSelf: 'center' }, style]}>
      <View style={{ width, height, transform: [{ translateX: (-width * (1 - k)) / 2 }, { translateY: (-height * (1 - k)) / 2 }, { scale: k }] }}>
        {children}
      </View>
    </View>
  );
}

/**
 * Like ScaleBox, for a block whose height depends on the round (a stall with two rows of
 * goods, five garden rows…): it measures the natural height, then scales the block by
 * `k` around its centre and takes only the scaled space.
 */
export function AutoScale({ k, children, style }: PropsWithChildren<{ k: number; style?: StyleProp<ViewStyle> }>) {
  const [h, setH] = useState(0);
  if (k >= 0.999) return <View style={style}>{children}</View>;
  return (
    <View style={[{ height: h ? h * k : undefined }, style]}>
      <View onLayout={e => setH(e.nativeEvent.layout.height)} style={{ transform: [{ translateY: (-h * (1 - k)) / 2 }, { scale: k }] }}>
        {children}
      </View>
    </View>
  );
}

/**
 * The scrolling body of a game screen. On a tall phone it never scrolls and the layout is
 * exactly as designed; on a short one the pile of pieces stays reachable. It's the
 * gesture-handler ScrollView, so dragging a piece drags the piece — not the page.
 */
export function GameBody({ children }: PropsWithChildren) {
  return (
    <GestureScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never" keyboardShouldPersistTaps="handled">
      {children}
    </GestureScrollView>
  );
}

// ─── Chunky button ────────────────────────────────────────────────────────────
type BtnProps = {
  label?: string;
  children?: ReactNode;
  onPress?: () => void;
  color?: string;
  shadow?: string;
  textColor?: string;
  size?: 'lg' | 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  icon?: string;
  radius?: number;
  a11y?: string;
  depth?: number;
};

export function ChunkyButton({
  label, children, onPress, color = C.coral, shadow = C.coralDeep, textColor = C.cream, size = 'lg',
  style, innerStyle, disabled, icon, radius, a11y, depth,
}: BtnProps) {
  const big = useGame(s => s.settings.bigTargets);
  const d = depth ?? (size === 'lg' ? 7 : size === 'md' ? 6 : 4);
  const press = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: press.value * (d - 2) }, { scale: 1 - press.value * 0.01 }] }));
  const pad = size === 'lg' ? (big ? 22 : 18) : size === 'md' ? (big ? 18 : 15) : (big ? 13 : 10);
  const fs = size === 'lg' ? (big ? 21 : 19) : size === 'md' ? 16 : 13;
  const r = radius ?? (size === 'sm' ? 14 : 24);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => { press.value = withTiming(1, { duration: 70 }); }}
      onPressOut={() => { press.value = withSpring(0, M.spring); }}
      onPress={() => { haptic.tap(); onPress?.(); }}
      style={[{ paddingBottom: d, opacity: disabled ? 0.55 : 1 }, style]}
    >
      <View style={[StyleSheet.absoluteFill, { top: d, backgroundColor: shadow, borderRadius: r }]} />
      <Animated.View
        style={[{
          backgroundColor: color, borderRadius: r, paddingVertical: pad, paddingHorizontal: size === 'sm' ? 13 : 20,
          alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
          minHeight: size === 'sm' ? 40 : big ? 64 : 52,
        }, innerStyle, a]}
      >
        {icon ? <Text style={{ fontSize: fs + 2 }}>{icon}</Text> : null}
        {label ? <Text style={{ fontFamily: size === 'sm' ? F.bodyHeavy : F.display, fontSize: fs, color: textColor, lineHeight: fs * 1.2 }}>{label}</Text> : null}
        {children}
      </Animated.View>
    </Pressable>
  );
}

/** A press-scale wrapper for any tappable card or tile. */
// A Tap inside another Tap (a read-aloud button on a tappable card) must not render a nested
// <button> on web — invalid HTML there swallows the inner press. Inner taps drop the button role.
const InsideTap = createContext(false);

export function Tap({ children, onPress, style, outerStyle, a11y, disabled, onLongPress }: PropsWithChildren<{ onPress?: () => void; onLongPress?: () => void; style?: StyleProp<ViewStyle>; outerStyle?: StyleProp<ViewStyle>; a11y?: string; disabled?: boolean }>) {
  const nested = useContext(InsideTap);
  // The press target is the outer Pressable, so absolute placement has to live there —
  // on the inner animated view it would be ignored and the control would sit in normal flow.
  const flat = StyleSheet.flatten(style) as ViewStyle | undefined;
  const lifted = flat?.position === 'absolute'
    ? { position: 'absolute' as const, top: flat.top, right: flat.right, bottom: flat.bottom, left: flat.left, zIndex: flat.zIndex ?? 2 }
    : null;
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <InsideTap.Provider value={true}>
    <Pressable
      accessibilityRole={nested ? undefined : 'button'}
      accessibilityLabel={a11y}
      disabled={disabled}
      style={lifted ? [lifted, outerStyle] : outerStyle}
      onPressIn={() => { s.value = withTiming(0.96, { duration: 80 }); }}
      onPressOut={() => { s.value = withSpring(1, M.bouncy); }}
      onPress={() => { haptic.tap(); onPress?.(); }}
      onLongPress={onLongPress}
    >
      <Animated.View style={[style, a]}>{children}</Animated.View>
    </Pressable>
    </InsideTap.Provider>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────
export function TopBar({ title, dark, back = '← Map', onBack, right }: { title?: string; dark?: boolean; back?: string | null; onBack?: () => void; right?: ReactNode }) {
  const nav = useNavigation();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40, gap: 10 }}>
      {back ? (
        <Tap
          a11y="Go back"
          onPress={() => (onBack ? onBack() : nav.canGoBack() ? nav.goBack() : undefined)}
          style={{ backgroundColor: dark ? 'rgba(253,245,232,.14)' : C.sandLine, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 13 }}
        >
          <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: dark ? C.cream : C.ink }}>{back}</Text>
        </Tap>
      ) : <View />}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
        {title ? <Text numberOfLines={1} style={[T.eyebrow, { color: dark ? C.sun : C.faint, flexShrink: 1, textAlign: 'right' }]}>{title}</Text> : null}
        {right}
      </View>
    </View>
  );
}

// ─── Pills, cards ─────────────────────────────────────────────────────────────
export function Pill({ children, bg = C.sun, fg = C.ink, style }: PropsWithChildren<{ bg?: string; fg?: string; style?: StyleProp<ViewStyle> }>) {
  return (
    <View style={[{ backgroundColor: bg, borderRadius: 16, paddingVertical: 7, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5 }, style]}>
      {typeof children === 'string' || typeof children === 'number'
        ? <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12, color: fg }}>{children}</Text>
        : children}
    </View>
  );
}

export function Card({ children, style, bg = C.cream, lift = true }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; bg?: string; lift?: boolean }>) {
  return (
    <View style={[{ backgroundColor: bg, borderRadius: R.xl, padding: 16 }, lift && softShadow(0.1, 5), style]}>{children}</View>
  );
}

export function OutlineCard({ children, style, bg = C.cream, line = C.sandLine }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; bg?: string; line?: string }>) {
  return <View style={[{ backgroundColor: bg, borderRadius: R.lg, padding: 14, borderWidth: 2, borderColor: line }, style]}>{children}</View>;
}

export function SpeechBubble({ children, style, tail = 'left', bg = C.cream, dark }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; tail?: 'left' | 'top' | 'none'; bg?: string; dark?: boolean }>) {
  return (
    <View style={[{ backgroundColor: bg, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 15 }, softShadow(0.1, 4), style]}>
      {tail === 'left' && <View style={{ position: 'absolute', left: -7, bottom: 16, width: 16, height: 16, backgroundColor: bg, transform: [{ rotate: '45deg' }], borderRadius: 3 }} />}
      {tail === 'top' && <View style={{ position: 'absolute', top: -7, alignSelf: 'center', left: '50%', marginLeft: -8, width: 16, height: 16, backgroundColor: bg, transform: [{ rotate: '45deg' }], borderRadius: 3 }} />}
      {typeof children === 'string'
        ? <Text style={{ fontFamily: F.bodyBold, fontSize: 14, lineHeight: 20, color: dark ? C.cream : C.ink }}>{children}</Text>
        : children}
    </View>
  );
}

export function ProgressBar({ value, height = 12, track = C.sand, colors = [C.teal, C.sun], delay = 0, style }: { value: number; height?: number; track?: string; colors?: [string, string] | [string]; delay?: number; style?: StyleProp<ViewStyle> }) {
  const fill = useFill(value, delay);
  return (
    <View style={[{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }, style]} accessibilityRole="progressbar" accessibilityValue={{ now: Math.round(value * 100), min: 0, max: 100 }}>
      <Animated.View style={[{ height: '100%', borderRadius: height, overflow: 'hidden', backgroundColor: colors[0] }, fill]}>
        {colors[1] ? <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '45%', backgroundColor: colors[1], opacity: 0.85, borderRadius: height }} /> : null}
      </Animated.View>
    </View>
  );
}

export function Toggle({ on, onChange, a11y, dark }: { on: boolean; onChange: (v: boolean) => void; a11y: string; dark?: boolean }) {
  const x = useSharedValue(on ? 1 : 0);
  React.useEffect(() => { x.value = withSpring(on ? 1 : 0, M.spring); }, [on]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: 3 + x.value * 22 }] }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={a11y}
      accessibilityState={{ checked: on }}
      onPress={() => { haptic.tap(); onChange(!on); }}
      hitSlop={10}
      style={{ width: 52, height: 30, borderRadius: 15, backgroundColor: on ? C.teal : dark ? 'rgba(253,245,232,.25)' : '#d4d0ca', justifyContent: 'center' }}
    >
      <Animated.View style={[{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.white }, softShadow(0.2, 2), knob]} />
    </Pressable>
  );
}

export function Eyebrow({ children, color, style }: PropsWithChildren<{ color?: string; style?: StyleProp<TextStyle> }>) {
  return <Text style={[T.eyebrow, color ? { color } : null, style]}>{children}</Text>;
}

export function Segmented<T extends string | number>({ options, value, onChange, activeBg = C.ink, activeShadow = C.inkDeep, style }: {
  options: { label: string; value: T }[]; value: T | null; onChange: (v: T) => void; activeBg?: string; activeShadow?: string; style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexDirection: 'row', gap: 8 }, style]}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <View key={String(o.value)} style={{ flex: 1 }}>
            <ChunkyButton
              size="sm" label={o.label} onPress={() => onChange(o.value)}
              color={on ? activeBg : C.cream} shadow={on ? activeShadow : C.sandLine}
              textColor={on ? C.cream : C.ink} depth={on ? 5 : 3}
              innerStyle={!on ? { borderWidth: 2, borderColor: C.sandLine } : undefined}
            />
          </View>
        );
      })}
    </View>
  );
}

/** Coin + star counters used in game headers. */
export function Purse({ dark }: { dark?: boolean }) {
  const coins = useGame(s => s.coins);
  return (
    <Pill bg={C.sun}>
      <Text style={{ fontSize: 12 }}>🪙</Text>
      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12, color: C.ink }}>{coins}</Text>
    </Pill>
  );
}

/**
 * One-tap mute: silences sound effects, background ambience AND Numi's voice together.
 * Lives right in every game's top bar — a grown-up shouldn't have to dig into the
 * Explorer settings page mid-mission just to make the app go quiet.
 */
export function MuteButton({ dark }: { dark?: boolean }) {
  const settings = useGame(s => s.settings);
  const updateSettings = useGame(s => s.updateSettings);
  const muted = !settings.sound && !settings.voice;
  const toggle = () => {
    haptic.tap();
    updateSettings(muted ? { sound: true, ambience: true, voice: true } : { sound: false, ambience: false, voice: false });
  };
  return (
    <Tap
      onPress={toggle}
      a11y={muted ? 'Unmute sound and voice' : 'Mute sound and voice'}
      style={{ width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? 'rgba(253,245,232,.14)' : C.sandLine }}
    >
      <Text style={{ fontSize: 16 }}>{muted ? '🔇' : '🔊'}</Text>
    </Tap>
  );
}

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
