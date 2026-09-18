// Bottom sheets: base sheet, "I'm stuck", confidence check-in.
import React, { PropsWithChildren, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '../services/feedback';
import { C, F, M, T } from '../theme/tokens';
import { Numi } from './characters';
import { Enter } from './motion';
import { Tap } from './ui';

export function Sheet({ open, onClose, children, bg = C.cream, dismissable = true }: PropsWithChildren<{ open: boolean; onClose: () => void; bg?: string; dismissable?: boolean }>) {
  const ins = useSafeAreaInsets();
  const y = useSharedValue(600);
  const o = useSharedValue(0);
  useEffect(() => {
    if (open) haptic.sheet();
    y.value = open ? withSpring(0, { damping: 18, stiffness: 170 }) : withTiming(600, { duration: 200 });
    o.value = withTiming(open ? 1 : 0, { duration: 220 });
  }, [open]);
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const scrim = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(34,48,59,.45)' }, scrim]}>
          <Pressable style={{ flex: 1 }} onPress={dismissable ? onClose : undefined} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View style={[{ backgroundColor: bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 22, paddingTop: 12, paddingBottom: ins.bottom + 22 }, sheet]}>
          <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#dcd4c6', marginBottom: 14 }} />
          {children}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

export type StuckChoice = 'talk' | 'show' | 'objects' | 'draw';

const OPTIONS: { id: StuckChoice; icon: string; label: string; sub: string; bg: string; deep: string }[] = [
  { id: 'talk', icon: '🎙', label: 'Talk it through', sub: 'Tell Numi what you see', bg: C.violet, deep: C.violetDeep },
  { id: 'show', icon: '👀', label: 'Show me', sub: 'Numi lights up a clue', bg: C.teal, deep: C.tealDeep },
  { id: 'objects', icon: '🧩', label: 'Give me objects', sub: 'Count with blocks', bg: C.sun, deep: C.sunDeep },
  { id: 'draw', icon: '✏️', label: 'Let me draw', sub: 'Open the scratchpad', bg: C.coral, deep: C.coralDeep },
];

/** Shown when NUMI detects repeated struggle — the child chooses HOW to get help. */
export function StuckSheet({ open, onChoose, onClose }: { open: boolean; onChoose: (c: StuckChoice) => void; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Numi size={70} mood="think" state="idle" />
        <View style={{ flex: 1 }}>
          <Text style={T.h2}>Hmm… this one's tricky.</Text>
          <Text style={[T.bodySm, { marginTop: 4 }]}>Want to solve it together? Pick how.</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
        {OPTIONS.map((o, i) => (
          <Enter key={o.id} delay={60 * i} style={{ width: '48%', flexGrow: 1 }}>
            <Tap onPress={() => onChoose(o.id)} a11y={o.label} style={{ backgroundColor: o.bg, borderRadius: 22, padding: 14, minHeight: 104, borderBottomWidth: 6, borderBottomColor: o.deep }}>
              <Text style={{ fontSize: 28 }}>{o.icon}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 17, color: o.id === 'objects' ? C.ink : C.cream, marginTop: 4 }}>{o.label}</Text>
              <Text style={{ fontFamily: F.body, fontSize: 11.5, color: o.id === 'objects' ? C.ink : C.cream, opacity: 0.85 }}>{o.sub}</Text>
            </Tap>
          </Enter>
        ))}
      </View>
      <Tap onPress={onClose} a11y="Keep trying on my own" style={{ alignSelf: 'center', marginTop: 14, padding: 10 }}>
        <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: C.muted }}>I'll keep trying on my own</Text>
      </Tap>
    </Sheet>
  );
}
