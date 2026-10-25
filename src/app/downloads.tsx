import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { StorageService } from '../storage';
import { DownloadManager } from '../services/discovery';
import { DownloadItem } from '../types';
import { Header } from '../components/Header';
import { ProgressBar } from '../components/ProgressBar';
import { EmptyState } from '../components/EmptyState';

export default function DownloadsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);

  const loadDownloads = async () => {
    const list = await StorageService.getDownloads();
    setDownloads(list);
  };

  useEffect(() => {
    loadDownloads();
    const unsubscribe = DownloadManager.subscribe(() => {
      loadDownloads();
    });
    return () => unsubscribe();
  }, []);

  const handleCancel = async (id: string) => {
    await DownloadManager.cancelDownload(id);
    await loadDownloads();
  };

  const handleClearCompleted = async () => {
    const pendingOnly = downloads.filter((d) => d.status === 'downloading');
    await StorageService.saveDownloads(pendingOnly);
    setDownloads(pendingOnly);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Download Manager"
        showBack
        onBack={() => router.back()}
        rightAction={
          downloads.length > 0 ? (
            <TouchableOpacity onPress={handleClearCompleted} style={styles.clearBtn}>
              <Text style={[styles.clearBtnText, { color: colors.accent }]}>Clear Done</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {downloads.length === 0 ? (
        <EmptyState
          iconName="cloud-download-outline"
          title="No active downloads"
          description="Books downloaded from the Browse section will appear here with live progress tracking."
          actionLabel="Browse Free Classics"
          onAction={() => router.push('/(tabs)/browse' as any)}
        />
      ) : (
        <FlatList
          data={downloads}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const percent = Math.round(item.progress * 100);
            const downloadedMb = (item.downloadedBytes / (1024 * 1024)).toFixed(1);
            const totalMb = (item.totalBytes / (1024 * 1024)).toFixed(1);

            return (
              <View
                style={[
                  styles.downloadCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.headerRow}>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={[styles.bookTitle, { color: colors.textPrimary }]}>
                      {item.title}
                    </Text>
                    <Text numberOfLines={1} style={[styles.bookAuthor, { color: colors.textSecondary }]}>
                      By {item.author} ({item.format.toUpperCase()})
                    </Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            item.status === 'completed'
                              ? '#10B981'
                              : item.status === 'error'
                              ? '#EF4444'
                              : colors.accent,
                        },
                      ]}
                    >
                      {item.status === 'completed'
                        ? 'Downloaded'
                        : item.status === 'error'
                        ? 'Failed'
                        : `${percent}%`}
                    </Text>
                  </View>
                </View>

                {item.status === 'downloading' && (
                  <View style={styles.progressContainer}>
                    <ProgressBar progress={item.progress} height={6} />
                    <View style={styles.bytesRow}>
                      <Text style={[styles.bytesText, { color: colors.textMuted }]}>
                        {downloadedMb} MB / {totalMb} MB
                      </Text>
                      <TouchableOpacity onPress={() => handleCancel(item.id)}>
                        <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '600' }}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {item.status === 'error' && (
                  <Text style={[styles.errorText, { color: '#EF4444' }]}>
                    {item.error || 'Connection interrupted'}
                  </Text>
                )}

                {item.status === 'completed' && (
                  <TouchableOpacity
                    onPress={() => {
                      if (item.bookId) {
                        router.push(`/reader/${item.bookId}` as any);
                      } else {
                        router.push('/(tabs)/library' as any);
                      }
                    }}
                    style={styles.openBtn}
                  >
                    <Ionicons name="book-outline" size={14} color={colors.accent} />
                    <Text style={[styles.openBtnText, { color: colors.accent }]}>
                      {item.bookId ? 'Read Now' : 'Available in Library'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
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
  clearBtn: {
    padding: 6,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  downloadCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  bookAuthor: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    marginLeft: 10,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressContainer: {
    marginTop: 12,
  },
  bytesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  bytesText: {
    fontSize: 11,
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  openBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
