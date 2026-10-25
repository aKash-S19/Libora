import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ReaderSettings,
  Highlight,
  Note,
  Quote,
  Bookmark,
  HighlightColor,
} from '../types';
import { StorageService, DEFAULT_READER_SETTINGS } from '../storage';
import { SyncService } from '../services/sync';

interface ReaderContextType {
  settings: ReaderSettings;
  updateSettings: (newSettings: Partial<ReaderSettings>) => Promise<void>;
  highlights: Highlight[];
  notes: Note[];
  quotes: Quote[];
  bookmarks: Bookmark[];
  addHighlight: (
    bookId: string,
    bookTitle: string,
    author: string,
    text: string,
    location: number,
    color?: HighlightColor,
    chapter?: string
  ) => Promise<Highlight>;
  deleteHighlight: (id: string) => Promise<void>;
  addNote: (
    bookId: string,
    bookTitle: string,
    author: string,
    text: string,
    location: number,
    passageText?: string,
    chapter?: string
  ) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  addQuote: (
    bookId: string,
    bookTitle: string,
    author: string,
    text: string,
    location: number,
    personalThought?: string,
    chapter?: string
  ) => Promise<Quote>;
  deleteQuote: (id: string) => Promise<void>;
  toggleQuoteFavorite: (id: string) => Promise<void>;
  addBookmark: (bookId: string, page: number, title?: string) => Promise<Bookmark>;
  deleteBookmark: (id: string) => Promise<void>;
  refreshKnowledge: () => Promise<void>;
}

const ReaderContext = createContext<ReaderContextType>({} as ReaderContextType);

export const ReaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_READER_SETTINGS);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const refreshKnowledge = async () => {
    try {
      const [s, h, n, q, b] = await Promise.all([
        StorageService.getReaderSettings(),
        StorageService.getHighlights(),
        StorageService.getNotes(),
        StorageService.getQuotes(),
        StorageService.getBookmarks(),
      ]);
      setSettings(s);
      setHighlights(h);
      setNotes(n);
      setQuotes(q);
      setBookmarks(b);
    } catch (e) {
      console.warn('Failed to load reader knowledge:', e);
    }
  };

  useEffect(() => {
    refreshKnowledge();
  }, []);

  const updateSettings = async (newSettings: Partial<ReaderSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await StorageService.saveReaderSettings(updated);
  };

  const addHighlight = async (
    bookId: string,
    bookTitle: string,
    author: string,
    text: string,
    location: number,
    color: HighlightColor = '#FDE047',
    chapter?: string
  ): Promise<Highlight> => {
    const highlight: Highlight = {
      id: `hl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      bookId,
      bookTitle,
      author,
      text,
      location,
      chapter,
      color,
      createdAt: Date.now(),
    };
    await StorageService.addHighlight(highlight);
    await refreshKnowledge();
    SyncService.syncAll().catch(() => {});
    return highlight;
  };

  const deleteHighlight = async (id: string) => {
    await StorageService.deleteHighlight(id);
    await refreshKnowledge();
    SyncService.syncAll().catch(() => {});
  };

  const addNote = async (
    bookId: string,
    bookTitle: string,
    author: string,
    text: string,
    location: number,
    passageText?: string,
    chapter?: string
  ): Promise<Note> => {
    const note: Note = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      bookId,
      bookTitle,
      author,
      text,
      passageText,
      location,
      chapter,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await StorageService.addNote(note);
    await refreshKnowledge();
    SyncService.syncAll().catch(() => {});
    return note;
  };

  const deleteNote = async (id: string) => {
    await StorageService.deleteNote(id);
    await refreshKnowledge();
    SyncService.syncAll().catch(() => {});
  };

  const addQuote = async (
    bookId: string,
    bookTitle: string,
    author: string,
    text: string,
    location: number,
    personalThought?: string,
    chapter?: string
  ): Promise<Quote> => {
    const quote: Quote = {
      id: `quote_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      bookId,
      bookTitle,
      author,
      text,
      location,
      personalThought,
      chapter,
      isFavorite: false,
      createdAt: Date.now(),
    };
    await StorageService.addQuote(quote);
    await refreshKnowledge();
    SyncService.syncAll().catch(() => {});
    return quote;
  };

  const deleteQuote = async (id: string) => {
    await StorageService.deleteQuote(id);
    await refreshKnowledge();
    SyncService.syncAll().catch(() => {});
  };

  const toggleQuoteFavorite = async (id: string) => {
    await StorageService.toggleQuoteFavorite(id);
    await refreshKnowledge();
    SyncService.syncAll().catch(() => {});
  };

  const addBookmark = async (bookId: string, page: number, title?: string): Promise<Bookmark> => {
    const bm: Bookmark = {
      id: `bm_${Date.now()}`,
      bookId,
      page,
      title: title || `Page ${page}`,
      createdAt: Date.now(),
    };
    await StorageService.addBookmark(bm);
    await refreshKnowledge();
    return bm;
  };

  const deleteBookmark = async (id: string) => {
    await StorageService.deleteBookmark(id);
    await refreshKnowledge();
  };

  return (
    <ReaderContext.Provider
      value={{
        settings,
        updateSettings,
        highlights,
        notes,
        quotes,
        bookmarks,
        addHighlight,
        deleteHighlight,
        addNote,
        deleteNote,
        addQuote,
        deleteQuote,
        toggleQuoteFavorite,
        addBookmark,
        deleteBookmark,
        refreshKnowledge,
      }}
    >
      {children}
    </ReaderContext.Provider>
  );
};

export const useReader = () => useContext(ReaderContext);
