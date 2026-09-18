// Grown-up mode: a weekly learning story first, details on request, then controls.
import React, { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { Enter, Pop, useMotionOK } from '../../components/motion';
import { SpeakButton } from '../../components/Storyteller';
import { Eyebrow, ProgressBar, Screen, Segmented, Tap, Toggle, Txt } from '../../components/ui';
import { Grade, GRADES, SkillId, SKILLS, STRATEGIES, StrategyId } from '../../data/world';
import { confidenceInsight, masteryPct } from '../../learning/engine';
import { RootScreen } from '../../navigation/types';
import { haptic } from '../../services/feedback';
import { Settings, useGame } from '../../store/game';
import { C, F, M, T } from '../../theme/tokens';

// ─── small building blocks ────────────────────────────────────────────────────
function ProCard({ children, style, delay = 0 }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; delay?: number }>) {
  return (
    <Enter delay={delay} style={[{ backgroundColor: C.proCard, borderRadius: 22, padding: 16, marginTop: 12 }, style]}>
      {children}
    </Enter>
  );
}

function Chip({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 13, paddingVertical: 8, paddingHorizontal: 11 }}>
      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11.5, color: fg }}>{label}</Text>
    </View>
  );
}

const tone = (pct: number) => (pct >= 75 ? C.teal : pct >= 50 ? C.sun : C.coral);

const DISCOVERY: Record<StrategyId, string> = {
  'make-ten': 'filling up to ten first can make addition easier',
  'double': 'doubles are a quick way to add numbers that are nearly the same',
  'count-on': 'starting from the bigger number and counting on saves time',
  'break': 'breaking numbers apart can make addition easier',
  'groups': 'sharing into equal groups makes division make sense',
  'jump': 'jumping along a number line helps with bigger sums',
  'skip': 'skip counting is a shortcut for multiplication',
  'estimate': 'guessing the size first helps check an answer',
};

const WEEK = [
  { d: 'M', min: 6 }, { d: 'T', min: 9 }, { d: 'W', min: 8 }, { d: 'T', min: 11 },
  { d: 'F', min: 10 }, { d: 'S', min: 14 }, { d: 'S', min: 13 },
];
const WEEK_MAX = 14;

function DayBar({ min, label, i, weekend }: { min: number; label: string; i: number; weekend: boolean }) {
  const ok = useMotionOK();
  const target = Math.round((min / WEEK_MAX) * 86);
  const h = useSharedValue(ok ? 0 : target);
  useEffect(() => {
    if (ok) h.value = withDelay(120 + i * 70, withTiming(target, { duration: 700, easing: Easing.bezier(0.2, 0.9, 0.3, 1) }));
  }, []);
  const a = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }} accessible accessibilityLabel={`${min} minutes`}>
      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 9.5, color: C.faint }}>{min}</Text>
      <Animated.View style={[{ width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: weekend ? C.violet : C.teal }, a]} />
      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 10, color: C.faint }}>{label}</Text>
    </View>
  );
}

function Chevron({ open }: { open: boolean }) {
  const v = useSharedValue(open ? 1 : 0);
  useEffect(() => { v.value = withSpring(open ? 1 : 0, M.spring); }, [open]);
  const a = useAnimatedStyle(() => ({ transform: [{ rotate: `${v.value * 180}deg` }] }));
  return (
    <Animated.View style={a}>
      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 14, color: C.muted }}>▾</Text>
    </Animated.View>
  );
}

function StoryRow({ icon, label, value, i }: { icon: string; label: string; value: string; i: number }) {
  return (
    <Enter delay={120 + i * 70} dx={-10} dy={0} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: C.proLine }}>
      <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: C.proBg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <Text style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 13, color: C.muted }}>{label}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 16, color: C.ink, maxWidth: '48%', textAlign: 'right' }}>{value}</Text>
    </Enter>
  );
}

