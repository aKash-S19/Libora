import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Book, Collection, Review, ActivityItem, ReadingStatus } from '../types';
import { StorageService } from '../storage';
import { ImporterService } from '../services/importer';
import { SyncService } from '../services/sync';
import { useAuth } from './AuthContext';

interface LibraryContextType {
  books: Book[];
  collections: Collection[];
  reviews: Review[];
  activities: ActivityItem[];
  isLoading: boolean;
  refreshLibrary: () => Promise<void>;
  importLocalBook: () => Promise<Book | null>;
  importFromUrl: (url: string, title?: string, author?: string) => Promise<Book>;
  deleteBook: (id: string) => Promise<void>;
  markBookOpened: (bookId: string) => Promise<Book | null>;
  updateBookProgress: (bookId: string, page: number, total: number) => Promise<Book | null>;
  setBookStatus: (bookId: string, status: ReadingStatus) => Promise<void>;
  toggleFavorite: (bookId: string) => Promise<void>;
  createCollection: (name: string, description?: string) => Promise<Collection>;
  toggleBookInCollection: (collectionId: string, bookId: string) => Promise<void>;
  addReview: (review: Review) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  toggleReviewLike: (id: string) => Promise<void>;
  stats: {
    totalBooks: number;
    completedCount: number;
    readingCount: number;
    wantToReadCount: number;
    favoriteCount: number;
  };
}

const LibraryContext = createContext<LibraryContextType>({} as LibraryContextType);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshLibrary = useCallback(async () => {
    try {
      await ImporterService.seedStarterBooksIfEmpty();
      let loadedBooks = await StorageService.getBooks();

      // Automatically purge any remaining preloaded starter books
      const hasBuiltin = loadedBooks.some((b) => b.fileUri && b.fileUri.startsWith('builtin_'));
      if (hasBuiltin) {
        loadedBooks = loadedBooks.filter((b) => !b.fileUri || !b.fileUri.startsWith('builtin_'));
        await StorageService.saveBooks(loadedBooks);
        // Clean up sample highlights, quotes, and reviews for starter books
        const starterIds = ['book_meditations_aurelius', 'book_metamorphosis_kafka', 'book_the_republic_plato'];
        const allHl = await StorageService.getHighlights();
        await StorageService.saveHighlights(allHl.filter((h) => !starterIds.includes(h.bookId)));
        const allQt = await StorageService.getQuotes();
        await StorageService.saveQuotes(allQt.filter((q) => !starterIds.includes(q.bookId)));
        const allRev = await StorageService.getReviews();
        await StorageService.saveReviews(allRev.filter((r) => !starterIds.includes(r.bookId)));
      }

      const loadedCols = await StorageService.getCollections();
      const loadedRevs = await StorageService.getReviews();
      const loadedActs = await StorageService.getActivities();

      setBooks(loadedBooks);
      setCollections(loadedCols);
      setReviews(loadedRevs);
      setActivities(loadedActs);
    } catch (e) {
      console.warn('Failed to refresh library:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshLibrary();
  }, [user?.uid, refreshLibrary]);

  const importLocalBook = async (): Promise<Book | null> => {
    try {
      const book = await ImporterService.pickAndImportBook();
      if (book) {
        await refreshLibrary();
      }
      return book;
    } catch (e) {
      console.error('Import book error:', e);
      throw e;
    }
  };

  const importFromUrl = async (url: string, title?: string, author?: string): Promise<Book> => {
    const book = await ImporterService.importFromUrl(url, title, author);
    await refreshLibrary();
    return book;
  };

  const deleteBook = async (id: string): Promise<void> => {
    await StorageService.deleteBook(id);
    await refreshLibrary();
  };

  const markBookOpened = async (bookId: string): Promise<Book | null> => {
    const updated = await StorageService.markBookOpened(bookId);
    await refreshLibrary();
    return updated;
  };

  const updateBookProgress = async (
    bookId: string,
    page: number,
    total: number
  ): Promise<Book | null> => {
    const updated = await StorageService.updateReadingProgress(bookId, page, total);
    await refreshLibrary();
    if (user && !user.isAnonymous) {
      SyncService.syncAll().catch(() => {});
    }
    return updated;
  };

  const setBookStatus = async (bookId: string, status: ReadingStatus): Promise<void> => {
    const b = books.find((item) => item.id === bookId);
    if (!b) return;
    const updated: Book = { ...b, status };
    await StorageService.saveBook(updated);
    await refreshLibrary();
    if (user && !user.isAnonymous) {
      SyncService.syncAll().catch(() => {});
    }
  };

  const toggleFavorite = async (bookId: string): Promise<void> => {
    const b = books.find((item) => item.id === bookId);
    if (!b) return;
    const newStatus: ReadingStatus = b.status === 'favorite' ? 'currently-reading' : 'favorite';
    await setBookStatus(bookId, newStatus);
  };

  const createCollection = async (name: string, description?: string): Promise<Collection> => {
    const col = await StorageService.createCollection(name, description);
    await refreshLibrary();
    if (user && !user.isAnonymous) {
      SyncService.syncAll().catch(() => {});
    }
    return col;
  };

  const toggleBookInCollection = async (collectionId: string, bookId: string): Promise<void> => {
    await StorageService.toggleBookInCollection(collectionId, bookId);
    await refreshLibrary();
    if (user && !user.isAnonymous) {
      SyncService.syncAll().catch(() => {});
    }
  };

  const addReview = async (review: Review): Promise<void> => {
    await StorageService.addReview(review);
    await refreshLibrary();
    if (user && !user.isAnonymous) {
      SyncService.syncAll().catch(() => {});
    }
  };

  const deleteReview = async (id: string): Promise<void> => {
    await StorageService.deleteReview(id);
    await refreshLibrary();
    if (user && !user.isAnonymous) {
      SyncService.syncAll().catch(() => {});
    }
  };

  const toggleReviewLike = async (id: string): Promise<void> => {
    await StorageService.toggleReviewLike(id);
    await refreshLibrary();
    if (user && !user.isAnonymous) {
      SyncService.syncAll().catch(() => {});
    }
  };

  const stats = {
    totalBooks: books.length,
    completedCount: books.filter((b) => b.status === 'completed' || b.readingProgress >= 0.99).length,
    readingCount: books.filter((b) => b.status === 'currently-reading').length,
    wantToReadCount: books.filter((b) => b.status === 'want-to-read').length,
    favoriteCount: books.filter((b) => b.status === 'favorite').length,
  };

  return (
    <LibraryContext.Provider
      value={{
        books,
        collections,
        reviews,
        activities,
        isLoading,
        refreshLibrary,
        importLocalBook,
        importFromUrl,
        deleteBook,
        markBookOpened,
        updateBookProgress,
        setBookStatus,
        toggleFavorite,
        createCollection,
        toggleBookInCollection,
        addReview,
        deleteReview,
        toggleReviewLike,
        stats,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => useContext(LibraryContext);
