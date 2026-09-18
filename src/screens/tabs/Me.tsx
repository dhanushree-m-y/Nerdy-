// Me tab — the explorer's profile, a living skill map, links and kid-sized settings.
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Text, View } from 'react-native';
import { ExplorerAvatar } from '../../components/characters';
import { Enter, Pop, Sway } from '../../components/motion';
import { SpeakableText, SpeakButton } from '../../components/Storyteller';
import { Eyebrow, ProgressBar, Screen, Segmented, Tap, Toggle, TopBar, Txt } from '../../components/ui';
import { AREAS, SKILLS, SkillId } from '../../data/world';
import { levelFromXp, levelProgress, XP_PER_LEVEL } from '../../learning/engine';
import { haptic } from '../../services/feedback';
import { useGame } from '../../store/game';
import { C, F, softShadow } from '../../theme/tokens';

const SKILL_IDS = Object.keys(SKILLS) as SkillId[];

/** The nearest area this skill will unlock, with how close the explorer is (0..1). */
function nextUnlock(skill: SkillId, xp: number) {
  const lvl = levelFromXp(xp);
  const gated = AREAS.flatMap(a => (a.requires && 'skill' in a.requires && a.requires.skill === skill && a.requires.level > lvl ? [{ area: a, need: a.requires.level }] : []))
    .sort((a, b) => a.need - b.need)[0];
  if (!gated) return null;
  const needXp = (gated.need - 1) * XP_PER_LEVEL;
  return { ...gated, pct: Math.max(0, Math.min(1, xp / needXp)), left: needXp - xp };
}

/** A plant that grows taller and bushier with each level. */
function GrowingPlant({ level, color, deep, delay }: { level: number; color: string; deep: string; delay: number }) {
  const l = Math.min(9, level);
  const stem = 16 + l * 8;
  const leaves = Math.min(6, l);
  return (
    <View style={{ height: 118, alignItems: 'center', justifyContent: 'flex-end' }}>
      <Sway deg={3} duration={2200 + delay} style={{ alignItems: 'center', transformOrigin: 'bottom center' }}>
        {l >= 3 ? (
          <Pop delay={delay + 200}>
            <View style={{ width: 22 + l * 1.5, height: 22 + l * 1.5, borderRadius: 20, backgroundColor: color, borderWidth: 5, borderColor: C.cream, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: deep }} />
            </View>
          </Pop>
        ) : (
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color, marginBottom: -2 }} />
        )}
        <View style={{ width: 5, height: stem, backgroundColor: C.grass, borderRadius: 3 }}>
          {Array.from({ length: leaves }, (_, i) => (
            <View
              key={i}
              style={{
                position: 'absolute', top: stem - 14 - i * ((stem - 14) / Math.max(1, leaves)),
                [i % 2 ? 'left' : 'right']: 2, width: 16, height: 9, borderRadius: 8,
                backgroundColor: i % 2 ? C.grass : C.hillDeep,
                transform: [{ rotate: i % 2 ? '-25deg' : '25deg' }],
              }}
            />
          ))}
        </View>
      </Sway>
      {/* pot */}
      <View style={{ width: 44, height: 22, backgroundColor: C.wood, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, borderTopWidth: 5, borderTopColor: C.woodDeep }} />
    </View>
  );
}

function Stat({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <View style={[{ flex: 1, backgroundColor: C.cream, borderRadius: 20, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 5, borderBottomColor: C.sandLine }]}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 24, lineHeight: 28, color: C.ink }}>{value}</Text>
      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12, color: C.faint, letterSpacing: 0.6 }}>{label}</Text>
    </View>
  );
}

type LinkRoute = 'StrategyBook' | 'Characters' | 'Memory' | 'AroundMe' | 'Classroom';
const LINKS: { route: LinkRoute; icon: string; title: string; bg: string; deep: string }[] = [
  { route: 'StrategyBook', icon: '📖', title: 'Strategy Book', bg: C.teal, deep: C.tealDeep },
  { route: 'Characters', icon: '🧑‍🤝‍🧑', title: 'Learning Partners', bg: C.coral, deep: C.coralDeep },
  { route: 'Memory', icon: '💭', title: 'Numi Remembers', bg: C.water, deep: '#3d86b5' },
  { route: 'AroundMe', icon: '🏠', title: 'Math Around Me', bg: C.sun, deep: C.sunDeep },
  { route: 'Classroom', icon: '🚀', title: 'Class Mission', bg: C.violet, deep: C.violetDeep },
];

/** Sound + voice switches, in words a six-year-old can follow. */
const SOUND_TOGGLES: { key: 'sound' | 'ambience' | 'voice' | 'autoSpeak'; icon: string; label: string }[] = [
  { key: 'sound', icon: '🔊', label: 'Sounds' },
  { key: 'ambience', icon: '🎵', label: 'Background music' },
  { key: 'voice', icon: '🗣', label: "NUMI's voice" },
  { key: 'autoSpeak', icon: '📖', label: 'Read things to me automatically' },
];

