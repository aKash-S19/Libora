import React from 'react';
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

export default function NotesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { notes, deleteNote } = useReader();

  const handleDelete = (id: string) => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteNote(id),
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header title="Reading Notes" showBack onBack={() => router.back()} />

      {notes.length === 0 ? (
        <EmptyState
          iconName="create-outline"
          title="No notes recorded"
          description="Capture thoughts and observations while reading by selecting passages and adding notes."
          actionLabel="Read a Book"
          onAction={() => router.push('/(tabs)/library' as any)}
        />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.noteCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {item.passageText ? (
                <View style={[styles.passageBox, { backgroundColor: colors.surfaceSubtle }]}>
                  <Text style={[styles.passageText, { color: colors.textSecondary }]}>
                    "{item.passageText}"
                  </Text>
                </View>
              ) : null}

              <Text style={[styles.noteContent, { color: colors.textPrimary }]}>
                {item.text}
              </Text>

              <View style={styles.footerRow}>
                <TouchableOpacity
                  onPress={() => router.push(`/reader/${item.bookId}` as any)}
                  style={{ flex: 1 }}
                >
                  <Text style={[styles.bookTitle, { color: colors.accent }]}>
                    {item.bookTitle}
                  </Text>
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    By {item.author} {item.location ? `· p. ${item.location}` : ''}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
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
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  noteCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  passageBox: {
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    marginBottom: 12,
  },
  passageText: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  noteContent: {
    fontSize: 15,
    fontFamily: 'serif',
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
  deleteBtn: {
    padding: 6,
  },
});
