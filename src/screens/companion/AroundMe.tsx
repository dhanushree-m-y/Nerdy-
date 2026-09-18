// Math Around Me — math exists outside school. Five tiny real-life missions + a parent-gated "photo" puzzle.
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Numi } from '../../components/characters';
import { Draggable, DropProvider, DropZone, useHoverStyle } from '../../components/dragdrop';
import { Burst } from '../../components/effects';
import { Bob, Enter, Pop, Squash, Wobble } from '../../components/motion';
import { SpeakableText, SpeakButton } from '../../components/Storyteller';
import { ChunkyButton, Eyebrow, ProgressBar, Screen, SpeechBubble, Tap, TopBar, Txt } from '../../components/ui';
import { haptic, say } from '../../services/feedback';
import { useGame } from '../../store/game';
import { C, F, M } from '../../theme/tokens';

// ─── shared bits ──────────────────────────────────────────────────────────────
function Result({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <Pop style={{ marginTop: 10 }}>
      <View style={{ backgroundColor: ok ? C.tealSoft : C.coralSoft, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 13 }}>
        <Text style={{ fontFamily: F.bodyHeavy, fontSize: 14, color: ok ? C.tealDeep : C.coralDeep }}>{children}</Text>
      </View>
    </Pop>
  );
}

function Chip({ label, on, onPress, sub }: { label: string; on?: boolean; onPress: () => void; sub?: string }) {
  return (
    <Tap onPress={onPress} a11y={label} style={{
      minHeight: 52, minWidth: 64, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
      backgroundColor: on ? C.teal : C.paper, borderWidth: 2, borderColor: on ? C.tealDeep : C.sandLine, borderBottomWidth: 5,
    }}>
      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 14, color: on ? C.cream : C.ink }}>{label}</Text>
      {sub ? <Text style={{ fontFamily: F.display, fontSize: 13, color: on ? C.cream : C.sunDeep }}>{sub}</Text> : null}
    </Tap>
  );
}

// ─── Kitchen: fill the cup to exactly half ───────────────────────────────────
const SCOOPS = [{ q: 1, label: '¼ cup' }, { q: 2, label: '½ cup' }, { q: 3, label: '¾ cup' }];
function Kitchen() {
  const [log, setLog] = useState<number[]>([]);
  const total = log.reduce((a, b) => a + b, 0);
  const fill = useSharedValue(0);
  useEffect(() => { fill.value = withSpring(Math.min(4, total) / 4, M.soft); }, [total]);
  const fa = useAnimatedStyle(() => ({ height: `${fill.value * 100}%` }));
  const names: Record<number, string> = { 1: '¼', 2: '½', 3: '¾' };
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16 }}>
        <Squash trigger={log.length}>
          <View style={{ width: 90, height: 110, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, borderWidth: 4, borderTopWidth: 0, borderColor: C.water, backgroundColor: '#f4fafc', overflow: 'hidden', justifyContent: 'flex-end' }}>
            <Animated.View style={[{ backgroundColor: total > 2 ? C.coral : C.sun, opacity: 0.85 }, fa]} />
            <View style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTopWidth: 2, borderStyle: 'dashed', borderColor: C.ink }} />
            <Text style={{ position: 'absolute', right: 4, top: '50%', marginTop: -16, fontFamily: F.bodyHeavy, fontSize: 11, color: C.ink }}>½</Text>
          </View>
        </Squash>
        <View style={{ flex: 1, gap: 8 }}>
          <SpeakableText text="Fill to the line — exactly half." autoRead variant="bodySm" style={{ fontSize: 13, lineHeight: 18 }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SCOOPS.map(s => (
              <Chip key={s.q} label={s.label} onPress={() => { if (total < 2) setLog(l => [...l, s.q]); else haptic.nudge(); }} />
            ))}
          </View>
        </View>
      </View>
      {total === 2 ? <Result ok>Exactly half! {log.map(q => names[q]).join(' + ')} = ½ 🎉</Result> : null}
      {total > 2 ? <Result ok={false}>Oops, too much! {log.map(q => names[q]).join(' + ')} is more than ½.</Result> : null}
      {log.length > 0 ? <ChunkyButton size="sm" label="Tip it out" color={C.sand} shadow={C.sandDeep} textColor={C.ink} onPress={() => setLog([])} style={{ marginTop: 10, alignSelf: 'flex-start' }} /> : null}
    </View>
  );
}

