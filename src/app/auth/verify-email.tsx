import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Fonts } from '../../theme';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, sendVerificationEmail, checkEmailVerified, signOut } = useAuth();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const maskEmail = (emailStr?: string | null) => {
    if (!emailStr) return 'your email address';
    const [name, domain] = emailStr.split('@');
    if (!domain) return emailStr;
    const maskedName = name.length > 2 ? `${name[0]}•••${name[name.length - 1]}` : `${name}•••`;
    return `${maskedName}@${domain}`;
  };

  const handleCheckVerified = async () => {
    setChecking(true);
    try {
      const isVerified = await checkEmailVerified();
      if (isVerified) {
        Alert.alert('Email Verified! 🎉', 'Welcome to Libora. Setting up your reading space.', [
          {
            text: 'Continue',
            onPress: () => router.replace('/setup'),
          },
        ]);
      } else {
        Alert.alert(
          'Not Verified Yet',
          'We have not detected your email verification yet. Please click the link sent to your inbox, then tap this button again.'
        );
      }
    } catch {
      Alert.alert('Verification Check', 'Could not verify status. Please check your network connection.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    try {
      await sendVerificationEmail();
      setCooldown(60);
      Alert.alert('Verification Email Sent', 'A new verification link has been sent to your inbox.');
    } catch (e: any) {
      Alert.alert('Notice', e.message || 'Could not resend email. Please try again shortly.');
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth/choice');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={{ width: 36 }} />
        <Text style={[styles.headerBrand, { color: colors.accent }]}>LIBORA</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Text style={[styles.signOutText, { color: colors.textSecondary }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Mail Graphic */}
        <View style={[styles.mailCircle, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
          <Ionicons name="mail-unread-outline" size={44} color={colors.accent} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>Verify your email</Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          We've sent a verification link to{' '}
          <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
            {maskEmail(user?.email)}
          </Text>
          . Please click the link to confirm your account.
        </Text>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {/* 1. Check Verification Button */}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
            activeOpacity={0.88}
            disabled={checking}
            onPress={handleCheckVerified}
          >
            {checking ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.btnRow}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>I've Verified My Email</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* 2. Resend Email Button with Cooldown */}
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.85}
            disabled={resending || cooldown > 0}
            onPress={handleResend}
          >
            {resending ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={[styles.secondaryBtnText, { color: cooldown > 0 ? colors.textMuted : colors.textPrimary }]}>
                {cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend Verification Email'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Change Account / Return */}
          <TouchableOpacity style={styles.changeBtn} onPress={handleSignOut}>
            <Text style={[styles.changeBtnText, { color: colors.accent }]}>
              Use a different account
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBrand: {
    fontFamily: Fonts.serifBold,
    fontSize: 16,
    letterSpacing: 2,
    fontWeight: '800',
  },
  signOutBtn: {
    padding: 6,
  },
  signOutText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  mailCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: Fonts.serifBold,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: Fonts.sansRegular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontFamily: Fonts.sansBold,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    fontWeight: '600',
  },
  changeBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  changeBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
