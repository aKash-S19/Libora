import React, { useState, useEffect, useCallback } from 'react';
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
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import * as Google from 'expo-auth-session/providers/google';
import { Fonts } from '../../theme';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; justCreated?: string }>();
  const { colors } = useTheme();
  const { signIn, signInWithGoogle, signInWithGoogleToken } = useAuth();

  const [email, setEmail] = useState(params.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [justCreated, setJustCreated] = useState(params.justCreated === 'true');

  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

  const isGoogleOAuthConfigured = Boolean(
    Platform.select({
      android: googleAndroidClientId,
      ios: googleIosClientId,
      default: googleWebClientId,
    }) || googleWebClientId
  );

  // Fallback placeholder ID to satisfy invariantClientId at mount-time when keys are not in .env
  const fallbackClientId = 'libora-unconfigured-client-id.apps.googleusercontent.com';

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleWebClientId || fallbackClientId,
    webClientId: googleWebClientId || fallbackClientId,
    androidClientId: googleAndroidClientId || fallbackClientId,
    iosClientId: googleIosClientId || fallbackClientId,
  });

  const handleGoogleIdToken = useCallback(
    async (idToken: string) => {
      setGoogleLoading(true);
      try {
        await signInWithGoogleToken(idToken);
        router.replace('/(tabs)');
      } catch (e: any) {
        Alert.alert('Google Sign-In Notice', e.message || 'Could not authenticate with Google.');
      } finally {
        setGoogleLoading(false);
      }
    },
    [signInWithGoogleToken, router]
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token;
      if (idToken) {
        handleGoogleIdToken(idToken);
      }
    } else if (response?.type === 'error') {
      Alert.alert(
        'Google Sign-In Notice',
        response.error?.message || 'Could not complete Google authentication.'
      );
    }
  }, [response, handleGoogleIdToken]);

  useEffect(() => {
    if (params.email) {
      setEmail(params.email);
    }
    if (params.justCreated === 'true') {
      setJustCreated(true);
    }
  }, [params.email, params.justCreated]);

  const handleSignIn = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your registered email address and password.');
      return;
    }

    setLoading(true);
    try {
      await signIn(cleanEmail, password);
      // Auth success: user session is established and verified!
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert(
        'Authentication Verification Failed',
        e.message || 'Incorrect email or password. Please verify your credentials and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (Platform.OS === 'web') {
      setGoogleLoading(true);
      try {
        await signInWithGoogle();
        router.replace('/(tabs)');
      } catch (e: any) {
        Alert.alert('Google Sign-In Notice', e.message || 'Could not complete Google authentication.');
      } finally {
        setGoogleLoading(false);
      }
      return;
    }

    // Native mobile flow (Android / iOS)
    if (isGoogleOAuthConfigured) {
      if (request) {
        promptAsync();
      } else {
        Alert.alert('Google Sign-In', 'Initializing Google sign-in session...');
      }
      return;
    }

    // When native Google Client ID is not configured in .env, allow demo sign-in or alert
    Alert.alert(
      'Google Sign-In Setup',
      'Google OAuth Client ID is not configured in .env.\n\nWould you like to sign in with a Demo Google session, or use Email and Password?',
      [
        {
          text: 'Use Demo Google',
          onPress: async () => {
            setGoogleLoading(true);
            try {
              await signInWithGoogle();
              router.replace('/(tabs)');
            } catch (e: any) {
              Alert.alert('Google Sign-In Notice', e.message || 'Could not complete Google authentication.');
            } finally {
              setGoogleLoading(false);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.replace('/auth/choice')}
          style={[styles.backBtn, { backgroundColor: colors.surfaceSubtle }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.brandRow}>
          <Image
            source={require('../../../assets/libora.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={[styles.headerBrand, { color: colors.accent }]}>LIBORA</Text>
        </View>

        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Welcome Header */}
          <View style={styles.titleSection}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome back.</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Your next chapter starts here.
            </Text>
          </View>

          {/* Account Verification Notification Banner (When redirected after Signup) */}
          {justCreated && (
            <View
              style={[
                styles.justCreatedBanner,
                {
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  borderColor: colors.accent,
                },
              ]}
            >
              <Ionicons name="shield-checkmark" size={22} color={colors.accent} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.justCreatedTitle, { color: colors.accent }]}>
                  Account Created Successfully
                </Text>
                <Text style={[styles.justCreatedDesc, { color: colors.textPrimary }]}>
                  Please sign in with your new password to verify your credentials and enter Libora.
                </Text>
              </View>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            {/* Email Field */}
            <View>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>EMAIL ADDRESS</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="mail-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
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
            </View>

            {/* Password Field */}
            <View>
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>PASSWORD</Text>
                <TouchableOpacity onPress={() => router.push('/auth/forgot-password')}>
                  <Text style={[styles.forgotLink, { color: colors.accent }]}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={[styles.textInput, { color: colors.textPrimary }]}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSignIn}
              disabled={loading}
              style={[styles.submitBtn, { backgroundColor: colors.accent }]}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.btnRow}>
                  <Text style={styles.submitBtnText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={17} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerLabel, { color: colors.textMuted }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Google Sign-In Button */}
            <TouchableOpacity
              onPress={handleGoogleLogin}
              disabled={googleLoading || loading}
              style={[
                styles.googleBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <View style={styles.googleContentRow}>
                  <Ionicons name="logo-google" size={18} color="#EA4335" style={{ marginRight: 10 }} />
                  <Text style={[styles.googleBtnText, { color: colors.textPrimary }]}>
                    Continue with Google
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                New to Libora?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.replace('/auth/signup')}>
                <Text style={[styles.footerLink, { color: colors.accent }]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 26,
    height: 26,
    borderRadius: 6,
    marginRight: 8,
  },
  headerBrand: {
    fontFamily: Fonts.serifBold,
    fontSize: 16,
    letterSpacing: 2,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 24,
  },
  title: {
    fontFamily: Fonts.serifBold,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: Fonts.sansRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  justCreatedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  justCreatedTitle: {
    fontFamily: Fonts.sansBold,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  justCreatedDesc: {
    fontFamily: Fonts.sansRegular,
    fontSize: 12,
    lineHeight: 16,
  },
  form: {
    gap: 16,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
    letterSpacing: 1,
  },
  forgotLink: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    fontWeight: '600',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: Fonts.sansRegular,
    fontSize: 14,
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontFamily: Fonts.sansBold,
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerLabel: {
    marginHorizontal: 12,
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
  },
  googleBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleBtnText: {
    fontFamily: Fonts.sansBold,
    fontSize: 14,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    fontFamily: Fonts.sansRegular,
    fontSize: 13,
  },
  footerLink: {
    fontFamily: Fonts.sansBold,
    fontSize: 13,
    fontWeight: '700',
  },
});
