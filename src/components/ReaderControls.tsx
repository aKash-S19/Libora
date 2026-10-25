import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ReaderSettings } from '../types';

interface ReaderControlsProps {
  visible: boolean;
  bookTitle: string;
  chapterTitle?: string;
  currentPage: number;
  pageCount: number;
  isBookmarked: boolean;
  settings: ReaderSettings;
  isSelectionMode?: boolean;
  onToggleSelectionMode?: () => void;
  onOpenSentencesPicker?: () => void;
  onBack: () => void;
  onToggleBookmark: () => void;
  onOpenSettings: () => void;
  onOpenToc: () => void;
  onOpenSearch: () => void;
  onOpenQuoteTool?: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export const ReaderControls: React.FC<ReaderControlsProps> = ({
  visible,
  bookTitle,
  chapterTitle,
  currentPage,
  pageCount,
  isBookmarked,
  isSelectionMode,
  onToggleSelectionMode,
  onOpenSentencesPicker,
  onBack,
  onToggleBookmark,
  onOpenSettings,
  onOpenToc,
  onOpenSearch,
  onOpenQuoteTool,
  onPrevPage,
  onNextPage,
}) => {
  const { colors } = useTheme();
  const percent = pageCount > 0 ? Math.round((currentPage / pageCount) * 100) : 0;

  const renderFloatingSelectionBar = () => {
    if (!isSelectionMode) return null;
    return (
      <View
        style={[
          styles.floatingSelectionBar,
          { backgroundColor: colors.surface, borderColor: colors.accent, shadowColor: '#000' },
        ]}
      >
        <View style={styles.selectionBarContent}>
          <View style={[styles.selectionDot, { backgroundColor: colors.accent }]} />
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text numberOfLines={1} style={[styles.selectionBarTitle, { color: colors.textPrimary }]}>
              Drive Selection Mode
            </Text>
            <Text numberOfLines={1} style={[styles.selectionBarSub, { color: colors.textSecondary }]}>
              Tap text or drag to quote & highlight
            </Text>
          </View>
          {onOpenSentencesPicker && (
            <TouchableOpacity
              onPress={onOpenSentencesPicker}
              style={[styles.sentencesBtn, { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}
            >
              <Ionicons name="list" size={13} color={colors.accent} style={{ marginRight: 4 }} />
              <Text style={[styles.sentencesBtnText, { color: colors.accent }]}>Sentences</Text>
            </TouchableOpacity>
          )}
          {onToggleSelectionMode && (
            <TouchableOpacity onPress={onToggleSelectionMode} style={styles.exitSelectionBtn}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (!visible) {
    return (
      <>
        {renderFloatingSelectionBar()}
        <View style={styles.kindleMinimalFooter} pointerEvents="none">
          <Text style={[styles.kindleFooterText, { color: colors.textSecondary }]}>
            Page {currentPage} of {pageCount} · {percent}%
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      {/* Top Header Overlay */}
      <View
        style={[
          styles.topBar,
          { backgroundColor: colors.surface + 'FA', borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.controlsInner}>
          <TouchableOpacity onPress={onBack} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerTitles}>
            <Text numberOfLines={1} style={[styles.bookTitle, { color: colors.textPrimary }]}>
              {bookTitle}
            </Text>
            {chapterTitle ? (
              <Text numberOfLines={1} style={[styles.chapterTitle, { color: colors.textSecondary }]}>
                {chapterTitle}
              </Text>
            ) : null}
          </View>

          <View style={styles.topActions}>
            {onToggleSelectionMode && (
              <TouchableOpacity
                onPress={onToggleSelectionMode}
                style={[
                  styles.iconButton,
                  isSelectionMode && { backgroundColor: colors.accent + '25', borderRadius: 8 },
                ]}
                accessibilityLabel="Toggle Controlled Text Selection Mode"
              >
                <Ionicons
                  name={isSelectionMode ? 'create' : 'create-outline'}
                  size={22}
                  color={isSelectionMode ? colors.accent : colors.textPrimary}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onToggleBookmark} style={styles.iconButton}>
              <Ionicons
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={isBookmarked ? colors.accent : colors.textPrimary}
              />
            </TouchableOpacity>
            {onOpenQuoteTool && (
              <TouchableOpacity onPress={onOpenQuoteTool} style={styles.iconButton}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.accent} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onOpenToc} style={styles.iconButton}>
              <Ionicons name="list-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onOpenSearch} style={styles.iconButton}>
              <Ionicons name="search-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onOpenSettings} style={styles.iconButton}>
              <Ionicons name="text-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Floating Selection Mode Bar if Active */}
      {renderFloatingSelectionBar()}

      {/* Bottom Footer Overlay */}
      <View
        style={[
          styles.bottomBar,
          { backgroundColor: colors.surface + 'FA', borderTopColor: colors.border },
        ]}
      >
        <View style={[styles.controlsInner, styles.paginationRow]}>
          <TouchableOpacity
            onPress={onPrevPage}
            disabled={currentPage <= 1}
            style={[styles.pageNavBtn, { opacity: currentPage <= 1 ? 0.3 : 1 }]}
          >
            <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
            <Text style={[styles.pageNavText, { color: colors.textPrimary }]}>Prev</Text>
          </TouchableOpacity>

          <View style={styles.pageInfoContainer}>
            <Text style={[styles.pageNumberText, { color: colors.textPrimary }]}>
              Page {currentPage} of {pageCount}
            </Text>
            <Text style={[styles.pagePercentText, { color: colors.textSecondary }]}>
              {percent}% completed
            </Text>
          </View>

          <TouchableOpacity
            onPress={onNextPage}
            disabled={currentPage >= pageCount}
            style={[styles.pageNavBtn, { opacity: currentPage >= pageCount ? 0.3 : 1 }]}
          >
            <Text style={[styles.pageNavText, { color: colors.textPrimary }]}>Next</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    paddingTop: 15,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    zIndex: 100,
    elevation: 8,
    justifyContent: 'center',
  },
  controlsInner: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    padding: 8,
  },
  headerTitles: {
    flex: 1,
    paddingHorizontal: 8,
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  chapterTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    zIndex: 100,
    elevation: 8,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  pageNavText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pageInfoContainer: {
    alignItems: 'center',
  },
  pageNumberText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pagePercentText: {
    fontSize: 11,
    marginTop: 2,
  },
  kindleMinimalFooter: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.65,
    zIndex: 50,
  },
  kindleFooterText: {
    fontSize: 11,
    letterSpacing: 0.5,
    fontWeight: '500',
    fontFamily: 'serif',
  },
  floatingSelectionBar: {
    position: 'absolute',
    top: 76,
    left: 16,
    right: 16,
    maxWidth: 600,
    alignSelf: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    zIndex: 120,
    elevation: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  selectionBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  selectionBarTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectionBarSub: {
    fontSize: 11,
    marginTop: 1,
  },
  sentencesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  sentencesBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  exitSelectionBtn: {
    padding: 4,
  },
});
