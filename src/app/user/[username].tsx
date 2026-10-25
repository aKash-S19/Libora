import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLibrary } from '../../context/LibraryContext';
import { useReader } from '../../context/ReaderContext';
import { StorageService } from '../../storage';
import { FirebaseAuthService } from '../../services/firebase';
import { Header } from '../../components/Header';
import { QuoteCardView, QuoteCardTheme } from '../../components/QuoteCardView';
import { CommunityUser } from '../../types';
import { Fonts } from '../../theme';

type UserProfileTab = 'reading' | 'lists' | 'quotes' | 'reviews';

export default function PublicUserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { books, reviews, collections } = useLibrary();
  const { quotes: myQuotes, addQuote } = useReader();

  const [activeTab, setActiveTab] = useState<UserProfileTab>('reading');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [cloudProfile, setCloudProfile] = useState<any>(null);
  const [communityProfile, setCommunityProfile] = useState<CommunityUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Quote Image Sharing Modal state
  const [sharingQuote, setSharingQuote] = useState<{
    text: string;
    author: string;
    bookTitle: string;
    personalThought?: string;
  } | null>(null);
  const [selectedCardTheme, setSelectedCardTheme] = useState<QuoteCardTheme>('midnight');
  const [isExportingImage, setIsExportingImage] = useState(false);
  const quoteCardRef = useRef<View>(null);

  const cleanHandle = (username || '').toLowerCase().trim();
  const isSelf = !cleanHandle || cleanHandle === (profile.username || '').toLowerCase();

  const loadUserData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!isSelf && cleanHandle) {
        // 1. Check local following & friends status
        const [following, friends, commUser] = await Promise.all([
          StorageService.isFollowing(cleanHandle),
          StorageService.isFriend(cleanHandle),
          StorageService.getCommunityUserByUsername(cleanHandle),
        ]);
        setIsFollowing(following);
        setIsFriend(friends);
        if (commUser) {
          setCommunityProfile(commUser);
        }

        // 2. Fetch from Cloud Firestore if online
        try {
          const found = await FirebaseAuthService.fetchUserProfileByUsername(cleanHandle);
          if (found) {
            setCloudProfile(found);
          }
        } catch {}
      }
    } catch (e) {
      console.warn('Error loading user profile:', e);
    } finally {
      setIsLoading(false);
    }
  }, [cleanHandle, isSelf]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleToggleFollow = async () => {
    if (isSelf) return;
    try {
      const nowFollowing = await StorageService.toggleFollow(cleanHandle);
      setIsFollowing(nowFollowing);
    } catch {}
  };

  const handleToggleFriend = async () => {
    if (isSelf) return;
    try {
      const nowFriend = await StorageService.toggleFriend(cleanHandle);
      setIsFriend(nowFriend);
      if (nowFriend) {
        setIsFollowing(true);
      }
    } catch {}
  };

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Check out @${publicUser.username}'s reading bookshelf on Libora: libora://user/${publicUser.username}`,
      });
    } catch {}
  };

  // Resolve user info from Local Self, Community Directory, or Cloud
  const publicUser = {
    username: isSelf
      ? profile.username
      : cloudProfile?.username || communityProfile?.username || cleanHandle || 'reader',
    displayName: isSelf
      ? profile.displayName || profile.username
      : cloudProfile?.displayName || communityProfile?.displayName || cleanHandle,
    bio: isSelf
      ? profile.bio || ''
      : cloudProfile?.bio || communityProfile?.bio || '',
    avatarUrl: isSelf ? profile.avatarUrl : cloudProfile?.avatarUrl || communityProfile?.avatarUrl,
    booksReadCount: isSelf
      ? books.filter((b) => b.status === 'completed').length
      : cloudProfile?.booksReadCount ?? communityProfile?.booksReadCount ?? 0,
    streak: isSelf
      ? profile.readingStreakDays || 0
      : cloudProfile?.streak ?? communityProfile?.readingStreakDays ?? 0,
    currentlyReading: isSelf
      ? books.find((b) => b.status === 'currently-reading') || null
      : communityProfile?.currentlyReading || cloudProfile?.currentlyReading || null,
    readingLists: isSelf
      ? [
          {
            name: 'Currently Reading',
            count: books.filter((b) => b.status === 'currently-reading').length,
            books: books.filter((b) => b.status === 'currently-reading').map((b) => ({ title: b.title, author: b.author, coverUri: b.coverUri, status: 'currently-reading' })),
          },
          {
            name: 'Completed Books',
            count: books.filter((b) => b.status === 'completed').length,
            books: books.filter((b) => b.status === 'completed').map((b) => ({ title: b.title, author: b.author, coverUri: b.coverUri, status: 'completed' })),
          },
          {
            name: 'Want to Read Queue',
            count: books.filter((b) => b.status === 'want-to-read').length,
            books: books.filter((b) => b.status === 'want-to-read').map((b) => ({ title: b.title, author: b.author, coverUri: b.coverUri, status: 'want-to-read' })),
          },
          ...collections.map((c) => ({
            name: c.name,
            count: c.bookIds.length,
            books: books.filter((b) => c.bookIds.includes(b.id)).map((b) => ({ title: b.title, author: b.author, coverUri: b.coverUri })),
          })),
        ].filter((l) => l.count > 0)
      : communityProfile?.readingLists || cloudProfile?.readingLists || [],
    quotes: isSelf
      ? myQuotes
      : communityProfile?.quotes || cloudProfile?.quotes || [],
    reviews: isSelf
      ? reviews.map((r) => ({
          bookTitle: r.bookTitle,
          author: r.author,
          rating: r.rating,
          reaction: r.reaction || 'Recommended',
          text: r.reviewText || '',
        }))
      : communityProfile?.reviews || (cloudProfile?.reviews as any[]) || [],
  };

  const handleOpenShareImage = (quote: {
    text: string;
    author: string;
    bookTitle: string;
    personalThought?: string;
  }) => {
    setSharingQuote(quote);
  };

  const handleSaveToMyQuotes = async (quote: {
    text: string;
    author: string;
    bookTitle: string;
    personalThought?: string;
  }) => {
    await addQuote(
      'community_quote',
      quote.bookTitle,
      quote.author,
      quote.text,
      1,
      quote.personalThought
    );
    Alert.alert('Quote Saved! 📜', `Saved quote from "${quote.bookTitle}" into your Libora archive.`);
  };

  const handleExportQuoteCard = async () => {
    if (!quoteCardRef.current) return;
    setIsExportingImage(true);
    try {
      const uri = await captureRef(quoteCardRef, {
        format: 'png',
        quality: 1,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Share quote from ${sharingQuote?.bookTitle}`,
        });
      } else {
        await Share.share({
          message: `"${sharingQuote?.text}"\n— ${sharingQuote?.author} (${sharingQuote?.bookTitle})\n\nShared from Libora`,
        });
      }
    } catch (e: any) {
      console.warn('Quote card export note:', e);
      // Fallback
      if (sharingQuote) {
        await Share.share({
          message: `"${sharingQuote.text}"\n— ${sharingQuote.author} (${sharingQuote.bookTitle})\n\nShared from Libora`,
        });
      }
    } finally {
      setIsExportingImage(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <Header title={`@${cleanHandle || 'reader'}`} showBack onBack={() => router.back()} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading bookshelf...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isSelf && !cloudProfile && !communityProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <Header title={`@${cleanHandle}`} showBack onBack={() => router.back()} />
        <View style={styles.centerNotFound}>
          <Ionicons name="person-remove-outline" size={50} color={colors.textMuted} style={{ marginBottom: 12 }} />
          <Text style={[styles.notFoundTitle, { color: colors.textPrimary }]}>Reader Not Found</Text>
          <Text style={[styles.notFoundSubtitle, { color: colors.textSecondary }]}>
            No account registered on Libora with the username @{cleanHandle}.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.notFoundBtn, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.notFoundBtnText}>Return to Community</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title={`@${publicUser.username}`}
        showBack
        onBack={() => router.back()}
        rightAction={
          <TouchableOpacity onPress={handleShareProfile} style={{ padding: 4 }}>
            <Ionicons name="share-social-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.avatarRow}>
            {publicUser.avatarUrl ? (
              <Image source={{ uri: publicUser.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarCircle, { backgroundColor: colors.accent }]}>
                <Text style={styles.avatarLetter}>{publicUser.displayName[0].toUpperCase()}</Text>
              </View>
            )}

            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.displayName, { color: colors.textPrimary }]}>
                {publicUser.displayName}
              </Text>
              <Text style={[styles.userHandle, { color: colors.accent }]}>
                @{publicUser.username}
              </Text>
            </View>

            {/* Social Action Buttons */}
            {!isSelf && (
              <View style={styles.socialButtonsCol}>
                <TouchableOpacity
                  onPress={handleToggleFollow}
                  style={[
                    styles.followBtn,
                    {
                      backgroundColor: isFollowing ? colors.surfaceSubtle : colors.accent,
                      borderColor: isFollowing ? colors.border : colors.accent,
                    },
                  ]}
                >
                  <Ionicons
                    name={isFollowing ? 'checkmark' : 'add'}
                    size={14}
                    color={isFollowing ? colors.textPrimary : '#FFFFFF'}
                    style={{ marginRight: 3 }}
                  />
                  <Text
                    style={[
                      styles.followBtnText,
                      { color: isFollowing ? colors.textPrimary : '#FFFFFF' },
                    ]}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleToggleFriend}
                  style={[
                    styles.friendBtn,
                    {
                      backgroundColor: isFriend ? 'rgba(239, 68, 68, 0.12)' : colors.surfaceSubtle,
                      borderColor: isFriend ? '#EF4444' : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={isFriend ? 'heart' : 'heart-outline'}
                    size={14}
                    color={isFriend ? '#EF4444' : colors.textSecondary}
                    style={{ marginRight: 3 }}
                  />
                  <Text
                    style={[
                      styles.friendBtnText,
                      { color: isFriend ? '#EF4444' : colors.textPrimary },
                    ]}
                  >
                    {isFriend ? 'Friend' : 'Add Friend'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Text style={[styles.bioText, { color: colors.textSecondary }]}>
            {publicUser.bio}
          </Text>

          {/* Stats Bar */}
          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: colors.textPrimary }]}>
                {publicUser.booksReadCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Books Read</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: colors.accent }]}>
                {publicUser.streak}d
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Streak</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: colors.textPrimary }]}>
                {publicUser.quotes.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Quotes</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: colors.textPrimary }]}>
                {publicUser.readingLists.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Lists</Text>
            </View>
          </View>
        </View>

        {/* Navigation Tabs */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {(
            [
              { id: 'reading', label: 'Reading', icon: 'book-outline' },
              { id: 'lists', label: 'Lists', icon: 'albums-outline' },
              { id: 'quotes', label: `Quotes (${publicUser.quotes.length})`, icon: 'chatbubble-ellipses-outline' },
              { id: 'reviews', label: 'Reviews', icon: 'star-outline' },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tabItem,
                  { borderBottomColor: isActive ? colors.accent : 'transparent' },
                ]}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={15}
                  color={isActive ? colors.accent : colors.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.tabItemText,
                    { color: isActive ? colors.accent : colors.textMuted, fontWeight: isActive ? '700' : '500' },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* TAB 1: CURRENTLY READING */}
        {activeTab === 'reading' && (
          <View style={styles.tabSection}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              Currently on the Bookshelf
            </Text>

            {publicUser.currentlyReading ? (
              <View
                style={[
                  styles.currentlyReadingCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={[styles.bookCoverPlaceholder, { backgroundColor: colors.accent + '22' }]}>
                  <Ionicons name="book" size={32} color={colors.accent} />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={[styles.nowReadingTag, { color: colors.accent }]}>CURRENTLY READING</Text>
                  <Text style={[styles.crTitle, { color: colors.textPrimary }]}>
                    {typeof publicUser.currentlyReading === 'string'
                      ? publicUser.currentlyReading
                      : publicUser.currentlyReading.title}
                  </Text>
                  <Text style={[styles.crAuthor, { color: colors.textSecondary }]}>
                    By {typeof publicUser.currentlyReading === 'string'
                      ? 'Author'
                      : publicUser.currentlyReading.author || 'Author'}
                  </Text>

                  {/* Progress Bar */}
                  {(() => {
                    const cr = publicUser.currentlyReading as any;
                    if (!cr || typeof cr === 'string') return null;
                    const pct = typeof cr.progress === 'number'
                      ? Math.round(cr.progress <= 1 ? cr.progress * 100 : cr.progress)
                      : cr.pageCount && cr.currentPage
                      ? Math.round((cr.currentPage / cr.pageCount) * 100)
                      : 0;

                    return (
                      <View style={{ marginTop: 10 }}>
                        <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceSubtle }]}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                backgroundColor: colors.accent,
                                width: `${Math.min(100, Math.max(0, pct))}%`,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.progressRatioText, { color: colors.textMuted }]}>
                          {pct}% completed
                        </Text>
                      </View>
                    );
                  })()}
                </View>
              </View>
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="book-outline" size={30} color={colors.textMuted} style={{ marginBottom: 6 }} />
                <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>
                  Not currently reading any title
                </Text>
              </View>
            )}
          </View>
        )}

        {/* TAB 2: READING LISTS & COLLECTIONS */}
        {activeTab === 'lists' && (
          <View style={styles.tabSection}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              Reading Lists & Curated Collections
            </Text>

            {publicUser.readingLists.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="albums-outline" size={30} color={colors.textMuted} style={{ marginBottom: 6 }} />
                <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>
                  No public reading lists yet
                </Text>
              </View>
            ) : (
              publicUser.readingLists.map((list: any, idx: number) => (
                <View
                  key={idx}
                  style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.listHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="folder-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
                      <Text style={[styles.listName, { color: colors.textPrimary }]}>{list.name}</Text>
                    </View>
                    <View style={[styles.countBadge, { backgroundColor: colors.surfaceSubtle }]}>
                      <Text style={[styles.countBadgeText, { color: colors.accent }]}>
                        {list.books ? list.books.length : 0} books
                      </Text>
                    </View>
                  </View>

                  <View style={styles.booksWrap}>
                    {(list.books || []).map((b: any, bIdx: number) => (
                      <View key={bIdx} style={[styles.bookChip, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                        <Ionicons name="bookmark-outline" size={13} color={colors.accent} style={{ marginRight: 6 }} />
                        <Text numberOfLines={1} style={[styles.bookChipTitle, { color: colors.textPrimary }]}>
                          {b.title}
                        </Text>
                        {b.author ? (
                          <Text numberOfLines={1} style={[styles.bookChipAuthor, { color: colors.textMuted }]}>
                            {' · ' + b.author}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: QUOTES WITH SHARE AS IMAGE */}
        {activeTab === 'quotes' && (
          <View style={styles.tabSection}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              Saved Quotes & Reflections
            </Text>

            {publicUser.quotes.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={30} color={colors.textMuted} style={{ marginBottom: 6 }} />
                <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>
                  No quotes saved yet
                </Text>
              </View>
            ) : (
              publicUser.quotes.map((q: any, idx: number) => (
                <View
                  key={idx}
                  style={[styles.quoteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={[styles.quoteCardText, { color: colors.textPrimary }]}>
                    “{q.text}”
                  </Text>

                  {q.personalThought ? (
                    <View style={[styles.quoteThoughtBox, { backgroundColor: colors.surfaceSubtle, borderLeftColor: colors.accent }]}>
                      <Text style={[styles.quoteThoughtText, { color: colors.textSecondary }]}>
                        {q.personalThought}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.quoteSourceRow}>
                    <Text style={[styles.quoteAuthor, { color: colors.accent }]}>
                      — {q.author || 'Author'}
                    </Text>
                    <Text style={[styles.quoteBookTitle, { color: colors.textMuted }]}>
                      {q.bookTitle}
                    </Text>
                  </View>

                  {/* Actions: Share as Image & Save Quote */}
                  <View style={[styles.quoteActionsRow, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      onPress={() => handleOpenShareImage(q)}
                      style={[styles.shareImageBtn, { backgroundColor: colors.accent }]}
                    >
                      <Ionicons name="image-outline" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                      <Text style={styles.shareImageBtnText}>Share as Image</Text>
                    </TouchableOpacity>

                    {!isSelf && (
                      <TouchableOpacity
                        onPress={() => handleSaveToMyQuotes(q)}
                        style={[styles.saveQuoteBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                      >
                        <Ionicons name="bookmark-outline" size={14} color={colors.textPrimary} style={{ marginRight: 4 }} />
                        <Text style={[styles.saveQuoteBtnText, { color: colors.textPrimary }]}>
                          Save to My Quotes
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 4: REVIEWS */}
        {activeTab === 'reviews' && (
          <View style={styles.tabSection}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              Public Book Reviews ({publicUser.reviews.length})
            </Text>

            {publicUser.reviews.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="star-outline" size={30} color={colors.textMuted} style={{ marginBottom: 6 }} />
                <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>
                  No reviews published yet
                </Text>
              </View>
            ) : (
              publicUser.reviews.map((r, i) => (
                <View
                  key={i}
                  style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.reviewHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.revBook, { color: colors.textPrimary }]}>{r.bookTitle}</Text>
                      <Text style={[styles.revAuthor, { color: colors.textSecondary }]}>{r.author}</Text>
                    </View>
                    <Text style={[styles.revStars, { color: colors.accent }]}>
                      {'★'.repeat(Math.max(1, Math.min(5, Math.floor(r.rating || 5))))}
                    </Text>
                  </View>
                  {r.reaction ? (
                    <View style={[styles.reactionPill, { backgroundColor: colors.surfaceSubtle }]}>
                      <Text style={[styles.reactionText, { color: colors.accent }]}>{r.reaction}</Text>
                    </View>
                  ) : null}
                  {r.text ? <Text style={[styles.revText, { color: colors.textPrimary }]}>"{r.text}"</Text> : null}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* SHARE QUOTE AS IMAGE MODAL */}
      <Modal
        visible={Boolean(sharingQuote)}
        transparent
        animationType="fade"
        onRequestClose={() => setSharingQuote(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.shareModalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.shareModalHeader}>
              <View>
                <Text style={[styles.shareModalTitle, { color: colors.textPrimary }]}>Share as Image Card</Text>
                <Text style={[styles.shareModalSub, { color: colors.textSecondary }]}>Export styled visual quote from Libora</Text>
              </View>
              <TouchableOpacity onPress={() => setSharingQuote(null)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Theme Selector Pills */}
            <View style={styles.themeSelectorRow}>
              {(['paper', 'midnight', 'terra', 'olive'] as QuoteCardTheme[]).map((theme) => (
                <TouchableOpacity
                  key={theme}
                  onPress={() => setSelectedCardTheme(theme)}
                  style={[
                    styles.themePill,
                    {
                      borderColor: selectedCardTheme === theme ? colors.accent : colors.border,
                      backgroundColor: selectedCardTheme === theme ? colors.accent + '22' : colors.surfaceSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.themePillText,
                      { color: selectedCardTheme === theme ? colors.accent : colors.textSecondary, fontWeight: selectedCardTheme === theme ? '700' : '500' },
                    ]}
                  >
                    {theme.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quote Card Live ViewShot Preview */}
            <ScrollView style={{ maxHeight: 340 }}>
              {sharingQuote && (
                <QuoteCardView
                  ref={quoteCardRef}
                  text={sharingQuote.text}
                  author={sharingQuote.author}
                  bookTitle={sharingQuote.bookTitle}
                  personalThought={sharingQuote.personalThought}
                  theme={selectedCardTheme}
                />
              )}
            </ScrollView>

            {/* Export Button */}
            <TouchableOpacity
              onPress={handleExportQuoteCard}
              disabled={isExportingImage}
              style={[styles.exportCardBtn, { backgroundColor: colors.accent }]}
            >
              {isExportingImage ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="share-social" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.exportCardBtnText}>Export & Share Image</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  profileCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImg: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    fontFamily: Fonts.sansBold,
  },
  displayName: {
    fontSize: 18,
    fontFamily: Fonts.serifBold,
    fontWeight: '700',
  },
  userHandle: {
    fontSize: 13,
    fontFamily: Fonts.sansBold,
    marginTop: 2,
  },
  socialButtonsCol: {
    gap: 6,
    alignItems: 'flex-end',
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  followBtnText: {
    fontSize: 12,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
  },
  friendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  friendBtnText: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
  },
  bioText: {
    fontSize: 13,
    fontFamily: Fonts.sansRegular,
    lineHeight: 18,
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 12,
  },
  statCol: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: 16,
    fontFamily: Fonts.sansBold,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
  },
  tabItemText: {
    fontSize: 12,
    fontFamily: Fonts.sansBold,
  },
  tabSection: {
    gap: 12,
  },
  sectionHeading: {
    fontSize: 15,
    fontFamily: Fonts.serifBold,
    fontWeight: '700',
    marginBottom: 4,
  },
  currentlyReadingCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    alignItems: 'center',
  },
  bookCoverPlaceholder: {
    width: 60,
    height: 85,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowReadingTag: {
    fontSize: 10,
    fontFamily: Fonts.sansBold,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  crTitle: {
    fontSize: 16,
    fontFamily: Fonts.serifBold,
    fontWeight: '700',
  },
  crAuthor: {
    fontSize: 13,
    fontFamily: Fonts.sansRegular,
    marginTop: 2,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressRatioText: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
    marginTop: 4,
  },
  listCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  listName: {
    fontSize: 14,
    fontFamily: Fonts.serifBold,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
  },
  booksWrap: {
    gap: 6,
  },
  bookChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  bookChipTitle: {
    fontSize: 12,
    fontFamily: Fonts.sansBold,
  },
  bookChipAuthor: {
    fontSize: 12,
    fontFamily: Fonts.sansRegular,
  },
  quoteCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
  },
  quoteCardText: {
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 22,
  },
  quoteThoughtBox: {
    borderLeftWidth: 2.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginVertical: 10,
  },
  quoteThoughtText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  quoteSourceRow: {
    marginTop: 10,
    marginBottom: 12,
  },
  quoteAuthor: {
    fontSize: 13,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
  },
  quoteBookTitle: {
    fontSize: 12,
    fontFamily: Fonts.sansRegular,
    marginTop: 2,
  },
  quoteActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 8,
  },
  shareImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  shareImageBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
  },
  saveQuoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  saveQuoteBtnText: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardText: {
    fontSize: 13,
    fontFamily: Fonts.sansRegular,
  },
  reviewCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  revBook: {
    fontSize: 14,
    fontFamily: Fonts.serifBold,
    fontWeight: '700',
  },
  revAuthor: {
    fontSize: 12,
    fontFamily: Fonts.sansRegular,
    marginTop: 2,
  },
  revStars: {
    fontSize: 14,
    letterSpacing: 2,
  },
  reactionPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginVertical: 6,
  },
  reactionText: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
  },
  revText: {
    fontSize: 13,
    fontFamily: 'serif',
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  shareModalCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    maxHeight: '90%',
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  shareModalTitle: {
    fontSize: 17,
    fontFamily: Fonts.serifBold,
    fontWeight: '700',
  },
  shareModalSub: {
    fontSize: 12,
    fontFamily: Fonts.sansRegular,
    marginTop: 2,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  themePill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  themePillText: {
    fontSize: 10,
    fontFamily: Fonts.sansBold,
  },
  exportCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    marginTop: 14,
  },
  exportCardBtnText: {
    color: '#FFFFFF',
    fontFamily: Fonts.sansBold,
    fontSize: 14,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: Fonts.sansRegular,
  },
  centerNotFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  notFoundTitle: {
    fontSize: 18,
    fontFamily: Fonts.serifBold,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  notFoundSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.sansRegular,
    textAlign: 'center',
    lineHeight: 18,
  },
  notFoundBtn: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    marginTop: 20,
  },
  notFoundBtnText: {
    color: '#FFFFFF',
    fontFamily: Fonts.sansBold,
    fontSize: 13,
    fontWeight: '700',
  },
});
