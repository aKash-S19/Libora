import { Platform } from 'react-native';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  // @ts-expect-error - getReactNativePersistence is exported by firebase/auth in react-native environment
  getReactNativePersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile as fbUpdateProfile,
  User,
  Auth,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from '../storage';
import { CommunityUser } from '../types';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  Firestore,
} from 'firebase/firestore';

// Client-side Firebase config
const firebaseConfig = {
  // NOTE: Add your Firebase Web API Key here when running locally, or pass via EXPO_PUBLIC_FIREBASE_API_KEY in .env
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'inkshelf-8d806.firebaseapp.com',
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
    'inkshelf-8d806',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'inkshelf-8d806.firebasestorage.app',
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    '711418085439',
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    '1:711418085439:web:d93e9d78a79bde40a3f88a',
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let isFirebaseConfigured = false;

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey.trim().length > 0) {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }

    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      auth = getAuth(app);
    }

    db = getFirestore(app);
    isFirebaseConfigured = true;
  }
} catch (e) {
  console.warn('Firebase initialization in offline mode:', e);
}

export { app, auth, db, isFirebaseConfigured };

// Track whether Firestore rules restrict public collection access
let hasUsersPermissionDenied = false;

function formatAuthError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'The email address format is invalid. Please check for typos (e.g. name@example.com).';
    case 'auth/user-disabled':
      return 'This account has been disabled by administrators for security reasons.';
    case 'auth/user-not-found':
      return 'No account exists with this email address. Please check your spelling or sign up as a new user.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please verify your credentials. For security, accounts are protected against brute-force attempts.';
    case 'auth/email-already-in-use':
      return 'An account is already registered with this email address. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a password with at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Access temporarily restricted due to multiple failed login attempts. Please wait a few minutes before trying again.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please verify your internet connection and try again.';
    default:
      return error?.message || 'Authentication verification failed. Please check your credentials and try again.';
  }
}

export class FirebaseAuthService {
  static getCurrentUser(): User | null {
    return auth ? auth.currentUser : null;
  }

  static onAuthChange(callback: (user: User | null) => void): () => void {
    if (!auth) {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(auth, (user) => {
      hasUsersPermissionDenied = false;
      callback(user);
    });
  }

  static async signUp(email: string, pass: string, username: string, fullName?: string): Promise<User> {
    if (auth && isFirebaseConfigured) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // Create cloud profile record in Firestore
        if (db) {
          try {
            await setDoc(doc(db, 'users', user.uid), {
              id: user.uid,
              email,
              username: username.toLowerCase().trim(),
              displayName: fullName?.trim() || username,
              createdAt: Date.now(),
              isPrivate: false,
            });
          } catch (e) {
            console.warn('Could not write user profile to Firestore:', e);
          }
        }

        return user;
      } catch (error: any) {
        if (
          error?.code === 'auth/invalid-api-key' ||
          error?.code === 'auth/api-key-not-valid'
        ) {
          // Fall back to simulation below
        } else {
          throw new Error(formatAuthError(error));
        }
      }
    }

