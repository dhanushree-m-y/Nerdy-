import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { EX_HAIR, EX_OUTFIT, EX_SKIN, ExplorerAvatar, HAIR_STYLES, OUTFITS } from '../../components/characters';
import { Burst } from '../../components/effects';
import { Enter, PulseRing, Wobble } from '../../components/motion';
import { SpeakableText } from '../../components/Storyteller';
import { ChunkyButton, Eyebrow, Tap } from '../../components/ui';
import { RootScreen } from '../../navigation/types';
import { haptic } from '../../services/feedback';
import { useGame } from '../../store/game';
import { C, F, T } from '../../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NAME_IDEAS = ['Maya', 'Tobi', 'Esi', 'Arjun', 'Lina'];

function OptionRow({ title, count, value, onPick, render }: { title: string; count: number; value: number; onPick: (i: number) => void; render: (i: number, on: boolean) => React.ReactNode }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Eyebrow>{title}</Eyebrow>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 7 }}>
        {Array.from({ length: count }, (_, i) => {
          const on = value === i;
          return (
            <View key={i} style={{ flex: 1 }}>
              <Tap onPress={() => onPick(i)} a11y={`${title} option ${i + 1}`} style={{ height: 56, borderRadius: 18, backgroundColor: on ? C.ink : C.sandLine, borderBottomWidth: on ? 5 : 0, borderBottomColor: C.inkDeep, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                {render(i, on)}
              </Tap>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function CreateExplorer({ navigation }: RootScreen<'CreateExplorer'>) {
  const ins = useSafeAreaInsets();
  const ex = useGame(s => s.explorer);
  const setExplorer = useGame(s => s.setExplorer);
  const [cheer, setCheer] = useState(0);
  const [dice, setDice] = useState(0);
  const [cheering, setCheering] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const pick = (p: Partial<typeof ex>) => {
    setExplorer(p);
    setCheer(c => c + 1);
    setCheering(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCheering(false), 1100);
  };
  const surprise = () => {
    haptic.heavy();
    setDice(d => d + 1);
    pick({ skin: Math.floor(Math.random() * 3), hair: Math.floor(Math.random() * 4), hairStyle: Math.floor(Math.random() * 4), outfit: Math.floor(Math.random() * 4) });
  };
  const name = ex.name.trim();

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView contentContainerStyle={{ paddingTop: ins.top + 10, paddingHorizontal: 20, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
        <Enter>
          <Eyebrow>CREATE YOUR EXPLORER</Eyebrow>
          <SpeakableText text="Who's coming with Numi?" variant="h1" style={{ marginTop: 4 }} />
          <SpeakableText
            text="Choose how your explorer looks. Then type a name."
            autoRead
            style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted, marginTop: 4 }}
          />
        </Enter>

        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <View style={{ width: 210, height: 220, borderRadius: 40, backgroundColor: [C.sky, '#e2d8f5', '#f6e1b0', '#fde2d8'][ex.outfit], alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, backgroundColor: 'rgba(126,192,138,.6)' }} />
            <ExplorerAvatar {...ex} size={170} cheering={cheering} style={{ marginBottom: 6 }} />
            <Burst trigger={cheer} x={105} y={90} count={10} dist={80} />
          </View>
          <View style={{ position: 'absolute', right: 30, top: 16, alignItems: 'center', justifyContent: 'center' }}>
            <PulseRing color={C.sun} size={52} duration={2400} />
            <Wobble trigger={dice}>
              <Tap onPress={surprise} a11y="Surprise me — random look" style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: C.sun, borderBottomWidth: 5, borderBottomColor: C.sunDeep, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>🎲</Text>
              </Tap>
            </Wobble>
          </View>
          {name ? <Text style={[T.h2, { marginTop: 8 }]}>{name}</Text> : null}
        </View>

        <OptionRow title="AVATAR" count={3} value={ex.skin} onPick={i => pick({ skin: i })}
          render={(i, on) => <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: EX_SKIN[i], borderWidth: 2, borderColor: on ? C.cream : 'transparent' }} />} />
        <OptionRow title="HAIRSTYLE" count={4} value={ex.hairStyle} onPick={i => pick({ hairStyle: i })}
          render={(i, on) => <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: on ? C.cream : C.ink }}>{HAIR_STYLES[i]}</Text>} />
        <OptionRow title="HAIR COLOUR" count={4} value={ex.hair} onPick={i => pick({ hair: i })}
          render={(i, on) => <View style={{ width: 26, height: 22, borderTopLeftRadius: 13, borderTopRightRadius: 13, borderRadius: 4, backgroundColor: EX_HAIR[i], borderWidth: 2, borderColor: on ? C.cream : 'transparent' }} />} />
        <OptionRow title="OUTFIT" count={4} value={ex.outfit} onPick={i => pick({ outfit: i })}
          render={(i, on) => (<>
            <View style={{ width: 16, height: 16, borderRadius: 5, backgroundColor: EX_OUTFIT[i] }} />
            <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: on ? C.cream : C.ink }}>{OUTFITS[i]}</Text>
          </>)} />

        <View style={{ marginTop: 12 }}>
          <Eyebrow>NAME</Eyebrow>
          <TextInput
            value={ex.name}
            onChangeText={t => setExplorer({ name: t.slice(0, 14) })}
            placeholder="Type a name"
            placeholderTextColor="#b1a898"
            accessibilityLabel="Explorer name"
            style={{ marginTop: 7, backgroundColor: C.sandLine, borderRadius: 18, paddingVertical: 15, paddingHorizontal: 16, fontFamily: F.bodyHeavy, fontSize: 17, color: C.ink }}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
            {NAME_IDEAS.map(n => (
              <Tap key={n} onPress={() => pick({ name: n })} a11y={`Use the name ${n}`} style={{ backgroundColor: ex.name === n ? C.teal : C.cream, borderWidth: 2, borderColor: ex.name === n ? C.teal : C.sandLine, borderRadius: 14, paddingVertical: 7, paddingHorizontal: 11 }}>
                <Text style={{ fontFamily: F.bodyHeavy, fontSize: 13, color: ex.name === n ? C.cream : C.ink }}>{n}</Text>
              </Tap>
            ))}
          </View>
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingBottom: ins.bottom + 16, paddingTop: 8 }}>
        <ChunkyButton
          label={name ? `Let's Go, ${name}!` : "Let's Go!"}
          onPress={() => { if (!name) setExplorer({ name: 'Maya' }); navigation.navigate('Level'); }}
        />
      </View>
    </View>
  );
}
