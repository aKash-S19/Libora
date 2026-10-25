import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { StorageService } from '../storage';
import { FirebaseAuthService } from '../services/firebase';
import { CommunityUser } from '../types';
import { Header } from '../components/Header';
import { Fonts } from '../theme';

type CommunityTab = 'explore' | 'following' | 'friends';

export default function CommunityScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState<CommunityTab>('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<CommunityUser[]>([]);
  const [followingList, setFollowingList] = useState<string[]>([]);
  const [friendsList, setFriendsList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allCommunity, following, friends] = await Promise.all([
        FirebaseAuthService.fetchRealCommunityUsers(50, true),
        StorageService.getFollowing(),
        StorageService.getFriends(),
      ]);
      setUsers(allCommunity);
      setFollowingList(following);
      setFriendsList(friends);
    } catch (e) {
      console.warn('Failed to load community users:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live search debounced
  useEffect(() => {
    if (!searchQuery.trim()) {
      FirebaseAuthService.fetchRealCommunityUsers().then(setUsers);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await FirebaseAuthService.searchUsers(searchQuery);
        setUsers(results);
      } catch (e) {
        console.warn('Search users error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleInviteFriends = async () => {
    try {
      await Share.share({
        message: 'Join me on Libora! Track your books, quotes, and reading notes: libora://community',
      });
    } catch {}
  };

  const handleToggleFollow = async (username: string) => {
    try {
      const nowFollowing = await StorageService.toggleFollow(username);
      setFollowingList((prev) =>
        nowFollowing
          ? [...prev, username.toLowerCase()]
          : prev.filter((u) => u.toLowerCase() !== username.toLowerCase())
      );
    } catch {}
  };

  const handleToggleFriend = async (username: string) => {
    try {
      const nowFriend = await StorageService.toggleFriend(username);
      setFriendsList((prev) =>
        nowFriend
          ? [...prev, username.toLowerCase()]
          : prev.filter((u) => u.toLowerCase() !== username.toLowerCase())
      );
      if (nowFriend) {
        setFollowingList((prev) =>
          prev.includes(username.toLowerCase()) ? prev : [...prev, username.toLowerCase()]
        );
      }
    } catch {}
  };

  const filteredUsers = useMemo(() => {
    const cleanSelf = (profile.username || '').toLowerCase();
    return users.filter((u) => {
      const uName = (u.username || '').toLowerCase();
      if (uName === cleanSelf) return false;

      if (activeTab === 'following') {
        return followingList.map((x) => x.toLowerCase()).includes(uName);
      }
      if (activeTab === 'friends') {
        return friendsList.map((x) => x.toLowerCase()).includes(uName);
      }
      return true;
    });
  }, [users, activeTab, followingList, friendsList, profile.username]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Find Readers & Friends"
        showBack
        onBack={() => router.back()}
        rightAction={
          <TouchableOpacity onPress={loadData} style={{ padding: 4 }}>
            <Ionicons name="reload-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      {/* Search Input */}
      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search readers by username or name..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.searchInput, { color: colors.textPrimary }]}
        />
        {isSearching && <ActivityIndicator size="small" color={colors.accent} />}
        {searchQuery.length > 0 && !isSearching && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Filter Pills */}
      <View style={styles.tabRow}>
        {(
          [
            { id: 'explore', label: 'Explore Community', icon: 'globe-outline' },
            { id: 'following', label: `Following (${followingList.length})`, icon: 'person-add-outline' },
            { id: 'friends', label: `Friends (${friendsList.length})`, icon: 'heart-outline' },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tabPill,
                {
                  backgroundColor: isActive ? colors.accent : colors.surfaceSubtle,
                  borderColor: isActive ? colors.accent : colors.border,
                },
              ]}
            >
              <Ionicons
                name={tab.icon as any}
                size={14}
                color={isActive ? '#FFFFFF' : colors.textSecondary}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  styles.tabPillText,
                  { color: isActive ? '#FFFFFF' : colors.textPrimary, fontWeight: isActive ? '700' : '500' },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Reader Cards List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Connecting to reading community...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.username}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name={
                  activeTab === 'friends'
                    ? 'people-outline'
                    : activeTab === 'following'
                    ? 'person-add-outline'
                    : 'globe-outline'
                }
                size={44}
                color={colors.textMuted}
                style={{ marginBottom: 12 }}
              />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {activeTab === 'friends'
                  ? 'No Friends Added Yet'
                  : activeTab === 'following'
                  ? 'You are not following anyone yet'
                  : searchQuery.trim()
                  ? 'No Readers Found'
                  : 'No Other Readers Yet'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {activeTab === 'friends'
                  ? 'Tap "Add Friend" on any reader card to see what they are reading, their lists and quotes!'
                  : activeTab === 'following'
                  ? 'Explore the community to follow readers with inspiring bookshelves.'
                  : searchQuery.trim()
                  ? 'No user registered with this handle or name. Try a different search.'
                  : 'Libora community is authentic and free of fake accounts. Invite friends to join and exchange bookshelves!'}
              </Text>
              {activeTab === 'explore' && !searchQuery.trim() && (
                <TouchableOpacity
                  onPress={handleInviteFriends}
                  style={[styles.inviteBtn, { backgroundColor: colors.accent }]}
                >
                  <Ionicons name="share-social-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.inviteBtnText}>Invite Friends to Libora</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const isFollowing = followingList.map((x) => x.toLowerCase()).includes(item.username.toLowerCase());
            const isFriend = friendsList.map((x) => x.toLowerCase()).includes(item.username.toLowerCase());

            return (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => router.push(`/user/${item.username}` as any)}
                style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                {/* Header Row: Avatar, Name, Handle, Action Buttons */}
                <View style={styles.cardHeader}>
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={styles.avatarImg} />
                  ) : (
                    <View style={[styles.avatarCircle, { backgroundColor: colors.accent }]}>
                      <Text style={styles.avatarLetter}>
                        {item.displayName ? item.displayName[0].toUpperCase() : item.username[0].toUpperCase()}
                      </Text>
                    </View>
                  )}

                  <View style={styles.namesCol}>
                    <Text numberOfLines={1} style={[styles.displayName, { color: colors.textPrimary }]}>
                      {item.displayName}
                    </Text>
                    <Text style={[styles.handleText, { color: colors.accent }]}>
                      @{item.username}
                    </Text>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      onPress={() => handleToggleFollow(item.username)}
                      style={[
                        styles.followActionBtn,
                        {
                          backgroundColor: isFollowing ? colors.surfaceSubtle : colors.accent,
                          borderColor: isFollowing ? colors.border : colors.accent,
                        },
                      ]}
                    >
                      <Ionicons
                        name={isFollowing ? 'checkmark' : 'add'}
                        size={13}
                        color={isFollowing ? colors.textPrimary : '#FFFFFF'}
                        style={{ marginRight: 2 }}
                      />
                      <Text
                        style={[
                          styles.actionBtnText,
                          { color: isFollowing ? colors.textPrimary : '#FFFFFF' },
                        ]}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleToggleFriend(item.username)}
                      style={[
                        styles.friendActionBtn,
                        {
                          backgroundColor: isFriend ? 'rgba(239, 68, 68, 0.12)' : colors.surfaceSubtle,
                          borderColor: isFriend ? '#EF4444' : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={isFriend ? 'heart' : 'heart-outline'}
                        size={13}
                        color={isFriend ? '#EF4444' : colors.textSecondary}
                        style={{ marginRight: 2 }}
                      />
                      <Text
                        style={[
                          styles.actionBtnText,
                          { color: isFriend ? '#EF4444' : colors.textPrimary },
                        ]}
                      >
                        {isFriend ? 'Friend' : 'Add Friend'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Bio Snippet */}
                {item.bio ? (
                  <Text numberOfLines={2} style={[styles.bioText, { color: colors.textSecondary }]}>
                    {item.bio}
                  </Text>
                ) : null}

                {/* What they are currently reading */}
                {item.currentlyReading && (
                  <View
                    style={[
                      styles.readingBadge,
                      { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons name="book-outline" size={14} color={colors.accent} style={{ marginRight: 6 }} />
                    <Text numberOfLines={1} style={[styles.readingText, { color: colors.textPrimary }]}>
                      Reading:{' '}
                      <Text style={{ fontWeight: '700' }}>{item.currentlyReading.title}</Text>
                      {item.currentlyReading.author ? ` · ${item.currentlyReading.author}` : ''}
                    </Text>
                    {item.currentlyReading.progress !== undefined && (
                      <View style={[styles.progressTag, { backgroundColor: colors.accent + '22' }]}>
                        <Text style={[styles.progressTagText, { color: colors.accent }]}>
                          {Math.round(item.currentlyReading.progress * 100)}%
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Top Quote Snippet if available */}
                {item.quotes && item.quotes.length > 0 && (
                  <View style={styles.quoteSnippet}>
                    <Text numberOfLines={2} style={[styles.quoteText, { color: colors.textMuted }]}>
                      “{item.quotes[0].text}”
                    </Text>
                  </View>
                )}

                {/* Reader Meta Stats Row */}
                <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
                  <View style={styles.metaItem}>
                    <Ionicons name="checkmark-done-outline" size={13} color={colors.accent} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      {item.booksReadCount} books finished
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="flame-outline" size={13} color="#F59E0B" />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      {item.readingStreakDays}d streak
                    </Text>
                  </View>
                  {item.readingLists && item.readingLists.length > 0 && (
                    <View style={styles.metaItem}>
                      <Ionicons name="albums-outline" size={13} color={colors.textSecondary} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        {item.readingLists.length} lists
                      </Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
                </View>
              </TouchableOpacity>
            );
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.sansRegular,
    fontSize: 14,
    height: '100%',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabPillText: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  userCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Fonts.sansBold,
  },
  namesCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  displayName: {
    fontSize: 15,
    fontFamily: Fonts.serifBold,
    fontWeight: '700',
  },
  handleText: {
    fontSize: 12,
    fontFamily: Fonts.sansBold,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  followActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  friendActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
  },
  bioText: {
    fontSize: 12,
    fontFamily: Fonts.sansRegular,
    lineHeight: 17,
    marginTop: 10,
  },
  readingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  readingText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.sansRegular,
  },
  progressTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  progressTagText: {
    fontSize: 10,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
  },
  quoteSnippet: {
    marginTop: 8,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#F59E0B',
  },
  quoteText: {
    fontSize: 11,
    fontFamily: 'serif',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Fonts.serifBold,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.sansRegular,
    textAlign: 'center',
    lineHeight: 18,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginTop: 18,
  },
  inviteBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
  },
});
