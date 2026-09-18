// Classroom mode — the whole class powers one space station together. No ranking, no places.
import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Confetti, Stars } from '../../components/effects';
import { Bob, Enter, FloatUp, Pop, Shimmer, Stamp } from '../../components/motion';
import { Rocket } from '../../components/scenery';
import { SpeakableText, SpeakButton } from '../../components/Storyteller';
import { ChunkyButton, Eyebrow, ProgressBar, Screen, Tap, TopBar } from '../../components/ui';
import { haptic, say } from '../../services/feedback';
import { useGame } from '../../store/game';
import { C, F } from '../../theme/tokens';

const SUGGESTED = 'SKY482';
const fmtCode = (c: string) => (c.length > 3 ? `${c.slice(0, 3)}-${c.slice(3)}` : c);
const DIM = 'rgba(253,245,232,.6)';

// ─── Join ─────────────────────────────────────────────────────────────────────
function JoinClass({ onJoin }: { onJoin: (code: string) => void }) {
  const [code, setCode] = useState('');
  const input = useRef<TextInput>(null);
  const clean = (t: string) => t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  return (
    <View style={{ marginTop: 18 }}>
      <SpeakableText text="Join your class" variant="h1" iconColor={C.sun} style={{ color: C.cream }} />
      <SpeakableText
        text="Type the code your teacher shows."
        autoRead
        iconColor={C.sun}
        style={{ fontFamily: F.bodyBold, fontSize: 13.5, lineHeight: 19, color: DIM, marginTop: 4 }}
      />

      <Tap a11y="Class code boxes" onPress={() => input.current?.focus()} style={{ flexDirection: 'row', gap: 7, marginTop: 18 }}>
        {Array.from({ length: 6 }, (_, i) => {
          const ch = code[i];
          const active = i === code.length;
          return (
            <View key={i} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, height: 62, borderRadius: 16, backgroundColor: ch ? C.cream : 'rgba(253,245,232,.1)', borderWidth: 3, borderColor: active ? C.sun : 'transparent', borderBottomWidth: 6, borderBottomColor: ch ? C.sandDeep : active ? C.sun : 'rgba(0,0,0,.25)', alignItems: 'center', justifyContent: 'center' }}>
                {ch ? <Pop key={ch + i}><Text style={{ fontFamily: F.display, fontSize: 28, color: C.ink }}>{ch}</Text></Pop> : null}
              </View>
              {i === 2 ? <Text style={{ fontFamily: F.display, fontSize: 22, color: DIM, marginLeft: 7 }}>-</Text> : null}
            </View>
          );
        })}
      </Tap>
      <TextInput
        ref={input}
        value={code}
        onChangeText={t => setCode(clean(t))}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={7}
        accessibilityLabel="Class code"
        style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
        onSubmitEditing={() => code.length === 6 && onJoin(code)}
      />

      <Tap a11y={`Use code ${fmtCode(SUGGESTED)}`} onPress={() => setCode(SUGGESTED)} style={{ alignSelf: 'flex-start', marginTop: 14, backgroundColor: 'rgba(245,181,60,.16)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, justifyContent: 'center' }}>
        <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: C.sun }}>💡 Use {fmtCode(SUGGESTED)}</Text>
      </Tap>

      <ChunkyButton
        label="Join class 🚀" color={C.sun} shadow={C.sunDeep} textColor={C.ink}
        disabled={code.length < 6}
        onPress={() => onJoin(code)}
        style={{ marginTop: 22 }}
      />
      <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: 'rgba(253,245,232,.45)', marginTop: 12 }}>Classmates only see your first initial.</Text>
    </View>
  );
}

// ─── Station illustration ─────────────────────────────────────────────────────
function Station({ power }: { power: number }) {
  const lights = 10;
  const lit = Math.round((power / 100) * lights);
  return (
    <Bob amp={5} duration={2600} style={{ alignItems: 'center', height: 150, justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* left panels */}
        <View style={{ gap: 4 }}>
          {[0, 1].map(k => <View key={k} style={{ width: 62, height: 24, borderRadius: 4, backgroundColor: power > 30 ? '#3d86b5' : '#3a4a57', borderWidth: 2, borderColor: '#8aa3b5' }} />)}
        </View>
        <View style={{ width: 16, height: 6, backgroundColor: '#8aa3b5' }} />
        {/* core */}
        <View style={{ width: 130, height: 78, borderRadius: 39, backgroundColor: '#e8eef2', borderBottomWidth: 7, borderBottomColor: '#aab8c2', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 104, gap: 6, justifyContent: 'center' }}>
            {Array.from({ length: lights }, (_, i) => {
              const on = i < lit;
              return (
                <View key={i} style={{ width: 15, height: 15, borderRadius: 8, backgroundColor: on ? C.sun : '#5d6b74' }}>
                  {on ? <Shimmer style={{ position: 'absolute', left: -4, top: -4, right: -4, bottom: -4, borderRadius: 12, backgroundColor: C.sun }} min={0.1} max={0.5} delay={i * 90} /> : null}
                </View>
              );
            })}
          </View>
        </View>
        <View style={{ width: 16, height: 6, backgroundColor: '#8aa3b5' }} />
        <View style={{ gap: 4 }}>
          {[0, 1].map(k => <View key={k} style={{ width: 62, height: 24, borderRadius: 4, backgroundColor: power > 60 ? '#3d86b5' : '#3a4a57', borderWidth: 2, borderColor: '#8aa3b5' }} />)}
        </View>
      </View>
      {/* antenna */}
      <View style={{ position: 'absolute', top: 4, alignItems: 'center' }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: power >= 100 ? C.teal : C.coral }} />
        <View style={{ width: 3, height: 24, backgroundColor: '#8aa3b5' }} />
      </View>
    </Bob>
  );
}