// ─── Shopping: stay within ₹100 ──────────────────────────────────────────────
const SHOP = [
  { id: 'pencils', icon: '✏️', price: 20 }, { id: 'juice', icon: '🧃', price: 35 }, { id: 'book', icon: '📓', price: 45 },
  { id: 'apple', icon: '🍎', price: 15 }, { id: 'ball', icon: '⚽', price: 60 }, { id: 'bread', icon: '🍞', price: 30 },
];
function Shopping() {
  const [cart, setCart] = useState<string[]>([]);
  const total = SHOP.filter(s => cart.includes(s.id)).reduce((a, s) => a + s.price, 0);
  const left = 100 - total;
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SHOP.map(s => (
          <Chip key={s.id} label={s.icon} sub={`₹${s.price}`} on={cart.includes(s.id)}
            onPress={() => setCart(c => (c.includes(s.id) ? c.filter(x => x !== s.id) : [...c, s.id]))} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
        <Text style={{ fontFamily: F.display, fontSize: 18, color: C.ink }}>Basket ₹{total}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 18, color: left < 0 ? C.coralDeep : C.tealDeep }}>{left >= 0 ? `₹${left} left` : `₹${-left} over`}</Text>
      </View>
      <ProgressBar value={Math.min(1, total / 100)} colors={left < 0 ? [C.coral] : [C.teal, C.sun]} style={{ marginTop: 6 }} />
      {left < 0 ? <Result ok={false}>Too much! Take something out.</Result> : null}
      {left === 0 ? <Result ok>Exactly ₹100 — perfect shopping!</Result> : null}
      {left > 0 && left < 15 ? <Result ok>Nice! Nothing else fits in ₹{left}.</Result> : null}
    </View>
  );
}

// ─── Sharing: 12 snacks, 4 friends ────────────────────────────────────────────
function Sharing() {
  const [plates, setPlates] = useState([0, 0, 0, 0]);
  const [shake, setShake] = useState(0);
  const pile = 12 - plates.reduce((a, b) => a + b, 0);
  const fair = pile === 0 && plates.every(p => p === 3);
  const unfair = pile === 0 && !fair;
  useEffect(() => { if (unfair) { setShake(s => s + 1); haptic.nudge(); } if (fair) haptic.success(); }, [unfair, fair]);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontFamily: F.display, fontSize: 20, color: C.ink }}>🍪 × {pile}</Text>
        <SpeakableText text="Tap a plate to give a snack." autoRead variant="bodySm" style={{ fontSize: 13, lineHeight: 18 }} />
      </View>
      <Wobble trigger={shake}>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {plates.map((p, i) => (
            <View key={i} style={{ flex: 1 }}>
              <Tap a11y={`Friend ${i + 1} plate, ${p} snacks`} onPress={() => { if (pile > 0) setPlates(ps => ps.map((x, k) => (k === i ? x + 1 : x))); }}
                style={{ height: 96, borderRadius: 48, backgroundColor: C.paper, borderWidth: 3, borderColor: fair ? C.teal : C.sandLine, alignItems: 'center', justifyContent: 'center', padding: 6 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
                  {Array.from({ length: p }, (_, k) => <Pop key={k}><Text style={{ fontSize: 14 }}>🍪</Text></Pop>)}
                </View>
              </Tap>
              <Text style={{ textAlign: 'center', fontFamily: F.bodyHeavy, fontSize: 13, color: C.muted, marginTop: 4 }}>{['🙂', '😃', '😊', '😄'][i]} {p}</Text>
            </View>
          ))}
        </View>
      </Wobble>
      {fair ? <Result ok>Fair! 12 ÷ 4 = 3 each.</Result> : null}
      {unfair ? <Result ok={false}>Hmm, someone has more. Try again!</Result> : null}
      {pile < 12 ? <ChunkyButton size="sm" label="Start over" color={C.sand} shadow={C.sandDeep} textColor={C.ink} onPress={() => setPlates([0, 0, 0, 0])} style={{ marginTop: 10, alignSelf: 'flex-start' }} /> : null}
    </View>
  );
}

