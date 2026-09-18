// EXPLAIN YOUR THINKING — occasional, special, never required.
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Waveform } from '../../components/AskNumi';
import { Numi } from '../../components/characters';
import { Confetti } from '../../components/effects';
import { Bob, Enter, Pop, PulseRing, Stamp } from '../../components/motion';
import { ChunkyButton, Eyebrow, Screen, Tap, TopBar } from '../../components/ui';
import { MissionId, StrategyId, STRATEGIES } from '../../data/world';
import { detectStrategy } from '../../learning/engine';
import { useSession } from '../../learning/session';
import { goNext, markExplainAsked, shouldAskExplain } from '../../navigation/flow';
import { RootScreen } from '../../navigation/types';
import { haptic, hush, say } from '../../services/feedback';
import { speechInputSupported, startListening } from '../../services/listen';
import { useGame } from '../../store/game';
import { C, F, T } from '../../theme/tokens';

/** The challenge text without its "[kind]" tag, and its numbers. */
function parseChallenge(challenge: string) {
  const text = challenge.replace(/^\[[\w-]+\]\s*/, '');
  const [lhs, rhs] = text.split('=');
  const nums = (x = '') => x.match(/\d+/g)?.map(Number) ?? [];
  return { text, all: nums(text), left: nums(lhs), right: nums(rhs) };
}

/**
 * Things a child might say about the round they JUST played — built from its real
 * numbers, so the choices never mention a puzzle they didn't see.
 */
function examplesFor(mission: MissionId, challenge: string): string[] {
  const c = parseChallenge(challenge);
  const [a = 0, b = 0, c3] = c.left;
  const total = c.right[0] ?? c.left.reduce((x, y) => x + y, 0);
  switch (mission) {
    case 'bridge': {
      const parts = c.left;
      const makeTen = parts.length === 2 && total > 10 && a < 10 && b < 10;
      return [
        makeTen ? `I knew ${a} plus ${10 - a} makes 10, then I added ${b - (10 - a)} more` : `I put ${parts.join(' and ')} together to make ${total}`,
        `I started at ${Math.max(...parts)} and counted on to ${total}`,
        'I tried pieces until they fit',
      ];
    }
    case 'market': {
      const budget = c.all[c.all.length - 1] ?? 0;
      const exact = /=/.test(c.text);
      return [
        exact ? `I found a drink and food that make exactly ${budget}` : `I added the prices and checked they stayed under ${budget}`,
        'I counted on from the first price',
        'I guessed',
      ];
    }
    case 'cafe': {
      const first = /(\d+\/\d+)/.exec(c.text)?.[1] ?? 'the order';
      return [`I cut it into equal pieces and served ${first}`, 'I broke it apart into quarters', 'I guessed'];
    }
    case 'farm': {
      const [rows = 0, per = 0] = c.all;
      return [`I put ${per} in each of the ${rows} rows`, `I skip counted by ${per}s: ${per}, ${per * 2}, ${per * 3}…`, 'I just put them in'];
    }
    case 'picnic': {
      const [n = 0, friends = 1] = c.all;
      const each = Math.floor(n / friends), rest = n % friends;
      return [
        `I gave one to each friend round and round, so everyone got ${each}${rest ? ` and ${rest} were left over` : ''}`,
        'I made equal groups',
        'I guessed',
      ];
    }
    case 'mystery': {
      const [t = 0, left = 0] = c.all;
      return [`I counted on from ${left} to ${t}`, 'I used a number line and jumped', 'I guessed'];
    }
    default:
      return ['I broke the numbers apart', 'I added them up', 'I guessed'];
  }
}

function stepsFor(strategy: StrategyId, challenge: string): string[] {
  const c = parseChallenge(challenge);
  const parts = c.left;
  const total = c.right[0] ?? parts.reduce((x, y) => x + y, 0);
  if (strategy === 'make-ten' && parts.length === 2) {
    const [a, b] = parts;
    return [`${a} + ${10 - a} → 10`, `10 + ${total - 10} → ${total}`, `${a} + ${b} = ${total}`];
  }
  if (strategy === 'count-on' && parts.length >= 2) {
    const big = Math.max(...parts);
    return [`start at ${big}`, `count on ${total - big}`, `${parts.join(' + ')} = ${total}`];
  }
  if (strategy === 'groups' && c.all.length >= 2) {
    const [n, f] = c.all; const each = Math.floor(n / f), rest = n % f;
    return ['make equal groups', `${Array(f).fill(each).join(' + ')}${rest ? ` + ${rest}` : ''} = ${n}`, `${n} ÷ ${f} = ${each}${rest ? ` r ${rest}` : ''}`];
  }
  if (strategy === 'skip' && c.all.length >= 2) {
    const [rows, per] = c.all;
    return [`${per}`, `${per * 2}`, `${per * rows} → ${rows} × ${per}`];
  }
  if (strategy === 'jump' && c.all.length >= 2) {
    const [t, left] = c.all; const ten = Math.ceil((left + 1) / 10) * 10;
    return ten < t ? [`${left} → ${ten}`, `${ten} → ${t}`, `jumped ${t - left}`] : [`${left} → ${t}`, `jumped ${t - left}`, 'found it'];
  }
  if (strategy === 'break') return ['split it up', 'solve the parts', 'put it together'];
  if (strategy === 'double') return ['same + same', 'double!', 'done'];
  return ['guess first', 'check it', 'adjust'];
}

