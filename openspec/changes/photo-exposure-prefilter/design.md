## Context

This is a greenfield React + TypeScript web application for pre-filtering photos based on exposure and brightness analysis. The application will run entirely in the browser, performing client-side image analysis without requiring a backend server. Users upload photos (including raw formats), and the system automatically identifies those with technical quality issues.

Target users include photographers who need to quickly cull large photo collections and bilingual users who prefer Chinese or English interfaces.

## Goals / Non-Goals

**Goals:**
- Build a responsive React + TypeScript web application
- Support common image formats (JPEG, PNG) and raw formats (CR2, NEF, ARW, DNG)
- Analyze photos for exposure issues (overexposed/underexposed)
- Analyze photos for brightness issues (too dark/too bright)
- Provide clear visual feedback on flagged photos
- Support language switching between Chinese and English
- Client-side only processing (no backend required)

**Non-Goals:**
- Advanced AI-powered photo selection (quality scoring, face detection, similarity grouping) - these are future phases
- Photo editing capabilities
- Cloud storage or account management
- Mobile-native applications
- Batch export or printing features

## Decisions

### 1. React + TypeScript with Vite

**Decision**: Use Vite as the build tool with React 18 and TypeScript.

**Rationale**: Vite provides fast development builds and optimized production bundles. TypeScript ensures type safety for complex image processing logic.

**Alternatives considered**:
- Create React App: Slower builds, less modern tooling
- Next.js: Overkill for a client-only application without SSR needs

### 2. Client-Side Image Processing with Canvas API

**Decision**: Use the HTML5 Canvas API for image analysis, with libraw.js for raw format decoding.

**Rationale**: Canvas API is universally supported and provides direct pixel access for histogram analysis. Raw format support requires a specialized library.

**Alternatives considered**:
- WebGL: More complex, unnecessary for pixel-level analysis
- Web Workers: Will use for heavy processing to avoid UI blocking
- Server-side processing: Adds deployment complexity, privacy concerns

### 3. Histogram-Based Analysis

**Decision**: Use histogram analysis to determine exposure and brightness issues.

**Rationale**: Histogram analysis is computationally efficient and provides accurate exposure/brightness metrics:
- Overexposed: Histogram heavily weighted toward high values (>240)
- Underexposed: Histogram heavily weighted toward low values (<15)
- Too bright: Mean luminosity above threshold
- Too dark: Mean luminosity below threshold

**Alternatives considered**:
- Machine learning models: Too heavy for browser, slower
- Simple mean-only analysis: Less accurate for detecting clipping

### 4. i18n with react-i18next

**Decision**: Use react-i18next for internationalization.

**Rationale**: Industry standard for React i18n, supports dynamic language switching, JSON-based translations are easy to maintain.

**Alternatives considered**:
- Custom context-based solution: Reinventing the wheel
- FormatJS: More complex setup for our simple needs

### 5. State Management with React Context + useReducer

**Decision**: Use React Context with useReducer for global state management.

**Rationale**: The application state is relatively simple (photos list, analysis results, language). No need for heavy state management libraries.

**Alternatives considered**:
- Redux: Overkill for this application size
- Zustand: Good option but adds dependency for simple needs
- Jotai: Similar reasoning

### 6. UI Component Library: shadcn/ui

**Decision**: Use shadcn/ui with Tailwind CSS for UI components.

**Rationale**: Modern, accessible components that are copied into the project (not a dependency). Full control over styling, good TypeScript support.

**Alternatives considered**:
- Material UI: Heavier bundle, opinionated styling
- Chakra UI: Good but larger bundle size
- Custom components: Too much effort for standard UI elements

## Risks / Trade-offs

**[Risk] Raw format support may be incomplete** → Use libraw.js which supports major camera brands (Canon CR2, Nikon NEF, Sony ARW, Adobe DNG). Document unsupported formats clearly.

**[Risk] Large photo collections may slow browser** → Implement Web Workers for analysis, process photos in batches, show progress indicators.

**[Risk] Histogram thresholds may need tuning** → Make thresholds configurable in settings, allow users to adjust sensitivity.

**[Risk] Mobile performance concerns** → Test on mobile devices, consider limiting batch sizes on mobile, use responsive design.

**[Trade-off] Client-only vs server processing** → Chose client-only for privacy and simplicity. Trade-off is limited to browser capabilities and may struggle with very large files.
