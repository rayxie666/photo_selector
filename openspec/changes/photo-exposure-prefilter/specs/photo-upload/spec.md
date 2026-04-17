## ADDED Requirements

### Requirement: User can upload photos via file picker
The system SHALL provide a file picker that allows users to select one or more photo files from their device.

#### Scenario: Single photo upload
- **WHEN** user clicks the upload button and selects a single JPEG file
- **THEN** the system displays the photo in the gallery view

#### Scenario: Multiple photo upload
- **WHEN** user clicks the upload button and selects multiple photo files
- **THEN** the system displays all selected photos in the gallery view

### Requirement: User can upload photos via drag and drop
The system SHALL allow users to drag and drop photo files onto a designated drop zone.

#### Scenario: Drag and drop single photo
- **WHEN** user drags a photo file onto the drop zone
- **THEN** the system accepts the file and displays it in the gallery view

#### Scenario: Drag and drop multiple photos
- **WHEN** user drags multiple photo files onto the drop zone
- **THEN** the system accepts all files and displays them in the gallery view

### Requirement: System supports common image formats
The system SHALL accept JPEG, PNG, WebP, and HEIC image formats.

#### Scenario: Upload JPEG image
- **WHEN** user uploads a file with .jpg or .jpeg extension
- **THEN** the system processes and displays the image

#### Scenario: Upload PNG image
- **WHEN** user uploads a file with .png extension
- **THEN** the system processes and displays the image

#### Scenario: Reject unsupported format
- **WHEN** user uploads a file with an unsupported extension (e.g., .txt)
- **THEN** the system displays an error message indicating the format is not supported

### Requirement: System supports raw image formats
The system SHALL accept raw image formats including CR2, NEF, ARW, and DNG.

#### Scenario: Upload Canon CR2 raw file
- **WHEN** user uploads a file with .cr2 extension
- **THEN** the system decodes the raw file and displays the preview image

#### Scenario: Upload Nikon NEF raw file
- **WHEN** user uploads a file with .nef extension
- **THEN** the system decodes the raw file and displays the preview image

### Requirement: System displays upload progress
The system SHALL display a progress indicator when processing uploaded photos.

#### Scenario: Progress indicator during upload
- **WHEN** user uploads multiple large photos
- **THEN** the system displays a progress bar showing the processing status

#### Scenario: Progress indicator completion
- **WHEN** all photos have been processed
- **THEN** the progress indicator disappears and the gallery view updates
