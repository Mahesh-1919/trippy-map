import { useColorScheme } from 'react-native';

const light = {
  scheme: 'light' as 'light' | 'dark',
  card: '#ffffff',
  text: '#202124',
  sub: '#5f6368',
  primary: '#1a73e8',
  onPrimary: '#ffffff',
  chip: '#e8f0fe',
  danger: '#d93025',
  onDanger: '#ffffff',
  border: '#dadce0',
  banner: '#0b57d0',
};

const dark: typeof light = {
  scheme: 'dark',
  card: '#2b2d30',
  text: '#e8eaed',
  sub: '#9aa0a6',
  primary: '#8ab4f8',
  onPrimary: '#0b1b33',
  chip: '#3c4043',
  danger: '#f28b82',
  onDanger: '#3b0a07',
  border: '#5f6368',
  banner: '#1a4fa3',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.25,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 6,
} as const;