const SPEED_OPTIONS: { label: string; value: number }[] = [
  { label: '🐢 Slow', value: 0.8 },
  { label: '🙂 Normal', value: 0.92 },
  { label: '🐇 Quick', value: 1.05 },
];

/** Snap a stored rate onto the nearest of the three kid-sized choices. */
const nearestRate = (rate: number) =>
  SPEED_OPTIONS.reduce((best, o) => (Math.abs(o.value - rate) < Math.abs(best - rate) ? o.value : best), SPEED_OPTIONS[1].value);

export default function Me() {
  const nav = useNavigation();
  const explorer = useGame(s => s.explorer);
  const grade = useGame(s => s.grade);
  const stars = useGame(s => s.stars);
  const completed = useGame(s => s.completed);
  const strategies = useGame(s => s.strategies);
  const skillXp = useGame(s => s.skillXp);
  const settings = useGame(s => s.settings);
  const updateSettings = useGame(s => s.updateSettings);

  const levelName = `Grade ${grade} explorer`;
  const go = (r: LinkRoute) => nav.navigate(r);

  // The single closest unlock across all skills, shown as a banner.
  const closest = SKILL_IDS
    .map(id => ({ id, u: nextUnlock(id, skillXp[id] ?? 0) }))
    .filter((x): x is { id: SkillId; u: NonNullable<ReturnType<typeof nextUnlock>> } => !!x.u)
    .sort((a, b) => a.u.left - b.u.left)[0];

  return (
    <Screen scroll bg={C.cream} style={{ paddingBottom: 120 }}>
      <TopBar back={null} title="EXPLORER" />

      {/* profile */}
      <View style={{ alignItems: 'center', marginTop: 4 }}>
        <View style={{ width: 170, height: 170, borderRadius: 85, backgroundColor: C.sky, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 44, backgroundColor: C.meadow }} />
          <ExplorerAvatar skin={explorer.skin} hair={explorer.hair} hairStyle={explorer.hairStyle} outfit={explorer.outfit} size={130} />
        </View>
        <Txt variant="h1" style={{ marginTop: 10 }}>{explorer.name || 'Explorer'}</Txt>
        <View style={{ backgroundColor: C.teal, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4, marginTop: 4 }}>
          <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: C.cream }}>{levelName}</Text>
        </View>
        <SpeakableText
          text="This is your explorer page. Here you can see your stars, your powers, and change your sounds."
          autoRead
          style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted, textAlign: 'center', marginTop: 8 }}
        />
      </View>

      <Enter delay={120} style={{ flexDirection: 'row', gap: 9, marginTop: 16 }}>
        <Stat icon="⭐" value={stars} label="STARS" />
        <Stat icon="🗺️" value={Object.keys(completed).length} label="MISSIONS" />
        <Stat icon="💡" value={Object.keys(strategies).length} label="STRATEGIES" />
      </Enter>

      {/* skill map */}
      <Eyebrow style={{ marginTop: 24 }}>SKILL MAP</Eyebrow>
      <SpeakableText text="Your garden of powers" variant="h3" style={{ marginTop: 4 }} />

      {closest ? (
        <Enter delay={180} style={{ marginTop: 10 }}>
          <View style={{ backgroundColor: C.sunSoft, borderRadius: 20, padding: 13, borderBottomWidth: 5, borderBottomColor: '#eadcb8' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, lineHeight: 18, color: C.ink }}>
                  ✨ Close to unlocking: {closest.u.area.icon} {closest.u.area.name}
                </Text>
                <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted, marginTop: 2 }}>
                  Grow {SKILLS[closest.id].power} to Level {closest.u.need}
                </Text>
              </View>
              <SpeakButton text={`You are close to unlocking ${closest.u.area.name}. Grow ${SKILLS[closest.id].power} to level ${closest.u.need}.`} />
            </View>
            <ProgressBar value={closest.u.pct} height={10} style={{ marginTop: 8 }} delay={300} />
          </View>
        </Enter>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, marginTop: 8 }}>
        {SKILL_IDS.map((id, i) => {
          const sk = SKILLS[id];
          const xp = skillXp[id] ?? 0;
          const lvl = levelFromXp(xp);
          const u = nextUnlock(id, xp);
          return (
            <Enter key={id} delay={200 + i * 60} style={{ width: '50%', padding: 5 }}>
              <View style={[{ backgroundColor: C.meadow, borderRadius: 22, padding: 10, borderBottomWidth: 6, borderBottomColor: C.grass }, softShadow(0.06, 3)]}>
                <GrowingPlant level={lvl} color={sk.color} deep={sk.deep} delay={i * 90} />
                <SpeakableText
                  text={`${sk.name}. Level ${lvl}. ${u ? `Close to unlocking ${u.area.name}.` : `Growing toward level ${Math.min(9, lvl + 1)}.`}`}
                  showIcon={false}
                  style={{ fontFamily: F.display, fontSize: 15, lineHeight: 18, color: C.ink, marginTop: 6 }}
                >
                  {sk.icon} {sk.name}
                </SpeakableText>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: C.tealDeep }}>Level {lvl}</Text>
                <ProgressBar value={levelProgress(xp)} height={7} track="rgba(255,255,255,.6)" colors={[sk.color]} style={{ marginTop: 5 }} delay={300 + i * 60} />
                <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted, marginTop: 5 }} numberOfLines={2}>
                  {u ? `Close to unlocking: ${u.area.name}` : `Growing toward Level ${Math.min(9, lvl + 1)}`}
                </Text>
              </View>
            </Enter>
          );
        })}
      </View>

      {/* links */}
      <Eyebrow style={{ marginTop: 24 }}>EXPLORE MORE</Eyebrow>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, marginTop: 6 }}>
        {LINKS.map((l, i) => (
          <Pop key={l.route} delay={300 + i * 60} style={{ width: i === LINKS.length - 1 ? '100%' : '50%', padding: 5 }}>
            <Tap onPress={() => go(l.route)} a11y={l.title}>
              <View style={{ backgroundColor: l.bg, borderRadius: 22, minHeight: 84, padding: 14, justifyContent: 'space-between', borderBottomWidth: 6, borderBottomColor: l.deep }}>
                <Text style={{ fontSize: 26 }}>{l.icon}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 16, lineHeight: 19, color: C.cream, marginTop: 6 }}>{l.title} →</Text>
                <SpeakButton text={l.title} dark style={{ position: 'absolute', top: 8, right: 8, width: 34, height: 34, borderRadius: 17 }} />
              </View>
            </Tap>
          </Pop>
        ))}
      </View>

      {/* kid settings */}
      <Eyebrow style={{ marginTop: 24 }}>MY SETTINGS</Eyebrow>
      <SpeakableText
        text="Sounds and voice. Tap a switch to turn something on or off."
        style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted, marginTop: 4 }}
      />
      <View style={{ backgroundColor: C.paper, borderRadius: 22, padding: 6, marginTop: 8, borderWidth: 2, borderColor: C.sandLine }}>
        {SOUND_TOGGLES.map((row, i) => (
          <View key={row.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 12, borderTopWidth: i ? 2 : 0, borderTopColor: C.sandLine }}>
            <Text style={{ fontSize: 22 }}>{row.icon}</Text>
            <View style={{ flex: 1 }}>
              <SpeakableText
                text={row.label}
                showIcon={false}
                style={{ fontFamily: F.bodyHeavy, fontSize: 15, lineHeight: 21, color: C.ink }}
              />
            </View>
            <Toggle
              a11y={row.label}
              on={settings[row.key]}
              onChange={v => { if (v) haptic.tap(); updateSettings({ [row.key]: v }); }}
            />
          </View>
        ))}

        <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6, borderTopWidth: 2, borderTopColor: C.sandLine }}>
          <SpeakableText text="Voice style" showIcon={false} style={{ fontFamily: F.bodyHeavy, fontSize: 15, lineHeight: 21, color: C.ink }} />
          <Segmented
            style={{ marginTop: 8 }}
            value={settings.voiceStyle}
            onChange={v => { haptic.tap(); updateSettings({ voiceStyle: v }); }}
            options={[{ label: '😌 Calm', value: 'calm' as const }, { label: '🎈 Playful', value: 'playful' as const }]}
          />
        </View>

        <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 14 }}>
          <SpeakableText text="Speed" showIcon={false} style={{ fontFamily: F.bodyHeavy, fontSize: 15, lineHeight: 21, color: C.ink }} />
          <Segmented
            style={{ marginTop: 8 }}
            value={nearestRate(settings.speechRate)}
            onChange={v => { haptic.tap(); updateSettings({ speechRate: v }); }}
            options={SPEED_OPTIONS}
          />
        </View>
      </View>
      <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.faint, marginTop: 8 }}>
        Grown-ups can change more in the Grown-ups area.
      </Text>

      {/* grown-ups: discreet */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 26 }}>
        <Tap a11y="Grown-ups area" onPress={() => nav.navigate('ParentGate', { target: 'Parent' })} style={{ borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 2, borderColor: C.sandLine, minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: C.faint }}>🔒 Grown-ups</Text>
        </Tap>
        <Tap a11y="Teachers area" onPress={() => nav.navigate('ParentGate', { target: 'Teacher' })} style={{ borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 2, borderColor: C.sandLine, minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: C.faint }}>🔒 Teachers</Text>
        </Tap>
      </View>
    </Screen>
  );
}
