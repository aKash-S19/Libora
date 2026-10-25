import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Book, ReaderSettings, ReaderThemeMode } from '../types';
import { StorageService } from '../storage';
import { arrayBufferToBase64 } from '../utils/binary';

interface BookReaderEngineProps {
  book: Book;
  settings: ReaderSettings;
  currentPage: number;
  onPageChange: (page: number, total: number) => void;
  onToggleControls: () => void;
  onTextSelected: (text: string) => void;
  onPageText?: (text: string, page: number) => void;
  clearSelectionTrigger?: number;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  isSelectionMode?: boolean;
}

export interface TableOfContentsItem {
  title: string;
  page: number;
}

export const BUILTIN_BOOK_TEXTS: Record<string, { title: string; chapters: { title: string; content: string }[] }> = {
  builtin_meditations: {
    title: 'Meditations — Marcus Aurelius',
    chapters: [
      {
        title: 'Book I — Debts and Lessons',
        content: `From my grandfather Verus: decency and a mild temper.
From what they say and I remember of my father: integrity and manliness.
From my mother: piety and generosity, and to keep oneself not only from doing evil, but even from the thought of doing evil; and simplicity also in my way of living, far removed from the habits of the rich.
From my great-grandfather: not to have frequented public schools, and to have had good teachers at home, and to understand that on such things a man should spend liberally.

From my governor: to be neither of the green nor of the blue party at the games in the Circus, nor a partizan either of the Parmularii or the Scutarii at the gladiators' fights; from him too I learned endurance of labour, and to want little, and to work with my own hands, and not to meddle with other people's affairs, and not to be ready to listen to slander.`,
      },
      {
        title: 'Book II — On the River Granua',
        content: `When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly. They are like this because they cannot distinguish good from evil. But I have seen the beauty of good, and the ugliness of evil, and have recognized that the wrongdoer has a nature related to my own - not of the same blood or birth, but the same mind, and possessing a share of the divine.

None of them can hurt me. No one can implicate me in ugliness. Nor can I feel angry at my relative, or hate him. We were made to work together like feet, like hands, like the rows of the upper and lower teeth. To work against one another is therefore contrary to nature.`,
      },
      {
        title: 'Book IV — The Inner Citadel',
        content: `Men seek retreats for themselves, houses in the country, seashores, and mountains; and you too are especially wont to desire such things: but this is altogether a mark of the most common sort of men, for it is in your power whenever you will to retire into yourself. For nowhere either with more quiet or more freedom from trouble does a man retire than into his own soul, particularly when he has within him such thoughts that by looking into them he is immediately in perfect tranquility; and I affirm that tranquility is nothing else than the good ordering of the mind.

Constantly then give to yourself this retreat, and renew yourself; and let your basic principles be brief and fundamental, which, as soon as you have recurred to them, will be sufficient to cleanse the soul completely, and to send you back without any irritation to the life to which you must return.`,
      },
    ],
  },
  builtin_metamorphosis: {
    title: 'The Metamorphosis — Franz Kafka',
    chapters: [
      {
        title: 'Chapter I',
        content: `One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin. He lay on his armour-like back, and if he lifted his head a little he could see his brown belly, slightly domed and divided by arches into stiff sections. The bedding was hardly able to cover it and seemed ready to slide off any moment. His many legs, pitifully thin compared with the size of the rest of him, waved about helplessly as he looked.

"What's happened to me?" he thought. It wasn't a dream. His room, a proper human room although a little too small, lay peacefully between its four familiar walls. A collection of textile samples lay spread out on the table - Samsa was a travelling salesman - and above it there hung a picture that he had recently cut out of an illustrated magazine and housed in a nice, gilded frame.`,
      },
      {
        title: 'Chapter II',
        content: `It was not until dusk that Gregor awoke from his deep, coma-like sleep. He would have woken soon anyway as he felt fully rested and had slept long enough, but it seemed to him that what had really woken him was the sound of quiet steps and the door to the hall being closed quietly. The light from the electric street lamps shone over the ceiling and the upper parts of the furniture, but down where Gregor was it was dark.

Slowly, awkwardly feeling his way with his antennae, which he only now began to appreciate, he moved over to the door to see what had been happening. His left side felt like one long, unpleasantly painful scar, and he had to limp along on his two rows of legs. In addition, one tiny leg had been badly injured in the course of the morning's events - it was almost a miracle that only one had been injured - and trailed along lifelessly behind him.`,
      },
    ],
  },
  builtin_republic: {
    title: 'The Republic — Plato',
    chapters: [
      {
        title: 'Book VII — The Allegory of the Cave',
        content: `And now, I said, let me show in a figure how far our nature is enlightened or unenlightened: Behold! human beings living in an underground den, which has a mouth open towards the light and reaching all along the den; here they have been from their childhood, and have their legs and necks chained so that they cannot move, and can only see before them, being prevented by the chains from turning round their heads.

Above and behind them a fire is blazing at a distance, and between the fire and the prisoners there is a raised way; and you will see, if you look, a low wall built along the way, like the screen which marionette players have in front of them, over which they show the puppets.

And do you see, I said, men passing along the wall carrying all sorts of vessels, and statues and figures of animals made of wood and stone and various materials, which appear over the wall? Some of them are talking, others silent.

You have shown me a strange image, and they are strange prisoners.

Like ourselves, I replied; and they see only their own shadows, or the shadows of one another, which the fire throws on the opposite wall of the cave.`,
      },
    ],
  },
};

