// Strategy Book — the ways of thinking the explorer has discovered, each with a tiny living demo.
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { Enter, Pop, useLoop } from '../../components/motion';
import { SpeakableText, SpeakButton } from '../../components/Storyteller';
import { Eyebrow, Screen, Tap, TopBar } from '../../components/ui';
import { MissionId, MISSIONS, STRATEGIES, StrategyId } from '../../data/world';
import { useGame } from '../../store/game';
import { C, F } from '../../theme/tokens';

const HINTS: Record<StrategyId, { text: string; mission: MissionId }> = {
  'make-ten': { text: 'Hiding at the Broken Bridge', mission: 'bridge' },
  double: { text: 'Look in the carrot rows', mission: 'farm' },
  'count-on': { text: 'Hop along at the bridge', mission: 'bridge' },
  break: { text: 'Crack the Cookie Case', mission: 'mystery' },
  groups: { text: 'Share at the Fair Picnic', mission: 'picnic' },
  jump: { text: 'Try the river crossing', mission: 'bridge' },
  skip: { text: 'Count coins at the market', mission: 'market' },
  estimate: { text: 'Ask Nova before launch', mission: 'boss' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (ts: number) => { const d = new Date(ts); return `${MONTHS[d.getMonth()]} ${d.getDate()}`; };

const Block = ({ color, size = 9 }: { color: string; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: 2, backgroundColor: color }} />
);

// ─── Tiny demos ───────────────────────────────────────────────────────────────
function MakeTen() {
  const v = useLoop(1300);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(v.value, [0, 1], [14, 0]) }, { translateY: interpolate(v.value, [0, 1], [-8, 0]) }] }));
  return (
    <View style={{ flexDirection: 'row', gap: 1.5, alignItems: 'center' }}>
      {Array.from({ length: 8 }, (_, i) => <Block key={i} color={C.teal} />)}
      <Animated.View style={[{ flexDirection: 'row', gap: 1.5 }, slide]}>
        <Block color={C.sun} /><Block color={C.sun} />
      </Animated.View>
    </View>
  );
}

function DoubleIt() {
  const v = useLoop(1200);
  const grow = useAnimatedStyle(() => ({ transform: [{ scaleY: interpolate(v.value, [0, 1], [0.15, 1]) }], opacity: interpolate(v.value, [0, 1], [0.4, 1]) }));
  const stack = (color: string) => Array.from({ length: 3 }, (_, i) => <Block key={i} color={color} size={11} />);
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
      <View style={{ gap: 2 }}>{stack(C.coral)}</View>
      <Animated.View style={[{ gap: 2, transformOrigin: 'bottom center' }, grow]}>{stack(C.coral)}</Animated.View>
    </View>
  );
}

function CountOn() {
  const v = useLoop(2400, { yoyo: false });
  const hop = useAnimatedStyle(() => {
    const t = v.value * 4;
    const step = Math.floor(t);
    const f = t - step;
    return { transform: [{ translateX: (step + f) * 20 }, { translateY: -Math.sin(f * Math.PI) * 10 }] };
  });
  return (
    <View style={{ width: 92, height: 26, justifyContent: 'flex-end' }}>
      <View style={{ height: 2, backgroundColor: C.sandDeep }} />
      {Array.from({ length: 5 }, (_, i) => <View key={i} style={{ position: 'absolute', left: i * 20 + 3, bottom: -3, width: 2, height: 8, backgroundColor: C.sandDeep }} />)}
      <Animated.View style={[{ position: 'absolute', left: 0, bottom: 3, width: 8, height: 8, borderRadius: 4, backgroundColor: C.coral }, hop]} />
    </View>
  );
}

function BreakApart() {
  const v = useLoop(1400);
  const right = useAnimatedStyle(() => ({ transform: [{ translateX: 8 * v.value }] }));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 1.5 }}>{Array.from({ length: 10 }, (_, i) => <Block key={i} color={C.violet} size={7} />)}</View>
      <Animated.View style={[{ flexDirection: 'row', gap: 1.5, marginLeft: 1.5 }, right]}><Block color={C.sun} size={7} /><Block color={C.sun} size={7} /></Animated.View>
    </View>
  );
}

function GroupCircle({ delay }: { delay: number }) {
  const v = useLoop(900, { delay });
  const a = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.14 * v.value }] }));
  return (
    <Animated.View style={[{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: C.water, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 2, padding: 3 }, a]}>
      {[0, 1, 2].map(i => <View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.water }} />)}
    </Animated.View>
  );
}
function EqualGroups() {
  return <View style={{ flexDirection: 'row', gap: 6 }}>{[0, 1, 2].map(i => <GroupCircle key={i} delay={i * 200} />)}</View>;
}

function NumberJump() {
  const v = useLoop(2100, { yoyo: false, easing: Easing.linear });
  const dot = useAnimatedStyle(() => ({ transform: [{ translateX: v.value * 84 }, { translateY: -Math.abs(Math.sin(v.value * Math.PI * 3)) * 14 }] }));
  return (
    <View style={{ width: 92, height: 26, justifyContent: 'flex-end' }}>
      {[0, 1, 2].map(i => (
        <View key={i} style={{ position: 'absolute', left: i * 28 + 4, bottom: 2, width: 28, height: 14, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderWidth: 1.5, borderBottomWidth: 0, borderColor: C.faint, borderStyle: 'dashed' }} />
      ))}
      <View style={{ height: 2, backgroundColor: C.sandDeep }} />
      <Animated.View style={[{ position: 'absolute', left: 0, bottom: 1, width: 8, height: 8, borderRadius: 4, backgroundColor: C.teal }, dot]} />
    </View>
  );
}

