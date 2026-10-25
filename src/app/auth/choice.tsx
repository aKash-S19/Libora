import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../theme';

export default function AuthChoiceScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  // Modals for Terms, Privacy, and Feature Explorer
  const [modalType, setModalType] = useState<'privacy' | 'terms' | 'explore' | null>(null);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={[styles.logoBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Image
              source={require('../../../assets/libora.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.wordmark, { color: colors.textPrimary }]}>LIBORA</Text>
          <View style={[styles.badgePill, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)' }]}>
            <Text style={[styles.badgePillText, { color: colors.accent }]}>Local-First Reader</Text>
          </View>
        </View>

        {/* Central Restrained Library Visual Card */}
        <View style={[styles.visualCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="shield-checkmark" size={18} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Local Device Storage</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
          </View>

          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Imported EPUB and PDF books are stored exclusively in your phone's sandbox. They are never uploaded or analyzed in the cloud.
          </Text>

          <View style={[styles.privacyBanner, { backgroundColor: colors.surfaceSubtle }]}>
            <Ionicons name="lock-closed" size={14} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.privacyBannerText, { color: colors.textPrimary }]}>
              Your books stay on your device.
            </Text>
          </View>
        </View>

        {/* Welcome Typography */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.headline, { color: colors.textPrimary }]}>Welcome to Libora.</Text>
          <Text style={[styles.supportingText, { color: colors.textSecondary }]}>
            A little space for everything you read. Create an account to log reviews, track reading streaks, and sync your reading diary.
          </Text>
        </View>

        {/* Primary and Secondary Authentication Actions */}
        <View style={styles.actionsGroup}>
          {/* 1. Create Account */}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
            activeOpacity={0.88}
            onPress={() => router.push('/auth/signup')}
          >
            <Text style={styles.primaryBtnText}>Create Account</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* 2. Sign In */}
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.85}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>Sign In</Text>
            <Ionicons name="log-in-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* 3. Explore How Libora Works (Non-Bypass Preview) */}
          <TouchableOpacity
            style={styles.exploreLink}
            activeOpacity={0.7}
            onPress={() => setModalType('explore')}
          >
            <Ionicons name="compass-outline" size={15} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={[styles.exploreLinkText, { color: colors.accent }]}>
              Explore how Libora works
            </Text>
          </TouchableOpacity>
        </View>

        {/* Terms & Privacy Links Footer */}
        <View style={styles.legalFooter}>
          <Text style={[styles.legalText, { color: colors.textMuted }]}>
            By continuing, you agree to Libora's{' '}
          </Text>
          <View style={styles.legalLinksRow}>
            <TouchableOpacity onPress={() => setModalType('terms')}>
              <Text style={[styles.legalLink, { color: colors.accent }]}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={[styles.legalText, { color: colors.textMuted }]}> and </Text>
            <TouchableOpacity onPress={() => setModalType('privacy')}>
              <Text style={[styles.legalLink, { color: colors.accent }]}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Legal & Explore Modal */}
      <Modal visible={modalType !== null} transparent animationType="slide" onRequestClose={() => setModalType(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {modalType === 'terms'
                  ? 'Terms of Service'
                  : modalType === 'privacy'
                  ? 'Privacy Architecture'
                  : 'How Libora Works'}
              </Text>
              <TouchableOpacity onPress={() => setModalType(null)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {modalType === 'explore' && (
                <View style={{ gap: 14 }}>
                  <Text style={[styles.modalSectionTitle, { color: colors.accent }]}>
                    1. Local-First Reading Engine
                  </Text>
                  <Text style={[styles.modalParagraph, { color: colors.textSecondary }]}>
                    Libora treats your book library as personal property. You can import any EPUB or PDF directly from your device. The document is indexed on device and never uploaded to any remote server.
                  </Text>

                  <Text style={[styles.modalSectionTitle, { color: colors.accent }]}>
                    2. Letterboxd-Style Journaling
                  </Text>
                  <Text style={[styles.modalParagraph, { color: colors.textSecondary }]}>
                    Write reflections, rate books on a half-star scale, flag spoilers, and build your literary timeline. Your reviews are synced securely to your personal cloud profile.
                  </Text>

                  <Text style={[styles.modalSectionTitle, { color: colors.accent }]}>
                    3. Highlights & Marginalia
                  </Text>
                  <Text style={[styles.modalParagraph, { color: colors.textSecondary }]}>
                    Highlight passages in five curated ink palettes and generate beautiful quote cards with one tap.
                  </Text>
                </View>
              )}

              {modalType === 'privacy' && (
                <View style={{ gap: 12 }}>
                  <Text style={[styles.modalParagraph, { color: colors.textSecondary }]}>
                    <Text style={{ fontWeight: '700', color: colors.textPrimary }}>The Libora Privacy Guarantee: </Text>
                    Your physical book files (EPUB, PDF, TXT) remain strictly inside your device's isolated storage sandbox.
                  </Text>
                  <Text style={[styles.modalParagraph, { color: colors.textSecondary }]}>
                    Cloud Firestore stores only your account metadata, reading progress statistics, and community reviews.
                  </Text>
                  <Text style={[styles.modalParagraph, { color: colors.textSecondary }]}>
                    We do not track your location, sell data to third-party advertisers, or scan the contents of your reading files.
                  </Text>
                </View>
              )}

              {modalType === 'terms' && (
                <View style={{ gap: 12 }}>
                  <Text style={[styles.modalParagraph, { color: colors.textSecondary }]}>
                    Welcome to Libora. By creating an account, you agree to respect copyright laws and only import literature you legally own or that exists in the public domain.
                  </Text>
                  <Text style={[styles.modalParagraph, { color: colors.textSecondary }]}>
                    Community reviews must adhere to respectful community standards. Libora reserves the right to remove abusive, hateful, or commercial spam reviews from public feeds.
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalDoneBtn, { backgroundColor: colors.accent }]}
              onPress={() => setModalType(null)}
            >
              <Text style={styles.modalDoneBtnText}>Understood</Text>
            </TouchableOpacity>
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
    justifyContent: 'space-between',
    minHeight: '100%',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  logoImage: {
    width: 54,
    height: 54,
  },
  wordmark: {
    fontFamily: Fonts.serifBold,
    fontSize: 26,
    letterSpacing: 3,
    fontWeight: '800',
    marginBottom: 6,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePillText: {
    fontFamily: Fonts.sansBold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  visualCard: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: Fonts.sansBold,
    fontSize: 13,
    fontWeight: '700',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardDescription: {
    fontFamily: Fonts.sansRegular,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
  },
  privacyBannerText: {
    fontFamily: Fonts.sansBold,
    fontSize: 12,
    fontWeight: '700',
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 26,
  },
  headline: {
    fontFamily: Fonts.serifBold,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  supportingText: {
    fontFamily: Fonts.sansRegular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  actionsGroup: {
    gap: 12,
    marginBottom: 24,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontFamily: Fonts.sansBold,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  secondaryBtnText: {
    fontFamily: Fonts.sansBold,
    fontSize: 15,
    fontWeight: '700',
  },
  exploreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  exploreLinkText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    fontWeight: '600',
  },
  legalFooter: {
    alignItems: 'center',
  },
  legalText: {
    fontFamily: Fonts.sansRegular,
    fontSize: 11,
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  legalLink: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: Fonts.serifBold,
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalBody: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontFamily: Fonts.sansBold,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalParagraph: {
    fontFamily: Fonts.sansRegular,
    fontSize: 13,
    lineHeight: 20,
  },
  modalDoneBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalDoneBtnText: {
    color: '#FFFFFF',
    fontFamily: Fonts.sansBold,
    fontSize: 14,
    fontWeight: '700',
  },
});
