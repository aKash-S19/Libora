import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Fonts } from '../../theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { sendPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSendReset = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      Alert.alert('Required Field', 'Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordReset(cleanEmail);
      // Privacy-preserving neutral confirmation (does not disclose account existence)
      setIsSubmitted(true);
    } catch (e: any) {
      Alert.alert(
        'Request Notice',
        e.message || 'Could not send reset link. Please check your connection or wait a few minutes.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surfaceSubtle }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerBrand, { color: colors.accent }]}>LIBORA</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          {/* Logo Badge */}
          <View style={styles.logoBadgeContainer}>
            <Image
              source={require('../../../assets/libora.png')}
              style={styles.heroLogo}
              resizeMode="contain"
            />
          </View>

          {isSubmitted ? (
            /* Confirmation State (Neutral & Privacy Preserving) */
            <View style={styles.confirmationBox}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <Ionicons name="mail-open-outline" size={32} color="#10B981" />
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Check Your Email</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                If an account is associated with{' '}
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{email.trim()}</Text>, we
                have sent password reset instructions to your inbox.
              </Text>
              <Text style={[styles.hintText, { color: colors.textMuted }]}>
                Remember to check your spam or promotions folder if the email doesn't appear within a few minutes.
              </Text>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.accent, marginTop: 24 }]}
                onPress={() => router.replace('/auth/login')}
              >
                <Text style={styles.primaryBtnText}>Return to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Input State */
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Let's get you back in.</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Enter the email address registered with your Libora account, and we will send you a password reset link.
              </Text>

              <View style={styles.form}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>EMAIL ADDRESS</Text>
                <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="mail-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="name@example.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.textInput, { color: colors.textPrimary }]}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.accent, marginTop: 12 }]}
                  activeOpacity={0.85}
                  disabled={loading}
                  onPress={handleSendReset}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.returnLink}
                  onPress={() => router.replace('/auth/login')}
                >
                  <Ionicons name="arrow-back" size={14} color={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={[styles.returnLinkText, { color: colors.accent }]}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBrand: {
    fontFamily: Fonts.serifBold,
    fontSize: 16,
    letterSpacing: 2,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  logoBadgeContainer: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  heroLogo: {
    width: 48,
    height: 48,
  },
  title: {
    fontFamily: Fonts.serifBold,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.sansRegular,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  form: {
    gap: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
    letterSpacing: 1,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  textInput: {
    flex: 1,
    fontFamily: Fonts.sansRegular,
    fontSize: 14,
    height: '100%',
  },
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontFamily: Fonts.sansBold,
    fontSize: 15,
    fontWeight: '700',
  },
  returnLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  returnLinkText: {
    fontFamily: Fonts.sansBold,
    fontSize: 13,
    fontWeight: '700',
  },
  confirmationBox: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  hintText: {
    fontFamily: Fonts.sansRegular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
  },
});
