// REWARD — meaningful, not coin spam: world restoration, backpack item, power growth, treasure.
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { Buddy, ExplorerAvatar, Numi } from '../../components/characters';
import { Burst, Confetti, Rays } from '../../components/effects';
import { Bob, Enter, Pop, PulseRing, Stamp, Sway } from '../../components/motion';
import { SpeakableText } from '../../components/Storyteller';
import { ChunkyButton, Eyebrow, ProgressBar, Screen, Tap } from '../../components/ui';
import { AREAS, ITEMS, MISSIONS, SKILLS } from '../../data/world';
import { levelFromXp, levelProgress } from '../../learning/engine';
import { useSession } from '../../learning/session';
import { RootScreen } from '../../navigation/types';
import { haptic, say } from '../../services/feedback';
import { useGame } from '../../store/game';
import { C, F, T } from '../../theme/tokens';

const TITLES: Record<string, string> = {
  bridge: 'The bridge holds!', market: 'Breakfast is served!', cafe: 'Perfect slices!', farm: 'The garden grows!',
  picnic: 'Fair for everyone!', mystery: 'Case solved!', boss: 'Liftoff!',
};

function StarRow({ n }: { n: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
      {[0, 1, 2].map(i => <StarPop key={i} on={i < n} delay={500 + i * 280} />)}
    </View>
  );
}
function StarPop({ on, delay }: { on: boolean; delay: number }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withSpring(1, { damping: 7, stiffness: 150 }));
    if (on) setTimeout(() => haptic.snap(), delay);
  }, []);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: v.value }, { rotate: `${(1 - v.value) * -120}deg` }] }));
  return <Animated.Text style={[{ fontSize: 44, opacity: on ? 1 : 0.3 }, a]}>⭐</Animated.Text>;
}

function Chest({ onOpen, open }: { onOpen: () => void; open: boolean }) {
  const lid = useSharedValue(0);
  useEffect(() => { if (open) lid.value = withSpring(1, { damping: 9 }); }, [open]);
  const la = useAnimatedStyle(() => ({ transform: [{ translateY: -10 * lid.value }, { translateX: -6 * lid.value }, { rotate: `${-14 * lid.value}deg` }] }));
  return (
    <Tap onPress={onOpen} a11y="Open the treasure chest" disabled={open} style={{ width: 96, height: 84, alignItems: 'center', justifyContent: 'flex-end' }}>
      {open && <Rays size={170} color="rgba(245,181,60,.35)" style={{ top: -50 }} />}
      <Sway deg={open ? 0 : 7} duration={380}>
        <View style={{ width: 84, height: 70 }}>
          <View style={{ position: 'absolute', bottom: 0, width: 84, height: 44, borderRadius: 10, backgroundColor: C.wood, borderBottomWidth: 6, borderBottomColor: C.woodShadow }} />
          <View style={{ position: 'absolute', bottom: 0, left: 36, width: 12, height: 44, backgroundColor: C.sun }} />
          <Animated.View style={[{ position: 'absolute', top: 2, width: 84, height: 30, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: C.woodDeep, transformOrigin: 'left bottom' }, la]}>
            <View style={{ position: 'absolute', left: 36, top: 0, width: 12, height: 30, backgroundColor: C.sun }} />
          </Animated.View>
        </View>
      </Sway>
    </Tap>
  );
}

