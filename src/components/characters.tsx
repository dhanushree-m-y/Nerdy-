// Characters in soft-3D clay style: rounded volumes, gradient shading, rim light,
// grounded shadows. No outlines. Motion uses view transforms + pose swaps (works on every platform).
import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { CharacterId, CHARACTERS } from '../data/world';
import { alpha, shade, tint } from '../theme/palette';
import { C, Mood } from '../theme/tokens';
import { useLoop, useMotionOK } from './motion';

let gid = 0;
const nextId = (p: string) => `${p}${++gid}`;

/** Blink on a timer — pose swaps keep this identical on web and native. */
function useBlink() {
  const ok = useMotionOK();
  const [closed, setClosed] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!ok) return;
    let alive = true;
    const loop = () => {
      t.current = setTimeout(() => {
        if (!alive) return;
        setClosed(true);
        t.current = setTimeout(() => { if (!alive) return; setClosed(false); loop(); }, 110);
      }, 2600 + Math.random() * 2800);
    };
    loop();
    return () => { alive = false; clearTimeout(t.current); };
  }, [ok]);
  return closed;
}

function usePoseTick(active: boolean, ms: number) {
  const ok = useMotionOK();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active || !ok) return;
    const id = setInterval(() => setTick(v => v + 1), ms);
    return () => clearInterval(id);
  }, [active, ms, ok]);
  return active && ok ? tick : 0;
}

/** Soft contact shadow. */
const Shadow = ({ cx, cy, rx, ry = rx * 0.26 }: { cx: number; cy: number; rx: number; ry?: number }) => (
  <G>
    <Ellipse cx={cx} cy={cy} rx={rx * 1.2} ry={ry * 1.25} fill="rgba(34,48,59,.06)" />
    <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(34,48,59,.1)" />
    <Ellipse cx={cx} cy={cy} rx={rx * 0.62} ry={ry * 0.65} fill="rgba(34,48,59,.1)" />
  </G>
);

/** Sphere shading: light from the upper-left, soft bounce at the base. */
function sphereStops(color: string) {
  return [
    <Stop key="a" offset="0" stopColor={tint(color, 0.45)} />,
    <Stop key="b" offset="0.45" stopColor={tint(color, 0.08)} />,
    <Stop key="c" offset="0.82" stopColor={shade(color, 0.16)} />,
    <Stop key="d" offset="1" stopColor={shade(color, 0.3)} />,
  ];
}

function Eyes({ mood, blink, x1, x2, y, r = 6 }: { mood: Mood; blink: boolean; x1: number; x2: number; y: number; r?: number }) {
  if (blink) {
    return (
      <G>
        {[x1, x2].map(x => <Path key={x} d={`M${x - r} ${y} q${r} ${r * 0.75} ${r * 2} 0`} stroke="#3b2f2b" strokeWidth={r * 0.5} fill="none" strokeLinecap="round" />)}
      </G>
    );
  }
  const big = mood === 'wow';
  if (mood === 'worried') {
    return (
      <G>
        {([[x1, 1], [x2, -1]] as [number, number][]).map(([x, dir]) => (
          <G key={x}>
            <Ellipse cx={x} cy={y} rx={r * 0.72} ry={r * 0.58} fill="#3b2f2b" />
            <Path d={`M${x - r} ${y - r * 1.3} q${r} ${-r * 0.5 * dir} ${r * 2} ${r * 0.3 * dir}`} stroke="#3b2f2b" strokeWidth={r * 0.34} fill="none" strokeLinecap="round" opacity={0.85} />
          </G>
        ))}
      </G>
    );
  }
  return (
    <G>
      {[x1, x2].map(x => (
        <G key={x}>
          <Ellipse cx={x} cy={y} rx={r * (big ? 1.15 : 0.95)} ry={r * (big ? 1.25 : 1.05)} fill="#ffffff" />
          <Ellipse cx={x} cy={y + r * 0.08} rx={r * (big ? 0.6 : 0.68)} ry={r * (big ? 0.68 : 0.76)} fill="#3b2f2b" />
          <Circle cx={x + r * 0.26} cy={y - r * 0.34} r={r * 0.26} fill="#ffffff" />
          <Circle cx={x - r * 0.3} cy={y + r * 0.34} r={r * 0.14} fill="#ffffff" opacity={0.6} />
        </G>
      ))}
    </G>
  );
}

