## ADDED Requirements

### Requirement: System represents each photo with an explicit lifecycle status
The system SHALL assign every photo a status from the set `{pending, rejected_tech, rejected_ai, rejected_pk, finalist}`, and store an optional `rejectionReason` string.

#### Scenario: Newly uploaded photo defaults to pending
- **WHEN** a user uploads a photo
- **THEN** the photo's status is `pending` and `rejectionReason` is unset

#### Scenario: Stage 1 marks technically defective photo
- **WHEN** Stage 1 detects a photo is overexposed / underexposed / gray-flat / pure-black / blurry
- **THEN** the photo's status becomes `rejected_tech` and `rejectionReason` records the specific defect

#### Scenario: Stage 2 marks low-aesthetic photo
- **WHEN** Stage 2 ranks a photo in the bottom N% of aesthetic scores
- **THEN** the photo's status becomes `rejected_ai` and `rejectionReason` is `low_aesthetic_score`

#### Scenario: Stage 3 marks PK loser
- **WHEN** a photo loses a head-to-head comparison
- **THEN** its status becomes `rejected_pk` and `rejectionReason` records the winning photo's id (e.g. `lost_pk_to:abc-123`)

#### Scenario: Photo advances to finalist
- **WHEN** a photo completes all applicable stages without rejection (including being the sole survivor of its similarity cluster)
- **THEN** its status becomes `finalist`

### Requirement: System allows restoring rejected photos individually or by batch
The system SHALL allow users to revert a photo's `rejected_*` status back to its prior pipeline position without re-running upstream analysis.

#### Scenario: Restore single technically rejected photo
- **WHEN** user clicks "restore" on a `rejected_tech` photo
- **THEN** the photo's status changes to `pending`, and it becomes eligible for Stage 2 on the next pipeline run

#### Scenario: Bulk restore all PK losers
- **WHEN** user clicks "restore all PK losers"
- **THEN** every photo whose status is `rejected_pk` reverts to `finalist` candidacy (i.e. status becomes `finalist`, since they had already passed Stage 2)

#### Scenario: Restore preserves analysis results
- **WHEN** any photo is restored
- **THEN** the photo's existing analysis data (technical scores, aesthetic score, embedding) is preserved and not recomputed

### Requirement: System filters and counts photos by status
The system SHALL allow users to filter the gallery by any single status or "all", and SHALL display a count for each status.

#### Scenario: Filter to finalists
- **WHEN** user selects the "finalist" filter
- **THEN** the gallery displays only photos with status `finalist`

#### Scenario: Status counts in header
- **WHEN** any photo's status changes
- **THEN** the per-status counts in the header update immediately
