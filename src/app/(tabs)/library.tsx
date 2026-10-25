import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLibrary } from '../../context/LibraryContext';
import { BookCard } from '../../components/BookCard';
import { EmptyState } from '../../components/EmptyState';
import { DeviceScannerModal } from '../../components/DeviceScannerModal';
import { Fonts } from '../../theme';
import { ReadingStatus, Book } from '../../types';

type FilterTab = 'all' | ReadingStatus;
type SortOption = 'recent' | 'title' | 'author' | 'progress';

export default function LibraryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { books, importLocalBook, importFromUrl, collections, refreshLibrary, deleteBook } = useLibrary();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [isScannerModalVisible, setIsScannerModalVisible] = useState(false);
  const [isUrlModalVisible, setIsUrlModalVisible] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [urlAuthor, setUrlAuthor] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleBookLongPress = (book: Book) => {
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

  const filteredBooks = useMemo(() => {
    return books
      .filter((b) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = b.title.toLowerCase().includes(q);
          const matchAuthor = b.author.toLowerCase().includes(q);
          if (!matchTitle && !matchAuthor) return false;
        }

        // Status filter
        if (activeFilter !== 'all' && b.status !== activeFilter) {
          return false;
        }

        // Collection filter
        if (selectedCollection !== 'all' && !b.collections.includes(selectedCollection)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'recent') return (b.lastReadAt || b.addedAt) - (a.lastReadAt || a.addedAt);
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        if (sortBy === 'author') return a.author.localeCompare(b.author);
        if (sortBy === 'progress') return (b.readingProgress || 0) - (a.readingProgress || 0);
        return 0;
      });
  }, [books, searchQuery, activeFilter, selectedCollection, sortBy]);

  const handlePickLocal = async () => {
    setIsImportModalVisible(false);
    setIsImporting(true);
    try {
      const book = await importLocalBook();
      if (book) {
        Alert.alert('Imported Successfully', `"${book.title}" added to your bookshelf.`);
      }
    } catch (e: any) {
      Alert.alert('Import Error', e.message || 'Failed to import document.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadFromUrl = async () => {
    if (!urlInput.trim()) {
      Alert.alert('Error', 'Please enter a valid book URL');
      return;
    }
    setIsUrlModalVisible(false);
    setIsImporting(true);
    try {
      const book = await importFromUrl(urlInput.trim(), urlTitle.trim() || undefined, urlAuthor.trim() || undefined);
      setUrlInput('');
      setUrlTitle('');
      setUrlAuthor('');
      Alert.alert('Downloaded Successfully', `"${book.title}" is now available offline.`);
    } catch (e: any) {
      Alert.alert('Download Error', e.message || 'Could not download book from URL.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image
            source={require('../../../assets/libora.png')}
            style={{ width: 34, height: 34, borderRadius: 8, marginRight: 10 }}
            resizeMode="contain"
          />
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>My Library</Text>
            <Text style={[styles.bookCountText, { color: colors.textSecondary }]}>
              {books.length} {books.length === 1 ? 'book' : 'books'} on shelf
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => {
              const next: Record<SortOption, SortOption> = {
                recent: 'title',
                title: 'author',
                author: 'progress',
                progress: 'recent',
              };
              setSortBy(next[sortBy]);
            }}
            style={[styles.actionBtn, { backgroundColor: colors.surfaceSubtle }]}
          >
            <Ionicons name="swap-vertical-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            style={[styles.actionBtn, { backgroundColor: colors.surfaceSubtle }]}
          >
            <Ionicons
              name={viewMode === 'grid' ? 'list-outline' : 'grid-outline'}
              size={20}
              color={colors.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/quotes' as any)}
            style={[styles.actionBtn, { backgroundColor: colors.surfaceSubtle }]}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.accent} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsImportModalVisible(true)}
            style={[styles.importBtn, { backgroundColor: colors.accent }]}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.importBtnText}>Import</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <View
          style={[
            styles.searchInputWrapper,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search titles, authors, files..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterScrollWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { id: 'all', label: 'All Books' },
            { id: 'currently-reading', label: 'Reading' },
            { id: 'want-to-read', label: 'Want to Read' },
            { id: 'completed', label: 'Finished' },
            { id: 'favorite', label: 'Favorites' },
          ]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = activeFilter === item.id;
            return (
              <TouchableOpacity
                onPress={() => setActiveFilter(item.id as FilterTab)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? colors.accent : colors.surface,
                    borderColor: isSelected ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      </View>

      {/* Collection Filter Row */}
      {collections.length > 0 && (
        <View style={{ paddingBottom: 6 }}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: 'all', name: 'All Shelves' }, ...collections]}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = selectedCollection === item.id;
              return (
                <TouchableOpacity
                  onPress={() => setSelectedCollection(item.id)}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: isSelected ? colors.accent : colors.surfaceSubtle,
                      borderColor: isSelected ? colors.accent : colors.border,
                      paddingVertical: 5,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: isSelected ? '#FFFFFF' : colors.textSecondary, fontSize: 11 },
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        </View>
      )}

      {/* Bookshelf Grid / List Content */}
      {isImporting ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Importing & processing document...
          </Text>
        </View>
      ) : filteredBooks.length === 0 ? (
        <EmptyState
          iconName="library-outline"
          title="Your shelf is waiting"
          description="Import your first PDF or EPUB book from your device, or download free public-domain classics."
          actionLabel="Import Book"
          onAction={() => setIsImportModalVisible(true)}
          secondaryActionLabel="Browse Free Books"
          onSecondaryAction={() => router.push('/(tabs)/browse' as any)}
        />
      ) : (
        <FlatList
          key={viewMode}
          data={filteredBooks}
          numColumns={viewMode === 'grid' ? 3 : 1}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={viewMode === 'grid' ? styles.gridCol : undefined}>
              <BookCard
                book={item}
                mode={viewMode}
                onLongPress={() => handleBookLongPress(item)}
              />
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Import Modal */}
      <Modal
        visible={isImportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsImportModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsImportModalVisible(false)}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add to Library</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Documents remain stored securely on your local device.
            </Text>

            <TouchableOpacity
              onPress={() => {
                setIsImportModalVisible(false);
                setIsScannerModalVisible(true);
              }}
              style={[styles.modalOption, { backgroundColor: colors.surfaceSubtle }]}
            >
              <View style={[styles.optionIconCircle, { backgroundColor: colors.accent + '22' }]}>
                <Ionicons name="folder-open-outline" size={24} color={colors.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                  Scan Device Folders (PDF & EPUB)
                </Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                  Scan downloads or storage & batch-import books
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePickLocal}
              style={[styles.modalOption, { backgroundColor: colors.surfaceSubtle }]}
            >
              <View style={[styles.optionIconCircle, { backgroundColor: colors.accent + '22' }]}>
                <Ionicons name="document-text-outline" size={24} color={colors.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                  Choose Single File
                </Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                  Select a single PDF or EPUB document
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsImportModalVisible(false);
                setIsUrlModalVisible(true);
              }}
              style={[styles.modalOption, { backgroundColor: colors.surfaceSubtle }]}
            >
              <View style={[styles.optionIconCircle, { backgroundColor: colors.accent + '22' }]}>
                <Ionicons name="link-outline" size={24} color={colors.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                  Add from Web URL
                </Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                  Download direct PDF or EPUB file link
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsImportModalVisible(false);
                router.push('/(tabs)/browse' as any);
              }}
              style={[styles.modalOption, { backgroundColor: colors.surfaceSubtle }]}
            >
              <View style={[styles.optionIconCircle, { backgroundColor: colors.accent + '22' }]}>
                <Ionicons name="compass-outline" size={24} color={colors.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                  Browse Free Classics
                </Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                  Public-domain books from Project Gutenberg
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* URL Download Modal */}
      <Modal
        visible={isUrlModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsUrlModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.urlDialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add from URL</Text>
            <TextInput
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="https://example.com/book.epub"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              style={[styles.urlTextInput, { color: colors.textPrimary, borderColor: colors.border }]}
            />
            <TextInput
              value={urlTitle}
              onChangeText={setUrlTitle}
              placeholder="Book Title (optional)"
              placeholderTextColor={colors.textMuted}
              style={[styles.urlTextInput, { color: colors.textPrimary, borderColor: colors.border, marginTop: 8 }]}
            />
            <TextInput
              value={urlAuthor}
              onChangeText={setUrlAuthor}
              placeholder="Author (optional)"
              placeholderTextColor={colors.textMuted}
              style={[styles.urlTextInput, { color: colors.textPrimary, borderColor: colors.border, marginTop: 8 }]}
            />
            <View style={styles.urlBtnRow}>
              <TouchableOpacity
                onPress={() => setIsUrlModalVisible(false)}
                style={[styles.dialogBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDownloadFromUrl}
                style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Download</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DeviceScannerModal
        visible={isScannerModalVisible}
        onClose={() => setIsScannerModalVisible(false)}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.serifBold,
  },
  bookCountText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  importBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterScrollWrapper: {
    paddingVertical: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  gridCol: {
    flex: 1 / 3,
    alignItems: 'center',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    padding: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  modalSub: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  optionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  urlDialog: {
    margin: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  urlTextInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 14,
    fontSize: 14,
  },
  urlBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  dialogBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
});
