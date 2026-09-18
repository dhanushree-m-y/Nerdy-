// Today's Adventure — a 5-stop train ride built for the explorer, with a mystery chest at the end.
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Burst, Rays } from '../../components/effects';
import { Enter, FloatUp, Pop, Squash, Stamp, Sway } from '../../components/motion';
import { Train } from '../../components/scenery';
import { SpeakableText } from '../../components/Storyteller';
import { ChunkyButton, Eyebrow, ProgressBar, Screen, Tap, TopBar } from '../../components/ui';
import { buildTodaysAdventure } from '../../learning/engine';
import { haptic, say } from '../../services/feedback';
import { useGame } from '../../store/game';
import { C, F, M } from '../../theme/tokens';

const todayKey = () => new Date().toISOString().slice(0, 10);

const TRAIN_W = 130;
const STOP_COLORS = [C.teal, C.coral, C.violet, C.water, C.sun];

function Chest({ open }: { open: boolean }) {
  const lid = useSharedValue(open ? 1 : 0);
  useEffect(() => { lid.value = withSpring(open ? 1 : 0, M.bouncy); }, [open]);
  const lidA = useAnimatedStyle(() => ({ transform: [{ translateY: -14 * lid.value }, { rotate: `${-28 * lid.value}deg` }] }));
  const body = (
    <View style={{ width: 96, height: 84, alignItems: 'center', justifyContent: 'flex-end' }}>
      {open ? (
        <Pop style={{ position: 'absolute', top: 6, flexDirection: 'row', gap: 2, zIndex: 1 }}>
          <Text style={{ fontSize: 22 }}>🪙</Text><Text style={{ fontSize: 26 }}>💎</Text><Text style={{ fontSize: 22 }}>🪙</Text>
        </Pop>
      ) : null}
      <Animated.View style={[{ width: 92, height: 28, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: C.woodDeep, borderWidth: 3, borderColor: C.sunDeep, zIndex: 2, transformOrigin: 'left bottom' }, lidA]} />
      <View style={{ width: 92, height: 46, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: C.wood, borderWidth: 3, borderTopWidth: 0, borderColor: C.sunDeep, alignItems: 'center' }}>
        <View style={{ width: 18, height: 20, borderRadius: 5, backgroundColor: C.sun, marginTop: 4, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.display, fontSize: 11, color: C.ink }}>{open ? '✓' : '?'}</Text>
        </View>
      </View>
    </View>
  );
  if (open) return body;
  return <Sway deg={6} duration={420} style={{ transformOrigin: 'bottom center' }}>{body}</Sway>;
}

