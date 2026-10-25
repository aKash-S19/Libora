export type BookFormat = 'pdf' | 'epub' | 'txt';

export type ReadingStatus = 'want-to-read' | 'currently-reading' | 'completed' | 'favorite';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUri?: string;
  fileUri: string;
  format: BookFormat;
  fileSize: number; // in bytes
  pageCount: number;
  currentPage: number;
  readingProgress: number; // 0 to 1
  status: ReadingStatus;
  collections: string[];
  addedAt: number; // timestamp
  lastReadAt?: number; // timestamp
  description?: string;
  publisher?: string;
  language?: string;
  isPublicDomain?: boolean;
  source?: 'local' | 'openlibrary' | 'gutenberg' | 'url' | 'internetarchive';
}

export type HighlightColor = '#FDE047' | '#86EFAC' | '#93C5FD' | '#F472B6' | '#C084FC';

export interface Highlight {
  id: string;
  bookId: string;
  bookTitle: string;
  author: string;
  text: string;
  location: number; // page number or progress ratio
  chapter?: string;
  color: HighlightColor;
  createdAt: number;
}

export interface Note {
  id: string;
  bookId: string;
  bookTitle: string;
  author: string;
  text: string;
  passageText?: string;
  location: number;
  chapter?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Quote {
  id: string;
  bookId: string;
  bookTitle: string;
  author: string;
  text: string;
  location: number;
  chapter?: string;
  personalThought?: string;
  isFavorite: boolean;
  createdAt: number;
}

export interface Bookmark {
  id: string;
  bookId: string;
  page: number;
  title?: string;
  createdAt: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  bookIds: string[];
  createdAt: number;
}

export interface Review {
  id: string;
  bookId: string;
  bookTitle: string;
  author: string;
  coverUri?: string;
  userId: string;
  username: string;
  userAvatar?: string;
  rating: number; // 0.5 to 5.0
  reviewText: string;
  reaction?: string;
  liked?: boolean;
  containsSpoilers?: boolean;
  year?: number;
  readDate?: number;
  likesCount?: number;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ScannedBookFile {
  uri: string;
  name: string;
  size: number;
  format: BookFormat;
  title: string;
  author: string;
  isSelected?: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  booksReadCount: number;
  currentlyReadingCount: number;
  wantToReadCount: number;
  favoritesCount: number;
  readingStreakDays: number;
  averageRating: number;
  isPrivate: boolean;
  favoriteBookIds: string[];
  favoriteBooks?: { id: string; title: string; author: string; coverUri?: string }[];
  readingInterests?: string[];
  dailyGoalMinutes?: number;
  setupCompleted?: boolean;
  createdAt: number;
}

export interface ActivityItem {
  id: string;
  type: 'finish_book' | 'add_book' | 'save_quote' | 'write_review' | 'add_highlight';
  title: string;
  subtitle: string;
  timestamp: number;
  bookId?: string;
  rating?: number;
}

export type ReaderThemeMode = 'light' | 'sepia' | 'dark' | 'amoled';

export interface ReaderSettings {
  theme: ReaderThemeMode;
  fontSize: number; // default 18
  lineHeight: number; // default 1.6
  fontFamily: 'serif' | 'sans-serif' | 'monospace';
  margin: number; // default 16
  continuousScroll: boolean;
  textAlign: 'left' | 'justify';
}

export interface DownloadItem {
  id: string;
  searchResultId?: string;
  bookId?: string;
  title: string;
  author: string;
  format: BookFormat;
  downloadUrl: string;
  totalBytes: number;
  downloadedBytes: number;
  progress: number; // 0 to 1
  status: 'pending' | 'downloading' | 'completed' | 'error';
  error?: string;
}

export interface FreeBookSearchResult {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  description?: string;
  source: 'openlibrary' | 'gutenberg' | 'internetarchive';
  format: BookFormat;
  downloadUrl: string;
  websiteUrl?: string;
  year?: number;
  subjects?: string[];
}

export interface CommunityUser {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  booksReadCount: number;
  readingStreakDays: number;
  averageRating: number;
  currentlyReading?: {
    title: string;
    author: string;
    coverUri?: string;
    progress: number;
  };
  readingLists?: {
    name: string;
    count: number;
    books: { title: string; author: string; coverUri?: string; status?: string }[];
  }[];
  quotes?: {
    id: string;
    text: string;
    author: string;
    bookTitle: string;
    personalThought?: string;
  }[];
  reviews?: {
    bookTitle: string;
    author: string;
    rating: number;
    reaction?: string;
    text: string;
  }[];
}
