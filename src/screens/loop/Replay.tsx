// MISTAKE REPLAY — rewards self-correction.
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Numi } from '../../components/characters';
import { Enter, Pop } from '../../components/motion';
import { SpeakableText } from '../../components/Storyteller';
import { ChunkyButton, Eyebrow, Screen, Segmented, TopBar } from '../../components/ui';
import { MISSIONS } from '../../data/world';
import { ReplayFrame, useSession } from '../../learning/session';
import { goNext } from '../../navigation/flow';
import { RootScreen } from '../../navigation/types';
import { say } from '../../services/feedback';
import { useGame } from '../../store/game';
import { C, F, T } from '../../theme/tokens';

const FALLBACK: ReplayFrame[] = [
  { label: 'FIRST TRY', groups: [4, 4, 4], say: 'You started with 3 plates of 4 — that shares 12, but there are 4 friends.', tone: 'first' },
  { label: 'THE MOMENT', groups: [4, 4, 4, 0], say: 'You counted the friends again and added a fourth plate.', tone: 'change' },
  { label: 'FINAL', groups: [3, 3, 3, 3], say: '12 shared 4 ways is 3 each. Equal groups, every time.', tone: 'final' },
];
const RING = { first: C.coral, change: C.sun, final: C.teal };
const ICON: Record<string, string> = { picnic: '🍓', farm: '🥕', boss: '📦' };

export default function Replay({ navigation, route }: RootScreen<'Replay'>) {
  const { mission } = route.params;
  const frames = useSession(s => s.replay) ?? FALLBACK;
  const addStars = useGame(s => s.addCoins);
  const [i, setI] = useState(0);
  const f = frames[Math.min(i, frames.length - 1)];
  const icon = ICON[mission] ?? '🍪';

  useEffect(() => {
    if (i < frames.length - 1) {
      const t = setTimeout(() => setI(k => k + 1), 2600);
      return () => clearTimeout(t);
    }
  }, [i]);
  useEffect(() => { say(f.say); }, [i]);
  useEffect(() => { addStars(2); }, []);

  return (
    <Screen>
      <TopBar back={null} title="WANT TO SEE WHAT CHANGED?" />
      <SpeakableText text="You changed your strategy!" variant="h1" style={{ marginTop: 12 }} />
      <SpeakableText
        text={`${MISSIONS[mission].title} — here's the path you took.`}
        variant="bodySm"
        style={{ fontSize: 13, lineHeight: 18, marginTop: 4 }}
      />
      <View style={{ backgroundColor: C.sand, borderRadius: 28, padding: 16, marginTop: 14, minHeight: 240 }}>
        <Eyebrow color="#877f6d">{f.label}</Eyebrow>
        <View key={i} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, justifyContent: 'center' }}>
          {f.groups.map((n, k) => (
            <Pop key={k} delay={k * 90}>
              <View style={{ width: f.groups.length > 3 ? 74 : 96, height: 80, borderRadius: 40, backgroundColor: C.cream, borderWidth: 4, borderColor: RING[f.tone], flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center', justifyContent: 'center', gap: 2, padding: 8 }}>
                {Array.from({ length: n }, (_, j) => <Text key={j} style={{ fontSize: 15 }}>{icon}</Text>)}
              </View>
            </Pop>
          ))}
        </View>
        <Enter key={`s${i}`}><SpeakableText text={f.say} variant="body" style={{ marginTop: 14 }} /></Enter>
      </View>
      <Segmented style={{ marginTop: 12 }} value={i} onChange={setI} options={frames.map((fr, k) => ({ label: ['First', 'Change', 'Final'][k] ?? fr.label, value: k }))} />
      <View style={{ flex: 1, minHeight: 12 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.teal, borderRadius: 26, padding: 14, marginBottom: 12 }}>
        <Numi size={52} mood="wow" state="celebrate" />
        <View style={{ flex: 1 }}>
          <SpeakableText
            text="Changing your mind is the whole trick."
            iconColor={C.sun}
            style={{ fontFamily: F.bodyHeavy, fontSize: 14, lineHeight: 20, color: C.cream }}
          />
          <Text style={{ fontFamily: F.bodyBold, fontSize: 13, lineHeight: 18, color: C.cream, opacity: 0.85 }}>+2 coins for self-correcting ⭐</Text>
        </View>
      </View>
      <ChunkyButton label="See my reward →" onPress={() => goNext(navigation, 'replay', mission)} />
    </Screen>
  );
}
