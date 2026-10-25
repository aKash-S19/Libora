import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Book, BookFormat } from '../types';
import { StorageService } from '../storage';
import { arrayBufferToBase64 } from '../utils/binary';

export class ImporterService {
  /**
   * Prompts the user to pick a PDF or EPUB file from device storage,
   * copies it to the app's persistent storage, creates the book record,
   * and saves it.
   */
  static async pickAndImportBook(): Promise<Book | null> {
    try {
      await StorageService.initDirectories();

      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/epub+zip', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      const fileName = asset.name;
      const fileUri = asset.uri;
      const fileSize = asset.size || 0;

      const book = await this.importFileFromUri(fileUri, fileName, fileSize, 'local');

      // If text file or web file object, cache content for offline reading
      try {
        if (asset.file && typeof (asset.file as any).text === 'function') {
          const text = await (asset.file as any).text();
          if (text) {
            await AsyncStorage.setItem(`@libora_book_content_${book.id}`, text);
          }
        }
      } catch {}

      return book;
    } catch (error) {
      console.error('Error importing book:', error);
      throw error;
    }
  }

  /**
   * Imports a book from a local file URI (e.g. cache or download folder).
   */
  static async importFileFromUri(
    sourceUri: string,
    fileName: string,
    fileSize: number,
    source: 'local' | 'openlibrary' | 'gutenberg' | 'url' | 'internetarchive' = 'local'
  ): Promise<Book> {
    await StorageService.initDirectories();

    const bookId = `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const extension = this.getExtension(fileName);
    const format = this.determineFormat(fileName);

    const destinationDir = StorageService.getBooksDirectory();
    const destinationUri = `${destinationDir}${bookId}.${extension}`;

    let finalFileUri = destinationUri;
    let copied = false;

    // 1. If remote HTTP/HTTPS URL, use FileSystem.downloadAsync
    if (sourceUri.startsWith('http://') || sourceUri.startsWith('https://')) {
      try {
        const dlRes = await FileSystem.downloadAsync(sourceUri, destinationUri);
        if (dlRes && dlRes.uri) {
          copied = true;
        }
      } catch (dlErr) {
        console.warn('downloadAsync remote failed:', dlErr);
      }
    }

    // 2. Local File / Content Provider: FileSystem.copyAsync
    if (!copied) {
      try {
        await FileSystem.copyAsync({
          from: sourceUri,
          to: destinationUri,
        });
        const check = await FileSystem.getInfoAsync(destinationUri);
        if (check.exists && (check.size === undefined || check.size > 0)) {
          copied = true;
        }
      } catch {
        // Expected in Expo Go when sourceUri is in unscoped cache directory
      }
    }

    // 3. Fallback: Base64 direct read & write
    if (!copied) {
      try {
        const fileContent = await FileSystem.readAsStringAsync(sourceUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (fileContent && fileContent.length > 50) {
          await FileSystem.writeAsStringAsync(destinationUri, fileContent, {
            encoding: FileSystem.EncodingType.Base64,
          });
          copied = true;
        }
      } catch {
        // Handled by ArrayBuffer stream fallback below
      }
    }

    // 4. Stream Fallback: Read via fetch ArrayBuffer (Zero Response.blob overhead, fast & universal)
    if (!copied) {
      try {
        const response = await fetch(sourceUri);
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer && arrayBuffer.byteLength > 0) {
          const base64Data = arrayBufferToBase64(arrayBuffer);
          if (base64Data && base64Data.length > 0) {
            await FileSystem.writeAsStringAsync(destinationUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            copied = true;

            // Cache in AsyncStorage for instant offline reader access
            const clean = base64Data.replace(/\s+/g, '');
            if (format === 'pdf') {
              await AsyncStorage.setItem(`@libora_book_pdf_${bookId}`, clean);
            } else if (format === 'epub') {
              await AsyncStorage.setItem(`@libora_book_epub_${bookId}`, clean);
            }
          }
        }
      } catch (fetchErr) {
        console.warn('Stream copy note:', fetchErr);
      }
    }

    // 5. If destination copy failed completely, keep sourceUri directly
    if (!copied) {
      console.log('Using original sourceUri directly for book:', sourceUri);
      finalFileUri = sourceUri;
    }

    // 6. Pre-cache base64 in AsyncStorage for rock-solid, offline instant reading
    try {
      const targetUri = copied ? destinationUri : finalFileUri;
      if (format === 'pdf' || format === 'epub') {
        const cacheKey = format === 'pdf' ? `@libora_book_pdf_${bookId}` : `@libora_book_epub_${bookId}`;
        const existing = await AsyncStorage.getItem(cacheKey);
        if (!existing || existing.length < 50) {
          let b64 = '';
          try {
            b64 = await FileSystem.readAsStringAsync(targetUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          } catch {
            try {
              const res = await fetch(targetUri);
              const buf = await res.arrayBuffer();
              b64 = arrayBufferToBase64(buf);
            } catch {}
          }

          if (b64 && b64.length > 50) {
            await AsyncStorage.setItem(cacheKey, b64.replace(/\s+/g, ''));
          }
        }
      }
    } catch {}

    // Check size if not provided
    let finalSize = fileSize;
    if (!finalSize) {
      try {
        const info = await FileSystem.getInfoAsync(finalFileUri);
        if (info.exists && typeof info.size === 'number') {
          finalSize = info.size;
        }
      } catch {}
    }

    // Extract title & author from filename
    const { title, author } = this.parseTitleAndAuthor(fileName);

    const book: Book = {
      id: bookId,
      title,
      author,
      fileUri: finalFileUri,
      format,
      fileSize: finalSize,
      pageCount: format === 'pdf' ? 100 : 250, // Updated once read or loaded
      currentPage: 1,
      readingProgress: 0,
      status: 'want-to-read',
      collections: [],
      addedAt: Date.now(),
      source,
      isPublicDomain: source === 'gutenberg',
    };

    await StorageService.saveBook(book);

    await StorageService.logActivity({
      id: `act_${Date.now()}`,
      type: 'add_book',
      title: `Added "${book.title}" to library`,
      subtitle: `By ${book.author} (${format.toUpperCase()})`,
      timestamp: Date.now(),
      bookId: book.id,
    });

    return book;
  }

  /**
   * Imports a book from a direct online URL (PDF or EPUB).
   */
  static async importFromUrl(url: string, customTitle?: string, customAuthor?: string): Promise<Book> {
    await StorageService.initDirectories();

    const cleanUrl = url.trim();
    const urlFilename = cleanUrl.split('/').pop()?.split('?')[0] || 'imported_book.pdf';
    const bookId = `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const extension = this.getExtension(urlFilename);
    const format = this.determineFormat(urlFilename);

    const destinationDir = StorageService.getBooksDirectory();
    const destinationUri = `${destinationDir}${bookId}.${extension}`;

    const downloadRes = await FileSystem.downloadAsync(cleanUrl, destinationUri);

    let fileSize = 0;
    const fileInfo = await FileSystem.getInfoAsync(downloadRes.uri);
    if (fileInfo.exists && typeof fileInfo.size === 'number') {
      fileSize = fileInfo.size;
    }

    const { title, author } = this.parseTitleAndAuthor(urlFilename);

    const book: Book = {
      id: bookId,
      title: customTitle || title,
      author: customAuthor || author,
      fileUri: downloadRes.uri,
      format,
      fileSize,
      pageCount: format === 'pdf' ? 100 : 250,
      currentPage: 1,
      readingProgress: 0,
      status: 'want-to-read',
      collections: [],
      addedAt: Date.now(),
      source: 'url',
    };

    await StorageService.saveBook(book);

    await StorageService.logActivity({
      id: `act_${Date.now()}`,
      type: 'add_book',
      title: `Added "${book.title}" from URL`,
      subtitle: `By ${book.author}`,
      timestamp: Date.now(),
      bookId: book.id,
    });

    return book;
  }

