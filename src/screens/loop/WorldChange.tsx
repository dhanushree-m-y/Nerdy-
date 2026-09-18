// WORLD CHANGE — "My learning changed this world."
import React, { useEffect, useMemo } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Buddy } from '../../components/characters';
import { Burst } from '../../components/effects';
import { Drift, Enter, Pop } from '../../components/motion';
import { House, Lamp, River, Sun } from '../../components/scenery';
import { SpeakableText } from '../../components/Storyteller';
import { ChunkyButton, Eyebrow, ProgressBar, Screen } from '../../components/ui';
import { AREAS, MISSIONS, SKILLS, SkillId } from '../../data/world';
import { levelFromXp, levelProgress } from '../../learning/engine';
import { RootScreen } from '../../navigation/types';
import { say } from '../../services/feedback';
import { areaStatus, useGame } from '../../store/game';
import { C, F, T } from '../../theme/tokens';

function Diorama({ fixed, w, mission }: { fixed: boolean; w: number; mission: string }) {
  return (
    <View style={{ height: 170, borderRadius: 20, overflow: 'hidden', backgroundColor: fixed ? C.sky : '#b9c4c9' }}>
      {fixed && <Sun size={22} style={{ position: 'absolute', right: -2, top: -2 }} />}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 }}><River width={w} height={60} /></View>
      {!fixed && <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, backgroundColor: 'rgba(90,100,110,.45)' }} />}
      <View style={{ position: 'absolute', bottom: 56, left: 0, width: w * 0.3, height: 44, backgroundColor: fixed ? C.grass : '#9fae9c' }} />
      <View style={{ position: 'absolute', bottom: 56, right: 0, width: w * 0.3, height: 44, backgroundColor: fixed ? C.grass : '#9fae9c' }} />
      <House w={30} roof={C.coral} lit={fixed} dim={!fixed} style={{ position: 'absolute', bottom: 96, left: 6 }} />
      <House w={26} roof={C.violet} lit={fixed} dim={!fixed} style={{ position: 'absolute', bottom: 96, right: 6 }} />
      {fixed ? (
        <>
          <Pop delay={600} style={{ position: 'absolute', bottom: 78, left: w * 0.24, right: w * 0.24 }}>
            <View style={{ height: 12, backgroundColor: mission === 'bridge' ? C.wood : C.sun, borderRadius: 3, borderBottomWidth: 4, borderBottomColor: C.woodShadow }} />
          </Pop>
          <Drift from={w * 0.12} to={w * 0.7} duration={5200} style={{ position: 'absolute', bottom: 88, left: 0 }}><Buddy id="nia" size={22} walking /></Drift>
          <Drift from={w * 0.72} to={w * 0.1} duration={6400} phase={0.4} style={{ position: 'absolute', bottom: 88, left: 0 }}><Buddy id="pip" size={20} walking /></Drift>
          <Lamp lit style={{ position: 'absolute', bottom: 98, left: w * 0.3 }} />
        </>
      ) : (
        <>
          <View style={{ position: 'absolute', bottom: 78, left: w * 0.24, width: 22, height: 10, backgroundColor: '#9c8a78', transform: [{ rotate: '14deg' }] }} />
          <View style={{ position: 'absolute', bottom: 78, right: w * 0.24, width: 22, height: 10, backgroundColor: '#9c8a78', transform: [{ rotate: '-12deg' }] }} />
        </>
      )}
    </View>
  );
}

