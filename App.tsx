// Import only the weights we use so the other font files aren't bundled.
import { Baloo2_700Bold } from '@expo-google-fonts/baloo-2/700Bold';
import { Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2/800ExtraBold';
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { createNavigationContainerRef, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BootScreen } from './src/components/Brand';
import { resetSessionClock } from './src/components/guidance';
import RootNavigator from './src/navigation/RootNavigator';
import { useGame } from './src/store/game';
import { C } from './src/theme/tokens';

const navRef = createNavigationContainerRef();
// Dev-only hooks for QA / automated walkthroughs.
if (__DEV__) Object.assign(globalThis, { __numi: { store: useGame, nav: navRef } });

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: C.cream, card: C.cream, text: C.ink, primary: C.teal } };

function useHydrated() {
  const [done, setDone] = useState(useGame.persist.hasHydrated());
  useEffect(() => useGame.persist.onFinishHydration(() => setDone(true)), []);
  return done;
}

export default function App() {
  const [fonts] = useFonts({ Baloo2_700Bold, Baloo2_800ExtraBold, Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });
  const hydrated = useHydrated();
  const reduced = useGame(s => s.settings.reducedMotion);

  // The break reminder counts from when the app opens.
  useEffect(() => { resetSessionClock(); }, []);

  const ready = fonts && hydrated;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.ink }}>
      <SafeAreaProvider>
        <ReducedMotionConfig mode={reduced ? ReduceMotion.Always : ReduceMotion.System} />
        {/* On web, frame the app like a phone so it reads as the mobile product it is. */}
        <View style={Platform.OS === 'web' ? { flex: 1, width: '100%', maxWidth: 440, alignSelf: 'center', overflow: 'hidden', backgroundColor: C.cream } : { flex: 1 }}>
          {ready ? (
            <NavigationContainer theme={theme} ref={navRef}>
              <RootNavigator />
            </NavigationContainer>
          ) : (
            <BootScreen line={fonts ? 'Finding your adventure…' : 'Waking up Numbershire…'} />
          )}
        </View>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
