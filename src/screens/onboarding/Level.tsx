import React from 'react';
import { Text, View } from 'react-native';
import { Enter } from '../../components/motion';
import { Cloud, Mountain, River, Sun, Tree } from '../../components/scenery';
import { SpeakableText, SpeakButton } from '../../components/Storyteller';
import { ChunkyButton, Eyebrow, Screen, Tap } from '../../components/ui';
import { GRADES, LevelN } from '../../data/world';
import { RootScreen } from '../../navigation/types';
import { useGame } from '../../store/game';
import { C, F, T } from '../../theme/tokens';

function Environment({ n }: { n: LevelN }) {
  if (n === 1) {
    return (
      <View style={{ flex: 1, backgroundColor: '#d8efd0' }}>
        <Sun size={20} style={{ position: 'absolute', right: -2, top: -4 }} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, backgroundColor: C.grass, borderTopLeftRadius: 30, borderTopRightRadius: 40 }} />
        <Tree size={20} style={{ position: 'absolute', bottom: 18, left: 8 }} />
        <Tree size={14} color="#4f9463" style={{ position: 'absolute', bottom: 18, left: 34 }} />
        {['🌼', '🌷'].map((f, i) => <Text key={f} style={{ position: 'absolute', bottom: 4, left: 44 + i * 16, fontSize: 12 }}>{f}</Text>)}
      </View>
    );
  }
  if (n === 2) {
    return (
      <View style={{ flex: 1, backgroundColor: C.sky }}>
        <Cloud scale={0.35} style={{ position: 'absolute', top: 6, left: 4 }} />
        <Mountain w={60} h={40} color={C.hill} snow={false} style={{ position: 'absolute', bottom: 26, left: -6 }} />
        <Mountain w={50} h={34} color={C.hillDeep} snow={false} style={{ position: 'absolute', bottom: 26, right: -8 }} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, backgroundColor: C.grass }} />
        <River width={90} height={12} style={{ position: 'absolute', bottom: 8 }} />
        <View style={{ position: 'absolute', bottom: 18, left: 18, width: 40, height: 5, backgroundColor: C.wood }} />
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: '#c9d3ea' }}>
      <Mountain w={70} h={62} color="#7f8fb0" style={{ position: 'absolute', bottom: 0, left: -8 }} />
      <Mountain w={64} h={74} color="#5d6d92" style={{ position: 'absolute', bottom: 0, right: -10 }} />
      <View style={{ position: 'absolute', top: 8, left: 10, width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', top: 16, left: 36, width: 3, height: 3, borderRadius: 2, backgroundColor: '#fff' }} />
      <Text style={{ position: 'absolute', top: 2, right: 6, fontSize: 14 }}>🚩</Text>
    </View>
  );
}

export default function Level({ navigation }: RootScreen<'Level'>) {
  const grade = useGame(s => s.grade);
  const setGrade = useGame(s => s.setGrade);
  const name = useGame(s => s.explorer.name) || 'Explorer';
  return (
    <Screen>
      <Enter>
        <Eyebrow>CHOOSE YOUR GRADE</Eyebrow>
        <SpeakableText text={`Which grade is ${name} in?`} variant="h1" style={{ marginTop: 4 }} />
        <SpeakableText
          text="Every grade gets its own puzzles. A grown-up can change it later."
          autoRead
          style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted, marginTop: 4 }}
        />
      </Enter>
      <View style={{ gap: 9, marginTop: 16 }}>
        {GRADES.map((l, i) => {
          const on = grade === l.g;
          return (
            <Enter key={l.g} delay={100 + i * 80}>
              <Tap onPress={() => setGrade(l.g)} a11y={`${l.name}. ${l.desc}`} style={{
                flexDirection: 'row', alignItems: 'center', gap: 12, padding: 9, borderRadius: 24,
                backgroundColor: on ? C.teal : C.cream, borderWidth: on ? 0 : 2, borderColor: C.sandLine,
                borderBottomWidth: on ? 6 : 2, borderBottomColor: on ? C.tealDeep : C.sandLine,
              }}>
                <View style={{ width: 64, height: 60, borderRadius: 17, overflow: 'hidden', borderWidth: 3, borderColor: on ? C.cream : 'transparent' }}>
                  <Environment n={l.env} />
                  <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(253,245,232,.94)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: F.display, fontSize: 18, lineHeight: 24, color: C.tealDeep }}>{l.g}</Text>
                    </View>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[T.h3, { fontSize: 17, color: on ? C.cream : C.ink }]}>{l.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 3 }}>
                      {[1, 2, 3, 4, 5].map(k => <View key={k} style={{ width: 6, height: 4 + k * 2.4, alignSelf: 'flex-end', borderRadius: 2, backgroundColor: k <= l.g ? (on ? C.cream : C.teal) : on ? 'rgba(253,245,232,.3)' : C.sand }} />)}
                    </View>
                  </View>
                  <Text style={{ fontFamily: F.body, fontSize: 12.5, lineHeight: 17, color: on ? C.cream : C.muted, marginTop: 1 }}>{l.desc}</Text>
                </View>
                <SpeakButton dark={on} text={`${l.name}. ${l.desc}`} style={{ width: 32, height: 32, borderRadius: 16 }} />
              </Tap>
            </Enter>
          );
        })}
      </View>
      <Enter delay={500}>
        <View style={{ backgroundColor: C.sandLine, borderRadius: 22, padding: 14, marginTop: 14 }}>
          <SpeakableText
            text={`No tests. Inside each grade, Numi watches how ${name} plays and makes puzzles a little kinder or a little tougher on its own.`}
            variant="bodySm"
            style={{ fontFamily: F.bodyBold, fontSize: 13, lineHeight: 19 }}
          />
        </View>
      </Enter>
      <View style={{ flex: 1, minHeight: 12 }} />
      <ChunkyButton label="Let's go!" color={C.teal} shadow={C.tealDeep} onPress={() => navigation.navigate('Greeting')} />
    </Screen>
  );
}