export function extractBookTableOfContents(book: Book, rawText?: string): TableOfContentsItem[] {
  // 1. Built-in books with actual chapters
  if (book.fileUri && book.fileUri.startsWith('builtin_')) {
    const builtin = BUILTIN_BOOK_TEXTS[book.fileUri];
    if (builtin && builtin.chapters.length > 0) {
      let totalLength = 0;
      builtin.chapters.forEach((c) => {
        totalLength += c.content.length;
      });
      let currentOffset = 0;
      return builtin.chapters.map((c, i) => {
        const page =
          i === 0
            ? 1
            : Math.max(
                1,
                Math.min(
                  book.pageCount,
                  Math.round(1 + (currentOffset / Math.max(1, totalLength)) * (book.pageCount - 1))
                )
              );
        currentOffset += c.content.length;
        return {
          title: c.title,
          page,
        };
      });
    }
  }

  // 2. Headings parsed from raw plain text (EPUB or TXT)
  if (rawText && rawText.length > 100) {
    const headingRegex = /(?:^|\n)(?:#{1,3}\s+|(?:\b(?:chapter|book|act|part|scene|canto|section)\b\s+[0-9ivxlcdm]+[^\n]{0,60}))/gim;
    const matches: { title: string; index: number }[] = [];
    let match: RegExpExecArray | null;
    while ((match = headingRegex.exec(rawText)) !== null) {
      const cleanTitle = match[0].replace(/^[\n#\s]+/, '').trim();
      if (cleanTitle.length >= 3 && cleanTitle.length <= 80) {
        matches.push({ title: cleanTitle, index: match.index });
      }
    }

    if (matches.length >= 2) {
      return matches.map((m, idx) => {
        const page =
          idx === 0
            ? 1
            : Math.max(
                1,
                Math.min(
                  book.pageCount,
                  Math.round(1 + (m.index / rawText.length) * (book.pageCount - 1))
                )
              );
        return {
          title: m.title,
          page,
        };
      });
    }
  }

  // 3. Proportional landmark table of contents for PDFs and documents
  const total = Math.max(1, book.pageCount || 1);
  if (total <= 3) {
    return [{ title: 'Full Document', page: 1 }];
  }

  if (total <= 15) {
    return [
      { title: 'Part I — Beginning', page: 1 },
      { title: 'Part II — Middle', page: Math.max(2, Math.round(total * 0.5)) },
      { title: 'Part III — Conclusion', page: total },
    ];
  }

  return [
    { title: 'Chapter I — Beginning & Foundations', page: 1 },
    { title: 'Chapter II — Development & Context', page: Math.max(2, Math.round(total * 0.25)) },
    { title: 'Chapter III — Main Substance & Turning Point', page: Math.max(3, Math.round(total * 0.5)) },
    { title: 'Chapter IV — Further Perspectives', page: Math.max(4, Math.round(total * 0.75)) },
    { title: 'Chapter V — Epilogue & Conclusion', page: total },
  ];
}

export async function getBookTableOfContentsAsync(book: Book): Promise<TableOfContentsItem[]> {
  if (book.fileUri && book.fileUri.startsWith('builtin_')) {
    return extractBookTableOfContents(book);
  }
  try {
    const cachedText = await AsyncStorage.getItem(`@libora_book_content_${book.id}`);
    if (cachedText && cachedText.length > 100) {
      return extractBookTableOfContents(book, cachedText);
    }
  } catch {}
  return extractBookTableOfContents(book);
}

export const BookReaderEngine: React.FC<BookReaderEngineProps> = ({
  book,
  settings,
  currentPage,
  onPageChange,
  onToggleControls,
  onTextSelected,
  onPageText,
  clearSelectionTrigger,
  onPrevPage,
  onNextPage,
  isSelectionMode,
}) => {
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [contentHtml, setContentHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const settingsRef = useRef(settings);
  const loadedBookKeyRef = useRef<string | null>(null);
  const isInternalNavigationRef = useRef<boolean>(false);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const clearSelection = useCallback(() => {
    const script = `
      if (typeof window.clearSelection === 'function') {
        window.clearSelection();
      }
      true;
    `;
    webViewRef.current?.injectJavaScript(script);
    if (Platform.OS === 'web' && iframeRef.current && iframeRef.current.contentWindow) {
      try {
        (iframeRef.current.contentWindow as any).clearSelection?.();
      } catch {}
      try {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ type: 'clear_selection' }), '*');
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (clearSelectionTrigger !== undefined && clearSelectionTrigger > 0) {
      clearSelection();
    }
  }, [clearSelectionTrigger, clearSelection]);

  const getThemeColors = useCallback(
    (themeMode?: ReaderThemeMode) => {
      const mode = themeMode || settings.theme;
      switch (mode) {
        case 'light':
          return { bg: '#FAF8F5', text: '#1E293B', link: '#B45309', border: '#E2DCD3', card: '#FFFFFF' };
        case 'sepia':
          return { bg: '#F6EEDF', text: '#433422', link: '#B45309', border: '#DACDB8', card: '#FBF5EB' };
        case 'dark':
          return { bg: '#121824', text: '#E2E8F0', link: '#F59E0B', border: '#1F2937', card: '#1E293B' };
        case 'amoled':
          return { bg: '#000000', text: '#EEEEEE', link: '#F59E0B', border: '#222222', card: '#111111' };
        default:
          return { bg: '#FAF8F5', text: '#1E293B', link: '#B45309', border: '#E2DCD3', card: '#FFFFFF' };
      }
    },
    [settings.theme]
  );

  const applySettingsToEngine = useCallback(
    (newSettings: ReaderSettings) => {
      const theme = getThemeColors(newSettings.theme);
      const payload = {
        type: 'apply_settings',
        settings: newSettings,
        theme,
      };

      const script = `
        if (typeof window.applyReaderSettings === 'function') {
          window.applyReaderSettings(${JSON.stringify(newSettings)}, ${JSON.stringify(theme)});
        }
        true;
      `;

      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(script);
      }

      if (Platform.OS === 'web' && iframeRef.current && iframeRef.current.contentWindow) {
        try {
          (iframeRef.current.contentWindow as any).applyReaderSettings?.(newSettings, theme);
        } catch {}
        try {
          iframeRef.current.contentWindow.postMessage(JSON.stringify(payload), '*');
        } catch {}
      }
    },
    [getThemeColors]
  );

  const setSelectionModeInEngine = useCallback((enabled: boolean) => {
    const script = `
      if (typeof window.setSelectionMode === 'function') {
        window.setSelectionMode(${Boolean(enabled)});
      }
      true;
    `;
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(script);
    }
    if (Platform.OS === 'web' && iframeRef.current && iframeRef.current.contentWindow) {
      try {
        (iframeRef.current.contentWindow as any).setSelectionMode?.(Boolean(enabled));
      } catch {}
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ type: 'set_selection_mode', enabled: Boolean(enabled) }),
          '*'
        );
      } catch {}
    }
  }, []);

  // Apply dynamic settings without re-reading files or unmounting WebView
  useEffect(() => {
    if (!loading && contentHtml) {
      applySettingsToEngine(settings);
    }
  }, [settings, loading, contentHtml, applySettingsToEngine]);

  // Update controlled selection mode when toggled
  useEffect(() => {
    if (!loading && contentHtml) {
      setSelectionModeInEngine(Boolean(isSelectionMode));
    }
  }, [isSelectionMode, loading, contentHtml, setSelectionModeInEngine]);

  // Navigate to external page change (e.g. from slider, TOC, or controls) without reloading
  useEffect(() => {
    if (!loading && contentHtml) {
      // If this page change originated from inside the WebView (user scrolled or tapped), do not echo it back
      if (isInternalNavigationRef.current) {
        isInternalNavigationRef.current = false;
        return;
      }

      const script = `
        if (typeof window.goToPage === 'function') {
          window.goToPage(${currentPage}, ${book.pageCount});
        }
        true;
      `;
      webViewRef.current?.injectJavaScript(script);

      if (Platform.OS === 'web' && iframeRef.current && iframeRef.current.contentWindow) {
        try {
          (iframeRef.current.contentWindow as any).goToPage?.(currentPage, book.pageCount);
        } catch {}
        try {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ type: 'go_to_page', page: currentPage, total: book.pageCount }),
            '*'
          );
        } catch {}
      }
    }
  }, [currentPage, book.pageCount, loading, contentHtml]);

  const loadBookContent = useCallback(async () => {
    setLoading(true);
    try {
      const currentSettings = settingsRef.current;
      const theme = getThemeColors(currentSettings.theme);
      let rawText = '';
      let isPdf = book.format === 'pdf';
      let isEpub = book.format === 'epub';
      let pdfBase64 = '';
      let epubBase64 = '';

      // 1. Check built-in classics
      if (book.fileUri.startsWith('builtin_')) {
        const builtin = BUILTIN_BOOK_TEXTS[book.fileUri];
        if (builtin) {
          rawText = builtin.chapters
            .map(
              (c) =>
                `<div class="chapter"><h2 class="chapter-title">${c.title}</h2>${c.content
                  .split('\n\n')
                  .map((p) => `<p>${p.trim()}</p>`)
                  .join('')}</div>`
            )
            .join('');
        }
      }

      // 2. EPUB Document Engine
      if (isEpub) {
        // Check AsyncStorage cache
        try {
          const cached = await AsyncStorage.getItem(`@libora_book_epub_${book.id}`);
          if (cached && cached.length > 50) {
            epubBase64 = cached;
          }
        } catch {}

        // Read from local filesystem
        if (!epubBase64 && FileSystem.documentDirectory) {
          try {
            epubBase64 = await FileSystem.readAsStringAsync(book.fileUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          } catch {}
        }

        // Fetch ArrayBuffer stream fallback (fast, universal & zero blob overhead)
        if (!epubBase64 && book.fileUri && !book.fileUri.startsWith('builtin_')) {
          try {
            const res = await fetch(book.fileUri);
            const buf = await res.arrayBuffer();
            if (buf && buf.byteLength > 0) {
              epubBase64 = arrayBufferToBase64(buf).replace(/\s+/g, '');
            }
          } catch (e) {
            console.warn('EPUB fetch stream reading note:', e);
          }
        }

        // Cache and auto-repair path
        if (epubBase64) {
          try {
            await AsyncStorage.setItem(`@libora_book_epub_${book.id}`, epubBase64);
            if (FileSystem.documentDirectory && (book.fileUri.includes('DocumentPicker') || book.fileUri.includes('cache'))) {
              const healedPath = `${StorageService.getBooksDirectory()}${book.id}.epub`;
              await FileSystem.writeAsStringAsync(healedPath, epubBase64, {
                encoding: FileSystem.EncodingType.Base64,
              });
              book.fileUri = healedPath;
              await StorageService.saveBook(book);
            }
          } catch {}
        }

        const html = generateEpubReaderHtml(book, theme, currentSettings, epubBase64);
        setContentHtml(html);
        return;
      }

      // 3. PDF Document Engine
      if (isPdf) {
        // Step A: Check AsyncStorage for pre-cached base64
        try {
          const cachedPdf = await AsyncStorage.getItem(`@libora_book_pdf_${book.id}`);
          if (cachedPdf && cachedPdf.length > 50) {
            pdfBase64 = cachedPdf.replace(/\s+/g, '');
          }
        } catch {}

        // Step B: Check filesystem candidates if not cached in AsyncStorage
        if (!pdfBase64 && FileSystem.documentDirectory) {
          const candidatePaths = [
            book.fileUri,
            `${StorageService.getBooksDirectory()}${book.id}.pdf`,
            `${FileSystem.documentDirectory}books/${book.id}.pdf`,
            `${FileSystem.cacheDirectory}DocumentPicker/${book.id}.pdf`,
          ].filter(Boolean);

          for (const path of candidatePaths) {
            try {
              const fileInfo = await FileSystem.getInfoAsync(path);
              if (fileInfo.exists) {
                const b64 = await FileSystem.readAsStringAsync(path, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                if (b64 && b64.length > 50) {
                  pdfBase64 = b64.replace(/\s+/g, '');
                  if (path !== book.fileUri && !book.fileUri.includes(StorageService.getBooksDirectory())) {
                    book.fileUri = path;
                    StorageService.saveBook(book).catch(() => {});
                  }
                  break;
                }
              }
            } catch {}
          }
        }

        // Step C: Stream fallback via fetch ArrayBuffer if needed (fast, zero blob overhead)
        if (!pdfBase64 && book.fileUri && !book.fileUri.startsWith('builtin_')) {
          try {
            const res = await fetch(book.fileUri);
            const buf = await res.arrayBuffer();
            if (buf && buf.byteLength > 0) {
              pdfBase64 = arrayBufferToBase64(buf).replace(/\s+/g, '');
            }
          } catch (pdfBlobErr) {
            console.warn('PDF fetch stream fallback note:', pdfBlobErr);
          }
        }

        // Step D: Auto-repair, cache & heal permanent file
        if (pdfBase64) {
          try {
            await AsyncStorage.setItem(`@libora_book_pdf_${book.id}`, pdfBase64);
            if (FileSystem.documentDirectory) {
              const permanentPath = `${StorageService.getBooksDirectory()}${book.id}.pdf`;
              const permInfo = await FileSystem.getInfoAsync(permanentPath);
              if (!permInfo.exists) {
                await FileSystem.writeAsStringAsync(permanentPath, pdfBase64, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                book.fileUri = permanentPath;
                await StorageService.saveBook(book);
              }
            }
          } catch {}
        }

        const html = generatePdfReaderHtml(book, theme, currentSettings, pdfBase64, book.currentPage || 1);
        setContentHtml(html);
        return;
      }

      // 4. Check cached text in AsyncStorage (for web downloads or imported books)
      if (!rawText && !isPdf && !isEpub) {
        try {
          const cachedText = await AsyncStorage.getItem(`@libora_book_content_${book.id}`);
          if (cachedText && cachedText.length > 50) {
            rawText = formatPlainTextToHtml(cachedText);
          }
        } catch {}
      }

      // 5. Check local filesystem for TXT
      if (!rawText && !isPdf && !isEpub && !book.fileUri.startsWith('builtin_')) {
        try {
          if (FileSystem.documentDirectory) {
            const fileInfo = await FileSystem.getInfoAsync(book.fileUri);
            if (fileInfo.exists) {
              try {
                const fileContent = await FileSystem.readAsStringAsync(book.fileUri);
                rawText = formatPlainTextToHtml(fileContent);
              } catch {
                const res = await fetch(book.fileUri);
                const text = await res.text();
                if (text) rawText = formatPlainTextToHtml(text);
              }
            }
          }
        } catch (fsErr) {
          console.warn('Filesystem read attempt note:', fsErr);
        }
      }

      // 6. Text direct fetch fallback
      if (!rawText && !isPdf && !isEpub && book.fileUri && !book.fileUri.startsWith('builtin_')) {
        try {
          const res = await fetch(book.fileUri);
          const text = await res.text();
          if (text && text.length > 20) {
            rawText = formatPlainTextToHtml(text);
            await AsyncStorage.setItem(`@libora_book_content_${book.id}`, text);
          }
        } catch {}
      }

      // 7. Check web or remote URL if rawText still empty
      if (!rawText && !isPdf && !isEpub && (book.fileUri.startsWith('http') || book.fileUri.startsWith('blob:'))) {
        try {
          const resp = await fetch(book.fileUri);
          if (resp.ok) {
            const fetchedText = await resp.text();
            rawText = formatPlainTextToHtml(fetchedText);
            await AsyncStorage.setItem(`@libora_book_content_${book.id}`, fetchedText);
          }
        } catch (fetchErr) {
          console.warn('Remote text fetch note:', fetchErr);
        }
      }

      // 6. Fallback if text could not be loaded
      if (!rawText) {
        rawText = `
          <div class="book-header">
            <h1 class="book-title">${book.title}</h1>
            <h3 class="book-author">By ${book.author}</h3>
            <div class="format-tag">${book.format.toUpperCase()} · Distraction-Free Reader</div>
          </div>
          <div class="chapter">
            <h2 class="chapter-title">Chapter I</h2>
            <p>Welcome to <em>${book.title}</em> by ${book.author}.</p>
            <p>Libora provides an offline, paper-like reading interface calibrated for long reading sessions without digital distractions.</p>
            <p><strong>Kindle Navigation:</strong> Tap the <em>left 22%</em> of your screen to turn back. Tap the <em>right 22%</em> to turn forward. Tap the <em>center</em> to toggle the menu.</p>
            <p><strong>Highlights & Quotes:</strong> Long press and select any passage to create a high-contrast highlight, attach a note, or export a quote card.</p>
          </div>
        `;
      }

      // Build Text Reader HTML
      const html = generateTextReaderHtml(book, theme, currentSettings, rawText);
      setContentHtml(html);
    } catch (e) {
      console.warn('Error constructing reader HTML:', e);
    } finally {
      setLoading(false);
    }
  }, [book, getThemeColors]);

  useEffect(() => {
    const key = `${book.id}_${book.fileUri}`;
    if (loadedBookKeyRef.current !== key) {
      loadedBookKeyRef.current = key;
      loadBookContent();
    }
  }, [book.id, book.fileUri, loadBookContent]);

  const handleParsedMessage = useCallback(
    (data: any) => {
      if (data.type === 'toggle_controls') {
        onToggleControls();
      } else if (data.type === 'prev_page') {
        isInternalNavigationRef.current = true;
        if (onPrevPage) {
          onPrevPage();
        } else {
          onPageChange(Math.max(1, currentPage - 1), book.pageCount);
        }
      } else if (data.type === 'next_page') {
        isInternalNavigationRef.current = true;
        if (onNextPage) {
          onNextPage();
        } else {
          onPageChange(Math.min(book.pageCount, currentPage + 1), book.pageCount);
        }
      } else if (data.type === 'selection') {
        onTextSelected(data.text);
      } else if (data.type === 'page_text') {
        if (onPageText && typeof data.text === 'string') {
          onPageText(data.text, data.page);
        }
      } else if (data.type === 'scroll_progress') {
        isInternalNavigationRef.current = true;
        const page = Math.max(1, Math.min(book.pageCount, Math.round(data.ratio * (book.pageCount - 1)) + 1));
        onPageChange(page, book.pageCount);
      } else if (data.type === 'doc_info') {
        if (data.numPages && data.numPages > 0) {
          onPageChange(data.page || currentPage, data.numPages);
        }
      }
    },
    [book.pageCount, currentPage, onNextPage, onPageChange, onPageText, onPrevPage, onTextSelected, onToggleControls]
  );

  const handleNativeMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      handleParsedMessage(data);
    } catch {}
  };

  // Cross-Platform: Web Message Listener (for iframe)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleWebMessage = (event: MessageEvent) => {
        try {
          let data = event.data;
          if (typeof data === 'string') {
            data = JSON.parse(data);
          }
          if (data && data.type) {
            handleParsedMessage(data);
          }
        } catch {}
      };
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, [handleParsedMessage]);

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      ) : null}

      {Platform.OS === 'web' ? (
        <iframe
          ref={iframeRef as any}
          srcDoc={contentHtml}
          style={styles.webIframe as any}
          title={book.title}
          onLoad={() => {
            applySettingsToEngine(settings);
            setSelectionModeInEngine(Boolean(isSelectionMode));
          }}
        />
      ) : (
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: contentHtml }}
          onMessage={handleNativeMessage}
          style={styles.webview}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          onLoadEnd={() => {
            applySettingsToEngine(settings);
            setSelectionModeInEngine(Boolean(isSelectionMode));
          }}
        />
      )}
    </View>
  );
};

