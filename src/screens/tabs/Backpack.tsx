// Backpack tab — a real adventure-game backpack: items you carry + the math powers you've grown.
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Bob, Enter, Pop, Shimmer, Squash } from '../../components/motion';
import { SpeakableText, SpeakButton } from '../../components/Storyteller';
import { ChunkyButton, Eyebrow, ProgressBar, Purse, Screen, SpeechBubble, Tap, TopBar, Txt } from '../../components/ui';
import { AREAS, ItemId, ITEMS, SKILLS, SkillId } from '../../data/world';
import { levelFromXp, levelProgress } from '../../learning/engine';
import { useGame } from '../../store/game';
import { C, F, softShadow } from '../../theme/tokens';

const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
const POWER_IDS = (Object.keys(SKILLS) as SkillId[]).filter(s => s !== 'money');

function ItemTile({ id, count, index, bounce, onPress, onLongPress, selected }: {
  id: ItemId; count: number; index: number; bounce: number; selected: boolean; onPress: () => void; onLongPress: () => void;
}) {
  const it = ITEMS[id];
  const empty = count <= 0;
  return (
    <Pop delay={120 + index * 60} style={{ width: '25%', padding: 4 }}>
      <Tap onPress={onPress} onLongPress={onLongPress} a11y={`${it.name}, ${count}. Hold to inspect.`}>
        <Squash trigger={bounce}>
          <View
            style={{
              backgroundColor: it.color, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
              minHeight: 72, paddingVertical: 8, opacity: empty ? 0.45 : 1,
              borderWidth: 3, borderColor: selected ? C.sun : 'transparent',
              borderBottomWidth: 5, borderBottomColor: selected ? C.sunDeep : 'rgba(34,48,59,.12)',
            }}
          >
            <Text style={{ fontSize: 28 }}>{it.icon}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 14, lineHeight: 17, color: C.ink }}>×{count}</Text>
          </View>
        </Squash>
      </Tap>
    </Pop>
  );
}

function BackpackBag({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 26, alignItems: 'center' }}>
      <Bob amp={3} duration={2400} style={{ width: '100%', alignItems: 'center' }}>
        {/* handle */}
        <View style={{ width: 86, height: 34, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 9, borderBottomWidth: 0, borderColor: C.woodDeep, marginBottom: -8 }} />
        {/* straps peeking out on the sides */}
        <View style={{ position: 'absolute', left: -2, top: 60, width: 18, height: 150, borderRadius: 9, backgroundColor: C.woodShadow }} />
        <View style={{ position: 'absolute', right: -2, top: 60, width: 18, height: 150, borderRadius: 9, backgroundColor: C.woodShadow }} />
        {/* bag body */}
        <View style={[{ width: '94%', backgroundColor: C.coral, borderRadius: 34, paddingTop: 58, paddingHorizontal: 12, paddingBottom: 16, borderBottomWidth: 9, borderBottomColor: C.coralDeep }, softShadow(0.14, 8)]}>
          {/* flap */}
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 50, borderTopLeftRadius: 34, borderTopRightRadius: 34, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, backgroundColor: C.coralDeep, alignItems: 'center', justifyContent: 'flex-end' }}>
            <View style={{ width: 44, height: 22, borderRadius: 7, backgroundColor: C.sun, marginBottom: -11, borderWidth: 3, borderColor: C.sunDeep, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 12, height: 6, borderRadius: 3, backgroundColor: C.sunDeep }} />
            </View>
          </View>
          {/* stitched inner pocket */}
          <View style={{ backgroundColor: C.cream, borderRadius: 22, padding: 6, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(201,80,47,.35)' }}>
            {children}
          </View>
          {/* front pocket */}
          <View style={{ alignSelf: 'center', marginTop: 10, width: '52%', height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,.08)' }} />
        </View>
      </Bob>
    </View>
  );
}

function PowerCard({ id, xp, index }: { id: SkillId; xp: number; index: number }) {
  const sk = SKILLS[id];
  const lvl = levelFromXp(xp);
  const glow = lvl >= 4;
  return (
    <Enter delay={200 + index * 70} style={{ width: '50%', padding: 5 }}>
      <View style={[{ backgroundColor: C.cream, borderRadius: 20, padding: 13, borderBottomWidth: 5, borderBottomColor: 'rgba(34,48,59,.12)' }, glow && { borderWidth: 2, borderColor: sk.color }]}>
        {glow && <Shimmer style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 20, backgroundColor: sk.color }} min={0.05} max={0.22} />}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: sk.color, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: sk.deep }}>
            <Text style={{ fontSize: 20 }}>{sk.icon}</Text>
          </View>
          <View style={{ backgroundColor: sk.deep, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontFamily: F.display, fontSize: 13, color: C.cream }}>Lv {lvl}</Text>
          </View>
        </View>
        <SpeakableText
          text={`${sk.power}. Level ${lvl}.`}
          showIcon={false}
          style={{ fontFamily: F.display, fontSize: 15, lineHeight: 18, color: C.ink, marginTop: 9 }}
        >
          {sk.power}
        </SpeakableText>
        <ProgressBar value={levelProgress(xp)} height={9} colors={[sk.color]} delay={300 + index * 70} style={{ marginTop: 8 }} />
        <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12, color: glow ? sk.deep : C.faint, marginTop: 6 }}>{glow ? 'GLOWING!' : `LEVEL ${lvl + 1} SOON`}</Text>
      </View>
    </Enter>
  );
}

