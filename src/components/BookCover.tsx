import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';

interface BookCoverProps {
  coverUri?: string;
  title: string;
  author: string;
  width?: number;
  height?: number;
  style?: ViewStyle;
}

// Curated harmonic palette for spine & background generation
const COVER_PALETTES = [
  { bg: '#1E293B', text: '#F8FAFC', accent: '#F59E0B' },
  { bg: '#312E81', text: '#EEF2FF', accent: '#818CF8' },
  { bg: '#064E3B', text: '#ECFDF5', accent: '#34D399' },
  { bg: '#701A75', text: '#FDF4FF', accent: '#F472B6' },
  { bg: '#7C2D12', text: '#FFF7ED', accent: '#FB923C' },
  { bg: '#134E4A', text: '#F0FDFA', accent: '#2DD4BF' },
  { bg: '#3B0764', text: '#FAF5FF', accent: '#C084FC' },
];

export const BookCover: React.FC<BookCoverProps> = ({
  coverUri,
  title,
  author,
  width = 110,
  height = 165,
  style,
}) => {
  // Deterministic palette based on title
  const charCodeSum = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const palette = COVER_PALETTES[charCodeSum % COVER_PALETTES.length];

  if (coverUri && (coverUri.startsWith('http') || coverUri.startsWith('file://'))) {
    return (
      <View style={[styles.container, { width, height }, style]}>
        <Image
          source={{ uri: coverUri }}
          style={styles.image}
          resizeMode="cover"
        />
        {/* Subtle spine shadow overlay */}
        <View style={styles.spineShadow} />
      </View>
    );
  }

  // Editorial Book Cover Design
  return (
    <View
      style={[
        styles.container,
        styles.customCover,
        { width, height, backgroundColor: palette.bg },
        style,
      ]}
    >
      {/* Book Spine border & shadow */}
      <View style={[styles.spineStripe, { backgroundColor: palette.accent }]} />
      <View style={styles.spineShadow} />

      <View style={styles.contentContainer}>
        <View style={styles.topOrnament}>
          <View style={[styles.dot, { backgroundColor: palette.accent }]} />
        </View>

        <Text
          numberOfLines={3}
          style={[
            styles.customTitle,
            { color: palette.text, fontSize: width > 120 ? 15 : 12 },
          ]}
        >
          {title}
        </Text>

        <View style={[styles.divider, { backgroundColor: palette.accent + '66' }]} />

        <Text
          numberOfLines={2}
          style={[
            styles.customAuthor,
            { color: palette.text + 'CC', fontSize: width > 120 ? 11 : 9 },
          ]}
        >
          {author}
        </Text>

        <View style={styles.bottomBranding}>
          <Text style={[styles.brandingText, { color: palette.accent }]}>LIBORA</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 6,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  spineShadow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  spineStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  customCover: {
    padding: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingLeft: 6,
    paddingRight: 4,
  },
  topOrnament: {
    alignItems: 'center',
    marginVertical: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  customTitle: {
    fontFamily: 'serif',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },
  divider: {
    height: 1,
    width: '40%',
    alignSelf: 'center',
    marginVertical: 4,
  },
  customAuthor: {
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomBranding: {
    alignItems: 'center',
    marginTop: 4,
  },
  brandingText: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
