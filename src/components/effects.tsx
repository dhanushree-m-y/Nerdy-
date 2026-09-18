// Particles, confetti and light rays for reward moments.
import React, { useEffect, useMemo } from 'react';
import { StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation, Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { C } from '../theme/tokens';
import { Spin, useMotionOK } from './motion';

const COLORS = [C.sun, C.coral, C.violet, C.cream, C.sky, C.teal];

function ConfettiPiece({ i, width, height, loop }: { i: number; width: number; height: number; loop: boolean }) {
  const v = useSharedValue(0);
  const x0 = (i * 53 + 17) % width;
  const drift = ((i % 5) - 2) * 22;
  const size = 8 + (i % 3) * 4;
  const dur = 2400 + (i % 5) * 380;
  useEffect(() => {
    const t = withTiming(1, { duration: dur, easing: Easing.in(Easing.quad) });
    v.value = withDelay(i * 90, loop ? withRepeat(t, -1, false) : t);
    return () => cancelAnimation(v);
  }, []);
  const a = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 0.1, 0.85, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: x0 + drift * Math.sin(v.value * 6) },
      { translateY: -40 + v.value * (height + 60) },
      { rotate: `${v.value * (i % 2 ? 540 : -420)}deg` },
      { scaleX: Math.cos(v.value * 12) },
    ],
  }));
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: size, height: i % 3 === 0 ? size : size * 0.55, borderRadius: i % 2 ? size : 2, backgroundColor: COLORS[i % COLORS.length] }, a]} />;
}

export function Confetti({ count = 28, loop = true }: { count?: number; loop?: boolean }) {
  const ok = useMotionOK();
  const { width, height } = useWindowDimensions();
  if (!ok) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }, (_, i) => <ConfettiPiece key={i} i={i} width={width} height={height} loop={loop} />)}
    </View>
  );
}

/** Rotating sunburst behind a hero element. */
export function Rays({ size = 380, color = 'rgba(253,245,232,.18)', rays = 12, duration = 26000, style }: { size?: number; color?: string; rays?: number; duration?: number; style?: StyleProp<ViewStyle> }) {
  const d = useMemo(() => {
    const r = size / 2;
    let p = '';
    for (let i = 0; i < rays; i++) {
      const a0 = (i / rays) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2) / rays / 2.2;
      p += `M${r},${r} L${r + r * Math.cos(a0)},${r + r * Math.sin(a0)} A${r},${r} 0 0 1 ${r + r * Math.cos(a1)},${r + r * Math.sin(a1)} Z `;
    }
    return p;
  }, [size, rays]);
  return (
    <Spin duration={duration} style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Svg width={size} height={size}><Path d={d} fill={color} /></Svg>
    </Spin>
  );
}

function Spark({ angle, dist, delay, color, size, trigger }: { angle: number; dist: number; delay: number; color: string; size: number; trigger: number }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = 0;
    v.value = withDelay(delay, withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) }));
  }, [trigger]);
  const a = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 0.1, 0.7, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: Math.cos(angle) * dist * v.value },
      { translateY: Math.sin(angle) * dist * v.value },
      { scale: interpolate(v.value, [0, 0.3, 1], [0.2, 1.2, 0.4]) },
      { rotate: `${v.value * 180}deg` },
    ],
  }));
  return <Animated.View style={[{ position: 'absolute', width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }, a]}>
    <View style={{ flex: 1, backgroundColor: color, borderRadius: 2, transform: [{ rotate: '45deg' }] }} />
  </Animated.View>;
}

/** One-shot radial burst; bump `trigger` to replay. */
export function Burst({ trigger, x = 0, y = 0, count = 14, dist = 90, colors = [C.sun, C.coral, C.violet, C.teal] }: { trigger: number; x?: number; y?: number; count?: number; dist?: number; colors?: string[] }) {
  const ok = useMotionOK();
  if (!trigger || !ok) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, zIndex: 50 }}>
      {Array.from({ length: count }, (_, i) => (
        <Spark key={`${trigger}-${i}`} trigger={trigger} angle={(i / count) * Math.PI * 2 + (i % 2) * 0.2} dist={dist * (0.7 + (i % 3) * 0.2)} delay={i % 3 * 30} color={colors[i % colors.length]} size={8 + (i % 3) * 4} />
      ))}
    </View>
  );
}

/** Twinkling star field for night scenes. */
export function Stars({ count = 24, color = C.cream }: { count?: number; color?: string }) {
  const { width, height } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }, (_, i) => <Twinkle key={i} i={i} x={(i * 53 + 17) % width} y={(i * 97 + 40) % height} color={color} />)}
    </View>
  );
}

function Twinkle({ i, x, y, color }: { i: number; x: number; y: number; color: string }) {
  const ok = useMotionOK();
  const v = useSharedValue(0.5);
  useEffect(() => {
    if (!ok) return;
    v.value = withDelay(i * 130, withRepeat(withTiming(1, { duration: 1400 + (i % 4) * 500 }), -1, true));
    return () => cancelAnimation(v);
  }, [ok]);
  const a = useAnimatedStyle(() => ({ opacity: 0.2 + v.value * 0.8, transform: [{ scale: 0.7 + v.value * 0.5 }] }));
  const s = 2 + (i % 3);
  return <Animated.View style={[{ position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: s, backgroundColor: color }, a]} />;
}