function SkipNum({ n, i }: { n: number; i: number }) {
  const v = useLoop(2400, { yoyo: false, easing: Easing.linear });
  const a = useAnimatedStyle(() => {
    const start = i * 0.25;
    const on = v.value >= start ? 1 : 0;
    const p = Math.min(1, (v.value - start) / 0.12);
    return { opacity: on, transform: [{ scale: on ? 0.6 + 0.4 * Math.max(0, p) : 0.6 }] };
  });
  return <Animated.View style={a}><Text style={{ fontFamily: F.display, fontSize: 15, color: C.sunDeep }}>{n}</Text></Animated.View>;
}
function SkipCounting() {
  return <View style={{ flexDirection: 'row', gap: 8 }}>{[5, 10, 15].map((n, i) => <SkipNum key={n} n={n} i={i} />)}</View>;
}

function Estimate() {
  const v = useLoop(1600);
  const fill = useAnimatedStyle(() => ({ height: `${20 + v.value * 60}%` }));
  const mark = useAnimatedStyle(() => ({ opacity: 0.4 + 0.6 * v.value }));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 22, height: 26, borderRadius: 6, borderWidth: 2, borderColor: C.faint, overflow: 'hidden', justifyContent: 'flex-end' }}>
        <Animated.View style={[{ backgroundColor: C.coral, opacity: 0.8 }, fill]} />
      </View>
      <Animated.View style={mark}><Text style={{ fontFamily: F.display, fontSize: 15, color: C.ink }}>≈ 20</Text></Animated.View>
    </View>
  );
}

const DEMOS: Record<StrategyId, () => React.JSX.Element> = {
  'make-ten': MakeTen, double: DoubleIt, 'count-on': CountOn, break: BreakApart,
  groups: EqualGroups, jump: NumberJump, skip: SkipCounting, estimate: Estimate,
};

export default function StrategyBook() {
  const nav = useNavigation();
  const found = useGame(s => s.strategies);
  const count = STRATEGIES.filter(s => found[s.id]).length;

  return (
    <Screen scroll bg={C.sand}>
      <TopBar back="← Back" title="STRATEGY BOOK" />
      <SpeakableText text="Ways of thinking you found" variant="h2" style={{ marginTop: 12 }} />
      <SpeakableText
        text="Tap a card to hear what the strategy means."
        autoRead
        style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted, marginTop: 4 }}
      />

      <Enter delay={80} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, backgroundColor: C.cream, borderRadius: 22, padding: 14 }}>
        <Text style={{ fontFamily: F.display, fontSize: 30, lineHeight: 34, color: C.teal }}>{count}</Text>
        <View style={{ flex: 1 }}>
          <SpeakableText
            text={`${count} of 8 discovered. Strategies unlock by playing or explaining, never by buying.`}
            style={{ fontFamily: F.bodyBold, fontSize: 13, lineHeight: 19, color: C.muted }}
          >
            of 8 discovered — strategies unlock by playing or explaining, never by buying.
          </SpeakableText>
        </View>
      </Enter>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, marginTop: 8 }}>
        {STRATEGIES.map((s, i) => {
          const at = found[s.id];
          const Demo = DEMOS[s.id];
          const hint = HINTS[s.id];
          return (
            <Pop key={s.id} delay={140 + i * 55} from={0.6} style={{ width: '50%', padding: 5 }}>
              {at ? (
                <View style={{ backgroundColor: C.cream, borderRadius: 22, padding: 14, minHeight: 196, borderBottomWidth: 5, borderBottomColor: 'rgba(34,48,59,.12)' }}>
                  <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: F.display, fontSize: 15, color: C.cream }}>{s.icon}</Text>
                  </View>
                  <SpeakableText
                    text={`${s.name}. ${s.desc}`}
                    showIcon={false}
                    style={{ fontFamily: F.display, fontSize: 16, lineHeight: 19, color: C.ink, marginTop: 9 }}
                  >
                    {s.name}
                  </SpeakableText>
                  <View style={{ height: 40, justifyContent: 'center', marginTop: 4 }}><Demo /></View>
                  <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted }}>{s.desc}</Text>
                  <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11.5, color: C.tealDeep, marginTop: 8 }}>FOUND {fmtDate(at).toUpperCase()}</Text>
                </View>
              ) : (
                <Tap onPress={() => nav.navigate('Mission', { mission: hint.mission })} a11y={`${s.name}, not found yet. ${hint.text}`}>
                  <View style={{ backgroundColor: 'rgba(253,245,232,.45)', borderRadius: 22, padding: 14, minHeight: 196, borderWidth: 2, borderStyle: 'dashed', borderColor: C.sandDeep }}>
                    <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: '#bdb4a4', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: F.display, fontSize: 18, color: C.cream }}>?</Text>
                    </View>
                    <Text style={{ fontFamily: F.display, fontSize: 16, lineHeight: 19, color: C.lockedInk, marginTop: 9 }}>{s.name}</Text>
                    <SpeakButton
                      text={`${s.name}. Not found yet. ${hint.text}.`}
                      style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16 }}
                    />
                    <View style={{ flex: 1 }} />
                    <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted }}>🔍 {hint.text}</Text>
                    <Eyebrow style={{ fontSize: 11.5, marginTop: 8 }}>NOT YET · {MISSIONS[hint.mission].title.toUpperCase()} →</Eyebrow>
                  </View>
                </Tap>
              )}
            </Pop>
          );
        })}
      </View>
    </Screen>
  );
}
