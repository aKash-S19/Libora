import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLibrary } from '../../context/LibraryContext';
import { BookCover } from '../../components/BookCover';
import { ReviewModal } from '../../components/ReviewModal';
import { DiscoveryService, CURATED_PUBLIC_DOMAIN_BOOKS } from '../../services/discovery';
import { Fonts } from '../../theme';
import { Review, FreeBookSearchResult } from '../../types';

export const BRAND_AMBER = '#F59E0B';
export const BRAND_ROSE = '#EF4444';

export default function ReviewsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile, user } = useAuth();
  const { books, reviews, addReview, deleteReview, toggleReviewLike } = useLibrary();

  // Active view: 'search' (Search & log book) or 'feed' (Community diary stream)
  const [activeTab, setActiveTab] = useState<'search' | 'feed'>('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [remoteResults, setRemoteResults] = useState<FreeBookSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Review Modal State
  const [selectedBookForReview, setSelectedBookForReview] = useState<{
    id: string;
    title: string;
    author: string;
    coverUri?: string;
    year?: number;
    existingReview?: Review | null;
  } | null>(null);

  // Spoiler revelation map (reviewId -> boolean)
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  // Filter local books that match query
  const matchingLocalBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return books
      .filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
      .map(
        (b): FreeBookSearchResult => ({
          id: b.id,
          title: b.title,
          author: b.author,
          coverUrl: b.coverUri,
          description: `From your library · ${b.format.toUpperCase()} · ${b.pageCount || 0} pages`,
          source: 'openlibrary',
          format: b.format,
          downloadUrl: b.fileUri,
        })
      );
  }, [books, searchQuery]);

  // Combined search results: local library books first, then remote results
  const combinedSearchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const seen = new Set<string>();
    const list: FreeBookSearchResult[] = [];

    // Local library matches first
    for (const b of matchingLocalBooks) {
      seen.add(b.title.toLowerCase().trim());
      list.push(b);
    }

    // Remote matches
    for (const b of remoteResults) {
      const key = b.title.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(b);
      }
    }

    return list;
  }, [matchingLocalBooks, remoteResults, searchQuery]);

  // Debounced live search across Gutendex & Open Library
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setRemoteResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await DiscoveryService.searchAllOpenApis(q);
        setRemoteResults(results);
      } catch (e) {
        console.warn('Search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleOpenReviewModal = (bookItem: {
    id: string;
    title: string;
    author: string;
    coverUri?: string;
    year?: number;
  }) => {
    // Check if user already reviewed this book
    const existing = reviews.find(
      (r) =>
        r.bookId === bookItem.id ||
        (r.bookTitle.toLowerCase() === bookItem.title.toLowerCase() &&
          (!user || r.userId === user.uid || r.userId === profile.id || r.userId === 'guest_reader'))
    );

    setSelectedBookForReview({
      ...bookItem,
      existingReview: existing || null,
    });
  };

  const handleSaveReview = async (revData: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>) => {
    const existing = selectedBookForReview?.existingReview;
    const reviewId = existing
      ? existing.id
      : `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const reviewToSave: Review = {
      ...revData,
      id: reviewId,
      userId: user?.uid || profile?.id || 'guest_reader',
      username: profile?.username || 'reader',
      createdAt: existing ? existing.createdAt : Date.now(),
      updatedAt: Date.now(),
    };

    await addReview(reviewToSave);
    Alert.alert('Logged to Libora', `Review for "${revData.bookTitle}" saved.`);
    setSelectedBookForReview(null);
    setActiveTab('feed');
  };

  const handleDeleteReview = (review: Review) => {
    Alert.alert('Delete Review', `Remove your review for "${review.bookTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteReview(review.id);
        },
      },
    ]);
  };

  const toggleSpoiler = (reviewId: string) => {
    setRevealedSpoilers((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  };

  // Render Star Rating in Libora Amber Gold
  const renderStars = (rating: number) => {
    const whole = Math.floor(rating);
    const hasHalf = rating - whole >= 0.5;
    return (
      <View style={styles.starRow}>
        {Array.from({ length: 5 }).map((_, i) => {
          if (i < whole) {
            return <Ionicons key={i} name="star" size={15} color={colors.accent} />;
          } else if (i === whole && hasHalf) {
            return <Ionicons key={i} name="star-half" size={15} color={colors.accent} />;
          }
          return <Ionicons key={i} name="star-outline" size={15} color={colors.border} />;
        })}
      </View>
    );
  };

  // Render review feed card
  const renderReviewItem = ({ item }: { item: Review }) => {
    const isOwner =
      !user ||
      item.userId === user.uid ||
      item.userId === profile.id ||
      item.userId === 'guest_reader' ||
      item.username === profile.username;
    const isSpoilerHidden = item.containsSpoilers && !revealedSpoilers[item.id];

    return (
      <View
        style={[
          styles.reviewCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.reviewCardContent}>
          {/* Poster */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              if (item.bookId && !item.bookId.startsWith('ol_') && !item.bookId.startsWith('pg_')) {
                router.push(`/book/${item.bookId}` as any);
              } else {
                handleOpenReviewModal({
                  id: item.bookId,
                  title: item.bookTitle,
                  author: item.author,
                  coverUri: item.coverUri,
                });
              }
            }}
            style={styles.reviewPoster}
          >
            <BookCover
              coverUri={item.coverUri}
              title={item.bookTitle}
              author={item.author}
              width={70}
              height={105}
            />
          </TouchableOpacity>

          {/* Details */}
          <View style={styles.reviewDetails}>
            {/* User row */}
            <View style={styles.userRow}>
              <View style={[styles.avatarMini, { backgroundColor: colors.accent }]}>
                <Text style={styles.avatarMiniLetter}>
                  {(item.username || 'R')[0].toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.reviewUsername, { color: colors.textSecondary }]}>
                @{item.username}
              </Text>
              <Text style={[styles.reviewDate, { color: colors.textMuted }]}>
                {new Date(item.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>

              {isOwner ? (
                <TouchableOpacity
                  onPress={() => handleDeleteReview(item)}
                  style={styles.deleteReviewBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={15} color="#EF4444" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Book Title & Author */}
            <Text
              style={[styles.reviewBookTitle, { color: colors.textPrimary }]}
              numberOfLines={2}
            >
              {item.bookTitle}
            </Text>
            <Text style={[styles.reviewAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.author}
            </Text>

            {/* Rating & Heart */}
            <View style={styles.ratingHeartRow}>
              {renderStars(item.rating)}
              <Text style={[styles.ratingNumber, { color: colors.accent }]}>
                {item.rating.toFixed(1)}
              </Text>
              {item.liked ? (
                <Ionicons
                  name="heart"
                  size={15}
                  color="#EF4444"
                  style={{ marginLeft: 6 }}
                />
              ) : null}
            </View>

            {/* Reaction Pill */}
            {item.reaction ? (
              <View style={[styles.reactionBadge, { backgroundColor: colors.surfaceSubtle }]}>
                <Text style={[styles.reactionText, { color: colors.accent }]}>
                  {item.reaction}
                </Text>
              </View>
            ) : null}

            {/* Review Comment / Spoilers */}
            {item.reviewText ? (
              <View style={styles.commentBox}>
                {isSpoilerHidden ? (
                  <TouchableOpacity
                    onPress={() => toggleSpoiler(item.id)}
                    style={styles.spoilerWarningBox}
                  >
                    <Ionicons name="warning-outline" size={14} color="#F59E0B" />
                    <Text style={styles.spoilerWarningText}>Contains spoilers · Tap to reveal</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.reviewText, { color: colors.textPrimary }]}>
                    "{item.reviewText}"
                  </Text>
                )}
              </View>
            ) : null}

            {/* Footer / Social Actions */}
            <View style={[styles.reviewCardFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => toggleReviewLike(item.id)}
                style={styles.likeActionBtn}
              >
                <Ionicons
                  name={item.liked ? 'heart' : 'heart-outline'}
                  size={16}
                  color={item.liked ? '#EF4444' : colors.textMuted}
                />
                <Text style={[styles.likeActionText, { color: colors.textMuted }]}>
                  {item.likesCount || (item.liked ? 1 : 0)}
                </Text>
              </TouchableOpacity>

              {isOwner ? (
                <TouchableOpacity
                  onPress={() =>
                    setSelectedBookForReview({
                      id: item.bookId,
                      title: item.bookTitle,
                      author: item.author,
                      coverUri: item.coverUri,
                      existingReview: item,
                    })
                  }
                  style={styles.editActionBtn}
                >
                  <Text style={[styles.editActionText, { color: colors.accent }]}>Edit</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Render a catalog book item in search / discover mode
  const renderCatalogItem = ({ item }: { item: FreeBookSearchResult }) => {
    const existing = reviews.find(
      (r) => r.bookId === item.id || r.bookTitle.toLowerCase() === item.title.toLowerCase()
    );

    return (
      <View
        style={[
          styles.catalogCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <BookCover
          coverUri={item.coverUrl}
          title={item.title}
          author={item.author}
          width={64}
          height={94}
        />

        <View style={styles.catalogInfo}>
          <Text style={[styles.catalogTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.catalogAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.author} {item.year ? `· ${item.year}` : ''}
          </Text>

          {item.description ? (
            <Text style={[styles.catalogSubjects, { color: colors.textMuted }]} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}

          {existing ? (
            <View style={styles.alreadyReviewedRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
              <Text style={[styles.alreadyReviewedText, { color: colors.accent }]}>
                Logged ({existing.rating}★)
              </Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={() =>
            handleOpenReviewModal({
              id: item.id,
              title: item.title,
              author: item.author,
              coverUri: item.coverUrl,
              year: item.year,
            })
          }
          style={[
            styles.logButton,
            { backgroundColor: existing ? colors.surfaceSubtle : colors.accent },
          ]}
          activeOpacity={0.8}
        >
          <Ionicons
            name={existing ? 'create-outline' : 'star'}
            size={14}
            color={existing ? colors.textPrimary : '#FFFFFF'}
          />
          <Text
            style={[
              styles.logButtonText,
              { color: existing ? colors.textPrimary : '#FFFFFF' },
            ]}
          >
            {existing ? 'Edit' : 'Review'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header - Consistent with Libora Editorial Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.brandText, { color: colors.accent }]}>LIBORA REVIEWS</Text>
          <Text style={[styles.taglineText, { color: colors.textSecondary }]}>
            Social Reading Log & Reviews
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setActiveTab('search')}
          style={[styles.headerActionBtn, { backgroundColor: colors.accent }]}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={17} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.headerActionText}>Log Book</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Filter Pills */}
      <View style={[styles.pillBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('search')}
          style={[
            styles.pillChip,
            activeTab === 'search'
              ? { backgroundColor: colors.accent }
              : { backgroundColor: colors.surfaceSubtle },
          ]}
        >
          <Ionicons
            name={activeTab === 'search' ? 'search' : 'search-outline'}
            size={15}
            color={activeTab === 'search' ? '#FFFFFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.pillText,
              { color: activeTab === 'search' ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            Search & Log
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('feed')}
          style={[
            styles.pillChip,
            activeTab === 'feed'
              ? { backgroundColor: colors.accent }
              : { backgroundColor: colors.surfaceSubtle },
          ]}
        >
          <Ionicons
            name={activeTab === 'feed' ? 'newspaper' : 'newspaper-outline'}
            size={15}
            color={activeTab === 'feed' ? '#FFFFFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.pillText,
              { color: activeTab === 'feed' ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            Community Diary ({reviews.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'feed' ? (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={renderReviewItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
                <Ionicons name="star-outline" size={38} color={colors.accent} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Reviews Logged Yet
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                Search any book from Open Library, Gutenberg, or your bookshelf to rate it, add heart reactions, and write your diary thoughts.
              </Text>
              <TouchableOpacity
                onPress={() => setActiveTab('search')}
                style={[styles.emptyActionBtn, { backgroundColor: colors.accent }]}
              >
                <Ionicons name="search" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionText}>Search Books to Review</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <View style={{ flex: 1 }}>
          {/* Live Search Bar */}
          <View
            style={[
              styles.searchBarWrapper,
              { backgroundColor: colors.surface, borderBottomColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.searchInputBox,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="search"
                size={18}
                color={colors.textMuted}
                style={{ marginRight: 8 }}
              />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search any book, author, or classic to review..."
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.textPrimary }]}
                returnKeyType="search"
                autoFocus={combinedSearchResults.length === 0}
              />
              {isSearching ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : searchQuery ? (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Search Results or Curated Books */}
          <FlatList
            data={searchQuery.trim() ? combinedSearchResults : CURATED_PUBLIC_DOMAIN_BOOKS}
            keyExtractor={(item) => item.id}
            renderItem={renderCatalogItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View style={styles.catalogHeaderRow}>
                <Text style={[styles.catalogSectionTitle, { color: colors.textMuted }]}>
                  {searchQuery.trim()
                    ? `SEARCH RESULTS (${combinedSearchResults.length})`
                    : 'POPULAR CLASSICS TO REVIEW'}
                </Text>
              </View>
            }
            ListEmptyComponent={
              !isSearching && searchQuery.trim() ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    No Books Found
                  </Text>
                  <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                    Try searching with different keywords or author name.
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      )}

      {/* Review & Log Modal */}
      {selectedBookForReview && (
        <ReviewModal
          visible={!!selectedBookForReview}
          bookId={selectedBookForReview.id}
          bookTitle={selectedBookForReview.title}
          author={selectedBookForReview.author}
          coverUri={selectedBookForReview.coverUri}
          year={selectedBookForReview.year}
          existingReview={selectedBookForReview.existingReview}
          onClose={() => setSelectedBookForReview(null)}
          onSubmit={handleSaveReview}
        />
      )}
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
  headerLeft: {
    flex: 1,
  },
  brandText: {
    fontSize: 18,
    fontFamily: Fonts.serifBold,
    letterSpacing: 1.1,
  },
  taglineText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  headerActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Fonts.semibold,
  },
  pillBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
  },
  pillChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  pillText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 36,
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.regular,
    height: '100%',
  },
  catalogHeaderRow: {
    marginBottom: 10,
  },
  catalogSectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 1.2,
  },
  catalogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  catalogInfo: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 8,
  },
  catalogTitle: {
    fontSize: 16,
    fontFamily: Fonts.serifBold,
    lineHeight: 21,
  },
  catalogAuthor: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  catalogSubjects: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    marginTop: 4,
  },
  alreadyReviewedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  alreadyReviewedText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  logButtonText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  reviewCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  reviewCardContent: {
    flexDirection: 'row',
  },
  reviewPoster: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  reviewDetails: {
    flex: 1,
    marginLeft: 14,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarMini: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  avatarMiniLetter: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
  reviewUsername: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    flex: 1,
  },
  reviewDate: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    marginRight: 8,
  },
  deleteReviewBtn: {
    padding: 2,
  },
  reviewBookTitle: {
    fontSize: 16,
    fontFamily: Fonts.serifBold,
    lineHeight: 22,
  },
  reviewAuthor: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 1,
  },
  ratingHeartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingNumber: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    marginLeft: 6,
  },
  reactionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
  },
  reactionText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  commentBox: {
    marginTop: 8,
  },
  reviewText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  spoilerWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    gap: 6,
  },
  spoilerWarningText: {
    color: '#F59E0B',
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  reviewCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  likeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeActionText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  editActionBtn: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  editActionText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.serifBold,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
});