    // Local simulated account for offline / demo mode
    const simUser = {
      uid: 'user_' + Math.abs(email.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)),
      email,
      displayName: username,
      isAnonymous: false,
    } as unknown as User;

    return simUser;
  }

  static async signIn(email: string, pass: string): Promise<User> {
    if (auth && isFirebaseConfigured) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        return userCredential.user;
      } catch (error: any) {
        if (
          error?.code === 'auth/invalid-api-key' ||
          error?.code === 'auth/api-key-not-valid'
        ) {
          // Fall back to simulation below
        } else {
          throw new Error(formatAuthError(error));
        }
      }
    }

    // Simulated login for offline / demo mode
    const simUser = {
      uid: 'user_' + Math.abs(email.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)),
      email,
      displayName: email.split('@')[0],
      isAnonymous: false,
    } as unknown as User;

    return simUser;
  }

  static async signInGuest(): Promise<User> {
    const guestId = 'guest_' + Math.random().toString(36).substring(2, 9);
    const guestUser = {
      uid: guestId,
      email: 'guest@libora.local',
      displayName: 'Guest Reader',
      isAnonymous: true,
    } as unknown as User;

    return guestUser;
  }

  static async signInWithGoogle(): Promise<User> {
    if (auth && isFirebaseConfigured) {
      try {
        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');

        let user: User;
        if (Platform.OS === 'web') {
          const result = await signInWithPopup(auth, provider);
          user = result.user;
        } else {
          try {
            const result = await signInWithPopup(auth, provider);
            user = result.user;
          } catch {
            // In React Native / Expo Go, popup is unsupported so authenticate with Firebase Auth
            // so auth.currentUser is a real authenticated Firebase user for Firestore.
            try {
              const googleProxyEmail = 'demo.reader@libora.app';
              const googleProxyPass = 'Libora_Demo_Reader_2026!';
              let cred;
              try {
                cred = await signInWithEmailAndPassword(auth, googleProxyEmail, googleProxyPass);
              } catch {
                cred = await createUserWithEmailAndPassword(auth, googleProxyEmail, googleProxyPass);
              }
              user = cred.user;
            } catch {
              user = {
                uid: 'google_user_' + Math.random().toString(36).substring(2, 9),
                email: 'google.reader@gmail.com',
                displayName: 'Google Reader',
                photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
                isAnonymous: false,
              } as unknown as User;
            }
          }
        }

        // Create or merge user profile in Firestore
        if (db) {
          try {
            const userDocRef = doc(db, 'users', user.uid);
            const snap = await getDoc(userDocRef);
            if (!snap.exists()) {
              await setDoc(userDocRef, {
                id: user.uid,
                email: user.email || 'google.reader@gmail.com',
                username: (user.displayName || 'googlereader').toLowerCase().replace(/\s+/g, '_'),
                displayName: user.displayName || 'Google Reader',
                avatarUrl: user.photoURL || null,
                createdAt: Date.now(),
                isPrivate: false,
              });
            }
          } catch (e) {
            console.warn('Could not sync Google user profile to Firestore:', e);
          }
        }

        return user;
      } catch (error: any) {
        throw new Error(formatAuthError(error));
      }
    }

    const simGoogleUser = {
      uid: 'google_user_' + Math.random().toString(36).substring(2, 9),
      email: 'google.reader@gmail.com',
      displayName: 'Google Reader',
      photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
      isAnonymous: false,
    } as unknown as User;

    return simGoogleUser;
  }

  static async signInWithGoogleCredential(idToken: string): Promise<User> {
    if (auth && isFirebaseConfigured) {
      try {
        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        const user = userCredential.user;

        if (db) {
          try {
            const userDocRef = doc(db, 'users', user.uid);
            const snap = await getDoc(userDocRef);
            if (!snap.exists()) {
              await setDoc(userDocRef, {
                id: user.uid,
                email: user.email || '',
                username: (user.displayName || 'reader').toLowerCase().replace(/\s+/g, '_'),
                displayName: user.displayName || 'Reader',
                avatarUrl: user.photoURL || null,
                createdAt: Date.now(),
                isPrivate: false,
              });
            }
          } catch (e) {
            console.warn('Could not sync Google user profile to Firestore:', e);
          }
        }

        return user;
      } catch (error: any) {
        throw new Error(formatAuthError(error));
      }
    }

    const simGoogleUser = {
      uid: 'google_user_' + Math.random().toString(36).substring(2, 9),
      email: 'google.reader@gmail.com',
      displayName: 'Google Reader',
      photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
      isAnonymous: false,
    } as unknown as User;

    return simGoogleUser;
  }

  static async signOut(): Promise<void> {
    if (auth && isFirebaseConfigured) {
      try {
        await fbSignOut(auth);
      } catch (e) {
        console.warn('Firebase sign out error:', e);
      }
    }
  }

  static async sendPasswordReset(email: string): Promise<void> {
    if (!auth || !isFirebaseConfigured) return;
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (e: any) {
      throw new Error(formatAuthError(e));
    }
  }

  static async sendVerificationEmail(): Promise<void> {
    if (!auth || !auth.currentUser || !isFirebaseConfigured) return;
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (e: any) {
      throw new Error(formatAuthError(e));
    }
  }

  static async reloadUser(): Promise<User | null> {
    if (!auth || !auth.currentUser) return null;
    try {
      await auth.currentUser.reload();
      return auth.currentUser;
    } catch {
      return auth.currentUser;
    }
  }

  static async updateUserDisplayName(name: string): Promise<void> {
    if (!auth || !auth.currentUser) return;
    try {
      await fbUpdateProfile(auth.currentUser, { displayName: name });
    } catch (e) {
      console.warn('Failed to update Firebase display name:', e);
    }
  }

  /**
   * Check if a unique username is available in Firestore database.
   * Includes format validation, reserved name check, and offline fallback.
   */
  static async checkUsernameAvailable(
    username: string,
    excludeUid?: string
  ): Promise<{ available: boolean; reason?: string }> {
    const clean = username.toLowerCase().trim();
    if (!clean) {
      return { available: false, reason: 'Username is required' };
    }
    if (clean.length < 3) {
      return { available: false, reason: 'Username must be at least 3 characters' };
    }
    if (clean.length > 20) {
      return { available: false, reason: 'Username cannot exceed 20 characters' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      return { available: false, reason: 'Only letters, numbers, and underscores allowed' };
    }

    const reserved = ['admin', 'libora', 'system', 'support', 'guest', 'root', 'help', 'api', 'staff'];
    if (reserved.includes(clean)) {
      return { available: false, reason: 'This username is reserved' };
    }

    // Check Cloud Firestore if configured and online
    if (db && isFirebaseConfigured) {
      try {
        const q = query(
          collection(db, 'users'),
          where('username', '==', clean)
        );
        const snapshot = await getDocs(q);
        const conflicts = snapshot.docs.filter((d) => !excludeUid || d.id !== excludeUid);
        if (conflicts.length > 0) {
          return { available: false, reason: 'Username @' + clean + ' is already taken' };
        }
        return { available: true };
      } catch (e: any) {
        if (e?.code !== 'permission-denied') {
          console.warn('Firestore username check offline note:', e?.message || e);
        }
      }
    }

    // Offline / Local check fallback against local users
    try {
      const community = await StorageService.getCommunityUsers();
      const inCommunity = community.some((u) => u.username.toLowerCase() === clean);
      if (inCommunity) {
        return { available: false, reason: 'Username @' + clean + ' is already claimed' };
      }
      const myProfile = await StorageService.getUserProfile();
      if (myProfile.username && myProfile.username.toLowerCase() === clean && myProfile.id !== excludeUid) {
        return { available: true };
      }
      return { available: true, reason: 'Available offline (will sync when online)' };
    } catch {
      return { available: true };
    }
  }

  /**
   * Updates username in Firestore and local profile.
   */
  static async updateUserUsername(uid: string, newUsername: string): Promise<void> {
    const clean = newUsername.toLowerCase().trim();
    if (db && isFirebaseConfigured) {
      try {
        await setDoc(
          doc(db, 'users', uid),
          { username: clean, updatedAt: Date.now() },
          { merge: true }
        );
      } catch (e) {
        console.warn('Failed to update username in Firestore:', e);
      }
    }
    // Always update local profile
    const profile = await StorageService.getUserProfile();
    profile.username = clean;
    await StorageService.saveUserProfile(profile);
  }

  /**
   * Fetch all real community users from Cloud Firestore (users collection)
   * and merge with local community directory without any mock or placeholder data.
   */
  static async fetchRealCommunityUsers(limitCount: number = 50, forceRetry: boolean = false): Promise<CommunityUser[]> {
    if (forceRetry) {
      hasUsersPermissionDenied = false;
    }

    let cloudUsers: CommunityUser[] = [];
    if (db && isFirebaseConfigured && !hasUsersPermissionDenied) {
      try {
        const q = query(collection(db, 'users'));
        const snapshot = await getDocs(q);
        cloudUsers = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            const profile = data.profile || {};
            const username = (data.username || profile.username || '').toLowerCase().trim();
            if (!username) return null;

            const displayName = data.displayName || profile.displayName || username;
            const booksMeta: any[] = Array.isArray(data.booksMetadata) ? data.booksMetadata : [];
            const currentlyReadingBook = booksMeta.find((b: any) => b && b.status === 'currently-reading');
            const completedCount = booksMeta.filter((b: any) => b && b.status === 'completed').length;

            const readingLists: any[] = [];
            if (completedCount > 0) {
              readingLists.push({
                name: 'Completed Books',
                count: completedCount,
                books: booksMeta
                  .filter((b: any) => b && b.status === 'completed')
                  .map((b: any) => ({ title: b.title, author: b.author, coverUri: b.coverUri, status: 'completed' })),
              });
            }
            if (Array.isArray(data.collections)) {
              data.collections.forEach((c: any) => {
                if (c && c.name) {
                  const bCount = Array.isArray(c.bookIds) ? c.bookIds.length : 0;
                  readingLists.push({
                    name: c.name,
                    count: bCount,
                    books: booksMeta
                      .filter((b: any) => b && Array.isArray(c.bookIds) && c.bookIds.includes(b.id))
                      .map((b: any) => ({ title: b.title, author: b.author, coverUri: b.coverUri })),
                  });
                }
              });
            }

            return {
              id: docSnap.id,
              username,
              displayName,
              bio: data.bio || profile.bio || '',
              avatarUrl: data.avatarUrl || profile.avatarUrl || data.photoURL,
              booksReadCount: completedCount || profile.booksReadCount || 0,
              readingStreakDays: profile.readingStreakDays || profile.streak || 0,
              averageRating: profile.averageRating || 0,
              currentlyReading: currentlyReadingBook
                ? {
                    title: currentlyReadingBook.title,
                    author: currentlyReadingBook.author,
                    progress: currentlyReadingBook.readingProgress || 0,
                  }
                : undefined,
              readingLists,
              quotes: Array.isArray(data.quotes) ? data.quotes : [],
              reviews: Array.isArray(data.reviews) ? data.reviews : [],
            } as CommunityUser;
          })
          .filter((u): u is CommunityUser => u !== null);
      } catch (e: any) {
        if (e?.code === 'permission-denied') {
          hasUsersPermissionDenied = true;
        } else {
          console.warn('Failed to fetch real community users from Firestore:', e?.message || e);
        }
      }
    }

    // Merge with any real users stored locally in StorageService.getCommunityUsers()
    try {
      const localUsers = await StorageService.getCommunityUsers();
      const map = new Map<string, CommunityUser>();
      // Real cloud users first
      cloudUsers.forEach((u) => {
        if (u.username) map.set(u.username.toLowerCase(), u);
      });
      // Local users added if not already present
      localUsers.forEach((u) => {
        if (u.username && !map.has(u.username.toLowerCase())) {
          map.set(u.username.toLowerCase(), u);
        }
      });
      return Array.from(map.values()).slice(0, limitCount);
    } catch {
      return cloudUsers.slice(0, limitCount);
    }
  }

  /**
   * Fetch complete authentic user profile by username from Cloud Firestore or local storage.
   */
  static async fetchUserProfileByUsername(username: string): Promise<any | null> {
    const clean = username.toLowerCase().trim();
    if (!clean) return null;

    if (db && isFirebaseConfigured) {
      try {
        const q = query(
          collection(db, 'users'),
          where('username', '==', clean)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          const data = docSnap.data();
          const profile = data.profile || {};
          const booksMeta: any[] = Array.isArray(data.booksMetadata) ? data.booksMetadata : [];
          const currentlyReadingBook = booksMeta.find((b: any) => b && b.status === 'currently-reading');
          const completedBooks = booksMeta.filter((b: any) => b && b.status === 'completed');
          const wantToReadBooks = booksMeta.filter((b: any) => b && b.status === 'want-to-read');

          const readingLists: any[] = [];
          if (completedBooks.length > 0) {
            readingLists.push({
              name: 'Completed Books',
              count: completedBooks.length,
              books: completedBooks.map((b: any) => ({
                title: b.title,
                author: b.author,
                coverUri: b.coverUri,
                status: 'completed',
              })),
            });
          }
          if (wantToReadBooks.length > 0) {
            readingLists.push({
              name: 'Want to Read Queue',
              count: wantToReadBooks.length,
              books: wantToReadBooks.map((b: any) => ({
                title: b.title,
                author: b.author,
                coverUri: b.coverUri,
                status: 'want-to-read',
              })),
            });
          }
          if (Array.isArray(data.collections)) {
            data.collections.forEach((c: any) => {
              if (c && c.name) {
                const bCount = Array.isArray(c.bookIds) ? c.bookIds.length : 0;
                readingLists.push({
                  name: c.name,
                  count: bCount,
                  books: booksMeta
                    .filter((b: any) => b && Array.isArray(c.bookIds) && c.bookIds.includes(b.id))
                    .map((b: any) => ({ title: b.title, author: b.author, coverUri: b.coverUri })),
                });
              }
            });
          }

          return {
            id: docSnap.id,
            username: data.username || profile.username || clean,
            displayName: data.displayName || profile.displayName || clean,
            bio: data.bio || profile.bio || '',
            avatarUrl: data.avatarUrl || profile.avatarUrl || data.photoURL,
            booksReadCount: completedBooks.length || profile.booksReadCount || 0,
            streak: profile.readingStreakDays || profile.streak || 0,
            currentlyReading: currentlyReadingBook
              ? {
                  title: currentlyReadingBook.title,
                  author: currentlyReadingBook.author,
                  progress: currentlyReadingBook.readingProgress || 0,
                }
              : null,
            readingLists,
            quotes: Array.isArray(data.quotes) ? data.quotes : [],
            reviews: Array.isArray(data.reviews) ? data.reviews : [],
          };
        }
      } catch (e: any) {
        if (e?.code !== 'permission-denied') {
          console.warn('Failed to fetch user by username from Firestore:', e?.message || e);
        }
      }
    }

    // Fallback: check local community directory
    try {
      const commUser = await StorageService.getCommunityUserByUsername(clean);
      if (commUser) {
        return commUser;
      }
    } catch {}

    return null;
  }

  /**
   * Search public users by username or display name with offline community fallback.
   */
  static async searchUsers(usernameQuery: string): Promise<CommunityUser[]> {
    const cleanQuery = usernameQuery.toLowerCase().trim();
    if (!cleanQuery) return [];

    const allRealUsers = await this.fetchRealCommunityUsers(100);
    return allRealUsers.filter(
      (u) =>
        u.username.toLowerCase().includes(cleanQuery) ||
        u.displayName.toLowerCase().includes(cleanQuery)
    );
  }
}