export default function Reward({ navigation, route }: RootScreen<'Reward'>) {
  const { mission } = route.params;
  const M = MISSIONS[mission];
  const s = useSession();
  const completeMission = useGame(g => g.completeMission);
  const addItem = useGame(g => g.addItem);
  const ex = useGame(g => g.explorer);
  const before = useRef({ xp: useGame.getState().skillXp[M.skill] ?? 0, first: !useGame.getState().completed[mission] });
  const xpNow = useGame(g => g.skillXp[M.skill] ?? 0);
  const [chest, setChest] = useState(false);
  const [burst, setBurst] = useState(0);
  const item = ITEMS[M.reward];
  const area = AREAS.find(a => a.id === M.area)!;

  useEffect(() => {
    if (s.signal) completeMission(mission, s.signal, s.stars);
    haptic.success();
    say(`${TITLES[mission]} Mission complete!`);
  }, []);

  const lvlBefore = levelFromXp(before.current.xp);
  const lvlNow = levelFromXp(xpNow);
  const openChest = () => {
    setChest(true); setBurst(b => b + 1); haptic.heavy();
    addItem('gems', 1);
  };

  return (
    <Screen bg={C.teal} scroll>
      <Confetti count={30} />
      <View style={{ alignItems: 'center' }}>
        <Rays size={440} style={{ top: 40 }} />
        <Stamp delay={500} rotate={-6} style={{ position: 'absolute', right: 0, top: 4, zIndex: 4 }}>
          <View style={{ backgroundColor: C.sun, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: 5, borderBottomColor: C.sunDeep }}>
            <Text style={{ fontFamily: F.display, fontSize: 13, color: C.ink }}>{area.name.toUpperCase()} · {before.current.first ? 'RESTORED' : 'STRONGER'}</Text>
          </View>
        </Stamp>
        <Eyebrow color="rgba(253,245,232,.75)" style={{ marginTop: 46 }}>MISSION COMPLETE</Eyebrow>
        <Pop>
          <SpeakableText
            text={TITLES[mission]}
            variant="hero"
            iconColor={C.sun}
            style={{ color: C.cream, textAlign: 'center', marginTop: 4 }}
          />
        </Pop>
        <StarRow n={s.stars} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 0, marginTop: 6 }}>
          <Buddy id={M.character} size={86} cheering />
          <Numi size={104} mood="wow" state="celebrate" />
          <ExplorerAvatar {...ex} size={84} cheering />
        </View>
      </View>

      <Enter delay={900}>
        <View style={{ backgroundColor: C.cream, borderRadius: 28, padding: 16, marginTop: 10, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: SKILLS[M.skill].color, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: SKILLS[M.skill].deep }}>
              <Bob amp={3}><Text style={{ fontSize: 26 }}>{SKILLS[M.skill].icon}</Text></Bob>
            </View>
            <View style={{ flex: 1 }}>
              <Eyebrow>{lvlNow > lvlBefore ? 'MATH POWER LEVELLED UP!' : 'MATH POWER GROWING'}</Eyebrow>
              <SpeakableText
                text={`${SKILLS[M.skill].power}, level ${lvlNow}.`}
                showIcon={false}
                variant="h3"
                style={{ marginTop: 1 }}
              >
                {SKILLS[M.skill].power} · Lv {lvlNow}
              </SpeakableText>
              <ProgressBar value={lvlNow > lvlBefore ? 1 : levelProgress(xpNow)} height={10} delay={1200} style={{ marginTop: 6 }} />
            </View>
          </View>
          <View style={{ height: 2, backgroundColor: C.sandLine }} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pop delay={1300} style={{ flex: 1 }}>
              <View style={{ backgroundColor: item.color, borderRadius: 18, padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 28 }}>{item.icon}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 16, color: C.ink }}>+3 {item.name}</Text>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11, color: C.faint }}>TO BACKPACK</Text>
              </View>
            </Pop>
            <Pop delay={1450} style={{ flex: 1 }}>
              <View style={{ backgroundColor: C.tealSoft, borderRadius: 18, padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 28 }}>{area.icon}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 16, color: C.tealDeep, textAlign: 'center' }}>{before.current.first ? 'World fixed' : 'Practice ✓'}</Text>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11, color: C.faint }}>{area.name.toUpperCase()}</Text>
              </View>
            </Pop>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.sunSoft, borderRadius: 20, padding: 10 }}>
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {!chest && <PulseRing color={C.sun} size={80} />}
              <Chest open={chest} onOpen={openChest} />
              <Burst trigger={burst} x={48} y={40} count={16} dist={80} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[T.h3, { fontSize: 17 }]}>{chest ? 'A shiny gem! 💎' : 'Mystery treasure'}</Text>
              <SpeakableText
                text={chest ? 'Gems open mystery doors in Numbershire.' : 'Tap the chest to open it!'}
                autoRead
                variant="bodySm"
                style={{ fontSize: 13, lineHeight: 18 }}
              />
            </View>
          </View>
        </View>
      </Enter>

      <View style={{ flex: 1, minHeight: 16 }} />
      <ChunkyButton label="See Numbershire now" color={C.sun} shadow={C.sunDeep} textColor={C.ink} style={{ marginTop: 16 }} onPress={() => navigation.replace('WorldChange', { mission })} />
    </Screen>
  );
}
