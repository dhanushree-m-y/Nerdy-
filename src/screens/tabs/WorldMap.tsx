import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Buddy, Numi } from '../../components/characters';
import { Burst, Stars } from '../../components/effects';
import { Bob, Drift, Enter, Pop, PulseRing, Shimmer, Spin, Sway, Wobble } from '../../components/motion';
import { Bridge, CafeHouse, Cloud, Duck, Flock, GardenPatch, GroundDetail, House, Lamp, MarketStall, Mountain, PicnicSpot, River, Rocket, Sign, SpaceStationArt, Train, Tree, Windmill } from '../../components/scenery';
import { MuteButton, ProgressBar, Tap } from '../../components/ui';
import { BreakReminder, FirstTimeTip, SeasonComplete } from '../../components/guidance';
import { SpeakButton } from '../../components/Storyteller';
import { startAmbience, stopAmbience } from '../../services/sfx';
import { Area, AREAS, AreaId, SKILLS } from '../../data/world';
import { say } from '../../services/feedback';
import { areaStatus, useGame, worldRestoredPct } from '../../store/game';
import { C, F, softShadow, T } from '../../theme/tokens';

const MAP_H = 1960;
/** The railway band — kept clear of every area so the line never cuts through a building. */
const RAIL_Y = 0.358;
const TOP_PAD = 90;
/** Map a 0–1 position in the world to a pixel Y (matches the area nodes). */
const atY = (frac: number) => TOP_PAD + frac * (MAP_H - TOP_PAD);
type Status = 'restored' | 'damaged' | 'locked';

/**
 * A mown clearing under a cluster of buildings. Without it every roof, cart and
 * fence shares one flat green and the whole band reads as a single smear.
 */
function Plot({ left, top, w, h, tone = '#dbf0d0' }: { left: number; top: number; w: number; h: number; tone?: string }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left, top, width: w, height: h, borderRadius: Math.min(w, h) / 2, backgroundColor: tone }}>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h * 0.34, borderBottomLeftRadius: Math.min(w, h) / 2, borderBottomRightRadius: Math.min(w, h) / 2, backgroundColor: 'rgba(110,150,100,.13)' }} />
    </View>
  );
}

// ─── Area environments ────────────────────────────────────────────────────────
function Village({ st, x, y, w }: { st: Status; x: number; y: number; w: number }) {
  const fixed = st === 'restored';
  return (
    <>
      {/* village sits below its node, in two tidy rows */}
      <House w={54} roof={C.coral} lit={fixed} dim={!fixed} style={{ position: 'absolute', left: 10, top: y + 74 }} />
      <House w={44} roof={C.violet} lit={fixed} dim={!fixed} style={{ position: 'absolute', left: w * 0.45, top: y + 86 }} />
      <Windmill scale={0.95} style={{ position: 'absolute', left: w - 96, top: y + 62 }} />
      <House w={40} roof={C.sun} lit={fixed} dim={!fixed} style={{ position: 'absolute', left: w * 0.2, top: y + 186 }} />
      <Lamp lit={fixed} style={{ position: 'absolute', left: w * 0.42, top: y + 196 }} />
      <Tree size={30} style={{ position: 'absolute', left: w - 70, top: y + 194 }} />
      <Sign text="NUMBER VILLAGE" style={{ position: 'absolute', left: 16, top: y + 226 }} />
    </>
  );
}

function BridgeCrossing({ fixed, x, y, w }: { fixed: boolean; x: number; y: number; w: number }) {
  const W = Math.min(260, w * 0.72);
  return (
    <View style={{ position: 'absolute', left: x - W / 2, top: y - 30, width: W, height: 92, transform: [{ rotate: '-6deg' }] }} pointerEvents="none">
      {fixed ? (
        <Pop>
          <Bridge width={W} height={58} />
          <Drift from={6} to={W - 40} duration={7200} style={{ position: 'absolute', top: -2, left: 0 }}>
            <Buddy id="nia" size={30} walking />
          </Drift>
          <Drift from={W - 40} to={6} duration={9000} phase={0.5} style={{ position: 'absolute', top: 0, left: 0 }}>
            <Buddy id="milo" size={27} walking />
          </Drift>
        </Pop>
      ) : (
        <>
          <Bridge width={W} height={58} broken />
          <Bob amp={3} duration={1500} style={{ position: 'absolute', left: -10, top: -12 }}>
            <Buddy id="nia" size={34} mood="worried" />
          </Bob>
        </>
      )}
    </View>
  );
}

