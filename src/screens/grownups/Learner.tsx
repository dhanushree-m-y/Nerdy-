// Individual learner view: how one child learns, not how they rank.
import React, { PropsWithChildren } from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { Bob, Enter, Pop } from '../../components/motion';
import { Eyebrow, ProgressBar, Screen, TopBar, Txt } from '../../components/ui';
import { SKILLS, STRATEGIES } from '../../data/world';
import { HintKind, interpret, Interpretation, REPRESENTATION_LADDER, Representation } from '../../learning/engine';
import { RootScreen } from '../../navigation/types';
import { useGame } from '../../store/game';
import { C, F } from '../../theme/tokens';

function ProCard({ children, style, delay = 0 }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; delay?: number }>) {
  return (
    <Enter delay={delay} style={[{ backgroundColor: C.proCard, borderRadius: 22, padding: 16, marginTop: 12 }, style]}>
      {children}
    </Enter>
  );
}

const MASTERY = [
  { name: 'Addition', state: 'Mastered', pct: 94, tone: C.teal },
  { name: 'Subtraction', state: 'Developing', pct: 71, tone: C.sun },
  { name: 'Multiplication', state: 'Developing', pct: 62, tone: C.sun },
  { name: 'Division', state: 'Needs support', pct: 38, tone: C.coral },
];

const PATTERNS = [
  { label: 'Preferred representation', value: 'Groups & arrays', tone: C.tealDeep },
  { label: 'Average hints per mission', value: '1.4', tone: C.ink },
  { label: 'Self-corrected without help', value: '6 of 9 times', tone: C.tealDeep },
  { label: 'Confidence vs accuracy', value: 'Under-rates herself', tone: C.violet },
];

const MISTAKES = [
  'Treats 12 ÷ 4 as "take away 4" instead of sharing into 4 groups',
  'Counts from the smaller number when adding (3 + 9)',
  'Skips a row when an array is written as an equation',
];

const REP_LABEL: Record<Representation, { label: string; icon: string }> = {
  symbolic: { label: 'Symbolic', icon: '✏️' },
  numberLine: { label: 'Number line', icon: '📏' },
  blocks: { label: 'Blocks', icon: '🧱' },
  groups: { label: 'Groups', icon: '⁘' },
  voice: { label: 'Voice', icon: '🎙' },
};

const HINT_LABEL: Record<HintKind, string> = {
  gentle: 'gentle hint', visual: 'visual hint', strategy: 'strategy hint', guided: 'guided steps', demo: 'demo',
};

// Confidence (face) over accuracy (height) for the last 5 missions.
const CONF_POINTS = [
  { face: '😟', acc: 0.9, label: 'Mon' },
  { face: '😐', acc: 0.85, label: 'Tue' },
  { face: '😟', acc: 0.95, label: 'Wed' },
  { face: '🙂', acc: 0.8, label: 'Thu' },
  { face: '😄', acc: 0.92, label: 'Fri' },
];

const verdictTone = (v: string) => (v === 'GOOD' ? { fg: C.tealDeep, bg: C.tealSoft } : v === 'NEEDS SUPPORT' ? { fg: C.coralDeep, bg: C.coralSoft } : { fg: '#9a7a1a', bg: C.sunSoft });

function Verdict({ k, v }: { k: string; v: string }) {
  const t = verdictTone(v);
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, borderRadius: 14, paddingVertical: 9, paddingHorizontal: 8, alignItems: 'center' }}>
      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 10, letterSpacing: 1, color: C.muted }}>{k.toUpperCase()}</Text>
      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11.5, color: t.fg, marginTop: 2, textAlign: 'center' }}>{v}</Text>
    </View>
  );
}

