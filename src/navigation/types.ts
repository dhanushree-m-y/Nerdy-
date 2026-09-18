import { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MissionId, SkillId, StrategyId } from '../data/world';

export type TabParams = {
  World: undefined;
  Adventure: undefined;
  Backpack: undefined;
  Me: undefined;
};

export type RootParams = {
  Splash: undefined;
  Story: undefined;
  CreateExplorer: undefined;
  Level: undefined;
  Greeting: undefined;
  Main: NavigatorScreenParams<TabParams> | undefined;
  Mission: { mission: MissionId };
  Bridge: { twin?: boolean } | undefined;
  Market: undefined;
  Cafe: undefined;
  Farm: undefined;
  Picnic: undefined;
  Mystery: undefined;
  Boss: undefined;
  Explain: { mission: MissionId; suggested?: StrategyId };
  Confidence: { mission: MissionId };
  Replay: { mission: MissionId };
  Reward: { mission: MissionId };
  WorldChange: { mission: MissionId };
  Mastery: { skill: SkillId; level: number };
  StrategyBook: undefined;
  Characters: undefined;
  AroundMe: undefined;
  Memory: undefined;
  Today: undefined;
  Classroom: undefined;
  ParentGate: { target: 'Parent' | 'Teacher' };
  Parent: undefined;
  Teacher: undefined;
  Learner: undefined;
  DesignSystem: undefined;
};

export type RootScreen<K extends keyof RootParams> = NativeStackScreenProps<RootParams, K>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootParams {}
  }
}
