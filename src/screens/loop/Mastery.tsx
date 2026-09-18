// MASTERED MOMENT — learning itself unlocks the world.
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { ExplorerAvatar, Numi } from '../../components/characters';
import { Burst, Confetti, Rays, Stars } from '../../components/effects';
import { Bob, Enter, Pop, PulseRing, Stamp } from '../../components/motion';
import { SpeakableText } from '../../components/Storyteller';
import { ChunkyButton, Eyebrow, Screen } from '../../components/ui';
import { AREAS, SKILLS, SkillId } from '../../data/world';
import { RootScreen } from '../../navigation/types';
import { haptic, say } from '../../services/feedback';
import { areaStatus, useGame } from '../../store/game';
import { C, F, T } from '../../theme/tokens';

const POWER: Record<SkillId, { title: string; line: string }> = {
  addition: { title: 'MAKE A TEN', line: 'You can now build bridges of any length!' },
  subtraction: { title: 'FIND THE MISSING', line: 'You can now find what disappeared!' },
  multiplication: { title: 'EQUAL ROWS', line: 'You can now grow gardens in perfect rows!' },
  division: { title: 'EQUAL SHARING', line: 'You can now split groups fairly!' },
  fractions: { title: 'FAIR SLICES', line: 'You can now cut anything into equal parts!' },
  geometry: { title: 'SHAPE SENSE', line: 'You can now spot the shape of things!' },
  money: { title: 'COIN SENSE', line: 'You can now shop without going over!' },
};

