// Reusable Reanimated motion primitives. All respect the Reduced Motion setting.
import React, { PropsWithChildren, useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation, Easing, interpolate, useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { useGame } from '../store/game';
import { M } from '../theme/tokens';

export const useMotionOK = () => !useGame(s => s.settings.reducedMotion);

/** Looping 0→1→0 (yoyo) or 0→1 (linear) value. */
export function useLoop(duration: number, { delay = 0, yoyo = true, easing = Easing.inOut(Easing.sin), enabled = true } = {}) {
  const ok = useMotionOK() && enabled;
  const v = useSharedValue(0);
  useEffect(() => {
    if (!ok) { cancelAnimation(v); v.value = 0; return; }
    v.value = 0;
    v.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: yoyo ? easing : Easing.linear }), -1, yoyo));
    return () => cancelAnimation(v);
  }, [ok, duration, delay, yoyo]);
  return v;
}

type Base = PropsWithChildren<{ style?: StyleProp<ViewStyle>; delay?: number }>;

export function Bob({ children, style, amp = 6, duration = 1600, delay = 0 }: Base & { amp?: number; duration?: number }) {
  const v = useLoop(duration, { delay });
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: -amp * v.value }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

export function Sway({ children, style, deg = 3, duration = 1300, delay = 0 }: Base & { deg?: number; duration?: number }) {
  const v = useLoop(duration, { delay });
  const a = useAnimatedStyle(() => ({ transform: [{ rotate: `${interpolate(v.value, [0, 1], [-deg, deg])}deg` }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

export function Spin({ children, style, duration = 9000, reverse = false }: Base & { duration?: number; reverse?: boolean }) {
  const v = useLoop(duration, { yoyo: false });
  const a = useAnimatedStyle(() => ({ transform: [{ rotate: `${(reverse ? -360 : 360) * v.value}deg` }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/** Horizontal drift across the screen (clouds, birds, trains). */
export function Drift({ children, style, from = -100, to = 420, duration = 26000, delay = 0, rise = 0, phase = 0 }: Base & { from?: number; to?: number; duration?: number; rise?: number; phase?: number }) {
  const ok = useMotionOK();
  const v = useSharedValue(phase);
  useEffect(() => {
    if (!ok) return;
    const lin = { easing: Easing.linear };
    v.value = phase;
    v.value = withDelay(delay, withSequence(
      withTiming(1, { duration: duration * (1 - phase), ...lin }),
      withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration, ...lin })), -1, false),
    ));
    return () => cancelAnimation(v);
  }, [ok, duration]);
  const a = useAnimatedStyle(() => ({
    transform: [
      { translateX: ok ? interpolate(v.value, [0, 1], [from, to]) : (from + to) / 3 },
      { translateY: -rise * v.value },
    ],
  }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

export function Shimmer({ style, min = 0.25, max = 0.75, duration = 1700, delay = 0 }: { style?: StyleProp<ViewStyle>; min?: number; max?: number; duration?: number; delay?: number }) {
  const v = useLoop(duration, { delay });
  const a = useAnimatedStyle(() => ({ opacity: interpolate(v.value, [0, 1], [min, max]) }));
  return <Animated.View pointerEvents="none" style={[style, a]} />;
}

/** Expanding ring behind an element — "tap me" / "listening". */
export function PulseRing({ color, size, duration = 2000, delay = 0, style }: { color: string; size: number; duration?: number; delay?: number; style?: StyleProp<ViewStyle> }) {
  const v = useLoop(duration, { delay, yoyo: false, easing: Easing.out(Easing.quad) });
  const ok = useMotionOK();
  const a = useAnimatedStyle(() => ({
    opacity: ok ? interpolate(v.value, [0, 1], [0.55, 0]) : 0,
    transform: [{ scale: interpolate(v.value, [0, 1], [1, 1.7]) }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style, a]} />
  );
}

/** Gentle glowing bounce used when Numi refers to an object ("look at these 8 blocks"). */
export function Highlight({ children, style, active, color = '#f5b53c' }: Base & { active: boolean; color?: string }) {
  const v = useLoop(900, { enabled: active });
  const a = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * v.value }, { scale: 1 + 0.05 * v.value }],
  }));
  const glow = useAnimatedStyle(() => ({ opacity: active ? 0.25 + 0.55 * v.value : 0 }));
  return (
    <Animated.View style={[style, a]}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -7, right: -7, top: -7, bottom: -7, borderRadius: 16, borderWidth: 4, borderColor: color }, glow]} />
      {children}
    </Animated.View>
  );
}

/** Mount animation: rises and fades in. */
export function Enter({ children, style, delay = 0, dy = 18, dx = 0, scale = 0.98 }: Base & { dy?: number; dx?: number; scale?: number }) {
  const ok = useMotionOK();
  const v = useSharedValue(ok ? 0 : 1);
  useEffect(() => {
    if (ok) v.value = withDelay(delay, withTiming(1, { duration: M.enter, easing: Easing.bezier(0.2, 0.9, 0.3, 1) }));
  }, []);
  const a = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [
      { translateY: (1 - v.value) * dy },
      { translateX: (1 - v.value) * dx },
      { scale: scale + (1 - scale) * v.value },
    ],
  }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/** Springy pop-in from zero. */
export function Pop({ children, style, delay = 0, from = 0.3 }: Base & { from?: number }) {
  const ok = useMotionOK();
  const v = useSharedValue(ok ? 0 : 1);
  useEffect(() => {
    if (ok) v.value = withDelay(delay, withSpring(1, M.bouncy));
  }, []);
  const a = useAnimatedStyle(() => ({
    opacity: Math.min(1, v.value * 1.6),
    transform: [{ scale: from + (1 - from) * v.value }],
  }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/** Rubber-stamp slam (e.g. "CASE SOLVED!"). */
export function Stamp({ children, style, delay = 0, rotate = -5 }: Base & { rotate?: number }) {
  const ok = useMotionOK();
  const v = useSharedValue(ok ? 0 : 1);
  useEffect(() => {
    if (ok) v.value = withDelay(delay, withSpring(1, { damping: 11, stiffness: 190 }));
  }, []);
  const a = useAnimatedStyle(() => ({
    opacity: Math.min(1, v.value * 2),
    transform: [{ scale: interpolate(v.value, [0, 1], [2.3, 1]) }, { rotate: `${interpolate(v.value, [0, 1], [-16, rotate])}deg` }],
  }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/** Shakes sideways whenever `trigger` changes (a soft "not quite"). */
export function Wobble({ children, style, trigger }: Base & { trigger: number }) {
  const ok = useMotionOK();
  const x = useSharedValue(0);
  useEffect(() => {
    if (!trigger || !ok) return;
    x.value = withSequence(
      withTiming(-9, { duration: 70 }), withTiming(9, { duration: 90 }),
      withTiming(-6, { duration: 80 }), withTiming(5, { duration: 80 }), withSpring(0, M.spring),
    );
  }, [trigger]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { rotate: `${x.value * 0.35}deg` }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/** Squash-and-stretch landing whenever `trigger` changes. */
export function Squash({ children, style, trigger }: Base & { trigger: number }) {
  const ok = useMotionOK();
  const s = useSharedValue(1);
  useEffect(() => {
    if (!trigger || !ok) return;
    s.value = withSequence(withTiming(0.82, { duration: 110 }), withSpring(1, M.bouncy));
  }, [trigger]);
  const a = useAnimatedStyle(() => ({ transform: [{ scaleY: s.value }, { scaleX: 2 - s.value }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/** Floating "+3" text that rises and fades. Remount with a new key to replay. */
export function FloatUp({ children, style, distance = 90, duration = 1100 }: Base & { distance?: number; duration?: number }) {
  const v = useSharedValue(0);
  useEffect(() => { v.value = withTiming(1, { duration, easing: Easing.out(Easing.quad) }); }, []);
  const a = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 0.15, 0.7, 1], [0, 1, 1, 0]),
    transform: [{ translateY: -distance * v.value }, { scale: interpolate(v.value, [0, 0.2, 1], [0.7, 1.1, 1]) }],
  }));
  return <Animated.View pointerEvents="none" style={[style, a]}>{children}</Animated.View>;
}

/** Animated progress fill (0..1). */
export function useFill(progress: number, delay = 0) {
  const ok = useMotionOK();
  const v = useSharedValue(ok ? 0 : progress);
  useEffect(() => {
    v.value = ok ? withDelay(delay, withTiming(progress, { duration: 900, easing: Easing.bezier(0.2, 0.9, 0.3, 1) })) : progress;
  }, [progress]);
  return useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, v.value)) * 100}%` }));
}

export function Spacer({ h = 0, w = 0, flex }: { h?: number; w?: number; flex?: number }) {
  return <View style={{ height: h, width: w, flex }} />;
}