/**
 * Strips Gutenberg license disclaimers and formats raw text into clean HTML paragraphs.
 */
function formatPlainTextToHtml(text: string): string {
  let clean = text;

  // Clean Gutenberg starting header
  const startIdx = clean.indexOf('*** START OF');
  if (startIdx !== -1) {
    const endHeader = clean.indexOf('***', startIdx + 12);
    if (endHeader !== -1) {
      clean = clean.substring(endHeader + 3).trim();
    }
  }

  // Clean Gutenberg ending footer
  const endIdx = clean.indexOf('*** END OF');
  if (endIdx !== -1) {
    clean = clean.substring(0, endIdx).trim();
  }

  // Split into paragraphs
  const paragraphs = clean.split(/\r?\n\r?\n/);
  return paragraphs
    .map((p) => {
      const trimmed = p.trim().replace(/\r?\n/g, ' ');
      if (!trimmed) return '';
      // Check for chapter title
      if (/^(chapter|book|act|scene|part)\s+[0-9ivxlcdm]+/i.test(trimmed) || (trimmed.length < 50 && trimmed === trimmed.toUpperCase())) {
        return `<h2 class="chapter-title">${trimmed}</h2>`;
      }
      return `<p>${trimmed}</p>`;
    })
    .join('');
}

function getFontFamilyCss(family?: string): string {
  switch (family) {
    case 'serif':
      return 'Georgia, Cambria, "Times New Roman", Times, serif';
    case 'monospace':
      return 'Menlo, Monaco, Consolas, "Courier New", monospace';
    case 'sans-serif':
    default:
      return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  }
}

