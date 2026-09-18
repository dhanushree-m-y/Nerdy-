// Drag & drop for math manipulatives. Hit-testing runs on the UI thread so hover feedback is instant.
import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  SharedValue, useAnimatedStyle, useDerivedValue, useSharedValue, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { haptic } from '../services/feedback';
import { M } from '../theme/tokens';

type Rect = { id: string; x: number; y: number; w: number; h: number };
type Ctx = {
  rects: SharedValue<Rect[]>;
  hover: SharedValue<string | null>;
  dragging: SharedValue<string | null>;
  register: (id: string, measure: () => void) => () => void;
  setRect: (r: Rect) => void;
  measureAll: () => void;
  onHoverChange?: (zone: string | null, item: string | null) => void;
};

const DropCtx = createContext<Ctx | null>(null);

export function DropProvider({ children, onHoverChange }: PropsWithChildren<{ onHoverChange?: (zone: string | null, item: string | null) => void }>) {
  const rects = useSharedValue<Rect[]>([]);
  const hover = useSharedValue<string | null>(null);
  const dragging = useSharedValue<string | null>(null);
  const measurers = useRef(new Map<string, () => void>());
  const value = useMemo<Ctx>(() => ({
    rects, hover, dragging, onHoverChange,
    register: (id, m) => {
      measurers.current.set(id, m);
      return () => {
        measurers.current.delete(id);
        rects.value = rects.value.filter(r => r.id !== id);
      };
    },
    setRect: r => { rects.value = [...rects.value.filter(x => x.id !== r.id), r]; },
    measureAll: () => measurers.current.forEach(m => m()),
  }), [onHoverChange]);
  return <DropCtx.Provider value={value}>{children}</DropCtx.Provider>;
}

export function useDropCtx() {
  const c = useContext(DropCtx);
  if (!c) throw new Error('DropProvider missing');
  return c;
}

/** A target area. Render-prop receives whether an item is hovering over it. */
export function DropZone({ id, style, children, pad = 14 }: { id: string; style?: StyleProp<ViewStyle>; pad?: number; children?: React.ReactNode | ((hovered: SharedValue<boolean>) => React.ReactNode) }) {
  const ctx = useDropCtx();
  const ref = useRef<View>(null);
  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y, w, h) => {
      if (w || h) ctx.setRect({ id, x: x - pad, y: y - pad, w: w + pad * 2, h: h + pad * 2 });
    });
  }, [id, pad]);
  useEffect(() => ctx.register(id, measure), [id, measure]);
  const hover = ctx.hover;
  const hovered = useDerivedValue(() => hover.value === id);
  return (
    <View ref={ref} style={style} onLayout={() => setTimeout(measure, 30)} collapsable={false}>
      {typeof children === 'function' ? children(hovered) : children}
    </View>
  );
}

export type DropResult = 'accept' | 'reject' | 'ignore';

export function Draggable({
  id, children, style, onDrop, onTap, disabled, lift = 1.12, onDragStart, a11y,
}: PropsWithChildren<{
  id: string;
  /** What a screen reader says for this piece, e.g. "Plank 7" or "Apple, 6 coins". */
  a11y?: string;
  style?: StyleProp<ViewStyle>;
  onDrop: (zone: string | null) => DropResult;
  onTap?: () => void;
  onDragStart?: () => void;
  disabled?: boolean;
  lift?: number;
}>) {
  const ctx = useDropCtx();
  const { rects, hover, dragging } = ctx;
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const active = useSharedValue(0);
  const wob = useSharedValue(0);

  // Gesture worklets are registered once per detector, so they must call through refs —
  // capturing the render's onDrop/onTap directly lets a second tap run against stale state.
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;

  const finish = useCallback((zone: string | null) => {
    const res = onDropRef.current(zone);
    ctx.onHoverChange?.(null, null);
    if (res === 'accept') {
      haptic.snap();
      tx.value = 0; ty.value = 0; active.value = 0;
    } else {
      if (res === 'reject') {
        haptic.nudge();
        wob.value = withSequence(withTiming(-8, { duration: 60 }), withTiming(8, { duration: 80 }), withTiming(-4, { duration: 70 }), withSpring(0, M.spring));
      }
      tx.value = withSpring(0, M.spring);
      ty.value = withSpring(0, M.spring);
      active.value = withSpring(0, M.spring);
    }
  }, []);

  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const started = useCallback(() => { ctx.measureAll(); haptic.tap(); onDragStartRef.current?.(); }, []);
  const hoverJS = useCallback((z: string | null) => ctx.onHoverChange?.(z, id), [id]);

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .minDistance(4)
    .onStart(() => {
      active.value = withSpring(1, M.bouncy);
      dragging.value = id;
      scheduleOnRN(started);
    })
    .onUpdate(e => {
      tx.value = e.translationX;
      ty.value = e.translationY;
      let found: string | null = null;
      const rs = rects.value;
      for (let i = 0; i < rs.length; i++) {
        const r = rs[i];
        if (e.absoluteX >= r.x && e.absoluteX <= r.x + r.w && e.absoluteY >= r.y && e.absoluteY <= r.y + r.h) { found = r.id; break; }
      }
      if (found !== hover.value) {
        hover.value = found;
        scheduleOnRN(hoverJS, found);
      }
    })
    .onEnd(() => {
      const z = hover.value;
      hover.value = null;
      dragging.value = null;
      scheduleOnRN(finish, z);
    })
    .onFinalize((_e, success) => {
      if (!success) {
        tx.value = withSpring(0, M.spring);
        ty.value = withSpring(0, M.spring);
        active.value = withSpring(0, M.spring);
      }
    });

  const tapped = useCallback(() => onTapRef.current?.(), []);
  const tap = Gesture.Tap().enabled(!disabled && !!onTap).onEnd((_e, ok) => { if (ok) scheduleOnRN(tapped); });
  const g = Gesture.Exclusive(pan, tap);

  const a = useAnimatedStyle(() => ({
    zIndex: active.value > 0.01 ? 999 : 1,
    transform: [
      { translateX: tx.value + wob.value },
      { translateY: ty.value },
      { scale: 1 + (lift - 1) * active.value },
      { rotate: `${-5 * active.value + wob.value * 0.4}deg` },
    ],
    shadowOpacity: 0.3 * active.value,
  }));

  return (
    <GestureDetector gesture={g}>
      <Animated.View style={[{ shadowColor: '#22303b', shadowRadius: 12, shadowOffset: { width: 0, height: 10 } }, style, a]} accessibilityRole="button" accessibilityLabel={a11y}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

/** Helper to animate a zone's highlight from the hovered shared value. */
export function useHoverStyle(hovered: SharedValue<boolean>, color = 'rgba(245,181,60,.35)') {
  return useAnimatedStyle(() => ({
    backgroundColor: hovered.value ? color : 'transparent',
    transform: [{ scale: withSpring(hovered.value ? 1.04 : 1, M.spring) }],
  }));
}