function MarketStreet({ st, y, w }: { st: Status; x: number; y: number; w: number }) {
  const open = st === 'restored';
  const W = Math.min(198, w - 34);
  const top = y - 86 - W * 0.66;
  return (
    <>
      <Plot left={w - W - 30} top={top + W * 0.66 - 24} w={W + 24} h={48} />
      <View pointerEvents="none" style={{ position: 'absolute', left: w - W - 14, top, opacity: st === 'locked' ? 0.55 : 1 }}>
        <MarketStall width={W} open={open} />
      </View>
      {open && (
        <Drift from={w - W - 24} to={w - 56} duration={12000} style={{ position: 'absolute', left: 0, top: top + W * 0.66 - 16 }}>
          <Buddy id="pip" size={32} walking />
        </Drift>
      )}
    </>
  );
}

function Cafe({ st, y }: { st: Status; x: number; y: number }) {
  const lit = st === 'restored';
  const W = 132;
  const top = y - 78 - W * 1.1; // a clear gap above the node, never under the label
  return (
    <>
      <Plot left={4} top={top + W * 1.1 - 26} w={W + 74} h={46} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 10, top, opacity: st === 'locked' ? 0.55 : 1 }}>
        <CafeHouse width={W} lit={lit} />
      </View>
    </>
  );
}

function Garden({ st, x, y }: { st: Status; x: number; y: number }) {
  const grown = st === 'restored';
  return (
    <>
      <Plot left={6} top={y - 132} w={214} h={44} tone="#d4ecc8" />
      <View pointerEvents="none" style={{ position: 'absolute', left: 14, top: y - 120, opacity: st === 'locked' ? 0.5 : 1 }}>
        <GardenPatch width={176} grown={grown} />
      </View>
      {grown && <Tree size={26} style={{ position: 'absolute', left: 190, top: y - 44 }} />}
    </>
  );
}

function MountainRidge({ y, w }: { y: number; w: number }) {
  return (
    <>
      <Mountain w={260} h={230} color="#7fae9e" style={{ position: 'absolute', left: -60, top: y - 176 }} />
      <Mountain w={320} h={290} color={C.hillDeep} style={{ position: 'absolute', left: w - 250, top: y - 246 }} />
      <Mountain w={200} h={170} color={C.hill} style={{ position: 'absolute', left: w * 0.3, top: y - 104 }} snow={false} />
    </>
  );
}

function MountainCamp({ st, x, y, w }: { st: Status; x: number; y: number; w: number }) {
  const open = st === 'restored';
  const left = Math.min(x + 66, w - 146);
  return (
    <>
      <Plot left={left - 12} top={y - 30} w={168} h={44} tone="#d3ead0" />
      <PicnicSpot width={132} open={open} style={{ position: 'absolute', left, top: y - 58 }} />
      {open && <Tree size={24} color="#4f9463" style={{ position: 'absolute', left: 18, top: y + 34 }} />}
    </>
  );
}

function SpaceSky({ st, x, y }: { st: Status; x: number; y: number }) {
  return <SpaceStationArt size={120} powered={st === 'restored'} style={{ position: 'absolute', left: x - 40, top: y - 182 }} />;
}

function SpacePad({ st, y }: { st: Status; y: number }) {
  const on = st === 'restored';
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 16, top: y - 26, opacity: st === 'locked' ? 0.65 : 1 }}>
      <Bob amp={on ? 14 : 2} duration={on ? 900 : 2400}>
        <Rocket scale={0.6} flame={on} />
      </Bob>
      <View style={{ width: 72, height: 9, borderRadius: 4, backgroundColor: '#5b6480', marginLeft: 14 }} />
    </View>
  );
}