/**
 * Generates the HTML document for Text/Kindle reading with full centering and dynamic settings.
 */
function generateTextReaderHtml(book: Book, theme: any, settings: ReaderSettings, contentHtml: string): string {
  const fontCss = getFontFamilyCss(settings.fontFamily);
  const marginPx = settings.margin || 20;
  const textAlignVal = settings.textAlign || 'left';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0, user-scalable=yes">
      <style>
        :root {
          --bg-color: ${theme.bg};
          --text-color: ${theme.text};
          --link-color: ${theme.link};
          --border-color: ${theme.border};
          --card-color: ${theme.card};
          --font-size: ${settings.fontSize}px;
          --line-height: ${settings.lineHeight};
          --font-family: ${fontCss};
          --margin: ${marginPx}px;
          --text-align: ${textAlignVal};
        }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html {
          margin: 0;
          padding: 0;
          min-height: 100%;
          background-color: var(--bg-color);
          color: var(--text-color);
        }
        body {
          background-color: var(--bg-color);
          color: var(--text-color);
          font-family: var(--font-family);
          font-size: var(--font-size);
          line-height: var(--line-height);
          text-align: var(--text-align);
          margin: 0;
          padding: 0;
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          overflow-x: hidden;
          user-select: text;
          -webkit-user-select: text;
          box-sizing: border-box;
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        #content {
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          box-sizing: border-box;
          padding: 36px var(--margin) 140px var(--margin);
          font-size: var(--font-size);
          line-height: var(--line-height);
          text-align: var(--text-align);
          flex: 1;
        }
        .book-header {
          text-align: center;
          padding: 32px 0 20px 0;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 32px;
          width: 100%;
        }
        .book-title {
          font-size: calc(var(--font-size) + 8px);
          margin: 0 0 10px 0;
          line-height: 1.3;
          font-weight: 700;
        }
        .book-author {
          font-size: var(--font-size);
          color: var(--link-color);
          font-weight: 500;
          margin: 0 0 14px 0;
        }
        .format-tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 4px;
          background-color: var(--border-color);
          opacity: 0.85;
          letter-spacing: 0.5px;
        }
        .chapter { margin-bottom: 44px; width: 100%; }
        .chapter-title {
          font-size: calc(var(--font-size) + 4px);
          margin: 36px 0 18px 0;
          color: var(--link-color);
          border-bottom: 1px dashed var(--border-color);
          padding-bottom: 8px;
          font-weight: 600;
        }
        p { margin-bottom: 1.35em; text-indent: 1.25em; line-height: var(--line-height); }
        ::selection { background-color: #FDE047; color: #1E293B; }
        body.selection-mode-active p:hover, body.selection-mode-active p:active {
          background-color: rgba(253, 224, 71, 0.22);
          border-radius: 4px;
          cursor: text;
        }
        body.selection-mode-active {
          user-select: text !important;
          -webkit-user-select: text !important;
        }
      </style>
    </head>
    <body>
      <div id="content">
        ${contentHtml}
      </div>

      <script>
        function sendMessage(data) {
          const json = JSON.stringify(data);
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(json);
          } else if (window.parent && window.parent !== window) {
            window.parent.postMessage(json, '*');
          }
        }

        var isSelectionModeActive = false;
        window.setSelectionMode = function(enabled) {
          isSelectionModeActive = Boolean(enabled);
          document.body.classList.toggle('selection-mode-active', isSelectionModeActive);
          if (!isSelectionModeActive) {
            window.clearSelection();
          }
        };

        window.applyReaderSettings = function(newSettings, newTheme) {
          if (!newSettings) return;
          var root = document.documentElement;
          var body = document.body;
          if (newTheme) {
            root.style.setProperty('--bg-color', newTheme.bg);
            root.style.setProperty('--text-color', newTheme.text);
            root.style.setProperty('--link-color', newTheme.link);
            root.style.setProperty('--border-color', newTheme.border);
            root.style.setProperty('--card-color', newTheme.card);
            body.style.backgroundColor = newTheme.bg;
            body.style.color = newTheme.text;
          }
          if (newSettings.fontSize) {
            root.style.setProperty('--font-size', newSettings.fontSize + 'px');
            var content = document.getElementById('content');
            if (content) content.style.fontSize = newSettings.fontSize + 'px';
          }
          if (newSettings.lineHeight) {
            root.style.setProperty('--line-height', newSettings.lineHeight);
            var content = document.getElementById('content');
            if (content) content.style.lineHeight = newSettings.lineHeight;
          }
          if (newSettings.fontFamily) {
            var ff = newSettings.fontFamily === 'serif'
              ? 'Georgia, Cambria, "Times New Roman", Times, serif'
              : newSettings.fontFamily === 'monospace'
              ? 'Menlo, Monaco, Consolas, "Courier New", monospace'
              : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
            root.style.setProperty('--font-family', ff);
            body.style.fontFamily = ff;
          }
          if (newSettings.margin !== undefined) {
            root.style.setProperty('--margin', newSettings.margin + 'px');
            var content = document.getElementById('content');
            if (content) {
              content.style.paddingLeft = newSettings.margin + 'px';
              content.style.paddingRight = newSettings.margin + 'px';
            }
          }
          if (newSettings.textAlign) {
            root.style.setProperty('--text-align', newSettings.textAlign);
            var content = document.getElementById('content');
            if (content) content.style.textAlign = newSettings.textAlign;
          }
        };

        var isProgrammaticScroll = false;
        var programmaticScrollTimer = null;

        window.goToPage = function(page, total) {
          var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          if (maxScroll > 0 && total > 0) {
            var ratio = Math.max(0, Math.min(1, (page - 1) / (total - 1 || 1)));
            isProgrammaticScroll = true;
            if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);
            window.scrollTo({ top: ratio * maxScroll, behavior: 'auto' });
            programmaticScrollTimer = setTimeout(function() {
              isProgrammaticScroll = false;
            }, 300);
          }
        };

        window.clearSelection = function() {
          if (window.getSelection) {
            var sel = window.getSelection();
            if (sel.removeAllRanges) sel.removeAllRanges();
            else if (sel.empty) sel.empty();
          }
        };

        window.addEventListener('message', function(e) {
          try {
            var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
            if (data && data.type === 'apply_settings') {
              window.applyReaderSettings(data.settings, data.theme);
            } else if (data && data.type === 'go_to_page') {
              window.goToPage(data.page, data.total);
            } else if (data && data.type === 'clear_selection') {
              window.clearSelection();
            } else if (data && data.type === 'set_selection_mode') {
              window.setSelectionMode(data.enabled);
            }
          } catch (err) {}
        });

        let selectionTimeout = null;
        function checkTextSelection() {
          const sel = window.getSelection();
          const text = sel ? sel.toString().trim() : '';
          if (text && text.length > 2) {
            sendMessage({ type: 'selection', text: text });
          }
        }

        document.addEventListener('selectionchange', () => {
          if (selectionTimeout) clearTimeout(selectionTimeout);
          selectionTimeout = setTimeout(checkTextSelection, 350);
        });

        document.addEventListener('mouseup', () => {
          setTimeout(checkTextSelection, 100);
        });

        document.addEventListener('touchend', () => {
          setTimeout(checkTextSelection, 200);
        });

        let touchStartTime = 0;
        let touchStartX = 0;
        let touchStartY = 0;
        let isSelectingGesture = false;

        document.addEventListener('touchstart', function(e) {
          if (e.touches && e.touches.length > 0) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
            isSelectingGesture = false;
          }
        }, { passive: true });

        document.addEventListener('touchmove', function(e) {
          if (e.touches && e.touches.length > 0) {
            if (Math.abs(e.touches[0].clientX - touchStartX) > 12 || Math.abs(e.touches[0].clientY - touchStartY) > 12) {
              isSelectingGesture = true;
            }
          }
        }, { passive: true });

        // Kindle 3-Zone Tap Navigation & Controlled Block Selection
        document.body.addEventListener('click', function(e) {
          // If in controlled selection mode, tapping selects sentence/block and bypasses Kindle page navigation
          if (isSelectionModeActive) {
            var target = e.target;
            if (target && (target.tagName === 'P' || target.tagName === 'SPAN' || target.tagName === 'EM' || target.tagName === 'STRONG' || target.tagName === 'H2')) {
              var text = (target.innerText || target.textContent || '').trim();
              if (text.length > 2) {
                var range = document.createRange();
                range.selectNodeContents(target);
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                sendMessage({ type: 'selection', text: text });
              }
            }
            return;
          }

          const sel = window.getSelection();
          if (sel && sel.toString().trim().length > 0) return;
          if (Date.now() - touchStartTime > 350) return;
          if (isSelectingGesture || Math.abs(e.clientX - touchStartX) > 15 || Math.abs(e.clientY - touchStartY) > 15) return;

          const clientX = e.clientX;
          const width = window.innerWidth;
          const ratio = clientX / width;

          if (ratio < 0.22) {
            // Left 22%: Kindle Page Backward
            isProgrammaticScroll = true;
            if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);
            window.scrollBy({ top: -window.innerHeight * 0.88, behavior: 'auto' });
            programmaticScrollTimer = setTimeout(function() {
              isProgrammaticScroll = false;
            }, 300);
            sendMessage({ type: 'prev_page' });
          } else if (ratio > 0.78) {
            // Right 22%: Kindle Page Forward
            isProgrammaticScroll = true;
            if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);
            window.scrollBy({ top: window.innerHeight * 0.88, behavior: 'auto' });
            programmaticScrollTimer = setTimeout(function() {
              isProgrammaticScroll = false;
            }, 300);
            sendMessage({ type: 'next_page' });
          } else {
            // Center 56%: Kindle Toggle Minimal Controls
            sendMessage({ type: 'toggle_controls' });
          }
        });

        function reportVisibleContent() {
          try {
            var content = document.getElementById('content');
            if (content) {
              var text = content.innerText || content.textContent || '';
              if (text && text.length > 20) {
                var scrollTop = window.scrollY || document.documentElement.scrollTop;
                var maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
                var ratio = Math.min(1, Math.max(0, scrollTop / maxScroll));
                var charOffset = Math.floor(ratio * text.length);
                var snippet = text.slice(Math.max(0, charOffset - 50), Math.min(text.length, charOffset + 1200));
                sendMessage({ type: 'page_text', text: snippet });
              }
            }
          } catch(e) {}
        }
        setTimeout(reportVisibleContent, 400);

        // Report scroll progress (throttled, ignored during programmatic scrolling)
        var scrollReportTimer = null;
        window.addEventListener('scroll', function() {
          if (isProgrammaticScroll) return;
          if (scrollReportTimer) return;
          scrollReportTimer = setTimeout(function() {
            scrollReportTimer = null;
            if (isProgrammaticScroll) return;
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            if (maxScroll > 0) {
              const ratio = Math.min(1, Math.max(0, scrollTop / maxScroll));
              sendMessage({ type: 'scroll_progress', ratio: ratio });
              reportVisibleContent();
            }
          }, 250);
        }, { passive: true });
      </script>
    </body>
    </html>
  `;
}

/**
 * Generates the HTML document for EPUB reading powered by JSZip chapter extraction with full centering and dynamic settings.
 */
function generateEpubReaderHtml(
  book: Book,
  theme: any,
  settings: ReaderSettings,
  epubBase64: string
): string {
  const fontCss = getFontFamilyCss(settings.fontFamily);
  const marginPx = settings.margin || 20;
  const textAlignVal = settings.textAlign || 'left';
  const hasBase64 = Boolean(epubBase64 && epubBase64.length > 100);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0, user-scalable=yes">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
      <style>
        :root {
          --bg-color: ${theme.bg};
          --text-color: ${theme.text};
          --link-color: ${theme.link};
          --border-color: ${theme.border};
          --card-color: ${theme.card};
          --font-size: ${settings.fontSize}px;
          --line-height: ${settings.lineHeight};
          --font-family: ${fontCss};
          --margin: ${marginPx}px;
          --text-align: ${textAlignVal};
        }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html {
          margin: 0;
          padding: 0;
          min-height: 100%;
          background-color: var(--bg-color);
          color: var(--text-color);
        }
        body {
          background-color: var(--bg-color);
          color: var(--text-color);
          font-family: var(--font-family);
          font-size: var(--font-size);
          line-height: var(--line-height);
          text-align: var(--text-align);
          margin: 0;
          padding: 0;
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          overflow-x: hidden;
          user-select: text;
          -webkit-user-select: text;
          box-sizing: border-box;
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        #content {
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          box-sizing: border-box;
          padding: 36px var(--margin) 140px var(--margin);
          font-size: var(--font-size);
          line-height: var(--line-height);
          text-align: var(--text-align);
          flex: 1;
        }
        .book-header {
          text-align: center;
          padding: 32px 0 20px 0;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 32px;
          width: 100%;
        }
        .book-title {
          font-size: calc(var(--font-size) + 8px);
          margin: 0 0 10px 0;
          line-height: 1.3;
          font-weight: 700;
        }
        .book-author {
          font-size: var(--font-size);
          color: var(--link-color);
          font-weight: 500;
          margin: 0 0 14px 0;
        }
        .format-tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 4px;
          background-color: var(--border-color);
          opacity: 0.85;
          letter-spacing: 0.5px;
        }
        .chapter { margin-bottom: 44px; width: 100%; }
        .chapter-title {
          font-size: calc(var(--font-size) + 4px);
          margin: 36px 0 18px 0;
          color: var(--link-color);
          border-bottom: 1px dashed var(--border-color);
          padding-bottom: 8px;
          font-weight: 600;
        }
        p { margin-bottom: 1.35em; text-indent: 1.25em; line-height: var(--line-height); }
        img { max-width: 100%; height: auto; display: block; margin: 16px auto; border-radius: 4px; }
        ::selection { background-color: #FDE047; color: #1E293B; }
        #fallback {
          display: none;
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          padding: 40px var(--margin);
          text-align: center;
          box-sizing: border-box;
        }
        .fallback-card {
          background-color: var(--card-color);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          padding: 24px;
        }
      </style>
    </head>
    <body>
      <div id="content">
        <div class="book-header">
          <h1 class="book-title">${book.title}</h1>
          <h3 class="book-author">By ${book.author}</h3>
          <div class="format-tag">EPUB · Distraction-Free Reader</div>
        </div>
        <div id="loading-indicator" style="text-align:center; padding: 40px 0; color: var(--link-color); font-weight: 600;">
          Unpacking EPUB chapters...
        </div>
      </div>

      <div id="fallback">
        <div class="fallback-card">
          <h2 style="margin: 0 0 8px 0;">${book.title}</h2>
          <div style="color: var(--link-color); margin-bottom: 16px;">By ${book.author} · EPUB Document</div>
          <p style="line-height: 1.6; margin-bottom: 20px;">
            Reading directly from device storage (${(book.fileSize / 1024 / 1024).toFixed(1)} MB).
            ${hasBase64 ? 'Extracting chapters...' : 'Ready offline.'}
          </p>
        </div>
      </div>

      <script>
        function sendMessage(data) {
          const json = JSON.stringify(data);
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(json);
          } else if (window.parent && window.parent !== window) {
            window.parent.postMessage(json, '*');
          }
        }

        window.applyReaderSettings = function(newSettings, newTheme) {
          if (!newSettings) return;
          var root = document.documentElement;
          var body = document.body;
          if (newTheme) {
            root.style.setProperty('--bg-color', newTheme.bg);
            root.style.setProperty('--text-color', newTheme.text);
            root.style.setProperty('--link-color', newTheme.link);
            root.style.setProperty('--border-color', newTheme.border);
            root.style.setProperty('--card-color', newTheme.card);
            body.style.backgroundColor = newTheme.bg;
            body.style.color = newTheme.text;
          }
          if (newSettings.fontSize) {
            root.style.setProperty('--font-size', newSettings.fontSize + 'px');
            var content = document.getElementById('content');
            if (content) content.style.fontSize = newSettings.fontSize + 'px';
          }
          if (newSettings.lineHeight) {
            root.style.setProperty('--line-height', newSettings.lineHeight);
            var content = document.getElementById('content');
            if (content) content.style.lineHeight = newSettings.lineHeight;
          }
          if (newSettings.fontFamily) {
            var ff = newSettings.fontFamily === 'serif'
              ? 'Georgia, Cambria, "Times New Roman", Times, serif'
              : newSettings.fontFamily === 'monospace'
              ? 'Menlo, Monaco, Consolas, "Courier New", monospace'
              : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
            root.style.setProperty('--font-family', ff);
            body.style.fontFamily = ff;
          }
          if (newSettings.margin !== undefined) {
            root.style.setProperty('--margin', newSettings.margin + 'px');
            var content = document.getElementById('content');
            if (content) {
              content.style.paddingLeft = newSettings.margin + 'px';
              content.style.paddingRight = newSettings.margin + 'px';
            }
          }
          if (newSettings.textAlign) {
            root.style.setProperty('--text-align', newSettings.textAlign);
            var content = document.getElementById('content');
            if (content) content.style.textAlign = newSettings.textAlign;
          }
        };

        var isProgrammaticScroll = false;
        var programmaticScrollTimer = null;

        var isSelectionModeActive = false;
        window.setSelectionMode = function(enabled) {
          isSelectionModeActive = Boolean(enabled);
          document.body.classList.toggle('selection-mode-active', isSelectionModeActive);
          if (!isSelectionModeActive) {
            window.clearSelection();
          }
        };

        window.goToPage = function(page, total) {
          var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          if (maxScroll > 0 && total > 0) {
            var ratio = Math.max(0, Math.min(1, (page - 1) / (total - 1 || 1)));
            isProgrammaticScroll = true;
            if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);
            window.scrollTo({ top: ratio * maxScroll, behavior: 'auto' });
            programmaticScrollTimer = setTimeout(function() {
              isProgrammaticScroll = false;
            }, 300);
          }
        };

        window.clearSelection = function() {
          if (window.getSelection) {
            var sel = window.getSelection();
            if (sel.removeAllRanges) sel.removeAllRanges();
            else if (sel.empty) sel.empty();
          }
        };

        window.addEventListener('message', function(e) {
          try {
            var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
            if (data && data.type === 'apply_settings') {
              window.applyReaderSettings(data.settings, data.theme);
            } else if (data && data.type === 'go_to_page') {
              window.goToPage(data.page, data.total);
            } else if (data && data.type === 'clear_selection') {
              window.clearSelection();
            } else if (data && data.type === 'set_selection_mode') {
              window.setSelectionMode(data.enabled);
            }
          } catch (err) {}
        });

        const epubDataString = "${epubBase64}";

        async function initEpubEngine() {
          if (!epubDataString || epubDataString.length < 50) {
            const loader = document.getElementById('loading-indicator');
            if (loader) loader.style.display = 'none';
            document.getElementById('fallback').style.display = 'block';
            return;
          }

          try {
            const rawData = atob(epubDataString);
            const bytes = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; i++) {
              bytes[i] = rawData.charCodeAt(i);
            }

            const zip = await JSZip.loadAsync(bytes);
            const htmlEntries = [];

            zip.forEach((path, entry) => {
              const lower = path.toLowerCase();
              if (!entry.dir && (lower.endsWith('.xhtml') || lower.endsWith('.html') || lower.endsWith('.htm'))) {
                htmlEntries.push({ path: path, entry: entry });
              }
            });

            htmlEntries.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' }));

            if (htmlEntries.length === 0) {
              const loader = document.getElementById('loading-indicator');
              if (loader) loader.style.display = 'none';
              document.getElementById('fallback').style.display = 'block';
              return;
            }

            let fullHtml = '<div class="book-header"><h1 class="book-title">${book.title}</h1><h3 class="book-author">By ${book.author}</h3><div class="format-tag">EPUB · ${(book.fileSize / 1024 / 1024).toFixed(1)} MB</div></div>';
            for (const item of htmlEntries) {
              try {
                const text = await item.entry.async('text');
                const bodyMatch = text.match(/<body[^>]*>([\\s\\S]*?)<\\/body>/i);
                const bodyContent = bodyMatch ? bodyMatch[1] : text;
                const clean = bodyContent.replace(/<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>/gi, '');
                fullHtml += '<div class="chapter">' + clean + '</div>';
              } catch (e) {}
            }

            document.getElementById('content').innerHTML = fullHtml;
            sendMessage({ type: 'doc_info', numPages: Math.max(1, Math.round(fullHtml.length / 1500)), page: 1 });
            setTimeout(reportVisibleContent, 400);
          } catch (err) {
            console.warn('EPUB extraction error:', err);
            const loader = document.getElementById('loading-indicator');
            if (loader) loader.style.display = 'none';
            document.getElementById('fallback').style.display = 'block';
          }
        }

        // Text Selection Listeners
        let selectionTimeout = null;
        function checkTextSelection() {
          const sel = window.getSelection();
          const text = sel ? sel.toString().trim() : '';
          if (text && text.length > 2) {
            sendMessage({ type: 'selection', text: text });
          }
        }

        document.addEventListener('selectionchange', () => {
          if (selectionTimeout) clearTimeout(selectionTimeout);
          selectionTimeout = setTimeout(checkTextSelection, 350);
        });

        document.addEventListener('mouseup', () => {
          setTimeout(checkTextSelection, 100);
        });

        document.addEventListener('touchend', () => {
          setTimeout(checkTextSelection, 200);
        });

        let touchStartTime = 0;
        let touchStartX = 0;
        let touchStartY = 0;
        let isSelectingGesture = false;

        document.addEventListener('touchstart', function(e) {
          if (e.touches && e.touches.length > 0) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
            isSelectingGesture = false;
          }
        }, { passive: true });

        document.addEventListener('touchmove', function(e) {
          if (e.touches && e.touches.length > 0) {
            if (Math.abs(e.touches[0].clientX - touchStartX) > 12 || Math.abs(e.touches[0].clientY - touchStartY) > 12) {
              isSelectingGesture = true;
            }
          }
        }, { passive: true });

        // Kindle 3-Zone Navigation & Controlled Block Selection
        document.body.addEventListener('click', function(e) {
          if (isSelectionModeActive) {
            var target = e.target;
            if (target && (target.tagName === 'P' || target.tagName === 'SPAN' || target.tagName === 'DIV' || target.tagName === 'H1' || target.tagName === 'H2' || target.tagName === 'H3')) {
              var text = (target.innerText || target.textContent || '').trim();
              if (text.length > 2) {
                var range = document.createRange();
                range.selectNodeContents(target);
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                sendMessage({ type: 'selection', text: text });
              }
            }
            return;
          }

          const sel = window.getSelection();
          if (sel && sel.toString().trim().length > 0) return;
          if (Date.now() - touchStartTime > 350) return;
          if (isSelectingGesture || Math.abs(e.clientX - touchStartX) > 15 || Math.abs(e.clientY - touchStartY) > 15) return;

          const clientX = e.clientX;
          const width = window.innerWidth;
          const ratio = clientX / width;

          if (ratio < 0.22) {
            isProgrammaticScroll = true;
            if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);
            window.scrollBy({ top: -window.innerHeight * 0.88, behavior: 'auto' });
            programmaticScrollTimer = setTimeout(function() {
              isProgrammaticScroll = false;
            }, 300);
            sendMessage({ type: 'prev_page' });
          } else if (ratio > 0.78) {
            isProgrammaticScroll = true;
            if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);
            window.scrollBy({ top: window.innerHeight * 0.88, behavior: 'auto' });
            programmaticScrollTimer = setTimeout(function() {
              isProgrammaticScroll = false;
            }, 300);
            sendMessage({ type: 'next_page' });
          } else {
            sendMessage({ type: 'toggle_controls' });
          }
        });

        function reportVisibleContent() {
          try {
            var content = document.getElementById('content');
            if (content) {
              var text = content.innerText || content.textContent || '';
              if (text && text.length > 20) {
                var scrollTop = window.scrollY || document.documentElement.scrollTop;
                var maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
                var ratio = Math.min(1, Math.max(0, scrollTop / maxScroll));
                var charOffset = Math.floor(ratio * text.length);
                var snippet = text.slice(Math.max(0, charOffset - 50), Math.min(text.length, charOffset + 1200));
                sendMessage({ type: 'page_text', text: snippet });
              }
            }
          } catch(e) {}
        }

        // Scroll reporting (throttled, ignored during programmatic scrolling)
        var scrollReportTimer = null;
        window.addEventListener('scroll', function() {
          if (isProgrammaticScroll) return;
          if (scrollReportTimer) return;
          scrollReportTimer = setTimeout(function() {
            scrollReportTimer = null;
            if (isProgrammaticScroll) return;
            var scrollTop = window.scrollY || document.documentElement.scrollTop;
            var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            if (maxScroll > 0) {
              var ratio = Math.min(1, Math.max(0, scrollTop / maxScroll));
              sendMessage({ type: 'scroll_progress', ratio: ratio });
              reportVisibleContent();
            }
          }, 250);
        }, { passive: true });

        if (typeof JSZip !== 'undefined') {
          initEpubEngine();
        } else {
          setTimeout(initEpubEngine, 400);
        }
      </script>
    </body>
    </html>
  `;
}

