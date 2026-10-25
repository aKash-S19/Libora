import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Fonts } from '../theme';

export default function SplashScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isAuthenticated, isLoading, onboardingCompleted, setupCompleted } = useAuth();

  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(0.92));
  const [bookRevealAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // Elegant entrance animation: scale and fade-in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 750,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(bookRevealAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, bookRevealAnim]);

  useEffect(() => {
    if (isLoading) return;

    // Transition smoothly as soon as initialization is complete
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        if (!setupCompleted) {
          router.replace('/setup');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        if (!onboardingCompleted) {
          router.replace('/onboarding');
        } else {
          router.replace('/auth/choice');
        }
      }
    }, 950);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, onboardingCompleted, setupCompleted, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Animated Brand Logo Icon */}
        <View style={[styles.logoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Image
            source={require('../../assets/libora.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Wordmark and Tagline */}
        <Animated.View style={{ opacity: bookRevealAnim, alignItems: 'center' }}>
          <Text style={[styles.wordmark, { color: colors.textPrimary }]}>LIBORA</Text>
          <Text style={[styles.tagline, { color: colors.accent }]}>Your world of reading.</Text>
        </Animated.View>
      </Animated.View>

      {/* Subtle Page-Edge Bottom Bar */}
      <View style={styles.footer}>
        <View style={[styles.pageLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Local-first · Privacy-first
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoCard: {
    width: 96,
    height: 96,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  logoImage: {
    width: 70,
    height: 70,
  },
  wordmark: {
    fontFamily: Fonts.serifBold,
    fontSize: 32,
    letterSpacing: 4,
    fontWeight: '800',
    marginBottom: 6,
  },
  tagline: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 34,
    alignItems: 'center',
  },
  pageLine: {
    width: 36,
    height: 3,
    borderRadius: 2,
    marginBottom: 8,
  },
  footerText: {
    fontFamily: Fonts.sansRegular,
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
