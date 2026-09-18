// Living style guide: every NUMI token and component, rendered with the real code.
import React, { PropsWithChildren, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Buddy, Numi } from '../components/characters';
import { Bob, Enter, Stamp, Wobble } from '../components/motion';
import { ChunkyButton, Eyebrow, Pill, ProgressBar, Screen, SpeechBubble, Tap, Toggle, TopBar, Txt } from '../components/ui';
import { CharacterId, CHARACTERS, SKILLS } from '../data/world';
import { RootScreen } from '../navigation/types';
import { C, F, ledge, Mood, R, S, softShadow, T, TOUCH } from '../theme/tokens';

function Section({ title, sub, children, i = 0 }: PropsWithChildren<{ title: string; sub?: string; i?: number }>) {
  return (
    <Enter delay={Math.min(i, 6) * 60} style={{ marginTop: 26 }}>
      <Eyebrow>{title.toUpperCase()}</Eyebrow>
      {sub ? <Text style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</Text> : null}
      <View style={{ marginTop: 12 }}>{children}</View>
    </Enter>
  );
}

const SWATCHES: { group: string; items: (keyof typeof C)[] }[] = [
  { group: 'Surfaces', items: ['cream', 'paper', 'sand', 'sandLine', 'proBg', 'proCard'] },
  { group: 'Ink', items: ['ink', 'inkDeep', 'muted', 'faint'] },
  { group: 'Brand', items: ['coral', 'coralDeep', 'coralSoft', 'teal', 'tealDeep', 'tealSoft', 'sun', 'sunDeep', 'sunSoft', 'violet', 'violetDeep', 'violetSoft'] },
  { group: 'World', items: ['sky', 'meadow', 'grass', 'hill', 'water', 'wood', 'cookie', 'night', 'dusk'] },
  { group: 'States', items: ['locked', 'lockedDeep', 'lockedInk'] },
];

const ICONS = [
  { e: '🗺️', l: 'Map' }, { e: '⛺', l: 'Adventure' }, { e: '🎒', l: 'Backpack' }, { e: '🧭', l: 'Explore' },
  { e: '🎙', l: 'Voice' }, { e: '⚡', l: 'Addition' }, { e: '💨', l: 'Subtract' }, { e: '🔥', l: 'Multiply' },
  { e: '💧', l: 'Divide' }, { e: '🍕', l: 'Fractions' }, { e: '🔷', l: 'Geometry' },
];

const MOODS: Mood[] = ['happy', 'worried', 'wow', 'think'];

function MissionCard({ state }: { state: 'locked' | 'open' | 'restored' }) {
  const locked = state === 'locked';
  const restored = state === 'restored';
  const color = locked ? C.locked : restored ? C.teal : C.coral;
  const deep = locked ? C.lockedDeep : restored ? C.tealDeep : C.coralDeep;
  return (
    <View style={[{ width: 150, backgroundColor: color, borderRadius: R.lg, padding: 14 }, ledge(deep, 6)]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 26, opacity: locked ? 0.5 : 1 }}>{locked ? '🔒' : '🌉'}</Text>
        {restored ? (
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.display, fontSize: 15, color: C.tealDeep, lineHeight: 20 }}>✓</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ fontFamily: F.display, fontSize: 17, lineHeight: 21, color: locked ? C.lockedInk : C.cream, marginTop: 8 }}>
        {locked ? 'Space Station' : 'The Broken Bridge'}
      </Text>
      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11, color: locked ? C.lockedInk : 'rgba(253,245,232,.85)', marginTop: 2 }}>
        {locked ? 'Unlocks at Division 2' : restored ? 'Restored' : 'Ready to fix'}
      </Text>
    </View>
  );
}

