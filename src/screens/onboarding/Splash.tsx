import React, { useEffect } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Buddy, Numi } from '../../components/characters';
import { Drift, Enter, PulseRing } from '../../components/motion';
import { Wordmark } from '../../components/Brand';
import { DriftingClouds, Flock, House, Mountain, River, Sun, Tree, Windmill } from '../../components/scenery';
import { ChunkyButton, Tap } from '../../components/ui';
import { RootScreen } from '../../navigation/types';
import { useGame } from '../../store/game';
import { C, F } from '../../theme/tokens';

export default function Splash({ navigation }: RootScreen<'Splash'>) {
  const { width } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const onboarded = useGame(s => s.onboarded);
  const tag = useSharedValue(0);
  useEffect(() => { tag.value = withDelay(900, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })); }, []);
  const tagA = useAnimatedStyle(() => ({ opacity: tag.value, transform: [{ translateY: (1 - tag.value) * 12 }] }));

  return (
    <View style={{ flex: 1, backgroundColor: C.sky, overflow: 'hidden' }}>
      <DriftingClouds width={width} tops={[ins.top + 40, ins.top + 120, ins.top + 250]} />
      <Sun size={50} style={{ position: 'absolute', top: ins.top + 40, right: 6 }} />
      <Flock width={width} top={ins.top + 200} />

      {/* miniature world */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: ins.bottom + 90, backgroundColor: C.grass }} pointerEvents="none" />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: ins.bottom + 80, height: 420 }} pointerEvents="none">
        <Mountain w={210} h={200} color={C.hill} style={{ position: 'absolute', bottom: 190, left: -40 }} />
        <Mountain w={280} h={250} color={C.hillDeep} style={{ position: 'absolute', bottom: 190, left: width * 0.3 }} />
        <Mountain w={170} h={150} color={C.hill} style={{ position: 'absolute', bottom: 190, right: -50 }} snow={false} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, backgroundColor: C.grass }} />
        <View style={{ position: 'absolute', bottom: 186, left: 0, right: 0, height: 22, backgroundColor: '#8fcb97', borderTopLeftRadius: 40, borderTopRightRadius: 40 }} />
        <River width={width} height={52} style={{ position: 'absolute', bottom: 70 }} />
        {/* bridge */}
        <View style={{ position: 'absolute', bottom: 116, left: width / 2 - 90, width: 180, height: 14, borderRadius: 4, backgroundColor: C.wood, borderBottomWidth: 4, borderBottomColor: C.woodShadow }} />
        <View style={{ position: 'absolute', bottom: 70, left: width / 2 - 70, width: 9, height: 48, backgroundColor: C.woodDeep }} />
        <View style={{ position: 'absolute', bottom: 70, left: width / 2 + 60, width: 9, height: 48, backgroundColor: C.woodDeep }} />
        <View style={{ position: 'absolute', bottom: 150, left: width / 2 - 90, width: 180, height: 3, backgroundColor: C.woodDeep, opacity: 0.6 }} />
        <Drift from={width / 2 - 90} to={width / 2 + 60} duration={9000} style={{ position: 'absolute', bottom: 124, left: 0 }}>
          <Buddy id="nia" size={26} walking />
        </Drift>
        <Drift from={width / 2 + 60} to={width / 2 - 90} duration={11000} phase={0.4} style={{ position: 'absolute', bottom: 124, left: 0 }}>
          <Buddy id="pip" size={24} walking />
        </Drift>
        <House w={54} roof={C.coral} lit style={{ position: 'absolute', bottom: 132, left: 18 }} />
        <House w={44} roof={C.violet} style={{ position: 'absolute', bottom: 128, right: 20 }} />
        <House w={36} roof={C.sun} style={{ position: 'absolute', bottom: 150, right: 76 }} />
        <Windmill scale={0.9} style={{ position: 'absolute', bottom: 150, left: 84 }} />
        <Tree size={26} style={{ position: 'absolute', bottom: 24, left: 30 }} />
        <Tree size={34} color="#4f9463" style={{ position: 'absolute', bottom: 16, right: 40 }} />
        <Tree size={22} style={{ position: 'absolute', bottom: 150, right: 130 }} />
      </View>

      <View style={{ paddingTop: ins.top + 96, alignItems: 'center' }}>
        <Wordmark size={62} />
        <Animated.View style={[{ alignItems: 'center', marginTop: 16 }, tagA]}>
          <Text style={{ fontFamily: F.display, fontSize: 22, color: C.tealDeep }}>The World Runs on Math</Text>
          <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12, letterSpacing: 2.4, color: C.tealDeep, opacity: 0.7, marginTop: 2 }}>A NUMBERSHIRE ADVENTURE</Text>
        </Animated.View>
      </View>

      <Enter delay={700} dx={-60} dy={0} style={{ position: 'absolute', left: 14, bottom: ins.bottom + 306 }}>
        <Numi size={76} state="idle" />
      </Enter>

      <View style={{ position: 'absolute', left: 24, right: 24, bottom: ins.bottom + 26, gap: 10 }}>
        <Enter delay={1100}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <PulseRing color={C.coral} size={80} duration={2200} style={{ width: '100%', borderRadius: 30, height: 70 }} />
            <View style={{ width: '100%' }}>
              <ChunkyButton
                label={onboarded ? 'Continue Adventure' : 'Start Adventure'}
                onPress={() => (onboarded ? navigation.replace('Main') : navigation.navigate('Story'))}
              />
            </View>
          </View>
        </Enter>
        <Tap onPress={() => navigation.navigate('ParentGate', { target: 'Parent' })} a11y="Grown-ups area" style={{ alignSelf: 'center', backgroundColor: 'rgba(253,245,232,.9)', borderRadius: 16, paddingVertical: 11, paddingHorizontal: 18 }}>
          <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: C.tealDeep }}>Grown-ups →</Text>
        </Tap>
      </View>
    </View>
  );
}
