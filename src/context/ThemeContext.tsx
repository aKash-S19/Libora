import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Palette, Typography, Spacing, BorderRadius } from '../theme';

type AppThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextType {
  mode: AppThemeMode;
  isDark: boolean;
  colors: typeof Palette.dark;
  setMode: (mode: AppThemeMode) => void;
  typography: typeof Typography;
  spacing: typeof Spacing;
  borderRadius: typeof BorderRadius;
}

const THEME_STORAGE_KEY = '@libora_theme_mode';

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<AppThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved && (saved === 'dark' || saved === 'light' || saved === 'system')) {
        setModeState(saved as AppThemeMode);
      }
    });
  }, []);

  const setMode = async (newMode: AppThemeMode) => {
    setModeState(newMode);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
  };

  const isDark = mode === 'system' ? systemColorScheme !== 'light' : mode === 'dark';
  const colors = isDark ? Palette.dark : Palette.light;

  return (
    <ThemeContext.Provider
      value={{
        mode,
        isDark,
        colors,
        setMode,
        typography: Typography,
        spacing: Spacing,
        borderRadius: BorderRadius,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
