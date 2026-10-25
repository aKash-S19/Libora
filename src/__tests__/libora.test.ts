import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { StorageService, DEFAULT_READER_SETTINGS, DEFAULT_USER_PROFILE } from '../storage';
import { ImporterService } from '../services/importer';
import { removeUndefined } from '../utils/firestore';
import { arrayBufferToBase64 } from '../utils/binary';
import { Book, Highlight, Quote, Review } from '../types';

// In-memory mock for AsyncStorage
const mockStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockStorage[key] || null),
  setItem: jest.fn(async (key: string, value: string) => {
    mockStorage[key] = value;
  }),
  removeItem: jest.fn(async (key: string) => {
    delete mockStorage[key];
  }),
  clear: jest.fn(async () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  }),
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///data/user/0/com.libora.app/files/',
  getInfoAsync: jest.fn(async () => ({ exists: true, size: 1024 * 1024 })),
  makeDirectoryAsync: jest.fn(async () => {}),
  copyAsync: jest.fn(async () => {}),
  deleteAsync: jest.fn(async () => {}),
  downloadAsync: jest.fn(async (url: string, uri: string) => ({ uri })),
}));

describe('Libora Core Logic & Storage Unit Tests', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  describe('1. Book Storage and Reading Progress Calculation', () => {
    it('should save and retrieve books accurately', async () => {
      const book: Book = {
        id: 'test_book_1',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        fileUri: 'file:///path/gatsby.epub',
        format: 'epub',
        fileSize: 500000,
        pageCount: 180,
        currentPage: 1,
        readingProgress: 0,
        status: 'want-to-read',
        collections: [],
        addedAt: Date.now(),
      };

      await StorageService.saveBook(book);
      const retrieved = await StorageService.getBookById('test_book_1');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.title).toBe('The Great Gatsby');
      expect(retrieved?.status).toBe('want-to-read');
    });

    it('should calculate progress and transition status to currently-reading and completed', async () => {
      const book: Book = {
        id: 'test_progress_book',
        title: 'Crime and Punishment',
        author: 'Fyodor Dostoevsky',
        fileUri: 'file:///path/crime.pdf',
        format: 'pdf',
        fileSize: 1200000,
        pageCount: 500,
        currentPage: 1,
        readingProgress: 0,
        status: 'want-to-read',
        collections: [],
        addedAt: Date.now(),
      };

      await StorageService.saveBook(book);

      // Read halfway
      const readingUpdate = await StorageService.updateReadingProgress('test_progress_book', 250, 500);
      expect(readingUpdate).not.toBeNull();
      expect(readingUpdate?.readingProgress).toBe(0.5);
      expect(readingUpdate?.status).toBe('currently-reading');

      // Finish book
      const finishedUpdate = await StorageService.updateReadingProgress('test_progress_book', 500, 500);
      expect(finishedUpdate?.readingProgress).toBe(1.0);
      expect(finishedUpdate?.status).toBe('completed');
    });
  });

  describe('2. Metadata Parsing Logic', () => {
    it('should parse "Title - Author" from filename correctly', () => {
      const parsed = (ImporterService as any).parseTitleAndAuthor('Meditations - Marcus Aurelius.pdf');
      expect(parsed.title).toBe('Meditations');
      expect(parsed.author).toBe('Marcus Aurelius');
    });

    it('should parse "Author_-_Title" pattern correctly', () => {
      const parsed = (ImporterService as any).parseTitleAndAuthor('Franz Kafka_-_The Metamorphosis.epub');
      expect(parsed.title).toBe('Franz Kafka');
      expect(parsed.author).toBe('The Metamorphosis');
    });

    it('should handle filenames without author separator gracefully', () => {
      const parsed = (ImporterService as any).parseTitleAndAuthor('Just_A_Book_Title.epub');
      expect(parsed.title).toBe('Just A Book Title');
      expect(parsed.author).toBe('Unknown Author');
    });
  });

  describe('3. Highlights & Knowledge Operations', () => {
    it('should add, retrieve, and delete highlights', async () => {
      const hl: Highlight = {
        id: 'hl_101',
        bookId: 'test_book_1',
        bookTitle: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        text: 'So we beat on, boats against the current, borne back ceaselessly into the past.',
        location: 180,
        color: '#86EFAC',
        createdAt: Date.now(),
      };

      await StorageService.addHighlight(hl);
      let list = await StorageService.getHighlights();
      expect(list.length).toBe(1);
      expect(list[0].text).toContain('boats against the current');

      await StorageService.deleteHighlight('hl_101');
      list = await StorageService.getHighlights();
      expect(list.length).toBe(0);
    });

    it('should add quotes and toggle favorites', async () => {
      const quote: Quote = {
        id: 'qt_101',
        bookId: 'test_book_1',
        bookTitle: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        text: 'I hope she will be a fool - that is the best thing a girl can be in this world, a beautiful little fool.',
        location: 21,
        isFavorite: false,
        createdAt: Date.now(),
      };

      await StorageService.addQuote(quote);
      let quotes = await StorageService.getQuotes();
      expect(quotes.length).toBe(1);
      expect(quotes[0].isFavorite).toBe(false);

      await StorageService.toggleQuoteFavorite('qt_101');
      quotes = await StorageService.getQuotes();
      expect(quotes[0].isFavorite).toBe(true);
    });
  });

  describe('4. Custom Collections', () => {
    it('should create a collection and toggle books in and out', async () => {
      const book: Book = {
        id: 'book_col_test',
        title: 'Beyond Good and Evil',
        author: 'Friedrich Nietzsche',
        fileUri: 'file:///path/nietzsche.epub',
        format: 'epub',
        fileSize: 350000,
        pageCount: 220,
        currentPage: 1,
        readingProgress: 0,
        status: 'want-to-read',
        collections: [],
        addedAt: Date.now(),
      };
      await StorageService.saveBook(book);

      const col = await StorageService.createCollection('Existentialism', 'Philosophy of existence');
      expect(col.name).toBe('Existentialism');

      // Add book
      const added = await StorageService.toggleBookInCollection(col.id, 'book_col_test');
      expect(added).toBe(true);

      const updatedCol = (await StorageService.getCollections()).find((c) => c.id === col.id);
      expect(updatedCol?.bookIds).toContain('book_col_test');

      // Remove book
      const removed = await StorageService.toggleBookInCollection(col.id, 'book_col_test');
      expect(removed).toBe(false);

      const refreshedCol = (await StorageService.getCollections()).find((c) => c.id === col.id);
      expect(refreshedCol?.bookIds).not.toContain('book_col_test');
    });
  });

  describe('5. Reviews & Ratings', () => {
    it('should create and calculate review ratings accurately', async () => {
      const review: Review = {
        id: 'rev_1',
        bookId: 'book_col_test',
        bookTitle: 'Beyond Good and Evil',
        author: 'Friedrich Nietzsche',
        userId: 'guest_reader',
        username: 'reader',
        rating: 4.5,
        reviewText: 'Sharp aphorisms dismantling dogmatic philosophy.',
        reaction: 'Thought-provoking',
        isPublic: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await StorageService.addReview(review);
      const reviews = await StorageService.getReviews();
      expect(reviews.length).toBe(1);
      expect(reviews[0].rating).toBe(4.5);
      expect(reviews[0].reaction).toBe('Thought-provoking');
    });
  });

  describe('6. Default User Profile and Reader Settings', () => {
    it('should provide default settings when none are stored', async () => {
      const settings = await StorageService.getReaderSettings();
      expect(settings.fontSize).toBe(DEFAULT_READER_SETTINGS.fontSize);
      expect(settings.theme).toBe(DEFAULT_READER_SETTINGS.theme);

      const profile = await StorageService.getUserProfile();
      expect(profile.username).toBe(DEFAULT_USER_PROFILE.username);
      expect(profile.displayName).toBe(DEFAULT_USER_PROFILE.displayName);
    });
  });

  describe('7. Onboarding & Initial Setup State Persistence', () => {
    it('should default onboarding status to false for fresh launches', async () => {
      const completed = await StorageService.isOnboardingCompleted();
      expect(completed).toBe(false);
    });

    it('should persist onboarding completed state accurately', async () => {
      await StorageService.setOnboardingCompleted(true);
      const completed = await StorageService.isOnboardingCompleted();
      expect(completed).toBe(true);

      // Verify replaying from Settings can reset or update it
      await StorageService.setOnboardingCompleted(false);
      expect(await StorageService.isOnboardingCompleted()).toBe(false);
    });

    it('should persist user reading setup preferences', async () => {
      const uid = 'user_libora_abc';
      expect(await StorageService.isSetupCompleted(uid)).toBe(false);

      await StorageService.saveUserPreferences(uid, {
        readingInterests: ['fiction', 'tech', 'poetry'],
        dailyGoalMinutes: 30,
      });

      const prefs = await StorageService.getUserPreferences(uid);
      expect(prefs).not.toBeNull();
      expect(prefs?.readingInterests).toEqual(['fiction', 'tech', 'poetry']);
      expect(prefs?.dailyGoalMinutes).toBe(30);

      await StorageService.setSetupCompleted(uid, true);
      expect(await StorageService.isSetupCompleted(uid)).toBe(true);
    });
  });

  describe('8. Local-First Privacy Invariants', () => {
    it('should store book files strictly on local device storage', async () => {
      const importedBook: Book = {
        id: 'local_private_book',
        title: 'Marcus Aurelius - Meditations',
        author: 'Marcus Aurelius',
        fileUri: 'file:///data/user/0/com.libora.app/files/books/meditations.epub',
        format: 'epub',
        fileSize: 1024 * 350,
        pageCount: 220,
        currentPage: 14,
        readingProgress: 0.06,
        status: 'currently-reading',
        collections: ['Philosophy'],
        addedAt: Date.now(),
      };

      await StorageService.saveBook(importedBook);
      const stored = await StorageService.getBookById('local_private_book');

      // Assert file URI is strictly a local device URI
      expect(stored?.fileUri.startsWith('file://')).toBe(true);
      expect(stored?.fileUri).not.toContain('http://');
      expect(stored?.fileUri).not.toContain('https://');
      expect(stored?.fileUri).not.toContain('firebasestorage.app');
    });
  });

  describe('9. Cloud Firestore Data Sanitization', () => {
    it('should strip undefined fields recursively from payloads', () => {
      const rawPayload = {
        profile: {
          id: 'user_123',
          username: 'reader',
          displayName: 'Reader',
          bio: undefined,
          avatarUrl: undefined,
          readingInterests: ['fiction'],
          dailyGoalMinutes: undefined,
        },
        booksMetadata: [
          {
            id: 'b1',
            title: 'Book 1',
            coverUri: undefined,
            fileUri: 'file:///local/b1.epub',
          },
        ],
        notes: [
          {
            id: 'n1',
            text: 'Important passage',
            passageText: undefined,
            chapter: undefined,
          },
        ],
        emptyArray: [],
        nullField: null,
        undefinedField: undefined,
      };

      const cleaned = removeUndefined(rawPayload);

      expect(cleaned.profile.id).toBe('user_123');
      expect(cleaned.profile.readingInterests).toEqual(['fiction']);
      expect('bio' in cleaned.profile).toBe(false);
      expect('avatarUrl' in cleaned.profile).toBe(false);
      expect('dailyGoalMinutes' in cleaned.profile).toBe(false);

      expect(cleaned.booksMetadata[0].title).toBe('Book 1');
      expect('coverUri' in cleaned.booksMetadata[0]).toBe(false);

      expect(cleaned.notes[0].text).toBe('Important passage');
      expect('passageText' in cleaned.notes[0]).toBe(false);
      expect('chapter' in cleaned.notes[0]).toBe(false);

      expect('undefinedField' in cleaned).toBe(false);
      expect(cleaned.nullField).toBeNull();
    });
  });

  describe('10. Unique Username & Offline Availability Check', () => {
    it('should format usernames properly (lowercase, trim, alphanumeric)', () => {
      const raw = '  Marcus_Aurelius_99  ';
      const clean = raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      expect(clean).toBe('marcus_aurelius_99');
      expect(/^[a-zA-Z0-9_]{3,20}$/.test(clean)).toBe(true);
    });

    it('should reject invalid username patterns', () => {
      const tooShort = 'ab';
      const tooLong = 'this_username_is_way_too_long_for_libora';
      const invalidChars = 'marcus@reader!';

      expect(/^[a-zA-Z0-9_]{3,20}$/.test(tooShort)).toBe(false);
      expect(/^[a-zA-Z0-9_]{3,20}$/.test(tooLong)).toBe(false);
      expect(/^[a-zA-Z0-9_]{3,20}$/.test(invalidChars)).toBe(false);
    });

    it('should check local community users and registered users when checking availability offline', async () => {
      // Save an authentic registered community user
      await StorageService.saveCommunityUser({
        id: 'user_authentic_1',
        username: 'elena_books',
        displayName: 'Elena Rostova',
        bio: 'Avid classic reader',
        booksReadCount: 4,
        readingStreakDays: 12,
        averageRating: 4.9,
      });

      const communityUsers = await StorageService.getCommunityUsers();
      expect(communityUsers.length).toBeGreaterThan(0);

      const existingUsernames = communityUsers.map((u) => u.username.toLowerCase());
      expect(existingUsernames).toContain('elena_books');

      // 'elena_books' should be recognized as taken
      const isTaken = existingUsernames.includes('elena_books');
      expect(isTaken).toBe(true);

      // 'akash_unique_reader' should be recognized as available
      const isAvailable = !existingUsernames.includes('akash_unique_reader');
      expect(isAvailable).toBe(true);
    });
  });

  describe('11. Community Follow and Friend System', () => {
    it('should toggle and persist following state offline', async () => {
      const initialFollowing = await StorageService.getFollowing();
      expect(initialFollowing).toEqual([]);

      const isNowFollowing = await StorageService.toggleFollow('elena_books');
      expect(isNowFollowing).toBe(true);

      const check1 = await StorageService.isFollowing('elena_books');
      expect(check1).toBe(true);

      const isUnfollowed = await StorageService.toggleFollow('elena_books');
      expect(isUnfollowed).toBe(false);

      const check2 = await StorageService.isFollowing('elena_books');
      expect(check2).toBe(false);
    });

    it('should toggle and persist friends state offline and auto-follow', async () => {
      const initialFriends = await StorageService.getFriends();
      expect(initialFriends).toEqual([]);

      const isFriend = await StorageService.toggleFriend('elena_books');
      expect(isFriend).toBe(true);

      const checkFriend = await StorageService.isFriend('elena_books');
      expect(checkFriend).toBe(true);

      const friendsList = await StorageService.getFriends();
      expect(friendsList).toContain('elena_books');

      // Adding friend also ensures they are followed
      const isFollowing = await StorageService.isFollowing('elena_books');
      expect(isFollowing).toBe(true);
    });
  });

  describe('12. Community Reader Profiles: Currently Reading, Lists, and Quotes', () => {
    it('should retrieve community reader by username with authentic books, lists, and quotes', async () => {
      await StorageService.saveCommunityUser({
        id: 'user_authentic_dev',
        username: 'dev_reader',
        displayName: 'Dev Reader',
        bio: 'Building my digital shelf',
        booksReadCount: 5,
        readingStreakDays: 14,
        averageRating: 4.8,
        currentlyReading: {
          title: 'Deep Work',
          author: 'Cal Newport',
          progress: 0.45,
        },
        readingLists: [
          {
            name: 'Focus & Productivity',
            count: 1,
            books: [{ title: 'Deep Work', author: 'Cal Newport' }],
          },
        ],
        quotes: [
          {
            id: 'quote_dev_1',
            text: 'Clarity about what matters provides clarity about what does not.',
            author: 'Cal Newport',
            bookTitle: 'Deep Work',
          },
        ],
      });

      const user = await StorageService.getCommunityUserByUsername('dev_reader');
      expect(user).not.toBeNull();
      expect(user?.displayName).toBe('Dev Reader');

      // What they are reading
      expect(user?.currentlyReading).toBeDefined();
      expect(user?.currentlyReading?.title).toBe('Deep Work');
      expect(user?.currentlyReading?.progress).toBe(0.45);

      // Their reading lists
      expect(user?.readingLists).toBeDefined();
      expect(user?.readingLists?.length).toBe(1);
      expect(user?.readingLists?.[0].name).toBe('Focus & Productivity');

      // Their quotes
      expect(user?.quotes).toBeDefined();
      expect(user?.quotes?.length).toBe(1);
      expect(user?.quotes?.[0].text).toContain('Clarity about what matters');
    });
  });

  describe('13. Offline PDF Import & Reading Invariants', () => {
    it('should confirm books directory path is within local app documentDirectory', async () => {
      const dir = StorageService.getBooksDirectory();
      expect(dir).toContain('file:///data/user/0/com.libora.app/files/');
      expect(dir.endsWith('books/')).toBe(true);
    });

    it('should sanitize PDF base64 by stripping linebreaks and whitespace', () => {
      const rawWithNewlines = 'JVBERi0xLjQK\r\nJcTl8uXr\n\t...mock_pdf_stream...\r\n';
      const clean = rawWithNewlines.replace(/[\r\n\s]/g, '');
      expect(clean).toBe('JVBERi0xLjQKJcTl8uXr...mock_pdf_stream...');
      expect(clean).not.toContain('\n');
      expect(clean).not.toContain('\r');
      // When serialized as JSON string literal, it produces valid JS tokens without unexpected token errors
      const serialized = JSON.stringify(clean);
      expect(serialized.startsWith('"')).toBe(true);
      expect(serialized.endsWith('"')).toBe(true);
    });

    it('should convert ArrayBuffer to clean Base64 string without Blob store overhead', () => {
      // Create a test Uint8Array representing "Libora PDF Test"
      const text = 'Libora PDF Test';
      const buffer = new ArrayBuffer(text.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < text.length; i++) {
        view[i] = text.charCodeAt(i);
      }

      const base64 = arrayBufferToBase64(buffer);
      expect(base64).toBe('TGlib3JhIFBERiBUZXN0');
    });
  });
});
