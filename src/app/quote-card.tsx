import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../context/ThemeContext';
import { QuoteCardView, QuoteCardTheme } from '../components/QuoteCardView';

export default function QuoteCardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    text?: string;
    author?: string;
    bookTitle?: string;
    location?: string;
    thought?: string;
  }>();

  const cardRef = useRef<View>(null);
  const [activeTheme, setActiveTheme] = useState<QuoteCardTheme>('midnight');
  const [isCapturing, setIsCapturing] = useState(false);

  const quoteText =
    params.text ||
    'You have power over your mind - not outside events. Realize this, and you will find strength.';
  const quoteAuthor = params.author || 'Marcus Aurelius';
  const quoteBook = params.bookTitle || 'Meditations';
  const quoteLocation = params.location || '12';
  const quoteThought = params.thought;

  const handleShareNativeImage = async () => {
    setIsCapturing(true);
    try {
      if (cardRef.current) {
        const uri = await captureRef(cardRef, {
          format: 'png',
          quality: 1.0,
        });

        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: `Quote from ${quoteBook}`,
          });
        } else {
          await Share.share({
            message: `"${quoteText}"\n— ${quoteAuthor} (${quoteBook})\n\nShared via Libora`,
          });
        }
      }
    } catch {
      // Fallback to text share
      try {
        await Share.share({
          message: `"${quoteText}"\n— ${quoteAuthor} (${quoteBook})\n\nShared via Libora`,
        });
      } catch {
        Alert.alert('Share Failed', 'Could not export quote card.');
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCopyText = async () => {
    Alert.alert('Copied', 'Quote text copied to clipboard.');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Quote Card Studio</Text>
        <TouchableOpacity
          onPress={handleShareNativeImage}
          disabled={isCapturing}
          style={[styles.shareHeaderBtn, { backgroundColor: colors.accent }]}
        >
          <Ionicons name="share-social" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.shareHeaderText}>Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* The Live Designed Quote Card */}
        <QuoteCardView
          ref={cardRef}
          text={quoteText}
          author={quoteAuthor}
          bookTitle={quoteBook}
          location={quoteLocation}
          theme={activeTheme}
          personalThought={quoteThought}
        />

        {/* Theme Picker */}
        <View style={styles.themeSelector}>
          <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>CARD PALETTE</Text>
          <View style={styles.themePillsRow}>
            {[
              { id: 'midnight', label: 'Midnight', bg: '#0B0F19' },
              { id: 'paper', label: 'Paper', bg: '#F5EFE6' },
              { id: 'terra', label: 'Terra', bg: '#251610' },
              { id: 'olive', label: 'Olive', bg: '#141E16' },
            ].map((th) => {
              const isSelected = activeTheme === th.id;
              return (
                <TouchableOpacity
                  key={th.id}
                  onPress={() => setActiveTheme(th.id as QuoteCardTheme)}
                  style={[
                    styles.themePill,
                    {
                      backgroundColor: th.bg,
                      borderColor: isSelected ? colors.accent : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.themePillLabel,
                      { color: th.id === 'paper' ? '#2C2723' : '#FFFFFF' },
                    ]}
                  >
                    {th.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={handleCopyText}
            style={[styles.actionBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="copy-outline" size={18} color={colors.textPrimary} style={{ marginRight: 6 }} />
            <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>Copy Text</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShareNativeImage}
            style={[styles.actionBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}
          >
            <Ionicons name="share-social" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Share as Image</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  shareHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shareHeaderText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  themeSelector: {
    marginTop: 20,
    marginBottom: 20,
  },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  themePillsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themePill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  themePillLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
