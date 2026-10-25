import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Book } from '../types';
import { BookCover } from './BookCover';
import { ProgressBar } from './ProgressBar';
import { useTheme } from '../context/ThemeContext';
import { useLibrary } from '../context/LibraryContext';
import { Fonts } from '../theme';

interface BookCardProps {
  book: Book;
  mode?: 'grid' | 'list';
  onPress?: () => void;
  onLongPress?: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  mode = 'grid',
  onPress,
  onLongPress,
}) => {
  const router = useRouter();
  const { colors } = useTheme();
  const { deleteBook } = useLibrary();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/book/${book.id}` as any);
    }
  };

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress();
      return;
    }

    Alert.alert(
      book.title,
      `By ${book.author}\n\nChoose an action:`,
      [
        {
          text: 'Read Book',
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
              'Delete Book',
              `Are you sure you want to remove "${book.title}" from your library? Its reading progress, bookmarks, and local files will be deleted.`,
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

  const percent = Math.round((book.readingProgress || 0) * 100);

  if (mode === 'list') {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={400}
        style={[
          styles.listContainer,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <BookCover
          coverUri={book.coverUri}
          title={book.title}
          author={book.author}
          width={70}
          height={100}
        />
        <View style={styles.listDetails}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.formatBadge,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <Text style={[styles.formatText, { color: colors.textSecondary }]}>
                {book.format.toUpperCase()}
              </Text>
            </View>
            {book.status === 'completed' && (
              <View style={[styles.statusBadge, { backgroundColor: '#059669' + '22' }]}>
                <Text style={[styles.statusText, { color: '#10B981' }]}>Finished</Text>
              </View>
            )}
            {book.status === 'favorite' && (
              <View style={[styles.statusBadge, { backgroundColor: colors.accent + '22' }]}>
                <Text style={[styles.statusText, { color: colors.accent }]}>Favorite</Text>
              </View>
            )}
          </View>

          <Text
            numberOfLines={2}
            style={[styles.listTitle, { color: colors.textPrimary }]}
          >
            {book.title}
          </Text>

          <Text
            numberOfLines={1}
            style={[styles.listAuthor, { color: colors.textSecondary }]}
          >
            {book.author}
          </Text>

          <View style={styles.listProgressRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <ProgressBar progress={book.readingProgress} height={4} />
            </View>
            <Text style={[styles.percentText, { color: colors.textMuted }]}>
              {percent}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Grid / Bookshelf layout
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={400}
      style={styles.gridContainer}
    >
      <BookCover
        coverUri={book.coverUri}
        title={book.title}
        author={book.author}
        width={105}
        height={155}
      />
      <View style={styles.gridInfo}>
        <Text
          numberOfLines={1}
          style={[styles.gridTitle, { color: colors.textPrimary }]}
        >
          {book.title}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.gridAuthor, { color: colors.textSecondary }]}
        >
          {book.author}
        </Text>
        <View style={styles.gridProgressContainer}>
          <ProgressBar progress={book.readingProgress} height={3} />
          <Text style={[styles.gridPercentText, { color: colors.textMuted }]}>
            {percent > 0 ? `${percent}%` : 'Unread'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    width: 105,
    marginRight: 14,
    marginBottom: 16,
  },
  gridInfo: {
    marginTop: 8,
  },
  gridTitle: {
    fontSize: 13,
    fontFamily: Fonts.serifBold,
    lineHeight: 17,
  },
  gridAuthor: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  gridProgressContainer: {
    marginTop: 6,
  },
  gridPercentText: {
    fontSize: 10,
    marginTop: 3,
    fontFamily: Fonts.medium,
  },
  listContainer: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  listDetails: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  formatBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  formatText: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 9,
    fontFamily: Fonts.semibold,
  },
  listTitle: {
    fontSize: 15,
    fontFamily: Fonts.serifBold,
    lineHeight: 20,
  },
  listAuthor: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  listProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