// ─── Time: what fits in 20 minutes? ───────────────────────────────────────────
const TASKS = [
  { id: 'teeth', icon: '🪥', label: 'Teeth', min: 5 }, { id: 'shoes', icon: '👟', label: 'Shoes', min: 5 },
  { id: 'eat', icon: '🥣', label: 'Breakfast', min: 10 }, { id: 'bag', icon: '🎒', label: 'Pack bag', min: 5 },
  { id: 'show', icon: '📺', label: 'Cartoon', min: 15 },
];
function arc(cx: number, cy: number, r: number, fromMin: number, toMin: number) {
  const a0 = (fromMin / 60) * Math.PI * 2 - Math.PI / 2;
  const a1 = (toMin / 60) * Math.PI * 2 - Math.PI / 2;
  const large = toMin - fromMin > 30 ? 1 : 0;
  return `M${cx},${cy} L${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)} Z`;
}
function TimeMission() {
  const [picked, setPicked] = useState<string[]>([]);
  const used = TASKS.filter(t => picked.includes(t.id)).reduce((a, t) => a + t.min, 0);
  const left = 20 - used;
  const S = 110, cx = S / 2, r = S / 2 - 6;
  const colors = [C.teal, C.sun, C.violet, C.water, C.coral];
  let cursor = 0;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Svg width={S} height={S}>
          <Circle cx={cx} cy={cx} r={r} fill={C.paper} stroke={C.ink} strokeWidth={3} />
          <Path d={arc(cx, cx, r - 3, 0, 20)} fill="rgba(47,160,138,.12)" />
          {TASKS.filter(t => picked.includes(t.id)).map((t, i) => {
            const from = cursor; cursor += t.min;
            return <Path key={t.id} d={arc(cx, cx, r - 3, from, Math.min(60, cursor))} fill={cursor > 20 ? C.coral : colors[i % colors.length]} opacity={0.85} />;
          })}
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <Line key={i} x1={cx + (r - 8) * Math.sin(a)} y1={cx - (r - 8) * Math.cos(a)} x2={cx + (r - 1) * Math.sin(a)} y2={cx - (r - 1) * Math.cos(a)} stroke={C.ink} strokeWidth={i % 3 ? 1.5 : 3} />;
          })}
          <Line x1={cx} y1={cx} x2={cx} y2={cx - r + 16} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
          <Circle cx={cx} cy={cx} r={4} fill={C.ink} />
        </Svg>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 26, lineHeight: 30, color: left < 0 ? C.coralDeep : C.ink }}>{left >= 0 ? `${left} min` : `${-left} min late!`}</Text>
          <SpeakableText
            text={left >= 0 ? `${left} minutes left before we go.` : 'That won\'t fit.'}
            variant="bodySm"
            showIcon={false}
            style={{ fontSize: 13, lineHeight: 18 }}
          >
            {left >= 0 ? 'left before we go' : 'That won\'t fit.'}
          </SpeakableText>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {TASKS.map(t => (
          <Chip key={t.id} label={`${t.icon} ${t.label}`} sub={`${t.min} min`} on={picked.includes(t.id)}
            onPress={() => setPicked(p => (p.includes(t.id) ? p.filter(x => x !== t.id) : [...p, t.id]))} />
        ))}
      </View>
      {left === 0 ? <Result ok>Exactly 20 minutes. Ready to go!</Result> : null}
      {left < 0 ? <Result ok={false}>Too many things — drop one.</Result> : null}
    </View>
  );
}

