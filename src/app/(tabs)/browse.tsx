import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLibrary } from '../../context/LibraryContext';
import {
  DiscoveryService,
  DownloadManager,
  CURATED_PUBLIC_DOMAIN_BOOKS,
  FREE_BOOK_REPOSITORIES,
  FreeBookRepository,
} from '../../services/discovery';
import { FreeBookSearchResult, DownloadItem } from '../../types';
import { Fonts } from '../../theme';

const GENRES = ['All', 'Philosophy', 'Gothic Fiction', 'Romance', 'Mystery', 'Fantasy', 'Adventure'];

export default function BrowseScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { books, refreshLibrary } = useLibrary();

  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [results, setResults] = useState<FreeBookSearchResult[]>(CURATED_PUBLIC_DOMAIN_BOOKS);
  const [isSearching, setIsSearching] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [downloadedBookIds, setDownloadedBookIds] = useState<Record<string, string>>({});

  useEffect(() => {
    // Listen to download progress
    const unsubscribe = DownloadManager.subscribe((item: DownloadItem) => {
      const key = item.searchResultId || item.id;
      setDownloadProgress((prev) => ({
        ...prev,
        [key]: Math.round(item.progress * 100),
      }));

      if (item.status === 'completed' && item.bookId) {
        setDownloadedBookIds((prev) => ({
          ...prev,
          [key]: item.bookId!,
        }));
        refreshLibrary();
      }

      if (item.status === 'error') {
        setDownloadProgress((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    });

    return () => unsubscribe();
  }, [refreshLibrary]);

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults(DiscoveryService.getCuratedByGenre(selectedGenre));
      return;
    }
    setIsSearching(true);
    try {
      const data = await DiscoveryService.searchAllOpenApis(query.trim());
      setResults(data);
    } catch (e) {
      console.warn('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectGenre = (genre: string) => {
    setSelectedGenre(genre);
    setQuery('');
    setResults(DiscoveryService.getCuratedByGenre(genre));
  };

  const handleOpenUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(url);
      }
    } catch (err: any) {
      Alert.alert('Unable to open link', err.message || 'Please check URL in browser.');
    }
  };

  const handleDirectBrowserDownload = async (book: FreeBookSearchResult) => {
    if (!book.downloadUrl) {
      Alert.alert('No Direct Link', 'This book does not have an external direct download link.');
      return;
    }
    Alert.alert(
      'Direct File Download',
      `Open direct ${book.format.toUpperCase()} link for "${book.title}" in your device browser? You can also tap "Download" to save and read it directly inside Libora.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download In-App',
          onPress: () => handleDownload(book),
        },
        {
          text: 'Open in Browser',
          onPress: () => handleOpenUrl(book.downloadUrl),
        },
      ]
    );
  };

  const handleDownload = async (book: FreeBookSearchResult) => {
    // Set immediate progress to 10% for instant visual feedback on card button
    setDownloadProgress((prev) => ({
      ...prev,
      [book.id]: 10,
    }));

    try {
      await DownloadManager.startDownload(book, (imported) => {
        setDownloadedBookIds((prev) => ({
          ...prev,
          [book.id]: imported.id,
        }));
        refreshLibrary();
        Alert.alert(
          'Download Complete',
          `"${imported.title}" by ${imported.author} is saved in your Library!`,
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Read Now',
              onPress: () => router.push(`/reader/${imported.id}` as any),
            },
          ]
        );
      });
    } catch {
      setDownloadProgress((prev) => {
        const next = { ...prev };
        delete next[book.id];
        return next;
      });
      Alert.alert(
        'Reading Options',
        `Network issue downloading "${book.title}". Would you like to read the Instant Edition, or open the direct download link in your browser?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Read Instant Edition',
            onPress: async () => {
              try {
                const instant = await DownloadManager.saveInstantEdition(book);
                setDownloadedBookIds((prev) => ({ ...prev, [book.id]: instant.id }));
                refreshLibrary();
                router.push(`/reader/${instant.id}` as any);
              } catch (err: any) {
                Alert.alert('Error', err.message || 'Could not load book.');
              }
            },
          },
          {
            text: 'Open in Browser',
            onPress: () => handleOpenUrl(book.downloadUrl || book.websiteUrl || 'https://www.gutenberg.org'),
          },
        ]
      );
    }
  };

  const renderRepositoryItem = ({ item }: { item: FreeBookRepository }) => (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={() => handleOpenUrl(item.url)}
      style={[
        styles.repoCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.repoHeader}>
        <View style={[styles.repoIconWrap, { backgroundColor: colors.accent + '15' }]}>
          <Ionicons name={item.icon as any} size={20} color={colors.accent} />
        </View>
        <View style={[styles.repoBadge, { backgroundColor: colors.surfaceSubtle }]}>
          <Text style={[styles.repoBadgeText, { color: colors.accent }]}>{item.badge}</Text>
        </View>
      </View>
      <Text numberOfLines={1} style={[styles.repoName, { color: colors.textPrimary }]}>
        {item.name}
      </Text>
      <Text numberOfLines={2} style={[styles.repoDesc, { color: colors.textSecondary }]}>
        {item.description}
      </Text>
      <View style={styles.repoActionRow}>
        <Text style={[styles.repoActionText, { color: colors.accent }]}>Visit Website</Text>
        <Ionicons name="arrow-forward" size={13} color={colors.accent} style={{ marginLeft: 4 }} />
      </View>
    </TouchableOpacity>
  );

  const renderListHeader = () => (
    <View style={styles.headerBlock}>
      {/* Free Book Repositories / Sources Section */}
      <View style={styles.reposSection}>
        <View style={styles.sectionTitleRow}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Free Book Repositories
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Visit official websites, download EPUB or PDF, and read offline
            </Text>
          </View>
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FREE_BOOK_REPOSITORIES}
          keyExtractor={(item) => item.id}
          renderItem={renderRepositoryItem}
          contentContainerStyle={styles.repoList}
        />
      </View>

      {/* Guide Banner */}
      <View
        style={[
          styles.guideCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.guideIconWrap}>
          <Ionicons name="bulb-outline" size={22} color={colors.accent} />
        </View>
        <View style={styles.guideContent}>
          <Text style={[styles.guideTitle, { color: colors.textPrimary }]}>
            How to Download & Read on Libora
          </Text>
          <Text style={[styles.guideText, { color: colors.textSecondary }]}>
            1. Tap any repository above or <Text style={{ fontWeight: '700' }}>Visit Website</Text> on any book.
            {'\n'}2. Download the EPUB, PDF, or TXT file in your browser.
            {'\n'}3. Open Libora Library and tap <Text style={{ fontWeight: '700' }}>Import Document</Text> or <Text style={{ fontWeight: '700' }}>Scan Folders</Text>.
            {'\n'}4. Read immediately with distraction-free Kindle typography!
          </Text>
        </View>
      </View>

      {/* Genre Pills */}
      <View style={styles.genreSection}>
        <Text style={[styles.genreTitle, { color: colors.textPrimary }]}>
          Browse by Subject
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreScroll}
        >
          {GENRES.map((genre) => {
            const isSelected = selectedGenre === genre;
            return (
              <TouchableOpacity
                key={genre}
                onPress={() => handleSelectGenre(genre)}
                style={[
                  styles.genrePill,
                  {
                    backgroundColor: isSelected ? colors.accent : colors.surface,
                    borderColor: isSelected ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.genrePillText,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {genre}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results Header */}
      <View style={styles.resultsHeaderRow}>
        <Text style={[styles.resultsHeaderTitle, { color: colors.textPrimary }]}>
          {query ? `Search Results for "${query}"` : `${selectedGenre} Classics`}
        </Text>
        <Text style={[styles.resultsCount, { color: colors.textMuted }]}>
          {results.length} available
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Discover Books</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            Public domain & open-access literature
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/downloads' as any)}
          style={[styles.headerBtn, { backgroundColor: colors.surfaceSubtle }]}
        >
          <Ionicons name="cloud-download-outline" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            placeholder="Search Open Library, Gutenberg, or authors..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={handleSearch}
          style={[styles.searchBtn, { backgroundColor: colors.accent }]}
        >
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Results List with Header */}
      {isSearching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Searching Open Library & archives...
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderListHeader}
          renderItem={({ item }) => (
            <View
              style={[
                styles.resultCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {item.coverUrl ? (
                <Image source={{ uri: item.coverUrl }} style={styles.bookCover} resizeMode="cover" />
              ) : (
                <View
                  style={[
                    styles.bookCoverPlaceholder,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                  ]}
                >
                  <Ionicons name="book-outline" size={24} color={colors.accent} />
                </View>
              )}

              <View style={styles.resultDetails}>
                <View style={styles.sourceBadgeRow}>
                  <View style={[styles.sourceBadge, { backgroundColor: colors.surfaceSubtle }]}>
                    <Text style={[styles.sourceBadgeText, { color: colors.accent }]}>
                      {item.source === 'gutenberg' ? 'PROJECT GUTENBERG' : 'OPEN LIBRARY'}
                    </Text>
                  </View>
                  <Text style={[styles.formatBadge, { color: colors.textMuted }]}>
                    {item.format.toUpperCase()}
                  </Text>
                </View>

                <Text numberOfLines={2} style={[styles.resultTitle, { color: colors.textPrimary }]}>
                  {item.title}
                </Text>
                <Text numberOfLines={1} style={[styles.resultAuthor, { color: colors.textSecondary }]}>
                  {item.author} {item.year ? `(${item.year})` : ''}
                </Text>

                {item.description ? (
                  <Text numberOfLines={2} style={[styles.resultDesc, { color: colors.textMuted }]}>
                    {item.description}
                  </Text>
                ) : null}

                {/* Action Row: Download/Read Now, Direct File Link & Catalog Website */}
                <View style={styles.actionRow}>
                  {/* Download / Read Now button */}
                  {(() => {
                    const existingBook = books.find(
                      (b) => b.title.toLowerCase() === item.title.toLowerCase()
                    );
                    const bookIdToOpen = downloadedBookIds[item.id] || existingBook?.id;
                    const isDownloading =
                      downloadProgress[item.id] !== undefined &&
                      downloadProgress[item.id] < 100 &&
                      !bookIdToOpen;

                    if (bookIdToOpen) {
                      return (
                        <TouchableOpacity
                          onPress={() => router.push(`/reader/${bookIdToOpen}` as any)}
                          style={[styles.downloadBtn, { backgroundColor: '#10B981' }]}
                        >
                          <Ionicons name="book-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.downloadBtnText}>Read Now</Text>
                        </TouchableOpacity>
                      );
                    }

                    if (isDownloading) {
                      return (
                        <View style={[styles.downloadBtn, { backgroundColor: colors.accent, opacity: 0.9 }]}>
                          <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.downloadBtnText}>
                            {downloadProgress[item.id]}%
                          </Text>
                        </View>
                      );
                    }

                    return (
                      <TouchableOpacity
                        onPress={() => handleDownload(item)}
                        style={[styles.downloadBtn, { backgroundColor: colors.accent }]}
                      >
                        <Ionicons name="download-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.downloadBtnText}>Download</Text>
                      </TouchableOpacity>
                    );
                  })()}

                  {/* Direct File Link button */}
                  {item.downloadUrl ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleDirectBrowserDownload(item)}
                      style={[
                        styles.websiteBtn,
                        { borderColor: colors.border, backgroundColor: colors.surfaceSubtle },
                      ]}
                    >
                      <Ionicons name="cloud-download-outline" size={13} color={colors.accent} style={{ marginRight: 4 }} />
                      <Text style={[styles.websiteBtnText, { color: colors.accent }]}>
                        Direct File
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {/* Visit Source Website button */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleOpenUrl(item.websiteUrl || item.downloadUrl)}
                    style={[
                      styles.websiteBtn,
                      { borderColor: colors.border, backgroundColor: colors.surfaceSubtle },
                    ]}
                  >
                    <Ionicons name="globe-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.websiteBtnText, { color: colors.textSecondary }]}>
                      Website
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'serif',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    height: 42,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  searchBtn: {
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  headerBlock: {
    marginBottom: 10,
  },
  reposSection: {
    marginTop: 6,
    marginBottom: 14,
  },
  sectionTitleRow: {
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.serifBold,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  repoList: {
    paddingVertical: 4,
    gap: 10,
  },
  repoCard: {
    width: 210,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'space-between',
    marginRight: 10,
  },
  repoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  repoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  repoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  repoName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  repoDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 10,
  },
  repoActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repoActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  guideCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  guideIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  guideContent: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  guideText: {
    fontSize: 11.5,
    lineHeight: 17,
  },
  genreSection: {
    marginBottom: 14,
  },
  genreTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  genreScroll: {
    paddingVertical: 2,
    gap: 8,
  },
  genrePill: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    marginRight: 6,
  },
  genrePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  resultsHeaderTitle: {
    fontSize: 15,
    fontFamily: Fonts.serifBold,
  },
  resultsCount: {
    fontSize: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  resultCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  bookCover: {
    width: 74,
    height: 110,
    borderRadius: 6,
  },
  bookCoverPlaceholder: {
    width: 74,
    height: 110,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultDetails: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  },
  sourceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  formatBadge: {
    fontSize: 10,
    fontWeight: '600',
  },
  resultTitle: {
    fontSize: 15,
    fontFamily: Fonts.serifBold,
    marginTop: 4,
  },
  resultAuthor: {
    fontSize: 13,
    marginTop: 2,
  },
  resultDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  websiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  websiteBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
});
