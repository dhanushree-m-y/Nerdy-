import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { ExplorerAvatar, Numi } from '../../components/characters';
import { Enter, Pop } from '../../components/motion';
import { DriftingClouds } from '../../components/scenery';
import { ChunkyButton, Eyebrow, Screen, SpeechBubble } from '../../components/ui';
import { RootScreen } from '../../navigation/types';
import { StoryLine, useNarration } from '../../services/narrator';
import { KaraokeText, ReadAloudButton } from '../../components/Storyteller';
import { useGame } from '../../store/game';
import { C, F, T } from '../../theme/tokens';

export default function Greeting({ navigation }: RootScreen<'Greeting'>) {
  const ex = useGame(s => s.explorer);
  const finish = useGame(s => s.finishOnboarding);
  const name = ex.name || 'Explorer';
  const script = useMemo<StoryLine[]>(() => [
    { speaker: 'numi', text: `Hi ${name}! I'm Numi. The river washed away Numbershire's numbers — and the bridge with them.` },
    { speaker: 'numi', text: "Nobody here remembers how numbers fit together. You can figure it out — by building, sharing and exploring. I'll be right beside you." },
  ], [name]);
  const n = useNarration(script, { delay: 600 });
  const talking = n.playing;
  const cap = (i: number) => ({ state: (n.playing && n.line === i ? 'active' : 'past') as 'active' | 'past', charIndex: n.playing && n.line === i ? n.word : -1 });

  const facts = [
    { v: '6', label: 'places to restore', color: C.coral },
    { v: '∞', label: 'puzzles to solve', color: C.teal },
    { v: '∞', label: 'tries allowed', color: C.violet },
  ];

  return (
    <Screen bg={C.sky}>
      <DriftingClouds width={420} tops={[70, 160]} />
      <Eyebrow color={C.tealDeep} style={{ textAlign: 'center' }}>READY, {name.toUpperCase()}?</Eyebrow>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 4, marginTop: 20 }}>
        <Pop delay={100}><Numi size={130} mood="wow" state={talking ? 'speaking' : 'celebrate'} /></Pop>
        <Pop delay={300}><ExplorerAvatar {...ex} size={104} cheering /></Pop>
      </View>
      <Enter delay={400}>
        <SpeechBubble tail="top" style={{ marginTop: 16, padding: 18 }}>
          <KaraokeText text={script[0].text} {...cap(0)} style={[T.h3, { fontSize: 20, lineHeight: 25 }]} />
          <KaraokeText text={script[1].text} {...cap(1)} color={C.muted} style={[T.bodySm, { marginTop: 8, fontSize: 14, lineHeight: 20 }]} />
          <ReadAloudButton playing={n.playing} onPlay={n.play} onStop={n.stop} label="Hear it again" style={{ alignSelf: 'flex-start', marginTop: 10 }} />
        </SpeechBubble>
      </Enter>
      <View style={{ flexDirection: 'row', gap: 9, marginTop: 14 }}>
        {facts.map((f, i) => (
          <Enter key={f.label} delay={650 + i * 90} style={{ flex: 1 }}>
            <View style={{ backgroundColor: 'rgba(253,245,232,.92)', borderRadius: 18, padding: 12 }}>
              <Text style={{ fontFamily: F.display, fontSize: 24, color: f.color }}>{f.v}</Text>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.muted }}>{f.label}</Text>
            </View>
          </Enter>
        ))}
      </View>
      <View style={{ flex: 1, minHeight: 12 }} />
      <ChunkyButton label="Open the map" icon="🗺️" onPress={() => { n.stop(); finish(); navigation.reset({ index: 0, routes: [{ name: 'Main' }] }); }} />
    </Screen>
  );
}
