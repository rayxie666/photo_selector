## ADDED Requirements

### Requirement: System presents similar-cluster photos in pairwise comparison
The system SHALL render two photos from the same similarity cluster side by side and let the user pick the better one to advance.

#### Scenario: Two-photo cluster shows both at once
- **WHEN** a cluster contains exactly 2 photos and PK starts
- **THEN** the UI shows both photos as the only round; the chosen photo becomes `finalist`, the other becomes `rejected_pk`

#### Scenario: Larger clusters use single-elimination tournament
- **WHEN** a cluster contains N ≥ 3 photos
- **THEN** the UI presents N−1 rounds in single-elimination order (winner of round i faces photo[i+2] in round i+1); the final winner becomes `finalist`, all losers become `rejected_pk`

#### Scenario: AI recommendation hint
- **WHEN** a PK round renders
- **THEN** the UI annotates the photo with the higher aesthetic score as "AI suggested" but does not pre-select it

### Requirement: System provides synchronized zoom and pan across both compared photos
The two PK canvases SHALL share a single zoom/pan transform so that interacting with either canvas updates both identically.

#### Scenario: Mouse wheel zoom is synchronized
- **WHEN** user scrolls the mouse wheel over either canvas
- **THEN** both canvases zoom by the same factor, anchored at the cursor position over the source canvas, and the mirrored canvas applies the same scale at the corresponding relative position

#### Scenario: Pointer drag pans both canvases
- **WHEN** user drags either canvas
- **THEN** both canvases translate by the same offset

#### Scenario: Reset to fit
- **WHEN** user presses "fit" (or double-clicks)
- **THEN** both canvases reset to scale 1 (fit) and offset 0

### Requirement: System maintains acceptable interactivity under high resolution
The PK UI SHALL maintain at least 30 fps during zoom/pan on photos up to 4K resolution on a mid-tier laptop.

#### Scenario: Large image decoded off the main thread
- **WHEN** a photo larger than 8 megapixels is loaded for PK
- **THEN** decoding occurs in a Web Worker producing an `ImageBitmap`; the main thread renders only the bitmap

#### Scenario: Graceful downscale on slow devices
- **WHEN** the device frame rate drops below 30 fps for more than one second
- **THEN** the UI switches the rendered bitmap to a downscaled (e.g. 2K) variant and shows a "preview quality" badge

### Requirement: System reports PK progress and lets users skip
The system SHALL show the user how many clusters and rounds remain, and SHALL allow skipping any round.

#### Scenario: Progress indicator
- **WHEN** PK is active
- **THEN** the UI shows "cluster X of Y, round A of B"

#### Scenario: Skip defers decision to AI
- **WHEN** user clicks "skip"
- **THEN** the AI-suggested photo automatically wins the round
