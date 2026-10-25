import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLibrary } from '../../context/LibraryContext';
import { ImporterService } from '../../services/importer';
import { Fonts } from '../../theme';

const READING_CATEGORIES = [
  { id: 'fiction', label: 'Fiction', icon: 'book-outline' },
  { id: 'fantasy_scifi', label: 'Fantasy & Sci-Fi', icon: 'planet-outline' },
  { id: 'mystery', label: 'Mystery & Thriller', icon: 'search-outline' },
  { id: 'tech', label: 'Technology & Code', icon: 'code-slash-outline' },
  { id: 'science', label: 'Science & Nature', icon: 'leaf-outline' },
  { id: 'history', label: 'History & Biography', icon: 'hourglass-outline' },
  { id: 'self_dev', label: 'Self-Development', icon: 'bulb-outline' },
  { id: 'business', label: 'Business & Economics', icon: 'briefcase-outline' },
  { id: 'poetry', label: 'Poetry & Essays', icon: 'sparkles-outline' },
  { id: 'education', label: 'Education & Philosophy', icon: 'school-outline' },
];

const GOAL_OPTIONS = [
  { minutes: 10, label: '10 min / day', sub: 'Light reading habit' },
  { minutes: 20, label: '20 min / day', sub: 'Balanced daily practice' },
  { minutes: 30, label: '30 min / day', sub: 'Immersive book lover' },
  { minutes: 45, label: '45 min / day', sub: 'Deep reading master' },
];

