import React, { useMemo } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Buddy, Numi } from '../../components/characters';
import { Stars } from '../../components/effects';
import { Bob, Drift, Enter, Pop, Stamp, Sway, Wobble } from '../../components/motion';
import { Cloud, GardenPatch, House, MarketStall, Mountain, PicnicSpot, River, Rocket, Sun, Tree } from '../../components/scenery';
import { ChunkyButton, Eyebrow, Screen, SpeechBubble, TopBar } from '../../components/ui';
import { CHARACTERS, MissionId, MISSIONS, SKILLS } from '../../data/world';
import { RootScreen } from '../../navigation/types';
import { StoryLine, useNarration } from '../../services/narrator';
import { KaraokeText, ReadAloudButton, SpeakerTag } from '../../components/Storyteller';
import { useGame } from '../../store/game';
import { C, F, T } from '../../theme/tokens';

function Scene({ mission, beat, w }: { mission: MissionId; beat: number; w: number }) {
  const H = 250;
  const M = MISSIONS[mission];
  const night = mission === 'boss' || mission === 'mystery';
  return (
    <View style={{ height: H, borderRadius: 30, overflow: 'hidden', backgroundColor: night ? (mission === 'boss' ? C.night : C.dusk) : C.sky }}>
      {night ? <Stars count={18} /> : (
        <>
          <Drift from={-100} to={w} duration={22000} phase={0.3} style={{ position: 'absolute', top: 20 }}><Cloud scale={0.6} /></Drift>
          <Sun size={32} style={{ position: 'absolute', right: 0, top: 0 }} />
        </>
      )}
      {mission === 'bridge' && (
        <>
          <Mountain w={180} h={110} color={C.hill} style={{ position: 'absolute', bottom: 70, left: -20 }} snow={false} />
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: C.grass }} />
          <River width={w} height={62} style={{ position: 'absolute', bottom: 0, left: w * 0.28, width: w * 0.44 }} />
          <View style={{ position: 'absolute', bottom: 58, left: w * 0.2, width: 50, height: 12, backgroundColor: C.wood, borderRadius: 3, transform: [{ rotate: '10deg' }] }} />
          <View style={{ position: 'absolute', bottom: 58, right: w * 0.2, width: 44, height: 12, backgroundColor: C.wood, borderRadius: 3, transform: [{ rotate: '-8deg' }] }} />
          <Drift from={0} to={60} duration={4000} style={{ position: 'absolute', bottom: 24, left: w * 0.36 }}>
            <Sway deg={16} duration={900}><View style={{ width: 30, height: 9, backgroundColor: C.wood, borderRadius: 3 }} /></Sway>
          </Drift>
          <House w={50} roof={C.coral} style={{ position: 'absolute', bottom: 70, right: 16 }} />
          <Wobble trigger={beat === 1 ? 1 : 0} style={{ position: 'absolute', bottom: 60, left: w * 0.08 }}>
            <Buddy id="nia" size={78} mood={beat >= 2 ? 'happy' : 'worried'} cheering={beat >= 2} />
          </Wobble>
        </>
      )}
      {mission === 'market' && (
        <>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, backgroundColor: '#e8dcc0' }} />
          <MarketStall width={186} open style={{ position: 'absolute', bottom: 46, right: 6 }} />
          <Bob amp={4} duration={1200} style={{ position: 'absolute', bottom: 40, right: 60 }}><Buddy id="pip" size={70} /></Bob>
          <Wobble trigger={beat} style={{ position: 'absolute', bottom: 40, left: 20 }}><Numi size={90} mood={beat === 0 ? 'worried' : 'happy'} /></Wobble>
          {beat === 0 && <Text style={{ position: 'absolute', left: 90, bottom: 130, fontFamily: F.display, fontSize: 18, color: C.coral }}>grrrumble…</Text>}
        </>
      )}
      {mission === 'cafe' && (
        <>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 70, backgroundColor: '#e0c9a6' }} />
          <View style={{ position: 'absolute', bottom: 50, left: w * 0.3, width: 110, height: 20, borderRadius: 10, backgroundColor: C.woodDeep }} />
          <Bob amp={3} duration={1000} style={{ position: 'absolute', bottom: 70, left: w * 0.33 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#f2b653', borderWidth: 6, borderColor: '#d98a3a' }}>
              {[[18, 20], [42, 30], [26, 46], [50, 50]].map(([x, y], i) => <View key={i} style={{ position: 'absolute', left: x, top: y, width: 12, height: 12, borderRadius: 6, backgroundColor: C.coral }} />)}
            </View>
          </Bob>
          <Buddy id="milo" size={80} style={{ position: 'absolute', bottom: 40, left: 6 }} cheering={beat >= 2} />
          <Buddy id="zuri" size={66} mood={beat === 0 ? 'wow' : 'happy'} style={{ position: 'absolute', bottom: 40, right: 16 }} />
          {beat >= 1 && <Pop style={{ position: 'absolute', right: 70, top: 40 }}><SpeechBubble tail="none" style={{ paddingVertical: 6 }}><Text style={{ fontFamily: F.display, fontSize: 18, color: C.ink }}>Half, please!</Text></SpeechBubble></Pop>}
        </>
      )}
      {mission === 'farm' && (
        <>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 90, backgroundColor: '#c9a96a' }} />
          <GardenPatch width={w * 0.5} grown={beat >= 2} rows={2} perRow={4} style={{ position: 'absolute', bottom: 8, right: 10 }} />
          {Array.from({ length: 12 }, (_, i) => (
            <Drift key={i} from={0} to={(i % 3) * 4} duration={900 + i * 60} style={{ position: 'absolute', left: 20 + ((i * 47) % (w - 80)), bottom: 10 + ((i * 29) % 60) }}>
              <Text style={{ fontSize: 20, transform: [{ rotate: `${i * 37}deg` }] }}>🥕</Text>
            </Drift>
          ))}
          <Tree size={40} style={{ position: 'absolute', bottom: 80, right: 20 }} />
          <Buddy id="zuri" size={84} mood={beat === 0 ? 'worried' : 'happy'} style={{ position: 'absolute', bottom: 60, left: 10 }} />
        </>
      )}
      {mission === 'picnic' && (
        <>
          <Mountain w={260} h={170} color={C.hillDeep} style={{ position: 'absolute', bottom: 40, right: -40 }} />
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 70, backgroundColor: C.grass }} />
          <PicnicSpot width={168} open style={{ position: 'absolute', bottom: 8, left: w * 0.27 }} />
          <View style={{ position: 'absolute', bottom: 54, left: w * 0.3, flexDirection: 'row', flexWrap: 'wrap', width: 96, gap: 1 }}>
            {Array.from({ length: 12 }, (_, i) => <Pop key={i} delay={i * 50}><Text style={{ fontSize: 12 }}>🍓</Text></Pop>)}
          </View>
          {(['nia', 'milo', 'pip', 'nova'] as const).map((id, i) => (
            <Bob key={id} amp={3} duration={1200 + i * 150} style={{ position: 'absolute', bottom: 40 + (i % 2) * 20, left: i < 2 ? 4 + i * 44 : undefined, right: i >= 2 ? 4 + (i - 2) * 44 : undefined }}>
              <Buddy id={id} size={54} mood={beat === 0 ? 'worried' : 'happy'} />
            </Bob>
          ))}
        </>
      )}
      {mission === 'mystery' && (
        <>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: '#5a4a66' }} />
          <View style={{ position: 'absolute', bottom: 70, left: w * 0.36, width: 70, height: 84, borderRadius: 16, backgroundColor: 'rgba(191,227,239,.3)', borderWidth: 4, borderColor: 'rgba(253,245,232,.6)', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 6 }}>
            <Text style={{ fontSize: 14 }}>🍪🍪</Text>
          </View>
          {beat >= 1 && [0, 1, 2].map(i => <Pop key={i} delay={i * 150} style={{ position: 'absolute', bottom: 30 + i * 6, left: w * 0.18 + i * 40 }}><Text style={{ fontSize: 16 }}>👣</Text></Pop>)}
          <Buddy id="milo" size={80} mood="wow" style={{ position: 'absolute', bottom: 50, right: 10 }} />
          <Bob amp={6} duration={900} style={{ position: 'absolute', top: 30, left: 30 }}><Text style={{ fontSize: 40 }}>🔍</Text></Bob>
        </>
      )}
      {mission === 'boss' && (
        <>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, backgroundColor: '#2d3656' }} />
          <Bob amp={beat >= 2 ? 6 : 1} duration={500} style={{ position: 'absolute', bottom: 40, left: w * 0.36 }}><Rocket scale={0.9} flame={beat >= 2} /></Bob>
          <Buddy id="nova" size={80} style={{ position: 'absolute', bottom: 40, left: 6 }} mood={beat === 0 ? 'worried' : 'happy'} />
          {beat === 0 && <Wobble trigger={1} style={{ position: 'absolute', right: 20, bottom: 50 }}><Text style={{ fontSize: 30 }}>📦⛽🍱</Text></Wobble>}
        </>
      )}
      <View style={{ position: 'absolute', bottom: 10, right: 12, backgroundColor: CHARACTERS[M.character].body, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 }}>
        <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11, color: C.cream }}>{CHARACTERS[M.character].name.toUpperCase()} {CHARACTERS[M.character].role.toUpperCase()}</Text>
      </View>
    </View>
  );
}

