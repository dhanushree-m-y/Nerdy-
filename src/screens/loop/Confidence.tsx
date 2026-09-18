// CONFIDENCE CHECK-IN — a feeling, never a score. Insights go privately to grown-ups.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Numi } from '../../components/characters';
import { Enter, useLoop } from '../../components/motion';
import { SpeakableText, SpeakButton } from '../../components/Storyteller';
import { ChunkyButton, Eyebrow, Screen, Tap } from '../../components/ui';
import { Confidence as Conf } from '../../learning/engine';
import { goNext } from '../../navigation/flow';
import { RootScreen } from '../../navigation/types';
import { say } from '../../services/feedback';
import { useGame } from '../../store/game';
import { C, F, T } from '../../theme/tokens';

const OPTS: { id: Conf; label: string; face: string; eye: [number, number]; mouth: 'smile' | 'grin' | 'wavy' | 'o'; reply: string }[] = [
  { id: 'easy', label: 'Easy', face: '#c7e8b8', eye: [10, 10], mouth: 'grin', reply: 'Easy-peasy! I\'ll find you something a bit bigger next time.' },
  { id: 'got-it', label: 'I got it', face: '#d8ecc4', eye: [9, 9], mouth: 'smile', reply: 'You did! That feeling is worth remembering.' },
  { id: 'tricky', label: 'A little tricky', face: '#f6e1b0', eye: [9, 6], mouth: 'wavy', reply: 'Tricky means your brain was growing. Nice work sticking with it.' },
  { id: 'need-help', label: 'I need more help', face: '#f6c9b8', eye: [11, 11], mouth: 'o', reply: 'Thanks for telling me. We\'ll try it a different way next time — together.' },
];

function Face({ o, active }: { o: (typeof OPTS)[number]; active: boolean }) {
  const v = useLoop(500, { enabled: active });
  const a = useAnimatedStyle(() => ({ transform: [{ rotate: `${(v.value - 0.5) * 16}deg` }, { scale: 1 + v.value * 0.08 }] }));
  return (
    <Animated.View style={[{ width: 54, height: 54, borderRadius: 27, backgroundColor: o.face }, a]}>
      <View style={{ position: 'absolute', left: 14, top: 18, width: o.eye[0], height: o.eye[1], borderRadius: 6, backgroundColor: C.ink }} />
      <View style={{ position: 'absolute', right: 14, top: 18, width: o.eye[0], height: o.eye[1], borderRadius: 6, backgroundColor: C.ink }} />
      {o.mouth === 'grin' && <View style={{ position: 'absolute', left: 16, bottom: 11, width: 22, height: 11, borderBottomLeftRadius: 11, borderBottomRightRadius: 11, backgroundColor: C.ink }} />}
      {o.mouth === 'smile' && <View style={{ position: 'absolute', left: 19, bottom: 12, width: 16, height: 7, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: C.ink }} />}
      {o.mouth === 'wavy' && <View style={{ position: 'absolute', left: 18, bottom: 14, width: 18, height: 4, borderRadius: 2, backgroundColor: C.ink, transform: [{ rotate: '-8deg' }] }} />}
      {o.mouth === 'o' && <View style={{ position: 'absolute', left: 22, bottom: 10, width: 11, height: 12, borderRadius: 6, backgroundColor: C.ink }} />}
    </Animated.View>
  );
}

export default function Confidence({ navigation, route }: RootScreen<'Confidence'>) {
  const { mission } = route.params;
  const record = useGame(s => s.recordConfidence);
  const [pick, setPick] = useState<number | null>(null);

  const choose = (i: number) => {
    setPick(i);
    record(mission, OPTS[i].id);
    say(OPTS[i].reply);
  };

  return (
    <Screen bg={C.teal}>
      <Eyebrow color="rgba(253,245,232,.7)">AFTER THE MISSION</Eyebrow>
      <SpeakableText text="How did that feel?" variant="hero" iconColor={C.sun} style={{ color: C.cream, marginTop: 4 }} />
      <SpeakableText
        text="No right answer. Numi just wants to know."
        autoRead
        iconColor={C.sun}
        style={{ fontFamily: F.bodyBold, fontSize: 14, lineHeight: 20, color: 'rgba(253,245,232,.85)', marginTop: 6 }}
      />
      <View style={{ gap: 10, marginTop: 20 }}>
        {OPTS.map((o, i) => {
          const on = pick === i;
          return (
            <Enter key={o.id} delay={100 + i * 90}>
              <Tap onPress={() => choose(i)} a11y={o.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: on ? C.cream : 'rgba(253,245,232,.16)', borderRadius: 28, padding: 12, borderBottomWidth: on ? 6 : 0, borderBottomColor: 'rgba(0,0,0,.18)' }}>
                <Face o={o} active={on} />
                <Text style={{ flex: 1, fontFamily: F.display, fontSize: 19, color: on ? C.ink : C.cream }}>{o.label}</Text>
                <SpeakButton text={o.label} dark={!on} style={{ width: 34, height: 34, borderRadius: 17 }} />
              </Tap>
            </Enter>
          );
        })}
      </View>
      <View style={{ flex: 1, minHeight: 10 }} />
      {pick !== null && (
        <Enter>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.cream, borderRadius: 24, padding: 12, marginBottom: 12 }}>
            <Numi size={48} mood="happy" state="speaking" />
            <View style={{ flex: 1 }}>
              <SpeakableText text={OPTS[pick].reply} variant="body" style={{ fontSize: 13.5, lineHeight: 19 }} />
            </View>
          </View>
        </Enter>
      )}
      <ChunkyButton label={pick !== null ? 'On we go →' : 'Skip this one →'} color={C.sun} shadow={C.sunDeep} textColor={C.ink} onPress={() => goNext(navigation, 'confidence', mission)} />
    </Screen>
  );
}
