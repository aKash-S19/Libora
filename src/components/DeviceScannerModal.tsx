import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ImporterService } from '../services/importer';
import { ScannedBookFile, Book } from '../types';

interface DeviceScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onBooksImported: (books: Book[]) => void;
}

export const DeviceScannerModal: React.FC<DeviceScannerModalProps> = ({
  visible,
  onClose,
  onBooksImported,
}) => {
  const { colors } = useTheme();
  const [scannedFiles, setScannedFiles] = useState<ScannedBookFile[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleScanDevice = async () => {
    setIsScanning(true);
    try {
      const files = await ImporterService.scanDeviceForBooks();
      setScannedFiles(files);
      if (files.length === 0) {
        Alert.alert('No Documents Selected', 'No PDF or EPUB files were chosen from device storage.');
      }
    } catch {
      Alert.alert('Scan Error', 'Could not access device folders.');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleSelect = (index: number) => {
    setScannedFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, isSelected: !f.isSelected } : f))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setScannedFiles((prev) => prev.map((f) => ({ ...f, isSelected: select })));
  };

  const selectedCount = scannedFiles.filter((f) => f.isSelected).length;

  const handleBatchImport = async () => {
    const selected = scannedFiles.filter((f) => f.isSelected);
    if (selected.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one document to import.');
      return;
    }

    setIsImporting(true);
    try {
      const imported = await ImporterService.batchImportBooks(selected);
      Alert.alert(
        'Import Complete',
        `Successfully added ${imported.length} ${imported.length === 1 ? 'book' : 'books'} to your Libora shelf!`,
        [
          {
            text: 'OK',
            onPress: () => {
              onBooksImported(imported);
              setScannedFiles([]);
              onClose();
            },
          },
        ]
      );
    } catch {
      Alert.alert('Import Failed', 'Encountered an issue importing documents.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Scan Device for Books
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Locate and batch-import PDFs & EPUBs from device folders
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={handleScanDevice}
              disabled={isScanning || isImporting}
              style={[styles.scanBtn, { backgroundColor: colors.accent }]}
            >
              {isScanning ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="folder-open-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.scanBtnText}>Choose Files from Folders</Text>
                </>
              )}
            </TouchableOpacity>

            {scannedFiles.length > 0 && (
              <TouchableOpacity
                onPress={() => handleSelectAll(selectedCount !== scannedFiles.length)}
                style={[styles.selectAllBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.selectAllText, { color: colors.textSecondary }]}>
                  {selectedCount === scannedFiles.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Scanned Files List */}
          {scannedFiles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="documents-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No files selected yet
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                Tap the button above to browse your phone's Downloads or Documents folders and pick your PDFs or EPUBs.
              </Text>
            </View>
          ) : (
            <FlatList
              data={scannedFiles}
              keyExtractor={(item, index) => `${item.uri}_${index}`}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => toggleSelect(index)}
                  style={[
                    styles.fileRow,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: item.isSelected ? colors.accent : colors.border,
                      borderWidth: item.isSelected ? 1.5 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.isSelected ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={item.isSelected ? colors.accent : colors.textMuted}
                  />

                  <View style={styles.fileInfo}>
                    <View style={styles.formatRow}>
                      <View style={[styles.badge, { backgroundColor: colors.accent + '22' }]}>
                        <Text style={[styles.badgeText, { color: colors.accent }]}>
                          {item.format.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.sizeText, { color: colors.textMuted }]}>
                        {(item.size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    </View>

                    <Text numberOfLines={1} style={[styles.fileTitle, { color: colors.textPrimary }]}>
                      {item.title}
                    </Text>
                    <Text numberOfLines={1} style={[styles.fileAuthor, { color: colors.textSecondary }]}>
                      By {item.author}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingVertical: 10 }}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Import Confirm Button */}
          {scannedFiles.length > 0 && (
            <TouchableOpacity
              onPress={handleBatchImport}
              disabled={isImporting || selectedCount === 0}
              style={[
                styles.importConfirmBtn,
                {
                  backgroundColor: selectedCount > 0 ? colors.accent : colors.surfaceSubtle,
                  opacity: isImporting ? 0.7 : 1,
                },
              ]}
            >
              {isImporting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.importConfirmText}>
                  Import {selectedCount} {selectedCount === 1 ? 'Book' : 'Books'} into Library
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    padding: 22,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  closeBtn: {
    padding: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  scanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  selectAllBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 17,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  sizeText: {
    fontSize: 10,
  },
  fileTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  fileAuthor: {
    fontSize: 12,
    marginTop: 2,
  },
  importConfirmBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  importConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
