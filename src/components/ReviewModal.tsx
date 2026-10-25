import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Fonts } from '../theme';
import { Review } from '../types';
import { BookCover } from './BookCover';

interface ReviewModalProps {
  visible: boolean;
  bookId: string;
  bookTitle: string;
  author: string;
  coverUri?: string;
  year?: number;
  existingReview?: Review | null;
  onClose: () => void;
  onSubmit: (review: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const REACTIONS = [
  'Masterpiece',
  'Life-changing',
  'Thought-provoking',
  'Couldn’t put down',
  'Poetic prose',
  'Slow burn',
  'Philosophical',
  'Emotional wreck',
  'Timeless classic',
  'Comfort read',
];

const RATING_VERDICTS: Record<string, string> = {
  '5.0': 'Masterpiece · 5 Stars',
  '4.5': 'Outstanding · 4½ Stars',
  '4.0': 'Great Read · 4 Stars',
  '3.5': 'Good · 3½ Stars',
  '3.0': 'Decent · 3 Stars',
  '2.5': 'Average · 2½ Stars',
  '2.0': 'Underwhelming · 2 Stars',
  '1.5': 'Mediocre · 1½ Stars',
  '1.0': 'Poor · 1 Star',
  '0.5': 'Disappointing · ½ Star',
};

export const ReviewModal: React.FC<ReviewModalProps> = ({
  visible,
  bookId,
  bookTitle,
  author,
  coverUri,
  year,
  existingReview,
  onClose,
  onSubmit,
}) => {
  const { colors } = useTheme();
  const { profile, user } = useAuth();

  const [rating, setRating] = useState<number>(existingReview?.rating || 4.5);
  const [reviewText, setReviewText] = useState<string>(existingReview?.reviewText || '');
  const [reaction, setReaction] = useState<string>(existingReview?.reaction || '');
  const [liked, setLiked] = useState<boolean>(existingReview?.liked || false);
  const [containsSpoilers, setContainsSpoilers] = useState<boolean>(
    existingReview?.containsSpoilers || false
  );
  const [isPublic, setIsPublic] = useState<boolean>(
    existingReview !== undefined && existingReview !== null ? existingReview.isPublic : true
  );

  useEffect(() => {
    if (visible) {
      setRating(existingReview?.rating || 4.5);
      setReviewText(existingReview?.reviewText || '');
      setReaction(existingReview?.reaction || '');
      setLiked(existingReview?.liked || false);
      setContainsSpoilers(existingReview?.containsSpoilers || false);
      setIsPublic(
        existingReview !== undefined && existingReview !== null ? existingReview.isPublic : true
      );
    }
  }, [visible, existingReview]);

  const ratingVerdict = useMemo(() => {
    const key = rating.toFixed(1);
    return RATING_VERDICTS[key] || `${key} Stars`;
  }, [rating]);

  const handleStarPress = (starIndex: number) => {
    // If tapping the exact whole star, toggle to half star; otherwise set full star
    if (rating === starIndex) {
      setRating(Math.max(0.5, starIndex - 0.5));
    } else {
      setRating(starIndex);
    }
  };

  const handleSave = () => {
    onSubmit({
      bookId,
      bookTitle,
      author,
      coverUri: coverUri || existingReview?.coverUri,
      year: year || existingReview?.year,
      userId: user?.uid || profile?.id || 'guest_reader',
      username: profile?.username || 'reader',
      userAvatar: profile?.avatarUrl,
      rating,
      reviewText: reviewText.trim(),
      reaction: reaction || undefined,
      liked,
      containsSpoilers,
      isPublic,
      readDate: Date.now(),
      likesCount: existingReview?.likesCount || 0,
    });
    onClose();
  };

  const formattedDate = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Subtle Top Handle */}
          <View style={[styles.handleBar, { backgroundColor: colors.border }]} />

          {/* Modal Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleWrap}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                {existingReview ? 'Edit Review' : 'Write Review'}
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Reading Log & Diary
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Book Info Summary */}
            <View
              style={[
                styles.bookRow,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.coverWrap}>
                <BookCover
                  coverUri={coverUri || existingReview?.coverUri}
                  title={bookTitle}
                  author={author}
                  width={52}
                  height={78}
                />
              </View>
              <View style={styles.bookInfo}>
                <Text
                  style={[styles.bookTitle, { color: colors.textPrimary }]}
                  numberOfLines={2}
                >
                  {bookTitle}
                </Text>
                <Text
                  style={[styles.bookAuthor, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {author} {year ? `· ${year}` : ''}
                </Text>
                <View style={styles.logDateRow}>
                  <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                  <Text style={[styles.logDateText, { color: colors.textMuted }]}>
                    Logged on {formattedDate}
                  </Text>
                </View>
              </View>
            </View>

            {/* Rating & Liked Section */}
            <View
              style={[
                styles.ratingCard,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
                YOUR RATING
              </Text>

              {/* 5 Interactive Gold Stars */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFull = rating >= star;
                  const isHalf = rating >= star - 0.5 && rating < star;
                  return (
                    <TouchableOpacity
                      key={star}
                      onPress={() => handleStarPress(star)}
                      style={styles.starTouch}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    >
                      <Ionicons
                        name={isFull ? 'star' : isHalf ? 'star-half' : 'star-outline'}
                        size={34}
                        color={isFull || isHalf ? colors.accent : colors.border}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Verdict Pill & Liked Toggle */}
              <View style={styles.verdictRow}>
                <View
                  style={[
                    styles.verdictPill,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.verdictText, { color: colors.accent }]}>
                    ★ {ratingVerdict}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setLiked(!liked)}
                  style={[
                    styles.likeBtn,
                    liked
                      ? {
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          borderColor: '#EF4444',
                        }
                      : {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                  ]}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={liked ? 'heart' : 'heart-outline'}
                    size={16}
                    color={liked ? '#EF4444' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.likeBtnText,
                      { color: liked ? '#EF4444' : colors.textSecondary },
                    ]}
                  >
                    {liked ? 'Liked' : 'Like'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Vibe & Reaction Tags */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
                READING VIBE
              </Text>
              <View style={styles.reactionGrid}>
                {REACTIONS.map((tag) => {
                  const isSelected = reaction === tag;
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => setReaction(isSelected ? '' : tag)}
                      style={[
                        styles.reactionChip,
                        isSelected
                          ? {
                              backgroundColor: colors.accent + '22',
                              borderColor: colors.accent,
                            }
                          : {
                              backgroundColor: colors.surfaceSubtle,
                              borderColor: colors.border,
                            },
                      ]}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.reactionChipText,
                          { color: isSelected ? colors.accent : colors.textSecondary },
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Review Notes Area */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeadingRow}>
                <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
                  REVIEW & NOTES
                </Text>
                <Text style={[styles.charCount, { color: colors.textMuted }]}>
                  {reviewText.length} chars
                </Text>
              </View>

              <TextInput
                value={reviewText}
                onChangeText={setReviewText}
                placeholder="Share your thoughts, quotes, critique, or reflections on this book..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                style={[
                  styles.reviewInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  },
                ]}
              />
            </View>

            {/* Spoiler & Privacy Toggles */}
            <View
              style={[
                styles.optionsCard,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.optionRow}>
                <View style={styles.optionLeft}>
                  <View style={styles.optionTitleRow}>
                    <Ionicons
                      name="warning-outline"
                      size={16}
                      color="#F59E0B"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                      Contains Spoilers
                    </Text>
                  </View>
                  <Text style={[styles.optionSub, { color: colors.textMuted }]}>
                    Hides text behind a spoiler warning for readers
                  </Text>
                </View>
                <Switch
                  value={containsSpoilers}
                  onValueChange={setContainsSpoilers}
                  trackColor={{ false: colors.border, true: '#F59E0B' }}
                />
              </View>

              <View style={[styles.optionDivider, { backgroundColor: colors.border }]} />

              <View style={styles.optionRow}>
                <View style={styles.optionLeft}>
                  <View style={styles.optionTitleRow}>
                    <Ionicons
                      name="globe-outline"
                      size={16}
                      color={colors.accent}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                      Add to Community Diary
                    </Text>
                  </View>
                  <Text style={[styles.optionSub, { color: colors.textMuted }]}>
                    Display on your public profile and reviews feed
                  </Text>
                </View>
                <Switch
                  value={isPublic}
                  onValueChange={setIsPublic}
                  trackColor={{ false: colors.border, true: colors.accent }}
                />
              </View>
            </View>

            {/* Bottom Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.cancelBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: colors.accent,
                  },
                ]}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="checkmark-sharp"
                  size={18}
                  color="#0B0F19"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.saveText}>
                  {existingReview ? 'Update Review' : 'Save Review'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 10,
    maxHeight: '92%',
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.serifBold,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  coverWrap: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bookTitle: {
    fontSize: 16,
    fontFamily: Fonts.serifBold,
    lineHeight: 22,
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    marginBottom: 6,
  },
  logDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logDateText: {
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
  ratingCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 0.8,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 12,
  },
  starTouch: {
    padding: 2,
  },
  verdictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  verdictPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  verdictText: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  likeBtnText: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  reactionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  reactionChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  reactionChipText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  charCount: {
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
  reviewInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 20,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  optionsCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 2,
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  optionLeft: {
    flex: 1,
    marginRight: 10,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
  },
  optionSub: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  optionDivider: {
    height: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  saveText: {
    color: '#0B0F19',
    fontSize: 14,
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
});
