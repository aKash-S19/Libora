import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLibrary } from '../context/LibraryContext';
import { useReader } from '../context/ReaderContext';
import { Header } from '../components/Header';
import { BookCover } from '../components/BookCover';

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { books, reviews } = useLibrary();
  const { highlights, notes, quotes } = useReader();

  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase().trim();

    const matchedBooks = books.filter(
      (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
    );

    const matchedHighlights = highlights.filter(
      (h) => h.text.toLowerCase().includes(q) || h.bookTitle.toLowerCase().includes(q)
    );

    const matchedQuotes = quotes.filter(
      (qt) => qt.text.toLowerCase().includes(q) || qt.bookTitle.toLowerCase().includes(q)
    );

    const matchedNotes = notes.filter(
      (n) => n.text.toLowerCase().includes(q) || (n.passageText && n.passageText.toLowerCase().includes(q))
    );

    const matchedReviews = reviews.filter(
      (r) => r.reviewText.toLowerCase().includes(q) || r.bookTitle.toLowerCase().includes(q)
    );

    return {
      books: matchedBooks,
      highlights: matchedHighlights,
      quotes: matchedQuotes,
      notes: matchedNotes,
      reviews: matchedReviews,
      totalCount:
        matchedBooks.length +
        matchedHighlights.length +
        matchedQuotes.length +
        matchedNotes.length +
        matchedReviews.length,
    };
  }, [query, books, highlights, quotes, notes, reviews]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header title="Search Archive" showBack onBack={() => router.back()} />

      {/* Search Input Bar */}
      <View style={styles.inputWrapper}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.accent} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search books, highlights, quotes, notes..."
            placeholderTextColor={colors.textMuted}
            autoFocus
            style={[styles.input, { color: colors.textPrimary }]}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!results ? (
          <View style={styles.hintContainer}>
            <Ionicons name="sparkles-outline" size={36} color={colors.accent} />
            <Text style={[styles.hintTitle, { color: colors.textPrimary }]}>
              Search your knowledge archive
            </Text>
            <Text style={[styles.hintSub, { color: colors.textSecondary }]}>
              Type keywords, themes, quotes, or authors to search across your library, highlights, and notes.
            </Text>
          </View>
        ) : results.totalCount === 0 ? (
          <View style={styles.hintContainer}>
            <Ionicons name="search-outline" size={36} color={colors.textMuted} />
            <Text style={[styles.hintTitle, { color: colors.textPrimary }]}>No matches found</Text>
            <Text style={[styles.hintSub, { color: colors.textSecondary }]}>
              No items matched "{query}". Try another term or browse your library.
            </Text>
          </View>
        ) : (
          <>
            {/* Books Results */}
            {results.books.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  BOOKS ({results.books.length})
                </Text>
                {results.books.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => router.push(`/book/${b.id}` as any)}
                    style={[styles.resultRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <BookCover
                      coverUri={b.coverUri}
                      title={b.title}
                      author={b.author}
                      width={48}
                      height={70}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{b.title}</Text>
                      <Text style={[styles.itemSub, { color: colors.textSecondary }]}>By {b.author}</Text>
                      <Text style={[styles.itemMeta, { color: colors.accent }]}>
                        {Math.round((b.readingProgress || 0) * 100)}% read
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Highlights Results */}
            {results.highlights.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  HIGHLIGHTS ({results.highlights.length})
                </Text>
                {results.highlights.map((hl) => (
                  <TouchableOpacity
                    key={hl.id}
                    onPress={() => router.push(`/reader/${hl.bookId}` as any)}
                    style={[
                      styles.resultCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderLeftColor: hl.color || colors.accent,
                      },
                    ]}
                  >
                    <Text style={[styles.quoteText, { color: colors.textPrimary }]}>"{hl.text}"</Text>
                    <Text style={[styles.itemSub, { color: colors.accent, marginTop: 6 }]}>
                      {hl.bookTitle} · {hl.author} (p. {hl.location})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Quotes Results */}
            {results.quotes.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  QUOTES ({results.quotes.length})
                </Text>
                {results.quotes.map((qt) => (
                  <TouchableOpacity
                    key={qt.id}
                    onPress={() =>
                      router.push({
                        pathname: '/quote-card',
                        params: {
                          text: qt.text,
                          author: qt.author,
                          bookTitle: qt.bookTitle,
                          location: qt.location,
                        },
                      } as any)
                    }
                    style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <Text style={[styles.quoteText, { color: colors.textPrimary }]}>"{qt.text}"</Text>
                    <Text style={[styles.itemSub, { color: colors.accent, marginTop: 6 }]}>
                      {qt.bookTitle} · {qt.author}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Notes Results */}
            {results.notes.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  NOTES ({results.notes.length})
                </Text>
                {results.notes.map((n) => (
                  <TouchableOpacity
                    key={n.id}
                    onPress={() => router.push(`/reader/${n.bookId}` as any)}
                    style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <Text style={[styles.noteContent, { color: colors.textPrimary }]}>{n.text}</Text>
                    <Text style={[styles.itemSub, { color: colors.accent, marginTop: 6 }]}>
                      Attached to {n.bookTitle} (p. {n.location})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Reviews Results */}
            {results.reviews.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  REVIEWS ({results.reviews.length})
                </Text>
                {results.reviews.map((r) => (
                  <View
                    key={r.id}
                    style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <Text style={[styles.quoteText, { color: colors.textPrimary }]}>"{r.reviewText}"</Text>
                    <Text style={[styles.itemSub, { color: colors.accent, marginTop: 6 }]}>
                      Review for {r.bookTitle} ({r.rating}★)
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 46,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  hintContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  hintTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'serif',
    marginTop: 14,
    textAlign: 'center',
  },
  hintSub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  resultRow: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  itemMeta: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  resultCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  quoteText: {
    fontSize: 13,
    fontFamily: 'serif',
    fontStyle: 'italic',
    lineHeight: 19,
  },
  noteContent: {
    fontSize: 14,
    lineHeight: 19,
  },
});
