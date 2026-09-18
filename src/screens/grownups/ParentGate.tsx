// Grown-up gate: a PIN pad that keeps kids in the adventure and grown-ups in control.
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Enter, Pop, useMotionOK, Wobble } from '../../components/motion';
import { Eyebrow, Screen, Txt } from '../../components/ui';
import { RootScreen } from '../../navigation/types';
import { haptic } from '../../services/feedback';
import { useGame } from '../../store/game';
import { C, F, M, softShadow } from '../../theme/tokens';

type Stage = 'enter' | 'create' | 'confirm';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'del'] as const;

function Dot({ filled, tone }: { filled: boolean; tone: string }) {
  const ok = useMotionOK();
  const v = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    if (!ok) { v.value = filled ? 1 : 0; return; }
    v.value = filled
      ? withSequence(withTiming(0, { duration: 0 }), withSpring(1, M.bouncy))
      : withTiming(0, { duration: 140 });
  }, [filled, ok]);
  const inner = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.2 + 0.8 * v.value }] }));
  return (
    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, borderColor: filled ? tone : C.sandDeep, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ width: 22, height: 22, borderRadius: 11, backgroundColor: tone }, inner]} />
    </View>
  );
}

function Key({ label, onPress }: { label: string; onPress: () => void }) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const text = label === 'del' ? '⌫' : label === 'clear' ? 'Clear' : label;
  const isDigit = /\d/.test(label);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === 'del' ? 'Delete digit' : label === 'clear' ? 'Clear PIN' : `Digit ${label}`}
      onPressIn={() => { s.value = withTiming(0.92, { duration: 70 }); }}
      onPressOut={() => { s.value = withSpring(1, M.bouncy); }}
      onPress={() => { haptic.tap(); onPress(); }}
      style={{ width: '31%' }}
    >
      <Animated.View
        style={[{
          height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
          backgroundColor: isDigit ? C.proCard : 'transparent',
        }, isDigit && softShadow(0.06, 3), a]}
      >
        <Text style={{ fontFamily: isDigit ? F.display : F.bodyHeavy, fontSize: isDigit ? 28 : 15, color: isDigit ? C.ink : C.muted, lineHeight: isDigit ? 34 : 20 }}>
          {text}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function ParentGate({ navigation, route }: RootScreen<'ParentGate'>) {
  const target = route.params?.target ?? 'Parent';
  const parentPin = useGame(s => s.parentPin);
  const setPin = useGame(s => s.setPin);

  const [stage, setStage] = useState<Stage>(parentPin ? 'enter' : 'create');
  const [digits, setDigits] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [shake, setShake] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  const title = stage === 'enter' ? 'Enter your grown-up PIN' : stage === 'create' ? 'Create a grown-up PIN' : 'Type it again';
  const sub = stage === 'enter'
    ? `Unlocks the ${target === 'Teacher' ? 'teacher dashboard' : 'parent area'}.`
    : stage === 'create' ? 'Choose 4 digits your explorer doesn\'t know.' : 'Just to make sure it\'s right.';

  const miss = (msg: string) => {
    haptic.nudge();
    setShake(n => n + 1);
    setMessage(msg);
    setTimeout(() => setDigits(''), 320);
  };

  const complete = (pin: string) => {
    if (stage === 'enter') {
      if (pin === parentPin) {
        succeed();
      } else miss('That PIN didn\'t match. Try again.');
    } else if (stage === 'create') {
      setFirstPin(pin);
      setMessage(null);
      setTimeout(() => { setDigits(''); setStage('confirm'); }, 220);
    } else {
      if (pin === firstPin) {
        setPin(pin);
        succeed();
      } else {
        miss('Those didn\'t match. Let\'s start again.');
        setTimeout(() => { setFirstPin(''); setStage('create'); }, 320);
      }
    }
  };

  const succeed = () => {
    haptic.success();
    setUnlocked(true);
    setMessage(null);
    setTimeout(() => navigation.replace(target), 360);
  };

  const press = (k: (typeof KEYS)[number]) => {
    if (unlocked) return;
    if (k === 'clear') { setDigits(''); return; }
    if (k === 'del') { setDigits(d => d.slice(0, -1)); return; }
    if (digits.length >= 4) return;
    const next = digits + k;
    setDigits(next);
    if (message) setMessage(null);
    if (next.length === 4) setTimeout(() => complete(next), 160);
  };

  const tone = unlocked ? C.teal : C.ink;

  return (
    <Screen bg={C.proBg}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Eyebrow>GROWN-UPS ONLY</Eyebrow>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => { haptic.tap(); navigation.goBack(); }}
          hitSlop={8}
          style={{ backgroundColor: C.proLine, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 }}
        >
          <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: C.ink }}>Close</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        <Pop>
          <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: unlocked ? C.tealSoft : C.proCard, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 30 }}>{unlocked ? '🔓' : '🔒'}</Text>
          </View>
        </Pop>
        <Enter key={stage} delay={60} style={{ alignItems: 'center', marginTop: 8 }}>
          <Txt variant="h2" style={{ textAlign: 'center' }} accessibilityRole="header">{title}</Txt>
          <Txt variant="bodySm" style={{ textAlign: 'center', marginTop: 4 }}>{sub}</Txt>
        </Enter>

        <Wobble trigger={shake} style={{ flexDirection: 'row', gap: 18, marginTop: 22 }}>
          {[0, 1, 2, 3].map(i => <Dot key={i} filled={i < digits.length} tone={tone} />)}
        </Wobble>
        <View style={{ minHeight: 22, marginTop: 8 }}>
          {message ? <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.coralDeep, textAlign: 'center' }}>{message}</Text> : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, maxWidth: 360, width: '100%', alignSelf: 'center' }}>
        {KEYS.map(k => <Key key={k} label={k} onPress={() => press(k)} />)}
      </View>

      <View style={{ backgroundColor: C.proCard, borderRadius: 18, padding: 13, marginTop: 18, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Text style={{ fontSize: 18 }}>🧑‍🤝‍🧑</Text>
        <Text style={{ flex: 1, fontFamily: F.body, fontSize: 12.5, lineHeight: 18, color: C.muted }}>
          This area is for grown-ups. It holds learning reports and settings for mic, camera and voice.
        </Text>
      </View>
    </Screen>
  );
}