export default function Backpack() {
  const nav = useNavigation();
  const backpack = useGame(s => s.backpack);
  const skillXp = useGame(s => s.skillXp);
  const [picked, setPicked] = useState<{ id: ItemId; n: number } | null>(null);
  const [inspect, setInspect] = useState<ItemId | null>(null);

  const locked = AREAS.flatMap(a => {
    const r = a.requires;
    if (!r || !('skill' in r)) return [];
    const lvl = levelFromXp(skillXp[r.skill] ?? 0);
    return lvl < r.level ? [{ area: a, skill: r.skill, need: r.level }] : [];
  });

  const sel = picked ? ITEMS[picked.id] : null;

  return (
    <Screen scroll bg={C.sand} style={{ paddingBottom: 120 }}>
      <TopBar back={null} title="BACKPACK" />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <SpeakableText text="Backpack" variant="h1" />
        <Purse />
      </View>
      <SpeakableText text="Tap to peek. Hold to inspect." autoRead variant="bodySm" style={{ fontSize: 13, lineHeight: 18, marginTop: 2 }} />

      <BackpackBag>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {ITEM_IDS.map((id, i) => (
            <ItemTile
              key={id} id={id} index={i} count={backpack[id] ?? 0}
              selected={picked?.id === id}
              bounce={picked?.id === id ? picked.n : 0}
              onPress={() => setPicked(p => ({ id, n: p?.id === id ? p.n + 1 : 1 }))}
              onLongPress={() => setInspect(id)}
            />
          ))}
        </View>
      </BackpackBag>

      {sel && picked ? (
        <Pop key={picked.id} style={{ marginTop: 14 }}>
          <SpeechBubble tail="top">
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 17, color: C.ink }}>{sel.icon} {sel.name} ×{backpack[picked.id] ?? 0}</Text>
                <Text style={{ fontFamily: F.bodyBold, fontSize: 14, lineHeight: 20, color: C.ink, marginTop: 2 }}>{sel.use}</Text>
                <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted, marginTop: 4 }}>Items become usable inside math challenges.</Text>
              </View>
              <SpeakButton text={`${sel.name}. You have ${backpack[picked.id] ?? 0}. ${sel.use}`} />
            </View>
          </SpeechBubble>
        </Pop>
      ) : null}

      <Eyebrow style={{ marginTop: 26, color: '#877f6d' }}>MATH POWERS</Eyebrow>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, marginTop: 6 }}>
        {POWER_IDS.map((id, i) => <PowerCard key={id} id={id} xp={skillXp[id] ?? 0} index={i} />)}
      </View>

      {locked.map((l, i) => (
        <Enter key={l.area.id} delay={600 + i * 80} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(253,245,232,.5)', borderRadius: 20, padding: 13, borderWidth: 2, borderStyle: 'dashed', borderColor: C.sandDeep }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.locked, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20 }}>🔒</Text>
            </View>
            <View style={{ flex: 1 }}>
              <SpeakableText
                text={`${SKILLS[l.skill].power} level ${l.need} required. It opens ${l.area.name}.`}
                showIcon={false}
                style={{ fontFamily: F.bodyHeavy, fontSize: 13.5, lineHeight: 19, color: C.ink }}
              >
                {SKILLS[l.skill].power} Level {l.need} Required
              </SpeakableText>
              <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted, marginTop: 2 }}>→ opens {l.area.icon} {l.area.name}</Text>
            </View>
          </View>
        </Enter>
      ))}

      <ChunkyButton label="Strategy Book →" color={C.teal} shadow={C.tealDeep} onPress={() => nav.navigate('StrategyBook')} style={{ marginTop: 20 }} />

      <Modal visible={!!inspect} transparent animationType="fade" onRequestClose={() => setInspect(null)}>
        <Pressable onPress={() => setInspect(null)} style={{ flex: 1, backgroundColor: 'rgba(15,23,32,.55)', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
          {inspect ? (
            <Pop key={inspect} style={{ width: '100%' }}>
              <View style={[{ backgroundColor: C.cream, borderRadius: 30, padding: 22, alignItems: 'center', borderBottomWidth: 8, borderBottomColor: C.sandDeep }, softShadow(0.25, 10)]}>
                <Eyebrow>INSPECTING</Eyebrow>
                <Bob amp={8} duration={1400} style={{ marginTop: 12 }}>
                  <View style={{ width: 130, height: 130, borderRadius: 36, backgroundColor: ITEMS[inspect].color, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 72 }}>{ITEMS[inspect].icon}</Text>
                  </View>
                </Bob>
                <Txt variant="h1" style={{ marginTop: 14 }}>{ITEMS[inspect].name}</Txt>
                <Text style={{ fontFamily: F.display, fontSize: 40, lineHeight: 44, color: C.teal }}>×{backpack[inspect] ?? 0}</Text>
                <SpeakableText text={ITEMS[inspect].use} variant="body" style={{ textAlign: 'center', marginTop: 6 }} />
                <Txt variant="bodySm" style={{ fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 4 }}>You can use these inside math challenges.</Txt>
                <ChunkyButton label="Put it back" size="md" color={C.ink} shadow={C.inkDeep} onPress={() => setInspect(null)} style={{ marginTop: 16, alignSelf: 'stretch' }} />
              </View>
            </Pop>
          ) : null}
        </Pressable>
      </Modal>
    </Screen>
  );
}
