// Teacher dashboard: class-level insight with no rankings and no public places.
import React, { PropsWithChildren, useEffect, useState } from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Enter, Pop } from '../../components/motion';
import { Eyebrow, ProgressBar, Screen, Tap, Txt } from '../../components/ui';
import { RootScreen } from '../../navigation/types';
import { haptic } from '../../services/feedback';
import { useGame } from '../../store/game';
import { C, F, M } from '../../theme/tokens';

function ProCard({ children, style, delay = 0 }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; delay?: number }>) {
  return (
    <Enter delay={delay} style={[{ backgroundColor: C.proCard, borderRadius: 22, padding: 16, marginTop: 12 }, style]}>
      {children}
    </Enter>
  );
}

const CLASS_SKILLS = [
  { name: 'Addition', pct: 91, tone: C.teal },
  { name: 'Subtraction', pct: 82, tone: C.teal },
  { name: 'Multiplication', pct: 63, tone: C.sun },
  { name: 'Division', pct: 44, tone: C.coral },
];

const INSIGHTS = [
  {
    text: '9 learners are still building equal grouping — division still reads as "take away" to them.',
    tone: C.coral,
    activity: 'Share 12 counters onto 3 plates together, saying "one for you, one for you" out loud. Then write it as 12 ÷ 3.',
  },
  {
    text: '6 learners solve multiplication visually but stall when the same fact is written as an equation.',
    tone: C.sun,
    activity: 'Build an array with blocks, then write the matching equation right underneath it. Swap: equation first, array second.',
  },
  {
    text: 'Most of the class has mastered addition within 20. Safe to move on.',
    tone: C.teal,
    activity: 'Try a two-digit "Make a Ten" warm-up (28 + 7) to bridge into addition to 100.',
  },
  {
    text: '5 learners ask for hints as soon as regrouping appears — worth a small-group session.',
    tone: C.violet,
    activity: 'Small group with base-ten blocks: trade 10 ones for a ten, narrating each trade before any written method.',
  },
];

const STRUGGLES = [
  { label: 'Sharing into equal groups', n: 9 },
  { label: 'Arrays written as equations', n: 6 },
  { label: 'Regrouping in subtraction', n: 5 },
  { label: 'Comparing fractions with different sizes', n: 4 },
];

const HINTS = [
  { label: 'Solved without hints', pct: 46, tone: C.teal },
  { label: '1–2 gentle hints', pct: 38, tone: C.sun },
  { label: 'Guided step-by-step', pct: 16, tone: C.violet },
];

const STRAT_TAGS = [
  { label: 'Make a Ten · 22 learners', bg: '#e9f5f1', fg: C.tealDeep },
  { label: 'Count On · 19', bg: '#e9f5f1', fg: C.tealDeep },
  { label: 'Skip Counting · 11', bg: C.sunSoft, fg: '#9a7a1a' },
  { label: 'Equal Groups · 7', bg: C.coralSoft, fg: C.coralDeep },
  { label: 'Break Apart · 4', bg: C.violetSoft, fg: C.violetDeep },
];

const ACTIVITY = [
  { who: 'Maya', what: 'discovered Make a Ten', when: '2m ago', icon: '🧠' },
  { who: 'Leo', what: 'fixed the Broken Bridge', when: '6m ago', icon: '🌉' },
  { who: 'Aisha', what: 'self-corrected on 12 ÷ 4', when: '11m ago', icon: '💡' },
  { who: 'Sam', what: 'explained Equal Groups out loud', when: '18m ago', icon: '🎙' },
  { who: 'Priya', what: 'powered up the Space Station', when: '25m ago', icon: '🚀' },
];

type State = 'Mastered' | 'Developing' | 'Needs support';
const STATE_TONE: Record<State, { fg: string; bg: string }> = {
  'Mastered': { fg: C.tealDeep, bg: C.tealSoft },
  'Developing': { fg: '#9a7a1a', bg: C.sunSoft },
  'Needs support': { fg: C.coralDeep, bg: C.coralSoft },
};
const AVATAR_TONES = [C.violet, C.teal, C.coral, C.water, C.sunDeep, C.hillDeep];

const LEARNERS = ([
  { name: 'Maya', state: 'Developing', focus: 'Division with groups' },
  { name: 'Leo', state: 'Mastered', focus: 'Addition to 20' },
  { name: 'Aisha', state: 'Developing', focus: 'Multiplication arrays' },
  { name: 'Sam', state: 'Needs support', focus: 'Equal sharing' },
  { name: 'Priya', state: 'Mastered', focus: 'Subtraction' },
  { name: 'Jonah', state: 'Developing', focus: 'Regrouping' },
  { name: 'Ellie', state: 'Needs support', focus: 'Number bonds' },
  { name: 'Ravi', state: 'Mastered', focus: 'Skip counting' },
] as { name: string; state: State; focus: string }[]).sort((a, b) => a.name.localeCompare(b.name)); // alphabetical — never by score

