import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Fonts } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  badge: string;
  headline: string;
  description: string;
  renderVisual: (colors: any, isDark: boolean) => React.ReactNode;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { setOnboardingCompleted, isAuthenticated } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const SLIDES: OnboardingSlide[] = [
    {
      id: 'library',
      badge: 'YOUR PERSONAL LIBRARY',
      headline: 'Every book.\nOne beautiful home.',
      description:
        'Bring your reading collection together. Import your own PDF and EPUB books and organize them into a library that feels like yours.',
      renderVisual: (themeColors) => (
        <View style={styles.visualContainer}>
          {/* Main Bookcase Card */}
          <View style={[styles.visualCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <View style={styles.visualHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image
                  source={require('../../assets/libora.png')}
                  style={{ width: 28, height: 28, borderRadius: 6, marginRight: 8 }}
                  resizeMode="contain"
                />
                <Text style={[styles.visualCardTitle, { color: themeColors.textPrimary }]}>Personal Library</Text>
              </View>
              <View style={[styles.pillBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Text style={[styles.pillBadgeText, { color: themeColors.accent }]}>Local & Private</Text>
              </View>
            </View>

            {/* Collection Shelves */}
            <View style={styles.shelvesRow}>
              {[
                { name: 'Fiction', count: 12, icon: 'book', color: '#B45309' },
                { name: 'Technology', count: 8, icon: 'code-slash', color: '#2563EB' },
                { name: 'Favorites', count: 5, icon: 'heart', color: '#DC2626' },
              ].map((c, i) => (
                <View
                  key={i}
                  style={[styles.shelfCard, { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.border }]}
                >
                  <Ionicons name={c.icon as any} size={18} color={c.color} style={{ marginBottom: 6 }} />
                  <Text style={[styles.shelfName, { color: themeColors.textPrimary }]}>{c.name}</Text>
                  <Text style={[styles.shelfCount, { color: themeColors.textSecondary }]}>{c.count} items</Text>
                </View>
              ))}
            </View>

            {/* Simulated Book Spines */}
            <View style={[styles.bookshelfDeck, { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.border }]}>
              <View style={[styles.bookSpine, { backgroundColor: '#F59E0B', width: 24, height: 64 }]} />
              <View style={[styles.bookSpine, { backgroundColor: '#10B981', width: 28, height: 72 }]} />
              <View style={[styles.bookSpine, { backgroundColor: '#3B82F6', width: 22, height: 58 }]} />
              <View style={[styles.bookSpine, { backgroundColor: '#8B5CF6', width: 26, height: 68 }]} />
              <View style={[styles.bookSpine, { backgroundColor: '#EC4899', width: 20, height: 62 }]} />
              <View style={[styles.bookSpine, { backgroundColor: '#E2E8F0', width: 30, height: 74 }]} />
            </View>
          </View>
        </View>
      ),
    },
    {
      id: 'reader',
      badge: 'READING, YOUR WAY',
      headline: 'Make every page\nyours.',
      description:
        'Read comfortably, track your progress, save bookmarks, highlight meaningful passages, and capture notes as you go.',
      renderVisual: (themeColors) => (
        <View style={styles.visualContainer}>
          {/* Reader Mockup Card */}
          <View style={[styles.visualCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <View style={styles.readerPageHeader}>
              <Text style={[styles.readerBookTitle, { color: themeColors.textSecondary }]}>Meditations · Book IV</Text>
              <Text style={[styles.readerPageNo, { color: themeColors.accent }]}>Page 42</Text>
            </View>

            {/* Passage with highlighted text */}
            <View style={styles.passageContainer}>
              <Text style={[styles.regularPassageText, { color: themeColors.textPrimary }]}>
                "Dwell on the beauty of life. Watch the stars, and see yourself running with them.{' '}
                <Text style={{ backgroundColor: 'rgba(253, 224, 71, 0.4)', borderRadius: 2 }}>
                  Think constantly of the changes of the elements into one another.
                </Text>
                "
              </Text>
            </View>

            {/* Floating Marginalia Note Card */}
            <View style={[styles.noteCard, { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.accent }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="pencil" size={13} color={themeColors.accent} style={{ marginRight: 6 }} />
                <Text style={[styles.noteAuthor, { color: themeColors.accent }]}>Marginalia Note</Text>
              </View>
              <Text style={[styles.noteContent, { color: themeColors.textPrimary }]}>
                Remember Marcus' advice on perspective during chaotic weeks.
              </Text>
            </View>

            {/* Reading progress bar */}
            <View style={styles.progressRow}>
              <View style={[styles.progressTrack, { backgroundColor: themeColors.border }]}>
                <View style={[styles.progressBar, { width: '68%', backgroundColor: themeColors.accent }]} />
              </View>
              <Text style={[styles.progressPercent, { color: themeColors.textSecondary }]}>68%</Text>
            </View>
          </View>
        </View>
      ),
    },
    {
      id: 'journal',
      badge: 'REMEMBER WHAT YOU READ',
      headline: 'Turn reading\ninto a habit.',
      description:
        'Collect memorable quotes, set reading goals, explore books, and reflect on your reading journey with personal statistics and reviews.',
      renderVisual: (themeColors) => (
        <View style={styles.visualContainer}>
          {/* Reflection Card */}
          <View style={[styles.visualCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            {/* Streak & Stats Row */}
            <View style={styles.streakRow}>
              <View style={[styles.streakBox, { backgroundColor: themeColors.surfaceSubtle }]}>
                <Ionicons name="flame" size={20} color="#F59E0B" />
                <Text style={[styles.streakNumber, { color: themeColors.textPrimary }]}>14</Text>
                <Text style={[styles.streakLabel, { color: themeColors.textSecondary }]}>Day Streak</Text>
              </View>

              <View style={[styles.streakBox, { backgroundColor: themeColors.surfaceSubtle }]}>
                <Ionicons name="time" size={20} color="#10B981" />
                <Text style={[styles.streakNumber, { color: themeColors.textPrimary }]}>25m</Text>
                <Text style={[styles.streakLabel, { color: themeColors.textSecondary }]}>Daily Goal</Text>
              </View>

              <View style={[styles.streakBox, { backgroundColor: themeColors.surfaceSubtle }]}>
                <Ionicons name="star" size={20} color="#F59E0B" />
                <Text style={[styles.streakNumber, { color: themeColors.textPrimary }]}>4.5★</Text>
                <Text style={[styles.streakLabel, { color: themeColors.textSecondary }]}>Avg Rating</Text>
              </View>
            </View>

            {/* Aesthetic Quote Card */}
            <View style={[styles.quoteCard, { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.border }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={themeColors.accent} style={{ marginBottom: 6 }} />
              <Text style={[styles.quoteText, { color: themeColors.textPrimary }]}>
                "A reader lives a thousand lives before he dies."
              </Text>
              <Text style={[styles.quoteAuthor, { color: themeColors.textSecondary }]}>
                — George R.R. Martin
              </Text>
            </View>
          </View>
        </View>
      ),
    },
  ];

  const handleFinishOnboarding = async () => {
    await setOnboardingCompleted(true);
    if (isAuthenticated) {
      router.replace('/(tabs)');
    } else {
      router.replace('/auth/choice');
    }
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    } else {
      handleFinishOnboarding();
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index >= 0 && index < SLIDES.length && index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Top Header Row with Skip Button on slides 0 & 1 */}
      <View style={styles.topNav}>
        <View style={styles.brandTitleWrap}>
          <Image
            source={require('../../assets/libora.png')}
            style={styles.navLogo}
            resizeMode="contain"
          />
          <Text style={[styles.navBrand, { color: colors.textPrimary }]}>LIBORA</Text>
        </View>

        {currentIndex < SLIDES.length - 1 ? (
          <TouchableOpacity
            onPress={handleFinishOnboarding}
            style={[styles.skipButton, { backgroundColor: colors.surfaceSubtle }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 48 }} />
        )}
      </View>

      {/* Swipeable Carousel */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            {/* Visual element preview */}
            {item.renderVisual(colors, isDark)}

            {/* Typography Content */}
            <View style={styles.textContent}>
              <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)' }]}>
                <Text style={[styles.badgeText, { color: colors.accent }]}>{item.badge}</Text>
              </View>
              <Text style={[styles.headline, { color: colors.textPrimary }]}>{item.headline}</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {item.description}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Bottom Controls: Indicators & Action Buttons */}
      <View style={[styles.bottomBar, { borderTopColor: colors.border }]}>
        {/* Pagination Dots */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentIndex ? colors.accent : colors.border,
                  width: i === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.accent }]}
          activeOpacity={0.88}
          onPress={handleNext}
        >
          <Text style={styles.primaryButtonText}>
            {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
          </Text>
          <Ionicons
            name={currentIndex === SLIDES.length - 1 ? 'arrow-forward' : 'chevron-forward'}
            size={18}
            color="#FFFFFF"
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  brandTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navLogo: {
    width: 26,
    height: 26,
    borderRadius: 6,
    marginRight: 8,
  },
  navBrand: {
    fontFamily: Fonts.serifBold,
    fontSize: 16,
    letterSpacing: 2,
    fontWeight: '800',
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  skipText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    fontWeight: '600',
  },
  slide: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  visualContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  visualCard: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  visualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  visualCardTitle: {
    fontFamily: Fonts.sansBold,
    fontSize: 15,
    fontWeight: '700',
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  shelvesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  shelfCard: {
    flex: 1,
    marginHorizontal: 3,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  shelfName: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  shelfCount: {
    fontFamily: Fonts.sansRegular,
    fontSize: 10,
  },
  bookshelfDeck: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  bookSpine: {
    borderRadius: 3,
  },
  readerPageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  readerBookTitle: {
    fontFamily: Fonts.serifItalic,
    fontSize: 12,
  },
  readerPageNo: {
    fontFamily: Fonts.sansBold,
    fontSize: 12,
    fontWeight: '700',
  },
  passageContainer: {
    marginBottom: 14,
  },
  regularPassageText: {
    fontFamily: Fonts.serif,
    fontSize: 14,
    lineHeight: 22,
  },
  noteCard: {
    borderLeftWidth: 3,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  noteAuthor: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    fontWeight: '700',
  },
  noteContent: {
    fontFamily: Fonts.sansRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercent: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    fontWeight: '700',
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  streakBox: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  streakNumber: {
    fontFamily: Fonts.sansBold,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  streakLabel: {
    fontFamily: Fonts.sansRegular,
    fontSize: 10,
    marginTop: 1,
  },
  quoteCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  quoteText: {
    fontFamily: Fonts.serifItalic,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  quoteAuthor: {
    fontFamily: Fonts.sansMedium,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  textContent: {
    paddingBottom: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  badgeText: {
    fontFamily: Fonts.sansBold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headline: {
    fontFamily: Fonts.serifBold,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 33,
    marginBottom: 10,
  },
  description: {
    fontFamily: Fonts.sansRegular,
    fontSize: 14,
    lineHeight: 21,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: Fonts.sansBold,
    fontSize: 14,
    fontWeight: '700',
  },
});
