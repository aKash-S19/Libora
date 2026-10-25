import { db, isFirebaseConfigured, auth } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';
import { StorageService, DEFAULT_USER_PROFILE } from '../storage';
import { Book } from '../types';
import { removeUndefined } from '../utils/firestore';

export { removeUndefined };

export class SyncService {
  private static isSyncing = false;

  /**
   * Upload all local metadata, reviews, quotes, and reading progress to Cloud Firestore.
   */
  static async syncAll(): Promise<{ success: boolean; message?: string }> {
    if (!isFirebaseConfigured || !auth || !auth.currentUser || !db) {
      return { success: true, message: 'Local mode active' };
    }

    if (this.isSyncing) return { success: true, message: 'Sync already in progress' };
    this.isSyncing = true;

    try {
      const uid = auth.currentUser.uid;
      const userDocRef = doc(db, 'users', uid);

      const localBooks = await StorageService.getBooks();
      const localHighlights = await StorageService.getHighlights();
      const localNotes = await StorageService.getNotes();
      const localQuotes = await StorageService.getQuotes();
      const localReviews = await StorageService.getReviews();
      const localCollections = await StorageService.getCollections();
      const localProfile = await StorageService.getUserProfile();

      // We only sync metadata of books, not the heavy physical file binaries
      const booksMetadata = localBooks.map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        coverUri: b.coverUri || null,
        fileUri: b.fileUri || '',
        fileSize: b.fileSize || 0,
        addedAt: b.addedAt || Date.now(),
        currentPage: b.currentPage || 1,
        pageCount: b.pageCount || 100,
        readingProgress: b.readingProgress || 0,
        status: b.status || 'currently-reading',
        collections: b.collections || [],
        lastReadAt: b.lastReadAt || 0,
        format: b.format || 'epub',
      }));

      // Cloud document payload for the user
      const cleanUsername = (localProfile.username || '').toLowerCase().trim();
      const syncPayload = {
        username: cleanUsername,
        displayName: localProfile.displayName || localProfile.username || 'Reader',
        bio: localProfile.bio || '',
        avatarUrl: localProfile.avatarUrl || null,
        profile: {
          ...localProfile,
          id: uid,
          updatedAt: Date.now(),
        },
        booksMetadata,
        highlights: localHighlights,
        notes: localNotes,
        quotes: localQuotes,
        reviews: localReviews,
        collections: localCollections,
        lastSyncTimestamp: Date.now(),
      };

      // Strip any undefined keys so Firestore never errors on invalid undefined values
      const cleanPayload = removeUndefined(syncPayload);

      await setDoc(userDocRef, cleanPayload, { merge: true });

      // Also publish public reviews to top-level reviews collection for the community feed
      for (const rev of localReviews) {
        if (rev.isPublic) {
          try {
            await setDoc(
              doc(db, 'reviews', rev.id),
              removeUndefined({
                ...rev,
                userId: uid,
                updatedAt: Date.now(),
              }),
              { merge: true }
            );
          } catch {}
        }
      }

      return { success: true, message: 'Cloud sync complete' };
    } catch (e: any) {
      console.warn('SyncService upload error:', e);
      return { success: false, message: e.message || 'Sync failed' };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Restore cloud data when user logs in or reinstalls the app.
   * If the user is new (no cloud doc), clears previous local user cache so they start fresh!
   * On reinstall, local book files do not exist so local books are not restored to the shelf,
   * but all reviews, ratings, reading journal, quotes, notes, highlights, and profile are fully restored.
   */
  static async restoreUserData(uid: string): Promise<{ isNewUser: boolean }> {
    if (!isFirebaseConfigured || !db) {
      return { isNewUser: false };
    }

    try {
      const userDocRef = doc(db, 'users', uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const cloudData = docSnap.data();

        // 1. Clear old local state first to prevent bleed from previous device users
        await StorageService.clearUserData();

        // 2. Restore User Profile
        if (cloudData.profile) {
          await StorageService.saveUserProfile({
            ...DEFAULT_USER_PROFILE,
            ...cloudData.profile,
            id: uid,
          });
        }

        // 3. Restore Reviews (vital for reading diary and community logs!)
        if (Array.isArray(cloudData.reviews)) {
          await StorageService.saveReviews(cloudData.reviews);
        }

        // 4. Restore Highlights, Notes, Quotes
        if (Array.isArray(cloudData.highlights)) {
          await StorageService.saveHighlights(cloudData.highlights);
        }
        if (Array.isArray(cloudData.notes)) {
          await StorageService.saveNotes(cloudData.notes);
        }
        if (Array.isArray(cloudData.quotes)) {
          await StorageService.saveQuotes(cloudData.quotes);
        }

        // 5. Restore Collections
        if (Array.isArray(cloudData.collections)) {
          await StorageService.saveCollections(cloudData.collections);
        }

        // 6. Restore Book records: ONLY if the physical file exists on this device.
        // On app reinstall, local device files are wiped, so local books that depend on them
        // are omitted from the library shelf, leaving all reviews and user diary intact.
        if (Array.isArray(cloudData.booksMetadata)) {
          const restoredBooks: Book[] = [];

          for (const bMeta of cloudData.booksMetadata) {
            let validFileUri = '';

            // Check if physical file exists on this device
            if (bMeta.fileUri) {
              try {
                const info = await FileSystem.getInfoAsync(bMeta.fileUri);
                if (info.exists) {
                  validFileUri = bMeta.fileUri;
                }
              } catch {}
            }

            if (validFileUri || (bMeta.fileUri && bMeta.fileUri.startsWith('builtin_'))) {
              restoredBooks.push({
                id: bMeta.id,
                title: bMeta.title,
                author: bMeta.author,
                coverUri: bMeta.coverUri,
                currentPage: bMeta.currentPage || 1,
                pageCount: bMeta.pageCount || 100,
                fileSize: bMeta.fileSize || 0,
                addedAt: bMeta.addedAt || Date.now(),
                readingProgress: bMeta.readingProgress || 0,
                status: bMeta.status || 'currently-reading',
                collections: bMeta.collections || [],
                lastReadAt: bMeta.lastReadAt || 0,
                fileUri: validFileUri || bMeta.fileUri,
                format: bMeta.format || 'epub',
              });
            }
          }

          await StorageService.saveBooks(restoredBooks);
        }

        return { isNewUser: false };
      } else {
        // Brand new user without prior cloud data -> start completely FRESH!
        await StorageService.clearUserData();
        return { isNewUser: true };
      }
    } catch (e) {
      console.warn('SyncService restore error:', e);
      return { isNewUser: false };
    }
  }
}