export default function Mastery({ navigation, route }: RootScreen<'Mastery'>) {
  const { skill, level } = route.params;
  const S = SKILLS[skill];
  const P = POWER[skill];
  const ex = useGame(s => s.explorer);
  const completed = useGame(s => s.completed);
  const skillXp = useGame(s => s.skillXp);
  const shift = useGame(s => s.shiftMoment);
  const gate = AREAS.find(a => a.requires && 'skill' in a.requires && a.requires.skill === skill);
  const gateOpenable = gate ? areaStatus(gate, { completed, skillXp }) !== 'locked' : false;
  const [phase, setPhase] = useState(0); // 0 reveal · 1 absorbed · 2 gate shown · 3 opened
  const [burst, setBurst] = useState(0);

  const orb = useSharedValue(0);
  const doors = useSharedValue(0);
  const beam = useSharedValue(0);

  useEffect(() => {
    haptic.success();
    say(`New power mastered! ${P.title.toLowerCase()}. ${P.line}`);
    orb.value = withDelay(1500, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) }));
    const t1 = setTimeout(() => { setPhase(1); setBurst(b => b + 1); haptic.heavy(); }, 2450);
    const t2 = setTimeout(() => setPhase(2), 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const usePower = () => {
    haptic.heavy();
    beam.value = withSequence(withTiming(1, { duration: 450 }), withDelay(600, withTiming(0, { duration: 300 })));
    doors.value = withDelay(500, withSpring(1, { damping: 14, stiffness: 70 }));
    setTimeout(() => { setPhase(3); setBurst(b => b + 1); haptic.success(); say(gate ? `${gate.name} is open!` : 'Your power works!'); }, 900);
  };

  const orbA = useAnimatedStyle(() => ({
    opacity: interpolate(orb.value, [0, 0.9, 1], [1, 1, 0]),
    transform: [{ translateY: interpolate(orb.value, [0, 1], [0, 170]) }, { scale: interpolate(orb.value, [0, 1], [1, 0.3]) }],
  }));
  const leftDoor = useAnimatedStyle(() => ({ transform: [{ translateX: -doors.value * 70 }] }));
  const rightDoor = useAnimatedStyle(() => ({ transform: [{ translateX: doors.value * 70 }] }));
  const beamA = useAnimatedStyle(() => ({ opacity: beam.value, transform: [{ scaleY: beam.value }] }));

  const finish = () => {
    shift();
    const rest = useGame.getState().pendingMoments.find(m => m.kind === 'mastery');
    if (rest && rest.kind === 'mastery') navigation.replace('Mastery', { skill: rest.skill, level: rest.level });
    else navigation.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'World' } }] });
  };

  return (
    <Screen bg={C.night}>
      <Stars count={30} />
      {phase === 3 && <Confetti count={26} loop={false} />}
      <View style={{ alignItems: 'center' }}>
        <Stamp delay={200}><Eyebrow color={C.sun} style={{ fontSize: 13 }}>✨ NEW POWER MASTERED</Eyebrow></Stamp>
        <Pop delay={400}>
          <SpeakableText text={P.title} variant="hero" iconColor={C.sun} style={{ color: C.cream, textAlign: 'center', marginTop: 4 }} />
        </Pop>
        <Enter delay={700}>
          <SpeakableText
            text={P.line}
            iconColor={C.sun}
            style={{ fontFamily: F.bodyBold, fontSize: 15, lineHeight: 21, color: 'rgba(253,245,232,.85)', textAlign: 'center' }}
          />
        </Enter>
      </View>

      <View style={{ alignItems: 'center', height: 290, marginTop: 10 }}>
        {phase < 2 && <Rays size={300} color="rgba(245,181,60,.16)" style={{ top: 0 }} />}
        <Animated.View style={[{ position: 'absolute', top: 10, alignItems: 'center', justifyContent: 'center' }, orbA]}>
          <PulseRing color={S.color} size={86} />
          <View style={{ width: 86, height: 86, borderRadius: 43, backgroundColor: S.color, borderWidth: 5, borderColor: C.cream, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 40 }}>{S.icon}</Text>
          </View>
        </Animated.View>

        {phase >= 2 && gate && (
          <Enter style={{ position: 'absolute', right: 0, top: 70, alignItems: 'center' }}>
            <View style={{ width: 150, height: 170, borderRadius: 18, overflow: 'hidden', backgroundColor: gate.color, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 60 }}>{gate.icon}</Text>
              <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 75, backgroundColor: '#6b5a4a', borderRightWidth: 3, borderColor: '#4c3f33' }, leftDoor]}>
                {[0, 1, 2, 3].map(i => <View key={i} style={{ height: 3, backgroundColor: '#4c3f33', marginTop: 34 }} />)}
              </Animated.View>
              <Animated.View style={[{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 75, backgroundColor: '#6b5a4a', borderLeftWidth: 3, borderColor: '#4c3f33' }, rightDoor]}>
                {[0, 1, 2, 3].map(i => <View key={i} style={{ height: 3, backgroundColor: '#4c3f33', marginTop: 34 }} />)}
              </Animated.View>
              {phase === 2 && <View style={{ position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: C.sun, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>{S.icon}</Text></View>}
            </View>
            <View style={{ backgroundColor: C.cream, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 }}>
              <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11, color: C.ink }}>{phase === 3 ? `${gate.name.toUpperCase()} OPEN` : `${S.power.toUpperCase()} LV ${(gate.requires as { level: number }).level}`}</Text>
            </View>
          </Enter>
        )}
        <Animated.View style={[{ position: 'absolute', left: 110, top: 150, width: 120, height: 10, borderRadius: 5, backgroundColor: S.color, transformOrigin: 'left center' }, beamA]} />

        <View style={{ position: 'absolute', bottom: 0, left: phase >= 2 && gate ? 0 : undefined, alignItems: 'center' }}>
          {phase >= 1 && <PulseRing color={S.color} size={150} duration={1400} style={{ top: 10 }} />}
          <Bob amp={phase >= 1 ? 6 : 2} duration={900}><ExplorerAvatar {...ex} size={150} cheering={phase === 1 || phase === 3} mood="wow" /></Bob>
          <Burst trigger={burst} x={75} y={80} count={20} dist={120} colors={[S.color, C.sun, C.cream]} />
          {phase >= 1 && (
            <View style={{ position: 'absolute', top: 70, right: -6, width: 34, height: 34, borderRadius: 17, backgroundColor: S.color, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.cream }}>
              <Text style={{ fontSize: 16 }}>{S.icon}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(253,245,232,.1)', borderRadius: 22, padding: 12, marginTop: 14 }}>
        <Numi size={48} mood="wow" state={phase === 3 ? 'celebrate' : 'speaking'} />
        <View style={{ flex: 1 }}>
        <SpeakableText
          text={phase < 2 ? `${S.power} is now level ${level}. That power is yours to keep.`
            : phase === 2 ? (gate ? (gateOpenable ? `This gate only opens for ${S.power}. Use it!` : `This gate needs more ${S.power} — you're getting close!`) : 'Try out your new power!')
              : gate ? `Your learning opened ${gate.name}! A whole new place to explore.` : 'Amazing. Your power is ready for every mission.'}
          iconColor={C.sun}
          style={{ fontFamily: F.bodyBold, fontSize: 13.5, lineHeight: 19, color: C.cream }}
        />
        </View>
      </View>
      <View style={{ flex: 1, minHeight: 12 }} />
      {phase === 2 && gate && gateOpenable
        ? <ChunkyButton label="Use your power!" icon={S.icon} color={C.sun} shadow={C.sunDeep} textColor={C.ink} onPress={usePower} />
        : phase >= 2 || phase === 3
          ? <ChunkyButton label={phase === 3 && gate ? `Explore ${gate.name}` : 'Back to the map'} color={C.teal} shadow={C.tealDeep} onPress={finish} />
          : <View style={{ height: 70 }} />}
    </Screen>
  );
}
