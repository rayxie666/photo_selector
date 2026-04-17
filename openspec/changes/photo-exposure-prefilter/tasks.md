## 1. Project Setup

- [x] 1.1 Initialize Vite project with React and TypeScript template
- [x] 1.2 Install core dependencies (react-i18next, tailwindcss)
- [x] 1.3 Set up Tailwind CSS with shadcn/ui configuration
- [x] 1.4 Install shadcn/ui components (Button, Card, Badge, Progress, Dialog)
- [x] 1.5 Create basic folder structure (components, hooks, utils, locales, types)

## 2. Internationalization Setup

- [x] 2.1 Configure react-i18next with language detection
- [x] 2.2 Create English translation file (en.json)
- [x] 2.3 Create Chinese translation file (zh.json)
- [x] 2.4 Implement LanguageSwitcher component with EN/中 toggle
- [x] 2.5 Add language persistence to localStorage

## 3. Photo Upload Implementation

- [x] 3.1 Create PhotoUploader component with file picker button
- [x] 3.2 Implement drag-and-drop zone with visual feedback
- [x] 3.3 Add file type validation for supported formats (JPEG, PNG, WebP, HEIC)
- [x] 3.4 Integrate libraw.js for raw format support (CR2, NEF, ARW, DNG)
- [x] 3.5 Create progress indicator component for batch uploads
- [x] 3.6 Implement file reading with FileReader API

## 4. Image Analysis Core

- [x] 4.1 Create image analysis utility using Canvas API
- [x] 4.2 Implement histogram calculation function
- [x] 4.3 Implement luminosity calculation (L = 0.299*R + 0.587*G + 0.114*B)
- [x] 4.4 Create exposure analysis function (detect overexposed/underexposed)
- [x] 4.5 Create brightness analysis function (detect too dark/too bright)
- [x] 4.6 Implement highlight clipping detection (>5% pixels at 255)
- [x] 4.7 Implement shadow clipping detection (>5% pixels at 0)
- [x] 4.8 Set up Web Worker for background processing

## 5. State Management

- [x] 5.1 Define TypeScript types for Photo, AnalysisResult, AppState
- [x] 5.2 Create PhotoContext with useReducer for global state
- [x] 5.3 Implement photo add/remove actions
- [x] 5.4 Implement analysis result update actions
- [x] 5.5 Implement filter state (all/flagged/good)
- [x] 5.6 Create settings context for configurable thresholds

## 6. Gallery View

- [x] 6.1 Create PhotoGallery component with responsive grid layout
- [x] 6.2 Create PhotoThumbnail component with status badges
- [x] 6.3 Implement exposure status badge (red overexposed, blue underexposed, green correct)
- [x] 6.4 Implement brightness status badge (moon for dark, sun for bright)
- [x] 6.5 Add selection checkbox overlay on thumbnails
- [x] 6.6 Implement photo count display (X flagged / Y total)

## 7. Photo Filtering and Actions

- [x] 7.1 Create FilterBar component with filter buttons (All, Flagged, Good)
- [x] 7.2 Implement filter logic in gallery display
- [x] 7.3 Add manual flag/unflag toggle button on photos
- [x] 7.4 Implement "Select all flagged" button
- [x] 7.5 Implement "Deselect all" button
- [x] 7.6 Implement delete selected photos functionality

## 8. Settings Panel

- [x] 8.1 Create SettingsDialog component
- [x] 8.2 Add brightness threshold sliders (dark/bright)
- [x] 8.3 Add exposure sensitivity configuration
- [x] 8.4 Persist settings to localStorage
- [x] 8.5 Add reset to defaults button

## 9. Main Application Layout

- [x] 9.1 Create App layout with header, main content, and footer
- [x] 9.2 Integrate LanguageSwitcher in header
- [x] 9.3 Integrate PhotoUploader in main content area
- [x] 9.4 Integrate PhotoGallery with FilterBar
- [x] 9.5 Add Settings button with SettingsDialog

## 10. Testing and Polish

- [x] 10.1 Test with various image formats (JPEG, PNG, raw files)
- [x] 10.2 Test language switching between EN and 中文
- [x] 10.3 Test responsive design on mobile viewport
- [x] 10.4 Add loading states and error handling
- [x] 10.5 Verify all translations are complete in both languages
