import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ProgressBarProps {
  progress: number; // 0 to 1
  height?: number;
  color?: string;
  trackColor?: string;
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 4,
  color,
  trackColor,
  style,
}) => {
  const { colors } = useTheme();
  const clampedProgress = Math.min(1, Math.max(0, isNaN(progress) ? 0 : progress));

  return (
    <View
      style={[
        styles.track,
        {
          height,
          backgroundColor: trackColor || (colors.border),
          borderRadius: height / 2,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clampedProgress * 100}%`,
            height,
            backgroundColor: color || colors.accent,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
