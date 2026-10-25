import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useReader } from '../context/ReaderContext';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';

export default function HighlightsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { highlights, deleteHighlight } = useReader();

  const [selectedBookFilter, setSelectedBookFilter] = useState<string>('all');

  const uniqueBooks = Array.from(new Set(highlights.map((h) => h.bookTitle)));

  const filteredHighlights = highlights.filter((h) => {
    if (selectedBookFilter !== 'all' && h.bookTitle !== selectedBookFilter) return false;
    return true;
  });

  const handleDelete = (id: string) => {
    Alert.alert('Delete Highlight', 'Are you sure you want to remove this highlight?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteHighlight(id),
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header title="Saved Highlights" showBack onBack={() => router.back()} />

      {uniqueBooks.length > 1 && (
        <View style={styles.filterBar}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={['all', ...uniqueBooks]}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isSelected = selectedBookFilter === item;
              return (
                <TouchableOpacity
                  onPress={() => setSelectedBookFilter(item)}
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
                    {item === 'all' ? 'All Books' : item}
                  </Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        </View>
      )}

      {filteredHighlights.length === 0 ? (
        <EmptyState
          iconName="color-wand-outline"
          title="Nothing highlighted yet"
          description="Highlight meaningful passages while reading to build your personal knowledge archive."
          actionLabel="Go to Library"
          onAction={() => router.push('/(tabs)/library' as any)}
        />
      ) : (
        <FlatList
          data={filteredHighlights}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.highlightCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderLeftColor: item.color || colors.accent,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => router.push(`/reader/${item.bookId}` as any)}
                activeOpacity={0.7}
              >
                <Text style={[styles.quoteText, { color: colors.textPrimary }]}>
                  "{item.text}"
                </Text>
              </TouchableOpacity>

              <View style={styles.footerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bookTitle, { color: colors.accent }]}>
                    {item.bookTitle}
                  </Text>
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {item.author} {item.location ? `· p. ${item.location}` : ''}
                  </Text>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: '/quote-card',
                        params: {
                          text: item.text,
                          author: item.author,
                          bookTitle: item.bookTitle,
                          location: item.location,
                        },
                      } as any)
                    }
                    style={styles.actionBtn}
                  >
                    <Ionicons name="share-social-outline" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
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
  filterBar: {
    paddingVertical: 10,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
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
  highlightCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 5,
    marginBottom: 12,
  },
  quoteText: {
    fontSize: 14,
    fontFamily: 'serif',
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 10,
  },
  bookTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaText: {
    fontSize: 11,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 6,
  },
});