// ─── Room: which looks longer? ────────────────────────────────────────────────
const PAIRS = [
  { a: { icon: '✏️', name: 'Pencil', len: 110, off: 50, color: C.sun }, b: { icon: '🥄', name: 'Spoon', len: 140, off: 0, color: C.faint } },
  { a: { icon: '🧣', name: 'Scarf', len: 190, off: 0, color: C.coral }, b: { icon: '📏', name: 'Ruler', len: 150, off: 60, color: C.teal } },
  { a: { icon: '🪥', name: 'Toothbrush', len: 120, off: 30, color: C.water }, b: { icon: '🥢', name: 'Chopstick', len: 160, off: 0, color: C.wood } },
];
function Room() {
  const [round, setRound] = useState(0);
  const [pick, setPick] = useState<'a' | 'b' | null>(null);
  const [shake, setShake] = useState(0);
  const pair = PAIRS[round % PAIRS.length];
  const right: 'a' | 'b' = pair.a.len > pair.b.len ? 'a' : 'b';
  const choose = (k: 'a' | 'b') => {
    if (pick) return;
    setPick(k);
    if (k === right) haptic.success(); else { haptic.nudge(); setShake(s => s + 1); }
  };
  const bar = (k: 'a' | 'b') => {
    const o = pair[k];
    const on = pick === k;
    return (
      <Tap a11y={o.name} onPress={() => choose(k)} style={{ minHeight: 56, justifyContent: 'center', borderRadius: 14, backgroundColor: on ? (k === right ? C.tealSoft : C.coralSoft) : 'transparent', paddingVertical: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: pick ? 0 : o.off }}>
          <View style={{ width: o.len, height: 22, borderRadius: 11, backgroundColor: o.color, justifyContent: 'center', paddingLeft: 8 }}>
            <Text style={{ fontSize: 13 }}>{o.icon}</Text>
          </View>
          <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: C.muted, marginLeft: 8 }}>{o.name}</Text>
        </View>
      </Tap>
    );
  };
  return (
    <View>
      <SpeakableText text="Which one is longer? Tap it." autoRead variant="bodySm" style={{ fontSize: 13, lineHeight: 18 }} />
      <Wobble trigger={shake}>
        <View style={{ marginTop: 6, borderLeftWidth: pick ? 3 : 0, borderLeftColor: C.coral, gap: 4 }}>
          {bar('a')}
          {bar('b')}
        </View>
      </Wobble>
      {pick ? (
        <>
          <Result ok={pick === right}>{pick === right ? `Yes! The ${pair[right].name} is longer.` : `Tricky! Lined up, the ${pair[right].name} is longer.`}</Result>
          <SpeakableText text="Line them up at the start to compare fairly." variant="bodySm" style={{ fontSize: 13, lineHeight: 18, marginTop: 6 }} />
          <ChunkyButton size="sm" label="Next pair →" color={C.ink} shadow={C.inkDeep} onPress={() => { setPick(null); setRound(r => r + 1); }} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
        </>
      ) : null}
    </View>
  );
}

// ─── Mission list ─────────────────────────────────────────────────────────────
const MISSIONS_AROUND = [
  { id: 'kitchen', icon: '🥣', title: 'Kitchen mission', line: 'We need half a cup. Which scoop gets us there?', bg: '#f6e1b0', Body: Kitchen },
  { id: 'shop', icon: '🛒', title: 'Shopping mission', line: 'You have ₹100. Fill the basket without going over.', bg: '#c7e8b8', Body: Shopping },
  { id: 'share', icon: '🍪', title: 'Sharing mission', line: 'Four friends, 12 snacks. Share them fairly.', bg: '#f6c9b8', Body: Sharing },
  { id: 'time', icon: '⏰', title: 'Time mission', line: 'We leave in 20 minutes. What can we finish first?', bg: '#d6cef2', Body: TimeMission },
  { id: 'room', icon: '📏', title: 'Room mission', line: 'Which object looks longer?', bg: '#bfe3ef', Body: Room },
];

// ─── Photo puzzle (sample photo, drag oranges into baskets) ───────────────────
const ORANGES = ['o0', 'o1', 'o2', 'o3', 'o4', 'o5'];
const ORANGE = '#f59a2e';

function Orange({ size = 38 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', bottom: 0, width: size, height: size * 0.92, borderRadius: size, backgroundColor: ORANGE, borderBottomWidth: 3, borderBottomColor: '#d27a17' }} />
      <View style={{ position: 'absolute', top: size * 0.2, left: size * 0.22, width: size * 0.2, height: size * 0.14, borderRadius: size, backgroundColor: 'rgba(255,255,255,.55)' }} />
      <View style={{ position: 'absolute', top: -2, left: size * 0.48, width: size * 0.3, height: size * 0.16, borderRadius: size, backgroundColor: C.grass, transform: [{ rotate: '-20deg' }] }} />
    </View>
  );
}

