// The NUMI wordmark and the screen shown while fonts and the save file load.
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Numi } from './characters';
import { Bob, useMotionOK } from './motion';
import { C, F } from '../theme/tokens';

export const TILES = [
  { l: 'N', bg: C.teal, sh: C.tealDeep, fg: C.cream },
  { l: 'U', bg: C.sun, sh: C.sunDeep, fg: C.ink },
  { l: 'M', bg: C.coral, sh: C.coralDeep, fg: C.cream },
  { l: 'I', bg: C.violet, sh: C.violetDeep, fg: C.cream },
];

function Tile({ i, size, drop }: (typeof TILES)[number] & { i: number; size: number; drop: boolean }) {
  const t = TILES[i];
  const ok = useMotionOK();
  const v = useSharedValue(ok && drop ? 0 : 1);
  useEffect(() => { if (ok && drop) v.value = withDelay(220 + i * 130, withSpring(1, { damping: 8, stiffness: 140 })); }, []);
  const a = useAnimatedStyle(() => ({
    opacity: Math.min(1, v.value * 2),
    transform: [{ translateY: (1 - v.value) * -120 }, { rotate: `${(1 - v.value) * (i % 2 ? 25 : -25)}deg` }],
  }));
  return (
    <Animated.View style={a}>
      <Bob amp={size * 0.13} duration={1300} delay={i * 120}>
        <View style={{ width: size, height: size * 1.16, borderRadius: size * 0.32, backgroundColor: t.bg, borderBottomWidth: Math.round(size * 0.11), borderBottomColor: t.sh, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: `${[-4, 3, -2, 4][i]}deg` }] }}>
          <Text style={{ fontFamily: F.display, fontSize: size * 0.71, lineHeight: size * 0.9, color: t.fg, marginTop: size * 0.1 }}>{t.l}</Text>
        </View>
      </Bob>
    </Animated.View>
  );
}

/** The four letter tiles. `drop` plays the entrance; leave it off for a static mark. */
export function Wordmark({ size = 62, drop = true }: { size?: number; drop?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: size * 0.13 }}>
      {TILES.map((t, i) => <Tile key={t.l} {...t} i={i} size={size} drop={drop} />)}
    </View>
  );
}

function Dot({ i }: { i: number }) {
  const v = useSharedValue(0.3);
  useEffect(() => {
    v.value = withDelay(i * 180, withRepeat(withSequence(
      withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }),
      withTiming(0.3, { duration: 420, easing: Easing.in(Easing.quad) }),
    ), -1));
  }, []);
  const a = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.7 + v.value * 0.4 }] }));
  return <Animated.View style={[{ width: 9, height: 9, borderRadius: 5, backgroundColor: C.tealDeep }, a]} />;
}

/**
 * Shown while the fonts and the saved adventure load. It carries the name so the
 * first thing on screen is the app, not an empty rectangle.
 */
export function BootScreen({ line = 'Waking up Numbershire…' }: { line?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.cream, padding: 24 }}>
      <Wordmark size={58} />
      <Text style={{ fontFamily: F.display, fontSize: 20, color: C.tealDeep, marginTop: 18, textAlign: 'center' }}>The World Runs on Math</Text>
      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11, letterSpacing: 2.4, color: C.tealDeep, opacity: 0.65, marginTop: 3 }}>A NUMBERSHIRE ADVENTURE</Text>
      <View style={{ marginTop: 34 }}><Numi size={96} state="thinking" /></View>
      <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.ink, opacity: 0.6, marginTop: 16 }}>{line}</Text>
      <View style={{ flexDirection: 'row', gap: 7, marginTop: 12 }}>
        {[0, 1, 2].map(i => <Dot key={i} i={i} />)}
      </View>
    </View>
  );
}
