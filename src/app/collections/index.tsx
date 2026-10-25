import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLibrary } from '../../context/LibraryContext';
import { Header } from '../../components/Header';
import { EmptyState } from '../../components/EmptyState';

export default function CollectionsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { collections, createCollection } = useLibrary();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a collection name.');
      return;
    }
    await createCollection(name.trim(), description.trim() || undefined);
    setName('');
    setDescription('');
    setIsModalOpen(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Custom Collections"
        showBack
        onBack={() => router.back()}
        rightAction={
          <TouchableOpacity onPress={() => setIsModalOpen(true)} style={styles.addBtn}>
            <Ionicons name="add" size={24} color={colors.accent} />
          </TouchableOpacity>
        }
      />

      {collections.length === 0 ? (
        <EmptyState
          iconName="albums-outline"
          title="No collections yet"
          description="Create custom shelves to organize books by subject, research topic, or reading challenge."
          actionLabel="Create Collection"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <FlatList
          data={collections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/collections/${item.id}` as any)}
              style={[
                styles.collectionCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: colors.accent + '22' }]}>
                <Ionicons name="folder-outline" size={24} color={colors.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.colName, { color: colors.textPrimary }]}>{item.name}</Text>
                {item.description ? (
                  <Text numberOfLines={1} style={[styles.colDesc, { color: colors.textSecondary }]}>
                    {item.description}
                  </Text>
                ) : null}
                <Text style={[styles.bookCount, { color: colors.accent }]}>
                  {item.bookIds.length} {item.bookIds.length === 1 ? 'book' : 'books'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Collection Modal */}
      <Modal visible={isModalOpen} transparent animationType="fade" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>New Collection</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Stoic Philosophy, Sci-Fi Classics"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, marginTop: 10 }]}
            />
            <View style={styles.btnRow}>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={[styles.btn, { borderColor: colors.border }]}>
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreate} style={[styles.btn, { backgroundColor: colors.accent }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Create</Text>
              </TouchableOpacity>
            </View>
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
  addBtn: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  collectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  colDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  bookCount: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'serif',
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
});
