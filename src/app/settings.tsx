import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { useReader } from '../context/ReaderContext';
import { StorageService } from '../storage';
import { Header } from '../components/Header';
import { DeviceScannerModal } from '../components/DeviceScannerModal';

export default function SettingsScreen() {
  const router = useRouter();
  const { mode, setMode, colors } = useTheme();
  const { user, profile, isAuthenticated, signOut } = useAuth();
  const { refreshLibrary } = useLibrary();
  const { settings } = useReader();

  const handleExportData = async () => {
    try {
      const [h, n, q, b] = await Promise.all([
        StorageService.getHighlights(),
        StorageService.getNotes(),
        StorageService.getQuotes(),
        StorageService.getBooks(),
      ]);

      const archiveData = {
        exportedAt: new Date().toISOString(),
        profile,
        booksCount: b.length,
        highlightsCount: h.length,
        notesCount: n.length,
        quotesCount: q.length,
        highlights: h,
        notes: n,
        quotes: q,
      };

      await Share.share({
        message: JSON.stringify(archiveData, null, 2),
        title: 'Libora Reading Archive Export',
      });
    } catch {
      Alert.alert('Export Failed', 'Could not export reading data.');
    }
  };

  const [scannerVisible, setScannerVisible] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header title="Settings" showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APPEARANCE</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="moon-outline" size={20} color={colors.accent} />
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Theme Mode</Text>
              </View>
              <View style={styles.themeToggleRow}>
                {(['dark', 'light', 'system'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setMode(m)}
                    style={[
                      styles.modePill,
                      {
                        backgroundColor: mode === m ? colors.accent : colors.surfaceSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modePillText,
                        { color: mode === m ? '#FFFFFF' : colors.textSecondary },
                      ]}
                    >
                      {m === 'dark' ? 'Dark' : m === 'light' ? 'Light' : 'Auto'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Reader Defaults Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            DEFAULT READER PREFERENCES
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="color-palette-outline" size={20} color={colors.accent} />
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Reader Color</Text>
              </View>
              <Text style={[styles.rowValue, { color: colors.accent }]}>
                {settings.theme.toUpperCase()}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="text-outline" size={20} color={colors.accent} />
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Default Font</Text>
              </View>
              <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
                {settings.fontFamily === 'serif' ? 'Serif (Classic)' : 'Sans-Serif'}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="resize-outline" size={20} color={colors.accent} />
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Default Size</Text>
              </View>
              <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
                {settings.fontSize} pt
              </Text>
            </View>
          </View>
        </View>

        {/* Device Book Scanner */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DEVICE STORAGE & IMPORT</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity onPress={() => setScannerVisible(true)} style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="folder-open-outline" size={20} color={colors.accent} />
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Scan Phone Folders for Books</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Cloud & Data Management */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ACCOUNT & KNOWLEDGE DATA
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {isAuthenticated ? (
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Ionicons name="cloud-done-outline" size={20} color="#10B981" />
                  <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Account</Text>
                </View>
                <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
                  {user?.email}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => router.push('/auth/login' as any)}
                style={styles.row}
              >
                <View style={styles.rowLeft}>
                  <Ionicons name="log-in-outline" size={20} color={colors.accent} />
                  <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Sign In to Cloud</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity onPress={handleExportData} style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="download-outline" size={20} color={colors.accent} />
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                  Export Reading Archive (JSON)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {isAuthenticated && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <TouchableOpacity onPress={signOut} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text style={[styles.rowLabel, { color: '#EF4444' }]}>Sign Out</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* App Guide & Onboarding Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APP GUIDE & INTRODUCTION</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => router.push('/onboarding')}
              style={styles.row}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="compass-outline" size={20} color={colors.accent} />
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                  Replay Onboarding Guide
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              onPress={() => router.push('/setup' as any)}
              style={styles.row}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="sparkles-outline" size={20} color={colors.accent} />
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                  Update Reading Goals & Interests
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* About Libora */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ABOUT</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.aboutHeader}>
              <Text style={[styles.aboutBrand, { color: colors.accent }]}>LIBORA</Text>
              <Text style={[styles.aboutVersion, { color: colors.textMuted }]}>Version 1.0.0</Text>
            </View>
            <Text style={[styles.aboutTagline, { color: colors.textPrimary }]}>
              Read. Remember. Share.
            </Text>
            <Text style={[styles.aboutPhilosophy, { color: colors.textSecondary }]}>
              A book should not disappear from your life after you finish reading it. Libora preserves your reading journey, thoughts, reviews, highlights, and quotes.
            </Text>
          </View>
        </View>
      </ScrollView>

      <DeviceScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onBooksImported={() => refreshLibrary()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  themeToggleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  modePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  modePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  aboutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginBottom: 6,
  },
  aboutBrand: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  aboutVersion: {
    fontSize: 12,
  },
  aboutTagline: {
    fontSize: 14,
    fontWeight: '700',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  aboutPhilosophy: {
    fontSize: 12,
    lineHeight: 18,
    paddingBottom: 12,
  },
});
