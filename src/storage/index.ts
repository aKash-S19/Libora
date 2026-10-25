import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import {
  Book,
  Highlight,
  Note,
  Quote,
  Bookmark,
  Collection,
  Review,
  UserProfile,
  ActivityItem,
  ReaderSettings,
  DownloadItem,
  CommunityUser,
} from '../types';

const STORAGE_KEYS = {
  BOOKS: '@libora_books',
  HIGHLIGHTS: '@libora_highlights',
  NOTES: '@libora_notes',
  QUOTES: '@libora_quotes',
  BOOKMARKS: '@libora_bookmarks',
  COLLECTIONS: '@libora_collections',
  REVIEWS: '@libora_reviews',
  USER_PROFILE: '@libora_user_profile',
  ACTIVITIES: '@libora_activities',
  READER_SETTINGS: '@libora_reader_settings',
  DOWNLOADS: '@libora_downloads',
  AUTH_CACHE: '@libora_auth_cache',
  FIRST_LAUNCH: '@libora_first_launch_done',
  ONBOARDING_COMPLETED: '@libora_onboarding_completed',
  SETUP_COMPLETED_PREFIX: '@libora_setup_completed_',
  SETUP_PREFS_PREFIX: '@libora_setup_prefs_',
  FOLLOWING: '@libora_following',
  FRIENDS: '@libora_friends',
  COMMUNITY_USERS: '@libora_community_users',
};

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  theme: 'sepia',
  fontSize: 18,
  lineHeight: 1.6,
  fontFamily: 'serif',
  margin: 16,
  continuousScroll: false,
  textAlign: 'left',
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: 'guest_reader',
  username: 'reader',
  displayName: 'Reader',
  bio: 'A passionate reader building my personal knowledge archive on Libora.',
  booksReadCount: 0,
  currentlyReadingCount: 0,
  wantToReadCount: 0,
  favoritesCount: 0,
  readingStreakDays: 1,
  averageRating: 0,
  isPrivate: false,
  favoriteBookIds: [],
  createdAt: Date.now(),
};

export const DEFAULT_COMMUNITY_USERS: CommunityUser[] = [];

export class StorageService {
  private static booksDir = `${FileSystem.documentDirectory || ''}books/`;
  private static coversDir = `${FileSystem.documentDirectory || ''}covers/`;

  static async initDirectories(): Promise<void> {
    try {
      if (FileSystem.documentDirectory) {
        const booksInfo = await FileSystem.getInfoAsync(this.booksDir);
        if (!booksInfo.exists) {
          await FileSystem.makeDirectoryAsync(this.booksDir, { intermediates: true });
        }
        const coversInfo = await FileSystem.getInfoAsync(this.coversDir);
        if (!coversInfo.exists) {
          await FileSystem.makeDirectoryAsync(this.coversDir, { intermediates: true });
        }
      }
    } catch (e) {
      console.warn('StorageService.initDirectories warning:', e);
    }
  }

  static getBooksDirectory(): string {
    return this.booksDir;
  }

  static getCoversDirectory(): string {
    return this.coversDir;
  }