export default function WorldChange({ navigation, route }: RootScreen<'WorldChange'>) {
  const { mission } = route.params;
  const M = MISSIONS[mission];
  const { width } = useWindowDimensions();
  const half = (Math.min(width, 440) - 50) / 2;
  const completed = useGame(s => s.completed);
  const skillXp = useGame(s => s.skillXp);
  const moments = useGame(s => s.pendingMoments);
  const area = AREAS.find(a => a.id === M.area)!;

  // Which areas did this mission newly make reachable?
  const unlocked = useMemo(() => {
    const without = { ...completed };
    delete without[mission];
    return AREAS.filter(a => a.id !== area.id && areaStatus(a, { completed: without, skillXp }) === 'locked' && areaStatus(a, { completed, skillXp }) !== 'locked');
  }, []);
  const nextArea = AREAS.find(a => areaStatus(a, { completed, skillXp }) === 'damaged');

  const wipe = useSharedValue(0);
  useEffect(() => {
    wipe.value = withDelay(500, withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) }));
    say(M.restores);
  }, []);
  const after = useAnimatedStyle(() => ({ opacity: interpolate(wipe.value, [0, 0.4, 1], [0.2, 0.8, 1]), transform: [{ scale: interpolate(wipe.value, [0, 1], [0.94, 1]) }] }));

  const skills: SkillId[] = [M.skill, ...(['addition', 'subtraction', 'multiplication', 'division', 'fractions'] as SkillId[]).filter(k => k !== M.skill)].slice(0, 4);

  const onward = () => {
    const mastery = moments.find(m => m.kind === 'mastery');
    useGame.setState({ pendingMoments: moments.filter(m => m.kind === 'mastery') });
    if (mastery && mastery.kind === 'mastery') navigation.replace('Mastery', { skill: mastery.skill, level: mastery.level });
    else navigation.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'World' } }] });
  };

  return (
    <Screen scroll>
      <Eyebrow>THE WORLD CHANGED</Eyebrow>
      <SpeakableText text={M.restores} variant="h1" style={{ marginTop: 4 }} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <View style={{ flex: 1 }}>
          <Diorama fixed={false} w={half} mission={mission} />
          <Text style={[T.eyebrow, { marginTop: 7 }]}>BEFORE</Text>
        </View>
        <Animated.View style={[{ flex: 1 }, after]}>
          <Diorama fixed w={half} mission={mission} />
          <Burst trigger={1} x={half / 2} y={80} count={14} dist={70} />
          <Text style={[T.eyebrow, { marginTop: 7, color: C.tealDeep }]}>AFTER · {area.name.toUpperCase()}</Text>
        </Animated.View>
      </View>

      <Eyebrow style={{ marginTop: 18 }}>WHAT'S NEW</Eyebrow>
      <View style={{ gap: 9, marginTop: 8 }}>
        <Enter delay={900}>
          <Row icon={area.icon} bg={C.teal} title={`${area.name} restored`} sub="Villagers are back and the lights are on" tag="FIXED" />
        </Enter>
        {unlocked.map((u, i) => (
          <Enter key={u.id} delay={1050 + i * 120}>
            <Row icon={u.icon} bg={u.color} title={`${u.name} unlocked`} sub="A new place to explore on your map" tag="NEW" />
          </Enter>
        ))}
        {nextArea && (
          <Enter delay={1300}>
            <Row icon="🧭" bg={C.violet} title={`Next adventure: ${nextArea.name}`} sub="Numi is already waiting there" tag="NEXT" />
          </Enter>
        )}
      </View>

      <Eyebrow style={{ marginTop: 18 }}>YOUR MATH POWERS</Eyebrow>
      <View style={{ backgroundColor: C.cream, borderRadius: 22, padding: 14, marginTop: 8, gap: 12, borderWidth: 2, borderColor: C.sandLine }}>
        {skills.map((k, i) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 20, width: 28 }}>{SKILLS[k].icon}</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: C.ink }}>{SKILLS[k].name}{k === M.skill ? '  ↑' : ''}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 14, color: C.tealDeep }}>Level {levelFromXp(skillXp[k] ?? 0)}</Text>
              </View>
              <ProgressBar value={levelProgress(skillXp[k] ?? 0)} height={9} delay={1200 + i * 120} colors={[SKILLS[k].color]} style={{ marginTop: 4 }} />
            </View>
          </View>
        ))}
      </View>
      <View style={{ flex: 1, minHeight: 16 }} />
      <ChunkyButton label="Back to the map" icon="🗺️" color={C.teal} shadow={C.tealDeep} style={{ marginTop: 16 }} onPress={onward} />
    </Screen>
  );
}

function Row({ icon, bg, title, sub, tag }: { icon: string; bg: string; title: string; sub: string; tag: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.cream, borderRadius: 20, padding: 12, borderWidth: 2, borderColor: C.sandLine }}>
      <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>{icon}</Text></View>
      <View style={{ flex: 1 }}>
        <SpeakableText
          text={`${title}. ${sub}.`}
          showIcon={false}
          style={{ fontFamily: F.bodyHeavy, fontSize: 14, lineHeight: 20, color: C.ink }}
        >
          {title}
        </SpeakableText>
        <Text style={[T.bodySm, { fontSize: 13, lineHeight: 18 }]}>{sub}</Text>
      </View>
      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11, color: C.teal }}>{tag}</Text>
    </View>
  );
}