// Each mission opens like a picture book: storyteller → the character in trouble → Numi.
const SCRIPTS: Record<MissionId, StoryLine[]> = {
  bridge: [
    { text: 'Oh no! The river rose in the night and washed the bridge away.', speaker: 'narrator' },
    { text: "I'm stuck on the wrong side! My house is just over there…", speaker: 'nia' },
    { text: "Don't worry, Nia. My explorer friend is here. Let's repair the bridge together!", speaker: 'numi' },
  ],
  market: [
    { text: "Rumble, rumble… Numi skipped breakfast, and Pip's stall has just opened.", speaker: 'narrator' },
    { text: "Good morning! Everything's fresh today. Just don't spend more coins than you have!", speaker: 'pip' },
    { text: 'Can you help me choose a yummy breakfast without going over?', speaker: 'numi' },
  ],
  cafe: [
    { text: 'Ding ding! The Fraction Café is full of hungry customers.', speaker: 'narrator' },
    { text: 'Can I have half a pizza, please? Exactly half!', speaker: 'zuri' },
    { text: 'My hands are full! Explorer, can you slice it fairly for me?', speaker: 'milo' },
  ],
  farm: [
    { text: "Hmm… Zuri's garden is a mess. There are carrots everywhere!", speaker: 'narrator' },
    { text: 'I need my carrots planted in neat rows — and every row must be the same.', speaker: 'zuri' },
    { text: "Let's get planting, explorer!", speaker: 'numi' },
  ],
  picnic: [
    { text: 'High on Measurement Mountain, four friends spread out a picnic blanket.', speaker: 'narrator' },
    { text: 'A whole bowl of strawberries! But how do we make sure nobody is left out?', speaker: 'nia' },
    { text: "Let's share them so everyone gets exactly the same.", speaker: 'numi' },
  ],
  mystery: [
    { text: "Gasp! Cookies have vanished from Milo's kitchen.", speaker: 'narrator' },
    { text: 'I baked a whole batch this morning, and now some are gone! Who could it be?', speaker: 'milo' },
    { text: "Put on your detective hat. Let's search for clues!", speaker: 'numi' },
  ],
  boss: [
    { text: "Countdown time! Nova's rocket is almost ready to fly to the stars.", speaker: 'narrator' },
    { text: 'But the fuel, the food and the cargo are all in a muddle. Nobody goes hungry on my ship!', speaker: 'nova' },
    { text: "Let's use everything we've learned. Help me launch the rocket!", speaker: 'numi' },
  ],
};

