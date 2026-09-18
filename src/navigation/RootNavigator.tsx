import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tap } from '../components/ui';
import { useGame } from '../store/game';
import { C, F, M, softShadow } from '../theme/tokens';
import { RootParams, TabParams } from './types';

import Splash from '../screens/onboarding/Splash';
import Story from '../screens/onboarding/Story';
import CreateExplorer from '../screens/onboarding/CreateExplorer';
import Level from '../screens/onboarding/Level';
import Greeting from '../screens/onboarding/Greeting';
import WorldMap from '../screens/tabs/WorldMap';
import Adventure from '../screens/tabs/Adventure';
import Backpack from '../screens/tabs/Backpack';
import Me from '../screens/tabs/Me';
import MissionStory from '../screens/mission/MissionStory';
import BridgeBuilder from '../screens/games/BridgeBuilder';
import Market from '../screens/games/Market';
import FractionCafe from '../screens/games/FractionCafe';
import Farm from '../screens/games/Farm';
import Picnic from '../screens/games/Picnic';
import Mystery from '../screens/games/Mystery';
import RocketBoss from '../screens/games/RocketBoss';
import Explain from '../screens/loop/Explain';
import Confidence from '../screens/loop/Confidence';
import Replay from '../screens/loop/Replay';
import Reward from '../screens/loop/Reward';
import WorldChange from '../screens/loop/WorldChange';
import Mastery from '../screens/loop/Mastery';
import StrategyBook from '../screens/companion/StrategyBook';
import Characters from '../screens/companion/Characters';
import AroundMe from '../screens/companion/AroundMe';
import Memory from '../screens/companion/Memory';
import Today from '../screens/companion/Today';
import Classroom from '../screens/companion/Classroom';
import ParentGate from '../screens/grownups/ParentGate';
import Parent from '../screens/grownups/Parent';
import Teacher from '../screens/grownups/Teacher';
import Learner from '../screens/grownups/Learner';
import DesignSystem from '../screens/DesignSystem';

const Stack = createNativeStackNavigator<RootParams>();
const Tabs = createBottomTabNavigator<TabParams>();

const TAB_META: Record<keyof TabParams, { icon: string; label: string; color: string; deep: string }> = {
  World: { icon: '🗺️', label: 'World', color: C.teal, deep: C.tealDeep },
  Adventure: { icon: '⛺', label: 'Adventure', color: C.coral, deep: C.coralDeep },
  Backpack: { icon: '🎒', label: 'Backpack', color: C.sun, deep: C.sunDeep },
  Me: { icon: '🧭', label: 'Explorer', color: C.violet, deep: C.violetDeep },
};

function TabItem({ focused, name, onPress }: { focused: boolean; name: keyof TabParams; onPress: () => void }) {
  const m = TAB_META[name];
  const v = useSharedValue(focused ? 1 : 0);
  useEffect(() => { v.value = withSpring(focused ? 1 : 0, M.bouncy); }, [focused]);
  const icon = useAnimatedStyle(() => ({ transform: [{ translateY: -4 * v.value }, { scale: 1 + 0.15 * v.value }] }));
  const pill = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scaleX: 0.6 + 0.4 * v.value }] }));
  return (
    <Tap onPress={onPress} a11y={m.label} outerStyle={{ flex: 1 }} style={{ alignItems: 'center', paddingVertical: 6, minHeight: 58, justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', top: 2, bottom: 2, left: 4, right: 4, borderRadius: 20, backgroundColor: m.color, borderBottomWidth: 4, borderBottomColor: m.deep }, pill]} />
      <Animated.Text style={[{ fontSize: 24 }, icon]}>{m.icon}</Animated.Text>
      <Text style={{ fontFamily: F.bodyHeavy, fontSize: 11, color: focused ? (name === 'Backpack' ? C.ink : C.cream) : C.muted, marginTop: -2 }}>{m.label}</Text>
    </Tap>
  );
}

function KidTabBar({ state, navigation }: BottomTabBarProps) {
  const ins = useSafeAreaInsets();
  return (
    <View style={[{ position: 'absolute', left: 14, right: 14, bottom: Math.max(ins.bottom, 10), flexDirection: 'row', backgroundColor: C.cream, borderRadius: 28, padding: 6, gap: 4 }, softShadow(0.18, 8)]}>
      {state.routes.map((r, i) => (
        <TabItem key={r.key} name={r.name as keyof TabParams} focused={state.index === i} onPress={() => navigation.navigate(r.name)} />
      ))}
    </View>
  );
}

function MainTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false, animation: 'shift' }} tabBar={p => <KidTabBar {...p} />}>
      <Tabs.Screen name="World" component={WorldMap} />
      <Tabs.Screen name="Adventure" component={Adventure} />
      <Tabs.Screen name="Backpack" component={Backpack} />
      <Tabs.Screen name="Me" component={Me} />
    </Tabs.Navigator>
  );
}

export default function RootNavigator() {
  const onboarded = useGame(s => s.onboarded);
  const reduced = useGame(s => s.settings.reducedMotion);
  return (
    <Stack.Navigator
      initialRouteName={onboarded ? 'Main' : 'Splash'}
      screenOptions={{ headerShown: false, animation: reduced ? 'none' : 'fade_from_bottom', contentStyle: { backgroundColor: C.cream } }}
    >
      <Stack.Screen name="Splash" component={Splash} />
      <Stack.Screen name="Story" component={Story} />
      <Stack.Screen name="CreateExplorer" component={CreateExplorer} />
      <Stack.Screen name="Level" component={Level} />
      <Stack.Screen name="Greeting" component={Greeting} />
      <Stack.Screen name="Main" component={MainTabs} options={{ animation: reduced ? 'none' : 'fade' }} />
      <Stack.Screen name="Mission" component={MissionStory} />
      <Stack.Screen name="Bridge" component={BridgeBuilder} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Market" component={Market} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Cafe" component={FractionCafe} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Farm" component={Farm} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Picnic" component={Picnic} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Mystery" component={Mystery} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Boss" component={RocketBoss} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Explain" component={Explain} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Confidence" component={Confidence} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Replay" component={Replay} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Reward" component={Reward} options={{ gestureEnabled: false, animation: reduced ? 'none' : 'fade' }} />
      <Stack.Screen name="WorldChange" component={WorldChange} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Mastery" component={Mastery} options={{ gestureEnabled: false, animation: reduced ? 'none' : 'fade' }} />
      <Stack.Screen name="StrategyBook" component={StrategyBook} />
      <Stack.Screen name="Characters" component={Characters} />
      <Stack.Screen name="AroundMe" component={AroundMe} />
      <Stack.Screen name="Memory" component={Memory} />
      <Stack.Screen name="Today" component={Today} />
      <Stack.Screen name="Classroom" component={Classroom} />
      <Stack.Screen name="ParentGate" component={ParentGate} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Parent" component={Parent} />
      <Stack.Screen name="Teacher" component={Teacher} />
      <Stack.Screen name="Learner" component={Learner} />
      <Stack.Screen name="DesignSystem" component={DesignSystem} />
    </Stack.Navigator>
  );
}