function Insight({ text, tone, activity, i }: { text: string; tone: string; activity: string; i: number }) {
  const [open, setOpen] = useState(false);
  const v = useSharedValue(0);
  useEffect(() => { v.value = withSpring(open ? 1 : 0, M.spring); }, [open]);
  const chev = useAnimatedStyle(() => ({ transform: [{ rotate: `${v.value * 90}deg` }] }));
  return (
    <Enter delay={180 + i * 70}>
      <Tap onPress={() => setOpen(o => !o)} a11y={`${text} ${open ? 'Hide' : 'Show'} suggested activity`} style={{ flexDirection: 'row', gap: 11 }}>
        <View style={{ width: 6, borderRadius: 3, backgroundColor: tone }} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Text style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 13, lineHeight: 20, color: C.ink }}>{text}</Text>
            <Animated.View style={chev}>
              <Text style={{ fontFamily: F.bodyHeavy, fontSize: 15, color: C.faint }}>›</Text>
            </Animated.View>
          </View>
          {open ? (
            <Enter dy={6} style={{ backgroundColor: C.proBg, borderRadius: 12, padding: 10, marginTop: 8 }}>
              <Text style={{ fontFamily: F.bodyHeavy, fontSize: 10.5, letterSpacing: 1, color: tone }}>SUGGESTED ACTIVITY</Text>
              <Text style={{ fontFamily: F.body, fontSize: 12.5, lineHeight: 18, color: C.ink, marginTop: 3 }}>{activity}</Text>
            </Enter>
          ) : null}
        </View>
      </Tap>
    </Enter>
  );
}