export default function Learner({ navigation }: RootScreen<'Learner'>) {
  const signals = useGame(s => s.signals);
  const strategies = useGame(s => s.strategies);

  const last = signals[signals.length - 1];
  let latest: { challenge: string; detail: string; result: Interpretation };
  if (last) {
    const wrongOrRight = last.attempts.map(a => a.value).filter(Boolean);
    const stratName = last.strategy ? STRATEGIES.find(s => s.id === last.strategy)?.name : null;
    const bits = [
      wrongOrRight.length ? `Attempts ${wrongOrRight.join(', ')}` : null,
      last.longestPauseMs > 3000 ? `paused ${Math.round(last.longestPauseMs / 1000)}s` : null,
      last.hints.length ? last.hints.map(h => HINT_LABEL[h]).join(', ') : 'no hints',
      stratName,
    ].filter(Boolean);
    latest = { challenge: `${last.challenge} · ${SKILLS[last.skill].name}`, detail: bits.join(' · '), result: interpret(last) };
  } else {
    latest = {
      challenge: '8 + 7',
      detail: 'Attempts 12, 13, 15 · paused 18s · visual hint · Make a Ten',
      result: { concept: 'GOOD', strategy: 'GOOD', fluency: 'NEEDS PRACTICE', note: 'Changed strategy and self-corrected.' },
    };
  }

  const discovered = STRATEGIES.filter(s => strategies[s.id]).map(s => s.name);
  const stratChips = Array.from(new Set([...discovered, 'Make a Ten', 'Count On', 'Equal Groups']));

  return (
    <Screen scroll bg={C.proBg}>
      <TopBar back="← Class" title="LEARNER VIEW" onBack={() => navigation.goBack()} />

      <Enter delay={40} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 14 }}>
        <Pop>
          <View style={{ width: 56, height: 56, borderRadius: 19, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.display, fontSize: 22, lineHeight: 28, color: C.cream }}>M</Text>
          </View>
        </Pop>
        <View style={{ flex: 1 }}>
          <Txt variant="h2" accessibilityRole="header">Maya</Txt>
          <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.muted, marginTop: 2 }}>Explorer 2 · 14 sessions · 4.6 min average</Text>
        </View>
      </Enter>

      {/* mastery grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 9, marginTop: 14 }}>
        {MASTERY.map((m, i) => (
          <Enter key={m.name} delay={80 + i * 60} style={{ width: '48.5%' }}>
            <View style={{ backgroundColor: C.proCard, borderRadius: 20, padding: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: C.ink }}>{m.name}</Text>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12, color: C.faint }}>{m.pct}</Text>
              </View>
              <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11.5, color: m.tone, marginTop: 4 }}>{m.state}</Text>
              <ProgressBar value={m.pct / 100} height={8} track={C.proLine} colors={[m.tone]} delay={150 + i * 100} style={{ marginTop: 9 }} />
            </View>
          </Enter>
        ))}
      </View>

      {/* latest challenge */}
      <ProCard delay={200}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Eyebrow>LATEST CHALLENGE</Eyebrow>
          {!last ? <Text style={{ fontFamily: F.bodyBold, fontSize: 10.5, color: C.faint }}>sample</Text> : null}
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 24, lineHeight: 28, color: C.ink, marginTop: 6 }}>{latest.challenge}</Text>
        <Text style={{ fontFamily: F.body, fontSize: 12.5, lineHeight: 18, color: C.muted, marginTop: 2 }}>{latest.detail}</Text>
        <View style={{ flexDirection: 'row', gap: 7, marginTop: 12 }}>
          <Verdict k="Concept" v={latest.result.concept} />
          <Verdict k="Strategy" v={latest.result.strategy} />
          <Verdict k="Fluency" v={latest.result.fluency} />
        </View>
        {latest.result.note ? (
          <Text style={{ fontFamily: F.bodyBold, fontSize: 12.5, color: C.tealDeep, marginTop: 10 }}>{latest.result.note}</Text>
        ) : null}
      </ProCard>

      {/* observation + support */}
      <ProCard delay={240}>
        <Eyebrow>LEARNING OBSERVATION</Eyebrow>
        <Text style={{ fontFamily: F.bodyBold, fontSize: 14, lineHeight: 22, color: C.ink, marginTop: 9 }}>
          Maya is strong when multiplication is shown as groups and arrays, and takes longer when the same fact appears as a bare equation.
        </Text>
        <View style={{ height: 2, backgroundColor: C.proLine, marginVertical: 14 }} />
        <Eyebrow>SUGGESTED SUPPORT</Eyebrow>
        <Text style={{ fontFamily: F.bodyBold, fontSize: 13.5, lineHeight: 21, color: C.tealDeep, marginTop: 8 }}>
          Start with visual arrays, then move back to equations in the same session.
        </Text>
      </ProCard>

      {/* representation ladder */}
      <ProCard delay={280}>
        <Eyebrow>REPRESENTATION LADDER</Eyebrow>
        <Text style={{ fontFamily: F.body, fontSize: 11.5, color: C.faint, marginTop: 2 }}>Abstract → concrete · what works best for Maya</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginTop: 14 }}>
          {REPRESENTATION_LADDER.map((r, i) => {
            const best = r === 'groups';
            const step = (
              <View style={{ alignItems: 'center', gap: 5 }}>
                <View
                  style={{
                    width: '100%', height: 30 + i * 9, borderRadius: 12,
                    backgroundColor: best ? C.teal : C.proBg,
                    borderWidth: best ? 0 : 1.5, borderColor: C.proLine,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 16, color: best ? C.white : C.ink }}>{REP_LABEL[r].icon}</Text>
                </View>
                <Text numberOfLines={1} style={{ fontFamily: best ? F.bodyHeavy : F.bodyBold, fontSize: 10, color: best ? C.tealDeep : C.muted }}>
                  {REP_LABEL[r].label}
                </Text>
              </View>
            );
            return (
              <Enter key={r} delay={320 + i * 60} style={{ flex: 1 }}>
                {best ? <Bob amp={3}>{step}</Bob> : step}
              </Enter>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.teal }} />
          <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.tealDeep }}>Groups works best — Numi starts here for new division facts.</Text>
        </View>
      </ProCard>

      {/* patterns */}
      <ProCard delay={320}>
        <Eyebrow>PATTERNS</Eyebrow>
        <View style={{ gap: 9, marginTop: 11 }}>
          {PATTERNS.map(p => (
            <View key={p.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
              <Text style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 13, color: C.ink }}>{p.label}</Text>
              <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12, color: p.tone }}>{p.value}</Text>
            </View>
          ))}
        </View>
      </ProCard>

      {/* confidence pattern */}
      <ProCard delay={360}>
        <Eyebrow>CONFIDENCE PATTERN</Eyebrow>
        <Text style={{ fontFamily: F.body, fontSize: 11.5, color: C.faint, marginTop: 2 }}>How it felt (face) over how it went (height)</Text>
        <View style={{ flexDirection: 'row', height: 118, marginTop: 12, borderBottomWidth: 1.5, borderBottomColor: C.proLine }}>
          {CONF_POINTS.map((p, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <View style={{ alignItems: 'center', marginBottom: 4 + (p.acc - 0.6) * 160 }}>
                <Pop delay={400 + i * 80}>
                  <Text style={{ fontSize: 22 }}>{p.face}</Text>
                </Pop>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 9.5, color: C.faint }}>{Math.round(p.acc * 100)}%</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', marginTop: 5 }}>
          {CONF_POINTS.map((p, i) => (
            <Text key={i} style={{ flex: 1, textAlign: 'center', fontFamily: F.bodyHeavy, fontSize: 10, color: C.faint }}>{p.label}</Text>
          ))}
        </View>
        <Text style={{ fontFamily: F.bodyBold, fontSize: 12.5, lineHeight: 19, color: C.violetDeep, marginTop: 10 }}>
          Accuracy stays high even on days Maya feels unsure. Reassurance will help more than new content.
        </Text>
      </ProCard>

      {/* strategies + mistakes */}
      <ProCard delay={400}>
        <Eyebrow>STRATEGIES DISCOVERED</Eyebrow>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 11 }}>
          {stratChips.map((s, i) => (
            <Pop key={s} delay={440 + i * 50}>
              <View style={{ backgroundColor: C.tealSoft, borderRadius: 13, paddingVertical: 8, paddingHorizontal: 11 }}>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11.5, color: C.tealDeep }}>{s}</Text>
              </View>
            </Pop>
          ))}
        </View>
        <View style={{ height: 1, backgroundColor: C.proLine, marginVertical: 14 }} />
        <Eyebrow>COMMON MISTAKES</Eyebrow>
        <View style={{ gap: 8, marginTop: 10 }}>
          {MISTAKES.map(m => (
            <View key={m} style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ width: 5, borderRadius: 3, backgroundColor: C.sun }} />
              <Text style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 12.5, lineHeight: 19, color: C.ink }}>{m}</Text>
            </View>
          ))}
        </View>
      </ProCard>

      <Text style={{ fontFamily: F.body, fontSize: 11, color: C.faint, textAlign: 'center', marginTop: 18 }}>
        Private to Maya's teacher and grown-ups.
      </Text>
    </Screen>
  );
}
