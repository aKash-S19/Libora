import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLibrary } from '../../context/LibraryContext';
import { useAuth } from '../../context/AuthContext';
import { BookCover } from '../../components/BookCover';
import { ProgressBar } from '../../components/ProgressBar';
import { BookCard } from '../../components/BookCard';
import { DeviceScannerModal } from '../../components/DeviceScannerModal';
import { Fonts } from '../../theme';
import { Book } from '../../types';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { books, refreshLibrary, importLocalBook, deleteBook } = useLibrary();
  const { profile } = useAuth();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Automatically refresh library data when user returns to Home screen
  useFocusEffect(
    useCallback(() => {
      refreshLibrary();
    }, [refreshLibrary])
  );

  const handleImportLocal = async () => {
    setIsImporting(true);
    try {
      const book = await importLocalBook();
      if (book) {
        Alert.alert(
          'Book Imported Successfully',
          `"${book.title}" was added to your library.`,
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Read Now',
              onPress: () => router.push(`/reader/${book.id}` as any),
            },
          ]
        );
      }
    } catch (e: any) {
      Alert.alert('Import Failed', e.message || 'Could not import the selected file.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleContinueBookLongPress = (book: Book) => {
    Alert.alert(
      book.title,
      `By ${book.author}\n\nChoose an action:`,
      [
        {
          text: 'Read Now',
          onPress: () => router.push(`/reader/${book.id}` as any),
        },
        {
          text: 'Book Details',
          onPress: () => router.push(`/book/${book.id}` as any),
        },
        {
          text: 'Delete from Library',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Remove Book',
              `Are you sure you want to remove "${book.title}" from your library? Downloaded files, notes, and reading progress will be deleted.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteBook(book.id);
                    } catch (e: any) {
                      Alert.alert('Error', e.message || 'Failed to remove book.');
                    }
                  },
                },
              ]
            );
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // Find continue reading book strictly sorted by most recent lastReadAt
  const continueBook = useMemo(() => {
    if (!books || books.length === 0) return null;

    // Books with lastReadAt timestamp, sorted most recently read first
    const readBooks = books
      .filter((b) => typeof b.lastReadAt === 'number' && b.lastReadAt > 0)
      .sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0));

    if (readBooks.length > 0) {
      return readBooks[0];
    }

    // Fallback: books with reading progress > 0
    const inProgressBooks = books
      .filter((b) => b.status === 'currently-reading' || b.readingProgress > 0)
      .sort((a, b) => (b.lastReadAt || b.addedAt) - (a.lastReadAt || a.addedAt));

    if (inProgressBooks.length > 0) {
      return inProgressBooks[0];
    }

    // Fallback: most recently added book
    return [...books].sort((a, b) => b.addedAt - a.addedAt)[0];
  }, [books]);

  const currentlyReading = useMemo(() => {
    return books
      .filter((b) => b.status === 'currently-reading' || (b.readingProgress > 0 && b.readingProgress < 1))
      .sort((a, b) => (b.lastReadAt || b.addedAt) - (a.lastReadAt || a.addedAt));
  }, [books]);

  const recentlyAdded = useMemo(() => {
    return [...books].sort((a, b) => b.addedAt - a.addedAt).slice(0, 5);
  }, [books]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Editorial Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.brandText, { color: colors.accent }]}>LIBORA</Text>
          <Text style={[styles.taglineText, { color: colors.textSecondary }]}>
            Your world of reading.
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={handleImportLocal}
            disabled={isImporting}
            style={[styles.headerImportBtn, { backgroundColor: colors.accent }]}
            activeOpacity={0.8}
          >
            {isImporting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="add" size={17} color="#FFFFFF" style={{ marginRight: 3 }} />
                <Text style={styles.headerImportBtnText}>Import</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/search' as any)}
            style={[styles.headerBtn, { backgroundColor: colors.surfaceSubtle }]}
          >
            <Ionicons name="search" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/downloads' as any)}
            style={[styles.headerBtn, { backgroundColor: colors.surfaceSubtle }]}
          >
            <Ionicons name="arrow-down" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Personalized Greeting & Reading Habit Card */}
        <View style={[styles.greetingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.greetingTextWrap}>
            <Text style={[styles.greetingSub, { color: colors.accent }]}>
              {greeting.toUpperCase()}
            </Text>
            <Text style={[styles.greetingTitle, { color: colors.textPrimary }]}>
              {profile?.displayName ? profile.displayName.split(' ')[0] : 'Reader'}
            </Text>
            <Text style={[styles.greetingMessage, { color: colors.textSecondary }]}>
              {books.length > 0
                ? 'Resume where you left off in your reading journey.'
                : 'Ready to discover and build your private sanctuary.'}
            </Text>
          </View>
          <View style={[styles.goalBadge, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
            <Ionicons name="flame" size={20} color={colors.accent} />
            <Text style={[styles.goalMinutes, { color: colors.textPrimary }]}>
              {profile?.dailyGoalMinutes || 20}m
            </Text>
            <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>Daily Goal</Text>
          </View>
        </View>

        {/* Beautiful Empty State when user has no books */}
        {books.length === 0 && (
          <View style={[styles.emptyLibraryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
              <Ionicons name="book-outline" size={36} color={colors.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Your Reading Sanctuary Awaits
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Your library is completely private and local. Import EPUB and PDF books from your device or explore thousands of free public-domain classics.
            </Text>

            <View style={styles.emptyActionsRow}>
              <TouchableOpacity
                style={[styles.emptyPrimaryBtn, { backgroundColor: colors.accent }]}
                onPress={handleImportLocal}
                disabled={isImporting}
                activeOpacity={0.88}
              >
                {isImporting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="arrow-up-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.emptyPrimaryBtnText}>Import Your First Book</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.emptySecondaryBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                onPress={() => router.push('/(tabs)/browse' as any)}
                activeOpacity={0.85}
              >
                <Ionicons name="compass-outline" size={18} color={colors.accent} style={{ marginRight: 6 }} />
                <Text style={[styles.emptySecondaryBtnText, { color: colors.textPrimary }]}>Discover Free Books</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Continue Reading Section */}
        {continueBook ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Continue Reading
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push(`/reader/${continueBook.id}` as any)}
              onLongPress={() => handleContinueBookLongPress(continueBook)}
              delayLongPress={400}
              style={[
                styles.continueCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <BookCover
                coverUri={continueBook.coverUri}
                title={continueBook.title}
                author={continueBook.author}
                width={86}
                height={126}
              />
              <View style={styles.continueDetails}>
                <Text numberOfLines={1} style={[styles.continueBookTitle, { color: colors.textPrimary }]}>
                  {continueBook.title}
                </Text>
                <Text numberOfLines={1} style={[styles.continueBookAuthor, { color: colors.textSecondary }]}>
                  {continueBook.author}
                </Text>

                <View style={styles.continueProgressRow}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <ProgressBar progress={continueBook.readingProgress} height={5} />
                  </View>
                  <Text style={[styles.continuePercentText, { color: colors.accent }]}>
                    {Math.round((continueBook.readingProgress || 0) * 100)}%
                  </Text>
                </View>

                <Text style={[styles.locationText, { color: colors.textMuted }]}>
                  Page {continueBook.currentPage} of {continueBook.pageCount}
                </Text>

                <TouchableOpacity
                  onPress={() => router.push(`/reader/${continueBook.id}` as any)}
                  style={[styles.resumeButton, { backgroundColor: colors.accent }]}
                >
                  <Ionicons name="play" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.resumeButtonText}>Resume Reading</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Device Scanner & Quick Import Card */}
        <View style={styles.section}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleImportLocal}
            disabled={isImporting}
            style={[
              styles.scannerActionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.accent,
                borderWidth: 1.5,
                marginBottom: 12,
              },
            ]}
          >
            <View style={[styles.scannerIconWrap, { backgroundColor: colors.accent }]}>
              {isImporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="document-text" size={24} color="#FFFFFF" />
              )}
            </View>
            <View style={styles.scannerTextWrap}>
              <View style={styles.scannerBadgeRow}>
                <Text style={[styles.scannerActionTitle, { color: colors.textPrimary, fontWeight: '700' }]}>
                  Import Book from Device
                </Text>
                <View style={[styles.miniBadge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.miniBadgeText}>1-TAP OPEN</Text>
                </View>
              </View>
              <Text style={[styles.scannerActionDesc, { color: colors.textSecondary }]}>
                Pick any PDF, EPUB, or TXT file to read distraction-free
              </Text>
            </View>
            <Ionicons name="add-circle" size={24} color={colors.accent} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setScannerVisible(true)}
            style={[styles.scannerActionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.scannerIconWrap, { backgroundColor: colors.accent + '1A' }]}>
              <Ionicons name="folder-open" size={24} color={colors.accent} />
            </View>
            <View style={styles.scannerTextWrap}>
              <View style={styles.scannerBadgeRow}>
                <Text style={[styles.scannerActionTitle, { color: colors.textPrimary }]}>
                  Scan Device for Books
                </Text>
                <View style={[styles.miniBadge, { backgroundColor: colors.surfaceSubtle }]}>
                  <Text style={[styles.miniBadgeText, { color: colors.textSecondary }]}>BATCH SCAN</Text>
                </View>
              </View>
              <Text style={[styles.scannerActionDesc, { color: colors.textSecondary }]}>
                Scan your phone's folders & batch import books instantly
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.hubActionRow}>
            <TouchableOpacity
              onPress={() => router.push('/quotes' as any)}
              style={[styles.hubSmallCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.accent} />
              <Text style={[styles.hubSmallTitle, { color: colors.textPrimary }]}>Quotes Studio</Text>
              <Text style={[styles.hubSmallSub, { color: colors.textMuted }]}>Visual Image Cards</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/community' as any)}
              style={[styles.hubSmallCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
            >
              <Ionicons name="people-outline" size={18} color={colors.accent} />
              <Text style={[styles.hubSmallTitle, { color: colors.textPrimary }]}>Find Readers</Text>
              <Text style={[styles.hubSmallSub, { color: colors.textMuted }]}>Follow & Friends</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.hubActionRow, { marginTop: 8 }]}>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/browse' as any)}
              style={[styles.hubSmallCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
            >
              <Ionicons name="cloud-download-outline" size={18} color={colors.accent} />
              <Text style={[styles.hubSmallTitle, { color: colors.textPrimary }]}>Download Classics</Text>
              <Text style={[styles.hubSmallSub, { color: colors.textMuted }]}>70,000+ Free Books</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(tabs)/library' as any)}
              style={[styles.hubSmallCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
            >
              <Ionicons name="library-outline" size={18} color={colors.accent} />
              <Text style={[styles.hubSmallTitle, { color: colors.textPrimary }]}>My Library</Text>
              <Text style={[styles.hubSmallSub, { color: colors.textMuted }]}>{books.length} Books on shelf</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Currently Reading Carousel */}
        {currentlyReading.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Currently Reading
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/library' as any)}>
                <Text style={[styles.viewAllText, { color: colors.accent }]}>View All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              data={currentlyReading}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => <BookCard book={item} mode="grid" />}
              contentContainerStyle={{ paddingVertical: 4 }}
            />
          </View>
        )}

        {/* Recently Added Carousel */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Recently Added
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/library' as any)}>
              <Text style={[styles.viewAllText, { color: colors.accent }]}>Library</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={recentlyAdded}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => <BookCard book={item} mode="grid" />}
            contentContainerStyle={{ paddingVertical: 4 }}
          />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  brandText: {
    fontSize: 20,
    fontFamily: Fonts.serifBold,
    letterSpacing: 3,
  },
  taglineText: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    fontStyle: 'italic',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerImportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 19,
  },
  headerImportBtnText: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  greetingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  greetingTextWrap: {
    flex: 1,
    marginRight: 14,
  },
  greetingSub: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  greetingTitle: {
    fontSize: 22,
    fontFamily: Fonts.serifBold,
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  greetingMessage: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    lineHeight: 16,
  },
  goalBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  goalMinutes: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    marginTop: 2,
  },
  goalLabel: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    marginTop: 1,
  },
  emptyLibraryCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.serifBold,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  emptyActionsRow: {
    width: '100%',
    gap: 10,
  },
  emptyPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
  },
  emptyPrimaryBtnText: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  emptySecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptySecondaryBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: Fonts.serifBold,
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
  },
  continueCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  continueDetails: {
    flex: 1,
    marginLeft: 16,
  },
  continueBookTitle: {
    fontSize: 16,
    fontFamily: Fonts.serifBold,
  },
  continueBookAuthor: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  continueProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  continuePercentText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  locationText: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    marginTop: 4,
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  resumeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  scannerActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  scannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  scannerTextWrap: {
    flex: 1,
  },
  scannerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scannerActionTitle: {
    fontSize: 15,
    fontFamily: Fonts.serifBold,
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  scannerActionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  hubActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  hubSmallCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  hubSmallTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  hubSmallSub: {
    fontSize: 11,
    marginTop: 2,
  },
});
