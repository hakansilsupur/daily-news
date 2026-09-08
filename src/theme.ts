import { useColorScheme } from 'react-native';

export interface Theme {
  dark: boolean;
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  danger: string;
}

const light: Theme = {
  dark: false,
  background: '#f5f6f8',
  surface: '#ffffff',
  surfaceAlt: '#eceef2',
  border: '#dfe3e8',
  text: '#12161c',
  textMuted: '#6b7280',
  accent: '#c8102e',
  accentSoft: '#fdecef',
  accentText: '#ffffff',
  danger: '#b91c1c',
};

const dark: Theme = {
  dark: true,
  background: '#0e1116',
  surface: '#171b22',
  surfaceAlt: '#20252e',
  border: '#2a303a',
  text: '#f2f4f7',
  textMuted: '#98a2b3',
  accent: '#ef4a63',
  accentSoft: '#33161c',
  accentText: '#ffffff',
  danger: '#f87171',
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
