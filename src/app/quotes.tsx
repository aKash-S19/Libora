import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../context/ThemeContext';
import { useLibrary } from '../context/LibraryContext';
import { useReader } from '../context/ReaderContext';
import { StorageService } from '../storage';
import { Header } from '../components/Header';
import { QuoteCardView, QuoteCardTheme } from '../components/QuoteCardView';
import { Quote } from '../types';
import { Fonts } from '../theme';

type QuotesFilter = 'all' | 'favorites' | 'by_book';

export default function QuotesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { refreshLibrary } = useLibrary();
  const { quotes, deleteQuote, toggleQuoteFavorite } = useReader();

  const [filter, setFilter] = useState<QuotesFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookFilter, setSelectedBookFilter] = useState<string>('all');

  // Share as Image modal state
  const [activeQuoteForCard, setActiveQuoteForCard] = useState<Quote | null>(null);
  const [cardTheme, setCardTheme] = useState<QuoteCardTheme>('midnight');
  const [isExporting, setIsExporting] = useState(false);
  const quoteCardRef = useRef<View>(null);

  // Manual Add Quote modal state
  const [isAddQuoteModal, setIsAddQuoteModal] = useState(false);
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newQuoteAuthor, setNewQuoteAuthor] = useState('');
  const [newQuoteBook, setNewQuoteBook] = useState('');
  const [newQuoteThought, setNewQuoteThought] = useState('');

  // Book titles for filtering
  const bookTitles = useMemo(() => {
    const set = new Set<string>();
    quotes.forEach((q: Quote) => {
      if (q.bookTitle) set.add(q.bookTitle);
    });
    return Array.from(set);
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q: Quote) => {
      // 1. Text Search Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesText = q.text.toLowerCase().includes(query);
        const matchesAuthor = q.author?.toLowerCase().includes(query);
        const matchesBook = q.bookTitle?.toLowerCase().includes(query);
        const matchesThought = q.personalThought?.toLowerCase().includes(query);
        if (!matchesText && !matchesAuthor && !matchesBook && !matchesThought) return false;
      }

      // 2. Tab Filter
      if (filter === 'favorites' && !q.isFavorite) {
        return false;
      }

      // 3. Book Filter
      if (filter === 'by_book' && selectedBookFilter !== 'all' && q.bookTitle !== selectedBookFilter) {
        return false;
      }

      return true;
    });
  }, [quotes, searchQuery, filter, selectedBookFilter]);

  const handleCreateQuote = async () => {
    if (!newQuoteText.trim()) {
      Alert.alert('Required', 'Please enter quote text.');
      return;
    }
    const created: Quote = {
      id: `quote_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      bookId: 'custom',
      bookTitle: newQuoteBook.trim() || 'Personal Reflections',
      author: newQuoteAuthor.trim() || 'Unknown',
      text: newQuoteText.trim(),
      personalThought: newQuoteThought.trim() || undefined,
      location: 1,
      isFavorite: true,
      createdAt: Date.now(),
    };

    await StorageService.addQuote(created);
    await refreshLibrary();
    setIsAddQuoteModal(false);
    setNewQuoteText('');
    setNewQuoteAuthor('');
    setNewQuoteBook('');
    setNewQuoteThought('');
    Alert.alert('Quote Saved', 'New quote added to your Libora collection.');
  };

  const handleShareQuoteAsText = async (q: Quote) => {
    try {
      await Share.share({
        message: `“${q.text}”\n\n— ${q.author} (${q.bookTitle})\n\nShared via Libora`,
      });
    } catch {}
  };

  const handleExportImage = async () => {
    if (!quoteCardRef.current || !activeQuoteForCard) return;
    setIsExporting(true);
    try {
      const uri = await captureRef(quoteCardRef, {
        format: 'png',
        quality: 1,
      });

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Share quote from ${activeQuoteForCard.bookTitle}`,
        });
      } else {
        await handleShareQuoteAsText(activeQuoteForCard);
      }
    } catch (e: any) {
      console.warn('Quote card image export note:', e);
      if (activeQuoteForCard) {
        await handleShareQuoteAsText(activeQuoteForCard);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Quotes & Cards"
        showBack
        onBack={() => router.back()}
        rightAction={
          <TouchableOpacity
            onPress={() => setIsAddQuoteModal(true)}
            style={[styles.addQuoteHeaderBtn, { backgroundColor: colors.surfaceSubtle }]}
          >
            <Ionicons name="add" size={20} color={colors.accent} />
          </TouchableOpacity>
        }
      />

      {/* Search Input Bar */}
      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search quotes, authors, books, thoughts..."
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.textPrimary }]}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(
          [
            { id: 'all', label: `All Quotes (${quotes.length})`, icon: 'chatbubble-ellipses-outline' },
            { id: 'favorites', label: 'Favorites', icon: 'heart-outline' },
            { id: 'by_book', label: 'By Book', icon: 'book-outline' },
          ] as const
        ).map((tab) => {
          const isActive = filter === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setFilter(tab.id)}
              style={[
                styles.filterPill,
                {
                  backgroundColor: isActive ? colors.accent : colors.surfaceSubtle,
                  borderColor: isActive ? colors.accent : colors.border,
                },
              ]}
            >
              <Ionicons
                name={tab.icon as any}
                size={13}
                color={isActive ? '#FFFFFF' : colors.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.filterPillText,
                  { color: isActive ? '#FFFFFF' : colors.textPrimary, fontWeight: isActive ? '700' : '500' },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Book Filter Chips if 'by_book' is selected */}
      {filter === 'by_book' && bookTitles.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bookChipsScroll}
        >
          <TouchableOpacity
            onPress={() => setSelectedBookFilter('all')}
            style={[
              styles.bookChip,
              {
                backgroundColor: selectedBookFilter === 'all' ? colors.accent : colors.surfaceSubtle,
                borderColor: selectedBookFilter === 'all' ? colors.accent : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.bookChipText,
                { color: selectedBookFilter === 'all' ? '#FFFFFF' : colors.textPrimary },
              ]}
            >
              All Books
            </Text>
          </TouchableOpacity>
          {bookTitles.map((title) => {
            const isSelected = selectedBookFilter === title;
            return (
              <TouchableOpacity
                key={title}
                onPress={() => setSelectedBookFilter(title)}
                style={[
                  styles.bookChip,
                  {
                    backgroundColor: isSelected ? colors.accent : colors.surfaceSubtle,
                    borderColor: isSelected ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.bookChipText,
                    { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                  ]}
                >
                  {title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Quotes List */}
      <FlatList
        data={filteredQuotes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Quotes Found</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              {searchQuery
                ? 'No quotes matching your search query.'
                : 'Select text while reading any book or tap "+" above to add your first quote.'}
            </Text>
            <TouchableOpacity
              onPress={() => setIsAddQuoteModal(true)}
              style={[styles.emptyAddBtn, { backgroundColor: colors.accent }]}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.emptyAddBtnText}>Add a Favorite Quote</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.quoteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.quoteHeaderRow}>
              <Text style={[styles.quoteMark, { color: colors.accent }]}>“</Text>
              <TouchableOpacity
                onPress={() => toggleQuoteFavorite(item.id)}
                style={styles.favToggleBtn}
              >
                <Ionicons
                  name={item.isFavorite ? 'heart' : 'heart-outline'}
                  size={20}
                  color={item.isFavorite ? '#EF4444' : colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Main Quote Text */}
            <Text style={[styles.quoteBody, { color: colors.textPrimary }]}>
              {item.text}
            </Text>

            {/* Optional Personal Thought */}
            {item.personalThought ? (
              <View
                style={[
                  styles.thoughtBox,
                  { backgroundColor: colors.surfaceSubtle, borderLeftColor: colors.accent },
                ]}
              >
                <Text style={[styles.thoughtText, { color: colors.textSecondary }]}>
                  "{item.personalThought}"
                </Text>
              </View>
            ) : null}

            {/* Book & Author Citation */}
            <View style={styles.citationRow}>
              <Text style={[styles.authorText, { color: colors.accent }]}>
                — {item.author || 'Author'}
              </Text>
              <Text style={[styles.bookDetails, { color: colors.textMuted }]}>
                {item.bookTitle} {item.location ? `· p. ${item.location}` : ''}
              </Text>
            </View>

            {/* Action Bar: Share as Image, Native Share, Delete */}
            <View style={[styles.actionBar, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setActiveQuoteForCard(item)}
                style={[styles.actionBtnPrimary, { backgroundColor: colors.accent }]}
              >
                <Ionicons name="image-outline" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnPrimaryText}>Share as Image</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleShareQuoteAsText(item)}
                style={[styles.actionBtnSecondary, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
              >
                <Ionicons name="share-outline" size={15} color={colors.textPrimary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Alert.alert('Delete Quote', 'Are you sure you want to delete this quote?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => deleteQuote(item.id),
                    },
                  ]);
                }}
                style={[styles.actionBtnSecondary, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
              >
                <Ionicons name="trash-outline" size={15} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* SHARE AS IMAGE MODAL (LIBORA QUOTE CARD STUDIO) */}
      <Modal
        visible={Boolean(activeQuoteForCard)}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveQuoteForCard(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.shareModalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.shareModalHeader}>
              <View>
                <Text style={[styles.shareModalTitle, { color: colors.textPrimary }]}>
                  Libora Card Studio
                </Text>
                <Text style={[styles.shareModalSub, { color: colors.textSecondary }]}>
                  Customize theme & export visual quote card
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActiveQuoteForCard(null)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Theme Selector */}
            <View style={styles.themeSelectorRow}>
              {(['paper', 'midnight', 'terra', 'olive'] as QuoteCardTheme[]).map((theme) => {
                const isSelected = cardTheme === theme;
                return (
                  <TouchableOpacity
                    key={theme}
                    onPress={() => setCardTheme(theme)}
                    style={[
                      styles.themePill,
                      {
                        borderColor: isSelected ? colors.accent : colors.border,
                        backgroundColor: isSelected ? colors.accent + '25' : colors.surfaceSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.themePillText,
                        { color: isSelected ? colors.accent : colors.textSecondary, fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {theme.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Live Card Preview */}
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {activeQuoteForCard && (
                <QuoteCardView
                  ref={quoteCardRef}
                  text={activeQuoteForCard.text}
                  author={activeQuoteForCard.author}
                  bookTitle={activeQuoteForCard.bookTitle}
                  location={activeQuoteForCard.location}
                  personalThought={activeQuoteForCard.personalThought}
                  theme={cardTheme}
                />
              )}
            </ScrollView>

            {/* Export Button */}
            <TouchableOpacity
              onPress={handleExportImage}
              disabled={isExporting}
              style={[styles.exportBtn, { backgroundColor: colors.accent }]}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="share-social" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.exportBtnText}>Share as Image Card</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ADD NEW QUOTE MODAL */}
      <Modal
        visible={isAddQuoteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddQuoteModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.addModalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.shareModalHeader}>
              <Text style={[styles.shareModalTitle, { color: colors.textPrimary }]}>Add New Quote</Text>
              <TouchableOpacity onPress={() => setIsAddQuoteModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>QUOTE TEXT *</Text>
              <TextInput
                value={newQuoteText}
                onChangeText={setNewQuoteText}
                placeholder="Paste or write the quote..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                style={[styles.textArea, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary }]}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>AUTHOR</Text>
              <TextInput
                value={newQuoteAuthor}
                onChangeText={setNewQuoteAuthor}
                placeholder="e.g. Marcus Aurelius"
                placeholderTextColor={colors.textMuted}
                style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary }]}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>BOOK / SOURCE</Text>
              <TextInput
                value={newQuoteBook}
                onChangeText={setNewQuoteBook}
                placeholder="e.g. Meditations"
                placeholderTextColor={colors.textMuted}
                style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary }]}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PERSONAL THOUGHT (OPTIONAL)</Text>
              <TextInput
                value={newQuoteThought}
                onChangeText={setNewQuoteThought}
                placeholder="Why this quote resonated with you..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
                style={[styles.textArea, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary }]}
              />

              <TouchableOpacity
                onPress={handleCreateQuote}
                style={[styles.exportBtn, { backgroundColor: colors.accent, marginTop: 14 }]}
              >
                <Text style={styles.exportBtnText}>Save to Libora</Text>
              </TouchableOpacity>
            </ScrollView>
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
  addQuoteHeaderBtn: {
    padding: 6,
    borderRadius: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.sansRegular,
    fontSize: 14,
    height: '100%',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
  },
  bookChipsScroll: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 6,
  },
  bookChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  bookChipText: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 14,
  },
  quoteCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  quoteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  quoteMark: {
    fontSize: 32,
    fontFamily: 'serif',
    lineHeight: 32,
  },
  favToggleBtn: {
    padding: 4,
  },
  quoteBody: {
    fontFamily: 'serif',
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: 10,
  },
  thoughtBox: {
    borderLeftWidth: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 12,
  },
  thoughtText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  citationRow: {
    marginBottom: 14,
  },
  authorText: {
    fontSize: 13,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
  },
  bookDetails: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
    marginTop: 2,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
  },
  actionBtnSecondary: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.serifBold,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: Fonts.sansRegular,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
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
    fontSize: 18,
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
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    marginTop: 14,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontFamily: Fonts.sansBold,
    fontSize: 14,
    fontWeight: '700',
  },
  addModalCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    maxHeight: '85%',
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 6,
  },
  textInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    fontFamily: Fonts.sansRegular,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    fontFamily: Fonts.sansRegular,
    minHeight: 64,
    textAlignVertical: 'top',
  },
});