function AreaNode({ area, st, x, y, big, onPress, celebrate, shake }: { area: Area; st: Status; x: number; y: number; big: boolean; onPress: () => void; celebrate: boolean; shake: number }) {
  const size = big ? 78 : 68;
  const bg = st === 'restored' ? C.teal : st === 'locked' ? C.locked : area.color;
  const sh = st === 'restored' ? C.tealDeep : st === 'locked' ? C.lockedDeep : area.deep;
  const req = area.requires;
  const reqLabel = st !== 'locked' || !req ? null : 'skill' in req ? `${SKILLS[req.skill].power} Lv ${req.level}` : `Restore ${AREAS.find(a => a.id === req.area)?.name}`;
  return (
    <View style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, alignItems: 'center', zIndex: 40, elevation: 6 }}>
      {st === 'damaged' && <PulseRing color={area.color} size={size} duration={1900} />}
      {celebrate && <Burst trigger={1} x={size / 2} y={size / 2} count={18} dist={110} />}
      <Wobble trigger={shake}>
        <Pop delay={120}>
          <Tap onPress={onPress} a11y={`${area.name}, ${st}`} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, borderBottomWidth: 7, borderBottomColor: sh, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: C.cream }}>
            <Text style={{ fontSize: size * 0.38, opacity: st === 'locked' ? 0.45 : 1 }}>{area.icon}</Text>
            {st === 'locked' && <Text style={{ position: 'absolute', fontSize: 22 }}>🔒</Text>}
          </Tap>
        </Pop>
      </Wobble>
      {st === 'restored' && (
        <View style={{ position: 'absolute', top: -6, right: -4, width: 26, height: 26, borderRadius: 13, backgroundColor: C.sun, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.cream }}>
          <Text style={{ fontFamily: F.display, fontSize: 13, color: C.ink }}>✓</Text>
        </View>
      )}
      {st === 'damaged' && (
        <Bob amp={4} duration={700} style={{ position: 'absolute', top: -10, right: -6 }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.coral, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.cream }}>
            <Text style={{ fontFamily: F.display, fontSize: 15, color: C.cream }}>!</Text>
          </View>
        </Bob>
      )}
      <View style={[{ marginTop: 6, backgroundColor: 'rgba(253,245,232,.95)', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4, alignItems: 'center' }, softShadow(0.1, 3)]}>
        <Text numberOfLines={1} style={{ fontFamily: F.bodyHeavy, fontSize: 11.5, color: C.ink }}>{area.name}</Text>
        {reqLabel && <Text numberOfLines={1} style={{ fontFamily: F.bodyHeavy, fontSize: 9.5, color: C.violetDeep }}>🔒 {reqLabel}</Text>}
      </View>
    </View>
  );
}

