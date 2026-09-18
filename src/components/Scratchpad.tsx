// MATH SCRATCHPAD — the child's thinking space. Never graded.
import React, { useRef, useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle, Path } from 'react-native-svg';
import { C, F, T } from '../theme/tokens';
import { Numi } from './characters';
import { Sheet } from './sheets';
import { Tap } from './ui';

type Stroke = { d: string; color: string; width: number; pts: { x: number; y: number }[] };
const INKS = [C.ink, C.violet, C.coral, C.teal];

export function useScratchObservation(strokes: number, groups: number) {
  if (groups >= 2) return `I see you made ${groups} groups. Can we use those groups to solve the problem?`;
  if (strokes > 6) return 'Lots of thinking here! Tell me about it when you\'re ready.';
  return 'This page is yours. I only look if you ask me to.';
}

export function Scratchpad({ open, onClose, title, onGroups }: { open: boolean; onClose: () => void; title: string; onGroups?: (n: number) => void }) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [ink, setInk] = useState(0);
  const [eraser, setEraser] = useState(false);
  const [size, setSize] = useState({ w: 320, h: 320 });
  const cur = useRef<Stroke | null>(null);
  const [, force] = useState(0);

  const groups = strokes.filter(isLoop).length;

  const begin = (x: number, y: number) => {
    if (eraser) { eraseAt(x, y); return; }
    cur.current = { d: `M${x.toFixed(1)},${y.toFixed(1)}`, color: INKS[ink], width: 4, pts: [{ x, y }] };
    force(n => n + 1);
  };
  const move = (x: number, y: number) => {
    if (eraser) { eraseAt(x, y); return; }
    const c = cur.current;
    if (!c) return;
    c.pts.push({ x, y });
    c.d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
    force(n => n + 1);
  };
  const end = () => {
    const c = cur.current;
    cur.current = null;
    if (c && c.pts.length > 1) {
      setStrokes(s => {
        const next = [...s, c];
        const g = next.filter(isLoop).length;
        if (g !== s.filter(isLoop).length) onGroups?.(g);
        return next;
      });
    }
    force(n => n + 1);
  };
  const eraseAt = (x: number, y: number) => {
    setStrokes(s => s.filter(st => !st.pts.some(p => Math.abs(p.x - x) < 14 && Math.abs(p.y - y) < 14)));
  };

  const pan = Gesture.Pan().minDistance(0).maxPointers(1)
    .onBegin(e => { scheduleOnRN(begin, e.x, e.y); })
    .onUpdate(e => { scheduleOnRN(move, e.x, e.y); })
    .onFinalize(() => { scheduleOnRN(end); });

  const stampLine = () => {
    const y = size.h * 0.78, x0 = 24, x1 = size.w - 24;
    const add: Stroke[] = [{ d: `M${x0},${y} L${x1},${y}`, color: C.violet, width: 3, pts: [{ x: x0, y }, { x: x1, y }] }];
    for (let i = 0; i <= 10; i++) {
      const x = x0 + ((x1 - x0) / 10) * i;
      add.push({ d: `M${x},${y - 9} L${x},${y + 9}`, color: C.violet, width: 3, pts: [{ x, y }] });
    }
    setStrokes(s => [...s, ...add]);
  };
  const stampGroups = () => {
    const add: Stroke[] = [0, 1, 2].map(k => {
      const cx = size.w * (0.2 + k * 0.3), cy = size.h * 0.32, pts: { x: number; y: number }[] = [];
      let d = '';
      for (let a = 0; a <= 28; a++) {
        const t = (a / 28) * Math.PI * 2;
        const p = { x: cx + Math.cos(t) * size.w * 0.12, y: cy + Math.sin(t) * size.h * 0.11 };
        pts.push(p);
        d += `${a ? ' L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      }
      return { d, color: C.coral, width: 3, pts };
    });
    setStrokes(s => { const next = [...s, ...add]; onGroups?.(next.filter(isLoop).length); return next; });
  };
  const stampTally = () => {
    const add: Stroke[] = [];
    const x0 = size.w * 0.12, y0 = size.h * 0.52;
    for (let i = 0; i < 5; i++) add.push({ d: `M${x0 + i * 12},${y0} L${x0 + i * 12},${y0 + 36}`, color: C.ink, width: 3, pts: [{ x: x0, y: y0 }] });
    add.push({ d: `M${x0 - 6},${y0 + 30} L${x0 + 54},${y0 + 6}`, color: C.ink, width: 3, pts: [{ x: x0, y: y0 }] });
    setStrokes(s => [...s, ...add]);
  };

  const tools: { label: string; on?: boolean; tap: () => void }[] = [
    { label: '✎ Pen', on: !eraser, tap: () => setEraser(false) },
    { label: '⌫ Erase', on: eraser, tap: () => setEraser(true) },
    { label: '↶ Undo', tap: () => setStrokes(s => s.slice(0, -1)) },
    { label: 'Clear', tap: () => setStrokes([]) },
  ];
  const stamps = [
    { label: '— Number line', tap: stampLine },
    { label: '◯ 3 groups', tap: stampGroups },
    { label: '𝍸 Tally', tap: stampTally },
  ];

  const empty = strokes.length === 0 && !cur.current;
  const observation = useScratchObservation(strokes.length, groups);

  return (
    <Sheet open={open} onClose={onClose} dismissable={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={T.eyebrow}>MATH SCRATCHPAD</Text>
          <Text style={[T.h3, { marginTop: 2 }]}>{title}</Text>
        </View>
        <Tap onPress={onClose} a11y="Close scratchpad" style={{ backgroundColor: C.teal, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 }}>
          <Text style={{ fontFamily: F.bodyHeavy, color: C.cream, fontSize: 13 }}>Done</Text>
        </Tap>
      </View>
      <GestureDetector gesture={pan}>
        <View
          onLayout={(e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
          style={{ height: 300, marginTop: 12, borderRadius: 24, backgroundColor: C.paper, borderWidth: 3, borderColor: C.sandLine, overflow: 'hidden' }}
          collapsable={false}
        >
          <Svg width={size.w} height={size.h} style={{ position: 'absolute' }}>
            {Array.from({ length: Math.ceil(size.w / 22) * Math.ceil(size.h / 22) }, (_, i) => {
              const cols = Math.ceil(size.w / 22);
              return <Circle key={i} cx={11 + (i % cols) * 22} cy={11 + Math.floor(i / cols) * 22} r={1.4} fill={C.sand} />;
            })}
            {strokes.map((s, i) => <Path key={i} d={s.d} stroke={s.color} strokeWidth={s.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
            {cur.current && <Path d={cur.current.d} stroke={cur.current.color} strokeWidth={cur.current.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
          </Svg>
          {empty && (
            <View pointerEvents="none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
              <Text style={{ fontFamily: F.bodyBold, color: '#bdb4a4', textAlign: 'center', fontSize: 13 }}>Draw, circle, tally, sketch a number line. Numi never marks this.</Text>
            </View>
          )}
        </View>
      </GestureDetector>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, alignItems: 'center' }}>
        {INKS.map((c, i) => (
          <Tap key={c} onPress={() => { setInk(i); setEraser(false); }} a11y={`Ink colour ${i + 1}`} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c, borderWidth: ink === i && !eraser ? 4 : 0, borderColor: C.sun }}><View /></Tap>
        ))}
        <View style={{ flex: 1 }} />
        {tools.map(t => (
          <Tap key={t.label} onPress={t.tap} a11y={t.label} style={{ backgroundColor: t.on ? C.ink : C.sandLine, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 9 }}>
            <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11, color: t.on ? C.cream : C.ink }}>{t.label}</Text>
          </Tap>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 7, marginTop: 8 }}>
        {stamps.map(t => (
          <Tap key={t.label} onPress={t.tap} a11y={t.label} style={{ flexGrow: 1, backgroundColor: C.violetSoft, borderRadius: 13, paddingVertical: 10, alignItems: 'center' }}>
            <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11.5, color: C.violetDeep }}>{t.label}</Text>
          </Tap>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: C.sandLine, borderRadius: 20, padding: 10, marginTop: 10 }}>
        <Numi size={42} mood="happy" />
        <Text style={[T.body, { flex: 1, fontSize: 12.5 }]}>{observation}</Text>
      </View>
    </Sheet>
  );
}

function isLoop(s: Stroke) {
  if (s.pts.length < 12) return false;
  const a = s.pts[0], b = s.pts[s.pts.length - 1];
  const xs = s.pts.map(p => p.x), ys = s.pts.map(p => p.y);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  return span > 30 && Math.hypot(a.x - b.x, a.y - b.y) < span * 0.35;
}
