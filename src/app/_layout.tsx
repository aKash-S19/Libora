import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { Newsreader_400Regular } from '@expo-google-fonts/newsreader/400Regular';
import { Newsreader_500Medium } from '@expo-google-fonts/newsreader/500Medium';
import { Newsreader_600SemiBold } from '@expo-google-fonts/newsreader/600SemiBold';
import { Newsreader_700Bold } from '@expo-google-fonts/newsreader/700Bold';
import { Newsreader_400Regular_Italic } from '@expo-google-fonts/newsreader/400Regular_Italic';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LibraryProvider } from '../context/LibraryContext';
import { ReaderProvider } from '../context/ReaderContext';

WebBrowser.maybeCompleteAuthSession();

function RootLayoutNav() {
  const { colors, isDark } = useTheme();
  const { isAuthenticated, isLoading, onboardingCompleted, setupCompleted } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
    Newsreader_700Bold,
    Newsreader_400Regular_Italic,
  });

  useEffect(() => {
    if (!fontsLoaded || isLoading) return;

    const currentSegment = segments[0] as string | undefined;

    // While on splash screen or index, allow splash animation & init to run
    if (!currentSegment || currentSegment === 'splash' || currentSegment === 'index') {
      return;
    }

    const isAuthRoute = currentSegment === 'auth';
    const isOnboardingRoute = currentSegment === 'onboarding';
    const isSetupRoute = currentSegment === 'setup';

    if (!isAuthenticated) {
      // Unauthenticated users can only access splash, onboarding, and auth screens
      if (!isAuthRoute && !isOnboardingRoute) {
        if (!onboardingCompleted) {
          router.replace('/onboarding');
        } else {
          router.replace('/auth/choice');
        }
      }
    } else {
      // Authenticated users
      if (!setupCompleted) {
        // New authenticated users must complete or skip initial setup
        if (!isSetupRoute) {
          router.replace('/setup');
        }
      } else {
        // Authenticated and setup is complete; prevent re-entry to auth and setup
        if (isAuthRoute || isSetupRoute) {
          router.replace('/(tabs)');
        }
      }
    }
  }, [isAuthenticated, isLoading, onboardingCompleted, setupCompleted, segments, fontsLoaded, router]);

  if (!fontsLoaded || isLoading) {
    return (
      <View style={[styles.splashContainer, { backgroundColor: isDark ? '#121824' : '#FAF8F5' }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.splashCard}>
          <Image
            source={require('../../assets/libora.png')}
            style={styles.splashLogo}
            resizeMode="contain"
          />
          <Text style={[styles.splashTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>LIBORA</Text>
          <Text style={[styles.splashSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Your world of reading.
          </Text>
          <ActivityIndicator size="small" color="#F59E0B" style={{ marginTop: 24 }} />
        </View>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="splash" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="auth/choice" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="auth/signup" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="auth/forgot-password" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="auth/verify-email" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="setup/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="reader/[id]"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="book/[id]"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="quote-card"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="search"
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="highlights"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="notes"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="downloads"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="user/[username]"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  splashCard: {
    alignItems: 'center',
  },
  splashLogo: {
    width: 84,
    height: 84,
    borderRadius: 20,
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 4,
  },
  splashSubtitle: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <LibraryProvider>
            <ReaderProvider>
              <RootLayoutNav />
            </ReaderProvider>
          </LibraryProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
