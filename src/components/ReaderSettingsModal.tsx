import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ReaderSettings, ReaderThemeMode } from '../types';

interface ReaderSettingsModalProps {
  visible: boolean;
  settings: ReaderSettings;
  onUpdate: (updated: Partial<ReaderSettings>) => void;
  onClose: () => void;
}

const THEMES: { id: ReaderThemeMode; label: string; bg: string; text: string }[] = [
  { id: 'light', label: 'Light', bg: '#FAF8F5', text: '#1E293B' },
  { id: 'sepia', label: 'Sepia', bg: '#F6EEDF', text: '#433422' },
  { id: 'dark', label: 'Dark', bg: '#111827', text: '#F8FAFC' },
  { id: 'amoled', label: 'AMOLED', bg: '#000000', text: '#FFFFFF' },
];

export const ReaderSettingsModal: React.FC<ReaderSettingsModalProps> = ({
  visible,
  settings,
  onUpdate,
  onClose,
}) => {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Reader Preferences</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Theme Selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>THEME</Text>
              <View style={styles.themeRow}>
                {THEMES.map((t) => {
                  const isSelected = settings.theme === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => onUpdate({ theme: t.id })}
                      style={[
                        styles.themePill,
                        {
                          backgroundColor: t.bg,
                          borderColor: isSelected ? colors.accent : colors.border,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.themeLabel, { color: t.text }]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Font Size Adjuster */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>FONT SIZE</Text>
              <View style={[styles.controlRow, { backgroundColor: colors.surfaceSubtle }]}>
                <TouchableOpacity
                  onPress={() => onUpdate({ fontSize: Math.max(14, settings.fontSize - 1) })}
                  style={styles.adjustBtn}
                >
                  <Text style={[styles.adjustSymbol, { color: colors.textPrimary }]}>A-</Text>
                </TouchableOpacity>

                <Text style={[styles.valueText, { color: colors.textPrimary }]}>
                  {settings.fontSize} pt
                </Text>

                <TouchableOpacity
                  onPress={() => onUpdate({ fontSize: Math.min(32, settings.fontSize + 1) })}
                  style={styles.adjustBtn}
                >
                  <Text style={[styles.adjustSymbol, { color: colors.textPrimary }]}>A+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Font Family */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TYPEFACE</Text>
              <View style={styles.fontRow}>
                {(['serif', 'sans-serif', 'monospace'] as const).map((font) => {
                  const isSelected = settings.fontFamily === font;
                  return (
                    <TouchableOpacity
                      key={font}
                      onPress={() => onUpdate({ fontFamily: font })}
                      style={[
                        styles.fontPill,
                        {
                          backgroundColor: isSelected ? colors.accent : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.fontLabel,
                          {
                            color: isSelected ? '#FFFFFF' : colors.textPrimary,
                            fontFamily: font,
                          },
                        ]}
                      >
                        {font === 'serif' ? 'Serif' : font === 'sans-serif' ? 'Sans' : 'Mono'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Line Height */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>LINE SPACING</Text>
              <View style={styles.fontRow}>
                {[
                  { label: 'Tight', val: 1.4 },
                  { label: 'Normal', val: 1.6 },
                  { label: 'Relaxed', val: 1.9 },
                ].map((item) => {
                  const isSelected = settings.lineHeight === item.val;
                  return (
                    <TouchableOpacity
                      key={item.label}
                      onPress={() => onUpdate({ lineHeight: item.val })}
                      style={[
                        styles.fontPill,
                        {
                          backgroundColor: isSelected ? colors.accent : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.fontLabel,
                          { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Margins */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PAGE MARGINS</Text>
              <View style={styles.fontRow}>
                {[
                  { label: 'Compact', val: 12 },
                  { label: 'Balanced', val: 20 },
                  { label: 'Relaxed', val: 32 },
                ].map((item) => {
                  const isSelected = (settings.margin || 20) === item.val;
                  return (
                    <TouchableOpacity
                      key={item.label}
                      onPress={() => onUpdate({ margin: item.val })}
                      style={[
                        styles.fontPill,
                        {
                          backgroundColor: isSelected ? colors.accent : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.fontLabel,
                          { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Text Alignment */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TEXT ALIGNMENT</Text>
              <View style={styles.fontRow}>
                {[
                  { label: 'Left', val: 'left' as const },
                  { label: 'Justified', val: 'justify' as const },
                ].map((item) => {
                  const isSelected = (settings.textAlign || 'left') === item.val;
                  return (
                    <TouchableOpacity
                      key={item.label}
                      onPress={() => onUpdate({ textAlign: item.val })}
                      style={[
                        styles.fontPill,
                        {
                          backgroundColor: isSelected ? colors.accent : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.fontLabel,
                          { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Continuous Scroll Toggle */}
            <View style={[styles.toggleRow, { borderColor: colors.border }]}>
              <View>
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                  Continuous Vertical Scroll
                </Text>
                <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>
                  Scroll smoothly instead of flipping pages
                </Text>
              </View>
              <Switch
                value={settings.continuousScroll}
                onValueChange={(val) => onUpdate({ continuousScroll: val })}
                trackColor={{ false: colors.border, true: colors.accent }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    padding: 22,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  closeBtn: {
    padding: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themePill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 6,
  },
  adjustBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  adjustSymbol: {
    fontSize: 16,
    fontWeight: '700',
  },
  valueText: {
    fontSize: 15,
    fontWeight: '600',
  },
  fontRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fontPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  fontLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    marginTop: 6,
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