function ControlRow({ label, sub, on, onChange }: { label: string; sub?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.bodyBold, fontSize: 13.5, color: C.ink }}>{label}</Text>
        {sub ? <Text style={{ fontFamily: F.body, fontSize: 11.5, color: C.faint, marginTop: 1 }}>{sub}</Text> : null}
      </View>
      <Toggle on={on} onChange={onChange} a11y={label} />
    </View>
  );
}

function LinkRow({ icon, label, onPress, danger }: { icon: string; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Tap onPress={onPress} a11y={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={{ flex: 1, fontFamily: F.bodyHeavy, fontSize: 14, color: danger ? C.coralDeep : C.ink }}>{label}</Text>
      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 16, color: C.faint }}>›</Text>
    </Tap>
  );
}

// ─── screen ───────────────────────────────────────────────────────────────────
export default function Parent({ navigation }: RootScreen<'Parent'>) {
  const explorer = useGame(s => s.explorer);
  const completed = useGame(s => s.completed);
  const strategies = useGame(s => s.strategies);
  const skillXp = useGame(s => s.skillXp);
  const signals = useGame(s => s.signals);
  const struggles = useGame(s => s.struggles);
  const confidence = useGame(s => s.confidence);
  const streakDays = useGame(s => s.streakDays);
  const settings = useGame(s => s.settings);
  const updateSettings = useGame(s => s.updateSettings);
  const resetAll = useGame(s => s.resetAll);

  const [detailed, setDetailed] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const name = explorer.name || 'Maya';
  const set = (p: Partial<Settings>) => updateSettings(p);

  const story = useMemo(() => {
    const doneCount = Object.keys(completed).length;
    const newest = (Object.entries(strategies) as [StrategyId, number][]).sort((a, b) => b[1] - a[1])[0];
    const stratId: StrategyId = newest?.[0] ?? 'make-ten';
    const stratName = STRATEGIES.find(s => s.id === stratId)?.name ?? 'Make a Ten';
    const lastSig = signals[signals.length - 1];
    const growing = lastSig ? SKILLS[lastSig.skill].name : 'Multiplication';
    const open = struggles.filter(s => !s.resolved);
    const lastStruggle = open[open.length - 1];
    const practise = lastStruggle
      ? (lastStruggle.skill === 'division' ? 'Equal sharing' : SKILLS[lastStruggle.skill].name)
      : 'Equal sharing';
    return {
      adventures: doneCount || 4,
      streak: Math.max(3, streakDays.length),
      stratId, stratName, growing, practise,
      sentence: `This week ${name} discovered that ${DISCOVERY[stratId]}.`,
      minutes: signals.length ? Math.max(1, Math.round(signals.reduce((a, s) => a + s.completedMs, 0) / 60000)) : 71,
      doneCount: doneCount || 4,
    };
  }, [completed, strategies, signals, struggles, streakDays, name]);

  const core: SkillId[] = ['addition', 'subtraction', 'multiplication', 'division'];
  const mastery = core.map(id => ({ id, name: SKILLS[id].name, pct: masteryPct(skillXp[id] ?? 0) }));
  const strengths = mastery.filter(m => m.pct >= 75);
  const needs = mastery.filter(m => m.pct < 50);
  const improving = signals.length ? SKILLS[signals[signals.length - 1].skill].name : 'Division';

  const lastConf = confidence[confidence.length - 1];
  const confNote = lastConf
    ? confidenceInsight(lastConf.value, [...signals].reverse().find(s => s.mission === lastConf.mission))
    : null;

  return (
    <Screen scroll bg={C.proBg}>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexShrink: 1 }}>
          <Eyebrow>GROWN-UP MODE</Eyebrow>
          <Txt variant="h2" style={{ marginTop: 4 }} accessibilityRole="header">{name}'s week</Txt>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Exit grown-up mode"
          onPress={() => { haptic.tap(); navigation.navigate('Main'); }}
          style={{ backgroundColor: C.ink, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 }}
        >
          <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12.5, color: C.cream }}>Exit</Text>
        </Pressable>
      </View>

      {/* weekly learning story */}
      <ProCard style={{ marginTop: 16 }}>
        <Eyebrow>THIS WEEK'S LEARNING STORY</Eyebrow>
        <View style={{ marginTop: 8 }}>
          <StoryRow i={0} icon="🌟" label="Adventures completed" value={String(story.adventures)} />
          <StoryRow i={1} icon="🔥" label="Day learning streak" value={`${story.streak} days`} />
          <StoryRow i={2} icon="🧠" label="New strategy" value={story.stratName} />
          <StoryRow i={3} icon="💪" label="Growing skill" value={story.growing} />
          <StoryRow i={4} icon="🎯" label="Practise next" value={story.practise} />
        </View>
        <Enter delay={520} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: C.tealSoft, borderRadius: 16, padding: 13, marginTop: 10 }}>
          <Text style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 14, lineHeight: 21, color: C.tealDeep }}>{story.sentence}</Text>
          <SpeakButton text={story.sentence} speaker="narrator" style={{ width: 34, height: 34, borderRadius: 17 }} />
        </Enter>
      </ProCard>

      {/* detailed toggle */}
      <Enter delay={160}>
        <Tap
          onPress={() => setDetailed(d => !d)}
          a11y={detailed ? 'Hide detailed view' : 'See detailed view'}
          style={{ marginTop: 12, backgroundColor: C.proCard, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text style={{ fontFamily: F.bodyHeavy, fontSize: 14, color: C.ink }}>{detailed ? 'Hide detailed view' : 'See detailed view'}</Text>
          <Chevron open={detailed} />
        </Tap>
      </Enter>

      {detailed && (
        <View>
          {/* stat tiles */}
          <View style={{ flexDirection: 'row', gap: 9, marginTop: 12 }}>
            {[
              { v: `${story.minutes}`, l: 'minutes learned', c: C.teal },
              { v: `${story.doneCount}`, l: 'missions completed', c: C.violet },
              { v: `${story.streak}`, l: 'day streak', c: C.coral },
            ].map((t, i) => (
              <Pop key={t.l} delay={i * 70} style={{ flex: 1 }}>
                <View style={{ backgroundColor: C.proCard, borderRadius: 18, padding: 14 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 26, lineHeight: 30, color: t.c }}>{t.v}</Text>
                  <Text style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.muted, marginTop: 3 }}>{t.l}</Text>
                </View>
              </Pop>
            ))}
          </View>

          {/* mastery */}
          <ProCard delay={80}>
            <Eyebrow>SKILL MASTERY</Eyebrow>
            <View style={{ gap: 11, marginTop: 13 }}>
              {mastery.map((m, i) => (
                <View key={m.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12.5, color: C.ink }}>{m.name}</Text>
                    <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12.5, color: tone(m.pct) }}>{m.pct}%</Text>
                  </View>
                  <ProgressBar value={m.pct / 100} height={10} track={C.proLine} colors={[tone(m.pct)]} delay={120 + i * 100} style={{ marginTop: 6 }} />
                </View>
              ))}
            </View>
          </ProCard>

          {/* week chart */}
          <ProCard delay={140}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Eyebrow>MINUTES THIS WEEK</Eyebrow>
              <Text style={{ fontFamily: F.bodyHeavy, fontSize: 10.5, color: C.violet }}>● weekend</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 7, height: 124, marginTop: 12 }}>
              {WEEK.map((w, i) => <DayBar key={i} i={i} min={w.min} label={w.d} weekend={i > 4} />)}
            </View>
          </ProCard>

          {/* chips + insight */}
          <ProCard delay={200}>
            <Eyebrow>AT A GLANCE</Eyebrow>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {strengths.map(s => <Chip key={s.id} label={`STRENGTH · ${s.name}`} bg={C.tealSoft} fg={C.tealDeep} />)}
              {needs.map(s => <Chip key={s.id} label={`NEEDS PRACTICE · ${s.name}`} bg={C.coralSoft} fg={C.coralDeep} />)}
              <Chip label={`RECENT IMPROVEMENT · ${improving}`} bg={C.violetSoft} fg={C.violetDeep} />
            </View>
            <View style={{ height: 1, backgroundColor: C.proLine, marginVertical: 13 }} />
            <Text style={{ fontFamily: F.bodyBold, fontSize: 13.5, lineHeight: 20, color: C.ink }}>
              {improving === 'Division' ? 'Division using groups is improving.' : `${improving} is improving with each adventure.`}
            </Text>
            {confNote ? (
              <View style={{ marginTop: 10, flexDirection: 'row', gap: 10 }}>
                <View style={{ width: 5, borderRadius: 3, backgroundColor: C.violet }} />
                <Text style={{ flex: 1, fontFamily: F.body, fontSize: 12.5, lineHeight: 19, color: C.muted }}>
                  <Text style={{ fontFamily: F.bodyHeavy, color: C.violetDeep }}>Confidence: </Text>{confNote}
                </Text>
              </View>
            ) : null}
          </ProCard>
        </View>
      )}

      {/* dinner */}
      <ProCard delay={220}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Eyebrow>WHAT TO SAY AT DINNER</Eyebrow>
          <SpeakButton
            speaker="narrator"
            text={`${name} discovered ${story.stratName} this week. Ask how it works — ${name} can show you the trick with a real sum, like 8 plus 7.`}
            style={{ width: 34, height: 34, borderRadius: 17 }}
          />
        </View>
        <Text style={{ fontFamily: F.bodyBold, fontSize: 14, lineHeight: 22, color: C.ink, marginTop: 9 }}>
          "{name} discovered {story.stratName} this week. Ask how it works — {name} can show you the trick with a real sum, like 8 + 7."
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 }}>
          <Chip label={`STRONG · ${strengths[0]?.name ?? 'Addition'}`} bg={C.tealSoft} fg={C.tealDeep} />
          <Chip label={`GROWING · ${story.practise}`} bg={C.coralSoft} fg={C.coralDeep} />
        </View>
      </ProCard>

      {/* controls */}
      <ProCard delay={260}>
        <Eyebrow>CONTROLS</Eyebrow>
        <Text style={[T.label, { marginTop: 12, marginBottom: 8 }]}>School grade</Text>
        <GradePicker />
        <Text style={[T.label, { marginTop: 18, marginBottom: 2 }]}>Sound &amp; voice</Text>
        <View style={{ gap: 6, marginTop: 6 }}>
          <ControlRow label="Sound" sub="Taps, chimes and rewards" on={settings.sound} onChange={v => set({ sound: v })} />
          <ControlRow label="Background music" sub="Gentle ambience in the world" on={settings.ambience} onChange={v => set({ ambience: v })} />
          <ControlRow label="Numi speaks aloud" on={settings.voice} onChange={v => set({ voice: v })} />
          <ControlRow label="Read things out automatically" sub="Goals are read aloud for grades 1 and 2" on={settings.autoSpeak} onChange={v => set({ autoSpeak: v })} />
          <ControlRow label="Captions" on={settings.captions} onChange={v => set({ captions: v })} />
        </View>
        <Text style={[T.label, { marginTop: 14, marginBottom: 8 }]}>Voice style</Text>
        <Segmented
          options={[{ label: 'Calm', value: 'calm' as const }, { label: 'Playful', value: 'playful' as const }]}
          value={settings.voiceStyle}
          onChange={v => set({ voiceStyle: v })}
          activeBg={C.teal}
          activeShadow={C.tealDeep}
        />
        <Text style={[T.label, { marginTop: 14, marginBottom: 8 }]}>Speech speed</Text>
        <Segmented
          options={[{ label: 'Slow', value: 0.8 }, { label: 'Normal', value: 0.92 }, { label: 'Quick', value: 1.05 }]}
          value={settings.speechRate}
          onChange={v => set({ speechRate: v })}
          activeBg={C.teal}
          activeShadow={C.tealDeep}
        />

        <Text style={[T.label, { marginTop: 18, marginBottom: 2 }]}>Access &amp; comfort</Text>
        <View style={{ gap: 6, marginTop: 6 }}>
          <ControlRow label="Microphone" sub="Talk to Numi instead of typing" on={settings.micAllowed} onChange={v => set({ micAllowed: v })} />
          <ControlRow label="Camera" sub='For "Math Around Me"' on={settings.cameraAllowed} onChange={v => set({ cameraAllowed: v })} />
          <ControlRow label="Learning reports" on={settings.reportsAllowed} onChange={v => set({ reportsAllowed: v })} />
          <ControlRow label="Haptics" on={settings.haptics} onChange={v => set({ haptics: v })} />
          <ControlRow label="Reduced motion" on={settings.reducedMotion} onChange={v => set({ reducedMotion: v })} />
          <ControlRow label="Large touch targets" on={settings.bigTargets} onChange={v => set({ bigTargets: v })} />
        </View>
        <View style={{ backgroundColor: C.proBg, borderRadius: 14, padding: 12, marginTop: 16, gap: 5 }}>
          <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12, color: C.ink }}>🔐 Privacy</Text>
          {[
            'Voice is processed for the current challenge only.',
            'Photos stay on this device.',
            'No public rankings, ever.',
            'NUMI only talks about learning.',
          ].map(t => (
            <Text key={t} style={{ fontFamily: F.body, fontSize: 12, lineHeight: 17, color: C.muted }}>• {t}</Text>
          ))}
        </View>
      </ProCard>

      {/* links */}
      <ProCard delay={300} style={{ paddingVertical: 6 }}>
        <LinkRow icon="🏫" label="Teacher dashboard" onPress={() => navigation.navigate('Teacher')} />
        <View style={{ height: 1, backgroundColor: C.proLine }} />
        <LinkRow icon="🎨" label="Design system" onPress={() => navigation.navigate('DesignSystem')} />
        <View style={{ height: 1, backgroundColor: C.proLine }} />
        {!confirmReset ? (
          <LinkRow icon="↺" label="Reset progress" danger onPress={() => setConfirmReset(true)} />
        ) : (
          <Enter dy={8} style={{ paddingVertical: 12, gap: 10 }}>
            <Text style={{ fontFamily: F.bodyBold, fontSize: 13.5, lineHeight: 20, color: C.ink }}>
              Start {name}'s adventure over? Missions, strategies and reports will be cleared. This can't be undone.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => { haptic.tap(); setConfirmReset(false); }}
                style={{ flex: 1, backgroundColor: C.proLine, borderRadius: 14, paddingVertical: 13, alignItems: 'center' }}
              >
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: C.ink }}>Keep progress</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  haptic.heavy();
                  resetAll();
                  navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
                }}
                style={{ flex: 1, backgroundColor: C.coral, borderRadius: 14, paddingVertical: 13, alignItems: 'center' }}
              >
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: C.white }}>Yes, reset</Text>
              </Pressable>
            </View>
          </Enter>
        )}
      </ProCard>

      <Text style={{ fontFamily: F.body, fontSize: 11, color: C.faint, textAlign: 'center', marginTop: 18 }}>
        NUMI · made for curious explorers aged 6–11
      </Text>
    </Screen>
  );
}

/** Grade switch for grown-ups: every game's numbers follow it from the next round. */
function GradePicker() {
  const grade = useGame(s => s.grade);
  const setGrade = useGame(s => s.setGrade);
  const info = GRADES.find(g => g.g === grade)!;
  return (
    <View>
      <Segmented
        options={GRADES.map(g => ({ label: String(g.g), value: g.g as Grade }))}
        value={grade}
        onChange={v => { haptic.tap(); setGrade(v); }}
        activeBg={C.teal}
        activeShadow={C.tealDeep}
      />
      <Text style={[T.bodySm, { marginTop: 6 }]}>{info.name}: {info.desc}</Text>
    </View>
  );
}