export default function Today() {
  const nav = useNavigation();
  const skillXp = useGame(s => s.skillXp);
  const struggles = useGame(s => s.struggles);
  const name = useGame(s => s.explorer.name);
  const todayDone = useGame(s => s.todayDone);
  const toggleTodayStop = useGame(s => s.toggleTodayStop);
  const claimTodayReward = useGame(s => s.claimTodayReward);

  const adv = useMemo(
    () => buildTodaysAdventure({ skillXp, struggles, explorerName: name }),
    [skillXp, struggles, name],
  );
  const stops = adv.stops.slice(0, 5);
  const done = todayDone.date === todayKey() ? todayDone.stops : [];
  const count = stops.filter((_, i) => done.includes(i)).length;
  const allDone = count >= stops.length;
  const progress = count / stops.length;

  // ── reward: only on the transition into "all done", once per day ──
  const prev = useRef(count);
  const [burst, setBurst] = useState(0);
  const [granted, setGranted] = useState(false);
  useEffect(() => {
    const was = prev.current;
    prev.current = count;
    if (was < stops.length && count >= stops.length) {
      setBurst(b => b + 1);
      haptic.success();
      if (claimTodayReward()) {
        setGranted(true);
        say('The train is fixed! You found 10 coins and a gem!');
      }
    }
  }, [count]);

  // ── train position along the track ──
  const [trackW, setTrackW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => { x.value = withSpring(progress * Math.max(0, trackW - TRAIN_W), M.soft); }, [progress, trackW]);
  const trainA = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const onTrack = (e: LayoutChangeEvent) => setTrackW(e.nativeEvent.layout.width);

  return (
    <Screen scroll bg={C.cream}>
      <TopBar back="← Back" title="TODAY'S ADVENTURE" />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 14 }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.coral, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 6, borderBottomColor: C.coralDeep }}>
          <Text style={{ fontSize: 30 }}>{adv.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <SpeakableText text={adv.title} variant="h2" />
          <Text style={{ fontFamily: F.bodyBold, fontSize: 13, lineHeight: 18, color: C.muted, marginTop: 2 }}>
            {adv.minutes} minutes · {stops.length} stops{name ? ` · built for ${name}` : ''}
          </Text>
        </View>
      </View>

      <SpeakableText
        text={`Do the ${stops.length} stops on the train. Then open the treasure chest at the end.`}
        autoRead
        style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted, marginTop: 8 }}
      />

      {/* track scene */}
      <Enter delay={100} style={{ marginTop: 16, backgroundColor: C.sky, borderRadius: 24, paddingTop: 18, paddingHorizontal: 12, overflow: 'hidden' }}>
        <View onLayout={onTrack} style={{ height: 56, justifyContent: 'flex-end' }}>
          <Animated.View style={[{ position: 'absolute', left: 0, bottom: 12, width: TRAIN_W }, trainA]}>
            <Squash trigger={count}><Train scale={0.95} /></Squash>
          </Animated.View>
        </View>
        {/* rails + stations */}
        <View style={{ height: 8, backgroundColor: C.woodDeep, borderRadius: 4, marginTop: -8 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, marginTop: 6, marginBottom: 12 }}>
          {stops.map((_, i) => (
            <View key={i} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: done.includes(i) ? C.teal : C.cream, borderWidth: 3, borderColor: done.includes(i) ? C.tealDeep : C.sandDeep, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.bodyHeavy, fontSize: 10, color: done.includes(i) ? C.cream : C.muted }}>{done.includes(i) ? '✓' : i + 1}</Text>
            </View>
          ))}
        </View>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 10, backgroundColor: C.meadow }} />
      </Enter>

      <ProgressBar value={progress} style={{ marginTop: 14 }} />
      <Eyebrow style={{ marginTop: 6 }}>{count} OF {stops.length} STOPS</Eyebrow>

      <View style={{ gap: 9, marginTop: 12 }}>
        {stops.map((s, i) => {
          const on = done.includes(i);
          return (
            <Enter key={i} delay={180 + i * 70}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: on ? C.tealSoft : C.paper, borderRadius: 22, padding: 12, borderWidth: 2, borderColor: on ? C.teal : C.sandLine, borderBottomWidth: 5, borderBottomColor: on ? C.teal : C.sandLine }}>
                <Pressable
                  accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`Mark ${s.title} done`}
                  hitSlop={8}
                  onPress={() => { haptic.tap(); toggleTodayStop(i); }}
                  style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: on ? C.teal : STOP_COLORS[i % STOP_COLORS.length], alignItems: 'center', justifyContent: 'center' }}
                >
                  {on ? <Stamp key="c"><Text style={{ fontFamily: F.display, fontSize: 24, color: C.cream }}>✓</Text></Stamp>
                    : <Text style={{ fontFamily: F.display, fontSize: 20, color: C.cream }}>{i + 1}</Text>}
                </Pressable>
                <View style={{ flex: 1 }}>
                  <SpeakableText
                    text={`${s.title}. ${s.sub}`}
                    showIcon={false}
                    style={{ fontFamily: F.bodyHeavy, fontSize: 14.5, lineHeight: 20, color: C.ink }}
                  >
                    {s.title}
                  </SpeakableText>
                  <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted, marginTop: 1 }}>{s.sub}</Text>
                </View>
                <ChunkyButton size="sm" label={on ? 'Again' : 'Play'} color={on ? C.cream : C.coral} shadow={on ? C.sandDeep : C.coralDeep} textColor={on ? C.ink : C.cream}
                  onPress={() => nav.navigate('Mission', { mission: s.mission })} innerStyle={{ minHeight: 44, paddingHorizontal: 16 }} />
              </View>
            </Enter>
          );
        })}
      </View>

      {/* mystery chest */}
      <Enter delay={600} style={{ marginTop: 16 }}>
        <Tap a11y={allDone ? 'Treasure chest, open' : 'Mystery chest, finish all stops to open'} onPress={() => { if (allDone) setBurst(b => b + 1); else say('Finish all five stops to open me!'); }}>
          <View style={{ backgroundColor: allDone ? C.night : C.sand, borderRadius: 26, padding: 18, alignItems: 'center', overflow: 'hidden', minHeight: 170, justifyContent: 'center' }}>
            {allDone ? <Rays size={420} color="rgba(245,181,60,.2)" style={{ top: -120 }} /> : null}
            <Chest open={allDone} />
            <View style={{ position: 'absolute', top: 70, left: '50%' }}><Burst trigger={burst} dist={110} count={16} /></View>
            {allDone ? (
              <>
                <Text style={{ fontFamily: F.display, fontSize: 20, color: C.sun, marginTop: 8 }}>Train fixed!</Text>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: C.cream, marginTop: 2 }}>+10 🪙 · +1 💎</Text>
                {granted ? <FloatUp key={burst} style={{ position: 'absolute', top: 30 }}><Text style={{ fontFamily: F.display, fontSize: 26, color: C.sun }}>+10 🪙</Text></FloatUp> : null}
              </>
            ) : (
              <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: C.muted, marginTop: 8 }}>
                Mystery chest · {stops.length - count} {stops.length - count === 1 ? 'stop' : 'stops'} to go
              </Text>
            )}
          </View>
        </Tap>
      </Enter>
    </Screen>
  );
}
