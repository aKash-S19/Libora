# Libora

> **Read. Remember. Share.**

Libora is a personal digital reading ecosystem built with **React Native**, **Expo SDK 57**, and **TypeScript**. It combines an immersive PDF & EPUB reading experience, offline-first local storage, personal knowledge management (highlights, notes, bookmarks, quote cards), Letterboxd-inspired reading identity and diary, and book discovery from Open Library and Project Gutenberg.

---

## 📱 Features

### 📖 Reading Experience
- **Universal Reader**: Focused, immersive PDF and EPUB reader powered by customizable themes: Light, Sepia, Dark, and AMOLED.
- **Typography Controls**: Font size (14–32 pt), font family (Serif, Sans-serif, Monospace), line spacing, and continuous vertical scroll toggle.
- **Reading Progress Persistence**: Automatically saves and restores exact page and percentage upon opening.
- **Text Interaction & Selection**: Floating popup when text is selected:
  - **Highlight**: 5 curated colors (Amber, Emerald, Sky, Rose, Lavender)
  - **Note**: Attach personal reflections to specific passages and locations
  - **Quote**: Save memorable quotes to your personal archive
  - **Copy & Share**: Native sharing and clipboard copying
- **Table of Contents & In-Book Search**: Quick jumping across chapters and content search within documents.

### 📚 Library & Bookshelf
- **Offline-First Storage**: Local document persistence in sandboxed app storage. No mandatory cloud upload of user PDF/EPUB binaries.
- **Multiple Import Sources**:
  - Local document picker for device PDFs & EPUBs
  - Direct web URL download (`.pdf`, `.epub`)
  - Curated public-domain literature catalog
- **Organization**: Custom collections (shelves), favorites, reading status filtering (Want to Read, Currently Reading, Finished), and sorting.
- **Starter Classics**: Pre-seeded with public-domain classics (*Meditations* by Marcus Aurelius, *The Metamorphosis* by Franz Kafka, *The Republic* by Plato) for instant offline reading.

### ✨ Designed Quote Card Studio
- Generates designed social media artifacts (inspired by editorial identity).
- 4 curated card palettes: Midnight, Paper, Terra, and Olive.
- Captures high-resolution PNG image snapshots using `react-native-view-shot` for 1-tap native Android sharing.

### 🌟 Letterboxd-Inspired Reading Identity & Social
- **Reading Profile**: Books read, average rating, reading streak, and 2026 reading goal tracker.
- **4 Favorites Showcase**: Letterboxd-style 4 favorite books display.
- **Reading Diary**: Star ratings (0.5–5.0), editorial reactions (*Life-changing*, *Thought-provoking*, *Couldn't put down*, *Poetic*), and public review sharing.
- **Social Discovery**: Search readers by username (`@handle`), view public profiles, follow friends, and share profile deep links (`libora://user/username`).

### 🌐 Discovery & Free Books
- **Open Library API Integration**: Search millions of titles, authors, and cover art.
- **Project Gutenberg Public Domain Catalog**: Pre-curated classic literature with direct, legal downloads.
- **Download Manager**: Real byte-by-byte download progress tracking with automatic addition to the local library.

### ☁️ Cloud & Offline Separation
- **Offline-First**: Complete functionality without an account.
- **Firebase Auth & Firestore**: Optional cloud synchronization for reading metadata, reviews, quotes, and profile without uploading user PDF/EPUB binaries.

---

## 🛠️ Tech Stack

- **Framework**: React Native 0.86 & Expo SDK 57
- **Routing**: Expo Router (file-based navigation in `src/app/`)
- **Language**: TypeScript (strict mode)
- **Local Persistence**: `@react-native-async-storage/async-storage` & `expo-file-system/legacy`
- **Cloud & Auth**: Firebase Auth & Cloud Firestore
- **Document & Share**: `expo-document-picker`, `expo-sharing`, `react-native-view-shot`
- **Reader Engine**: `react-native-webview` with embedded typography reflow bridge
- **Testing**: Jest & `ts-jest`
- **Linter**: ESLint 9 & `eslint-config-expo`

---

## 🚀 Remote Build & CI/CD (GitHub Actions)

As requested, **you do not need to install Android Studio, Gradle, or Expo locally**. The project is configured to build remotely via GitHub Actions.

### 1. Automated Android APK Build Workflow (`.github/workflows/build-android.yml`)
When you push code to GitHub:
1. Validates TypeScript types (`npm run typecheck`).
2. Runs ESLint analysis (`npx expo lint`).
3. Runs automated unit tests (`npm test`).
4. Generates Android native files (`npx expo prebuild`).
5. Compiles an Android APK via Gradle on GitHub's Ubuntu runner.
6. Uploads the universal **`libora-debug-apk`** artifact to the GitHub Actions run summary.

### 2. Downloading Your APK
1. Go to your repository on GitHub.
2. Click the **Actions** tab.
3. Select the latest **Build Libora Android APK** workflow run.
4. Scroll to **Artifacts** at the bottom of the page and download **`libora-debug-apk.zip`**.
5. Install the APK directly on any Android device!

### 3. Optional EAS Cloud Build (`eas.json`)
If you have an Expo EAS account:
```bash
npx eas build --platform android --profile preview
```

---

## 🧪 Automated Testing & Static Analysis

```bash
# Run unit tests
npm test

# Run TypeScript static analysis
npm run typecheck

# Run linter
npx expo lint
```

---

## 📁 Project Architecture

```
├── .github/
│   └── workflows/
│       ├── build-android.yml      # CI workflow for Gradle APK generation & artifact upload
│       └── eas-build.yml          # Optional EAS cloud build workflow
├── src/
│   ├── app/                       # Expo Router Screens
│   │   ├── (tabs)/
│   │   │   ├── index.tsx          # Home Screen (Continue reading, goal, activity)
│   │   │   ├── library.tsx        # Library Bookshelf (Grid/List, filter, import)
│   │   │   ├── browse.tsx         # Discovery (Open Library, Gutenberg)
│   │   │   └── profile.tsx        # Profile & Reading Identity
│   │   ├── reader/[id].tsx        # Immersive Reader Screen
│   │   ├── book/[id].tsx          # Book Details Screen
│   │   ├── quote-card.tsx         # Quote Card Studio & Share Screen
│   │   ├── highlights.tsx         # Highlights Archive Screen
│   │   ├── notes.tsx              # Reading Notes Screen
│   │   ├── search.tsx             # Global Archive Search Screen
│   │   ├── downloads.tsx          # Download Manager Screen
│   │   ├── settings.tsx           # Settings Screen
│   │   ├── collections/           # Custom Collections
│   │   ├── auth/                  # Firebase Auth Screens
│   │   └── user/[username].tsx    # Public Profile View
│   ├── components/                # Reusable UI Components
│   ├── context/                   # React Context Providers
│   ├── services/                  # Business Logic & APIs
│   ├── storage/                   # Local Offline Persistence
│   ├── theme/                     # Design System & Palette Tokens
│   ├── types/                     # TypeScript Domain Models
│   └── __tests__/                 # Automated Unit Tests
├── app.json                       # Expo Application Configuration
├── eas.json                       # EAS Build Profiles
└── package.json
```