export default function Teacher({ navigation }: RootScreen<'Teacher'>) {
  const classPower = useGame(s => s.classPower);

  return (
    <Screen scroll bg={C.proBg}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flexShrink: 1 }}>
          <Eyebrow>TEACHER · CLASS 3B</Eyebrow>
          <Txt variant="h2" style={{ marginTop: 4 }} accessibilityRole="header">28 learners</Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {navigation.canGoBack() ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => { haptic.tap(); navigation.goBack(); }}
              style={{ backgroundColor: C.proLine, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 13 }}
            >
              <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12.5, color: C.ink }}>Close</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => { haptic.tap(); navigation.navigate('Learner'); }}
            style={{ backgroundColor: C.ink, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 13 }}
          >
            <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12.5, color: C.cream }}>Learners</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <Pop>
          <View style={{ backgroundColor: C.proCard, borderRadius: 13, paddingVertical: 7, paddingHorizontal: 11, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Text style={{ fontFamily: F.bodyHeavy, fontSize: 10.5, letterSpacing: 1, color: C.faint }}>CLASS CODE</Text>
            <Text style={{ fontFamily: F.display, fontSize: 15, color: C.violetDeep, letterSpacing: 1 }}>SKY-482</Text>
          </View>
        </Pop>
        <Text style={{ fontFamily: F.bodyBold, fontSize: 11.5, color: C.muted }}>No ranking, no places.</Text>
      </View>

      {/* class mastery */}
      <ProCard style={{ marginTop: 14 }}>
        <Eyebrow>CLASS MASTERY</Eyebrow>
        <View style={{ gap: 11, marginTop: 13 }}>
          {CLASS_SKILLS.map((s, i) => (
            <Enter key={s.name} delay={i * 80}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12.5, color: C.ink }}>{s.name}</Text>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12.5, color: s.tone }}>{s.pct}%</Text>
              </View>
              <ProgressBar value={s.pct / 100} height={10} track={C.proLine} colors={[s.tone]} delay={i * 100} style={{ marginTop: 6 }} />
            </Enter>
          ))}
        </View>
      </ProCard>

      {/* class mission */}
      <ProCard delay={60}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Eyebrow>CLASS MISSION</Eyebrow>
          <Text style={{ fontFamily: F.display, fontSize: 18, color: C.violet }}>{classPower}%</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <Text style={{ fontSize: 28 }}>🚀</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 18, lineHeight: 22, color: C.ink }}>Save the Space Station</Text>
            <Text style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 1 }}>Every learner's missions add power together</Text>
          </View>
        </View>
        <ProgressBar value={classPower / 100} height={12} track={C.proLine} colors={[C.violet, C.teal]} delay={200} style={{ marginTop: 12 }} />
        <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.tealDeep, marginTop: 10 }}>Your class solved 84 math challenges together!</Text>
      </ProCard>

      {/* what to teach next */}
      <ProCard delay={120}>
        <Eyebrow>WHAT TO TEACH NEXT</Eyebrow>
        <Text style={{ fontFamily: F.body, fontSize: 11.5, color: C.faint, marginTop: 2 }}>Tap an insight for a suggested activity</Text>
        <View style={{ gap: 12, marginTop: 12 }}>
          {INSIGHTS.map((ins, i) => <Insight key={i} i={i} {...ins} />)}
        </View>
      </ProCard>

      {/* common struggles */}
      <ProCard delay={160}>
        <Eyebrow>COMMON STRUGGLES</Eyebrow>
        <View style={{ marginTop: 8 }}>
          {STRUGGLES.map((s, i) => (
            <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: C.proLine }}>
              <Text style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 13, color: C.ink }}>{s.label}</Text>
              <View style={{ backgroundColor: C.coralSoft, borderRadius: 10, paddingVertical: 4, paddingHorizontal: 9 }}>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11.5, color: C.coralDeep }}>{s.n} learners</Text>
              </View>
            </View>
          ))}
        </View>
      </ProCard>

      {/* hint dependency */}
      <ProCard delay={200}>
        <Eyebrow>HINT DEPENDENCY</Eyebrow>
        <View style={{ gap: 10, marginTop: 12 }}>
          {HINTS.map((h, i) => (
            <View key={h.label}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: F.bodyBold, fontSize: 12.5, color: C.ink }}>{h.label}</Text>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12.5, color: C.muted }}>{h.pct}%</Text>
              </View>
              <ProgressBar value={h.pct / 100} height={8} track={C.proLine} colors={[h.tone]} delay={250 + i * 100} style={{ marginTop: 5 }} />
            </View>
          ))}
        </View>
      </ProCard>

      {/* strategies */}
      <ProCard delay={240}>
        <Eyebrow>STRATEGIES IN USE THIS WEEK</Eyebrow>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {STRAT_TAGS.map((t, i) => (
            <Pop key={t.label} delay={300 + i * 60}>
              <View style={{ backgroundColor: t.bg, borderRadius: 14, paddingVertical: 9, paddingHorizontal: 12 }}>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11.5, color: t.fg }}>{t.label}</Text>
              </View>
            </Pop>
          ))}
        </View>
      </ProCard>

      {/* recent activity */}
      <ProCard delay={280}>
        <Eyebrow>RECENT ACTIVITY</Eyebrow>
        <View style={{ marginTop: 6 }}>
          {ACTIVITY.map((a, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: C.proLine }}>
              <Text style={{ fontSize: 16 }}>{a.icon}</Text>
              <Text style={{ flex: 1, fontFamily: F.body, fontSize: 13, color: C.ink }}>
                <Text style={{ fontFamily: F.bodyHeavy }}>{a.who}</Text> {a.what}
              </Text>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.faint }}>{a.when}</Text>
            </View>
          ))}
        </View>
      </ProCard>

      {/* learners */}
      <ProCard delay={320}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Eyebrow>LEARNERS · A–Z</Eyebrow>
          <Text style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.faint }}>No ranking, no places.</Text>
        </View>
        <View style={{ marginTop: 6 }}>
          {LEARNERS.map((l, i) => {
            const t = STATE_TONE[l.state];
            return (
              <Tap
                key={l.name}
                a11y={`${l.name}, ${l.state}. Open learner view`}
                onPress={() => navigation.navigate('Learner')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: C.proLine }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: AVATAR_TONES[i % AVATAR_TONES.length], alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: F.display, fontSize: 17, lineHeight: 22, color: C.cream }}>{l.name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bodyHeavy, fontSize: 14, color: C.ink }}>{l.name}</Text>
                  <Text style={{ fontFamily: F.body, fontSize: 11.5, color: C.muted }}>{l.focus}</Text>
                </View>
                <View style={{ backgroundColor: t.bg, borderRadius: 11, paddingVertical: 5, paddingHorizontal: 9 }}>
                  <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11, color: t.fg }}>{l.state}</Text>
                </View>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 16, color: C.faint }}>›</Text>
              </Tap>
            );
          })}
        </View>
      </ProCard>

      <Text style={{ fontFamily: F.body, fontSize: 11, color: C.faint, textAlign: 'center', marginTop: 18 }}>
        Learner data is private to this class. Nothing is shared publicly.
      </Text>
    </Screen>
  );
}
