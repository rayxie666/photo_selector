## ADDED Requirements

### Requirement: System automatically flags problematic photos
The system SHALL automatically flag photos that have exposure or brightness issues for user review.

#### Scenario: Flag overexposed photo
- **WHEN** a photo is detected as overexposed
- **THEN** the photo is added to the "flagged" list for review

#### Scenario: Flag underexposed photo
- **WHEN** a photo is detected as underexposed
- **THEN** the photo is added to the "flagged" list for review

#### Scenario: Flag too dark photo
- **WHEN** a photo is detected as too dark
- **THEN** the photo is added to the "flagged" list for review

#### Scenario: Flag too bright photo
- **WHEN** a photo is detected as too bright
- **THEN** the photo is added to the "flagged" list for review

### Requirement: User can filter photos by status
The system SHALL allow users to filter the gallery view by photo status.

#### Scenario: Filter to show only flagged photos
- **WHEN** user selects "Show flagged only" filter
- **THEN** the gallery displays only photos with exposure or brightness issues

#### Scenario: Filter to show only good photos
- **WHEN** user selects "Show good only" filter
- **THEN** the gallery displays only photos without any issues

#### Scenario: Show all photos
- **WHEN** user selects "Show all" filter
- **THEN** the gallery displays all uploaded photos

### Requirement: User can manually override photo status
The system SHALL allow users to manually mark or unmark photos as flagged.

#### Scenario: User marks good photo as flagged
- **WHEN** user clicks the flag button on a photo without issues
- **THEN** the photo is added to the flagged list

#### Scenario: User unflags a photo
- **WHEN** user clicks the unflag button on a flagged photo
- **THEN** the photo is removed from the flagged list

### Requirement: System displays flagged photo count
The system SHALL display the count of flagged photos and total photos.

#### Scenario: Display counts in header
- **WHEN** photos have been analyzed
- **THEN** the system displays "X flagged / Y total" in the header

#### Scenario: Update counts after filtering
- **WHEN** user marks or unmarks photos
- **THEN** the flagged count updates immediately

### Requirement: User can batch select flagged photos
The system SHALL allow users to select all flagged photos at once.

#### Scenario: Select all flagged photos
- **WHEN** user clicks "Select all flagged"
- **THEN** all photos in the flagged list are selected

#### Scenario: Deselect all
- **WHEN** user clicks "Deselect all"
- **THEN** all selected photos are deselected

### Requirement: User can delete selected photos from gallery
The system SHALL allow users to remove selected photos from the gallery view.

#### Scenario: Delete single selected photo
- **WHEN** user selects a photo and clicks delete
- **THEN** the photo is removed from the gallery

#### Scenario: Delete multiple selected photos
- **WHEN** user selects multiple photos and clicks delete
- **THEN** all selected photos are removed from the gallery
