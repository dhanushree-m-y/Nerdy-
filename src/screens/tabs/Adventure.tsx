import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Text, View } from 'react-native';
import { Buddy, Numi } from '../../components/characters';
import { Bob, Enter, PulseRing, Sway } from '../../components/motion';
import { Train } from '../../components/scenery';
import { SpeakableText, SpeakButton } from '../../components/Storyteller';
import { Eyebrow, ProgressBar, Purse, Screen, Tap } from '../../components/ui';
import { AREAS, MissionId, MISSIONS, SKILLS } from '../../data/world';
import { buildTodaysAdventure } from '../../learning/engine';
import { RootParams } from '../../navigation/types';
import { areaStatus, useGame } from '../../store/game';
import { C, F, softShadow, T } from '../../theme/tokens';

const ORDER: MissionId[] = ['bridge', 'market', 'cafe', 'farm', 'picnic', 'mystery', 'boss'];

function Chest({ open }: { open: boolean }) {
  return (
    <Sway deg={open ? 0 : 6} duration={420}>
      <View style={{ width: 58, height: 48 }}>
        <View style={{ position: 'absolute', bottom: 0, width: 58, height: 30, borderRadius: 7, backgroundColor: '#b07a4a', borderBottomWidth: 4, borderBottomColor: C.woodShadow }} />
        <View style={{ position: 'absolute', top: open ? -6 : 4, width: 58, height: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: C.woodDeep, transform: [{ rotate: open ? '-18deg' : '0deg' }] }} />
        <View style={{ position: 'absolute', left: 24, top: 18, width: 10, height: 14, borderRadius: 3, backgroundColor: C.sun }} />
      </View>
    </Sway>
  );
}

