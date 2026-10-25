import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { StorageService } from '../../storage';
import { useTheme } from '../../context/ThemeContext';
import { useLibrary } from '../../context/LibraryContext';
import { useReader } from '../../context/ReaderContext';
import {
  BookReaderEngine,
  BUILTIN_BOOK_TEXTS,
  getBookTableOfContentsAsync,
  TableOfContentsItem,
} from '../../components/BookReaderEngine';
import { ReaderControls } from '../../components/ReaderControls';
import { ReaderSettingsModal } from '../../components/ReaderSettingsModal';
import { TextSelectionPopup } from '../../components/TextSelectionPopup';

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { books, updateBookProgress, markBookOpened } = useLibrary();
  const {
    settings,
    updateSettings,
    addHighlight,
    addNote,
    addQuote,
    bookmarks,
    addBookmark,
    deleteBookmark,
  } = useReader();

  const book = books.find((b) => b.id === id);

  const [controlsVisible, setControlsVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(book?.currentPage || 1);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isSentencesSheetOpen, setIsSentencesSheetOpen] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuotePickerOpen, setIsQuotePickerOpen] = useState(false);
  const [customQuoteText, setCustomQuoteText] = useState('');
  const [customThoughtText, setCustomThoughtText] = useState('');
  const [clearSelectionTrigger, setClearSelectionTrigger] = useState(0);
  const [pageTexts, setPageTexts] = useState<Record<number, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ chapter: string; snippet: string; page: number }[]>([]);
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const hasMarkedOpenedRef = useRef<string | null>(null);

  useEffect(() => {
    if (book) {
      if (hasMarkedOpenedRef.current !== book.id) {
        hasMarkedOpenedRef.current = book.id;
        markBookOpened(book.id);
      }
      setCurrentPage(book.currentPage || 1);
      getBookTableOfContentsAsync(book).then((toc) => {
        setTableOfContents(toc);
      });
    }
  }, [book, markBookOpened]);

  const [resolvedFileUri, setResolvedFileUri] = useState<string | null>(book?.fileUri || null);

  useEffect(() => {
    if (book && !book.fileUri) {
      (async () => {
        try {
          const defaultPath = `${StorageService.getBooksDirectory()}${book.id}.${book.format || 'pdf'}`;
          const check = await FileSystem.getInfoAsync(defaultPath);
          if (check.exists) {
            book.fileUri = defaultPath;
            setResolvedFileUri(defaultPath);
            await StorageService.saveBook(book);
            return;
          }
          const cachedPdf = await AsyncStorage.getItem(`@libora_book_pdf_${book.id}`);
          if (cachedPdf) {
            book.fileUri = defaultPath;
            setResolvedFileUri(defaultPath);
            await FileSystem.writeAsStringAsync(defaultPath, cachedPdf, {
              encoding: FileSystem.EncodingType.Base64,
            });
            await StorageService.saveBook(book);
            return;
          }
        } catch {}
      })();
    } else if (book?.fileUri) {
      setResolvedFileUri(book.fileUri);
    }
  }, [book]);

  if (!book || (!book.fileUri && !resolvedFileUri)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.accent} />
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 16 }}>
            {!book ? 'Book not found' : 'Book file not on this device'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 36 }}>
            {!book
              ? 'This book is not in your library.'
              : 'This book was read on another installation. Please re-import or download the file to read, or view your reviews in the Diary.'}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: colors.accent, marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}
            onPress={() => router.back()}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isCurrentPageBookmarked = bookmarks.some(
    (bm) => bm.bookId === book.id && bm.page === currentPage
  );

  const handlePageChange = async (page: number, total: number) => {
    setCurrentPage(page);
    await updateBookProgress(book.id, page, total);
  };

  const handleToggleBookmark = async () => {
    if (isCurrentPageBookmarked) {
      const existing = bookmarks.find((b) => b.bookId === book.id && b.page === currentPage);
      if (existing) await deleteBookmark(existing.id);
    } else {
      await addBookmark(book.id, currentPage);
    }
  };

  const handleTextSelected = (text: string) => {
    if (text.length > 2) {
      setSelectedText(text);
      setIsSelectionModalOpen(true);
    }
  };

  const handleCloseSelectionModal = () => {
    setIsSelectionModalOpen(false);
    setClearSelectionTrigger((c) => c + 1);
  };

  const handlePageTextReceived = (text: string, page?: number) => {
    const targetPage = typeof page === 'number' && page > 0 ? page : currentPage;
    setPageTexts((prev) => {
      if (prev[targetPage] === text) return prev;
      return { ...prev, [targetPage]: text };
    });
    // Auto-index text into book content cache for search
    if (book && text.length > 20) {
      AsyncStorage.getItem(`@libora_book_content_${book.id}`)
        .then((cached) => {
          if (!cached || !cached.includes(text.slice(0, 30))) {
            const updated = (cached ? cached + '\n\n' : '') + `[Page ${targetPage}]\n` + text;
            AsyncStorage.setItem(`@libora_book_content_${book.id}`, updated).catch(() => {});
          }
        })
        .catch(() => {});
    }
  };

  const handlePerformSearch = async () => {
    if (!searchQuery.trim() || !book) return;
    setIsSearching(true);
    setHasSearched(true);
    const q = searchQuery.trim().toLowerCase();

    // 1. Search built-in books with actual text content
    if (book.fileUri && book.fileUri.startsWith('builtin_')) {
      const builtin = BUILTIN_BOOK_TEXTS[book.fileUri];
      if (builtin && builtin.chapters.length > 0) {
        const results: { chapter: string; snippet: string; page: number }[] = [];
        let totalChars = 0;
        builtin.chapters.forEach((c) => {
          totalChars += c.content.length;
        });
        let charAcc = 0;

        builtin.chapters.forEach((chapter) => {
          const chLower = chapter.content.toLowerCase();
          let idx = chLower.indexOf(q);
          let matchCount = 0;
          while (idx !== -1 && matchCount < 8) {
            matchCount++;
            const snippetStart = Math.max(0, idx - 45);
            const snippetEnd = Math.min(chapter.content.length, idx + q.length + 55);
            const snippet =
              (snippetStart > 0 ? '...' : '') +
              chapter.content.slice(snippetStart, snippetEnd).replace(/\s+/g, ' ').trim() +
              (snippetEnd < chapter.content.length ? '...' : '');

            const globalPos = charAcc + idx;
            const estPage = Math.max(
              1,
              Math.min(
                book.pageCount,
                Math.round(1 + (globalPos / Math.max(1, totalChars)) * (book.pageCount - 1))
              )
            );

            results.push({
              chapter: chapter.title,
              snippet,
              page: estPage,
            });

            idx = chLower.indexOf(q, idx + q.length + 1);
          }
          charAcc += chapter.content.length;
        });

        setSearchResults(results);
        setIsSearching(false);
        return;
      }
    }

    // 2. Search cached text from AsyncStorage (@libora_book_content_${book.id})
    try {
      const cached = await AsyncStorage.getItem(`@libora_book_content_${book.id}`);
      if (cached && cached.length > 0) {
        const results: { chapter: string; snippet: string; page: number }[] = [];
        const lower = cached.toLowerCase();
        let idx = lower.indexOf(q);
        let count = 0;
        while (idx !== -1 && count < 12) {
          count++;
          const start = Math.max(0, idx - 45);
          const end = Math.min(cached.length, idx + q.length + 55);
          const snippet =
            (start > 0 ? '...' : '') +
            cached.slice(start, end).replace(/\s+/g, ' ').trim() +
            (end < cached.length ? '...' : '');

          const estPage = Math.max(
            1,
            Math.min(
              book.pageCount,
              Math.round(1 + (idx / cached.length) * (book.pageCount - 1))
            )
          );

          results.push({
            chapter: `Page ${estPage} Landmark`,
            snippet,
            page: estPage,
          });

          idx = lower.indexOf(q, idx + q.length + 1);
        }
        setSearchResults(results);
        setIsSearching(false);
        return;
      }
    } catch {}

    // 3. Fallback: Search TOC landmarks and book metadata
    const toc = tableOfContents.length > 0 ? tableOfContents : await getBookTableOfContentsAsync(book);
    const matchedToc = toc
      .filter((item) => item.title.toLowerCase().includes(q))
      .map((item) => ({
        chapter: item.title,
        snippet: `Section matches search query "${searchQuery.trim()}"`,
        page: item.page,
      }));

    if (matchedToc.length > 0) {
      setSearchResults(matchedToc);
    } else {
      setSearchResults([]);
    }
    setIsSearching(false);
  };

  const getBackgroundColor = () => {
    switch (settings.theme) {
      case 'light':
        return '#FAF8F5';
      case 'sepia':
        return '#F6EEDF';
      case 'dark':
        return '#111827';
      case 'amoled':
        return '#000000';
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: getBackgroundColor() }]}
      edges={['top', 'bottom']}
    >
      {/* Top and Bottom Controls Overlay */}
      <ReaderControls
        visible={controlsVisible}
        bookTitle={book.title}
        chapterTitle={`Page ${currentPage}`}
        currentPage={currentPage}
        pageCount={book.pageCount}
        isBookmarked={isCurrentPageBookmarked}
        settings={settings}
        isSelectionMode={isSelectionMode}
        onToggleSelectionMode={() => setIsSelectionMode((prev) => !prev)}
        onOpenSentencesPicker={() => setIsSentencesSheetOpen(true)}
        onBack={() => router.back()}
        onToggleBookmark={handleToggleBookmark}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenToc={() => setIsTocOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenQuoteTool={() => {
          if (selectedText && selectedText.trim().length > 2) {
            setIsSelectionModalOpen(true);
          } else {
            const pageContent = pageTexts[currentPage] || '';
            setCustomQuoteText(pageContent.slice(0, 240).trim());
            setCustomThoughtText('');
            setIsQuotePickerOpen(true);
          }
        }}
        onPrevPage={() => handlePageChange(Math.max(1, currentPage - 1), book.pageCount)}
        onNextPage={() => handlePageChange(Math.min(book.pageCount, currentPage + 1), book.pageCount)}
      />

      {/* Embedded High-Performance Reader Engine Centered Column */}
      <View style={styles.readerWrapper}>
        <BookReaderEngine
          book={book}
          settings={settings}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onToggleControls={() => setControlsVisible(!controlsVisible)}
          onTextSelected={handleTextSelected}
          onPageText={handlePageTextReceived}
          clearSelectionTrigger={clearSelectionTrigger}
          onPrevPage={() => handlePageChange(Math.max(1, currentPage - 1), book.pageCount)}
          onNextPage={() => handlePageChange(Math.min(book.pageCount, currentPage + 1), book.pageCount)}
          isSelectionMode={isSelectionMode}
        />
      </View>

      {/* Text Selection Interaction Popup */}
      <TextSelectionPopup
        visible={isSelectionModalOpen}
        selectedText={selectedText}
        onHighlight={async (color) => {
          await addHighlight(book.id, book.title, book.author, selectedText, currentPage, color);
          handleCloseSelectionModal();
        }}
        onAddNote={async (noteText) => {
          await addNote(book.id, book.title, book.author, noteText, currentPage, selectedText);
          handleCloseSelectionModal();
        }}
        onSaveQuote={async (thought) => {
          await addQuote(book.id, book.title, book.author, selectedText, currentPage, thought);
          handleCloseSelectionModal();
          Alert.alert('Quote Saved', 'Passage added to your Quotes & Reading Journal.');
        }}
        onOpenQuoteCard={() => {
          handleCloseSelectionModal();
          router.push({
            pathname: '/quote-card',
            params: {
              text: selectedText,
              author: book.author,
              bookTitle: book.title,
              location: currentPage,
            },
          } as any);
        }}
        onCopy={() => {
          handleCloseSelectionModal();
          Alert.alert('Copied', 'Passage copied to clipboard.');
        }}
        onClose={handleCloseSelectionModal}
      />

      {/* Reader Settings Modal */}
      <ReaderSettingsModal
        visible={isSettingsOpen}
        settings={settings}
        onUpdate={updateSettings}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Table of Contents Modal */}
      <Modal visible={isTocOpen} transparent animationType="slide" onRequestClose={() => setIsTocOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Table of Contents</Text>
              <TouchableOpacity onPress={() => setIsTocOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={tableOfContents}
              keyExtractor={(item, index) => `${item.title}_${index}`}
              ListEmptyComponent={
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ color: colors.textSecondary }}>No chapter landmarks found</Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    handlePageChange(item.page, book.pageCount);
                    setIsTocOpen(false);
                  }}
                  style={[styles.tocRow, { borderBottomColor: colors.border }]}
                >
                  <Text style={[styles.tocText, { color: colors.textPrimary }]}>{item.title}</Text>
                  <Text style={[styles.tocPage, { color: colors.accent }]}>p. {item.page}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* In-Book Search Modal */}
      <Modal visible={isSearchOpen} transparent animationType="slide" onRequestClose={() => setIsSearchOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Search in Book</Text>
              <TouchableOpacity onPress={() => setIsSearchOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handlePerformSearch}
                placeholder="Find text, terms, or ideas..."
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.textPrimary }]}
              />
              <TouchableOpacity onPress={handlePerformSearch} disabled={isSearching} style={{ padding: 4 }}>
                {isSearching ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Ionicons name="search" size={20} color={colors.accent} />
                )}
              </TouchableOpacity>
            </View>

            <FlatList
              data={searchResults}
              keyExtractor={(_, i) => String(i)}
              ListEmptyComponent={
                hasSearched && !isSearching ? (
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <Ionicons name="search-outline" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
                    <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 14 }}>
                      No occurrences found
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                      "{searchQuery}" does not appear in this book.
                    </Text>
                  </View>
                ) : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    handlePageChange(item.page, book.pageCount);
                    setIsSearchOpen(false);
                  }}
                  style={[styles.tocRow, { borderBottomColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.searchChapter, { color: colors.accent }]}>{item.chapter}</Text>
                    <Text style={[styles.searchSnippet, { color: colors.textSecondary }]}>
                      {item.snippet}
                    </Text>
                  </View>
                  <Text style={[styles.tocPage, { color: colors.textMuted }]}>p. {item.page}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Page Quote & Passage Picker Modal */}
      <Modal visible={isQuotePickerOpen} transparent animationType="slide" onRequestClose={() => { setIsQuotePickerOpen(false); setClearSelectionTrigger((c) => c + 1); }}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border, maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Quote & Highlight</Text>
                <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                  Page {currentPage} of {book.pageCount}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setIsQuotePickerOpen(false); setClearSelectionTrigger((c) => c + 1); }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Extracted passages from this page */}
            {pageTexts[currentPage] ? (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
                  Passages on Page {currentPage} (tap to select):
                </Text>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={pageTexts[currentPage]
                    .split(/(?<=[.!?])\s+/)
                    .map((s) => s.trim())
                    .filter((s) => s.length >= 15 && s.length <= 300)
                    .slice(0, 8)}
                  keyExtractor={(_, i) => String(i)}
                  contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => setCustomQuoteText(item)}
                      style={[
                        styles.passageChip,
                        {
                          backgroundColor: customQuoteText === item ? colors.accent + '25' : colors.surfaceSubtle,
                          borderColor: customQuoteText === item ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <Text
                        numberOfLines={2}
                        style={{
                          fontSize: 12,
                          color: customQuoteText === item ? colors.accent : colors.textPrimary,
                        }}
                      >
                        "{item}"
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            ) : null}

            {/* Quote passage input */}
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
              Quote Passage:
            </Text>
            <TextInput
              value={customQuoteText}
              onChangeText={setCustomQuoteText}
              placeholder="Paste or write the quote passage from this page..."
              placeholderTextColor={colors.textMuted}
              multiline
              style={[
                styles.quoteTextInput,
                {
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
            />

            {/* Personal thought input (optional) */}
            <TextInput
              value={customThoughtText}
              onChangeText={setCustomThoughtText}
              placeholder="Add your thought, reflection, or context (optional)..."
              placeholderTextColor={colors.textMuted}
              style={[
                styles.thoughtTextInput,
                {
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
            />

            {/* Highlight color quick buttons */}
            <View style={{ marginVertical: 10 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600', marginBottom: 6 }}>
                Quick Highlight:
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {[
                  { color: '#FDE047', name: 'Amber' },
                  { color: '#86EFAC', name: 'Emerald' },
                  { color: '#93C5FD', name: 'Sky' },
                  { color: '#F472B6', name: 'Rose' },
                  { color: '#C084FC', name: 'Lavender' },
                ].map((c) => (
                  <TouchableOpacity
                    key={c.color}
                    onPress={async () => {
                      const textToSave = customQuoteText.trim();
                      if (textToSave.length > 2) {
                        await addHighlight(book.id, book.title, book.author, textToSave, currentPage, c.color as any);
                        setIsQuotePickerOpen(false);
                        setClearSelectionTrigger((cnt) => cnt + 1);
                        Alert.alert('Highlighted', `Passage saved with ${c.name} highlight.`);
                      } else {
                        Alert.alert('Empty Passage', 'Please select or type a passage to highlight.');
                      }
                    }}
                    style={[styles.hlColorDot, { backgroundColor: c.color }]}
                  />
                ))}
              </View>
            </View>

            {/* Bottom Action buttons */}
            <View style={styles.quoteModalBtnRow}>
              <TouchableOpacity
                onPress={() => {
                  const textToSave = customQuoteText.trim();
                  if (textToSave.length > 2) {
                    setIsQuotePickerOpen(false);
                    setClearSelectionTrigger((cnt) => cnt + 1);
                    router.push({
                      pathname: '/quote-card',
                      params: {
                        text: textToSave,
                        author: book.author,
                        bookTitle: book.title,
                        location: currentPage,
                        thought: customThoughtText.trim() || undefined,
                      },
                    } as any);
                  } else {
                    Alert.alert('Empty Passage', 'Please select or type a passage to create a quote card.');
                  }
                }}
                style={[styles.quoteActionBtn, { borderColor: colors.border }]}
              >
                <Ionicons name="sparkles" size={16} color={colors.accent} style={{ marginRight: 4 }} />
                <Text style={[styles.quoteActionBtnText, { color: colors.textPrimary }]}>Card Studio</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  const textToSave = customQuoteText.trim();
                  if (textToSave.length > 2) {
                    await addQuote(book.id, book.title, book.author, textToSave, currentPage, customThoughtText.trim() || undefined);
                    setIsQuotePickerOpen(false);
                    setClearSelectionTrigger((cnt) => cnt + 1);
                    Alert.alert('Quote Saved', 'Added to your Reading Journal & Quotes archive.');
                  } else {
                    Alert.alert('Empty Passage', 'Please select or type a passage to save as quote.');
                  }
                }}
                style={[styles.quoteActionBtn, { backgroundColor: colors.accent }]}
              >
                <Ionicons name="bookmark" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={[styles.quoteActionBtnText, { color: '#FFFFFF' }]}>Save Quote</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Drive-Style Page Sentences & Text Blocks Modal */}
      <Modal
        visible={isSentencesSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSentencesSheetOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border, maxHeight: '82%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Page {currentPage} Sentences
                </Text>
                <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                  Tap any sentence to highlight, quote, or share as image card
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsSentencesSheetOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {(() => {
              const text = pageTexts[currentPage] || '';
              const sentences = text
                .split(/(?<=[.!?])\s+/)
                .map((s) => s.trim())
                .filter((s) => s.length >= 10);

              if (sentences.length === 0) {
                return (
                  <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                    <Ionicons name="document-text-outline" size={38} color={colors.textMuted} style={{ marginBottom: 8 }} />
                    <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 15 }}>
                      No isolated sentences indexed yet
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 }}>
                      You can select text directly on the reader page using touch selection handles.
                    </Text>
                  </View>
                );
              }

              return (
                <FlatList
                  data={sentences}
                  keyExtractor={(_, i) => String(i)}
                  ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                  renderItem={({ item, index }) => (
                    <View
                      style={[
                        styles.sentenceItemCard,
                        { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          setIsSentencesSheetOpen(false);
                          setSelectedText(item);
                          setIsSelectionModalOpen(true);
                        }}
                        style={{ flexDirection: 'row', alignItems: 'flex-start' }}
                      >
                        <View style={[styles.sentenceIndexBadge, { backgroundColor: colors.accent + '20' }]}>
                          <Text style={[styles.sentenceIndexText, { color: colors.accent }]}>#{index + 1}</Text>
                        </View>
                        <Text style={[styles.sentenceItemText, { color: colors.textPrimary }]}>
                          "{item}"
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.sentenceQuickActions}>
                        <TouchableOpacity
                          onPress={() => {
                            setIsSentencesSheetOpen(false);
                            router.push({
                              pathname: '/quote-card',
                              params: {
                                text: item,
                                author: book.author,
                                bookTitle: book.title,
                                location: currentPage,
                              },
                            } as any);
                          }}
                          style={[styles.sentenceQuickBtn, { borderColor: colors.border }]}
                        >
                          <Ionicons name="sparkles" size={13} color={colors.accent} style={{ marginRight: 4 }} />
                          <Text style={[styles.sentenceQuickBtnText, { color: colors.accent }]}>Share Card</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={async () => {
                            await addHighlight(book.id, book.title, book.author, item, currentPage, '#FDE047');
                            Alert.alert('Highlighted', 'Sentence highlighted in Amber.');
                          }}
                          style={[styles.sentenceQuickBtn, { borderColor: colors.border }]}
                        >
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FDE047', marginRight: 4 }} />
                          <Text style={[styles.sentenceQuickBtnText, { color: colors.textPrimary }]}>Highlight</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={async () => {
                            await addQuote(book.id, book.title, book.author, item, currentPage);
                            Alert.alert('Saved', 'Quote saved to reading journal.');
                          }}
                          style={[styles.sentenceQuickBtn, { backgroundColor: colors.accent }]}
                        >
                          <Ionicons name="bookmark" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={[styles.sentenceQuickBtnText, { color: '#FFFFFF' }]}>Quote</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
              );
            })()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  readerWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    position: 'relative',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  tocRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tocText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 10,
  },
  tocPage: {
    fontSize: 13,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    height: 42,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  searchChapter: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchSnippet: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 2,
  },
  passageChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 220,
  },
  quoteTextInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    fontSize: 13,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  thoughtTextInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 6,
  },
  hlColorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  quoteModalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  quoteActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  quoteActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sentenceItemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  sentenceIndexBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
    marginTop: 2,
  },
  sentenceIndexText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sentenceItemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  sentenceQuickActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  sentenceQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  sentenceQuickBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
