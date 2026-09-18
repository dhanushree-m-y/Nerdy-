// BOSS MISSION — ROCKET LAUNCH. Fuel (add) → Supplies (share) → Cargo (compare) → Countdown.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { AskNumi, AskNumiButton, Reply } from '../../components/AskNumi';
import { Buddy, Numi } from '../../components/characters';
import { Burst, Confetti, Stars } from '../../components/effects';
import { DropProvider, DropZone, Draggable } from '../../components/dragdrop';
import { Drift, Enter, Highlight, Pop, PulseRing, Squash, Stamp, useMotionOK, Wobble } from '../../components/motion';
import { Rocket } from '../../components/scenery';
import { Scratchpad } from '../../components/Scratchpad';
import { StuckChoice, StuckSheet } from '../../components/sheets';
import { ChunkyButton, Eyebrow, GameBody, MuteButton, Purse, Tap, TopBar } from '../../components/ui';
import { CharacterId, Grade } from '../../data/world';
import { Intent } from '../../learning/engine';
import { useSignalTracker, useStuckDetector } from '../../learning/session';
import { finishChallenge } from '../../navigation/flow';
import { RootScreen } from '../../navigation/types';
import { haptic, say } from '../../services/feedback';
import { useGame } from '../../store/game';
import { C, F, Mood } from '../../theme/tokens';

type BossCfg = { fuel: number; cans: number[]; packs: number; crew: number; cap: number; cargo: { n: string; i: string; w: number }[] };
// One launch per grade: the fuel sum, the food share and the cargo limit all grow with it.
const CFG: Record<Grade, BossCfg> = {
  1: { fuel: 10, cans: [6, 4, 3, 2], packs: 6, crew: 2, cap: 15, cargo: [{ n: 'Telescope', i: '🔭', w: 7 }, { n: 'Robot', i: '🤖', w: 5 }, { n: 'Plant', i: '🪴', w: 3 }, { n: 'Toolbox', i: '🧰', w: 6 }, { n: 'Books', i: '📚', w: 2 }] },
  2: { fuel: 17, cans: [9, 8, 6, 5], packs: 12, crew: 3, cap: 25, cargo: [{ n: 'Telescope', i: '🔭', w: 9 }, { n: 'Robot', i: '🤖', w: 7 }, { n: 'Plant', i: '🪴', w: 4 }, { n: 'Toolbox', i: '🧰', w: 8 }, { n: 'Books', i: '📚', w: 3 }] },
  3: { fuel: 20, cans: [8, 7, 5, 4], packs: 12, crew: 4, cap: 30, cargo: [{ n: 'Telescope', i: '🔭', w: 12 }, { n: 'Robot', i: '🤖', w: 9 }, { n: 'Plant', i: '🪴', w: 4 }, { n: 'Toolbox', i: '🧰', w: 8 }, { n: 'Rover', i: '🚙', w: 15 }, { n: 'Books', i: '📚', w: 6 }] },
  4: { fuel: 30, cans: [12, 9, 8, 6, 4], packs: 20, crew: 4, cap: 50, cargo: [{ n: 'Telescope', i: '🔭', w: 18 }, { n: 'Robot', i: '🤖', w: 14 }, { n: 'Plant', i: '🪴', w: 7 }, { n: 'Toolbox', i: '🧰', w: 11 }, { n: 'Rover', i: '🚙', w: 25 }, { n: 'Books', i: '📚', w: 9 }] },
  5: { fuel: 60, cans: [25, 18, 17, 15, 12], packs: 36, crew: 4, cap: 90, cargo: [{ n: 'Telescope', i: '🔭', w: 32 }, { n: 'Robot', i: '🤖', w: 25 }, { n: 'Plant', i: '🪴', w: 12 }, { n: 'Toolbox', i: '🧰', w: 20 }, { n: 'Rover', i: '🚙', w: 45 }, { n: 'Books', i: '📚', w: 16 }] },
};
const STAGES = ['FUEL', 'SUPPLIES', 'CARGO', 'COUNTDOWN'];
const CREW: CharacterId[] = ['nova', 'nia', 'zuri', 'pip'];

