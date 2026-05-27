## MODIFIED Requirements

### Requirement: System automatically flags problematic photos
The system SHALL automatically demote photos that fail technical analysis (exposure, brightness, clipping, gray-flat, pure-black, blur) by setting their status to `rejected_tech` with a `rejectionReason` recording the specific defect, instead of toggling a boolean `isFlagged`.

#### Scenario: Stage 1 runs automatically after upload
- **WHEN** a photo finishes uploading and analysis completes
- **THEN** if any technical defect is detected the photo's status becomes `rejected_tech`, otherwise the status remains `pending`

#### Scenario: Rejection reason recorded
- **WHEN** a photo is set to `rejected_tech`
- **THEN** `rejectionReason` is set to the specific defect (e.g. `overexposed`, `blurry`, `gray_flat`, etc.)

### Requirement: User can filter photos by status
The system SHALL allow users to filter the gallery by any photo lifecycle status (`pending`, `rejected_tech`, `rejected_ai`, `rejected_pk`, `finalist`) or `all`, replacing the previous `flagged / good / all` filter.

#### Scenario: Filter to technical rejects
- **WHEN** user selects the `rejected_tech` filter
- **THEN** the gallery displays only photos rejected at Stage 1

### Requirement: User can manually override photo status
The system SHALL allow users to manually move a photo between statuses, with the available transitions constrained by the state machine (e.g. a `pending` photo may be moved to `rejected_tech` or `finalist`; a `rejected_*` photo may be restored).

#### Scenario: Manually restore an auto-rejected photo
- **WHEN** user opens the context menu on a `rejected_tech` photo and clicks "restore"
- **THEN** the photo's status becomes `pending`

#### Scenario: Manually mark a good photo as rejected
- **WHEN** user opens the context menu on any non-rejected photo and clicks "mark as rejected"
- **THEN** the photo's status becomes `rejected_tech` with `rejectionReason: 'manual'`

## REMOVED Requirements

### Requirement: User can batch select flagged photos
**Reason**: Selection is no longer the primary affordance for acting on photos; bulk actions now operate on status sets (e.g. "restore all rejected_ai", "download all finalists") rather than on an explicit selection set.

### Requirement: User can delete selected photos from gallery
**Reason**: Deletion is replaced by the soft-delete state machine. Photos are never removed from memory; users transition them between statuses instead, preserving the ability to restore.
