// Soft-3D world pieces: rounded clay volumes, gradient shading, specular highlights,
// grounded shadows. No outlines — depth comes from light and shadow.
import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { alpha, drain, shade, tint } from '../theme/palette';
import { C, F } from '../theme/tokens';
import { Bob, Drift, Shimmer, Spin, Sway, useLoop } from './motion';

type Pos = { style?: StyleProp<ViewStyle> };

let gid = 0;
const nextId = (p: string) => `${p}${++gid}`;

/** Stacked ellipses fake a blurred contact shadow (SVG filters aren't reliable on all platforms). */
function Grounded({ cx, cy, rx, ry = rx * 0.26, strength = 1 }: { cx: number; cy: number; rx: number; ry?: number; strength?: number }) {
  return (
    <G>
      <Ellipse cx={cx} cy={cy} rx={rx * 1.25} ry={ry * 1.3} fill={`rgba(34,48,59,${0.05 * strength})`} />
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`rgba(34,48,59,${0.09 * strength})`} />
      <Ellipse cx={cx} cy={cy} rx={rx * 0.7} ry={ry * 0.72} fill={`rgba(34,48,59,${0.11 * strength})`} />
    </G>
  );
}

/** Top-left lit sphere: the base shading unit for clay-style art. */
function Orb({ cx, cy, r, color, id }: { cx: number; cy: number; r: number; color: string; id: string }) {
  return (
    <G>
      <Defs>
        <RadialGradient id={id} cx="0.34" cy="0.28" r="0.85">
          <Stop offset="0" stopColor={tint(color, 0.42)} />
          <Stop offset="0.5" stopColor={color} />
          <Stop offset="1" stopColor={shade(color, 0.3)} />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
      <Ellipse cx={cx - r * 0.34} cy={cy - r * 0.42} rx={r * 0.3} ry={r * 0.2} fill="#ffffff" opacity={0.3} transform={`rotate(-28 ${cx - r * 0.34} ${cy - r * 0.42})`} />
    </G>
  );
}