export default function InitialSetupScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { profile, setSetupCompleted, saveUserPreferences, checkUsernameAvailable, updateUsername, updateProfile } = useAuth();
  const { refreshLibrary } = useLibrary();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [displayName, setDisplayName] = useState(profile.displayName || profile.username || 'Reader');
  const [username, setUsername] = useState(profile.username || '');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMsg, setUsernameMsg] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['fiction', 'tech']);
  const [selectedGoal, setSelectedGoal] = useState<number>(20);
  const [isImporting, setIsImporting] = useState(false);
  const [importedBookTitle, setImportedBookTitle] = useState<string | null>(null);

  // Debounced real-time DB availability check for username
  useEffect(() => {
    const clean = username.toLowerCase().trim();
    if (!clean) {
      setUsernameStatus('idle');
      setUsernameMsg('');
      return;
    }
    if (clean === profile.username) {
      setUsernameStatus('available');
      setUsernameMsg('Your current handle');
      return;
    }
    if (clean.length < 3) {
      setUsernameStatus('invalid');
      setUsernameMsg('Must be at least 3 characters');
      return;
    }
    if (clean.length > 20) {
      setUsernameStatus('invalid');
      setUsernameMsg('Cannot exceed 20 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      setUsernameStatus('invalid');
      setUsernameMsg('Letters, numbers, underscores only');
      return;
    }

    setUsernameStatus('checking');
    setUsernameMsg('Checking DB...');
    const timer = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailable(clean);
        if (res.available) {
          setUsernameStatus('available');
          setUsernameMsg(`@${clean} is available!`);
        } else {
          setUsernameStatus('taken');
          setUsernameMsg(res.reason || `@${clean} is already taken`);
        }
      } catch {
        setUsernameStatus('available');
        setUsernameMsg(`@${clean} is available offline`);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, profile.username, checkUsernameAvailable]);

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleStep1Continue = async () => {
    const cleanUsername = username.toLowerCase().trim();
    const cleanDisplay = displayName.trim();
    if (!cleanUsername) {
      Alert.alert('Required Field', 'Please choose your unique username handle.');
      return;
    }
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
      Alert.alert('Username Issue', usernameMsg || 'Please choose an available unique username.');
      return;
    }
    if (usernameStatus === 'checking') {
      Alert.alert('Please Wait', 'Verifying username with database...');
      return;
    }

    try {
      await updateUsername(cleanUsername);
      if (cleanDisplay) {
        await updateProfile({ displayName: cleanDisplay });
      }
    } catch {}

    setStep(2);
  };

  const handleFinish = async () => {
    try {
      await saveUserPreferences({
        readingInterests: selectedInterests,
        dailyGoalMinutes: selectedGoal,
      });
      await setSetupCompleted(true);
      router.replace('/(tabs)');
    } catch {
      router.replace('/(tabs)');
    }
  };

  const handleImportBook = async () => {
    setIsImporting(true);
    try {
      const book = await ImporterService.pickAndImportBook();
      if (book) {
        setImportedBookTitle(book.title);
        await refreshLibrary();
        Alert.alert('Book Added! 📚', `"${book.title}" is ready on your shelf.`);
      }
    } catch (e: any) {
      Alert.alert('Import Notice', e.message || 'Could not import selected document.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header Progress Bar */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.brandRow}>
          <Image
            source={require('../../../assets/libora.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.brandText, { color: colors.textPrimary }]}>LIBORA SETUP</Text>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          {[1, 2, 3, 4].map((s) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                {
                  backgroundColor: s === step ? colors.accent : s < step ? '#10B981' : colors.border,
                  width: s === step ? 22 : 8,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity onPress={handleFinish} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* STEP 1: Choose Username & Identity */}
        {step === 1 && (
          <View>
            <View style={styles.stepTitleSection}>
              <View style={[styles.stepBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <Text style={[styles.stepBadgeText, { color: colors.accent }]}>STEP 1 OF 4</Text>
              </View>
              <Text style={[styles.headline, { color: colors.textPrimary }]}>
                Choose your unique handle
              </Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Pick a unique username so fellow readers can find you, follow what you read, and explore your quotes.
              </Text>
            </View>

            <View style={[styles.identityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {/* Display Name */}
              <View style={{ marginBottom: 18 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>YOUR DISPLAY NAME</Text>
                <View style={[styles.inputBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="e.g. Leo Tolstoy"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                    style={[styles.textInput, { color: colors.textPrimary }]}
                  />
                </View>
              </View>

              {/* Unique Username */}
              <View>
                <View style={styles.fieldLabelRow}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>UNIQUE USERNAME</Text>
                  {usernameMsg ? (
                    <View style={styles.usernameStatusRow}>
                      {usernameStatus === 'checking' && (
                        <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 4 }} />
                      )}
                      {usernameStatus === 'available' && (
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 4 }} />
                      )}
                      {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                        <Ionicons name="alert-circle" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                      )}
                      <Text
                        style={[
                          styles.usernameStatusText,
                          {
                            color:
                              usernameStatus === 'available'
                                ? '#10B981'
                                : usernameStatus === 'checking'
                                ? colors.accent
                                : '#EF4444',
                          },
                        ]}
                      >
                        {usernameMsg}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor:
                        usernameStatus === 'available'
                          ? '#10B981'
                          : usernameStatus === 'taken' || usernameStatus === 'invalid'
                          ? '#EF4444'
                          : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.atPrefix, { color: colors.accent }]}>@</Text>
                  <TextInput
                    value={username}
                    onChangeText={(val) => setUsername(val.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="unique_reader"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.textInput, { color: colors.textPrimary }]}
                  />
                </View>
                <Text style={[styles.helperNote, { color: colors.textMuted }]}>
                  Live database availability check will ensure your @handle is 100% unique across Libora.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.accent, marginTop: 24 }]}
              onPress={handleStep1Continue}
            >
              <Text style={styles.primaryBtnText}>Continue to Interests</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: Choose Reading Interests */}
        {step === 2 && (
          <View>
            <View style={styles.stepTitleSection}>
              <View style={[styles.stepBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <Text style={[styles.stepBadgeText, { color: colors.accent }]}>STEP 2 OF 4</Text>
              </View>
              <Text style={[styles.headline, { color: colors.textPrimary }]}>
                What do you love to read?
              </Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Select topics to personalize your reading discovery and curated recommendations.
              </Text>
            </View>

            <View style={styles.categoriesGrid}>
              {READING_CATEGORIES.map((cat) => {
                const isSelected = selectedInterests.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => toggleInterest(cat.id)}
                    style={[
                      styles.categoryCard,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(245, 158, 11, 0.2)'
                            : 'rgba(245, 158, 11, 0.12)'
                          : colors.surface,
                        borderColor: isSelected ? colors.accent : colors.border,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={20}
                      color={isSelected ? colors.accent : colors.textSecondary}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        {
                          color: isSelected ? colors.accent : colors.textPrimary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {cat.label}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={colors.accent}
                        style={{ marginLeft: 'auto' }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.accent, marginTop: 24 }]}
              onPress={() => setStep(3)}
            >
              <Text style={styles.primaryBtnText}>Continue to Goal</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: Set Reading Goal */}
        {step === 3 && (
          <View>
            <View style={styles.stepTitleSection}>
              <View style={[styles.stepBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <Text style={[styles.stepBadgeText, { color: colors.accent }]}>STEP 3 OF 4</Text>
              </View>
              <Text style={[styles.headline, { color: colors.textPrimary }]}>
                Set your daily reading goal
              </Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Reading just a few minutes every day builds lifelong focus. You can adjust this anytime in Settings.
              </Text>
            </View>

            <View style={styles.goalsWrap}>
              {GOAL_OPTIONS.map((g) => {
                const isSelected = selectedGoal === g.minutes;
                return (
                  <TouchableOpacity
                    key={g.minutes}
                    onPress={() => setSelectedGoal(g.minutes)}
                    style={[
                      styles.goalCard,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(245, 158, 11, 0.18)'
                            : 'rgba(245, 158, 11, 0.1)'
                          : colors.surface,
                        borderColor: isSelected ? colors.accent : colors.border,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <View style={styles.goalIconWrap}>
                      <Ionicons
                        name="time-outline"
                        size={22}
                        color={isSelected ? colors.accent : colors.textSecondary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.goalTitle, { color: colors.textPrimary }]}>{g.label}</Text>
                      <Text style={[styles.goalSub, { color: colors.textSecondary }]}>{g.sub}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.skipStepBtn} onPress={() => setStep(4)}>
                <Text style={[styles.skipStepText, { color: colors.textSecondary }]}>Skip for now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.accent, flex: 1, marginLeft: 12 }]}
                onPress={() => setStep(4)}
              >
                <Text style={styles.primaryBtnText}>Continue to Library</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 4: Build Your Library */}
        {step === 4 && (
          <View>
            <View style={styles.stepTitleSection}>
              <View style={[styles.stepBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <Text style={[styles.stepBadgeText, { color: colors.accent }]}>STEP 4 OF 4</Text>
              </View>
              <Text style={[styles.headline, { color: colors.textPrimary }]}>
                Build your bookshelf
              </Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Import your own EPUB or PDF books from device storage, or discover free public-domain classics.
              </Text>
            </View>

            {/* Privacy Reminder Card */}
            <View style={[styles.privacyCallout, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="shield-checkmark" size={20} color="#10B981" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.privacyCalloutTitle, { color: colors.textPrimary }]}>
                  Device-Only Privacy
                </Text>
                <Text style={[styles.privacyCalloutSub, { color: colors.textSecondary }]}>
                  Your book files stay on your device. Libora never uploads your EPUBs or PDFs to the cloud.
                </Text>
              </View>
            </View>

            {/* Option A: Import Book */}
            <TouchableOpacity
              style={[styles.libraryOptionCard, { backgroundColor: colors.surface, borderColor: colors.accent }]}
              onPress={handleImportBook}
              disabled={isImporting}
              activeOpacity={0.85}
            >
              <View style={[styles.optionIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                {isImporting ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Ionicons name="folder-open-outline" size={26} color={colors.accent} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                  {importedBookTitle ? 'Import Another Book' : 'Import Books from Device'}
                </Text>
                <Text style={[styles.optionSub, { color: colors.textSecondary }]}>
                  {importedBookTitle
                    ? `Added: "${importedBookTitle}"`
                    : 'Tap to pick EPUB, PDF, or TXT documents'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Option B: Explore Free Classics */}
            <TouchableOpacity
              style={[styles.libraryOptionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={async () => {
                await handleFinish();
                router.push('/(tabs)/browse');
              }}
              activeOpacity={0.85}
            >
              <View style={[styles.optionIconBox, { backgroundColor: colors.surfaceSubtle }]}>
                <Ionicons name="sparkles-outline" size={26} color={colors.textPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                  Explore Free Books
                </Text>
                <Text style={[styles.optionSub, { color: colors.textSecondary }]}>
                  Browse thousands of free classics (Plato, Kafka, Austen, Doyle)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Finish Button */}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.accent, marginTop: 24 }]}
              onPress={handleFinish}
            >
              <Text style={styles.primaryBtnText}>Enter Libora Home</Text>
              <Ionicons name="checkmark-done" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 24,
    height: 24,
    borderRadius: 6,
    marginRight: 8,
  },
  brandText: {
    fontFamily: Fonts.sansBold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    height: 6,
    borderRadius: 3,
  },
  skipBtn: {
    padding: 6,
  },
  skipText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  stepTitleSection: {
    marginBottom: 24,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  stepBadgeText: {
    fontFamily: Fonts.sansBold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headline: {
    fontFamily: Fonts.serifBold,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  description: {
    fontFamily: Fonts.sansRegular,
    fontSize: 14,
    lineHeight: 21,
  },
  categoriesGrid: {
    gap: 10,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  categoryText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
  },
  goalsWrap: {
    gap: 12,
    marginBottom: 20,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
  },
  goalIconWrap: {
    marginRight: 14,
  },
  goalTitle: {
    fontFamily: Fonts.sansBold,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  goalSub: {
    fontFamily: Fonts.sansRegular,
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  skipStepBtn: {
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  skipStepText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    fontWeight: '600',
  },
  privacyCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  privacyCalloutTitle: {
    fontFamily: Fonts.sansBold,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  privacyCalloutSub: {
    fontFamily: Fonts.sansRegular,
    fontSize: 12,
    lineHeight: 16,
  },
  libraryOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  optionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionTitle: {
    fontFamily: Fonts.sansBold,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  optionSub: {
    fontFamily: Fonts.sansRegular,
    fontSize: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontFamily: Fonts.sansBold,
    fontSize: 15,
    fontWeight: '700',
  },
  identityCard: {
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 20,
    marginBottom: 8,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
    letterSpacing: 1,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  textInput: {
    flex: 1,
    fontFamily: Fonts.sansRegular,
    fontSize: 14,
    height: '100%',
  },
  atPrefix: {
    fontSize: 16,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
    marginRight: 4,
  },
  usernameStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameStatusText: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
    fontWeight: '600',
  },
  helperNote: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
    marginTop: 8,
    lineHeight: 15,
  },
});
