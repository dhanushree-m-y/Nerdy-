// Learning Partners — five friends, five kinds of maths.
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Buddy } from '../../components/characters';
import { Enter } from '../../components/motion';
import { SpeakableText, SpeakButton } from '../../components/Storyteller';
import { ChunkyButton, Screen, SpeechBubble, Tap, TopBar } from '../../components/ui';
import { CharacterId, CHARACTERS, MissionId, MISSIONS } from '../../data/world';
import { say } from '../../services/feedback';
import { C, F } from '../../theme/tokens';

const IDS = Object.keys(CHARACTERS) as CharacterId[];

const missionFor = (id: CharacterId): MissionId | undefined =>
  (Object.keys(MISSIONS) as MissionId[]).find(m => MISSIONS[m].character === id);

export default function Characters() {
  const nav = useNavigation();
  const [cheer, setCheer] = useState<CharacterId | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const greet = (id: CharacterId) => {
    setCheer(id);
    say(CHARACTERS[id].line.replace(/"/g, ''));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCheer(null), 2200);
  };

  return (
    <Screen scroll bg={C.cream}>
      <TopBar back="← Back" title="LEARNING PARTNERS" />
      <SpeakableText text="Five friends, five kinds of maths" variant="h2" style={{ marginTop: 12 }} />
      <SpeakableText text="Tap a friend to say hello." autoRead variant="bodySm" style={{ fontSize: 13, lineHeight: 18, marginTop: 4 }} />

      <View style={{ gap: 12, marginTop: 14 }}>
        {IDS.map((id, i) => {
          const ch = CHARACTERS[id];
          const mission = missionFor(id);
          const on = cheer === id;
          return (
            <Enter key={id} delay={100 + i * 80}>
              <View style={{ backgroundColor: ch.soft, borderRadius: 26, padding: 13, borderWidth: 2, borderColor: on ? ch.body : 'rgba(34,48,59,.06)', borderBottomWidth: 6, borderBottomColor: on ? ch.deep : 'rgba(34,48,59,.1)' }}>
                <Tap onPress={() => greet(id)} a11y={`${ch.name} ${ch.role}. Tap to hear them.`}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ width: 88, height: 112, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.6)', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
                      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 18, backgroundColor: ch.body, opacity: 0.25 }} />
                      <Buddy id={id} size={78} cheering={on} mood={on ? 'wow' : 'happy'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                        <Text style={{ flex: 1, fontFamily: F.display, fontSize: 20, lineHeight: 23, color: C.ink }}>{ch.name}</Text>
                        <SpeakButton text={`${ch.name}, ${ch.role}. ${ch.focus}.`} style={{ width: 32, height: 32, borderRadius: 16 }} />
                      </View>
                      <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.muted }}>{ch.role}</Text>
                      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, lineHeight: 18, letterSpacing: 0.6, color: ch.deep, marginTop: 4 }}>{ch.focus}</Text>
                      <SpeechBubble tail="top" style={{ marginTop: 10, paddingVertical: 9, paddingHorizontal: 12 }}>
                        <Text style={{ fontFamily: F.bodyBold, fontSize: 13, lineHeight: 18, color: C.ink }}>{ch.line}</Text>
                      </SpeechBubble>
                    </View>
                  </View>
                </Tap>
                {mission ? (
                  <ChunkyButton
                    size="md" label={`Visit ${ch.name}`} color={ch.body} shadow={ch.deep}
                    textColor={id === 'milo' ? C.ink : C.cream}
                    onPress={() => nav.navigate('Mission', { mission })}
                    style={{ marginTop: 12 }}
                  />
                ) : null}
              </View>
            </Enter>
          );
        })}
      </View>
    </Screen>
  );
}
