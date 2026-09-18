import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Numi } from '../../components/characters';
import { KaraokeText, ReadAloudButton, SpeakerTag } from '../../components/Storyteller';
import { StoryLine, useNarration } from '../../services/narrator';
import { Bob, Enter, Shimmer, Sway } from '../../components/motion';
import { ChunkyButton, Eyebrow, Screen, Tap } from '../../components/ui';
import { RootScreen } from '../../navigation/types';
import { C, F, T } from '../../theme/tokens';

function PanelArt({ kind }: { kind: 0 | 1 | 2 }) {
  if (kind === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: C.teal }}>
        {[{ n: '7', x: 10, y: 12, bg: C.cream, fg: C.ink }, { n: '3', x: 52, y: 26, bg: C.sun, fg: C.ink }, { n: '12', x: 24, y: 52, bg: C.violet, fg: C.cream }].map((b, i) => (
          <Bob key={i} amp={4} duration={1400} delay={i * 200} style={{ position: 'absolute', left: b.x, top: b.y }}>
            <View style={{ width: 32, height: 30, borderRadius: 6, backgroundColor: b.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.display, fontSize: 15, color: b.fg }}>{b.n}</Text>
            </View>
          </Bob>
        ))}
      </View>
    );
  }
  if (kind === 1) {
    return (
      <View style={{ flex: 1, backgroundColor: C.sky }}>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, backgroundColor: C.water }} />
        <Shimmer style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, backgroundColor: '#fff' }} min={0.1} max={0.4} />
        {[{ n: '4', x: 12, y: 14 }, { n: '9', x: 50, y: 30 }].map((b, i) => (
          <Sway key={i} deg={14} duration={1600 + i * 400} style={{ position: 'absolute', left: b.x, top: b.y }}>
            <View style={{ width: 24, height: 26, borderRadius: 5, backgroundColor: 'rgba(253,245,232,.55)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: 'rgba(34,48,59,.4)' }}>{b.n}</Text>
            </View>
          </Sway>
        ))}
        <View style={{ position: 'absolute', bottom: 44, left: 6, width: 30, height: 8, backgroundColor: C.wood, transform: [{ rotate: '-18deg' }] }} />
        <View style={{ position: 'absolute', bottom: 40, right: 6, width: 26, height: 8, backgroundColor: C.wood, transform: [{ rotate: '24deg' }] }} />
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: '#2d3d4a', alignItems: 'center', justifyContent: 'center' }}>
      <Numi size={62} state="thinking" />
    </View>
  );
}

const PANELS = [
  { n: 'ONCE', text: 'Once upon a time, Numbershire wrote numbers on everything — doors, boats, and every plank of the bridge.' },
  { n: 'THEN', text: 'Then, one stormy spring, the river rose… and washed the numbers away. The bridge fell first.' },
  { n: 'NOW', text: 'Now only Numi remembers a handful of numbers. Enough to rebuild the world — with an explorer\'s help.' },
];

export default function Story({ navigation }: RootScreen<'Story'>) {
  const script: StoryLine[] = useMemo(() => [
    ...PANELS.map(p => ({ text: p.text, speaker: 'narrator' as const, pause: 700 })),
    { text: 'Will you help me put the numbers back, explorer?', speaker: 'numi' },
  ], []);
  const n = useNarration(script, { delay: 700 });
  // Before the story starts: placeholders. While playing: reveal up to the current line. Paused/finished: show all.
  const started = n.line >= 0;
  const shown = (i: number) => started && (!n.playing || n.line >= i);

  return (
    <Screen bg={C.ink}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* The kicker gives way (it can wrap) so the buttons never get pushed off a narrow phone. */}
        <Enter style={{ flexShrink: 1, marginRight: 6 }}><Eyebrow color={C.sun}>THE GREAT UNNUMBERING</Eyebrow></Enter>
        <View style={{ flexDirection: 'row', gap: 6, flexShrink: 0 }}>
          <ReadAloudButton dark playing={n.playing} onPlay={n.play} onStop={n.stop} label={n.line >= 0 ? 'Again' : 'Read to me'} />
          {n.playing && <Tap onPress={n.skip} a11y="Skip story" style={{ paddingHorizontal: 8, paddingVertical: 9 }}><Text style={{ fontFamily: F.bodyHeavy, fontSize: 12, color: 'rgba(253,245,232,.6)' }}>Skip</Text></Tap>}
        </View>
      </View>
      <Enter delay={80}><Text style={[T.h1, { color: C.cream, marginTop: 6 }]}>How Numbershire lost its numbers</Text></Enter>
      <View style={{ gap: 12, marginTop: 20 }}>
        {PANELS.map((p, i) => {
          const isShown = shown(i);
          const active = n.playing && n.line === i;
          if (!isShown) return <View key={p.n} style={{ height: 118, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(253,245,232,.12)' }} />;
          return (
            <Enter key={p.n} dx={36} dy={0}>
              <View style={{ flexDirection: 'row', gap: 13, backgroundColor: active ? 'rgba(245,181,60,.14)' : 'rgba(253,245,232,.08)', borderRadius: 24, padding: 13, borderWidth: 2, borderColor: active ? C.sun : 'transparent' }}>
                <View style={{ width: 92, height: 92, borderRadius: 18, overflow: 'hidden' }}>
                  <PanelArt kind={i as 0 | 1 | 2} />
                </View>
                <View style={{ flex: 1, justifyContent: 'center', gap: 4 }}>
                  <Eyebrow color={C.sun}>{p.n}</Eyebrow>
                  <KaraokeText text={p.text} state={active ? 'active' : 'past'} charIndex={active ? n.word : -1}
                    style={{ fontFamily: F.bodyBold, fontSize: 14, lineHeight: 20 }} color={C.cream} activeColor={C.sun} />
                </View>
              </View>
            </Enter>
          );
        })}
      </View>
      {shown(3) && (
        <Enter>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <Numi size={54} state={n.playing ? 'speaking' : 'idle'} mood="happy" />
            <View style={{ flex: 1, backgroundColor: C.cream, borderRadius: 18, padding: 11 }}>
              <SpeakerTag speaker="numi" />
              <KaraokeText text={script[3].text} state={n.playing && n.line === 3 ? 'active' : 'past'} charIndex={n.line === 3 ? n.word : -1}
                style={{ fontFamily: F.bodyBold, fontSize: 14, lineHeight: 20, marginTop: 4 }} />
            </View>
          </View>
        </Enter>
      )}
      <View style={{ flex: 1, minHeight: 16 }} />
      <Enter delay={1100}>
        <ChunkyButton label="I'll help rebuild it" color={C.sun} shadow={C.sunDeep} textColor={C.ink} onPress={() => { n.stop(); navigation.navigate('CreateExplorer'); }} />
      </Enter>
    </Screen>
  );
}