function Mouth({ mood, cx, cy, w = 16 }: { mood: Mood; cx: number; cy: number; w?: number }) {
  if (mood === 'wow') {
    return (
      <G>
        <Ellipse cx={cx} cy={cy + 2} rx={w * 0.3} ry={w * 0.4} fill="#7a4046" />
        <Ellipse cx={cx} cy={cy + w * 0.22} rx={w * 0.2} ry={w * 0.18} fill="#ef8f8f" />
      </G>
    );
  }
  if (mood === 'worried') return <Path d={`M${cx - w / 2.6} ${cy + 3} q${w / 2.6} ${-w * 0.36} ${w / 1.3} 0`} stroke="#7a4046" strokeWidth={2.8} fill="none" strokeLinecap="round" />;
  if (mood === 'think') return <Path d={`M${cx - w / 3} ${cy} h${w * 0.55}`} stroke="#7a4046" strokeWidth={2.8} fill="none" strokeLinecap="round" />;
  return (
    <G>
      <Path d={`M${cx - w / 2} ${cy - 2} q${w / 2} ${w * 0.62} ${w} 0 q${-w / 2} ${w * 0.16} ${-w} 0z`} fill="#7a4046" />
      <Path d={`M${cx - w / 4} ${cy + w * 0.26} q${w / 4} ${w * 0.2} ${w / 2} 0z`} fill="#ef8f8f" />
    </G>
  );
}

const Blush = ({ x, y, r = 5 }: { x: number; y: number; r?: number }) => (
  <Ellipse cx={x} cy={y} rx={r} ry={r * 0.6} fill={alpha(C.coral, 0.35)} />
);

// ─── NUMI ─────────────────────────────────────────────────────────────────────
export type NumiState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'celebrate';