/**
 * Generates the HTML document for PDF reading powered by Mozilla PDF.js with centering and dynamic settings.
 */
function generatePdfReaderHtml(
  book: Book,
  theme: any,
  settings: ReaderSettings,
  pdfBase64: string,
  initialPage: number
): string {
  const marginPx = settings.margin || 20;
  const cleanBase64 = (pdfBase64 || '').replace(/[\r\n\s]/g, '');
  const hasBase64 = Boolean(cleanBase64 && cleanBase64.length > 50);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.5, user-scalable=yes">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
      <style>
        :root {
          --bg-color: ${theme.bg};
          --text-color: ${theme.text};
          --link-color: ${theme.link};
          --border-color: ${theme.border};
          --card-color: ${theme.card};
          --margin: ${marginPx}px;
        }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          min-height: 100%;
          background-color: var(--bg-color);
          color: var(--text-color);
          overflow: hidden;
        }
        body {
          background-color: var(--bg-color);
          color: var(--text-color);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          min-height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          user-select: text;
          -webkit-user-select: text;
          box-sizing: border-box;
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        body.theme-dark, body.theme-amoled {
          background-color: #0d1117;
        }
        body.theme-dark #pdf-canvas, body.theme-amoled #pdf-canvas {
          filter: invert(0.88) hue-rotate(180deg) contrast(0.95);
        }
        body.theme-sepia #pdf-canvas {
          filter: sepia(0.35) contrast(0.98);
        }
        body.theme-light #pdf-canvas {
          filter: none;
        }
        #pdf-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 800px;
          height: 100%;
          min-height: 100%;
          margin: auto;
          box-sizing: border-box;
          padding: 12px var(--margin);
        }
        .canvas-container {
          position: relative;
          margin: 0 auto;
          display: flex;
          justify-content: center;
          align-items: center;
          box-shadow: 0 4px 28px rgba(0, 0, 0, 0.22);
          border-radius: 6px;
          background: #FFFFFF;
          max-width: 100%;
          max-height: 100%;
          transition: box-shadow 0.2s ease;
          overflow: hidden;
        }
        #pdf-canvas {
          display: block;
          max-width: 100%;
          max-height: 100%;
          height: auto;
          border-radius: 6px;
          margin: 0 auto;
        }
        .textLayer {
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          opacity: 0.22;
          line-height: 1;
          user-select: text;
          -webkit-user-select: text;
          pointer-events: auto;
          z-index: 2;
        }
        .textLayer span {
          color: transparent;
          position: absolute;
          white-space: pre;
          cursor: text;
          transform-origin: 0% 0%;
          user-select: text;
          -webkit-user-select: text;
        }
        .textLayer ::selection {
          background: rgba(253, 224, 71, 0.6);
          color: transparent;
        }
        #fallback {
          display: none;
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
          padding: 40px var(--margin);
          text-align: center;
          box-sizing: border-box;
        }
        .fallback-card {
          background-color: var(--card-color);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .fallback-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 8px 0;
          color: var(--text-color);
        }
        .fallback-sub {
          font-size: 13px;
          color: var(--link-color);
          margin-bottom: 16px;
        }
        .fallback-desc {
          font-size: 13px;
          line-height: 1.6;
          color: var(--text-color);
          opacity: 0.85;
          margin-bottom: 20px;
        }
        .tap-zone-hint {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          padding: 10px;
          background-color: var(--bg-color);
          border-radius: 8px;
          border: 1px dashed var(--border-color);
        }
      </style>
    </head>
    <body class="theme-${settings.theme}">
      <div id="pdf-wrapper">
        <div class="canvas-container">
          <canvas id="pdf-canvas"></canvas>
          <div id="text-layer" class="textLayer"></div>
        </div>

        <div id="fallback">
          <div class="fallback-card">
            <h2 class="fallback-title">${book.title}</h2>
            <div class="fallback-sub">By ${book.author} · PDF Document</div>
            <p class="fallback-desc">
              Reading directly from device storage (${(book.fileSize / 1024 / 1024).toFixed(1)} MB).
              ${hasBase64 ? 'Rendering PDF pages...' : 'PDF content is ready offline.'}
            </p>
            <div class="tap-zone-hint">
              <span>◀ Tap Left: Prev Page</span>
              <span>Center: Menu</span>
              <span>Tap Right: Next Page ▶</span>
            </div>
          </div>
        </div>
      </div>

      <script>
        function sendMessage(data) {
          const json = JSON.stringify(data);
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(json);
          } else if (window.parent && window.parent !== window) {
            window.parent.postMessage(json, '*');
          }
        }

        const pdfDataString = ${JSON.stringify(cleanBase64)};
        let pdfDoc = null;
        let pageNum = ${initialPage || 1};
        let isRendering = false;

        window.clearSelection = function() {
          if (window.getSelection) {
            var sel = window.getSelection();
            if (sel.removeAllRanges) sel.removeAllRanges();
            else if (sel.empty) sel.empty();
          }
        };

        window.applyReaderSettings = function(newSettings, newTheme) {
          if (!newSettings) return;
          var root = document.documentElement;
          var body = document.body;
          if (newTheme) {
            root.style.setProperty('--bg-color', newTheme.bg);
            root.style.setProperty('--text-color', newTheme.text);
            root.style.setProperty('--link-color', newTheme.link);
            root.style.setProperty('--border-color', newTheme.border);
            root.style.setProperty('--card-color', newTheme.card);
            body.style.backgroundColor = newTheme.bg;
            body.style.color = newTheme.text;
          }
          if (newSettings.theme) {
            body.className = 'theme-' + newSettings.theme;
          }
          if (newSettings.margin !== undefined) {
            root.style.setProperty('--margin', newSettings.margin + 'px');
            var wrapper = document.getElementById('pdf-wrapper');
            if (wrapper) {
              wrapper.style.paddingLeft = newSettings.margin + 'px';
              wrapper.style.paddingRight = newSettings.margin + 'px';
            }
            if (pdfDoc && pageNum && !isRendering) {
              renderPage(pageNum);
            }
          }
        };

        window.goToPage = function(page) {
          if (pdfDoc && page >= 1 && page <= pdfDoc.numPages) {
            if (page !== pageNum) {
              window.clearSelection();
              pageNum = page;
              renderPage(pageNum);
            }
          }
        };

        window.addEventListener('message', function(e) {
          try {
            var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
            if (data && data.type === 'apply_settings') {
              window.applyReaderSettings(data.settings, data.theme);
            } else if (data && data.type === 'go_to_page') {
              window.goToPage(data.page);
            } else if (data && data.type === 'clear_selection') {
              window.clearSelection();
            }
          } catch (err) {}
        });

        async function initPdfEngine() {
          if (!pdfDataString || pdfDataString.length < 50) {
            document.getElementById('fallback').style.display = 'block';
            return;
          }

          try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            var rawData = atob(pdfDataString);
            var bytes = new Uint8Array(rawData.length);
            for (var i = 0; i < rawData.length; i++) {
              bytes[i] = rawData.charCodeAt(i);
            }

            var loadingTask = pdfjsLib.getDocument({ data: bytes });
            pdfDoc = await loadingTask.promise;
            sendMessage({ type: 'doc_info', numPages: pdfDoc.numPages, page: pageNum });
            renderPage(pageNum);
          } catch (err) {
            console.warn('PDF.js rendering notice:', err);
            document.getElementById('fallback').style.display = 'block';
          }
        }

        async function renderPage(num) {
          if (!pdfDoc || isRendering) return;
          isRendering = true;

          try {
            const page = await pdfDoc.getPage(num);
            const canvas = document.getElementById('pdf-canvas');
            const ctx = canvas.getContext('2d');

            const marginVal = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--margin')) || 16;
            const availWidth = Math.max(260, Math.min(window.innerWidth - (marginVal * 2), 800));
            const availHeight = Math.max(260, window.innerHeight - 24);

            const unscaledViewport = page.getViewport({ scale: 1 });
            const scaleX = availWidth / unscaledViewport.width;
            const scaleY = availHeight / unscaledViewport.height;

            // Fit page into both width and height so entire page is dead-centered and visible
            const scale = Math.min(scaleX, scaleY);
            const dpr = window.devicePixelRatio || 1;
            const viewport = page.getViewport({ scale: scale * dpr });
            const cssViewport = page.getViewport({ scale: scale });

            const renderWidth = Math.round(unscaledViewport.width * scale);
            const renderHeight = Math.round(unscaledViewport.height * scale);

            canvas.height = viewport.height;
            canvas.width = viewport.width;
            canvas.style.width = renderWidth + 'px';
            canvas.style.height = renderHeight + 'px';

            var container = document.querySelector('.canvas-container');
            if (container) {
              container.style.width = renderWidth + 'px';
              container.style.height = renderHeight + 'px';
            }

            var textLayer = document.getElementById('text-layer');
            if (textLayer) {
              textLayer.innerHTML = '';
              textLayer.style.width = renderWidth + 'px';
              textLayer.style.height = renderHeight + 'px';
            }

            const renderContext = {
              canvasContext: ctx,
              viewport: viewport
            };

            await page.render(renderContext).promise;

            // Extract page text for quotes and render selectable text layer on top of canvas
            try {
              const textContent = await page.getTextContent();
              if (textContent && textContent.items && textContent.items.length > 0) {
                const pageText = textContent.items
                  .map(function(item) { return item && 'str' in item ? item.str : ''; })
                  .join(' ')
                  .replace(/\\s+/g, ' ')
                  .trim();
                if (pageText.length > 0) {
                  sendMessage({ type: 'page_text', text: pageText, page: num });
                }

                if (textLayer && typeof pdfjsLib.renderTextLayer === 'function') {
                  pdfjsLib.renderTextLayer({
                    textContentSource: textContent,
                    textContent: textContent,
                    container: textLayer,
                    viewport: cssViewport,
                    textDivs: []
                  });
                }
              }
            } catch (tErr) {}
          } catch (err) {
            console.warn('Error rendering page:', err);
          } finally {
            isRendering = false;
          }
        }

        window.addEventListener('resize', function() {
          if (pdfDoc && pageNum && !isRendering) {
            renderPage(pageNum);
          }
        });

        // Text Selection Listeners
        let selectionTimeout = null;
        function checkSelection() {
          const sel = window.getSelection();
          const text = sel ? sel.toString().trim() : '';
          if (text && text.length > 2) {
            sendMessage({ type: 'selection', text: text });
          }
        }

        document.addEventListener('selectionchange', function() {
          if (selectionTimeout) clearTimeout(selectionTimeout);
          selectionTimeout = setTimeout(checkSelection, 300);
        });

        document.addEventListener('mouseup', function() {
          setTimeout(checkSelection, 100);
        });

        document.addEventListener('touchend', function() {
          setTimeout(checkSelection, 150);
        });

        // Touch tracking for distinguishing tap navigation from text selection gesture
        let touchStartTime = 0;
        let touchStartX = 0;
        let touchStartY = 0;
        let isSelectingGesture = false;

        document.addEventListener('touchstart', function(e) {
          if (e.touches && e.touches.length > 0) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
            isSelectingGesture = false;
          }
        }, { passive: true });

        document.addEventListener('touchmove', function(e) {
          if (e.touches && e.touches.length > 0) {
            if (Math.abs(e.touches[0].clientX - touchStartX) > 12 || Math.abs(e.touches[0].clientY - touchStartY) > 12) {
              isSelectingGesture = true;
            }
          }
        }, { passive: true });

        // Kindle 3-Zone Navigation (bypassed if text is selected or being dragged)
        document.body.addEventListener('click', function(e) {
          // If text is currently selected, do not treat as tap navigation
          const sel = window.getSelection();
          if (sel && sel.toString().trim().length > 0) {
            return;
          }

          // If user performed a long-press (selection gesture), do not navigate
          if (Date.now() - touchStartTime > 350) {
            return;
          }

          // If finger dragged across screen, do not navigate
          if (isSelectingGesture || Math.abs(e.clientX - touchStartX) > 15 || Math.abs(e.clientY - touchStartY) > 15) {
            return;
          }

          const clientX = e.clientX;
          const width = window.innerWidth;
          const ratio = clientX / width;

          if (ratio < 0.22) {
            // Left 22%: Prev Page
            if (pdfDoc && pageNum > 1) {
              window.clearSelection();
              pageNum--;
              renderPage(pageNum);
            }
            sendMessage({ type: 'prev_page' });
          } else if (ratio > 0.78) {
            // Right 22%: Next Page
            if (pdfDoc && pageNum < pdfDoc.numPages) {
              window.clearSelection();
              pageNum++;
              renderPage(pageNum);
            }
            sendMessage({ type: 'next_page' });
          } else {
            // Center 56%: Toggle menu overlay
            sendMessage({ type: 'toggle_controls' });
          }
        });

        // Initialize PDF rendering
        if (typeof pdfjsLib !== 'undefined') {
          initPdfEngine();
        } else {
          setTimeout(initPdfEngine, 400);
        }
      </script>
    </body>
    </html>
  `;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
  webview: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
  webIframe: {
    width: '100%',
    height: '100%',
    borderWidth: 0,
    backgroundColor: 'transparent',
    display: 'flex',
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
