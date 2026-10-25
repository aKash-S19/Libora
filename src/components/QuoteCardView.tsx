import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type QuoteCardTheme = 'paper' | 'midnight' | 'terra' | 'olive';

interface QuoteCardViewProps {
  text: string;
  author: string;
  bookTitle: string;
  location?: number | string;
  theme?: QuoteCardTheme;
  personalThought?: string;
}

const THEME_STYLES: Record<QuoteCardTheme, { bg: string; text: string; subtext: string; accent: string; border: string }> = {
  paper: {
    bg: '#F5EFE6',
    text: '#2C2723',
    subtext: '#6A5E54',
    accent: '#B45309',
    border: '#E3D7C5',
  },
  midnight: {
    bg: '#0B0F19',
    text: '#F8FAFC',
    subtext: '#94A3B8',
    accent: '#F59E0B',
    border: '#1E293B',
  },
  terra: {
    bg: '#251610',
    text: '#FDF6F0',
    subtext: '#C49E85',
    accent: '#F97316',
    border: '#3D251A',
  },
  olive: {
    bg: '#141E16',
    text: '#F2F7F2',
    subtext: '#8BA18E',
    accent: '#34D399',
    border: '#243326',
  },
};

export const QuoteCardView = forwardRef<View, QuoteCardViewProps>(
  ({ text, author, bookTitle, location, theme = 'midnight', personalThought }, ref) => {
    const activeTheme = THEME_STYLES[theme] || THEME_STYLES.midnight;

    return (
      <View
        ref={ref}
        collapsable={false}
        style={[
          styles.card,
          {
            backgroundColor: activeTheme.bg,
            borderColor: activeTheme.border,
          },
        ]}
      >
        {/* Top Header Ornamental Quotes */}
        <View style={styles.quoteMarkRow}>
          <Text style={[styles.largeQuoteMark, { color: activeTheme.accent }]}>“</Text>
          <View style={[styles.ornamentLine, { backgroundColor: activeTheme.border }]} />
        </View>

        {/* Main Quote Text */}
        <Text
          style={[
            styles.quoteText,
            {
              color: activeTheme.text,
              fontSize: text.length > 180 ? 17 : 20,
              lineHeight: text.length > 180 ? 26 : 30,
            },
          ]}
        >
          {text}
        </Text>

        {/* Optional personal note / reflection */}
        {personalThought ? (
          <View
            style={[
              styles.thoughtContainer,
              { borderLeftColor: activeTheme.accent, backgroundColor: activeTheme.border + '44' },
            ]}
          >
            <Text style={[styles.thoughtText, { color: activeTheme.subtext }]}>
              "{personalThought}"
            </Text>
          </View>
        ) : null}

        {/* Author & Book Citation */}
        <View style={styles.citationContainer}>
          <Text style={[styles.authorName, { color: activeTheme.accent }]}>
            — {author}
          </Text>
          <Text style={[styles.bookDetails, { color: activeTheme.subtext }]}>
            {bookTitle} {location ? `· p. ${location}` : ''}
          </Text>
        </View>

        {/* Footer Brand Seal */}
        <View style={[styles.footer, { borderTopColor: activeTheme.border }]}>
          <View style={styles.brandRow}>
            <View style={[styles.brandDot, { backgroundColor: activeTheme.accent }]} />
            <Text style={[styles.brandTitle, { color: activeTheme.accent }]}>LIBORA</Text>
          </View>
          <Text style={[styles.brandTagline, { color: activeTheme.subtext }]}>
            Read. Remember. Share.
          </Text>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 24,
    marginVertical: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  quoteMarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  largeQuoteMark: {
    fontSize: 42,
    fontFamily: 'serif',
    lineHeight: 44,
    marginRight: 10,
  },
  ornamentLine: {
    flex: 1,
    height: 1,
  },
  quoteText: {
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontWeight: '500',
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  thoughtContainer: {
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  thoughtText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  citationContainer: {
    marginBottom: 20,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bookDetails: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  brandTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
  },
  brandTagline: {
    fontSize: 10,
    fontWeight: '500',
    fontStyle: 'italic',
  },
});
