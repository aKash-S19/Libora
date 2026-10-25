import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLibrary } from '../../context/LibraryContext';
import { BookCover } from '../../components/BookCover';
import { ReviewModal } from '../../components/ReviewModal';
import { DiscoveryService } from '../../services/discovery';
import { FirebaseAuthService } from '../../services/firebase';
import { Fonts } from '../../theme';
import { Book, Review, FreeBookSearchResult } from '../../types';

export const BRAND_AMBER = '#F59E0B';
export const BRAND_ROSE = '#EF4444';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, profile, isAuthenticated, signOut, syncNow, updateProfile, checkUsernameAvailable, updateUsername } = useAuth();
  const { books, reviews, stats, deleteReview, addReview } = useLibrary();

  // Responsive calculations for the 4 favorite book posters
  const screenWidth = Dimensions.get('window').width;
  const slotWidth = Math.floor((screenWidth - 32 - 24) / 4);
  const slotHeight = Math.floor(slotWidth * 1.5);

  // Modals
  const [isEditProfileModal, setIsEditProfileModal] = useState(false);
  const [isSearchUserModal, setIsSearchUserModal] = useState(false);
  const [isPickFavoriteModal, setIsPickFavoriteModal] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  // Edit profile form
  const [editDisplayName, setEditDisplayName] = useState(profile.displayName || profile.username || 'Reader');
  const [editUsername, setEditUsername] = useState(profile.username || '');
  const [editBio, setEditBio] = useState(profile.bio || '');
  const [editUsernameStatus, setEditUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [editUsernameMsg, setEditUsernameMsg] = useState('');

  // Synchronize edit inputs when profile changes or modal opens
  useEffect(() => {
    if (isEditProfileModal) {
      setEditDisplayName(profile.displayName || profile.username || 'Reader');
      setEditUsername(profile.username || '');
      setEditBio(profile.bio || '');
      setEditUsernameStatus('idle');
      setEditUsernameMsg('');
    }
  }, [isEditProfileModal, profile]);

  // Debounced real-time DB availability check for profile edit
  useEffect(() => {
    const clean = editUsername.toLowerCase().trim();
    if (!clean) {
      setEditUsernameStatus('idle');
      setEditUsernameMsg('');
      return;
    }
    if (clean === (profile.username || '').toLowerCase()) {
      setEditUsernameStatus('available');
      setEditUsernameMsg('Current handle');
      return;
    }
    if (clean.length < 3) {
      setEditUsernameStatus('invalid');
      setEditUsernameMsg('Must be at least 3 characters');
      return;
    }
    if (clean.length > 20) {
      setEditUsernameStatus('invalid');
      setEditUsernameMsg('Cannot exceed 20 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      setEditUsernameStatus('invalid');
      setEditUsernameMsg('Letters, numbers, underscores only');
      return;
    }

    setEditUsernameStatus('checking');
    setEditUsernameMsg('Checking availability...');
    const timer = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailable(clean);
        if (res.available) {
          setEditUsernameStatus('available');
          setEditUsernameMsg(`@${clean} is available!`);
        } else {
          setEditUsernameStatus('taken');
          setEditUsernameMsg(res.reason || `@${clean} is taken`);
        }
      } catch {
        setEditUsernameStatus('available');
        setEditUsernameMsg(`@${clean} is available offline`);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [editUsername, profile.username, checkUsernameAvailable]);

  // Favorite picker tabs: 'reviews' | 'library' | 'search'
  const [favPickerTab, setFavPickerTab] = useState<'reviews' | 'library' | 'search'>('reviews');
  const [favSearchQuery, setFavSearchQuery] = useState('');
  const [favSearchResults, setFavSearchResults] = useState<FreeBookSearchResult[]>([]);
  const [isFavSearching, setIsFavSearching] = useState(false);

  // Find readers state
  const [searchUsernameQuery, setSearchUsernameQuery] = useState('');
  const [foundUsers, setFoundUsers] = useState<any[]>([]);
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Review editing modal state
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  // Filter user's reviews (seamless local & authenticated fallback)
  const myReviews = useMemo(() => {
    return reviews.filter(
      (r) =>
        !user ||
        r.userId === user.uid ||
        r.userId === profile.id ||
        r.userId === 'guest_reader' ||
        r.username === profile.username
    );
  }, [reviews, user, profile]);

  // Compute Favorite 4 Books (Letterboxd signature top 4)
  const favoriteFour = useMemo(() => {
    const list: (Book | { id: string; title: string; author: string; coverUri?: string } | null)[] = [
      null,
      null,
      null,
      null,
    ];

    const favIds = profile.favoriteBookIds || [];
    const storedFavs = profile.favoriteBooks || [];

    for (let i = 0; i < 4; i++) {
      const id = favIds[i];
      if (id) {
        // 1. Check local library books
        const foundInBooks = books.find((b) => b.id === id);
        if (foundInBooks) {
          list[i] = foundInBooks;
          continue;
        }

        // 2. Check reviews
        const foundInReviews = reviews.find((r) => r.bookId === id);
        if (foundInReviews) {
          list[i] = {
            id: foundInReviews.bookId,
            title: foundInReviews.bookTitle,
            author: foundInReviews.author,
            coverUri: foundInReviews.coverUri,
          };
          continue;
        }

        // 3. Check stored favoriteBooks array
        const foundStored = storedFavs.find((f) => f.id === id);
        if (foundStored) {
          list[i] = foundStored;
          continue;
        }
      }
    }

    // Auto-fill empty slots with favorite status books if any
    const statusFavs = books.filter((b) => b.status === 'favorite' && !favIds.includes(b.id));
    let sIdx = 0;
    for (let i = 0; i < 4; i++) {
      if (!list[i] && statusFavs[sIdx]) {
        list[i] = statusFavs[sIdx];
        sIdx++;
      }
    }

    return list;
  }, [books, reviews, profile.favoriteBookIds, profile.favoriteBooks]);

  // Letterboxd Ratings Distribution Histogram (1 to 5 stars)
  const ratingHistogram = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    myReviews.forEach((r) => {
      const rounded = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      counts[rounded] = (counts[rounded] || 0) + 1;
    });
    const maxCount = Math.max(1, ...Object.values(counts));
    return { counts, maxCount };
  }, [myReviews]);

  // Total unique read / reviewed books
  const booksReadCount = useMemo(() => {
    const uniqueBookIds = new Set<string>();
    books
      .filter((b) => b.status === 'completed' || b.readingProgress >= 0.99)
      .forEach((b) => uniqueBookIds.add(b.id));
    myReviews.forEach((r) => uniqueBookIds.add(r.bookId || r.bookTitle));
    return Math.max(uniqueBookIds.size, stats.completedCount, myReviews.length);
  }, [books, myReviews, stats.completedCount]);

  // Debounced search for favorite picker
  useEffect(() => {
    const q = favSearchQuery.trim();
    if (!q) {
      setFavSearchResults([]);
      setIsFavSearching(false);
      return;
    }

    setIsFavSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await DiscoveryService.searchAllOpenApis(q);
        setFavSearchResults(res);
      } catch (e) {
        console.warn('Fav search error:', e);
      } finally {
        setIsFavSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [favSearchQuery]);

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Follow my reading journey on Libora: @${profile.username}\nlibora://user/${profile.username}`,
      });
    } catch {}
  };

  const handleSyncCloud = async () => {
    setIsSyncing(true);
    const res = await syncNow();
    setIsSyncing(false);
    Alert.alert('Cloud Sync', res.message || 'Sync finished.');
  };

  const handleSaveProfile = async () => {
    const cleanUsername = editUsername.toLowerCase().trim();
    if (!cleanUsername) {
      Alert.alert('Required Field', 'Please provide a username.');
      return;
    }
    if (cleanUsername !== (profile.username || '').toLowerCase()) {
      if (editUsernameStatus === 'taken' || editUsernameStatus === 'invalid') {
        Alert.alert('Username Issue', editUsernameMsg || 'This username is not available.');
        return;
      }
      if (editUsernameStatus === 'checking') {
        Alert.alert('Please Wait', 'Checking username availability in the database...');
        return;
      }
      await updateUsername(cleanUsername);
    }

    await updateProfile({
      displayName: editDisplayName.trim() || cleanUsername,
      bio: editBio.trim(),
    });
    setIsEditProfileModal(false);
    Alert.alert('Profile Updated 🎉', 'Your profile details and handle have been saved.');
  };

  const handleSelectFavoriteBook = async (book: {
    id: string;
    title: string;
    author: string;
    coverUri?: string;
  }) => {
    if (selectedSlotIndex === null) return;
    const currentFavIds = [...(profile.favoriteBookIds || [])];
    const currentFavs = [...(profile.favoriteBooks || [])];

    while (currentFavIds.length < 4) currentFavIds.push('');
    while (currentFavs.length < 4) currentFavs.push({ id: '', title: '', author: '' });

    currentFavIds[selectedSlotIndex] = book.id;
    currentFavs[selectedSlotIndex] = {
      id: book.id,
      title: book.title,
      author: book.author,
      coverUri: book.coverUri,
    };

    await updateProfile({
      favoriteBookIds: currentFavIds.slice(0, 4),
      favoriteBooks: currentFavs.slice(0, 4),
    });

    setIsPickFavoriteModal(false);
    setSelectedSlotIndex(null);
  };

  const handleRemoveFavorite = async (index: number) => {
    const currentFavIds = [...(profile.favoriteBookIds || [])];
    const currentFavs = [...(profile.favoriteBooks || [])];
    currentFavIds[index] = '';
    currentFavs[index] = { id: '', title: '', author: '' };

    await updateProfile({
      favoriteBookIds: currentFavIds,
      favoriteBooks: currentFavs,
    });
  };

  const handleSearchUsers = async () => {
    if (!searchUsernameQuery.trim()) return;
    setIsSearchingUser(true);
    try {
      const results = await FirebaseAuthService.searchUsers(searchUsernameQuery);
      setFoundUsers(results);
    } catch (e) {
      console.warn('User search error:', e);
    } finally {
      setIsSearchingUser(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerHandle, { color: colors.textPrimary }]}>
            @{profile.username}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push('/community' as any)}
            style={[styles.headerBtn, { backgroundColor: colors.surfaceSubtle }]}
          >
            <Ionicons name="person-add-outline" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShareProfile}
            style={[styles.headerBtn, { backgroundColor: colors.surfaceSubtle }]}
          >
            <Ionicons name="share-social-outline" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/settings' as any)}
            style={[styles.headerBtn, { backgroundColor: colors.surfaceSubtle }]}
          >
            <Ionicons name="settings-outline" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Letterboxd Profile Header Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.avatarRow}>
            {/* Avatar Circle with Accent Ring */}
            <View style={[styles.avatarRing, { borderColor: colors.accent }]}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.accent }]}>
                <Text style={styles.avatarLetter}>
                  {(profile.displayName || profile.username || 'R')[0].toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.userInfo}>
              <Text style={[styles.displayName, { color: colors.textPrimary }]}>
                {profile.displayName || profile.username}
              </Text>
              <Text style={[styles.userHandleSub, { color: colors.accent }]}>
                @{profile.username}
              </Text>

              {isAuthenticated ? (
                <View style={styles.authBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={colors.accent} />
                  <Text style={[styles.authBadgeText, { color: colors.accent }]}>
                    Firebase Connected
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => router.push('/auth/login' as any)}
                  style={styles.authBadge}
                >
                  <Ionicons name="log-in-outline" size={12} color={colors.textMuted} />
                  <Text style={[styles.authBadgeText, { color: colors.textMuted }]}>
                    Sign In / Guest
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Edit Profile Button */}
            <TouchableOpacity
              onPress={() => {
                setEditDisplayName(profile.displayName || profile.username);
                setEditBio(profile.bio || '');
                setIsEditProfileModal(true);
              }}
              style={[
                styles.editProfileBtn,
                { borderColor: colors.border, backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <Text style={[styles.editProfileText, { color: colors.textPrimary }]}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Bio / Reading Motto */}
          {profile.bio ? (
            <Text style={[styles.bioText, { color: colors.textSecondary }]}>{profile.bio}</Text>
          ) : (
            <TouchableOpacity
              onPress={() => setIsEditProfileModal(true)}
              style={styles.addBioPrompt}
            >
              <Text style={[styles.addBioText, { color: colors.textMuted }]}>
                + Add a bio or reading motto to your profile
              </Text>
            </TouchableOpacity>
          )}

          {/* Letterboxd Stats Bar */}
          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: colors.textPrimary }]}>
                {booksReadCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>BOOKS</Text>
            </View>

            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: colors.textPrimary }]}>
                {myReviews.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>REVIEWS</Text>
            </View>

            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: colors.textPrimary }]}>
                {stats.readingCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>READING</Text>
            </View>

            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: colors.accent }]}>
                {myReviews.length > 0
                  ? (myReviews.reduce((acc, r) => acc + r.rating, 0) / myReviews.length).toFixed(1)
                  : '—'}
                ★
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>RATING</Text>
            </View>
          </View>
        </View>

        {/* Community & Quotes Quick Cards */}
        <View style={styles.quickShortcutsRow}>
          <TouchableOpacity
            onPress={() => router.push('/community' as any)}
            style={[styles.shortcutBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="people-outline" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.shortcutTitle, { color: colors.textPrimary }]}>Find Readers & Friends</Text>
              <Text style={[styles.shortcutSub, { color: colors.textSecondary }]}>Follow readers, see their reading lists & quotes</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/quotes' as any)}
            style={[styles.shortcutBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.shortcutTitle, { color: colors.textPrimary }]}>Quotes Archive & Cards</Text>
              <Text style={[styles.shortcutSub, { color: colors.textSecondary }]}>Browse quotes & share as styled image cards</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Letterboxd Signature "FAVOURITE BOOKS" (4 Posters) */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                FAVOURITE BOOKS
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                Your four all-time defining books
              </Text>
            </View>
          </View>

          <View style={styles.favoritesGrid}>
            {favoriteFour.map((fav, index) => {
              if (fav) {
                return (
                  <View
                    key={fav.id || index}
                    style={[styles.favPosterSlot, { width: slotWidth, height: slotHeight }]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        if (fav.id && !fav.id.startsWith('ol_') && !fav.id.startsWith('pg_')) {
                          router.push(`/book/${fav.id}` as any);
                        } else {
                          setSelectedSlotIndex(index);
                          setIsPickFavoriteModal(true);
                        }
                      }}
                      style={styles.favPosterCard}
                    >
                      <BookCover
                        coverUri={fav.coverUri}
                        title={fav.title}
                        author={fav.author}
                        width={slotWidth}
                        height={slotHeight}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemoveFavorite(index)}
                      style={[styles.removeFavBtn, { backgroundColor: colors.surface }]}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="close-circle" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                );
              }

              return (
                <TouchableOpacity
                  key={`empty_${index}`}
                  onPress={() => {
                    setSelectedSlotIndex(index);
                    setIsPickFavoriteModal(true);
                  }}
                  style={[
                    styles.emptyFavSlot,
                    {
                      width: slotWidth,
                      height: slotHeight,
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceSubtle,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={22} color={colors.accent} />
                  <Text style={[styles.emptyFavText, { color: colors.textMuted }]}>
                    #{index + 1}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Letterboxd Ratings Histogram Breakdown */}
        {myReviews.length > 0 && (
          <View
            style={[
              styles.section,
              styles.histogramCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>RATINGS</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                  {myReviews.length} books rated
                </Text>
              </View>
            </View>

            <View style={styles.histogramChart}>
              {[1, 2, 3, 4, 5].map((star) => {
                const count = (ratingHistogram.counts as any)[star] || 0;
                const heightPercent = Math.max(8, (count / ratingHistogram.maxCount) * 100);

                return (
                  <View key={star} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${heightPercent}%`,
                            backgroundColor: count > 0 ? colors.accent : colors.border,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, { color: colors.textMuted }]}>{star}★</Text>
                    <Text style={[styles.barCount, { color: colors.textSecondary }]}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Letterboxd Recent Reviews (Diary) */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                RECENT REVIEWS
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                {myReviews.length} diary entries
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/reviews' as any)}
              style={styles.browseAllReviewsBtn}
            >
              <Text style={[styles.browseAllReviewsText, { color: colors.accent }]}>
                Review a Book →
              </Text>
            </TouchableOpacity>
          </View>

          {myReviews.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="star-outline"
                size={32}
                color={colors.accent}
                style={{ marginBottom: 8 }}
              />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Diary Reviews Yet
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                Rate books and record your thoughts to build your personal reading diary.
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/reviews' as any)}
                style={[styles.emptyActionBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.emptyActionText}>Log Your First Review</Text>
              </TouchableOpacity>
            </View>
          ) : (
            myReviews.slice(0, 5).map((rev) => (
              <View
                key={rev.id}
                style={[
                  styles.reviewDiaryCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.reviewDiaryContent}>
                  <BookCover
                    coverUri={rev.coverUri}
                    title={rev.bookTitle}
                    author={rev.author}
                    width={56}
                    height={84}
                  />

                  <View style={styles.reviewDiaryDetails}>
                    <Text
                      style={[styles.reviewTitle, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {rev.bookTitle}
                    </Text>
                    <Text
                      style={[styles.reviewAuthor, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {rev.author}
                    </Text>

                    <View style={styles.ratingRow}>
                      <Text style={[styles.starsText, { color: colors.accent }]}>
                        {'★'.repeat(Math.floor(rev.rating))} {rev.rating}
                      </Text>
                      {rev.liked ? (
                        <Ionicons
                          name="heart"
                          size={14}
                          color="#EF4444"
                          style={{ marginLeft: 6 }}
                        />
                      ) : null}
                      <Text style={[styles.reviewDateText, { color: colors.textMuted }]}>
                        ·{' '}
                        {new Date(rev.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>

                    {rev.reviewText ? (
                      <Text
                        style={[styles.reviewNotes, { color: colors.textPrimary }]}
                        numberOfLines={2}
                      >
                        "{rev.reviewText}"
                      </Text>
                    ) : null}

                    <View style={styles.reviewCardActions}>
                      <TouchableOpacity
                        onPress={() => setEditingReview(rev)}
                        style={styles.reviewActionBtn}
                      >
                        <Text style={[styles.actionText, { color: colors.accent }]}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert('Delete Review', 'Remove this review from your profile?', [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => deleteReview(rev.id),
                            },
                          ]);
                        }}
                        style={styles.reviewActionBtn}
                      >
                        <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Cloud Account Sync Card */}
        <View style={styles.section}>
          {!isAuthenticated ? (
            <View
              style={[
                styles.cloudCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={24}
                color={colors.accent}
                style={{ marginBottom: 6 }}
              />
              <Text style={[styles.cloudTitle, { color: colors.textPrimary }]}>
                Sync & Connect Across Devices
              </Text>
              <Text style={[styles.cloudDesc, { color: colors.textSecondary }]}>
                Back up your reading diary, ratings, and 4 favorite books to your cloud
                account.
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/auth/signup' as any)}
                style={[styles.cloudBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.cloudBtnText}>Sign Up / Log In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={[
                styles.cloudCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={24}
                color="#10B981"
                style={{ marginBottom: 6 }}
              />
              <Text style={[styles.cloudTitle, { color: colors.textPrimary }]}>
                Connected as {user?.email}
              </Text>
              <Text style={[styles.cloudDesc, { color: colors.textSecondary }]}>
                Your library, highlights, and reviews are synchronized with Cloud Firestore.
              </Text>
              <View style={styles.syncBtnRow}>
                <TouchableOpacity
                  onPress={handleSyncCloud}
                  disabled={isSyncing}
                  style={[
                    styles.syncActionBtn,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.syncActionText, { color: colors.textPrimary }]}>
                    {isSyncing ? 'Syncing...' : 'Sync Cloud'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={signOut}
                  style={[styles.syncActionBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.syncActionText, { color: '#EF4444' }]}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditProfileModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setIsEditProfileModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>DISPLAY NAME</Text>
            <TextInput
              value={editDisplayName}
              onChangeText={setEditDisplayName}
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={[styles.inputLabel, { color: colors.textMuted, marginBottom: 0 }]}>UNIQUE USERNAME</Text>
              {editUsernameMsg ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {editUsernameStatus === 'checking' && (
                    <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 4 }} />
                  )}
                  {editUsernameStatus === 'available' && (
                    <Ionicons name="checkmark-circle" size={13} color="#10B981" style={{ marginRight: 4 }} />
                  )}
                  {(editUsernameStatus === 'taken' || editUsernameStatus === 'invalid') && (
                    <Ionicons name="alert-circle" size={13} color="#EF4444" style={{ marginRight: 4 }} />
                  )}
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: Fonts.bold,
                      color:
                        editUsernameStatus === 'available'
                          ? '#10B981'
                          : editUsernameStatus === 'checking'
                          ? colors.accent
                          : '#EF4444',
                    }}
                  >
                    {editUsernameMsg}
                  </Text>
                </View>
              ) : null}
            </View>
            <View
              style={[
                styles.modalInput,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.surfaceSubtle,
                  borderColor:
                    editUsernameStatus === 'available'
                      ? '#10B981'
                      : editUsernameStatus === 'taken' || editUsernameStatus === 'invalid'
                      ? '#EF4444'
                      : colors.border,
                },
              ]}
            >
              <Text style={{ fontSize: 15, fontFamily: Fonts.bold, color: colors.accent, marginRight: 4 }}>@</Text>
              <TextInput
                value={editUsername}
                onChangeText={(val) => setEditUsername(val.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="your_unique_handle"
                placeholderTextColor={colors.textMuted}
                style={{ flex: 1, color: colors.textPrimary, fontSize: 14, fontFamily: Fonts.regular }}
              />
            </View>

            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
              BIO / READING MOTTO
            </Text>
            <TextInput
              value={editBio}
              onChangeText={setEditBio}
              multiline
              numberOfLines={3}
              placeholder="Tell other readers about your tastes..."
              placeholderTextColor={colors.textMuted}
              style={[
                styles.modalTextArea,
                {
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
            />

            <TouchableOpacity
              onPress={handleSaveProfile}
              style={[styles.modalSaveBtn, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.modalSaveText}>Save Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Pick Favorite Book Modal - Multi-Source (Reviews, Library, Search) */}
      <Modal
        visible={isPickFavoriteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setIsPickFavoriteModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border, maxHeight: '85%' },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Select Favorite #{selectedSlotIndex !== null ? selectedSlotIndex + 1 : ''}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Pick from your diary reviews, library, or search online
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsPickFavoriteModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Source Switcher */}
            <View style={[styles.modalTabRow, { borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setFavPickerTab('reviews')}
                style={[
                  styles.modalTabBtn,
                  favPickerTab === 'reviews' && { backgroundColor: colors.accent },
                ]}
              >
                <Text
                  style={[
                    styles.modalTabText,
                    { color: favPickerTab === 'reviews' ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  Diary ({myReviews.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setFavPickerTab('library')}
                style={[
                  styles.modalTabBtn,
                  favPickerTab === 'library' && { backgroundColor: colors.accent },
                ]}
              >
                <Text
                  style={[
                    styles.modalTabText,
                    { color: favPickerTab === 'library' ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  Library ({books.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setFavPickerTab('search')}
                style={[
                  styles.modalTabBtn,
                  favPickerTab === 'search' && { backgroundColor: colors.accent },
                ]}
              >
                <Text
                  style={[
                    styles.modalTabText,
                    { color: favPickerTab === 'search' ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  Search Online
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab 1: Reviews */}
            {favPickerTab === 'reviews' && (
              <ScrollView style={{ maxHeight: 360 }}>
                {myReviews.length === 0 ? (
                  <Text style={[styles.noBooksText, { color: colors.textMuted }]}>
                    No reviews in your diary yet. Review a book to pick it as a favorite!
                  </Text>
                ) : (
                  myReviews.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() =>
                        handleSelectFavoriteBook({
                          id: r.bookId,
                          title: r.bookTitle,
                          author: r.author,
                          coverUri: r.coverUri,
                        })
                      }
                      style={[styles.favPickerRow, { borderBottomColor: colors.border }]}
                    >
                      <BookCover
                        coverUri={r.coverUri}
                        title={r.bookTitle}
                        author={r.author}
                        width={44}
                        height={66}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text
                          style={[styles.favPickerTitle, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {r.bookTitle}
                        </Text>
                        <Text
                          style={[styles.favPickerAuthor, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {r.author} · {r.rating}★
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={24} color={colors.accent} />
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}

            {/* Tab 2: Library */}
            {favPickerTab === 'library' && (
              <ScrollView style={{ maxHeight: 360 }}>
                {books.length === 0 ? (
                  <Text style={[styles.noBooksText, { color: colors.textMuted }]}>
                    No books in your library bookshelf yet.
                  </Text>
                ) : (
                  books.map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      onPress={() =>
                        handleSelectFavoriteBook({
                          id: b.id,
                          title: b.title,
                          author: b.author,
                          coverUri: b.coverUri,
                        })
                      }
                      style={[styles.favPickerRow, { borderBottomColor: colors.border }]}
                    >
                      <BookCover
                        coverUri={b.coverUri}
                        title={b.title}
                        author={b.author}
                        width={44}
                        height={66}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text
                          style={[styles.favPickerTitle, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {b.title}
                        </Text>
                        <Text
                          style={[styles.favPickerAuthor, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {b.author}
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={24} color={colors.accent} />
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}

            {/* Tab 3: Search Online */}
            {favPickerTab === 'search' && (
              <View style={{ maxHeight: 360 }}>
                <View
                  style={[
                    styles.searchUserBox,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                  ]}
                >
                  <TextInput
                    value={favSearchQuery}
                    onChangeText={setFavSearchQuery}
                    placeholder="Search any book online..."
                    placeholderTextColor={colors.textMuted}
                    style={[styles.searchUserInput, { color: colors.textPrimary }]}
                  />
                  {isFavSearching ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <Ionicons name="search" size={18} color={colors.textMuted} />
                  )}
                </View>

                <ScrollView style={{ maxHeight: 290 }}>
                  {favSearchResults.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() =>
                        handleSelectFavoriteBook({
                          id: item.id,
                          title: item.title,
                          author: item.author,
                          coverUri: item.coverUrl,
                        })
                      }
                      style={[styles.favPickerRow, { borderBottomColor: colors.border }]}
                    >
                      <BookCover
                        coverUri={item.coverUrl}
                        title={item.title}
                        author={item.author}
                        width={44}
                        height={66}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text
                          style={[styles.favPickerTitle, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={[styles.favPickerAuthor, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {item.author}
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={24} color={colors.accent} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Find Readers Modal */}
      <Modal
        visible={isSearchUserModal}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSearchUserModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Find Readers</Text>
              <TouchableOpacity onPress={() => setIsSearchUserModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.searchUserBox,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
              ]}
            >
              <TextInput
                value={searchUsernameQuery}
                onChangeText={setSearchUsernameQuery}
                onSubmitEditing={handleSearchUsers}
                placeholder="Search username (e.g. reader)"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                style={[styles.searchUserInput, { color: colors.textPrimary }]}
              />
              <TouchableOpacity onPress={handleSearchUsers} style={{ padding: 4 }}>
                {isSearchingUser ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Ionicons name="search" size={20} color={colors.accent} />
                )}
              </TouchableOpacity>
            </View>

            {foundUsers.map((u, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  setIsSearchUserModal(false);
                  router.push(`/user/${u.username}` as any);
                }}
                style={[styles.userResultRow, { borderBottomColor: colors.border }]}
              >
                <View style={[styles.userMiniAvatar, { backgroundColor: colors.accent }]}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
                    {(u.displayName || u.username)[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.userResultName, { color: colors.textPrimary }]}>
                    {u.displayName || u.username}
                  </Text>
                  <Text style={[styles.userResultHandle, { color: colors.textSecondary }]}>
                    @{u.username}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Editing Review Modal */}
      {editingReview && (
        <ReviewModal
          visible={!!editingReview}
          bookId={editingReview.bookId}
          bookTitle={editingReview.bookTitle}
          author={editingReview.author}
          coverUri={editingReview.coverUri}
          existingReview={editingReview}
          onClose={() => setEditingReview(null)}
          onSubmit={async (revData) => {
            await addReview({
              ...revData,
              id: editingReview.id,
              createdAt: editingReview.createdAt,
              updatedAt: Date.now(),
            });
            setEditingReview(null);
          }}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  headerHandle: {
    fontSize: 18,
    fontFamily: Fonts.serifBold,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 22,
    fontFamily: Fonts.serifBold,
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  displayName: {
    fontSize: 19,
    fontFamily: Fonts.serifBold,
  },
  userHandleSub: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    marginTop: 2,
  },
  authBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  authBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
  },
  editProfileBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  editProfileText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  bioText: {
    fontSize: 14,
    fontFamily: Fonts.serifItalic,
    lineHeight: 20,
    marginTop: 14,
  },
  addBioPrompt: {
    marginTop: 12,
  },
  addBioText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 14,
    justifyContent: 'space-around',
  },
  statCol: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 0.8,
    marginTop: 2,
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
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    letterSpacing: 1.2,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  favoritesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  favPosterSlot: {
    position: 'relative',
    borderRadius: 8,
  },
  favPosterCard: {
    borderRadius: 8,
    overflow: 'hidden',
    width: '100%',
    height: '100%',
  },
  removeFavBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 10,
    elevation: 3,
  },
  emptyFavSlot: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFavText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    marginTop: 4,
  },
  histogramCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  histogramChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 80,
    marginTop: 10,
    paddingHorizontal: 8,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: 52,
    width: 24,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: 18,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    marginTop: 6,
  },
  barCount: {
    fontSize: 10,
    fontFamily: Fonts.medium,
  },
  browseAllReviewsBtn: {
    paddingVertical: 4,
  },
  browseAllReviewsText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  emptyBox: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Fonts.serifBold,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  emptyActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 12,
  },
  reviewDiaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  reviewDiaryContent: {
    flexDirection: 'row',
  },
  reviewDiaryDetails: {
    flex: 1,
    marginLeft: 12,
  },
  reviewTitle: {
    fontSize: 15,
    fontFamily: Fonts.serifBold,
  },
  reviewAuthor: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  starsText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  reviewDateText: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    marginLeft: 4,
  },
  reviewNotes: {
    fontSize: 12,
    fontFamily: Fonts.serifItalic,
    lineHeight: 16,
    marginTop: 6,
  },
  reviewCardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  reviewActionBtn: {
    paddingVertical: 2,
  },
  actionText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  quickShortcutsRow: {
    gap: 10,
    marginBottom: 20,
  },
  shortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  shortcutIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  shortcutTitle: {
    fontSize: 14,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
  },
  shortcutSub: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
    marginTop: 2,
  },
  cloudCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
  },
  cloudTitle: {
    fontSize: 15,
    fontFamily: Fonts.serifBold,
    marginTop: 4,
  },
  cloudDesc: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 14,
  },
  cloudBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
  },
  cloudBtnText: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  syncBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  syncActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  syncActionText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 22,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Fonts.serifBold,
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  modalTabRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },
  modalTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTabText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginBottom: 16,
  },
  modalTextArea: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    fontFamily: Fonts.regular,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalSaveBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  favPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  favPickerTitle: {
    fontSize: 15,
    fontFamily: Fonts.serifBold,
  },
  favPickerAuthor: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  noBooksText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    paddingVertical: 24,
  },
  searchUserBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    marginBottom: 12,
  },
  searchUserInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  userResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userMiniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userResultName: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
  userResultHandle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
});