export function Numi({ size = 120, mood = 'happy', state = 'idle', style }: { size?: number; mood?: Mood; state?: NumiState; style?: StyleProp<ViewStyle> }) {
  const blink = useBlink();
  const bob = useLoop(state === 'speaking' ? 700 : state === 'celebrate' ? 430 : 1800);
  const glow = useLoop(state === 'thinking' ? 520 : 1000, { enabled: state !== 'idle' });
  const wave = useLoop(400, { enabled: state === 'celebrate' || state === 'listening' });
  const talkTick = usePoseTick(state === 'speaking', 160);

  const cheer = state === 'celebrate', listen = state === 'listening', speak = state === 'speaking';
  const body = useAnimatedStyle(() => ({ transform: [{ translateY: -(cheer ? 9 : 4) * bob.value }] }));
  const tilt = useAnimatedStyle(() => ({ transform: [{ rotate: `${cheer ? interpolate(wave.value, [0, 1], [-5, 5]) : listen ? interpolate(wave.value, [0, 1], [-2.5, 2.5]) : 0}deg` }] }));
  const halo = useAnimatedStyle(() => ({ opacity: 0.2 + 0.5 * glow.value, transform: [{ scale: 0.8 + 0.4 * glow.value }] }));

  const bulbColor = listen ? C.violet : state === 'thinking' ? C.sun : speak ? '#63dcbe' : C.sun;
  const shell = nextId('nb'), face = nextId('nf'), bulb = nextId('nl'), arm = nextId('na');
  const W = size, H = size * (152 / 120);
  const mouthOpen = speak ? talkTick % 2 === 0 : false;

  return (
    <Animated.View pointerEvents="none" style={[{ width: W, height: H }, style, body]}>
      {state !== 'idle' && (
        <Animated.View style={[{ position: 'absolute', left: W * 0.36, top: -W * 0.09, width: W * 0.28, height: W * 0.28, borderRadius: W, backgroundColor: bulbColor }, halo]} />
      )}
      <Animated.View style={[{ width: W, height: H }, tilt]}>
        <Svg width={W} height={H} viewBox="0 0 120 152">
          <Defs>
            <RadialGradient id={shell} cx="0.34" cy="0.24" r="0.95">{sphereStops(C.teal)}</RadialGradient>
            <RadialGradient id={face} cx="0.4" cy="0.3" r="0.9">
              <Stop offset="0" stopColor="#ffffff" /><Stop offset="0.7" stopColor="#fdf6e6" /><Stop offset="1" stopColor="#e7dcc6" />
            </RadialGradient>
            <RadialGradient id={bulb} cx="0.35" cy="0.3" r="0.8">{sphereStops(bulbColor)}</RadialGradient>
            <LinearGradient id={arm} x1="0" y1="0" x2="1" y2="0.4">
              <Stop offset="0" stopColor={tint(C.teal, 0.2)} /><Stop offset="1" stopColor={shade(C.teal, 0.28)} />
            </LinearGradient>
          </Defs>
          <Shadow cx={60} cy={146} rx={36} />
          {/* antenna */}
          <Rect x={57} y={8} width={6} height={20} rx={3} fill={shade(C.teal, 0.2)} />
          <Circle cx={60} cy={9} r={9} fill={`url(#${bulb})`} />
          <Circle cx={57} cy={6} r={3} fill="#ffffff" opacity={0.75} />
          {/* arms */}
          {cheer ? (
            <G>
              <Path d="M24 74 q-16 -10 -14 -30" stroke={`url(#${arm})`} strokeWidth={13} fill="none" strokeLinecap="round" />
              <Path d="M96 74 q16 -10 14 -30" stroke={`url(#${arm})`} strokeWidth={13} fill="none" strokeLinecap="round" />
              <Circle cx={10} cy={44} r={8} fill={tint(C.teal, 0.1)} />
              <Circle cx={110} cy={44} r={8} fill={shade(C.teal, 0.12)} />
            </G>
          ) : (
            <G>
              <Path d="M24 74 q-14 10 -13 28" stroke={`url(#${arm})`} strokeWidth={13} fill="none" strokeLinecap="round" />
              <Path d="M96 74 q14 10 13 28" stroke={`url(#${arm})`} strokeWidth={13} fill="none" strokeLinecap="round" />
              <Circle cx={11} cy={102} r={8} fill={tint(C.teal, 0.1)} />
              <Circle cx={109} cy={102} r={8} fill={shade(C.teal, 0.12)} />
            </G>
          )}
          {/* feet */}
          <Ellipse cx={42} cy={138} rx={17} ry={10} fill={shade(C.teal, 0.34)} />
          <Ellipse cx={78} cy={138} rx={17} ry={10} fill={shade(C.teal, 0.34)} />
          {/* shell */}
          <Rect x={16} y={26} width={88} height={110} rx={40} fill={`url(#${shell})`} />
          <Ellipse cx={40} cy={48} rx={17} ry={11} fill="#ffffff" opacity={0.3} transform="rotate(-32 40 48)" />
          <Path d="M96 60 q10 26 -2 54 q14 -24 2 -54z" fill="#ffffff" opacity={0.16} />
          {/* face plate */}
          <Rect x={26} y={42} width={68} height={56} rx={26} fill={alpha('#22303b', 0.12)} />
          <Rect x={28} y={43} width={64} height={53} rx={24} fill={`url(#${face})`} />
          <Eyes mood={mood} blink={blink} x1={47} x2={73} y={mood === 'think' ? 62 : 65} r={7} />
          <Blush x={37} y={78} r={6} /><Blush x={83} y={78} r={6} />
          {speak
            ? <Ellipse cx={60} cy={82} rx={6.5} ry={mouthOpen ? 9 : 3.5} fill="#7a4046" />
            : <Mouth mood={mood} cx={60} cy={80} w={17} />}
          {/* badge */}
          <Circle cx={60} cy={116} r={14} fill="#ffffff" opacity={0.92} />
          <Circle cx={60} cy={116} r={14} fill={alpha(C.tealDeep, 0.08)} />
          <Path d="M53 116 h14 M60 109 v14" stroke={C.teal} strokeWidth={3.4} strokeLinecap="round" />
          <Circle cx={55} cy={111} r={3} fill="#ffffff" opacity={0.8} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Story partners ───────────────────────────────────────────────────────────
const SKIN = ['#f6cfa8', '#c98a5e', '#8a5a3b'];
const HAIR = ['#3a2c25', '#6b3f2a', '#c9924b', '#8a6ad0'];
const CHAR_SKIN: Record<CharacterId, string> = { nia: SKIN[1], milo: SKIN[0], pip: SKIN[2], zuri: SKIN[1], nova: SKIN[0] };
const HAT_COLOR: Record<CharacterId, string> = { nia: C.sun, milo: '#ffffff', pip: C.coral, zuri: '#cfa15c', nova: '#dfe9f0' };

export function Buddy({ id, size = 100, mood = 'happy', walking = false, cheering = false, style }: {
  id: CharacterId; size?: number; mood?: Mood; walking?: boolean; cheering?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const ch = CHARACTERS[id];
  const blink = useBlink();
  const step = useLoop(walking ? 300 : cheering ? 330 : 1900);
  const stride = usePoseTick(walking, 260) % 2 === 0 ? 1 : -1;
  const body = useAnimatedStyle(() => ({
    transform: [{ translateY: -(walking ? 4 : cheering ? 10 : 2) * step.value }, { rotate: walking ? `${interpolate(step.value, [0, 1], [-2, 2])}deg` : '0deg' }],
  }));
  const skin = CHAR_SKIN[id];
  const torso = nextId('bt'), head = nextId('bh'), limb = nextId('bl'), hat = nextId('bc');
  const W = size, H = size * 1.45;

  return (
    <Animated.View pointerEvents="none" style={[{ width: W, height: H }, style, body]}>
      <Svg width={W} height={H} viewBox="0 0 100 145">
        <Defs>
          <RadialGradient id={torso} cx="0.35" cy="0.25" r="0.95">{sphereStops(ch.body)}</RadialGradient>
          <RadialGradient id={head} cx="0.34" cy="0.28" r="0.9">{sphereStops(skin)}</RadialGradient>
          <RadialGradient id={hat} cx="0.35" cy="0.28" r="0.9">{sphereStops(HAT_COLOR[id])}</RadialGradient>
          <LinearGradient id={limb} x1="0" y1="0" x2="1" y2="0.3">
            <Stop offset="0" stopColor={tint(ch.deep, 0.18)} /><Stop offset="1" stopColor={shade(ch.deep, 0.26)} />
          </LinearGradient>
        </Defs>
        <Shadow cx={50} cy={139} rx={26} />
        {/* legs */}
        <G>
          {walking ? (
            <>
              <Path d={`M42 104 q${-5 * stride} 12 ${-8 * stride} 22`} stroke={`url(#${limb})`} strokeWidth={13} strokeLinecap="round" fill="none" />
              <Path d={`M58 104 q${5 * stride} 12 ${8 * stride} 22`} stroke={`url(#${limb})`} strokeWidth={13} strokeLinecap="round" fill="none" />
            </>
          ) : (
            <>
              <Rect x={35.5} y={98} width={13} height={34} rx={6.5} fill={`url(#${limb})`} />
              <Rect x={51.5} y={98} width={13} height={34} rx={6.5} fill={`url(#${limb})`} />
            </>
          )}
          <Ellipse cx={walking ? 38 - 8 * stride : 40} cy={131} rx={10} ry={7} fill="#4a4038" />
          <Ellipse cx={walking ? 62 + 8 * stride : 60} cy={131} rx={10} ry={7} fill="#5a4e44" />
        </G>
        {/* arms */}
        {cheering ? (
          <G>
            <Path d="M28 70 q-13 -13 -11 -27" stroke={`url(#${limb})`} strokeWidth={12} fill="none" strokeLinecap="round" />
            <Path d="M72 70 q13 -13 11 -27" stroke={`url(#${limb})`} strokeWidth={12} fill="none" strokeLinecap="round" />
            <Circle cx={17} cy={41} r={7.5} fill={skin} /><Circle cx={83} cy={41} r={7.5} fill={shade(skin, 0.1)} />
          </G>
        ) : (
          <G>
            <Path d={walking ? `M28 70 q${-9 + 4 * stride} 12 ${-9 + 7 * stride} 24` : 'M28 70 q-9 12 -9 24'} stroke={`url(#${limb})`} strokeWidth={12} fill="none" strokeLinecap="round" />
            <Path d={walking ? `M72 70 q${9 - 4 * stride} 12 ${9 - 7 * stride} 24` : 'M72 70 q9 12 9 24'} stroke={`url(#${limb})`} strokeWidth={12} fill="none" strokeLinecap="round" />
            <Circle cx={walking ? 19 + 7 * stride : 19} cy={95} r={7} fill={skin} />
            <Circle cx={walking ? 81 - 7 * stride : 81} cy={95} r={7} fill={shade(skin, 0.1)} />
          </G>
        )}
        {/* torso */}
        <Rect x={29} y={58} width={42} height={52} rx={20} fill={`url(#${torso})`} />
        <Ellipse cx={41} cy={70} rx={8} ry={5} fill="#ffffff" opacity={0.26} transform="rotate(-30 41 70)" />
        {/* outfit details */}
        {id === 'nia' && <G><Rect x={36} y={74} width={28} height={10} rx={5} fill={C.sun} /><Rect x={36} y={74} width={28} height={4} rx={2} fill="#ffffff" opacity={0.3} /></G>}
        {id === 'milo' && <G><Rect x={34} y={62} width={32} height={46} rx={14} fill="#fdfaf2" opacity={0.95} /><Circle cx={44} cy={78} r={2.2} fill="#ded6c6" /><Circle cx={44} cy={90} r={2.2} fill="#ded6c6" /></G>}
        {id === 'pip' && <G><Path d="M29 84 q21 9 42 0 v8 q0 18 -21 18 q-21 0 -21 -18z" fill={C.sun} /><Circle cx={50} cy={94} r={4.5} fill={shade(C.sun, 0.26)} /></G>}
        {id === 'zuri' && <G><Path d="M33 62 l34 36" stroke={alpha('#8c6436', 0.6)} strokeWidth={5} strokeLinecap="round" /><Circle cx={52} cy={86} r={7} fill={C.sun} /><Circle cx={50} cy={84} r={2.4} fill="#ffffff" opacity={0.6} /></G>}
        {id === 'nova' && <G><Rect x={36} y={70} width={28} height={16} rx={7} fill="#e8eef2" /><Circle cx={50} cy={78} r={4.5} fill={C.sun} /><Rect x={30} y={60} width={40} height={6} rx={3} fill="#e8eef2" /></G>}
        {/* head */}
        <Circle cx={50} cy={40} r={25} fill={`url(#${head})`} />
        <Circle cx={26} cy={43} r={5.5} fill={shade(skin, 0.08)} /><Circle cx={74} cy={43} r={5.5} fill={shade(skin, 0.14)} />
        {/* hair + hats as rounded volumes */}
        {id === 'nia' && (
          <G>
            <Path d="M28 33 q6 -22 22 -22 q16 0 22 22 q-22 -8 -44 0z" fill={`url(#${hat})`} />
            <Rect x={18} y={30} width={64} height={9} rx={4.5} fill={shade(C.sun, 0.22)} />
            <Ellipse cx={40} cy={20} rx={9} ry={4} fill="#ffffff" opacity={0.3} transform="rotate(-24 40 20)" />
            <Path d="M70 38 q9 10 5 23 q-5 -13 -11 -18z" fill={HAIR[0]} />
          </G>
        )}
        {id === 'milo' && (
          <G>
            <Circle cx={38} cy={14} r={11} fill={`url(#${hat})`} /><Circle cx={56} cy={10} r={13} fill={`url(#${hat})`} /><Circle cx={66} cy={18} r={10} fill={`url(#${hat})`} />
            <Rect x={28} y={20} width={44} height={12} rx={6} fill="#f6f1e6" />
            <Ellipse cx={50} cy={6} rx={8} ry={3} fill="#ffffff" opacity={0.5} />
          </G>
        )}
        {id === 'pip' && (
          <G>
            <Path d="M27 27 q7 -19 23 -19 q16 0 23 19 q-23 -7 -46 0z" fill={`url(#${hat})`} />
            <Path d="M50 27 h30 q-4 9 -15 9 h-15z" fill={shade(C.coral, 0.22)} />
            <Ellipse cx={40} cy={16} rx={8} ry={3.4} fill="#ffffff" opacity={0.28} transform="rotate(-22 40 16)" />
          </G>
        )}
        {id === 'zuri' && (
          <G>
            <Path d="M20 30 q30 -13 60 0 q-8 7 -30 7 q-22 0 -30 -7z" fill={`url(#${hat})`} />
            <Path d="M32 27 q6 -19 18 -19 q12 0 18 19z" fill="#d9ad6b" />
            <Rect x={31} y={22} width={38} height={6} rx={3} fill={C.coral} />
          </G>
        )}
        {id === 'nova' && (
          <G>
            <Path d="M30 22 q8 -14 20 -14 q12 0 20 14 q-20 -6 -40 0z" fill={HAIR[2]} />
            <Circle cx={50} cy={38} r={30} fill="#bfe3ef" opacity={0.22} />
            <Path d="M26 30 q10 -16 26 -17 q-18 7 -22 21z" fill="#ffffff" opacity={0.5} />
            <Path d="M20 38 a30 30 0 0 0 60 0 h-6 a24 24 0 0 1 -48 0z" fill="#e8eef2" opacity={0.5} />
          </G>
        )}
        <Eyes mood={mood} blink={blink} x1={41} x2={59} y={41} r={5} />
        <Blush x={32} y={50} r={5} /><Blush x={68} y={50} r={5} />
        <Mouth mood={mood} cx={50} cy={51} w={12} />
      </Svg>
    </Animated.View>
  );
}

// ─── Explorer avatar ──────────────────────────────────────────────────────────
export const EX_SKIN = SKIN;
export const EX_HAIR = HAIR;
export const EX_OUTFIT = [C.teal, C.violet, C.coral, C.sun];
export const EX_OUTFIT_DEEP = [C.tealDeep, C.violetDeep, C.coralDeep, C.sunDeep];
export const HAIR_STYLES = ['Crop', 'Curls', 'Buns', 'Cap'];
export const OUTFITS = ['Explorer', 'Hoodie', 'Overalls', 'Cape'];
export const AVATARS = ['🦊', '🐼', '🦁', '🐸'];

export function ExplorerAvatar({ skin = 1, hair = 0, hairStyle = 0, outfit = 0, size = 150, mood = 'happy', cheering = false, style }: {
  skin?: number; hair?: number; hairStyle?: number; outfit?: number; size?: number; mood?: Mood; cheering?: boolean; companion?: number; style?: StyleProp<ViewStyle>;
}) {
  const blink = useBlink();
  const bob = useLoop(cheering ? 340 : 1900);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: -(cheering ? 10 : 3) * bob.value }] }));
  const sk = SKIN[skin % 3], hc = HAIR[hair % 4], oc = EX_OUTFIT[outfit % 4], od = EX_OUTFIT_DEEP[outfit % 4];
  const torso = nextId('et'), head = nextId('eh'), limb = nextId('el'), hairG = nextId('eg');
  const W = size, H = size * 1.32;

  return (
    <Animated.View pointerEvents="none" style={[{ width: W, height: H }, style, a]}>
      <Svg width={W} height={H} viewBox="0 0 130 172">
        <Defs>
          <RadialGradient id={torso} cx="0.35" cy="0.25" r="0.95">{sphereStops(oc)}</RadialGradient>
          <RadialGradient id={head} cx="0.34" cy="0.28" r="0.9">{sphereStops(sk)}</RadialGradient>
          <RadialGradient id={hairG} cx="0.35" cy="0.25" r="0.9">{sphereStops(hc)}</RadialGradient>
          <LinearGradient id={limb} x1="0" y1="0" x2="1" y2="0.3">
            <Stop offset="0" stopColor={tint(od, 0.16)} /><Stop offset="1" stopColor={shade(od, 0.26)} />
          </LinearGradient>
        </Defs>
        <Shadow cx={65} cy={166} rx={36} />
        {outfit === 3 && <Path d="M44 80 q21 -9 42 0 l11 74 q-32 11 -64 0z" fill={shade(od, 0.12)} />}
        {/* legs */}
        <Rect x={47.5} y={120} width={15} height={37} rx={7.5} fill={`url(#${limb})`} />
        <Rect x={67.5} y={120} width={15} height={37} rx={7.5} fill={`url(#${limb})`} />
        <Ellipse cx={53} cy={157} rx={12} ry={8} fill="#4a4038" /><Ellipse cx={77} cy={157} rx={12} ry={8} fill="#5a4e44" />
        {/* arms */}
        {cheering ? (
          <G>
            <Path d="M40 86 q-15 -15 -13 -32" stroke={`url(#${limb})`} strokeWidth={14} fill="none" strokeLinecap="round" />
            <Path d="M90 86 q15 -15 13 -32" stroke={`url(#${limb})`} strokeWidth={14} fill="none" strokeLinecap="round" />
            <Circle cx={27} cy={50} r={9} fill={sk} /><Circle cx={103} cy={50} r={9} fill={shade(sk, 0.1)} />
          </G>
        ) : (
          <G>
            <Path d="M40 86 q-12 14 -12 28" stroke={`url(#${limb})`} strokeWidth={14} fill="none" strokeLinecap="round" />
            <Path d="M90 86 q12 14 12 28" stroke={`url(#${limb})`} strokeWidth={14} fill="none" strokeLinecap="round" />
            <Circle cx={28} cy={117} r={9} fill={sk} /><Circle cx={102} cy={117} r={9} fill={shade(sk, 0.1)} />
          </G>
        )}
        {/* torso */}
        <Rect x={42} y={72} width={46} height={60} rx={22} fill={`url(#${torso})`} />
        <Ellipse cx={56} cy={86} rx={9} ry={6} fill="#ffffff" opacity={0.26} transform="rotate(-30 56 86)" />
        {outfit === 0 && <G><Path d="M48 84 l36 34" stroke={alpha('#8c6436', 0.75)} strokeWidth={8} strokeLinecap="round" /><Rect x={74} y={104} width={18} height={15} rx={5} fill="#b5813f" /><Rect x={74} y={104} width={18} height={5} rx={2.5} fill="#ffffff" opacity={0.25} /></G>}
        {outfit === 1 && <G><Path d="M43 92 q22 12 44 0" stroke={shade(od, 0.2)} strokeWidth={3.4} fill="none" /><Rect x={54} y={106} width={22} height={13} rx={6.5} fill={shade(od, 0.22)} /></G>}
        {outfit === 2 && <G><Rect x={50} y={90} width={30} height={32} rx={9} fill="#6fb3dd" /><Rect x={51} y={68} width={7} height={24} rx={3.5} fill="#6fb3dd" /><Rect x={72} y={68} width={7} height={24} rx={3.5} fill="#6fb3dd" /><Rect x={50} y={90} width={30} height={5} rx={2.5} fill="#ffffff" opacity={0.25} /></G>}
        {outfit === 3 && <G><Circle cx={65} cy={94} r={10} fill={C.sun} /><Circle cx={62} cy={91} r={3.4} fill="#ffffff" opacity={0.7} /></G>}
        {/* head */}
        <Circle cx={65} cy={46} r={31} fill={`url(#${head})`} />
        <Circle cx={34} cy={50} r={6.5} fill={shade(sk, 0.08)} /><Circle cx={96} cy={50} r={6.5} fill={shade(sk, 0.14)} />
        {/* hair */}
        {hairStyle === 0 && <Path d="M34 42 q5 -30 31 -30 q26 0 31 30 q-31 -12 -62 0z" fill={`url(#${hairG})`} />}
        {hairStyle === 1 && (
          <G>
            {([[42, 24, 13], [58, 15, 15], [76, 16, 14], [90, 27, 12], [34, 42, 11], [96, 42, 11]] as [number, number, number][]).map(([x, y, r], i) => <Circle key={i} cx={x} cy={y} r={r} fill={`url(#${hairG})`} />)}
          </G>
        )}
        {hairStyle === 2 && (
          <G>
            <Path d="M35 42 q5 -30 30 -30 q25 0 30 30 q-30 -11 -60 0z" fill={`url(#${hairG})`} />
            <Circle cx={30} cy={22} r={13} fill={`url(#${hairG})`} /><Circle cx={100} cy={22} r={13} fill={`url(#${hairG})`} />
          </G>
        )}
        {hairStyle === 3 && (
          <G>
            <Path d="M34 40 q5 -29 31 -29 q26 0 31 29 q-31 -10 -62 0z" fill={`url(#${torso})`} />
            <Path d="M65 40 h38 q-7 10 -20 10 h-18z" fill={shade(oc, 0.24)} />
            <Circle cx={65} cy={12} r={6.5} fill={C.sun} />
          </G>
        )}
        <Eyes mood={mood} blink={blink} x1={54} x2={76} y={49} r={6} />
        <Blush x={43} y={60} r={6} /><Blush x={87} y={60} r={6} />
        <Mouth mood={mood} cx={65} cy={60} w={14} />
      </Svg>
    </Animated.View>
  );
}
