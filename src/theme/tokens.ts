// NUMI design system — tokens lifted from the Numbershire design (v4).
import { Platform, TextStyle, ViewStyle } from 'react-native';

export const C = {
  // core palette
  cream: '#fdf5e8',
  paper: '#fffdf7',
  sand: '#e6ddcb',
  sandLine: '#eee7da',
  sandDeep: '#cdc4b2',
  ink: '#22303b',
  inkDeep: '#0f1720',
  muted: '#5d6b74',
  faint: '#9aa4ab',
  sky: '#bfe3ef',
  meadow: '#cfe9c7',
  grass: '#7ec08a',
  hill: '#8fc4b0',
  hillDeep: '#6fae9b',
  water: '#5aa8d8',
  wood: '#b07a4a',
  woodDeep: '#96603a',
  woodShadow: '#8c5c34',
  cookie: '#c98a4b',
  night: '#1b2440',
  dusk: '#3a3550',

  teal: '#2fa08a',
  tealDeep: '#1d6f61',
  tealSoft: '#eaf5f2',
  sun: '#f5b53c',
  sunDeep: '#d1942a',
  sunSoft: '#f9f1dc',
  coral: '#ef6a4f',
  coralDeep: '#c9502f',
  coralSoft: '#fdeee9',
  violet: '#8a6ad0',
  violetDeep: '#6b4fae',
  violetSoft: '#efeafa',
  locked: '#cdd4d8',
  lockedDeep: '#aab3b8',
  lockedInk: '#7d878d',

  // grown-up surfaces
  proBg: '#f3f2f2',
  proCard: '#ffffff',
  proLine: '#e8e6e2',

  white: '#ffffff',
};

export const F = {
  display: 'Baloo2_800ExtraBold',
  displayBold: 'Baloo2_700Bold',
  body: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
  bodyRegular: 'Nunito_400Regular',
};

export const R = { xs: 8, sm: 13, md: 17, lg: 22, xl: 26, xxl: 30, pill: 999 };
export const S = { xxs: 4, xs: 6, sm: 9, md: 12, lg: 16, xl: 20, xxl: 24, gutter: 20 };

// Minimum touch target for kids (design: 52–58, big mode 64–70)
export const TOUCH = { min: 52, big: 64 };

export const T = {
  hero: { fontFamily: F.display, fontSize: 40, lineHeight: 44, color: C.ink } as TextStyle,
  h1: { fontFamily: F.display, fontSize: 30, lineHeight: 34, color: C.ink } as TextStyle,
  h2: { fontFamily: F.display, fontSize: 25, lineHeight: 29, color: C.ink } as TextStyle,
  h3: { fontFamily: F.display, fontSize: 19, lineHeight: 22, color: C.ink } as TextStyle,
  eyebrow: { fontFamily: F.bodyHeavy, fontSize: 11, letterSpacing: 1.5, color: C.faint } as TextStyle,
  body: { fontFamily: F.bodyBold, fontSize: 14, lineHeight: 20, color: C.ink } as TextStyle,
  bodySm: { fontFamily: F.body, fontSize: 12.5, lineHeight: 18, color: C.muted } as TextStyle,
  label: { fontFamily: F.bodyHeavy, fontSize: 12, color: C.ink } as TextStyle,
  num: { fontFamily: F.display, fontSize: 22, lineHeight: 26, color: C.ink } as TextStyle,
};

// "Chunky" hard bottom shadow used on every tappable game element.
export function ledge(color: string, depth = 6): ViewStyle {
  return Platform.select<ViewStyle>({
    web: { boxShadow: `0px ${depth}px 0px ${color}` } as ViewStyle,
    default: {
      borderBottomWidth: depth,
      borderBottomColor: color,
    },
  })!;
}

export function softShadow(opacity = 0.12, y = 6): ViewStyle {
  return Platform.select<ViewStyle>({
    web: { boxShadow: `0px ${y}px 18px rgba(34,48,59,${opacity})` } as ViewStyle,
    default: {
      shadowColor: C.ink,
      shadowOpacity: opacity,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: y },
      elevation: Math.round(y / 2),
    },
  })!;
}

export const ring = (color: string, w = 2): ViewStyle => ({ borderWidth: w, borderColor: color });

// Motion presets (Reanimated springs)
export const M = {
  spring: { damping: 14, stiffness: 180, mass: 0.8 },
  bouncy: { damping: 9, stiffness: 160, mass: 0.7 },
  soft: { damping: 20, stiffness: 120 },
  enter: 440,
};

export type Mood = 'happy' | 'worried' | 'wow' | 'think' | 'listen';