function Basket({ index, count }: { index: number; count: number }) {
  return (
    <DropZone id={`b${index}`} pad={10} style={{ flex: 1 }}>
      {hovered => <BasketBody hovered={hovered} count={count} />}
    </DropZone>
  );
}
function BasketBody({ hovered, count }: { hovered: Parameters<typeof useHoverStyle>[0]; count: number }) {
  const h = useHoverStyle(hovered, 'rgba(245,181,60,.45)');
  const full = count >= 2;
  return (
    <Animated.View style={[{ borderRadius: 18, padding: 4 }, h]}>
      <View style={{ height: 30, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 2, marginBottom: -12, zIndex: 2 }}>
        {Array.from({ length: count }, (_, k) => <Pop key={k}><Orange size={28} /></Pop>)}
      </View>
      <View style={{ height: 44, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: full ? C.wood : 'rgba(176,122,74,.55)', borderWidth: 3, borderStyle: full ? 'solid' : 'dashed', borderColor: full ? C.woodDeep : C.cream, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.cream }}>{count}/2</Text>
      </View>
    </Animated.View>
  );
}

function PhotoPuzzle({ onDragging }: { onDragging: (v: boolean) => void }) {
  const [where, setWhere] = useState<Record<string, number | null>>({});
  const [burst, setBurst] = useState(0);
  const counts = [0, 1, 2].map(b => ORANGES.filter(o => where[o] === b).length);
  const done = counts.every(c => c === 2);
  useEffect(() => {
    if (!done) return;
    setBurst(b => b + 1);
    haptic.success();
    say('3 baskets! 6 divided by 2 is 3.');
  }, [done]);

  const drop = (o: string) => (zone: string | null) => {
    onDragging(false);
    if (!zone) return 'ignore' as const;
    const b = Number(zone.slice(1));
    if (counts[b] >= 2) return 'reject' as const;
    setWhere(w => ({ ...w, [o]: b }));
    return 'accept' as const;
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 14 }}>
        <Bob amp={4}><Numi size={58} mood={done ? 'wow' : 'happy'} state={done ? 'celebrate' : 'speaking'} /></Bob>
        <SpeechBubble style={{ flex: 1 }}>
          {done ? '3 baskets! 6 ÷ 2 = 3 🎉' : 'I found 6 oranges! If we put 2 oranges into each basket, how many baskets could we make?'}
        </SpeechBubble>
      </View>

      <DropProvider>
        <View style={{ marginTop: 14, borderRadius: 22, overflow: 'hidden', backgroundColor: '#f3e3c7', borderWidth: 5, borderColor: C.cream }}>
          {/* wall + window */}
          <View style={{ position: 'absolute', right: 16, top: 90, width: 70, height: 46, borderRadius: 8, backgroundColor: C.sky, borderWidth: 4, borderColor: C.cream }} />
          <View style={{ position: 'absolute', left: 10, top: 10, backgroundColor: 'rgba(34,48,59,.75)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, zIndex: 3 }}>
            <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11, letterSpacing: 1, color: C.cream }}>📷 SAMPLE PHOTO</Text>
          </View>
          {/* basket overlays over the scene */}
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 40 }}>
            {[0, 1, 2].map(b => <Basket key={b} index={b} count={counts[b]} />)}
          </View>
          {/* table */}
          <View style={{ marginTop: 34, minHeight: 90, backgroundColor: C.wood, borderTopWidth: 10, borderTopColor: C.cookie, paddingHorizontal: 12, paddingBottom: 14 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: -30 }}>
              {ORANGES.map(o => (where[o] == null ? (
                <Draggable key={o} id={o} onDrop={drop(o)} onDragStart={() => onDragging(true)}>
                  <View style={{ padding: 4 }}><Orange /></View>
                </Draggable>
              ) : (
                <View key={o} style={{ width: 46, height: 46, opacity: 0.18, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 32, height: 10, borderRadius: 5, backgroundColor: C.woodShadow }} />
                </View>
              )))}
            </View>
          </View>
          <View style={{ position: 'absolute', left: '50%', top: 80 }}><Burst trigger={burst} dist={120} count={18} /></View>
        </View>
      </DropProvider>

      <SpeakableText
        text={done ? '3 baskets. 6 divided by 2 is 3.' : 'Drag the oranges into the baskets.'}
        autoRead
        showIcon={false}
        style={{ fontFamily: F.bodyHeavy, fontSize: 13, lineHeight: 18, letterSpacing: 1, color: C.sun, marginTop: 10 }}
      >
        {done ? '3 BASKETS · 6 ÷ 2 = 3' : 'DRAG THE ORANGES INTO THE BASKETS'}
      </SpeakableText>
      {Object.keys(where).length > 0 ? (
        <ChunkyButton size="sm" label="Try again" color="rgba(253,245,232,.16)" shadow="rgba(0,0,0,.25)" onPress={() => setWhere({})} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
      ) : null}
    </View>
  );
}