// ─── Launch sequence ──────────────────────────────────────────────────────────
function LaunchPad({ launched }: { launched: boolean }) {
  const y = useSharedValue(0);
  const shake = useSharedValue(0);
  useEffect(() => {
    if (!launched) return;
    shake.value = withSequence(...Array.from({ length: 6 }, (_, i) => withTiming(i % 2 ? -3 : 3, { duration: 60 })), withTiming(0, { duration: 60 }));
    y.value = withSequence(withTiming(0, { duration: 420 }), withTiming(-520, { duration: 2600, easing: Easing.in(Easing.cubic) }));
  }, [launched]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }, { translateY: y.value }] }));
  return (
    <View style={{ height: 230, borderRadius: 24, backgroundColor: C.night, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
      <Animated.View style={[{ marginBottom: 6 }, a]}>
        <Rocket scale={0.8} flame={launched} />
      </Animated.View>
      <View style={{ width: '100%', height: 18, backgroundColor: '#3a3550' }} />
      {launched ? (
        <Stamp delay={1600} style={{ position: 'absolute', top: 70 }}>
          <View style={{ backgroundColor: C.sun, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ fontFamily: F.display, fontSize: 24, color: C.ink }}>LIFT-OFF!</Text>
          </View>
        </Stamp>
      ) : null}
    </View>
  );
}

const ROWS = [
  { initial: 'A', task: 'Fuel calculation', skill: 'Bonds to 20', state: 'DONE', chip: '#c3e35c' },
  { initial: 'B', task: 'Food sharing', skill: 'Division by 4', state: 'PLAYING', chip: '#f6e1b0' },
  { initial: 'C', task: 'Distance to dock', skill: 'Counting in 5s', state: 'PLAYING', chip: '#d6cef2' },
  { initial: 'D', task: 'Cargo weight', skill: 'Compare & estimate', state: 'WAITING', chip: '#e6ddcb' },
] as const;
const TONE = { DONE: C.teal, PLAYING: C.sun, WAITING: '#9aa4ab' };

export default function Classroom() {
  const power = useGame(s => s.classPower);
  const contributeClass = useGame(s => s.contributeClass);
  const resetClassPower = useGame(s => s.resetClassPower);
  const [code, setCode] = useState<string | null>(null);
  const [pops, setPops] = useState(0);
  const [launched, setLaunched] = useState(false);

  const full = power >= 100;
  const solved = 84 + Math.max(0, Math.round((power - 58) / 7));
  const title = `CLASS MISSION · CODE ${fmtCode(code ?? SUGGESTED)}`;

  const contribute = () => {
    contributeClass(7);
    setPops(p => p + 1);
    haptic.snap();
  };
  const launch = () => {
    setLaunched(true);
    haptic.success();
    say('Three, two, one, lift off! Everyone did it together!');
  };

  return (
    <Screen scroll bg={C.ink}>
      <View style={{ position: 'absolute', left: -20, right: -20, top: 0, bottom: 0 }} pointerEvents="none"><Stars count={22} /></View>
      <TopBar dark back="← Back" title={title} />

      {!code ? (
        <JoinClass onJoin={c => { haptic.success(); setCode(c); }} />
      ) : (
        <>
          <Enter>
            <SpeakableText
              text="Save the Space Station. Every challenge your class finishes adds power."
              autoRead
              showIcon={false}
              style={{ fontFamily: F.display, fontSize: 30, lineHeight: 34, color: C.cream, marginTop: 14 }}
            >
              🚀 Save the{'\n'}Space Station
            </SpeakableText>
          </Enter>

          <Enter delay={80} style={{ marginTop: 10 }}><Station power={power} /></Enter>

          <Enter delay={140} style={{ backgroundColor: 'rgba(253,245,232,.09)', borderRadius: 26, padding: 16, marginTop: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Eyebrow color={DIM}>STATION POWER</Eyebrow>
              <Text style={{ fontFamily: F.display, fontSize: 26, lineHeight: 30, color: C.sun }}>{power}%</Text>
            </View>
            <ProgressBar value={power / 100} height={16} track="rgba(253,245,232,.14)" style={{ marginTop: 10 }} />
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 10 }}>
              <Text style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 13, lineHeight: 19, color: 'rgba(253,245,232,.8)' }}>
                {full ? 'Every learner put power in — nobody carried the class alone.' : 'Each finished challenge adds energy. No names on a board.'}
              </Text>
              <SpeakButton
                dark
                text={`Station power ${power} percent. ${full ? 'Every learner put power in — nobody carried the class alone.' : 'Each finished challenge adds energy. No names on a board.'}`}
                style={{ width: 34, height: 34, borderRadius: 17 }}
              />
            </View>
          </Enter>

          <View style={{ gap: 8, marginTop: 14 }}>
            {ROWS.map((r, i) => {
              const state = full ? 'DONE' : r.state;
              return (
                <Enter key={r.initial} delay={200 + i * 70}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: 'rgba(253,245,232,.07)', borderRadius: 20, padding: 13 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: r.chip, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: F.display, fontSize: 16, color: C.ink }}>{r.initial}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <SpeakableText
                        text={`${r.task}. ${r.skill}. ${state}.`}
                        showIcon={false}
                        style={{ fontFamily: F.bodyHeavy, fontSize: 13.5, lineHeight: 19, color: C.cream }}
                      >
                        {r.task}
                      </SpeakableText>
                      <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: DIM, marginTop: 1 }}>{r.skill}</Text>
                    </View>
                    <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11.5, color: TONE[state] }}>{state === 'DONE' ? '✓ ' : ''}{state}</Text>
                  </View>
                </Enter>
              );
            })}
          </View>

          {/* action */}
          <View style={{ marginTop: 16 }}>
            {!full ? (
              <View>
                <ChunkyButton label="Finish a challenge (+7%)" color={C.sun} shadow={C.sunDeep} textColor={C.ink} onPress={contribute} />
                {pops > 0 ? (
                  <FloatUp key={pops} style={{ position: 'absolute', top: -6, alignSelf: 'center' }}>
                    <Text style={{ fontFamily: F.display, fontSize: 30, color: C.sun }}>+7%</Text>
                  </FloatUp>
                ) : null}
              </View>
            ) : !launched ? (
              <Pop>
                <ChunkyButton label="🚀 LAUNCH!" color={C.coral} shadow={C.coralDeep} onPress={launch} />
              </Pop>
            ) : null}
          </View>

          {full ? (
            <Enter delay={100} style={{ marginTop: 14 }}>
              <LaunchPad launched={launched} />
            </Enter>
          ) : null}

          {launched ? (
            <Pop delay={1800} style={{ marginTop: 14, backgroundColor: C.teal, borderRadius: 24, padding: 16, alignItems: 'center', borderBottomWidth: 6, borderBottomColor: C.tealDeep }}>
              <Text style={{ fontFamily: F.display, fontSize: 24, lineHeight: 28, color: C.cream, textAlign: 'center' }}>Everyone did it together!</Text>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 13.5, color: C.cream, textAlign: 'center', marginTop: 4 }}>
                Class {fmtCode(code)} launched the Space Station — as one team.
              </Text>
              <ChunkyButton size="md" label="Start the next class mission" color={C.sun} shadow={C.sunDeep} textColor={C.ink} style={{ marginTop: 12, alignSelf: 'stretch' }}
                onPress={() => { resetClassPower(); setLaunched(false); }} />
            </Pop>
          ) : null}

          {/* collective stats */}
          <View style={{ flexDirection: 'row', gap: 9, marginTop: 16 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(253,245,232,.07)', borderRadius: 20, padding: 13 }}>
              <Text style={{ fontFamily: F.display, fontSize: 26, lineHeight: 30, color: C.sun }}>{solved}</Text>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 13, lineHeight: 18, color: DIM }}>math challenges your class solved together!</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(253,245,232,.07)', borderRadius: 20, padding: 13 }}>
              <Text style={{ fontSize: 24 }}>🍰</Text>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 13, lineHeight: 18, color: DIM, marginTop: 4 }}>Fraction Café has been restored!</Text>
            </View>
          </View>

          <SpeakableText
            text="No ranking, no places. The class lifts off together."
            iconColor={C.sun}
            style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: 'rgba(253,245,232,.5)', marginTop: 14, textAlign: 'center' }}
          />
        </>
      )}

      {launched ? <Confetti count={36} loop={false} /> : null}
    </Screen>
  );
}