export default function Adventure() {
  const nav = useNavigation();
  const s = useGame();
  const plan = buildTodaysAdventure({ skillXp: s.skillXp, struggles: s.struggles.filter(x => !x.resolved), explorerName: s.explorer.name });
  const todayStr = new Date().toISOString().slice(0, 10);
  const done = s.todayDone.date === todayStr ? s.todayDone.stops.length : 0;
  const statusOf = (m: MissionId) => {
    const area = AREAS.find(a => a.mission === m);
    if (!area) return s.completed[m] ? 'restored' : 'damaged';
    return areaStatus(area, s);
  };

  const side: { title: string; sub: string; icon: string; bg: string; route: keyof RootParams }[] = [
    { title: 'Math Around Me', sub: 'Missions in your own house', icon: '🏠', bg: '#f6e1b0', route: 'AroundMe' },
    { title: 'Class Mission', sub: 'Save the Space Station together', icon: '🛰️', bg: '#d6cef2', route: 'Classroom' },
    { title: 'Numi Remembers', sub: 'Yesterday\'s wobble, today\'s story', icon: '💭', bg: C.sky, route: 'Memory' },
    { title: 'Learning Partners', sub: 'Meet Nia, Milo, Pip, Zuri & Nova', icon: '🤝', bg: '#c7e8b8', route: 'Characters' },
  ];

  return (
    <Screen scroll bg={C.cream} style={{ paddingBottom: 130 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SpeakableText text="Adventure" variant="h1" />
        <Purse />
      </View>
      <SpeakableText
        text="Pick a mission to help Numbershire. Tap any card to start."
        autoRead
        style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted, marginTop: 4 }}
      />

      {/* Today's adventure */}
      <Enter delay={60}>
        <Tap onPress={() => nav.navigate('Today')} a11y="Today's adventure" style={[{ marginTop: 14, backgroundColor: C.ink, borderRadius: 28, padding: 18, overflow: 'hidden' }, softShadow(0.2, 8)]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <Eyebrow color={C.sun}>TODAY'S ADVENTURE</Eyebrow>
            <SpeakButton
              dark
              text={`Today's adventure. ${plan.title}. The bakery train needs your help. About ${plan.minutes} minutes.`}
              style={{ width: 34, height: 34, borderRadius: 17 }}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <View style={{ flex: 1 }}>
              <Text style={[T.h2, { color: C.cream }]}>{plan.icon} {plan.title}</Text>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: 'rgba(253,245,232,.75)', marginTop: 4 }}>The bakery train needs your help · {plan.minutes} min</Text>
            </View>
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {done < 5 && <PulseRing color={C.sun} size={64} />}
              <Chest open={done >= 5} />
            </View>
          </View>
          <View style={{ height: 34, marginTop: 10, justifyContent: 'flex-end' }}>
            <View style={{ height: 4, backgroundColor: 'rgba(253,245,232,.25)', borderRadius: 2 }} />
            <View style={{ position: 'absolute', bottom: 2, left: `${(done / 5) * 70}%` }}>
              <Train scale={0.55} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <ProgressBar value={done / 5} track="rgba(253,245,232,.15)" height={10} style={{ flex: 1 }} />
            <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: C.sun }}>{done}/5 stops</Text>
          </View>
        </Tap>
      </Enter>

      {/* Missions */}
      <Eyebrow style={{ marginTop: 22 }}>STORY MISSIONS</Eyebrow>
      <View style={{ gap: 10, marginTop: 9 }}>
        {ORDER.map((m, i) => {
          const M = MISSIONS[m];
          const st = statusOf(m);
          const locked = st === 'locked';
          const area = AREAS.find(a => a.id === M.area)!;
          return (
            <Enter key={m} delay={120 + i * 55}>
              <Tap
                onPress={() => (locked ? nav.navigate('Main', { screen: 'World' }) : nav.navigate('Mission', { mission: m }))}
                a11y={`${M.title}${locked ? ', locked' : ''}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: locked ? '#efebe4' : C.cream, borderRadius: 24, padding: 10, borderWidth: 2, borderColor: st === 'restored' ? C.teal : C.sandLine, borderBottomWidth: 5, opacity: locked ? 0.7 : 1 }}
              >
                <View style={{ width: 62, height: 62, borderRadius: 18, backgroundColor: locked ? C.locked : CHAR_BG[M.character], alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
                  <Buddy id={M.character} size={48} mood={st === 'restored' ? 'happy' : 'worried'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[T.h3, { fontSize: 17 }]}>{M.title}</Text>
                  <Text style={[T.bodySm, { fontSize: 13, lineHeight: 18 }]}>{area.name} · {SKILLS[M.skill].icon} {SKILLS[M.skill].name}</Text>
                </View>
                <SpeakButton
                  text={`${M.title}. ${area.name}. ${SKILLS[M.skill].name}.${locked ? ' This one is still locked.' : ''}`}
                  style={{ width: 34, height: 34, borderRadius: 17 }}
                />
                <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: st === 'restored' ? C.teal : locked ? C.locked : C.coral, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: F.display, fontSize: 16, color: C.cream }}>{st === 'restored' ? '✓' : locked ? '🔒' : '▶'}</Text>
                </View>
              </Tap>
            </Enter>
          );
        })}
      </View>

      <Eyebrow style={{ marginTop: 22 }}>MORE TO EXPLORE</Eyebrow>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 9 }}>
        {side.map((x, i) => (
          <Enter key={x.title} delay={300 + i * 60} style={{ width: '48%', flexGrow: 1 }}>
            <Tap onPress={() => nav.navigate(x.route as never)} a11y={x.title} style={{ backgroundColor: x.bg, borderRadius: 24, padding: 14, minHeight: 120, borderBottomWidth: 5, borderBottomColor: 'rgba(34,48,59,.12)' }}>
              <Bob amp={3} duration={1800 + i * 200}><Text style={{ fontSize: 30 }}>{x.icon}</Text></Bob>
              <Text style={[T.h3, { fontSize: 16, marginTop: 6 }]}>{x.title}</Text>
              <Text style={[T.bodySm, { fontSize: 13, lineHeight: 18 }]}>{x.sub}</Text>
              <SpeakButton text={`${x.title}. ${x.sub}.`} style={{ position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16 }} />
            </Tap>
          </Enter>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, backgroundColor: C.sandLine, borderRadius: 22, padding: 12 }}>
        <Numi size={44} />
        <View style={{ flex: 1 }}>
          <SpeakableText
            text="Every mission fixes a piece of Numbershire. I'll pick the right size of challenge for you."
            variant="body"
            style={{ fontSize: 13, lineHeight: 19 }}
          />
        </View>
      </View>
    </Screen>
  );
}

const CHAR_BG = { nia: C.coralSoft, milo: C.sunSoft, pip: C.tealSoft, zuri: C.violetSoft, nova: '#e5eff5' } as const;