function Plank({ n, color, deep }: { n: number; color: string; deep: string }) {
  return (
    <View style={[{ width: 26 + n * 8, height: 44, backgroundColor: color, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, ledge(deep, 5)]}>
      <Text style={{ fontFamily: F.display, fontSize: 20, lineHeight: 24, color: C.cream }}>{n}</Text>
    </View>
  );
}

export default function DesignSystem({ navigation }: RootScreen<'DesignSystem'>) {
  const [toggle, setToggle] = useState(true);
  const [shake, setShake] = useState(0);
  const [stampKey, setStampKey] = useState(0);

  return (
    <Screen scroll bg={C.cream}>
      <TopBar back="← Back" title="DESIGN SYSTEM" onBack={() => navigation.goBack()} />
      <Enter delay={40} style={{ marginTop: 14 }}>
        <Txt variant="hero" accessibilityRole="header">NUMI kit</Txt>
        <Txt variant="bodySm" style={{ marginTop: 4 }}>Every piece below is the real component, not a picture of it.</Txt>
      </Enter>

      {/* colors */}
      <Section title="Colors" i={1}>
        {SWATCHES.map(g => (
          <View key={g.group} style={{ marginBottom: 12 }}>
            <Text style={[T.label, { marginBottom: 7 }]}>{g.group}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {g.items.map(k => (
                <View key={k} style={{ width: 76 }}>
                  <View style={{ height: 46, borderRadius: 14, backgroundColor: C[k], borderWidth: 1, borderColor: 'rgba(34,48,59,.08)' }} />
                  <Text numberOfLines={1} style={{ fontFamily: F.bodyHeavy, fontSize: 10.5, color: C.ink, marginTop: 4 }}>{k}</Text>
                  <Text style={{ fontFamily: F.body, fontSize: 10, color: C.faint }}>{C[k].toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </Section>

      {/* typography */}
      <Section title="Typography" sub="Baloo 2 for headings & numbers · Nunito for reading" i={2}>
        <View style={{ backgroundColor: C.paper, borderRadius: R.lg, padding: 14, gap: 10 }}>
          {(Object.keys(T) as (keyof typeof T)[]).map(k => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
              <Text style={{ width: 58, fontFamily: F.bodyHeavy, fontSize: 10, color: C.faint }}>{k}{'\n'}{T[k].fontSize}px</Text>
              <Text style={[T[k], { flex: 1 }]} numberOfLines={1}>{k === 'eyebrow' ? 'MISSION 2 OF 5' : k === 'num' ? '8 + 7 = 15' : 'Fix the bridge'}</Text>
            </View>
          ))}
        </View>
      </Section>

      {/* buttons */}
      <Section title="Buttons" sub="Chunky with a hard ledge — press any to see the pressed state" i={3}>
        <View style={{ gap: 10 }}>
          <ChunkyButton label="Fix it!" color={C.coral} shadow={C.coralDeep} />
          <ChunkyButton label="Let's go" color={C.teal} shadow={C.tealDeep} icon="🧭" />
          <ChunkyButton label="Ask Numi" color={C.sun} shadow={C.sunDeep} textColor={C.ink} icon="🎙" />
          <ChunkyButton label="Magic hint" color={C.violet} shadow={C.violetDeep} />
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}><ChunkyButton size="lg" label="Large" /></View>
            <View style={{ flex: 1 }}><ChunkyButton size="md" label="Medium" color={C.teal} shadow={C.tealDeep} /></View>
            <View style={{ flex: 1 }}><ChunkyButton size="sm" label="Small" color={C.ink} shadow={C.inkDeep} /></View>
          </View>
          <ChunkyButton label="Disabled" disabled color={C.locked} shadow={C.lockedDeep} textColor={C.lockedInk} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Toggle on={toggle} onChange={setToggle} a11y="Sample toggle" />
            <Text style={T.body}>Toggle · {toggle ? 'on' : 'off'}</Text>
          </View>
        </View>
      </Section>

      {/* progress */}
      <Section title="Progress indicators" i={4}>
        <View style={{ gap: 12 }}>
          {[0.15, 0.5, 0.82, 1].map((v, i) => (
            <View key={v} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ width: 38, fontFamily: F.bodyHeavy, fontSize: 11, color: C.muted }}>{Math.round(v * 100)}%</Text>
              <ProgressBar value={v} delay={i * 120} style={{ flex: 1 }} />
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ width: 38, fontFamily: F.bodyHeavy, fontSize: 11, color: C.muted }}>thin</Text>
            <ProgressBar value={0.63} height={8} track={C.proLine} colors={[C.sun]} style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 1, 1, 0, 0].map((d, i) => (
              <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: d ? C.teal : C.sand }} />
            ))}
          </View>
          <Text style={T.bodySm}>Step dots · mission 3 of 5</Text>
        </View>
      </Section>

      {/* game cards */}
      <Section title="Game cards" sub="Locked · unlocked · restored" i={5}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 8, paddingRight: 8 }}>
          <MissionCard state="locked" />
          <MissionCard state="open" />
          <MissionCard state="restored" />
        </ScrollView>
      </Section>

      {/* bottom nav */}
      <Section title="Bottom navigation" sub="Static preview" i={6}>
        <View style={[{ flexDirection: 'row', backgroundColor: C.paper, borderRadius: R.xl, paddingVertical: 8, paddingHorizontal: 6 }, softShadow(0.1, 5)]}>
          {[
            { e: '🗺️', l: 'World', on: true }, { e: '⛺', l: 'Adventure' }, { e: '🎒', l: 'Backpack' }, { e: '🧭', l: 'Me' },
          ].map(t => (
            <View key={t.l} style={{ flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 16, backgroundColor: t.on ? C.sunSoft : 'transparent' }}>
              <Text style={{ fontSize: 22 }}>{t.e}</Text>
              <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11, color: t.on ? C.ink : C.faint, marginTop: 2 }}>{t.l}</Text>
            </View>
          ))}
        </View>
      </Section>

      {/* dialog */}
      <Section title="Dialog & speech bubbles" i={6}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
          <Numi size={78} state="speaking" />
          <SpeechBubble style={{ flex: 1 }}>The river washed the bridge away! Which two planks make 15?</SpeechBubble>
        </View>
        <View style={{ alignItems: 'center', marginTop: 16 }}>
          <SpeechBubble tail="top" bg={C.ink} dark style={{ maxWidth: 260 }}>Try making a ten first ✨</SpeechBubble>
        </View>
      </Section>

      {/* rewards */}
      <Section title="Rewards" sub="Tap the stamp to replay" i={6}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Tap onPress={() => setStampKey(k => k + 1)} a11y="Replay stamp">
            <Stamp key={stampKey}>
              <View style={{ borderWidth: 4, borderColor: C.coral, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14 }}>
                <Text style={{ fontFamily: F.display, fontSize: 22, lineHeight: 26, color: C.coral, letterSpacing: 1 }}>CASE SOLVED!</Text>
              </View>
            </Stamp>
          </Tap>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[0, 1, 2].map(i => (
              <Bob key={i} delay={i * 180} amp={4}>
                <Text style={{ fontSize: 30, opacity: i < 2 ? 1 : 0.3 }}>⭐</Text>
              </Bob>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <Pill bg={SKILLS.addition.color}><Text style={{ fontSize: 13 }}>{SKILLS.addition.icon}</Text><Text style={{ fontFamily: F.bodyHeavy, fontSize: 12, color: C.ink }}>Addition Power +12</Text></Pill>
          <Pill bg={C.violetSoft} fg={C.violetDeep}>🧠 New strategy</Pill>
          <Pill bg={C.sun}>🪙 +9</Pill>
        </View>
      </Section>

      {/* game objects */}
      <Section title="Game objects" i={6}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Plank n={8} color={C.sun} deep={C.sunDeep} />
          <Plank n={7} color={C.wood} deep={C.woodShadow} />
          <Plank n={5} color={C.sun} deep={C.sunDeep} />
          <Plank n={4} color={C.wood} deep={C.woodShadow} />
        </View>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { e: '🪙', n: 5, l: 'coins' }, { e: '🍪', n: 4, l: 'cookies' }, { e: '🍓', n: 6, l: 'strawberries' },
          ].map(o => (
            <View key={o.l} style={{ alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 96, gap: 2 }}>
                {Array.from({ length: o.n }, (_, i) => <Text key={i} style={{ fontSize: 24 }}>{o.e}</Text>)}
              </View>
              <Text style={[T.bodySm, { marginTop: 2 }]}>{o.l}</Text>
            </View>
          ))}
        </View>
      </Section>

      {/* icons */}
      <Section title="Icons" sub="Emoji set used across the world" i={6}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ICONS.map(ic => (
            <View key={ic.l} style={{ width: 70, alignItems: 'center', backgroundColor: C.paper, borderRadius: 16, paddingVertical: 10 }}>
              <Text style={{ fontSize: 26 }}>{ic.e}</Text>
              <Text style={{ fontFamily: F.bodyHeavy, fontSize: 10, color: C.muted, marginTop: 3 }}>{ic.l}</Text>
            </View>
          ))}
        </View>
      </Section>

      {/* spacing */}
      <Section title="Spacing & radius" i={6}>
        <View style={{ gap: 6 }}>
          {(Object.keys(S) as (keyof typeof S)[]).map(k => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ width: 70, fontFamily: F.bodyHeavy, fontSize: 11, color: C.muted }}>{k} · {S[k]}</Text>
              <View style={{ width: S[k] * 4, height: 12, borderRadius: 4, backgroundColor: C.teal }} />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {(Object.keys(R) as (keyof typeof R)[]).filter(k => k !== 'pill').map(k => (
            <View key={k} style={{ alignItems: 'center' }}>
              <View style={{ width: 48, height: 48, borderRadius: R[k], backgroundColor: C.sunSoft, borderWidth: 2, borderColor: C.sun }} />
              <Text style={{ fontFamily: F.bodyHeavy, fontSize: 10, color: C.muted, marginTop: 3 }}>{k} {R[k]}</Text>
            </View>
          ))}
        </View>
      </Section>

      {/* touch */}
      <Section title="Touch states" sub="Minimum target 52 · large mode 64 · wrong answers wobble, never buzz" i={6}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
          {[TOUCH.min, TOUCH.big].map(s => (
            <View key={s} style={{ alignItems: 'center' }}>
              <View style={{ width: s, height: s, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: C.coral, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: F.display, fontSize: 16, color: C.coral }}>{s}</Text>
              </View>
              <Text style={[T.bodySm, { marginTop: 3 }]}>{s === TOUCH.min ? 'min' : 'big'}</Text>
            </View>
          ))}
          <Tap onPress={() => setShake(n => n + 1)} a11y="Try the not-quite wobble" style={{ flex: 1 }}>
            <Wobble trigger={shake} style={{ height: TOUCH.big, borderRadius: 18, backgroundColor: C.coralSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: C.coralDeep }}>Tap: "not quite"</Text>
            </Wobble>
          </Tap>
        </View>
      </Section>

      {/* characters */}
      <Section title="Characters" sub="Numi moods and the story partners" i={6}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {MOODS.map(m => (
            <View key={m} style={{ alignItems: 'center' }}>
              <Numi size={70} mood={m} />
              <Text style={[T.bodySm, { marginTop: 4 }]}>{m}</Text>
            </View>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, marginTop: 16, paddingRight: 8 }}>
          {(Object.keys(CHARACTERS) as CharacterId[]).map(id => (
            <View key={id} style={{ alignItems: 'center', backgroundColor: CHARACTERS[id].soft, borderRadius: R.lg, paddingVertical: 10, paddingHorizontal: 12 }}>
              <Buddy id={id} size={64} />
              <Text style={{ fontFamily: F.display, fontSize: 15, color: C.ink, marginTop: 4 }}>{CHARACTERS[id].name}</Text>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 10.5, color: C.muted }}>{CHARACTERS[id].role}</Text>
            </View>
          ))}
        </ScrollView>
      </Section>

      <Text style={{ fontFamily: F.body, fontSize: 11, color: C.faint, textAlign: 'center', marginTop: 28 }}>
        NUMI design system · v4
      </Text>
    </Screen>
  );
}
