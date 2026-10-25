import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLibrary } from '../../context/LibraryContext';
import { useReader } from '../../context/ReaderContext';
import { BookCover } from '../../components/BookCover';
import { ProgressBar } from '../../components/ProgressBar';
import { ReviewModal } from '../../components/ReviewModal';
import { Fonts } from '../../theme';
import { ReadingStatus } from '../../types';

export default function BookDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { books, setBookStatus, toggleFavorite, deleteBook, addReview, reviews } = useLibrary();
  const { highlights, notes, quotes, bookmarks } = useReader();

  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);

  const book = books.find((b) => b.id === id);

  if (!book) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={{ color: colors.textPrimary, fontSize: 16 }}>Book not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.accent, fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const bookHighlights = highlights.filter((h) => h.bookId === book.id);
  const bookNotes = notes.filter((n) => n.bookId === book.id);
  const bookQuotes = quotes.filter((q) => q.bookId === book.id);
  const bookBookmarks = bookmarks.filter((bm) => bm.bookId === book.id);
  const bookReview = reviews.find((r) => r.bookId === book.id);

  const percent = Math.round((book.readingProgress || 0) * 100);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Currently reading "${book.title}" by ${book.author} on Libora.`,
      });
    } catch {}
  };

  const handleDelete = () => {
    Alert.alert(
      'Remove Book',
      `Are you sure you want to remove "${book.title}" from your library? Local reading records and highlights will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deleteBook(book.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {book.title}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
            <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => toggleFavorite(book.id)} style={styles.headerBtn}>
            <Ionicons
              name={book.status === 'favorite' ? 'heart' : 'heart-outline'}
              size={22}
              color={book.status === 'favorite' ? '#EF4444' : colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Top Hero: Large Cover & Title */}
        <View style={styles.heroSection}>
          <BookCover
            coverUri={book.coverUri}
            title={book.title}
            author={book.author}
            width={140}
            height={210}
          />
          <Text style={[styles.bookTitle, { color: colors.textPrimary }]}>{book.title}</Text>
          <Text style={[styles.bookAuthor, { color: colors.accent }]}>By {book.author}</Text>

          {/* Format & Size badges */}
          <View style={styles.badgeRow}>
            <View style={[styles.tag, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                {book.format.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.tag, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                {book.pageCount} Pages
              </Text>
            </View>
            {book.fileSize > 0 && (
              <View style={[styles.tag, { backgroundColor: colors.surfaceSubtle }]}>
                <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                  {(book.fileSize / 1024 / 1024).toFixed(1)} MB
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Primary Reading Action */}
        <TouchableOpacity
          onPress={() => router.push(`/reader/${book.id}` as any)}
          style={[styles.primaryReadBtn, { backgroundColor: colors.accent }]}
        >
          <Ionicons name="book-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.primaryReadBtnText}>
            {percent > 0 ? `Continue Reading (${percent}%)` : 'Start Reading'}
          </Text>
        </TouchableOpacity>

        {/* Progress Card */}
        <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>Reading Progress</Text>
            <Text style={[styles.progressPercent, { color: colors.accent }]}>{percent}%</Text>
          </View>
          <ProgressBar progress={book.readingProgress} height={6} style={{ marginVertical: 10 }} />
          <Text style={[styles.progressSub, { color: colors.textMuted }]}>
            Page {book.currentPage} of {book.pageCount}
          </Text>
        </View>

        {/* Reading Status Selector */}
        <View style={styles.statusSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SHELF STATUS</Text>
          <View style={styles.statusRow}>
            {[
              { id: 'want-to-read', label: 'Want to Read' },
              { id: 'currently-reading', label: 'Reading' },
              { id: 'completed', label: 'Finished' },
            ].map((st) => {
              const isSelected = book.status === st.id;
              return (
                <TouchableOpacity
                  key={st.id}
                  onPress={() => setBookStatus(book.id, st.id as ReadingStatus)}
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: isSelected ? colors.accent : colors.surface,
                      borderColor: isSelected ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    {st.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Knowledge Stats Grid */}
        <View style={styles.knowledgeGrid}>
          <TouchableOpacity
            onPress={() => router.push('/highlights' as any)}
            style={[styles.knowledgeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="color-wand-outline" size={22} color={colors.accent} />
            <Text style={[styles.knowledgeNum, { color: colors.textPrimary }]}>
              {bookHighlights.length}
            </Text>
            <Text style={[styles.knowledgeLabel, { color: colors.textMuted }]}>Highlights</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/notes' as any)}
            style={[styles.knowledgeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="create-outline" size={22} color={colors.accent} />
            <Text style={[styles.knowledgeNum, { color: colors.textPrimary }]}>
              {bookNotes.length}
            </Text>
            <Text style={[styles.knowledgeLabel, { color: colors.textMuted }]}>Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/quote-card' as any)}
            style={[styles.knowledgeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.accent} />
            <Text style={[styles.knowledgeNum, { color: colors.textPrimary }]}>
              {bookQuotes.length}
            </Text>
            <Text style={[styles.knowledgeLabel, { color: colors.textMuted }]}>Quotes</Text>
          </TouchableOpacity>

          <View style={[styles.knowledgeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="bookmark-outline" size={22} color={colors.accent} />
            <Text style={[styles.knowledgeNum, { color: colors.textPrimary }]}>
              {bookBookmarks.length}
            </Text>
            <Text style={[styles.knowledgeLabel, { color: colors.textMuted }]}>Bookmarks</Text>
          </View>
        </View>

        {/* Review & Rating Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Your Review</Text>
            <TouchableOpacity onPress={() => setIsReviewModalVisible(true)}>
              <Text style={[styles.editReviewText, { color: colors.accent }]}>
                {bookReview ? 'Edit Review' : 'Write Review'}
              </Text>
            </TouchableOpacity>
          </View>

          {bookReview ? (
            <View style={[styles.reviewBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.reviewStarRow}>
                <Text style={[styles.starsText, { color: colors.accent }]}>
                  {'★'.repeat(Math.floor(bookReview.rating))} {bookReview.rating} / 5.0
                </Text>
                {bookReview.reaction && (
                  <View style={[styles.reactionBadge, { backgroundColor: colors.surfaceSubtle }]}>
                    <Text style={[styles.reactionBadgeText, { color: colors.accent }]}>
                      {bookReview.reaction}
                    </Text>
                  </View>
                )}
              </View>
              {bookReview.reviewText ? (
                <Text style={[styles.reviewContentText, { color: colors.textPrimary }]}>
                  "{bookReview.reviewText}"
                </Text>
              ) : null}
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setIsReviewModalVisible(true)}
              style={[styles.emptyReviewPrompt, { borderColor: colors.border }]}
            >
              <Ionicons name="star-outline" size={24} color={colors.accent} />
              <Text style={[styles.emptyReviewPromptText, { color: colors.textSecondary }]}>
                Rate this book and add your review to your reading diary
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Book Description */}
        {book.description ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>About the Book</Text>
            <Text style={[styles.descText, { color: colors.textSecondary }]}>
              {book.description}
            </Text>
          </View>
        ) : null}

        {/* Source Website Action */}
        <TouchableOpacity
          onPress={() => {
            const gutenbergId = book.id.startsWith('pg_') ? book.id.replace('pg_', '') : null;
            const targetUrl = gutenbergId
              ? `https://www.gutenberg.org/ebooks/${gutenbergId}`
              : `https://openlibrary.org/search?q=${encodeURIComponent(book.title + ' ' + book.author)}`;
            Linking.openURL(targetUrl);
          }}
          style={[styles.websiteOption, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
        >
          <Ionicons name="globe-outline" size={18} color={colors.accent} />
          <Text style={[styles.websiteOptionText, { color: colors.textPrimary }]}>
            Visit Source Website ({book.source === 'gutenberg' ? 'Project Gutenberg' : 'Open Library'})
          </Text>
          <Ionicons name="open-outline" size={15} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Delete Book Option */}
        <TouchableOpacity onPress={handleDelete} style={styles.deleteOption}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
          <Text style={styles.deleteText}>Remove from Library</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Review Modal */}
      <ReviewModal
        visible={isReviewModalVisible}
        bookId={book.id}
        bookTitle={book.title}
        author={book.author}
        coverUri={book.coverUri}
        existingReview={bookReview}
        onClose={() => setIsReviewModalVisible(false)}
        onSubmit={(revData) => {
          addReview({
            ...revData,
            id: bookReview?.id || `rev_${Date.now()}`,
            createdAt: bookReview?.createdAt || Date.now(),
            updatedAt: Date.now(),
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    flex: 1,
    fontSize: 16,
    marginHorizontal: 12,
    fontFamily: Fonts.serifBold,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  bookTitle: {
    fontSize: 22,
    fontFamily: Fonts.serifBold,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 28,
  },
  bookAuthor: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  primaryReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
  },
  primaryReadBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  progressCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressPercent: {
    fontSize: 15,
    fontWeight: '800',
  },
  progressSub: {
    fontSize: 12,
  },
  statusSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  knowledgeGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  knowledgeCard: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  knowledgeNum: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
  },
  knowledgeLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: Fonts.serifBold,
  },
  editReviewText: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
  },
  reviewBox: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  reviewStarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  starsText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  reactionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reactionBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  reviewContentText: {
    fontSize: 14,
    fontFamily: Fonts.serifItalic,
    lineHeight: 21,
  },
  emptyReviewPrompt: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyReviewPromptText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    marginTop: 6,
  },
  descText: {
    fontSize: 14,
    lineHeight: 21,
  },
  deleteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    marginTop: 10,
  },
  deleteText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  websiteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: 16,
  },
  websiteOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