export default function WorldMap() {
  const nav = useNavigation();
  const { width: W } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const completed = useGame(s => s.completed);
  const skillXp = useGame(s => s.skillXp);
  const coins = useGame(s => s.coins);
  const stars = useGame(s => s.stars);
  const name = useGame(s => s.explorer.name) || 'Explorer';
  const lastRestored = useGame(s => s.lastRestored);
  const startNewSeason = useGame(s => s.startNewSeason);
  const ambienceOn = useGame(s => s.settings.ambience && s.settings.sound);
  const [shake, setShake] = useState<Record<string, number>>({});
  const [celebrate, setCelebrate] = useState<AreaId | null>(null);
  const [numiLine, setNumiLine] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);

  const width = Math.min(W, 440);
  const pts = useMemo(() => AREAS.map(a => ({ x: (a.x / 100) * width, y: atY(a.y / 100) })), [width]);
  const status = AREAS.map(a => areaStatus(a, { completed, skillXp }));
  const pct = worldRestoredPct({ completed });
  const nextIdx = status.findIndex(s => s === 'damaged');
  const next = nextIdx >= 0 ? AREAS[nextIdx] : null;
  const bridgeFixed = status[0] === 'restored';
  const bridgePt = { x: (pts[0].x + pts[1].x) / 2, y: atY(0.805) + 34 };

  // A very quiet meadow pad, only while the map is open.
  useFocusEffect(useCallback(() => {
    if (ambienceOn) startAmbience();
    return () => stopAmbience();
  }, [ambienceOn]));

  useFocusEffect(useCallback(() => {
    if (lastRestored) {
      setCelebrate(lastRestored);
      const i = AREAS.findIndex(a => a.id === lastRestored);
      setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, pts[i].y - 360), animated: true }), 250);
      const t = setTimeout(() => { setCelebrate(null); useGame.setState({ lastRestored: null }); }, 2600);
      return () => clearTimeout(t);
    }
  }, [lastRestored]));

  const segs = pts.slice(1).map((p, i) => {
    const a = pts[i];
    const my = (a.y + p.y) / 2;
    return { d: `M${a.x},${a.y} C${a.x},${my} ${p.x},${my} ${p.x},${p.y}`, lit: status[i + 1] !== 'locked' && status[i] === 'restored' };
  });

  const onArea = (i: number) => {
    const a = AREAS[i];
    const st = status[i];
    if (st === 'locked') {
      setShake(s => ({ ...s, [a.id]: (s[a.id] ?? 0) + 1 }));
      const req = a.requires!;
      const line = 'skill' in req
        ? `${a.name} is locked. Grow your ${SKILLS[req.skill].power} to level ${req.level} to open it!`
        : `First we need to restore ${AREAS.find(x => x.id === req.area)?.name}.`;
      setNumiLine(line);
      say(line);
      return;
    }
    if (a.mission) nav.navigate('Mission', { mission: a.mission });
  };

  const guide = numiLine ?? (next
    ? next.id === 'village' && !bridgeFixed
      ? `The bridge is out, ${name}! Nia is stuck. Start at the river — I'll come with you.`
      : `${AREAS[Math.max(0, nextIdx - 1)].name} is glowing again! ${next.name} needs help next.`
    : 'Numbershire is whole again. Look how it shines!');

  return (
    <View style={{ flex: 1, backgroundColor: C.meadow }}>
      <ScrollView
        ref={scroll}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => { if (!lastRestored) scroll.current?.scrollToEnd({ animated: false }); }}
        contentContainerStyle={{ width, height: MAP_H + 60, alignSelf: 'center' }}
      >
        <LinearGradient
          colors={[C.night, '#3c4a82', '#8fc6e0', C.sky, '#d9eecf', C.meadow, '#c3e3b8']}
          locations={[0, 0.1, 0.2, 0.26, 0.33, 0.6, 1]}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, height: MAP_H + 60 }}
        />
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: MAP_H * 0.2 }}><Stars count={26} /></View>
        {[250, 330, 420].map((t, i) => (
          <Drift key={t} from={-120} to={width + 40} duration={30000 + i * 8000} phase={(i * 0.33) % 1} style={{ position: 'absolute', top: t, left: 0 }}>
            <Cloud scale={0.6 + i * 0.15} opacity={0.85} />
          </Drift>
        ))}
        <Flock width={width} top={520} />

        {/* ground bands */}
        <View style={{ position: 'absolute', left: -20, right: -20, top: atY(0.38), height: 60, backgroundColor: '#c6e4bb', borderTopLeftRadius: 200, borderTopRightRadius: 120 }} />
        <View style={{ position: 'absolute', left: -40, right: -40, top: atY(0.52), height: 80, backgroundColor: '#bfe0b3', borderTopLeftRadius: 90, borderTopRightRadius: 260 }} />

        {[0.315, 0.49, 0.615, 0.755, 0.9, 0.95].map((y, i) => (
          <GroundDetail key={y} width={width} seed={i} style={{ position: 'absolute', left: 0, top: atY(y) }} />
        ))}

        {/* backdrop — everything the trail is painted on top of */}
        <MountainRidge y={pts[4].y} w={width} />
        <SpaceSky st={status[5]} x={pts[5].x} y={pts[5].y} />
        <View style={{ position: 'absolute', left: -60, top: atY(0.8), transform: [{ rotate: '-6deg' }] }}>
          <River width={width + 120} height={70} />
        </View>
        <Duck style={{ position: 'absolute', left: width * 0.14, top: atY(0.8) + 40 }} />
        <Duck style={{ position: 'absolute', left: width * 0.8, top: atY(0.8) + 8 }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: atY(RAIL_Y), height: 6, backgroundColor: C.woodDeep, opacity: 0.45 }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: atY(RAIL_Y) + 4, flexDirection: 'row', gap: 10, overflow: 'hidden' }}>
          {Array.from({ length: 30 }, (_, i) => <View key={i} style={{ width: 4, height: 8, backgroundColor: C.woodDeep, opacity: 0.35 }} />)}
        </View>

        {/* the trail */}
        <Svg width={width} height={MAP_H} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
          {segs.map((s, i) => (
            <React.Fragment key={i}>
              <Path d={s.d} stroke="rgba(120,152,112,.20)" strokeWidth={21} fill="none" strokeLinecap="round" />
              <Path d={s.d} stroke="rgba(253,245,232,.95)" strokeWidth={16} fill="none" strokeLinecap="round" />
              <Path d={s.d} stroke={s.lit ? C.sun : '#b9ad98'} strokeWidth={s.lit ? 7 : 5} strokeDasharray={s.lit ? undefined : '2 12'} fill="none" strokeLinecap="round" />
            </React.Fragment>
          ))}
        </Svg>

        {/* props — these stand on the ground, in front of the trail */}
        <Drift from={-160} to={width + 20} duration={14000} style={{ position: 'absolute', top: atY(RAIL_Y) - 30, left: 0 }}>
          <Train scale={0.8} />
        </Drift>
        <SpacePad st={status[5]} y={pts[5].y} />
        <MountainCamp st={status[4]} x={pts[4].x} y={pts[4].y} w={width} />
        <Garden st={status[3]} x={pts[3].x} y={pts[3].y} />
        <Cafe st={status[2]} x={pts[2].x} y={pts[2].y} />
        <MarketStreet st={status[1]} x={pts[1].x} y={pts[1].y} w={width} />
        <Village st={status[0]} x={pts[0].x} y={pts[0].y} w={width} />
        <BridgeCrossing fixed={bridgeFixed} x={bridgePt.x} y={bridgePt.y} w={width} />

        {AREAS.map((a, i) => (
          <AreaNode key={a.id} area={a} st={status[i]} x={pts[i].x} y={pts[i].y} big={i === nextIdx} onPress={() => onArea(i)} celebrate={celebrate === a.id} shake={shake[a.id] ?? 0} />
        ))}
      </ScrollView>

      {/* HUD */}
      <View style={{ position: 'absolute', top: ins.top + 8, left: 14, right: 14 }} pointerEvents="box-none">
        <Enter>
          <View style={[{ backgroundColor: 'rgba(253,245,232,.96)', borderRadius: 22, padding: 11, paddingHorizontal: 14 }, softShadow(0.14, 5)]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[T.h3, { fontSize: 18 }]}>Numbershire</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ backgroundColor: C.sun, borderRadius: 13, paddingHorizontal: 9, paddingVertical: 4 }}><Text style={{ fontFamily: F.bodyHeavy, fontSize: 12, color: C.ink }}>🪙 {coins}</Text></View>
                <View style={{ backgroundColor: C.sandLine, borderRadius: 13, paddingHorizontal: 9, paddingVertical: 4 }}><Text style={{ fontFamily: F.bodyHeavy, fontSize: 12, color: C.ink }}>⭐ {stars}</Text></View>
                <MuteButton />
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 }}>
              <Text style={[T.eyebrow, { fontSize: 9.5 }]}>WORLD RESTORED</Text>
              <ProgressBar value={pct / 100} height={9} style={{ flex: 1 }} />
              <Text style={{ fontFamily: F.display, fontSize: 14, color: C.tealDeep }}>{pct}%</Text>
            </View>
          </View>
        </Enter>
      </View>

      {!next && <SeasonComplete onNewSeason={() => { startNewSeason(); scroll.current?.scrollToEnd({ animated: true }); }} />}
      <FirstTimeTip id="world-map" text="This is Numbershire. Tap a glowing place to help — every puzzle you solve brings a piece of the world back." />
      <BreakReminder />

      <View style={{ position: 'absolute', left: 14, right: 14, bottom: Math.max(ins.bottom, 10) + 84 }} pointerEvents="box-none">
        <Enter delay={250}>
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(253,245,232,.97)', borderRadius: 24, padding: 10 }, softShadow(0.16, 6)]}>
            <Numi size={50} mood={next ? 'happy' : 'wow'} state={numiLine ? 'speaking' : 'idle'} />
            <Text style={[T.body, { flex: 1, fontSize: 13.5 }]} onPress={() => setNumiLine(null)}>{guide}</Text>
            <SpeakButton text={guide} />
            {next && (
              <Tap onPress={() => onArea(nextIdx)} a11y={`Go to ${next.name}`} style={{ backgroundColor: C.coral, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 4, borderBottomColor: C.coralDeep }}>
                <Text style={{ fontFamily: F.display, fontSize: 15, color: C.cream }}>Go!</Text>
              </Tap>
            )}
          </View>
        </Enter>
      </View>
    </View>
  );
}