export function Tri({ w, h, color, style }: Pos & { w: number; h: number; color: string }) {
  const id = nextId('tri');
  return (
    <View style={[{ width: w, height: h }, style]} pointerEvents="none">
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0.6">
            <Stop offset="0" stopColor={tint(color, 0.24)} /><Stop offset="1" stopColor={shade(color, 0.2)} />
          </LinearGradient>
        </Defs>
        <Polygon points={`${w / 2},0 ${w},${h} 0,${h}`} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

// ─── Sky ──────────────────────────────────────────────────────────────────────
export function Cloud({ scale = 1, opacity = 0.95, style }: Pos & { scale?: number; opacity?: number }) {
  const w = 116 * scale, h = 62 * scale;
  const id = nextId('cl');
  return (
    <View pointerEvents="none" style={[{ width: w, height: h, opacity }, style]}>
      <Svg width={w} height={h} viewBox="0 0 116 62">
        <Defs>
          <RadialGradient id={id} cx="0.35" cy="0.25" r="0.9">
            <Stop offset="0" stopColor="#ffffff" /><Stop offset="0.65" stopColor="#f4f9fc" /><Stop offset="1" stopColor="#dbe8f0" />
          </RadialGradient>
        </Defs>
        <Circle cx={34} cy={34} r={22} fill={`url(#${id})`} />
        <Circle cx={62} cy={26} r={26} fill={`url(#${id})`} />
        <Circle cx={88} cy={36} r={19} fill={`url(#${id})`} />
        <Rect x={28} y={34} width={64} height={22} rx={11} fill={`url(#${id})`} />
        <Ellipse cx={30} cy={53} rx={40} ry={7} fill="#cfe0ec" opacity={0.5} />
        <Ellipse cx={54} cy={16} rx={16} ry={7} fill="#ffffff" opacity={0.85} />
      </Svg>
    </View>
  );
}

export function DriftingClouds({ width, tops = [60, 130, 210] }: { width: number; tops?: number[] }) {
  return (
    <>
      {tops.map((t, i) => (
        <Drift key={i} from={-150} to={width + 60} duration={26000 + i * 9000} phase={(0.15 + i * 0.37) % 1} style={{ position: 'absolute', top: t, left: 0 }}>
          <Cloud scale={0.55 + (i % 2) * 0.35} opacity={0.8 + (i % 2) * 0.2} />
        </Drift>
      ))}
    </>
  );
}

export function Sun({ size = 54, style }: Pos & { size?: number }) {
  const box = size * 2;
  const g = nextId('sun'), glow = nextId('sung');
  return (
    <View pointerEvents="none" style={[{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={box} height={box} viewBox="0 0 120 120" style={{ position: 'absolute' }}>
        <Defs>
          <RadialGradient id={glow} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0.45" stopColor={C.sun} stopOpacity={0.4} /><Stop offset="1" stopColor={C.sun} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={60} cy={60} r={60} fill={`url(#${glow})`} />
      </Svg>
      <Spin duration={46000} style={{ position: 'absolute', width: box, height: box }}>
        <Svg width={box} height={box} viewBox="0 0 120 120">
          {Array.from({ length: 10 }, (_, i) => (
            <Rect key={i} x={57} y={6} width={6} height={15} rx={3} fill={alpha(C.sun, 0.45)} transform={`rotate(${i * 36} 60 60)`} />
          ))}
        </Svg>
      </Spin>
      <Bob amp={3} duration={3000}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Orb cx={50} cy={50} r={38} color={C.sun} id={g} />
        </Svg>
      </Bob>
    </View>
  );
}

export function Mountain({ w, h, color, snow = true, style }: Pos & { w: number; h: number; color: string; snow?: boolean }) {
  const lit = nextId('mtl'), dark = nextId('mtd');
  return (
    <View pointerEvents="none" style={[{ width: w, height: h }, style]}>
      <Svg width={w} height={h} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={lit} x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor={tint(color, 0.3)} /><Stop offset="1" stopColor={tint(color, 0.04)} />
          </LinearGradient>
          <LinearGradient id={dark} x1="0.2" y1="0" x2="1" y2="0.8">
            <Stop offset="0" stopColor={shade(color, 0.12)} /><Stop offset="1" stopColor={shade(color, 0.34)} />
          </LinearGradient>
        </Defs>
        {/* two faces read as a 3-D ridge */}
        <Path d="M50 0 L0 100 L50 100 Z" fill={`url(#${lit})`} />
        <Path d="M50 0 L100 100 L50 100 Z" fill={`url(#${dark})`} />
        {snow && (
          <>
            <Path d="M50 0 L31 38 q9 5 19 3 Z" fill="#ffffff" />
            <Path d="M50 0 L69 38 q-9 5 -19 3 Z" fill="#e3ecf3" />
          </>
        )}
        <Path d="M50 0 L50 100" stroke={alpha('#ffffff', 0.18)} strokeWidth={1.4} />
      </Svg>
    </View>
  );
}

/** Water with depth, moving highlights and a soft far-bank shadow. */
export function River({ height = 56, width, style, rotate = 0 }: Pos & { height?: number; width: number; rotate?: number }) {
  const id = nextId('riv');
  return (
    <View pointerEvents="none" style={[{ height, width, overflow: 'hidden', transform: [{ rotate: `${rotate}deg` }] }, style]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={shade(C.water, 0.26)} />
            <Stop offset="0.28" stopColor={C.water} />
            <Stop offset="0.72" stopColor={tint(C.water, 0.2)} />
            <Stop offset="1" stopColor={shade(C.water, 0.1)} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${id})`} />
        <Rect x={0} y={0} width={width} height={height * 0.16} fill={alpha('#22303b', 0.16)} />
        <Rect x={0} y={height * 0.42} width={width} height={height * 0.1} rx={height * 0.05} fill="#ffffff" opacity={0.16} />
      </Svg>
      <Shimmer style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#fff' }} min={0.04} max={0.14} duration={3000} />
      {[0.3, 0.66].map((y, row) => (
        <Drift key={row} from={-80} to={0} duration={3000 + row * 1400} style={{ position: 'absolute', top: height * y, left: 0, flexDirection: 'row', gap: 34 }}>
          {Array.from({ length: Math.ceil(width / 56) + 3 }, (_, i) => (
            <Svg key={i} width={30} height={8} viewBox="0 0 30 8">
              <Rect x={0} y={2} width={30} height={4} rx={2} fill={alpha('#ffffff', row ? 0.35 : 0.55)} />
            </Svg>
          ))}
        </Drift>
      ))}
    </View>
  );
}

// ─── Buildings ────────────────────────────────────────────────────────────────
export function Windmill({ scale = 1, style }: Pos & { scale?: number }) {
  const w = 84 * scale, h = 132 * scale;
  const stone = '#f2ead9';
  const tower = nextId('wt'), cap = nextId('wc'), hub = nextId('wh');
  return (
    <View pointerEvents="none" style={[{ width: w, height: h }, style]}>
      <Svg width={w} height={h} viewBox="0 0 84 132">
        <Defs>
          {/* cylinder shading */}
          <LinearGradient id={tower} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={shade(stone, 0.2)} /><Stop offset="0.3" stopColor={tint(stone, 0.3)} />
            <Stop offset="0.62" stopColor={stone} /><Stop offset="1" stopColor={shade(stone, 0.26)} />
          </LinearGradient>
          <LinearGradient id={cap} x1="0.1" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={tint(C.coral, 0.3)} /><Stop offset="1" stopColor={shade(C.coral, 0.26)} />
          </LinearGradient>
        </Defs>
        <Grounded cx={42} cy={124} rx={30} />
        <Path d="M27 46 L57 46 L66 120 q-24 7 -48 0 Z" fill={`url(#${tower})`} />
        <Path d="M20 118 q22 8 44 0 q-22 7 -44 0z" fill={shade(stone, 0.16)} opacity={0.5} />
        {/* door */}
        <Path d="M36 120 v-18 a6 6 0 0 1 12 0 v18 q-6 2 -12 0z" fill={shade(C.woodDeep, 0.05)} />
        <Circle cx={46} cy={110} r={1.6} fill={C.sun} />
        {/* window with warm glow */}
        <Circle cx={42} cy={70} r={9} fill={alpha('#4a3a2a', 0.25)} />
        <Circle cx={42} cy={70} r={7} fill={C.sun} opacity={0.9} />
        <Ellipse cx={39} cy={67} rx={2.6} ry={1.8} fill="#fff8e2" opacity={0.9} />
        {/* cap dome */}
        <Path d="M22 48 q20 -30 40 0 q-20 6 -40 0z" fill={`url(#${cap})`} />
        <Ellipse cx={34} cy={36} rx={9} ry={4} fill="#ffffff" opacity={0.22} transform="rotate(-24 34 36)" />
      </Svg>
      <Spin duration={7600} style={{ position: 'absolute', left: 2 * scale, top: 6 * scale, width: 80 * scale, height: 80 * scale }}>
        <Svg width={80 * scale} height={80 * scale} viewBox="0 0 80 80">
          <Defs>
            <LinearGradient id={hub} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#ffffff" /><Stop offset="1" stopColor="#d9d2c2" />
            </LinearGradient>
          </Defs>
          {[0, 90, 180, 270].map(r => (
            <G key={r} transform={`rotate(${r} 40 40)`}>
              <Rect x={36} y={4} width={8} height={34} rx={4} fill={`url(#${hub})`} />
              <Rect x={36} y={4} width={3} height={34} rx={1.5} fill="#ffffff" opacity={0.6} />
            </G>
          ))}
          <Circle cx={40} cy={40} r={6} fill={C.sun} />
          <Circle cx={38} cy={38} r={2} fill="#fff4d2" opacity={0.9} />
        </Svg>
      </Spin>
    </View>
  );
}

/** Rounded clay cottage: lit front, shaded right, glowing window. */
export function House({ w = 56, roof = C.coral, wall = C.cream, lit = false, style, dim = false }: Pos & { w?: number; roof?: string; wall?: string; lit?: boolean; dim?: boolean }) {
  const W = w + 26, H = w * 1.62;
  const R = dim ? drain(roof, 0.55) : roof;
  const WL = dim ? drain(wall, 0.4) : wall;
  const body = nextId('hb'), rf = nextId('hr'), win = nextId('hw'), dr = nextId('hd');
  return (
    <View pointerEvents="none" style={[{ width: W, height: H }, style]}>
      <Svg width={W} height={H} viewBox="0 0 120 150">
        <Defs>
          <LinearGradient id={body} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={tint(WL, 0.24)} /><Stop offset="0.55" stopColor={WL} /><Stop offset="1" stopColor={shade(WL, 0.2)} />
          </LinearGradient>
          <LinearGradient id={rf} x1="0.1" y1="0" x2="0.9" y2="1">
            <Stop offset="0" stopColor={tint(R, 0.28)} /><Stop offset="0.55" stopColor={R} /><Stop offset="1" stopColor={shade(R, 0.28)} />
          </LinearGradient>
          <RadialGradient id={win} cx="0.5" cy="0.4" r="0.7">
            <Stop offset="0" stopColor={lit ? '#fff6d8' : '#eaf3f8'} /><Stop offset="1" stopColor={lit ? '#f3b63f' : '#b9d2e0'} />
          </RadialGradient>
          <LinearGradient id={dr} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={tint(C.woodDeep, 0.2)} /><Stop offset="1" stopColor={shade(C.woodDeep, 0.25)} />
          </LinearGradient>
        </Defs>
        <Grounded cx={60} cy={140} rx={46} />
        {/* body */}
        <Rect x={16} y={62} width={88} height={78} rx={14} fill={`url(#${body})`} />
        {/* ambient occlusion under the roof */}
        <Rect x={16} y={62} width={88} height={14} rx={7} fill={alpha('#22303b', 0.12)} />
        {/* roof: rounded gable, lit left face + shaded right face */}
        <Path d="M60 12 q10 0 16 8 L112 58 q6 8 -4 10 L60 74 Z" fill={shade(R, 0.24)} />
        <Path d="M60 12 q-10 0 -16 8 L8 58 q-6 8 4 10 L60 74 Z" fill={`url(#${rf})`} />
        <Ellipse cx={40} cy={36} rx={13} ry={5} fill="#ffffff" opacity={0.25} transform="rotate(-40 40 36)" />
        {/* chimney */}
        <Rect x={78} y={20} width={14} height={26} rx={5} fill={shade(R, 0.3)} />
        <Ellipse cx={85} cy={21} rx={7} ry={3} fill={shade(R, 0.12)} />
        {/* window */}
        <Rect x={28} y={84} width={32} height={30} rx={9} fill={alpha('#22303b', 0.14)} />
        <Rect x={30} y={85} width={28} height={27} rx={8} fill={`url(#${win})`} />
        <Path d="M33 92 q6 -5 13 -4 q-9 2 -12 8z" fill="#ffffff" opacity={0.5} />
        {lit && <Circle cx={44} cy={99} r={24} fill={alpha(C.sun, 0.14)} />}
        {/* door */}
        <Path d="M72 140 v-30 a12 12 0 0 1 24 0 v30 z" fill={`url(#${dr})`} />
        <Path d="M72 110 a12 12 0 0 1 24 0 q-12 -4 -24 0z" fill="#ffffff" opacity={0.12} />
        <Circle cx={90} cy={126} r={2.6} fill={C.sun} />
        {/* planter */}
        <Rect x={24} y={116} width={40} height={11} rx={5} fill={dim ? drain(C.wood) : C.wood} />
        <Rect x={24} y={116} width={40} height={4} rx={2} fill="#ffffff" opacity={0.18} />
        {!dim && <G>
          <Circle cx={32} cy={114} r={4} fill={C.coral} /><Circle cx={44} cy={113} r={4} fill={C.sun} /><Circle cx={56} cy={114} r={4} fill={C.violet} />
        </G>}
      </Svg>
    </View>
  );
}

export function Tree({ size = 34, color = '#5aa06a', style }: Pos & { size?: number; color?: string }) {
  const w = size * 1.3, h = size * 1.9;
  const a = nextId('t'), b = nextId('t'), c = nextId('t'), tr = nextId('tt');
  return (
    <Sway deg={1.8} duration={2800} style={[{ width: w, height: h, transformOrigin: 'bottom center' }, style]}>
      <Svg width={w} height={h} viewBox="0 0 70 104" pointerEvents="none">
        <Defs>
          <LinearGradient id={tr} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={tint('#8a6239', 0.25)} /><Stop offset="1" stopColor={shade('#8a6239', 0.3)} />
          </LinearGradient>
        </Defs>
        <Grounded cx={35} cy={99} rx={22} />
        <Path d="M30 100 q-1 -22 3 -34 h6 q4 14 3 34 z" fill={`url(#${tr})`} />
        <Orb cx={24} cy={52} r={16} color={shade(color, 0.12)} id={a} />
        <Orb cx={47} cy={48} r={15} color={shade(color, 0.04)} id={b} />
        <Orb cx={34} cy={33} r={20} color={color} id={c} />
        <Circle cx={45} cy={36} r={3} fill={C.coral} /><Circle cx={23} cy={58} r={2.6} fill={C.coral} />
      </Svg>
    </Sway>
  );
}

/** Wooden bridge with rounded rails, shaded deck and a shadow on the water. */
export function Bridge({ width, height = 58, broken = false, style }: Pos & { width: number; height?: number; broken?: boolean }) {
  const deckY = height * 0.44;
  const deck = nextId('bd'), rail = nextId('br');
  const planks = Math.max(5, Math.round(width / 24));
  return (
    <View pointerEvents="none" style={[{ width, height }, style]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={deck} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tint(C.wood, 0.3)} /><Stop offset="0.45" stopColor={C.wood} /><Stop offset="1" stopColor={shade(C.wood, 0.34)} />
          </LinearGradient>
          <LinearGradient id={rail} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tint('#a87a46', 0.3)} /><Stop offset="1" stopColor={shade('#a87a46', 0.25)} />
          </LinearGradient>
        </Defs>
        {broken ? (
          <G>
            <Rect x={0} y={deckY} width={width * 0.3} height={15} rx={6} fill={`url(#${deck})`} transform={`rotate(4 0 ${deckY})`} />
            <Rect x={width * 0.72} y={deckY} width={width * 0.28} height={15} rx={6} fill={`url(#${deck})`} transform={`rotate(-5 ${width} ${deckY})`} />
            <Rect x={width * 0.1} y={deckY - 20} width={8} height={22} rx={4} fill={`url(#${rail})`} />
            <Rect x={width * 0.84} y={deckY - 20} width={8} height={22} rx={4} fill={`url(#${rail})`} />
          </G>
        ) : (
          <G>
            {/* shadow cast on the water */}
            <Rect x={4} y={deckY + 20} width={width - 8} height={9} rx={4.5} fill="rgba(20,60,90,.22)" />
            {/* rails */}
            {Array.from({ length: 5 }, (_, i) => {
              const x = 6 + (i * (width - 20)) / 4;
              return (
                <G key={i}>
                  <Rect x={x} y={deckY - 26} width={8} height={30} rx={4} fill={`url(#${rail})`} />
                  <Circle cx={x + 4} cy={deckY - 27} r={5} fill={tint('#a87a46', 0.2)} />
                  <Circle cx={x + 2.6} cy={deckY - 28.5} r={1.8} fill="#ffffff" opacity={0.5} />
                </G>
              );
            })}
            <Rect x={4} y={deckY - 22} width={width - 8} height={6} rx={3} fill={tint('#a87a46', 0.12)} />
            {/* deck */}
            <Rect x={0} y={deckY} width={width} height={15} rx={5} fill={`url(#${deck})`} />
            {Array.from({ length: planks }, (_, i) => (
              <Rect key={i} x={2 + (i * (width - 4)) / planks} y={deckY + 1.5} width={(width - 4) / planks - 2.5} height={12} rx={3} fill={i % 2 ? alpha('#ffffff', 0.12) : alpha('#7a4f26', 0.1)} />
            ))}
            <Rect x={0} y={deckY} width={width} height={4} rx={2} fill="#ffffff" opacity={0.22} />
          </G>
        )}
      </Svg>
    </View>
  );
}

// ─── Creatures & vehicles ─────────────────────────────────────────────────────
export function Bird({ size = 20, color = C.ink, style }: Pos & { size?: number; color?: string }) {
  const v = useLoop(280);
  const a = useAnimatedStyle(() => ({ transform: [{ scaleY: interpolate(v.value, [0, 1], [0.55, 1.15]) }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ width: size, height: size * 0.55, opacity: 0.5 }, style, a]}>
      <Svg width={size} height={size * 0.55} viewBox="0 0 24 13">
        <Path d="M2 9 q5 -8 10 -1 q5 -7 10 1" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

export function Flock({ width, top }: { width: number; top: number }) {
  return (
    <Drift from={-70} to={width + 70} duration={21000} rise={40} style={{ position: 'absolute', top, left: 0 }}>
      <Bird />
      <Bird size={15} style={{ marginLeft: 18, marginTop: 5 }} />
      <Bird size={11} style={{ marginLeft: 5, marginTop: 2 }} />
    </Drift>
  );
}

export function Train({ scale = 1, style }: Pos & { scale?: number }) {
  const w = 176 * scale, h = 68 * scale;
  const eng = nextId('te'), car = nextId('tc');
  const wheel = (cx: number, cy: number, r: number, key: string) => (
    <G key={key}>
      <Circle cx={cx} cy={cy} r={r} fill="#39434e" />
      <Circle cx={cx} cy={cy} r={r * 0.95} fill="#2b343d" />
      <Circle cx={cx} cy={cy} r={r * 0.4} fill="#9aa6b1" />
      <Circle cx={cx - r * 0.25} cy={cy - r * 0.3} r={r * 0.16} fill="#ffffff" opacity={0.35} />
    </G>
  );
  return (
    <View pointerEvents="none" style={[{ width: w, height: h }, style]}>
      <Svg width={w} height={h} viewBox="0 0 176 68">
        <Defs>
          <LinearGradient id={eng} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tint(C.coral, 0.3)} /><Stop offset="0.5" stopColor={C.coral} /><Stop offset="1" stopColor={shade(C.coral, 0.3)} />
          </LinearGradient>
          <LinearGradient id={car} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tint(C.violet, 0.3)} /><Stop offset="0.5" stopColor={C.violet} /><Stop offset="1" stopColor={shade(C.violet, 0.3)} />
          </LinearGradient>
        </Defs>
        <Grounded cx={88} cy={62} rx={74} strength={0.8} />
        {[8, 56].map((x, i) => (
          <G key={x}>
            <Rect x={x} y={22} width={42} height={24} rx={8} fill={i ? `url(#${eng})` : `url(#${car})`} opacity={i ? 0.92 : 1} />
            <Rect x={x + 4} y={26} width={13} height={10} rx={4} fill="#eaf4fa" />
            <Rect x={x + 23} y={26} width={13} height={10} rx={4} fill="#eaf4fa" />
            <Rect x={x + 3} y={24} width={36} height={4} rx={2} fill="#ffffff" opacity={0.3} />
            {wheel(x + 11, 50, 6.5, `${x}a`)}{wheel(x + 31, 50, 6.5, `${x}b`)}
          </G>
        ))}
        <Rect x={104} y={16} width={64} height={30} rx={10} fill={`url(#${eng})`} />
        <Rect x={106} y={10} width={28} height={24} rx={8} fill={shade(C.coral, 0.16)} />
        <Rect x={111} y={15} width={17} height={12} rx={4} fill="#eaf4fa" />
        <Rect x={108} y={18} width={54} height={5} rx={2.5} fill="#ffffff" opacity={0.28} />
        <Rect x={152} y={4} width={13} height={16} rx={5} fill="#39434e" />
        <Ellipse cx={158} cy={5} rx={8} ry={3.4} fill="#4a5661" />
        <Circle cx={160} cy={38} r={5.5} fill={C.sun} />
        <Circle cx={158} cy={36} r={2} fill="#fff6d8" />
        {wheel(116, 50, 9, 'e1')}{wheel(140, 50, 9, 'e2')}{wheel(158, 51, 6.5, 'e3')}
      </Svg>
      <Bob amp={10} duration={760} style={{ position: 'absolute', left: 150 * scale, top: -10 * scale }}>
        <Svg width={26 * scale} height={26 * scale} viewBox="0 0 26 26"><Circle cx={13} cy={13} r={11} fill="rgba(255,255,255,.8)" /><Circle cx={10} cy={10} r={5} fill="#ffffff" /></Svg>
      </Bob>
    </View>
  );
}

export function Duck({ style }: Pos) {
  const b = nextId('dk');
  return (
    <Bob amp={3} duration={1500} style={style}>
      <Svg width={38} height={30} viewBox="0 0 38 30" pointerEvents="none">
        <Ellipse cx={18} cy={25} rx={15} ry={4} fill="rgba(20,60,90,.18)" />
        <Orb cx={16} cy={16} r={11} color="#ffffff" id={b} />
        <Circle cx={27} cy={9} r={7} fill="#fdfdfd" />
        <Path d="M32 9 q6 1 5 3.5 q-3 1.5 -6 -1z" fill={C.sun} />
        <Circle cx={28.5} cy={7.5} r={1.5} fill="#22303b" />
        <Circle cx={29} cy={7} r={0.5} fill="#ffffff" />
      </Svg>
    </Bob>
  );
}

export function Lamp({ lit, style }: Pos & { lit: boolean }) {
  const g = nextId('lm');
  return (
    <View pointerEvents="none" style={[{ width: 30, height: 60, alignItems: 'center' }, style]}>
      {lit && <Shimmer style={{ position: 'absolute', top: -12, width: 54, height: 54, borderRadius: 27, backgroundColor: C.sun }} min={0.1} max={0.32} />}
      <Svg width={30} height={60} viewBox="0 0 30 60">
        <Defs>
          <LinearGradient id={g} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#5d6a75" /><Stop offset="0.4" stopColor="#3c4750" /><Stop offset="1" stopColor="#2b333a" />
          </LinearGradient>
        </Defs>
        <Ellipse cx={15} cy={57} rx={9} ry={3} fill="rgba(34,48,59,.18)" />
        <Rect x={12} y={18} width={6} height={40} rx={3} fill={`url(#${g})`} />
        <Path d="M7 16 q8 -14 16 0 q-2 8 -8 8 q-6 0 -8 -8z" fill={lit ? alpha(C.sun, 0.95) : '#b9c2c8'} />
        <Path d="M9 12 q5 -8 10 -3 q-6 0 -8 6z" fill="#ffffff" opacity={lit ? 0.5 : 0.35} />
        <Rect x={9} y={22} width={12} height={4} rx={2} fill="#3c4750" />
      </Svg>
    </View>
  );
}

export function Rocket({ scale = 1, flame = false, style }: Pos & { scale?: number; flame?: boolean }) {
  const w = 120 * scale, h = 200 * scale;
  const body = nextId('rb'), nose = nextId('rn'), glass = nextId('rg');
  const f = useLoop(150, { enabled: flame });
  const fa = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 + f.value * 0.5 }], opacity: 0.88 + f.value * 0.12 }));
  return (
    <View pointerEvents="none" style={[{ width: w, height: h, alignItems: 'center' }, style]}>
      <Svg width={w} height={h} viewBox="0 0 120 200">
        <Defs>
          <LinearGradient id={body} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#c9bda8" /><Stop offset="0.28" stopColor="#ffffff" />
            <Stop offset="0.62" stopColor={C.cream} /><Stop offset="1" stopColor="#bcae97" />
          </LinearGradient>
          <LinearGradient id={nose} x1="0" y1="0" x2="1" y2="0.4">
            <Stop offset="0" stopColor={tint(C.coral, 0.34)} /><Stop offset="0.5" stopColor={C.coral} /><Stop offset="1" stopColor={shade(C.coral, 0.3)} />
          </LinearGradient>
          <RadialGradient id={glass} cx="0.34" cy="0.3" r="0.8">
            <Stop offset="0" stopColor="#dff3fb" /><Stop offset="0.6" stopColor="#7fc4e2" /><Stop offset="1" stopColor="#3f8fb5" />
          </RadialGradient>
        </Defs>
        <Path d="M34 108 q-20 18 -18 48 q12 -7 22 -11z" fill={shade(C.coral, 0.3)} />
        <Path d="M86 108 q20 18 18 48 q-12 -7 -22 -11z" fill={C.coral} />
        <Path d="M60 8 q30 34 30 80 v56 q0 12 -30 12 q-30 0 -30 -12 v-56 q0 -46 30 -80z" fill={`url(#${body})`} />
        <Path d="M60 8 q18 20 25 48 q-25 -10 -50 0 q7 -28 25 -48z" fill={`url(#${nose})`} />
        <Ellipse cx={46} cy={40} rx={5} ry={12} fill="#ffffff" opacity={0.4} transform="rotate(14 46 40)" />
        <Circle cx={60} cy={92} r={22} fill="#e7dfcd" />
        <Circle cx={60} cy={92} r={18} fill={`url(#${glass})`} />
        <Ellipse cx={53} cy={84} rx={7} ry={4.5} fill="#ffffff" opacity={0.65} transform="rotate(-30 53 84)" />
        <Rect x={44} y={126} width={32} height={12} rx={6} fill={C.violet} />
        <Circle cx={52} cy={132} r={2.6} fill={C.sun} /><Circle cx={68} cy={132} r={2.6} fill={C.teal} />
        <Ellipse cx={60} cy={176} rx={30} ry={7} fill={shade(C.cream, 0.22)} />
      </Svg>
      {flame && (
        <Animated.View style={[{ marginTop: -10 * scale, transformOrigin: 'top center' }, fa]}>
          <Svg width={44 * scale} height={62 * scale} viewBox="0 0 44 62">
            <Path d="M22 62 q-18 -20 -16 -38 q5 7 9 7 q-3 -16 7 -25 q10 9 7 25 q4 0 9 -7 q2 18 -16 38z" fill={C.sun} opacity={0.9} />
            <Path d="M22 52 q-9 -13 -8 -24 q3 5 5 4 q-1 -9 3 -14 q4 5 3 14 q2 1 5 -4 q1 11 -8 24z" fill="#ffb03a" />
            <Path d="M22 42 q-4 -7 -3 -13 q3 4 3 4 q0 -5 0 -7 q2 4 2 8 q1 0 2 -3 q1 6 -4 11z" fill="#fff3c4" />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

export function Sign({ text, style, bg = C.cream, fg = C.tealDeep }: Pos & { text: string; bg?: string; fg?: string }) {
  return (
    <View pointerEvents="none" style={[{ alignItems: 'center' }, style]}>
      <View style={{ backgroundColor: bg, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 6, borderBottomWidth: 4, borderBottomColor: shade(bg, 0.3) }}>
        <Text style={{ fontFamily: F.display, fontSize: 11, color: fg }}>{text}</Text>
      </View>
      <Svg width={16} height={20} viewBox="0 0 16 20">
        <Rect x={5} y={0} width={6} height={20} rx={3} fill="#8a6239" />
        <Rect x={5} y={0} width={2.4} height={20} rx={1.2} fill="#ffffff" opacity={0.25} />
        <Ellipse cx={8} cy={19} rx={7} ry={2} fill="rgba(34,48,59,.16)" />
      </Svg>
    </View>
  );
}

/** Scattered grass tufts and flowers. */
export function GroundDetail({ width, seed = 0, flowers = true, style }: Pos & { width: number; seed?: number; flowers?: boolean }) {
  const n = Math.max(4, Math.round(width / 64));
  return (
    <View pointerEvents="none" style={[{ width, height: 18 }, style]}>
      <Svg width={width} height={18}>
        {Array.from({ length: n }, (_, i) => {
          const x = ((i * 97 + seed * 31) % (width - 20)) + 10;
          const tall = (i + seed) % 3 === 0;
          return (
            <G key={i} opacity={0.85}>
              <Path d={`M${x} 17 q-3 -7 -5 -10 M${x} 17 q0 -8 1 -12 M${x} 17 q4 -7 6 -10`} stroke="#6cb47c" strokeWidth={2.6} fill="none" strokeLinecap="round" />
              {flowers && tall && <Circle cx={x + 7} cy={8} r={3} fill={[C.coral, C.sun, C.violet][(i + seed) % 3]} />}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

// ─── Location illustrations ───────────────────────────────────────────────────
export function MarketStall({ width = 210, open = true, style }: Pos & { width?: number; open?: boolean }) {
  const h = width * 0.66;
  const cloth = open ? C.coral : '#b9aea0';
  const wood = open ? '#c08a4f' : '#b3a795';
  const aw = nextId('ma'), ct = nextId('mc'), top = nextId('mt');
  return (
    <View pointerEvents="none" style={[{ width, height: h }, style]}>
      <Svg width={width} height={h} viewBox="0 0 210 138">
        <Defs>
          <LinearGradient id={aw} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tint(cloth, 0.3)} /><Stop offset="1" stopColor={shade(cloth, 0.22)} />
          </LinearGradient>
          <LinearGradient id={ct} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tint(wood, 0.22)} /><Stop offset="1" stopColor={shade(wood, 0.3)} />
          </LinearGradient>
          <LinearGradient id={top} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={tint(wood, 0.34)} /><Stop offset="1" stopColor={tint(wood, 0.1)} />
          </LinearGradient>
        </Defs>
        <Grounded cx={105} cy={130} rx={86} />
        {/* posts */}
        <Rect x={16} y={36} width={9} height={90} rx={4.5} fill={`url(#${ct})`} />
        <Rect x={185} y={36} width={9} height={90} rx={4.5} fill={`url(#${ct})`} />
        {/* awning: curved ribbon with scalloped edge */}
        <Path d="M8 30 q97 -14 194 0 v14 q-97 20 -194 0z" fill={`url(#${aw})`} />
        {[0, 1, 2, 3, 4, 5, 6].map(i => i % 2 === 0 && (
          <Path key={i} d={`M${10 + i * 27.5} 33 q13 -2 27 0 v${13 + Math.sin((i / 7) * Math.PI) * 7} q-13 5 -27 0z`} fill={open ? '#fdf6e8' : '#ded6c8'} opacity={0.96} />
        ))}
        <Path d="M8 30 q97 -14 194 0 v5 q-97 -13 -194 0z" fill="#ffffff" opacity={0.28} />
        {/* counter: top face + front face */}
        <Path d="M22 88 q83 -9 166 0 l6 8 q-89 -7 -178 0z" fill={`url(#${top})`} />
        <Rect x={16} y={96} width={178} height={30} rx={8} fill={`url(#${ct})`} />
        <Rect x={16} y={120} width={178} height={7} rx={3.5} fill={alpha('#22303b', 0.16)} />
        {open && (
          <G>
            {/* crates */}
            {[38, 96, 150].map((x, i) => (
              <G key={x}>
                <Rect x={x} y={62} width={44} height={26} rx={7} fill={shade(wood, 0.12)} />
                <Rect x={x + 2} y={60} width={40} height={10} rx={5} fill={tint(wood, 0.3)} />
              </G>
            ))}
            <Circle cx={50} cy={58} r={8} fill="#e8514a" /><Circle cx={47} cy={55} r={2.6} fill="#ffffff" opacity={0.5} />
            <Circle cx={66} cy={56} r={8} fill={C.coral} /><Circle cx={63} cy={53} r={2.6} fill="#ffffff" opacity={0.5} />
            <Circle cx={108} cy={57} r={8} fill="#7cc35f" /><Circle cx={105} cy={54} r={2.4} fill="#ffffff" opacity={0.45} />
            <Circle cx={124} cy={56} r={8} fill="#5fae4a" />
            <Circle cx={162} cy={57} r={8} fill={C.violet} /><Circle cx={159} cy={54} r={2.4} fill="#ffffff" opacity={0.45} />
            <Circle cx={178} cy={58} r={7} fill="#9a7be0" />
            <Rect x={60} y={100} width={26} height={20} rx={6} fill={C.sun} />
            <Rect x={62} y={100} width={22} height={6} rx={3} fill="#ffffff" opacity={0.3} />
            <Rect x={124} y={100} width={34} height={20} rx={6} fill={C.teal} />
            <Rect x={126} y={100} width={30} height={6} rx={3} fill="#ffffff" opacity={0.25} />
          </G>
        )}
      </Svg>
    </View>
  );
}

export function CafeHouse({ width = 150, lit = true, style }: Pos & { width?: number; lit?: boolean }) {
  const h = width * 1.1;
  const body = lit ? C.cream : '#e3dbcd';
  const roof = lit ? C.violet : '#b3abbd';
  const bg = nextId('cb'), rg = nextId('cr'), wg = nextId('cw');
  return (
    <View pointerEvents="none" style={[{ width, height: h }, style]}>
      {lit && [0, 1].map(i => (
        <Drift key={i} from={width * 0.44} to={width * 0.52} rise={34} duration={2400} delay={i * 1100} style={{ position: 'absolute', top: 0, left: 0 }}>
          <Svg width={18} height={18}><Circle cx={9} cy={9} r={8} fill="rgba(255,255,255,.7)" /></Svg>
        </Drift>
      ))}
      <Svg width={width} height={h} viewBox="0 0 150 165">
        <Defs>
          <LinearGradient id={bg} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={tint(body, 0.24)} /><Stop offset="0.6" stopColor={body} /><Stop offset="1" stopColor={shade(body, 0.2)} />
          </LinearGradient>
          <LinearGradient id={rg} x1="0.1" y1="0" x2="0.9" y2="1">
            <Stop offset="0" stopColor={tint(roof, 0.3)} /><Stop offset="0.55" stopColor={roof} /><Stop offset="1" stopColor={shade(roof, 0.3)} />
          </LinearGradient>
          <RadialGradient id={wg} cx="0.5" cy="0.4" r="0.75">
            <Stop offset="0" stopColor={lit ? '#fff6d8' : '#eaf3f8'} /><Stop offset="1" stopColor={lit ? '#f4b83f' : '#b9d2e0'} />
          </RadialGradient>
        </Defs>
        <Grounded cx={75} cy={155} rx={62} />
        <Rect x={18} y={62} width={114} height={92} rx={16} fill={`url(#${bg})`} />
        <Rect x={18} y={62} width={114} height={14} rx={7} fill={alpha('#22303b', 0.12)} />
        <Path d="M75 10 q12 0 19 9 L140 56 q7 9 -5 11 L75 76 Z" fill={shade(roof, 0.26)} />
        <Path d="M75 10 q-12 0 -19 9 L10 56 q-7 9 5 11 L75 76 Z" fill={`url(#${rg})`} />
        <Ellipse cx={48} cy={38} rx={15} ry={5} fill="#ffffff" opacity={0.22} transform="rotate(-38 48 38)" />
        {/* awning */}
        <Path d="M20 88 q55 -10 110 0 v10 q-55 16 -110 0z" fill={lit ? C.coral : '#c2b7a8'} />
        {[0, 2, 4, 6].map(i => <Path key={i} d={`M${22 + i * 14} 90 q7 -2 14 0 v12 q-7 4 -14 0z`} fill={lit ? '#fdf6e8' : '#ded6c8'} />)}
        <Path d="M20 88 q55 -10 110 0 v4 q-55 -9 -110 0z" fill="#ffffff" opacity={0.25} />
        {/* window */}
        <Rect x={32} y={106} width={48} height={38} rx={12} fill={alpha('#22303b', 0.12)} />
        <Rect x={34} y={107} width={44} height={35} rx={11} fill={`url(#${wg})`} />
        <Path d="M40 118 q8 -7 18 -6 q-13 3 -16 11z" fill="#ffffff" opacity={0.45} />
        {/* door */}
        <Path d="M94 154 v-32 a13 13 0 0 1 26 0 v32z" fill={shade(C.woodDeep, 0.06)} />
        <Path d="M94 122 a13 13 0 0 1 26 0 q-13 -5 -26 0z" fill="#ffffff" opacity={0.12} />
        <Circle cx={113} cy={140} r={2.8} fill={C.sun} />
        {/* cake sign */}
        <Circle cx={75} cy={44} r={15} fill={lit ? '#fff3d0' : '#d8d2c6'} />
        <Path d="M75 44 L75 30 A15 15 0 0 1 88 51z" fill={lit ? C.coral : '#bdb3a4'} />
        <Circle cx={71} cy={39} r={2.4} fill="#ffffff" opacity={0.7} />
      </Svg>
    </View>
  );
}

export function GardenPatch({ width = 190, grown = true, rows = 3, perRow = 4, style }: Pos & { width?: number; grown?: boolean; rows?: number; perRow?: number }) {
  const rowH = 30, h = rows * rowH + 16;
  const soil = nextId('gs'), mound = nextId('gm');
  return (
    <View pointerEvents="none" style={[{ width, height: h }, style]}>
      <Svg width={width} height={h}>
        <Defs>
          <LinearGradient id={soil} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#b98f57" /><Stop offset="1" stopColor="#8a6535" />
          </LinearGradient>
          <LinearGradient id={mound} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#a67c45" /><Stop offset="1" stopColor="#7d5a2f" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={4} width={width} height={h - 8} rx={18} fill={`url(#${soil})`} />
        <Rect x={0} y={4} width={width} height={10} rx={5} fill="#ffffff" opacity={0.12} />
        {Array.from({ length: rows }, (_, r) => (
          <G key={r}>
            <Rect x={10} y={14 + r * rowH} width={width - 20} height={rowH - 12} rx={9} fill={`url(#${mound})`} />
            <Rect x={10} y={14 + r * rowH} width={width - 20} height={5} rx={2.5} fill="#ffffff" opacity={0.1} />
            {grown && Array.from({ length: perRow }, (_, c) => {
              const cx = 26 + c * ((width - 52) / Math.max(1, perRow - 1));
              const cy = 14 + r * rowH + (rowH - 12) / 2;
              return (
                <G key={c}>
                  <Path d={`M${cx - 5} ${cy - 2} q5 12 5 12 q0 0 5 -12 q-5 -3 -10 0z`} fill="#ef8b3c" />
                  <Path d={`M${cx - 4} ${cy - 2} q3 8 4 9 q-4 -2 -6 -9z`} fill="#ffa95c" opacity={0.7} />
                  <Path d={`M${cx} ${cy - 4} q-5 -9 -9 -10 q7 -1 9 6 q2 -7 9 -6 q-4 1 -9 10z`} fill="#58a35c" />
                </G>
              );
            })}
          </G>
        ))}
      </Svg>
    </View>
  );
}

export function PicnicSpot({ width = 120, open = true, style }: Pos & { width?: number; open?: boolean }) {
  const h = width * 0.64;
  const bl = nextId('pb'), bs = nextId('pk');
  const cloth = open ? C.coral : '#cfc7b7';
  return (
    <View pointerEvents="none" style={[{ width, height: h }, style]}>
      <Svg width={width} height={h} viewBox="0 0 120 77">
        <Defs>
          <LinearGradient id={bl} x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor={tint(cloth, 0.3)} /><Stop offset="1" stopColor={shade(cloth, 0.2)} />
          </LinearGradient>
          <LinearGradient id={bs} x1="0" y1="0" x2="1" y2="0.6">
            <Stop offset="0" stopColor="#d0a163" /><Stop offset="1" stopColor="#9d7139" />
          </LinearGradient>
        </Defs>
        <Grounded cx={60} cy={68} rx={48} strength={0.8} />
        <Path d="M12 42 q48 -16 96 0 q-6 24 -48 24 q-42 0 -48 -24z" fill={`url(#${bl})`} />
        {[0, 1, 2, 3, 4].map(i => (
          <Path key={i} d={`M${22 + i * 18} 41 q3 13 -2 21`} stroke="#ffffff" strokeWidth={5} opacity={open ? 0.4 : 0.26} fill="none" />
        ))}
        <Path d="M12 42 q48 -16 96 0 q-48 -8 -96 0z" fill="#ffffff" opacity={0.3} />
        {open && (
          <G>
            <Rect x={44} y={24} width={32} height={18} rx={6} fill={`url(#${bs})`} />
            <Rect x={44} y={24} width={32} height={5} rx={2.5} fill="#ffffff" opacity={0.25} />
            <Path d="M50 24 q10 -14 20 0" stroke="#8a6239" strokeWidth={3} fill="none" />
            <Circle cx={38} cy={46} r={6} fill="#e8514a" /><Circle cx={36} cy={44} r={2} fill="#ffffff" opacity={0.5} />
            <Circle cx={82} cy={47} r={6} fill="#e8514a" /><Circle cx={80} cy={45} r={2} fill="#ffffff" opacity={0.5} />
          </G>
        )}
      </Svg>
    </View>
  );
}

export function SpaceStationArt({ size = 130, powered = true, style }: Pos & { size?: number; powered?: boolean }) {
  const panel = nextId('sp'), hub = nextId('sh');
  return (
    <Spin duration={38000} style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 130 130" pointerEvents="none">
        <Defs>
          <LinearGradient id={panel} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={powered ? '#7fc4e2' : '#7e8794'} /><Stop offset="1" stopColor={powered ? '#3d86b5' : '#5b6673'} />
          </LinearGradient>
          <RadialGradient id={hub} cx="0.35" cy="0.3" r="0.8">
            <Stop offset="0" stopColor="#ffffff" /><Stop offset="0.6" stopColor="#dfe7ec" /><Stop offset="1" stopColor="#a9b5be" />
          </RadialGradient>
        </Defs>
        <Rect x={6} y={58} width={118} height={10} rx={5} fill="#9aa6b1" />
        <Rect x={6} y={58} width={118} height={3.4} rx={1.7} fill="#ffffff" opacity={0.4} />
        <Rect x={2} y={42} width={28} height={42} rx={8} fill={`url(#${panel})`} />
        <Rect x={100} y={42} width={28} height={42} rx={8} fill={`url(#${panel})`} />
        {[52, 63, 74].map(y => <Rect key={y} x={2} y={y} width={28} height={2} fill={alpha('#22303b', 0.3)} />)}
        {[52, 63, 74].map(y => <Rect key={`r${y}`} x={100} y={y} width={28} height={2} fill={alpha('#22303b', 0.3)} />)}
        <Circle cx={65} cy={63} r={25} fill={`url(#${hub})`} />
        <Circle cx={65} cy={63} r={12} fill={powered ? alpha(C.sun, 0.95) : '#aab4bd'} />
        <Circle cx={61} cy={59} r={4} fill="#ffffff" opacity={0.75} />
        <Rect x={57} y={24} width={16} height={20} rx={6} fill="#cfd8de" />
      </Svg>
    </Spin>
  );
}