export default function RocketBoss({ navigation }: RootScreen<'Boss'>) {
  const grade = useGame(s => s.grade);
  const cfg = CFG[grade];
  const ins = useSafeAreaInsets();
  const { height: H } = useWindowDimensions();
  const ok = useMotionOK();
  const trk = useSignalTracker('boss', 'addition', `fuel ${cfg.fuel} · ${cfg.packs}÷${cfg.crew} · ≤${cfg.cap}kg`, 'blocks');

  const [stage, setStage] = useState(0);
  const [tank, setTank] = useState<number[]>([]);          // indexes of cans
  const [seats, setSeats] = useState<number[]>(Array(cfg.crew).fill(0));
  const [bay, setBay] = useState<number[]>([]);            // indexes of cargo
  const [count, setCount] = useState<number | null>(null);
  const [launched, setLaunched] = useState(false);
  const [coach, setCoach] = useState<{ text: string; mood: Mood }>({ text: `Nova here! The tank needs exactly ${cfg.fuel} fuel. Drag in the fuel cans.`, mood: 'happy' });
  const [highlight, setHighlight] = useState<string[]>([]);
  const [stageDone, setStageDone] = useState(false);
  const [burst, setBurst] = useState(0);
  const [wob, setWob] = useState(0);
  const [voice, setVoice] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [pad, setPad] = useState(false);
  const [showUnits, setShowUnits] = useState(false);

  const fuel = tank.reduce((a, i) => a + cfg.cans[i], 0);
  const packsLeft = cfg.packs - seats.reduce((a, b) => a + b, 0);
  const each = cfg.packs / cfg.crew;
  const load = bay.reduce((a, i) => a + cfg.cargo[i].w, 0);
  const cargoOk = bay.length >= 2 && load <= cfg.cap && load >= cfg.cap - 5;

  useStuckDetector({ wrongStreak: trk.wrongStreak, idleMs: trk.idleMs, paused: voice || stuck || pad || stageDone || stage === 3, onStuck: () => { haptic.nudge(); setStuck(true); say('This is a big mission. Want to solve it together?'); } });

  const say2 = (text: string, mood: Mood = 'happy') => { setCoach({ text, mood }); };

  const completeStage = (line: string) => {
    haptic.success(); setBurst(b => b + 1); setStageDone(true);
    say2(line, 'wow'); say(line);
  };
  const nextStage = () => {
    setStageDone(false); setHighlight([]); setShowUnits(false);
    const s = stage + 1;
    setStage(s);
    const intro = [
      '',
      `Fuel's in! Now share ${cfg.packs} food packs so all ${cfg.crew} astronauts get the same.`,
      `Supplies sorted! The rocket can carry up to ${cfg.cap} kg. Load at least 2 things and fill it well — between ${cfg.cap - 5} and ${cfg.cap} kg.`,
      'Everything is ready. Hold the big button to start the countdown!',
    ][s];
    say2(intro); say(intro);
  };

  // Stage 1 — fuel
  const addCan = (i: number) => {
    if (stage !== 0 || stageDone || tank.includes(i)) return false;
    const next = fuel + cfg.cans[i];
    if (next > cfg.fuel) {
      trk.attempt(`fuel ${next}`, false); setWob(w => w + 1);
      say2(`That would be ${next} — the tank only holds ${cfg.fuel}. Try a smaller can, or take one out.`, 'worried');
      return false;
    }
    trk.touch();
    const t = [...tank, i];
    setTank(t);
    if (next === cfg.fuel) {
      trk.attempt(`fuel ${t.map(k => cfg.cans[k]).join('+')}`, true);
      completeStage(`${t.map(k => cfg.cans[k]).join(' + ')} = ${cfg.fuel}. Tank full!`);
    } else say2(`${next} fuel. ${cfg.fuel - next} more to go!`);
    return true;
  };
  const removeCan = (i: number) => { if (stageDone) return; trk.touch(); setTank(t => t.filter(k => k !== i)); };

  // Stage 2 — supplies
  const seatsRef = useRef(seats); seatsRef.current = seats;
  const givePack = (k: number) => {
    const s = seatsRef.current;
    const left = cfg.packs - s.reduce((a, b) => a + b, 0);
    if (stage !== 1 || stageDone || left <= 0) return false;
    const next = s.slice(); next[k] += 1;
    seatsRef.current = next; setSeats(next); trk.touch();
    if (left - 1 === 0) {
      if (next.every(v => v === each)) {
        trk.attempt(next.join('/'), true); trk.strategy('groups');
        completeStage(`${cfg.packs} ÷ ${cfg.crew} = ${each}. Nobody goes hungry!`);
      } else {
        trk.attempt(next.join('/'), false); setWob(w => w + 1);
        say2(`Some astronauts have ${Math.max(...next)} and some have ${Math.min(...next)}. Tap a pack to move it.`, 'worried');
      }
    }
    return true;
  };
  const takePack = (k: number) => { if (stageDone || seats[k] === 0) return; const n = seats.slice(); n[k] -= 1; seatsRef.current = n; setSeats(n); trk.touch(); };

  // Stage 3 — cargo
  const addCargo = (i: number) => {
    if (stage !== 2 || stageDone || bay.includes(i)) return false;
    const next = load + cfg.cargo[i].w;
    if (next > cfg.cap) {
      trk.attempt(`cargo ${next}`, false); setWob(w => w + 1);
      say2(`${cfg.cargo[i].n} weighs ${cfg.cargo[i].w}. That makes ${next} kg — ${next - cfg.cap} too heavy!`, 'worried');
      return false;
    }
    trk.touch(); setBay(b => [...b, i]);
    say2(next >= cfg.cap - 5 ? `${next} kg — nicely loaded! Tap "Seal the cargo" when ready.` : `${next} kg so far. Room for ${cfg.cap - next} kg more.`);
    return true;
  };
  const sealCargo = () => {
    if (cargoOk) {
      trk.attempt(`cargo ${load}`, true);
      completeStage(`${bay.map(i => cfg.cargo[i].w).join(' + ')} = ${load} kg. Safe to fly!`);
    } else {
      trk.attempt(`cargo ${load}`, false); setWob(w => w + 1);
      say2(bay.length < 2 ? 'Load at least two things for the crew!' : `${load} kg leaves ${cfg.cap - load} kg of empty space. Can we fit one more thing?`, 'think');
    }
  };

  // Stage 4 — countdown
  const shake = useSharedValue(0);
  const lift = useSharedValue(0);
  const startCountdown = () => {
    if (count !== null) return;
    haptic.heavy();
    let n = 10;
    setCount(n);
    shake.value = ok ? withRepeat(withSequence(withTiming(-2, { duration: 50 }), withTiming(2, { duration: 50 })), -1, true) : 0;
    const id = setInterval(() => {
      n -= 1;
      if (n > 0) { setCount(n); haptic.tap(); if (n <= 3) say(String(n)); }
      else {
        clearInterval(id);
        setCount(0); haptic.success(); setLaunched(true);
        lift.value = withTiming(1, { duration: 2600, easing: Easing.in(Easing.cubic) });
        say('Liftoff! You used adding, sharing and weighing together!');
        setCoach({ text: 'Liftoff! You used adding, sharing and weighing — all together!', mood: 'wow' });
      }
    }, 650);
    timers.current.push(id);
  };
  // Hold-to-launch is a gesture-handler long press: it cooperates with the scrolling game
  // body (a plain Pressable's long press was cancelled by the scroller, so the rocket
  // never launched on web), and a quick tap still gets the "press and HOLD" nudge.
  const [holding, setHolding] = useState(false);
  const launchRef = useRef(startCountdown);
  launchRef.current = startCountdown;
  const launchJS = useCallback(() => { setHolding(false); launchRef.current(); }, []);
  const holdHintJS = useCallback(() => say2('Press and HOLD the button!'), []);
  const setHoldingJS = useCallback((v: boolean) => setHolding(v), []);
  const launchGesture = Gesture.Exclusive(
    Gesture.LongPress().minDuration(600).maxDistance(40)
      .onBegin(() => { scheduleOnRN(setHoldingJS, true); })
      .onStart(() => { scheduleOnRN(launchJS); })
      .onFinalize(() => { scheduleOnRN(setHoldingJS, false); }),
    Gesture.Tap().maxDuration(550).onEnd((_e, ok) => { if (ok) scheduleOnRN(holdHintJS); }),
  );
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);
  useEffect(() => () => timers.current.forEach(clearInterval), []);
  const rocketA = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }, { translateY: -lift.value * (H + 200) }] }));

  // hints / stuck
  const hint = () => {
    trk.hint('visual');
    if (stage === 0) { setShowUnits(true); const pair = findSubset(cfg.cans.filter((_, i) => !tank.includes(i)), cfg.fuel - fuel); setHighlight(pair.map(v => `can${cfg.cans.indexOf(v)}`)); say2(pair.length ? `Try making ${cfg.fuel - fuel} with the glowing cans.` : 'Take a can out and try a different mix.'); }
    if (stage === 1) { setHighlight(CREW.slice(0, cfg.crew).map((_, k) => `seat${k}`)); say2('Deal one pack to each astronaut, round and round.'); }
    if (stage === 2) { setHighlight(['bay']); say2(`Start with the heaviest thing, then fill the rest up to ${cfg.cap}.`); }
  };
  const onStuck = (c: StuckChoice) => {
    setStuck(false); trk.resetIdle();
    if (c === 'talk') { trk.asked(true); setVoice(true); }
    if (c === 'show') hint();
    if (c === 'objects') { setShowUnits(true); trk.represent('blocks'); }
    if (c === 'draw') setPad(true);
  };

  const respond = (intent: Intent): Reply => {
    trk.asked(true);
    if (stage === 0) {
      if (intent.kind === 'command' && intent.values.length) return { line: `Pouring in the ${intent.values.join(' and ')}!`, command: intent };
      if (intent.kind === 'answer') return { line: fuel + intent.n === cfg.fuel ? `Yes — ${fuel} and ${intent.n} make ${cfg.fuel}. Find a ${intent.n} can, or two cans that make ${intent.n}!` : `${fuel} + ${intent.n} = ${fuel + intent.n}. The tank needs ${cfg.fuel}.`, highlight: ['tank'] };
      return { line: `The tank has ${fuel}. It needs ${cfg.fuel}. How much more fuel do we need?`, expectNumber: true, chips: [String(cfg.fuel - fuel - 1), String(cfg.fuel - fuel), String(cfg.fuel - fuel + 1)], highlight: ['tank'], hint: 'gentle' };
    }
    if (stage === 1) {
      if (intent.kind === 'command') return { line: `Handing out packs to everyone!`, command: intent };
      if (intent.kind === 'answer') return intent.n === each ? { line: `Yes! ${each} each. Deal them out!`, done: true } : { line: `${intent.n} each would use ${intent.n * cfg.crew} packs. We have ${cfg.packs}.`, expectNumber: true, chips: [String(each - 1), String(each), String(each + 1)] };
      return { line: `${packsLeft} packs left and ${cfg.crew} astronauts. If everyone gets the same, how many does each get?`, expectNumber: true, chips: [String(each - 1), String(each), String(each + 1)], highlight: CREW.slice(0, cfg.crew).map((_, k) => `seat${k}`), hint: 'gentle' };
    }
    if (stage === 2) return { line: `The bay holds ${cfg.cap} kg. You've loaded ${load}. That leaves ${cfg.cap - load} kg — which thing fits in that space?`, highlight: ['bay'], hint: 'gentle' };
    return { line: 'Hold the big launch button and count down with me!' };
  };
  const onReply = (r: Reply) => {
    setHighlight(r.highlight ?? []);
    setCoach({ text: r.line, mood: r.done ? 'wow' : 'happy' });
    const c = r.command;
    if (c?.kind === 'command') {
      if (stage === 0) {
        let t = 400; const used: number[] = [];
        c.values.forEach(v => { const i = cfg.cans.findIndex((x, k) => x === v && !tank.includes(k) && !used.includes(k)); if (i >= 0) { used.push(i); setTimeout(() => addCanRef.current(i), t); t += 600; } });
      }
      if (stage === 1) {
        const v = c.values[0] ?? 1; let t = 300;
        seatsRef.current = Array(cfg.crew).fill(0); setSeats(seatsRef.current);
        for (let r2 = 0; r2 < v; r2++) for (let k = 0; k < cfg.crew; k++) { setTimeout(() => givePackRef.current(k), t); t += 140; }
      }
    }
    if (r.done) setTimeout(() => setVoice(false), 3200);
  };
  const addCanRef = useRef(addCan); addCanRef.current = addCan;
  const givePackRef = useRef(givePack); givePackRef.current = givePack;

  const finish = () => finishChallenge(navigation, 'boss', trk.finish(), { suggested: 'break' });

  return (
    <DropProvider>
      <View style={{ flex: 1, backgroundColor: C.night, overflow: 'hidden' }}>
        <GameBody>
        <Stars count={34} />
        {launched && <Confetti count={34} />}
        {launched && [0, 1, 2, 3, 4].map(i => (
          <Drift key={i} from={0} to={0} rise={-H} duration={900 + i * 150} style={{ position: 'absolute', left: 30 + i * 70, top: -40 }}>
            <View style={{ width: 2, height: 40, backgroundColor: 'rgba(253,245,232,.6)' }} />
          </Drift>
        ))}
        <View style={{ paddingTop: ins.top + 8, paddingHorizontal: 20 }}>
          <TopBar dark back="← Map" title="BOSS · ROCKET LAUNCH" right={<><Purse /><MuteButton dark={true} /><AskNumiButton onPress={() => { trk.asked(true); setVoice(true); }} glowing={trk.wrongStreak > 0 && !voice} /></>} />
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
            {STAGES.map((s, i) => <View key={s} style={{ flex: 1, height: 9, borderRadius: 5, backgroundColor: i < stage || (i === stage && (stageDone || launched)) ? C.sun : i === stage ? 'rgba(245,181,60,.45)' : 'rgba(253,245,232,.18)' }} />)}
          </View>
          <Stamp key={stage} rotate={-2} style={{ alignSelf: 'flex-start', marginTop: 10 }}>
            <Text style={{ fontFamily: F.display, fontSize: 15, color: C.sun }}>STAGE {stage + 1} OF 4 · {STAGES[stage]}</Text>
          </Stamp>
        </View>

        {/* rocket + stage area */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginTop: 6, gap: 12, alignItems: 'flex-end', minHeight: 250 }}>
          <View style={{ width: 120, alignItems: 'center' }}>
            <Animated.View style={rocketA}>
              <Rocket scale={1} flame={stage === 3 && count !== null} />
            </Animated.View>
            <View style={{ width: 120, height: 10, borderRadius: 4, backgroundColor: '#5b6480', marginTop: 2 }} />
            {stage === 0 && (
              <DropZone id="rocket" pad={30} style={{ position: 'absolute', left: 16, bottom: 30, width: 88, height: 190 }}>
                <View style={{ flex: 1 }} />
              </DropZone>
            )}
          </View>

          <Wobble trigger={wob} style={{ flex: 1 }}>
            {stage === 0 && (
              <Enter>
                <Eyebrow color="rgba(253,245,232,.6)">FUEL TANK · {fuel} / {cfg.fuel}</Eyebrow>
                <DropZone id="tank" pad={24}>
                <Highlight active={highlight.includes('tank')} style={{ marginTop: 6 }}>
                  <View style={{ height: 200, width: 70, borderRadius: 16, borderWidth: 4, borderColor: C.cream, overflow: 'hidden', justifyContent: 'flex-end' }}>
                    <Animated.View style={{ height: `${(fuel / cfg.fuel) * 100}%`, backgroundColor: fuel === cfg.fuel ? C.teal : C.sun }} />
                    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'space-between' }}>
                      {Array.from({ length: cfg.fuel + 1 }, (_, i) => <View key={i} style={{ height: 1, width: i % 5 === 0 ? 20 : 10, backgroundColor: 'rgba(253,245,232,.6)' }} />)}
                    </View>
                  </View>
                </Highlight>
                </DropZone>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {tank.map(i => (
                    <Tap key={i} onPress={() => removeCan(i)} a11y={`Remove can ${cfg.cans[i]}`} style={{ backgroundColor: C.sun, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 13, color: C.ink }}>{cfg.cans[i]} ✕</Text>
                    </Tap>
                  ))}
                </View>
              </Enter>
            )}
            {stage === 1 && (
              <Enter>
                <Eyebrow color="rgba(253,245,232,.6)">CREW · {packsLeft} PACKS LEFT</Eyebrow>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {CREW.slice(0, cfg.crew).map((id, k) => (
                    <DropZone key={id} id={`seat${k}`} pad={6} style={{ width: '46%' }}>
                      <Highlight active={highlight.includes(`seat${k}`)}>
                        <View style={{ backgroundColor: 'rgba(253,245,232,.1)', borderRadius: 16, padding: 6, alignItems: 'center', borderWidth: 2, borderColor: stageDone ? C.teal : 'transparent' }}>
                          <Buddy id={id} size={40} mood={packsLeft === 0 && seats[k] < Math.max(...seats) ? 'worried' : 'happy'} cheering={stageDone} />
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', minHeight: 20 }}>
                            {Array.from({ length: seats[k] }, (_, j) => <Tap key={j} onPress={() => takePack(k)} a11y="Take a pack back"><Squash trigger={1}><Text style={{ fontSize: 13 }}>🍱</Text></Squash></Tap>)}
                          </View>
                          <Text style={{ fontFamily: F.display, fontSize: 13, color: C.cream }}>{seats[k]}</Text>
                        </View>
                      </Highlight>
                    </DropZone>
                  ))}
                </View>
              </Enter>
            )}
            {stage === 2 && (
              <Enter>
                <Eyebrow color="rgba(253,245,232,.6)">CARGO BAY · MAX {cfg.cap} KG</Eyebrow>
                <DropZone id="bay" pad={10}>
                  <Highlight active={highlight.includes('bay')}>
                    <View style={{ marginTop: 6, minHeight: 110, borderRadius: 18, borderWidth: 3, borderStyle: 'dashed', borderColor: cargoOk ? C.teal : 'rgba(253,245,232,.5)', padding: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {bay.length === 0 && <Text style={{ fontFamily: F.bodyBold, color: 'rgba(253,245,232,.6)', fontSize: 12 }}>Drag cargo here</Text>}
                      {bay.map(i => (
                        <Tap key={i} onPress={() => { if (!stageDone) { trk.touch(); setBay(b => b.filter(k => k !== i)); } }} a11y={`Unload ${cfg.cargo[i].n}`} style={{ backgroundColor: C.cream, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' }}>
                          <Squash trigger={1}><Text style={{ fontSize: 22 }}>{cfg.cargo[i].i}</Text></Squash>
                          <Text style={{ fontFamily: F.bodyHeavy, fontSize: 10, color: C.ink }}>{cfg.cargo[i].w} kg</Text>
                        </Tap>
                      ))}
                    </View>
                  </Highlight>
                </DropZone>
                {/* scale */}
                <View style={{ marginTop: 8 }}>
                  <View style={{ height: 14, borderRadius: 7, backgroundColor: 'rgba(253,245,232,.15)', overflow: 'hidden' }}>
                    <View style={{ position: 'absolute', left: `${((cfg.cap - 5) / cfg.cap) * 100}%`, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(47,160,138,.35)' }} />
                    <View style={{ width: `${Math.min(100, (load / cfg.cap) * 100)}%`, height: '100%', backgroundColor: cargoOk ? C.teal : C.sun, borderRadius: 7 }} />
                  </View>
                  <Text style={{ fontFamily: F.display, fontSize: 16, color: C.cream, marginTop: 2 }}>{load} kg <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11, color: 'rgba(253,245,232,.6)' }}>· green zone = well loaded</Text></Text>
                </View>
              </Enter>
            )}
            {stage === 3 && (
              <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
                {count !== null && !launched && <Stamp key={count} rotate={0}><Text style={{ fontFamily: F.display, fontSize: 96, lineHeight: 110, color: count <= 3 ? C.coral : C.sun }}>{count}</Text></Stamp>}
                {launched && <Pop><Text style={{ fontFamily: F.display, fontSize: 48, color: C.sun, textAlign: 'center' }}>LIFTOFF!</Text></Pop>}
                {count === null && <Text style={{ fontFamily: F.display, fontSize: 22, color: C.cream, textAlign: 'center' }}>All systems go!</Text>}
              </View>
            )}
          </Wobble>
          <Burst trigger={burst} x={200} y={100} count={20} dist={130} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, marginTop: 8 }}>
          <Buddy id="nova" size={46} mood={coach.mood === 'worried' ? 'worried' : 'happy'} cheering={launched} />
          <View style={{ flex: 1, backgroundColor: 'rgba(253,245,232,.1)', borderRadius: 18, padding: 10 }}>
            <Text style={{ fontFamily: F.bodyBold, fontSize: 13, lineHeight: 18, color: C.cream }}>{coach.text}</Text>
          </View>
          <Numi size={40} state={launched ? 'celebrate' : 'idle'} mood={launched ? 'wow' : 'happy'} />
        </View>
        <View style={{ flex: 1 }} />

        {/* tray */}
        <View style={{ backgroundColor: '#252f52', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 12, paddingBottom: ins.bottom + 14 }}>
          {stageDone ? (
            <ChunkyButton label="Next stage →" color={C.sun} shadow={C.sunDeep} textColor={C.ink} onPress={nextStage} />
          ) : stage === 0 ? (
            <>
              <TrayHead label="FUEL CANS · DRAG TO THE ROCKET" onHint={hint} onPad={() => setPad(true)} />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, alignItems: 'flex-end' }}>
                {cfg.cans.map((v, i) => tank.includes(i) ? <View key={i} style={{ width: 52 }} /> : (
                  <Draggable key={i} id={`can${i}`} a11y={`Fuel can ${v}`} onTap={() => addCan(i)} onDrop={z => (z === 'tank' || z === 'rocket' ? (addCan(i) ? 'accept' : 'reject') : 'ignore')}>
                    <Highlight active={highlight.includes(`can${i}`)}>
                      <View style={{ width: 52, height: 30 + v * Math.min(6, 80 / Math.max(...cfg.cans)), borderRadius: 10, backgroundColor: C.coral, borderBottomWidth: 5, borderBottomColor: C.coralDeep, alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ position: 'absolute', top: -6, width: 18, height: 8, borderRadius: 3, backgroundColor: C.coralDeep }} />
                        <Text style={{ fontFamily: F.display, fontSize: 20, color: C.cream }}>{v}</Text>
                        {showUnits && <Text style={{ fontSize: 8, color: C.cream }}>{'•'.repeat(v)}</Text>}
                      </View>
                    </Highlight>
                  </Draggable>
                ))}
              </View>
            </>
          ) : stage === 1 ? (
            <>
              <TrayHead label="FOOD PACKS · DRAG TO A SEAT" onHint={hint} onPad={() => setPad(true)} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                {Array.from({ length: packsLeft }, (_, i) => (
                  <Draggable key={i} id={`pk${i}`} a11y="Food pack" onTap={() => givePack(seatsRef.current.indexOf(Math.min(...seatsRef.current)))} onDrop={z => (z?.startsWith('seat') ? (givePack(Number(z.slice(4))) ? 'accept' : 'reject') : 'ignore')}>
                    <View style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 26 }}>🍱</Text></View>
                  </Draggable>
                ))}
              </View>
            </>
          ) : stage === 2 ? (
            <>
              <TrayHead label="CARGO · DRAG INTO THE BAY" onHint={hint} onPad={() => setPad(true)} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {cfg.cargo.map((c, i) => bay.includes(i) ? null : (
                  <Draggable key={i} id={`cg${i}`} a11y={`Cargo: ${c.n}, ${c.w} kilograms`} onTap={() => addCargo(i)} onDrop={z => (z === 'bay' ? (addCargo(i) ? 'accept' : 'reject') : 'ignore')}>
                    <View style={{ backgroundColor: C.cream, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 62 }}>
                      <Text style={{ fontSize: 24 }}>{c.i}</Text>
                      <Text style={{ fontFamily: F.display, fontSize: 13, color: C.ink }}>{c.w} kg</Text>
                    </View>
                  </Draggable>
                ))}
              </View>
              <ChunkyButton size="md" label="Seal the cargo" style={{ marginTop: 10 }} color={cargoOk ? C.teal : 'rgba(253,245,232,.2)'} shadow={cargoOk ? C.tealDeep : 'rgba(0,0,0,.2)'} onPress={sealCargo} />
            </>
          ) : launched ? (
            <ChunkyButton label="Mission complete →" color={C.sun} shadow={C.sunDeep} textColor={C.ink} onPress={finish} />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <PulseRing color={C.coral} size={110} />
              <GestureDetector gesture={launchGesture}>
              <View accessible accessibilityRole="button" accessibilityLabel="Hold to launch" accessibilityHint="Press and hold to start the countdown" onAccessibilityTap={launchJS}
                style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: holding ? C.coralDeep : C.coral, borderBottomWidth: 9, borderBottomColor: C.coralDeep, alignItems: 'center', justifyContent: 'center', transform: [{ scale: holding ? 0.94 : 1 }] }}>
                <Text style={{ fontSize: 30 }}>🚀</Text>
                <Text style={{ fontFamily: F.display, fontSize: 15, color: C.cream }}>{count === null ? (holding ? 'HOLD…' : 'HOLD') : 'GO!'}</Text>
              </View>
              </GestureDetector>
            </View>
          )}
        </View>

        </GameBody>
        <AskNumi open={voice} onClose={() => { setVoice(false); trk.resetIdle(); }} respond={respond} onReply={onReply}
          opener={`Stage ${stage + 1}: ${STAGES[stage].toLowerCase()}. I can see everything — what are you thinking?`}
          chips={stage === 0 ? ["I don't understand", `Use ${cfg.cans[0]} and ${cfg.cans[1]}`, 'Give me a clue'] : stage === 1 ? ["I don't understand", `Give ${each} to everyone`, 'Give me a clue'] : ["I don't understand", 'Give me a clue']}
          style={{ position: 'absolute', left: 12, right: 12, bottom: ins.bottom + 10 }} />
        <StuckSheet open={stuck} onChoose={onStuck} onClose={() => { setStuck(false); trk.resetIdle(); }} />
        <Scratchpad open={pad} onClose={() => { setPad(false); trk.resetIdle(); }} title={`Stage ${stage + 1}: ${STAGES[stage].toLowerCase()}`} />
      </View>
    </DropProvider>
  );
}

function TrayHead({ label, onHint, onPad }: { label: string; onHint: () => void; onPad: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Eyebrow color="rgba(253,245,232,.55)" style={{ flex: 1 }}>{label}</Eyebrow>
      <Tap onPress={onPad} a11y="Scratchpad" style={{ backgroundColor: 'rgba(253,245,232,.14)', borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10 }}><Text style={{ fontSize: 15 }}>✏️</Text></Tap>
      <Tap onPress={onHint} a11y="Hint" style={{ backgroundColor: C.violet, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10 }}><Text style={{ fontSize: 15 }}>💡</Text></Tap>
    </View>
  );
}

// Smallest subset of values that sums to target (for glowing hints).
function findSubset(values: number[], target: number): number[] {
  let best: number[] = [];
  const n = values.length;
  for (let m = 1; m < 1 << n; m++) {
    const pick = values.filter((_, i) => m & (1 << i));
    if (pick.reduce((a, b) => a + b, 0) === target && (!best.length || pick.length < best.length)) best = pick;
  }
  return best;
}
