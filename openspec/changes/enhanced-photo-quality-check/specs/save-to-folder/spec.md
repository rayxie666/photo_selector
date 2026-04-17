## ADDED Requirements

### Requirement: Save selected photos to a user-chosen folder
The system SHALL provide a "Save Selected" action that uses the File System Access API (`showDirectoryPicker`) to allow the user to choose a local directory and write all currently selected photos to it.

#### Scenario: User saves selected photos successfully
- **WHEN** user clicks "Save Selected" and selects a directory in the system picker
- **THEN** all selected photo files SHALL be written to that directory preserving their original filenames
- **AND** a success notification SHALL be shown indicating how many files were saved

#### Scenario: No photos selected
- **WHEN** no photos are selected
- **THEN** the "Save Selected" button SHALL be disabled

#### Scenario: User cancels directory picker
- **WHEN** user opens the directory picker and then cancels without selecting
- **THEN** no files are written and no error is shown

#### Scenario: File write error
- **WHEN** a file fails to write (e.g., permission denied)
- **THEN** the system SHALL show an error notification with the failure details and continue attempting to write remaining files

### Requirement: Browser compatibility fallback
The system SHALL detect support for `window.showDirectoryPicker` at runtime. When the API is unavailable, the "Save Selected" button SHALL be disabled with a tooltip explaining the limitation.

#### Scenario: Unsupported browser
- **WHEN** the user's browser does not support File System Access API (e.g., Firefox, Safari)
- **THEN** the "Save Selected" button SHALL be rendered as disabled
- **AND** a tooltip or helper text SHALL indicate "This feature requires Chrome or Edge"

#### Scenario: Supported browser
- **WHEN** the user's browser supports `showDirectoryPicker`
- **THEN** the "Save Selected" button SHALL be interactive and fully functional

### Requirement: Save progress feedback
The system SHALL display progress feedback when saving multiple files to avoid appearing frozen.

#### Scenario: Saving multiple files
- **WHEN** saving 10 or more selected photos
- **THEN** a progress indicator (e.g., toast notification) SHALL show current save progress (e.g., "Saving 5/20...")