  /**
   * Initializes storage directories if needed.
   * Does not preload any books so users start with a clean shelf.
   */
  static async seedStarterBooksIfEmpty(): Promise<void> {
    await StorageService.initDirectories();
  }

  private static determineFormat(fileName: string): BookFormat {
    const ext = this.getExtension(fileName).toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (ext === 'epub') return 'epub';
    return 'txt';
  }

  private static getExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop() || 'pdf' : 'pdf';
  }

  private static parseTitleAndAuthor(fileName: string): { title: string; author: string } {
    // Remove extension
    const base = fileName.replace(/\.[^/.]+$/, '').trim();

    // Check pattern: "Title - Author" or "Author - Title"
    if (base.includes(' - ')) {
      const parts = base.split(' - ');
      if (parts.length >= 2) {
        return {
          title: this.cleanString(parts[0]),
          author: this.cleanString(parts[1]),
        };
      }
    }

    if (base.includes('_-_')) {
      const parts = base.split('_-_');
      if (parts.length >= 2) {
        return {
          title: this.cleanString(parts[0].replace(/_/g, ' ')),
          author: this.cleanString(parts[1].replace(/_/g, ' ')),
        };
      }
    }

    if (base.includes(' by ')) {
      const parts = base.split(' by ');
      return {
        title: this.cleanString(parts[0]),
        author: this.cleanString(parts[1]),
      };
    }

    // Fallback: title from filename, unknown author
    return {
      title: this.cleanString(base.replace(/[-_]/g, ' ')),
      author: 'Unknown Author',
    };
  }

  private static cleanString(str: string): string {
    return str
      .replace(/[^\w\s.,!?'"-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Scans device by allowing multi-file selection from any folder
   * (Downloads, Documents, Books) and previewing them with metadata before import.
   */
  static async scanDeviceForBooks(): Promise<import('../types').ScannedBookFile[]> {
    try {
      await StorageService.initDirectories();
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/epub+zip', 'text/plain'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets) {
        return [];
      }

      return result.assets.map((asset) => {
        const format = this.determineFormat(asset.name);
        const { title, author } = this.parseTitleAndAuthor(asset.name);
        return {
          uri: asset.uri,
          name: asset.name,
          size: asset.size || 0,
          format,
          title,
          author,
          isSelected: true,
        };
      });
    } catch (e) {
      console.error('Error scanning device for books:', e);
      return [];
    }
  }

  /**
   * Batch imports selected scanned files into Libora's persistent library.
   */
  static async batchImportBooks(
    files: import('../types').ScannedBookFile[]
  ): Promise<Book[]> {
    const importedBooks: Book[] = [];
    for (const file of files) {
      try {
        const book = await this.importFileFromUri(
          file.uri,
          file.name,
          file.size,
          'local'
        );
        importedBooks.push(book);
      } catch (err) {
        console.warn(`Failed to import ${file.name}:`, err);
      }
    }
    return importedBooks;
  }
}
