import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { FirebaseAuthService } from '../services/firebase';
import { StorageService, DEFAULT_USER_PROFILE } from '../storage';
import { SyncService } from '../services/sync';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile;
  isAuthenticated: boolean;
  isLoading: boolean;
  onboardingCompleted: boolean;
  setupCompleted: boolean;
  setOnboardingCompleted: (val: boolean) => Promise<void>;
  setSetupCompleted: (val: boolean) => Promise<void>;
  saveUserPreferences: (prefs: { readingInterests?: string[]; dailyGoalMinutes?: number }) => Promise<void>;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, username: string) => Promise<User>;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleToken: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  checkEmailVerified: () => Promise<boolean>;
  updateProfile: (updated: Partial<UserProfile>) => Promise<void>;
  checkUsernameAvailable: (username: string) => Promise<{ available: boolean; reason?: string }>;
  updateUsername: (newUsername: string) => Promise<void>;
  syncNow: () => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompletedState] = useState(false);
  const [setupCompleted, setSetupCompletedState] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function initializeAuthState() {
      try {
        // 1. Check Onboarding status
        const isObDone = await StorageService.isOnboardingCompleted();
        if (isMounted) setOnboardingCompletedState(isObDone);

        // 2. Load cached profile
        const cachedProfile = await StorageService.getUserProfile();
        if (isMounted) setProfile(cachedProfile);

        // 3. Listen to Firebase auth changes
        const unsubscribe = FirebaseAuthService.onAuthChange(async (firebaseUser) => {
          if (!isMounted) return;

          if (firebaseUser) {
            setUser(firebaseUser);

            // Restore user cloud data
            await SyncService.restoreUserData(firebaseUser.uid);
            const restoredProfile = await StorageService.getUserProfile();
            if (isMounted) setProfile(restoredProfile);

            // Check if setup was completed for this user
            const isSetupDone = await StorageService.isSetupCompleted(firebaseUser.uid);
            if (isMounted) {
              setSetupCompletedState(isSetupDone || Boolean(restoredProfile.setupCompleted));
            }
          } else {
            setUser(null);
            setSetupCompletedState(false);
          }

          if (isMounted) setIsLoading(false);
        });

        return unsubscribe;
      } catch (err) {
        console.warn('Auth initialization error:', err);
        if (isMounted) setIsLoading(false);
      }
    }

    const unsubPromise = initializeAuthState();

    return () => {
      isMounted = false;
      unsubPromise.then((unsub) => unsub && unsub());
    };
  }, []);

  const setOnboardingCompleted = async (val: boolean) => {
    await StorageService.setOnboardingCompleted(val);
    setOnboardingCompletedState(val);
  };

  const setSetupCompleted = async (val: boolean) => {
    if (user?.uid) {
      await StorageService.setSetupCompleted(user.uid, val);
      await updateProfile({ setupCompleted: val });
    }
    setSetupCompletedState(val);
  };

  const saveUserPreferences = async (prefs: { readingInterests?: string[]; dailyGoalMinutes?: number }) => {
    if (user?.uid) {
      await StorageService.saveUserPreferences(user.uid, prefs);
      await updateProfile({
        readingInterests: prefs.readingInterests,
        dailyGoalMinutes: prefs.dailyGoalMinutes,
      });
    }
  };

  const handleUserSessionEstablished = async (
    authenticatedUser: User,
    fallbackUsername?: string
  ) => {
    setUser(authenticatedUser);

    // 1. Restore cloud data for this user
    const { isNewUser } = await SyncService.restoreUserData(authenticatedUser.uid);

    // 2. Load and set restored or fresh profile
    const current = await StorageService.getUserProfile();
    const displayName =
      authenticatedUser.displayName ||
      current.displayName ||
      fallbackUsername ||
      authenticatedUser.email?.split('@')[0] ||
      'Reader';
    const username = (
      fallbackUsername ||
      current.username ||
      authenticatedUser.email?.split('@')[0] ||
      'reader'
    )
      .toLowerCase()
      .replace(/\s+/g, '_');

    const updatedProfile: UserProfile = {
      ...current,
      id: authenticatedUser.uid,
      displayName,
      username,
    };
    await StorageService.saveUserProfile(updatedProfile);
    setProfile(updatedProfile);

    // 3. Check setup completion
    const isSetupDone = await StorageService.isSetupCompleted(authenticatedUser.uid);
    setSetupCompletedState(isSetupDone || Boolean(updatedProfile.setupCompleted));

    // 4. Sync if existing user
    if (!isNewUser) {
      await SyncService.syncAll();
    }
  };

  const signIn = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const loggedUser = await FirebaseAuthService.signIn(email, pass);
      await handleUserSessionEstablished(loggedUser);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, pass: string, username: string): Promise<User> => {
    setIsLoading(true);
    try {
      const newUser = await FirebaseAuthService.signUp(email, pass, username);
      return newUser;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setIsLoading(true);
    try {
      const googleUser = await FirebaseAuthService.signInWithGoogle();
      await handleUserSessionEstablished(googleUser);
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogleToken = async (idToken: string) => {
    setIsLoading(true);
    try {
      const googleUser = await FirebaseAuthService.signInWithGoogleCredential(idToken);
      await handleUserSessionEstablished(googleUser);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      if (user) {
        await SyncService.syncAll();
      }
    } catch {}

    await FirebaseAuthService.signOut();
    await StorageService.clearUserData();
    setUser(null);
    setSetupCompletedState(false);
    setProfile(DEFAULT_USER_PROFILE);
  };

  const sendPasswordReset = async (email: string) => {
    await FirebaseAuthService.sendPasswordReset(email);
  };

  const sendVerificationEmail = async () => {
    await FirebaseAuthService.sendVerificationEmail();
  };

  const checkEmailVerified = async (): Promise<boolean> => {
    const reloaded = await FirebaseAuthService.reloadUser();
    return Boolean(reloaded?.emailVerified);
  };

  const updateProfile = async (updated: Partial<UserProfile>) => {
    const current = await StorageService.getUserProfile();
    const merged = { ...current, ...updated };
    await StorageService.saveUserProfile(merged);
    setProfile(merged);
    if (user) {
      await SyncService.syncAll();
    }
  };

  const checkUsernameAvailable = async (username: string) => {
    return FirebaseAuthService.checkUsernameAvailable(username, user?.uid || profile.id);
  };

  const updateUsername = async (newUsername: string) => {
    const clean = newUsername.toLowerCase().trim();
    if (user?.uid) {
      await FirebaseAuthService.updateUserUsername(user.uid, clean);
    } else {
      const p = await StorageService.getUserProfile();
      p.username = clean;
      await StorageService.saveUserProfile(p);
    }
    setProfile((prev) => ({ ...prev, username: clean }));
  };

  const syncNow = async () => {
    return await SyncService.syncAll();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: !!user,
        isLoading,
        onboardingCompleted,
        setupCompleted,
        setOnboardingCompleted,
        setSetupCompleted,
        saveUserPreferences,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithGoogleToken,
        signOut,
        sendPasswordReset,
        sendVerificationEmail,
        checkEmailVerified,
        updateProfile,
        checkUsernameAvailable,
        updateUsername,
        syncNow,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
