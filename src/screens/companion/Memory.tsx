// Numi Remembers — yesterday's wobble becomes today's story.
import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Numi } from '../../components/characters';
import { Bob, Enter, Pop, PulseRing, useMotionOK } from '../../components/motion';
import { SpeakableText, SpeakButton } from '../../components/Storyteller';
import { ChunkyButton, Screen, TopBar } from '../../components/ui';
import { useGame } from '../../store/game';
import { C, F } from '../../theme/tokens';

type Entry = { day: string; title: string; tag: string; tone: string; chip: string; line: string };

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WOBBLED = { tag: 'WOBBLED', tone: C.coralDeep, chip: C.coral };
const STEADIER = { tag: 'STEADIER', tone: '#9a7a1a', chip: C.sun };
const READY = { tag: 'READY', tone: C.tealDeep, chip: C.teal };

const FALLBACK: Entry[] = [
  { day: 'MON', title: 'Nova\'s food packs', ...WOBBLED, line: '12 ÷ 4 took a few tries. Equal groups hadn\'t clicked yet.' },
  { day: 'WED', title: 'Milo\'s four bowls', ...STEADIER, line: 'Same idea, new place. Made the groups by hand.' },
];
const TODAY: Entry = { day: 'TODAY', title: 'The Fair Picnic', ...READY, line: 'Numi brings the trick back — this time with strawberries.' };

const dayLabel = (at: number) => {
  const d = new Date(at);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'EARLIER';
  return DAYS[d.getDay()];
};

const NODE = 38;

export default function Memory() {
  const nav = useNavigation();
  const struggles = useGame(s => s.struggles);
  const ok = useMotionOK();

  const history: Entry[] = struggles.length
    ? struggles.slice(-2).map(s => ({
      day: dayLabel(s.at),
      title: s.context,
      ...(s.resolved ? STEADIER : WOBBLED),
      line: s.resolved ? 'Tried again and it clicked — fewer tries, fewer hints.' : 'This one was tricky. Equal groups hadn\'t clicked yet.',
    }))
    : FALLBACK;
  const entries = [...history, TODAY];

  // connecting line grows down the timeline
  const grow = useSharedValue(ok ? 0 : 1);
  useEffect(() => {
    if (ok) grow.value = withDelay(350, withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) }));
  }, []);
  const lineA = useAnimatedStyle(() => ({ height: `${grow.value * 100}%` }));

  return (
    <Screen scroll bg={C.sky}>
      <TopBar back="← Back" title="NUMI REMEMBERS" />
      <SpeakableText text="Yesterday's wobble, today's story" variant="h2" style={{ marginTop: 12 }} />

      <Enter delay={80} style={{ marginTop: 14, backgroundColor: 'rgba(253,245,232,.95)', borderRadius: 26, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Bob amp={4} duration={2000}><Numi size={64} state="speaking" /></Bob>
        <View style={{ flex: 1 }}>
        <SpeakableText
          text="Remember when we helped Nova share the food packs? We discovered that equal groups can make division easier. Milo needs that trick today."
          autoRead
          showIcon={false}
          style={{ fontFamily: F.bodyBold, fontSize: 14.5, lineHeight: 21, color: C.ink }}
        >
          "Remember when we helped Nova share the food packs? We discovered that equal groups can make division easier. Milo needs that trick today."
        </SpeakableText>
        </View>
      </Enter>

      <View style={{ marginTop: 18 }}>
        {/* track + animated fill behind the nodes */}
        <View style={{ position: 'absolute', left: NODE / 2 - 3, top: NODE / 2, bottom: 40, width: 6, borderRadius: 3, backgroundColor: 'rgba(253,245,232,.6)' }}>
          <Animated.View style={[{ width: 6, borderRadius: 3, backgroundColor: C.teal }, lineA]} />
        </View>

        {entries.map((e, i) => {
          const last = i === entries.length - 1;
          return (
            <Enter key={`${e.day}-${i}`} delay={300 + i * 420} dx={-12} dy={0} style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <View style={{ width: NODE, alignItems: 'center', paddingTop: 8 }}>
                {last ? <PulseRing color={C.teal} size={NODE} style={{ top: 8 }} /> : null}
                <Pop delay={300 + i * 420}>
                  <View style={{ width: NODE, height: NODE, borderRadius: NODE / 2, backgroundColor: e.chip, borderWidth: 4, borderColor: C.cream, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 14 }}>{last ? '⭐' : e.tag === 'WOBBLED' ? '〰' : '✓'}</Text>
                  </View>
                </Pop>
              </View>
              <View style={{ flex: 1, backgroundColor: C.cream, borderRadius: 22, padding: 14, borderBottomWidth: 5, borderBottomColor: 'rgba(34,48,59,.08)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ backgroundColor: e.chip, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 3 }}>
                    <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11.5, color: C.cream }}>{e.day}</Text>
                  </View>
                  <Text style={{ flex: 1, fontFamily: F.bodyHeavy, fontSize: 14, color: C.ink }} numberOfLines={2}>{e.title}</Text>
                  <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11.5, color: e.tone }}>{e.tag}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 7 }}>
                  <Text style={{ flex: 1, fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted }}>{e.line}</Text>
                  <SpeakButton text={`${e.title}. ${e.line}`} style={{ width: 34, height: 34, borderRadius: 17 }} />
                </View>
              </View>
            </Enter>
          );
        })}
      </View>

      <View style={{ flex: 1, minHeight: 10 }} />
      <Enter delay={300 + entries.length * 420}>
        <ChunkyButton label="Same idea, new place →" onPress={() => nav.navigate('Mission', { mission: 'picnic' })} style={{ marginTop: 8 }} />
      </Enter>
    </Screen>
  );
}
