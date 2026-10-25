import React, { useState, useMemo, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { FirebaseAuthService } from '../../services/firebase';
import { StorageService } from '../../storage';
import { Fonts } from '../../theme';

export default function SignUpScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMsg, setUsernameMsg] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Debounced real-time DB availability check
  useEffect(() => {
    const clean = username.toLowerCase().trim();
    if (!clean) {
      setUsernameStatus('idle');
      setUsernameMsg('');
      return;
    }
    if (clean.length < 3) {
      setUsernameStatus('invalid');
      setUsernameMsg('Username must be at least 3 characters');
      return;
    }
    if (clean.length > 20) {
      setUsernameStatus('invalid');
      setUsernameMsg('Username cannot exceed 20 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      setUsernameStatus('invalid');
      setUsernameMsg('Only letters, numbers, and underscores allowed');
      return;
    }

    setUsernameStatus('checking');
    setUsernameMsg('Checking database...');
    const timer = setTimeout(async () => {
      try {
        const res = await FirebaseAuthService.checkUsernameAvailable(clean);
        if (res.available) {
          setUsernameStatus('available');
          setUsernameMsg(`@${clean} is available!`);
        } else {
          setUsernameStatus('taken');
          setUsernameMsg(res.reason || `@${clean} is already taken`);
        }
      } catch {
        setUsernameStatus('available');
        setUsernameMsg(`@${clean} is available offline`);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username]);

  // Dynamic Password Strength Calculation (0 to 4)
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: colors.border };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: '#EF4444' };
      case 2:
        return { score: 2, label: 'Fair', color: '#F59E0B' };
      case 3:
        return { score: 3, label: 'Good', color: '#3B82F6' };
      case 4:
        return { score: 4, label: 'Strong', color: '#10B981' };
      default:
        return { score: 1, label: 'Weak', color: '#EF4444' };
    }
  }, [password, colors.border]);

  const handleSignUp = async () => {
    const cleanName = fullName.trim();
    const cleanUsername = username.toLowerCase().trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      Alert.alert('Required Field', 'Please enter your full name.');
      return;
    }

    if (!cleanUsername) {
      Alert.alert('Required Field', 'Please choose your unique username handle.');
      return;
    }

    if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
      Alert.alert('Username Issue', usernameMsg || 'Please choose an available unique username.');
      return;
    }

    if (usernameStatus === 'checking') {
      Alert.alert('Please Wait', 'Checking username availability in the database...');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address (e.g., name@example.com).');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Password Policy', 'For your account security, passwords must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'The passwords you entered do not match. Please re-enter your password.');
      return;
    }

    if (!termsAccepted) {
      Alert.alert('Terms Acceptance', 'Please read and accept Libora’s Terms of Service and Privacy Policy to continue.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create account on Firebase
      await FirebaseAuthService.signUp(cleanEmail, password, cleanUsername, cleanName);

      // 2. Immediately sign out session so user verifies credentials on login
      await FirebaseAuthService.signOut();
      await StorageService.clearUserData();

      // 3. Prompt user with clear security verification notice
      Alert.alert(
        'Account Created Successfully! 🎉',
        'Your Libora reading account is ready. For your security, please sign in with your email and password to verify your credentials.',
        [
          {
            text: 'Sign In Now',
            onPress: () => {
              router.replace({
                pathname: '/auth/login',
                params: { email: cleanEmail, justCreated: 'true' },
              });
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Registration Notice', e.message || 'Could not create account. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
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
            <Text style={[styles.title, { color: colors.textPrimary }]}>Create your reading space.</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Join Libora and make every reading moment count.
            </Text>
          </View>

          {/* Registration Form */}
          <View style={styles.form}>
            {/* Full Name */}
            <View>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>FULL NAME</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="e.g. Jane Eyre"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  style={[styles.textInput, { color: colors.textPrimary }]}
                />
              </View>
            </View>

            {/* Unique Username */}
            <View>
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CHOOSE UNIQUE USERNAME</Text>
                {usernameMsg ? (
                  <View style={styles.usernameStatusRow}>
                    {usernameStatus === 'checking' && (
                      <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 4 }} />
                    )}
                    {usernameStatus === 'available' && (
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 4 }} />
                    )}
                    {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                      <Ionicons name="alert-circle" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                    )}
                    <Text
                      style={[
                        styles.usernameStatusText,
                        {
                          color:
                            usernameStatus === 'available'
                              ? '#10B981'
                              : usernameStatus === 'checking'
                              ? colors.accent
                              : '#EF4444',
                        },
                      ]}
                    >
                      {usernameMsg}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View
                style={[
                  styles.inputBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor:
                      usernameStatus === 'available'
                        ? '#10B981'
                        : usernameStatus === 'taken' || usernameStatus === 'invalid'
                        ? '#EF4444'
                        : colors.border,
                  },
                ]}
              >
                <Text style={[styles.atPrefix, { color: colors.accent }]}>@</Text>
                <TextInput
                  value={username}
                  onChangeText={(val) => setUsername(val.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="unique_reader_handle"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.textInput, { color: colors.textPrimary }]}
                />
              </View>
            </View>

            {/* Email Address */}
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

            {/* Password */}
            <View>
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>PASSWORD</Text>
                {password.length > 0 && (
                  <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                    {passwordStrength.label}
                  </Text>
                )}
              </View>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={[styles.textInput, { color: colors.textPrimary }]}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Password Strength Meter */}
              {password.length > 0 && (
                <View style={styles.strengthMeterRow}>
                  {[1, 2, 3, 4].map((step) => (
                    <View
                      key={step}
                      style={[
                        styles.strengthSegment,
                        {
                          backgroundColor:
                            step <= passwordStrength.score ? passwordStrength.color : colors.border,
                        },
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Confirm Password */}
            <View>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CONFIRM PASSWORD</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  style={[styles.textInput, { color: colors.textPrimary }]}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Terms of Service Acceptance Checkbox */}
            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.8}
              onPress={() => setTermsAccepted(!termsAccepted)}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: termsAccepted ? colors.accent : colors.border,
                    backgroundColor: termsAccepted ? colors.accent : colors.surface,
                  },
                ]}
              >
                {termsAccepted && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={[styles.checkboxText, { color: colors.textSecondary }]}>
                I accept Libora’s <Text style={{ color: colors.accent, fontWeight: '700' }}>Terms of Service</Text> and{' '}
                <Text style={{ color: colors.accent, fontWeight: '700' }}>Privacy Policy</Text>.
              </Text>
            </TouchableOpacity>

            {/* Create Account Primary Button */}
            <TouchableOpacity
              onPress={handleSignUp}
              disabled={loading}
              style={[styles.submitBtn, { backgroundColor: colors.accent }]}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Sign In Link */}
            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.replace('/auth/login')}>
                <Text style={[styles.footerLink, { color: colors.accent }]}>
                  Sign In
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
  form: {
    gap: 16,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  strengthLabel: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
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
  strengthMeterRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  strengthSegment: {
    flex: 1,
    height: 3.5,
    borderRadius: 2,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxText: {
    flex: 1,
    fontFamily: Fonts.sansRegular,
    fontSize: 12,
    lineHeight: 18,
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontFamily: Fonts.sansBold,
    fontSize: 15,
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
  atPrefix: {
    fontSize: 16,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
    marginRight: 6,
  },
  usernameStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  usernameStatusText: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
    fontWeight: '600',
  },
});
