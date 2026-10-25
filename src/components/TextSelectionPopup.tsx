import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { HighlightColor } from '../types';

interface TextSelectionPopupProps {
  visible: boolean;
  selectedText: string;
  onHighlight: (color: HighlightColor) => void;
  onAddNote: (noteText: string) => void;
  onSaveQuote: (personalThought?: string) => void;
  onOpenQuoteCard: () => void;
  onCopy: () => void;
  onClose: () => void;
}

const HIGHLIGHT_COLORS: { color: HighlightColor; name: string }[] = [
  { color: '#FDE047', name: 'Amber' },
  { color: '#86EFAC', name: 'Emerald' },
  { color: '#93C5FD', name: 'Sky' },
  { color: '#F472B6', name: 'Rose' },
  { color: '#C084FC', name: 'Lavender' },
];

export const TextSelectionPopup: React.FC<TextSelectionPopupProps> = ({
  visible,
  selectedText,
  onHighlight,
  onAddNote,
  onSaveQuote,
  onOpenQuoteCard,
  onCopy,
  onClose,
}) => {
  const { colors } = useTheme();
  const [mode, setMode] = useState<'toolbar' | 'color_picker' | 'note_input' | 'quote_thought'>('toolbar');
  const [noteText, setNoteText] = useState('');
  const [thoughtText, setThoughtText] = useState('');

  if (!visible) return null;

  const handleShareNative = async () => {
    try {
      await Share.share({
        message: `"${selectedText}"\n\n— Shared via Libora`,
      });
      onClose();
    } catch {}
  };

  const handleSaveNoteSubmit = () => {
    if (noteText.trim()) {
      onAddNote(noteText.trim());
      setNoteText('');
      setMode('toolbar');
      onClose();
    }
  };

  const handleSaveQuoteSubmit = () => {
    onSaveQuote(thoughtText.trim() || undefined);
    setThoughtText('');
    setMode('toolbar');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          setMode('toolbar');
          onClose();
        }}
        style={styles.backdrop}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {/* Passage Quote Preview */}
          {selectedText ? (
            <View
              style={[
                styles.quotePreviewBox,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
              ]}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.accent} style={{ marginRight: 6, marginTop: 2 }} />
              <Text numberOfLines={3} style={[styles.quotePreviewText, { color: colors.textPrimary }]}>
                "{selectedText.trim()}"
              </Text>
            </View>
          ) : null}

          {/* Default Actions Toolbar */}
          {mode === 'toolbar' && (
            <>
              {/* Quick Highlight Color Dots */}
              <View style={styles.quickColorsRow}>
                <Text style={[styles.quickColorLabel, { color: colors.textSecondary }]}>Highlight:</Text>
                {HIGHLIGHT_COLORS.map((hc) => (
                  <TouchableOpacity
                    key={hc.color}
                    onPress={() => {
                      onHighlight(hc.color);
                      onClose();
                    }}
                    style={[styles.quickColorDot, { backgroundColor: hc.color }]}
                  />
                ))}
              </View>

              <View style={styles.toolbarRow}>
                <TouchableOpacity
                  onPress={onOpenQuoteCard}
                  style={styles.actionItem}
                >
                  <Ionicons name="sparkles" size={20} color={colors.accent} />
                  <Text style={[styles.actionLabel, { color: colors.accent, fontWeight: '700' }]}>Share Image</Text>
                </TouchableOpacity>

                <View style={[styles.separator, { backgroundColor: colors.border }]} />

                <TouchableOpacity
                  onPress={() => setMode('quote_thought')}
                  style={styles.actionItem}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.accent} />
                  <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Quote</Text>
                </TouchableOpacity>

                <View style={[styles.separator, { backgroundColor: colors.border }]} />

                <TouchableOpacity
                  onPress={() => setMode('note_input')}
                  style={styles.actionItem}
                >
                  <Ionicons name="create-outline" size={20} color={colors.accent} />
                  <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Note</Text>
                </TouchableOpacity>

                <View style={[styles.separator, { backgroundColor: colors.border }]} />

                <TouchableOpacity onPress={onCopy} style={styles.actionItem}>
                  <Ionicons name="copy-outline" size={20} color={colors.textSecondary} />
                  <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Copy</Text>
                </TouchableOpacity>

                <View style={[styles.separator, { backgroundColor: colors.border }]} />

                <TouchableOpacity onPress={handleShareNative} style={styles.actionItem}>
                  <Ionicons name="share-social-outline" size={20} color={colors.textSecondary} />
                  <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Share</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Color Picker Submenu */}
          {mode === 'color_picker' && (
            <View style={styles.colorPickerContainer}>
              <Text style={[styles.submenuTitle, { color: colors.textPrimary }]}>
                Choose Highlight Color
              </Text>
              <View style={styles.colorCirclesRow}>
                {HIGHLIGHT_COLORS.map((hc) => (
                  <TouchableOpacity
                    key={hc.color}
                    onPress={() => {
                      onHighlight(hc.color);
                      setMode('toolbar');
                      onClose();
                    }}
                    style={[styles.colorCircle, { backgroundColor: hc.color }]}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Note Input Submenu */}
          {mode === 'note_input' && (
            <View style={styles.inputContainer}>
              <Text style={[styles.submenuTitle, { color: colors.textPrimary }]}>
                Attach Note to Passage
              </Text>
              <TextInput
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Write your observation or thought..."
                placeholderTextColor={colors.textMuted}
                autoFocus
                multiline
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  },
                ]}
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={() => setMode('toolbar')}
                  style={[styles.subBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.subBtnText, { color: colors.textSecondary }]}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveNoteSubmit}
                  style={[styles.subBtn, { backgroundColor: colors.accent }]}
                >
                  <Text style={[styles.subBtnText, { color: '#FFFFFF' }]}>Save Note</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Quote Submenu */}
          {mode === 'quote_thought' && (
            <View style={styles.inputContainer}>
              <Text style={[styles.submenuTitle, { color: colors.textPrimary }]}>
                Save as Quote
              </Text>
              <TextInput
                value={thoughtText}
                onChangeText={setThoughtText}
                placeholder="Personal thought or context (optional)..."
                placeholderTextColor={colors.textMuted}
                multiline
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  },
                ]}
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={onOpenQuoteCard}
                  style={[styles.subBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.subBtnText, { color: colors.textPrimary }]}>
                    Card Studio
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveQuoteSubmit}
                  style={[styles.subBtn, { backgroundColor: colors.accent }]}
                >
                  <Text style={[styles.subBtnText, { color: '#FFFFFF' }]}>Save Quote</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  quotePreviewBox: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  quotePreviewText: {
    flex: 1,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  quickColorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  quickColorLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 2,
  },
  quickColorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  actionItem: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  separator: {
    width: 1,
    height: 28,
  },
  submenuTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  colorPickerContainer: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  colorCirclesRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 8,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  inputContainer: {
    width: '100%',
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  subBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  subBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