export default function AroundMe() {
  const nav = useNavigation();
  const cameraAllowed = useGame(s => s.settings.cameraAllowed);
  const [open, setOpen] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <Screen bg={C.sand}>
      <TopBar back="← Back" title="MATH AROUND ME" />
      <ScrollView scrollEnabled={!dragging} style={{ flex: 1, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <SpeakableText text="Math exists outside school" variant="h2" style={{ marginTop: 12 }} />
        <SpeakableText text="Missions in your own house. Tap one to try it." autoRead variant="bodySm" style={{ fontSize: 13, lineHeight: 18, marginTop: 4 }} />

        <View style={{ gap: 10, marginTop: 14 }}>
          {MISSIONS_AROUND.map((m, i) => {
            const on = open === m.id;
            const Body = m.Body;
            return (
              <Enter key={m.id} delay={80 + i * 70}>
                <View style={{ backgroundColor: C.cream, borderRadius: 24, borderBottomWidth: 5, borderBottomColor: 'rgba(34,48,59,.1)', overflow: 'hidden' }}>
                  <Tap onPress={() => setOpen(on ? null : m.id)} a11y={`${m.title}. ${m.line}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14 }}>
                    <View style={{ width: 54, height: 54, borderRadius: 17, backgroundColor: m.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 24 }}>{m.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 15, color: C.ink }}>{m.title}</Text>
                      <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted, marginTop: 2 }}>{m.line}</Text>
                    </View>
                    <SpeakButton text={`${m.title}. ${m.line}`} style={{ width: 34, height: 34, borderRadius: 17 }} />
                    <Text style={{ fontFamily: F.display, fontSize: 20, color: C.faint }}>{on ? '–' : '+'}</Text>
                  </Tap>
                  {on ? (
                    <Enter dy={8} style={{ paddingHorizontal: 14, paddingBottom: 16, borderTopWidth: 2, borderTopColor: C.sandLine, paddingTop: 12 }}>
                      <Body />
                    </Enter>
                  ) : null}
                </View>
              </Enter>
            );
          })}
        </View>

        {/* camera card */}
        <Enter delay={500} style={{ marginTop: 14 }}>
          <View style={{ backgroundColor: C.ink, borderRadius: 26, padding: 16, borderBottomWidth: 6, borderBottomColor: C.inkDeep }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: 'rgba(253,245,232,.14)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>{cameraAllowed ? '📷' : '🔒'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 18, lineHeight: 21, color: C.cream }}>Find Math Around You 📷</Text>
                <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: 'rgba(253,245,232,.62)', marginTop: 2 }}>
                  {cameraAllowed ? 'Spot the math in a picture.' : 'Ask a grown-up to turn this on.'}
                </Text>
              </View>
              <SpeakButton
                dark
                text={`Find math around you. ${cameraAllowed ? 'Spot the math in a picture.' : 'Ask a grown-up to turn this on.'}`}
                style={{ width: 34, height: 34, borderRadius: 17 }}
              />
            </View>

            {cameraAllowed ? (
              <PhotoPuzzle onDragging={setDragging} />
            ) : (
              <ChunkyButton label="Ask a grown-up" size="md" color={C.sun} shadow={C.sunDeep} textColor={C.ink} icon="🔑"
                onPress={() => nav.navigate('ParentGate', { target: 'Parent' })} style={{ marginTop: 14 }} />
            )}

            <Eyebrow color="rgba(253,245,232,.5)" style={{ marginTop: 14, letterSpacing: 0.4, fontSize: 11.5 }}>
              Photos stay on this device. Grown-ups control the camera.
            </Eyebrow>
          </View>
        </Enter>
      </ScrollView>
    </Screen>
  );
}
