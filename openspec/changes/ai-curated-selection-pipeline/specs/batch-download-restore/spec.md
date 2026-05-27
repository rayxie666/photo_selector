## ADDED Requirements

### Requirement: System provides one-click download of all finalist photos
The system SHALL let the user download every photo with status `finalist` in a single action, choosing between writing to a chosen folder (File System Access API) or downloading a ZIP archive.

#### Scenario: Download to folder
- **WHEN** user clicks "download finalists → folder" and the browser supports `showDirectoryPicker`
- **THEN** the user is prompted to choose a folder, and every finalist photo's original file is written into it

#### Scenario: Download as ZIP fallback
- **WHEN** user clicks "download finalists → ZIP" (or the browser lacks File System Access API)
- **THEN** the system packages every finalist into a single ZIP archive triggered as a normal download

#### Scenario: Disabled when no finalists
- **WHEN** there are zero photos with status `finalist`
- **THEN** the download button is disabled with a tooltip explaining why

#### Scenario: Progress feedback for large batches
- **WHEN** downloading ≥ 10 finalist photos
- **THEN** the UI shows a progress indicator (`saving X / Y`) and reports any individual file failures without aborting the rest

### Requirement: System provides one-click bulk restore by rejection stage
The system SHALL provide separate "restore all" actions for each rejection stage so users can recover from any over-aggressive filter.

#### Scenario: Restore all technical rejects
- **WHEN** user clicks "restore all technical rejects"
- **THEN** every photo with status `rejected_tech` reverts to `pending` and is eligible to re-enter Stage 2 on the next pipeline run

#### Scenario: Restore all AI rejects
- **WHEN** user clicks "restore all AI rejects"
- **THEN** every photo with status `rejected_ai` reverts to `pending` (since their aesthetic scores are preserved, the pipeline can skip re-scoring)

#### Scenario: Restore all PK losers
- **WHEN** user clicks "restore all PK losers"
- **THEN** every photo with status `rejected_pk` becomes `finalist` directly (they had already passed Stages 1 and 2; the user has decided to override the PK outcome)

### Requirement: System supports per-photo restore
The system SHALL allow the user to restore an individual rejected photo via its thumbnail context menu.

#### Scenario: Restore single photo
- **WHEN** user opens the context menu on any rejected photo and clicks "restore"
- **THEN** that photo's status follows the same rules as the matching bulk restore action