export default function MissionStory({ navigation, route }: RootScreen<'Mission'>) {
  const { mission } = route.params;
  const M = MISSIONS[mission];
  const { width } = useWindowDimensions();
  const struggle = useGame(s => s.struggles.find(x => !x.resolved && x.skill === M.skill));
  const name = useGame(s => s.explorer.name) || 'Explorer';
  const dark = mission === 'boss' || mission === 'mystery' || mission === 'bridge';

  const script = useMemo<StoryLine[]>(() => [
    ...SCRIPTS[mission],
    ...(struggle ? [{ text: `Remember ${struggle.context}, ${name}? We found that equal groups make sharing easier. Same idea — new place!`, speaker: 'numi' as const }] : []),
  ], [mission]);
  const n = useNarration(script, { delay: 450 });
  const started = n.line >= 0;
  const done = started && !n.playing;
  // The picture changes with the story: problem → character reacts → Numi arrives.
  const beat = done ? 2 : Math.max(0, Math.min(2, n.line));
  const ink = dark ? C.cream : C.ink;

  const start = () => { n.stop(); navigation.replace(M.route as 'Bridge'); };

  return (
    <Screen bg={dark ? C.ink : C.cream} scroll>
      <TopBar dark={dark} title={`MISSION · ${SKILLS[M.skill].name.toUpperCase()}`} right={<ReadAloudButton dark={dark} playing={n.playing} onPlay={n.play} onStop={n.stop} label={started ? 'Again' : 'Read to me'} />} />
      <Pressable onPress={n.playing ? n.skip : n.play} accessibilityLabel={n.playing ? 'Skip the story' : 'Play the story'} style={{ marginTop: 14 }}>
        <Stamp rotate={-4} style={{ alignSelf: 'flex-start', zIndex: 5, marginBottom: -18, marginLeft: 10 }}>
          <View style={{ backgroundColor: C.coral, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, borderBottomWidth: 5, borderBottomColor: C.coralDeep }}>
            <Text style={{ fontFamily: F.display, fontSize: 30, color: C.cream }}>{M.story.oh}</Text>
          </View>
        </Stamp>
        <Scene mission={mission} beat={beat} w={width - 40} />
      </Pressable>

      {/* storybook dialogue */}
      <View style={{ marginTop: 14, gap: 9, minHeight: 150 }}>
        {script.map((ln, i) => {
          if (!(done || (started && n.line >= i))) return null;
          const sp = ln.speaker ?? 'narrator';
          const active = n.playing && n.line === i;
          const narrator = sp === 'narrator';
          return (
            <Enter key={i} dy={10}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                {sp === 'numi' ? <Numi size={40} state={active ? 'speaking' : 'idle'} /> : sp !== 'narrator' ? <Buddy id={sp} size={38} cheering={active} /> : null}
                <View style={{
                  flex: 1, borderRadius: 18, padding: 11,
                  backgroundColor: narrator ? 'transparent' : dark ? 'rgba(253,245,232,.1)' : C.sandLine,
                  borderWidth: 2, borderColor: active ? C.sun : 'transparent',
                }}>
                  <SpeakerTag speaker={sp} />
                  <KaraokeText
                    text={ln.text} state={active ? 'active' : 'past'} charIndex={active ? n.word : -1}
                    style={narrator
                      ? { fontFamily: F.display, fontSize: 18, lineHeight: 25, marginTop: 5 }
                      : { fontFamily: F.bodyBold, fontSize: 14.5, lineHeight: 21, marginTop: 5 }}
                    color={ink} activeColor={dark ? C.sun : C.coral}
                  />
                </View>
              </View>
            </Enter>
          );
        })}
        {!started && <Text style={[T.bodySm, { color: dark ? 'rgba(253,245,232,.6)' : C.muted }]}>📖 The storyteller is opening the book…</Text>}
      </View>

      {done && (
        <Enter>
          <View style={{ marginTop: 8 }}>
            <Eyebrow color={C.sun}>YOUR MISSION</Eyebrow>
            <Text style={[T.h2, { color: ink, marginTop: 2 }]}>{M.story.ask}</Text>
          </View>
        </Enter>
      )}

      <View style={{ flex: 1, minHeight: 16 }} />
      {done ? (
        <Pop>
          <ChunkyButton label={M.cta} icon="🛠️" color={C.sun} shadow={C.sunDeep} textColor={C.ink} onPress={start} style={{ marginTop: 12 }} />
        </Pop>
      ) : (
        <ChunkyButton label={n.playing ? 'Skip the story' : 'Tap to continue'} size="md" style={{ marginTop: 12 }} color={dark ? 'rgba(253,245,232,.14)' : C.sandLine} shadow={dark ? 'rgba(0,0,0,.2)' : C.sand} textColor={ink} onPress={n.skip} />
      )}
    </Screen>
  );
}
