import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useLibrary } from '../../context/LibraryContext';
import { Header } from '../../components/Header';
import { BookCard } from '../../components/BookCard';
import { EmptyState } from '../../components/EmptyState';

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { collections, books } = useLibrary();

  const collection = collections.find((c) => c.id === id);

  if (!collection) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Collection" showBack onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={{ color: colors.textPrimary }}>Collection not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const collectionBooks = books.filter((b) => collection.bookIds.includes(b.id));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title={collection.name}
        subtitle={collection.description}
        showBack
        onBack={() => router.back()}
      />

      {collectionBooks.length === 0 ? (
        <EmptyState
          iconName="albums-outline"
          title="No books in this collection"
          description="Add books to this collection from any book's detail page."
          actionLabel="Browse Library"
          onAction={() => router.push('/(tabs)/library' as any)}
        />
      ) : (
        <FlatList
          data={collectionBooks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BookCard book={item} mode="list" />}
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
});