  // --- BOOKS ---
  static async getBooks(): Promise<Book[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.BOOKS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async saveBooks(books: Book[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
  }

  static async getBookById(id: string): Promise<Book | null> {
    const books = await this.getBooks();
    return books.find((b) => b.id === id) || null;
  }

  static async saveBook(book: Book): Promise<void> {
    const books = await this.getBooks();
    const index = books.findIndex((b) => b.id === book.id);
    if (index >= 0) {
      books[index] = book;
    } else {
      books.unshift(book);
    }
    await this.saveBooks(books);
  }

  static async updateReadingProgress(
    bookId: string,
    currentPage: number,
    pageCount: number
  ): Promise<Book | null> {
    const books = await this.getBooks();
    const index = books.findIndex((b) => b.id === bookId);
    if (index < 0) return null;

    const book = books[index];
    const progress = pageCount > 0 ? Math.min(1, Math.max(0, currentPage / pageCount)) : 0;
    const isFinished = progress >= 0.99;

    const updated: Book = {
      ...book,
      currentPage,
      pageCount: Math.max(book.pageCount, pageCount),
      readingProgress: progress,
      status: isFinished ? 'completed' : 'currently-reading',
      lastReadAt: Date.now(),
    };

    books[index] = updated;
    await this.saveBooks(books);

    if (isFinished && book.status !== 'completed') {
      await this.logActivity({
        id: `act_${Date.now()}`,
        type: 'finish_book',
        title: `Finished reading "${book.title}"`,
        subtitle: `By ${book.author}`,
        timestamp: Date.now(),
        bookId: book.id,
      });

      // Update user stats
      const profile = await this.getUserProfile();
      profile.booksReadCount += 1;
      if (profile.currentlyReadingCount > 0) profile.currentlyReadingCount -= 1;
      await this.saveUserProfile(profile);
    }

    return updated;
  }

  static async markBookOpened(bookId: string): Promise<Book | null> {
    const books = await this.getBooks();
    const index = books.findIndex((b) => b.id === bookId);
    if (index < 0) return null;

    const book = books[index];
    const updated: Book = {
      ...book,
      status: book.status === 'want-to-read' ? 'currently-reading' : book.status,
      lastReadAt: Date.now(),
    };

    books[index] = updated;
    await this.saveBooks(books);
    return updated;
  }

  static async deleteBook(id: string): Promise<void> {
    const books = await this.getBooks();
    const book = books.find((b) => b.id === id);
    if (
      book &&
      book.fileUri &&
      !book.fileUri.startsWith('http') &&
      !book.fileUri.startsWith('builtin_') &&
      !book.fileUri.startsWith('content://')
    ) {
      try {
        await FileSystem.deleteAsync(book.fileUri, { idempotent: true });
      } catch (e) {
        console.warn('Failed to delete book local file:', e);
      }
    }
    if (
      book &&
      book.coverUri &&
      !book.coverUri.startsWith('http') &&
      !book.coverUri.startsWith('builtin_') &&
      !book.coverUri.startsWith('content://')
    ) {
      try {
        await FileSystem.deleteAsync(book.coverUri, { idempotent: true });
      } catch (e) {
        console.warn('Failed to delete cover local file:', e);
      }
    }
    const filtered = books.filter((b) => b.id !== id);
    await this.saveBooks(filtered);

    // Also cascade remove highlights, notes, quotes, bookmarks
    const highlights = (await this.getHighlights()).filter((h) => h.bookId !== id);
    await this.saveHighlights(highlights);

    const notes = (await this.getNotes()).filter((n) => n.bookId !== id);
    await this.saveNotes(notes);

    const quotes = (await this.getQuotes()).filter((q) => q.bookId !== id);
    await this.saveQuotes(quotes);

    const bookmarks = (await this.getBookmarks()).filter((bm) => bm.bookId !== id);
    await this.saveBookmarks(bookmarks);

    // Also remove any cached reading content for this book
    try {
      await AsyncStorage.multiRemove([
        `@libora_book_content_${id}`,
        `@libora_book_epub_${id}`,
        `@libora_book_pdf_${id}`,
      ]);
    } catch {}
  }

  // --- HIGHLIGHTS ---
  static async getHighlights(): Promise<Highlight[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.HIGHLIGHTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async saveHighlights(highlights: Highlight[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(highlights));
  }

  static async addHighlight(highlight: Highlight): Promise<void> {
    const highlights = await this.getHighlights();
    highlights.unshift(highlight);
    await this.saveHighlights(highlights);

    await this.logActivity({
      id: `act_${Date.now()}`,
      type: 'add_highlight',
      title: `Saved a highlight from "${highlight.bookTitle}"`,
      subtitle: `"${highlight.text.slice(0, 60)}..."`,
      timestamp: Date.now(),
      bookId: highlight.bookId,
    });
  }

  static async deleteHighlight(id: string): Promise<void> {
    const list = await this.getHighlights();
    await this.saveHighlights(list.filter((h) => h.id !== id));
  }

  // --- NOTES ---
  static async getNotes(): Promise<Note[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.NOTES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async saveNotes(notes: Note[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  }

  static async addNote(note: Note): Promise<void> {
    const list = await this.getNotes();
    const index = list.findIndex((n) => n.id === note.id);
    if (index >= 0) {
      list[index] = note;
    } else {
      list.unshift(note);
    }
    await this.saveNotes(list);
  }

  static async deleteNote(id: string): Promise<void> {
    const list = await this.getNotes();
    await this.saveNotes(list.filter((n) => n.id !== id));
  }

  // --- QUOTES ---
  static async getQuotes(): Promise<Quote[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.QUOTES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async saveQuotes(quotes: Quote[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes));
  }

  static async addQuote(quote: Quote): Promise<void> {
    const list = await this.getQuotes();
    const index = list.findIndex((q) => q.id === quote.id);
    if (index >= 0) {
      list[index] = quote;
    } else {
      list.unshift(quote);
    }
    await this.saveQuotes(list);

    await this.logActivity({
      id: `act_${Date.now()}`,
      type: 'save_quote',
      title: `Saved quote from "${quote.bookTitle}"`,
      subtitle: `"${quote.text.slice(0, 60)}..."`,
      timestamp: Date.now(),
      bookId: quote.bookId,
    });
  }

  static async deleteQuote(id: string): Promise<void> {
    const list = await this.getQuotes();
    await this.saveQuotes(list.filter((q) => q.id !== id));
  }

  static async toggleQuoteFavorite(id: string): Promise<void> {
    const list = await this.getQuotes();
    const item = list.find((q) => q.id === id);
    if (item) {
      item.isFavorite = !item.isFavorite;
      await this.saveQuotes(list);
    }
  }

  // --- BOOKMARKS ---
  static async getBookmarks(): Promise<Bookmark[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
  }

  static async addBookmark(bookmark: Bookmark): Promise<void> {
    const list = await this.getBookmarks();
    list.unshift(bookmark);
    await this.saveBookmarks(list);
  }

  static async deleteBookmark(id: string): Promise<void> {
    const list = await this.getBookmarks();
    await this.saveBookmarks(list.filter((b) => b.id !== id));
  }

  // --- COLLECTIONS ---
  static async getCollections(): Promise<Collection[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.COLLECTIONS);
      if (data) return JSON.parse(data);
      // Default collections
      const defaults: Collection[] = [
        { id: 'col_philosophy', name: 'Philosophy', description: 'Core philosophical ideas', bookIds: [], createdAt: Date.now() },
        { id: 'col_classics', name: 'Classics', description: 'Timeless literary masterpieces', bookIds: [], createdAt: Date.now() },
        { id: 'col_to_read', name: 'To Read 2026', description: 'Selected reading queue', bookIds: [], createdAt: Date.now() },
      ];
      await this.saveCollections(defaults);
      return defaults;
    } catch {
      return [];
    }
  }

  static async saveCollections(collections: Collection[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
  }

  static async createCollection(name: string, description?: string): Promise<Collection> {
    const list = await this.getCollections();
    const newCol: Collection = {
      id: `col_${Date.now()}`,
      name,
      description,
      bookIds: [],
      createdAt: Date.now(),
    };
    list.push(newCol);
    await this.saveCollections(list);
    return newCol;
  }

  static async toggleBookInCollection(collectionId: string, bookId: string): Promise<boolean> {
    const collections = await this.getCollections();
    const col = collections.find((c) => c.id === collectionId);
    if (!col) return false;

    const exists = col.bookIds.includes(bookId);
    if (exists) {
      col.bookIds = col.bookIds.filter((id) => id !== bookId);
    } else {
      col.bookIds.push(bookId);
    }
    await this.saveCollections(collections);

    // Update book.collections field
    const books = await this.getBooks();
    const book = books.find((b) => b.id === bookId);
    if (book) {
      if (exists) {
        book.collections = book.collections.filter((cid) => cid !== collectionId);
      } else {
        if (!book.collections.includes(collectionId)) {
          book.collections.push(collectionId);
        }
      }
      await this.saveBooks(books);
    }

    return !exists;
  }

  // --- REVIEWS ---
  static async getReviews(): Promise<Review[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.REVIEWS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async saveReviews(reviews: Review[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
  }

  static async addReview(review: Review): Promise<void> {
    const list = await this.getReviews();
    const index = list.findIndex((r) => r.id === review.id || (r.bookId === review.bookId && r.userId === review.userId));
    if (index >= 0) {
      list[index] = review;
    } else {
      list.unshift(review);
    }
    await this.saveReviews(list);

    await this.logActivity({
      id: `act_${Date.now()}`,
      type: 'write_review',
      title: `Reviewed "${review.bookTitle}" (${review.rating}★)`,
      subtitle: review.reviewText ? `"${review.reviewText.slice(0, 60)}..."` : `Rated ${review.rating} stars`,
      timestamp: Date.now(),
      bookId: review.bookId,
      rating: review.rating,
    });
  }

  static async deleteReview(id: string): Promise<void> {
    const list = await this.getReviews();
    await this.saveReviews(list.filter((r) => r.id !== id));
  }

  static async toggleReviewLike(id: string): Promise<boolean> {
    const list = await this.getReviews();
    const rev = list.find((r) => r.id === id);
    if (!rev) return false;
    const currentLikes = rev.likesCount || 0;
    const isLiked = rev.liked;
    rev.liked = !isLiked;
    rev.likesCount = isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
    await this.saveReviews(list);
    return !!rev.liked;
  }

  // --- USER PROFILE ---
  static async getUserProfile(): Promise<UserProfile> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return data ? JSON.parse(data) : DEFAULT_USER_PROFILE;
    } catch {
      return DEFAULT_USER_PROFILE;
    }
  }

  static async saveUserProfile(profile: UserProfile): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  }

  // --- ACTIVITIES ---
  static async getActivities(): Promise<ActivityItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async logActivity(activity: ActivityItem): Promise<void> {
    try {
      const list = await this.getActivities();
      list.unshift(activity);
      // Keep most recent 50
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(list.slice(0, 50)));
    } catch (e) {
      console.warn('Failed to log activity:', e);
    }
  }

  // --- READER SETTINGS ---
  static async getReaderSettings(): Promise<ReaderSettings> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.READER_SETTINGS);
      return data ? JSON.parse(data) : DEFAULT_READER_SETTINGS;
    } catch {
      return DEFAULT_READER_SETTINGS;
    }
  }

  static async saveReaderSettings(settings: ReaderSettings): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.READER_SETTINGS, JSON.stringify(settings));
  }

  // --- DOWNLOADS ---
  static async getDownloads(): Promise<DownloadItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.DOWNLOADS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async saveDownloads(downloads: DownloadItem[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADS, JSON.stringify(downloads));
  }

  // --- ONBOARDING / FIRST LAUNCH ---
  static async isOnboardingCompleted(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      return val === 'true';
    } catch {
      return false;
    }
  }

  static async setOnboardingCompleted(completed: boolean): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, completed ? 'true' : 'false');
  }

  static async isSetupCompleted(userId?: string): Promise<boolean> {
    if (!userId) return false;
    try {
      const val = await AsyncStorage.getItem(`${STORAGE_KEYS.SETUP_COMPLETED_PREFIX}${userId}`);
      return val === 'true';
    } catch {
      return false;
    }
  }

  static async setSetupCompleted(userId: string, completed: boolean): Promise<void> {
    await AsyncStorage.setItem(`${STORAGE_KEYS.SETUP_COMPLETED_PREFIX}${userId}`, completed ? 'true' : 'false');
  }

  static async saveUserPreferences(
    userId: string,
    prefs: { readingInterests?: string[]; dailyGoalMinutes?: number }
  ): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.SETUP_PREFS_PREFIX}${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save user preferences:', e);
    }
  }

  static async getUserPreferences(
    userId: string
  ): Promise<{ readingInterests?: string[]; dailyGoalMinutes?: number } | null> {
    try {
      const key = `${STORAGE_KEYS.SETUP_PREFS_PREFIX}${userId}`;
      const raw = await AsyncStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  static async isFirstLaunchDone(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_LAUNCH);
      return val === 'true';
    } catch {
      return false;
    }
  }

  static async markFirstLaunchDone(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.FIRST_LAUNCH, 'true');
  }

  // --- USER DATA RESET (FOR NEW USER LOGIN / ACCOUNT SWITCH) ---
  static async clearUserData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.BOOKS,
        STORAGE_KEYS.HIGHLIGHTS,
        STORAGE_KEYS.NOTES,
        STORAGE_KEYS.QUOTES,
        STORAGE_KEYS.BOOKMARKS,
        STORAGE_KEYS.COLLECTIONS,
        STORAGE_KEYS.REVIEWS,
        STORAGE_KEYS.ACTIVITIES,
        STORAGE_KEYS.DOWNLOADS,
      ]);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(DEFAULT_USER_PROFILE));
    } catch (e) {
      console.warn('Failed to clear user data:', e);
    }
  }

  // --- FOLLOWING & SOCIAL GRAPH (OFFLINE-FIRST) ---
  static async getFollowing(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FOLLOWING);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async saveFollowing(list: string[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.FOLLOWING, JSON.stringify(list));
  }

  static async isFollowing(username: string): Promise<boolean> {
    const clean = username.toLowerCase().trim();
    const list = await this.getFollowing();
    return list.map((u) => u.toLowerCase().trim()).includes(clean);
  }

  static async toggleFollow(username: string): Promise<boolean> {
    const clean = username.toLowerCase().trim();
    const list = await this.getFollowing();
    const exists = list.map((u) => u.toLowerCase().trim()).includes(clean);
    let updated: string[];
    if (exists) {
      updated = list.filter((u) => u.toLowerCase().trim() !== clean);
    } else {
      updated = [...list, clean];
    }
    await this.saveFollowing(updated);
    return !exists;
  }

  // --- FRIENDS SYSTEM (OFFLINE-FIRST) ---
  static async getFriends(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FRIENDS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async saveFriends(list: string[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(list));
  }

  static async isFriend(username: string): Promise<boolean> {
    const clean = username.toLowerCase().trim();
    const list = await this.getFriends();
    return list.map((u) => u.toLowerCase().trim()).includes(clean);
  }

  static async toggleFriend(username: string): Promise<boolean> {
    const clean = username.toLowerCase().trim();
    const list = await this.getFriends();
    const exists = list.map((u) => u.toLowerCase().trim()).includes(clean);
    let updated: string[];
    if (exists) {
      updated = list.filter((u) => u.toLowerCase().trim() !== clean);
    } else {
      updated = [...list, clean];
      // If adding as friend, automatically also ensure followed
      const following = await this.getFollowing();
      if (!following.map((u) => u.toLowerCase().trim()).includes(clean)) {
        await this.saveFollowing([...following, clean]);
      }
    }
    await this.saveFriends(updated);
    return !exists;
  }

  // --- COMMUNITY DIRECTORY (OFFLINE-FIRST) ---
  static async getCommunityUsers(): Promise<CommunityUser[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_USERS);
      if (data) {
        const stored: CommunityUser[] = JSON.parse(data);
        if (Array.isArray(stored)) return stored;
      }
      return [];
    } catch {
      return [];
    }
  }

  static async getCommunityUserByUsername(username: string): Promise<CommunityUser | null> {
    const clean = username.toLowerCase().trim();
    const users = await this.getCommunityUsers();
    const found = users.find((u) => u.username.toLowerCase().trim() === clean);
    return found || null;
  }

  static async saveCommunityUser(user: CommunityUser): Promise<void> {
    const users = await this.getCommunityUsers();
    const index = users.findIndex((u) => u.username.toLowerCase() === user.username.toLowerCase());
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_USERS, JSON.stringify(users));
  }
}