export default function Explain({ navigation, route }: RootScreen<'Explain'>) {
  const { mission, suggested } = route.params;
  const signal = useSession(s => s.signal);
  const discover = useGame(s => s.discoverStrategy);
  const micAllowed = useGame(s => s.settings.micAllowed);
  const name = useGame(s => s.explorer.name) || 'Explorer';
  const [step, setStep] = useState(0); // 0 ready · 1 listening · 2 heard · 3 recognised
  const [said, setSaid] = useState('');
  const [partial, setPartial] = useState('');
  const [found, setFound] = useState<StrategyId | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [ask] = useState(() => shouldAskExplain(mission));
  const stop = useRef<() => void>(() => {});
  const [micFailed, setMicFailed] = useState(false);
  const canListen = micAllowed && speechInputSupported() && !micFailed;

  // Leaving without an explanation: keep any strategy the child showed through play.
  const leave = () => {
    const st = useSession.getState().signal?.strategy;
    if (st) discover(st);
    goNext(navigation, 'explain', mission);
  };

  useEffect(() => {
    if (!ask) { leave(); return; }
    markExplainAsked(mission);
    const t = setTimeout(() => say('How did you figure that out?'), 500);
    return () => { clearTimeout(t); hush(); stop.current(); };
  }, []);

  const listen = () => {
    haptic.tap();
    setStep(1);
    setPartial('');
    // If the mic is unavailable or denied, stay in "listening" but switch to touch phrases.
    if (canListen) stop.current = startListening({ onPartial: setPartial, onFinal: heard, onError: e => (e === 'silence' ? setStep(0) : setMicFailed(true)) });
  };

  const heard = (text: string) => {
    stop.current();
    setSaid(text);
    setStep(2);
    const st = detectStrategy(text);
    setTimeout(() => {
      const sig = useSession.getState().signal;
      if (sig) useSession.getState().set({ signal: { ...sig, explained: st ? 'correct' : 'partial', strategy: st ?? sig.strategy } });
      setFound(st);
      setStep(3);
      if (st) {
        const fresh = discover(st);
        setIsNew(fresh);
        haptic.success();
        say(st === 'make-ten' ? "That's clever! You made 10 first." : `That's clever! You used ${STRATEGIES.find(x => x.id === st)!.name}.`);
      } else {
        say('Thanks for telling me! Trying things is how explorers learn.');
      }
    }, 1200);
  };

  if (!ask) return <Screen bg={C.ink}><View /></Screen>;
  const strat = found ? STRATEGIES.find(s => s.id === found)! : null;

  return (
    <Screen bg={C.ink}>
      {step === 3 && strat && isNew && <Confetti count={24} loop={false} />}
      <TopBar dark back={null} title="EXPLAIN YOUR THINKING" right={<Tap onPress={step === 3 ? () => goNext(navigation, 'explain', mission) : leave} a11y="Skip" style={{ paddingHorizontal: 10, paddingVertical: 6 }}><Text style={{ fontFamily: F.bodyHeavy, fontSize: 12, color: 'rgba(253,245,232,.6)' }}>Skip →</Text></Tap>} />
      <Enter><Text style={[T.h1, { color: C.cream, marginTop: 14 }]}>How did you figure that out?</Text></Enter>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 10 }}>
        <Numi size={62} mood={step === 3 ? 'wow' : 'happy'} state={step === 1 ? 'listening' : step === 2 ? 'thinking' : step === 3 ? 'celebrate' : 'idle'} />
        <Text style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 14, lineHeight: 20, color: 'rgba(253,245,232,.82)' }}>
          {step === 0 ? `You fixed it, ${name}! Tell me how you knew — in your own words.` : step === 1 ? (partial ? `“${partial}”` : 'Listening… take your time.') : step === 2 ? 'Numi is thinking about what you said…' : strat ? `That's clever — ${strat.desc.toLowerCase()}` : 'Thanks for telling me!'}
        </Text>
      </View>

      {step >= 2 && (
        <Enter>
          <View style={{ backgroundColor: 'rgba(253,245,232,.1)', borderRadius: 24, padding: 15, marginTop: 14 }}>
            <Eyebrow color="rgba(253,245,232,.55)">{name.toUpperCase()} SAID</Eyebrow>
            <Text style={{ fontFamily: F.display, fontSize: 18, lineHeight: 24, color: C.cream, marginTop: 5 }}>“{said}”</Text>
          </View>
        </Enter>
      )}

      {step === 3 && strat && signal && (
        <Stamp rotate={-2} style={{ marginTop: 12 }}>
          <View style={{ backgroundColor: C.sun, borderRadius: 24, padding: 16, borderBottomWidth: 6, borderBottomColor: C.sunDeep }}>
            <Eyebrow color={C.ink}>{isNew ? 'NEW STRATEGY DISCOVERED!' : 'STRATEGY SPOTTED AGAIN'}</Eyebrow>
            <Text style={[T.h2, { marginTop: 3 }]}>✨ {strat.name}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
              {stepsFor(strat.id, signal.challenge).map((t, i) => (
                <Pop key={t} delay={350 + i * 380}>
                  <View style={{ backgroundColor: C.ink, borderRadius: 14, paddingVertical: 9, paddingHorizontal: 12 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 15, color: C.cream }}>{t}</Text>
                  </View>
                </Pop>
              ))}
            </View>
            {isNew && <Text style={[T.body, { marginTop: 10, fontSize: 12.5 }]}>Added to your Strategy Book 📖</Text>}
          </View>
        </Stamp>
      )}
      {step === 3 && !strat && (
        <Enter>
          <View style={{ backgroundColor: 'rgba(253,245,232,.1)', borderRadius: 22, padding: 14, marginTop: 12 }}>
            <Text style={{ fontFamily: F.bodyBold, color: C.cream, fontSize: 13.5, lineHeight: 20 }}>Next time, try this: {suggested === 'make-ten' ? 'fill up to 10 first, then add the rest.' : 'say each step out loud as you go.'} I'll help you spot it!</Text>
          </View>
        </Enter>
      )}

      <View style={{ flex: 1, minHeight: 12 }} />

      {step < 2 && (
        <View style={{ alignItems: 'center', gap: 12 }}>
          {step === 1 && <View style={{ width: 220 }}><Waveform active color={C.violet} /></View>}
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            {step === 1 && <PulseRing color={C.violet} size={120} duration={1500} />}
            {step === 0 && <PulseRing color={C.coral} size={120} duration={2400} />}
            <Tap onPress={() => (step === 0 ? listen() : canListen ? stop.current() : undefined)} a11y={step === 0 ? 'Tap and talk' : 'Stop'} style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: step === 1 ? C.violet : C.coral, borderBottomWidth: 9, borderBottomColor: step === 1 ? C.violetDeep : C.coralDeep, alignItems: 'center', justifyContent: 'center' }}>
              <Bob amp={step === 1 ? 4 : 0}><Text style={{ fontSize: 36 }}>🎙</Text></Bob>
              <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11, letterSpacing: 0.8, color: C.cream }}>{step === 1 ? 'LISTENING' : 'TAP & TALK'}</Text>
            </Tap>
          </View>
          {(step === 1 || !canListen) && (
            <View style={{ alignSelf: 'stretch', gap: 7 }}>
              <Text style={[T.eyebrow, { color: 'rgba(253,245,232,.5)', textAlign: 'center' }]}>{canListen ? 'OR TAP WHAT YOU SAID' : 'TAP WHAT YOU WOULD SAY'}</Text>
              {examplesFor(mission, signal?.challenge ?? '').map(e => (
                <Tap key={e} onPress={() => heard(e)} a11y={e} style={{ backgroundColor: 'rgba(253,245,232,.1)', borderRadius: 16, padding: 12 }}>
                  <Text style={{ fontFamily: F.bodyBold, color: C.cream, fontSize: 13 }}>🗣 {e}</Text>
                </Tap>
              ))}
            </View>
          )}
        </View>
      )}
      {step === 3 && <ChunkyButton label="On we go →" color={C.sun} shadow={C.sunDeep} textColor={C.ink} onPress={() => goNext(navigation, 'explain', mission)} />}
      {step < 2 && <Text style={{ textAlign: 'center', fontFamily: F.body, fontSize: 11.5, color: 'rgba(253,245,232,.5)', marginTop: 10 }}>Numi only asks now and then. You can always skip.</Text>}
    </Screen>
  );
}
