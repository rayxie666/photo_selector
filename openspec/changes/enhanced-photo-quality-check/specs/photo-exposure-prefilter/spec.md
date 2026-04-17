## MODIFIED Requirements

### Requirement: Analysis result includes all quality defect flags
`AnalysisResult` SHALL include all detected quality issues: exposure status, brightness status, highlight/shadow clipping, gray-flat, pure-black, and blur detection. The `isFlagged` field SHALL be `true` if ANY of the following conditions hold:
- `exposureStatus !== 'correct'`
- `brightnessStatus !== 'correct'`
- `hasClippedHighlights === true`
- `hasClippedShadows === true`
- `isGrayFlat === true`
- `isPureBlack === true`
- `isBlurry === true`

#### Scenario: Photo with only blur issue is flagged
- **WHEN** exposure and brightness are correct but `isBlurry` is `true`
- **THEN** `isFlagged` SHALL be `true`

#### Scenario: Photo with only gray-flat issue is flagged
- **WHEN** exposure and brightness are correct but `isGrayFlat` is `true`
- **THEN** `isFlagged` SHALL be `true`

#### Scenario: Photo with only pure-black issue is flagged
- **WHEN** exposure and brightness are correct but `isPureBlack` is `true`
- **THEN** `isFlagged` SHALL be `true`

#### Scenario: Photo with no quality issues is not flagged
- **WHEN** all quality checks pass
- **THEN** `isFlagged` SHALL be `false`

### Requirement: Analysis settings include thresholds for all quality checks
`AnalysisSettings` SHALL include `grayFlatThreshold`, `pureBlackThreshold`, and `blurThreshold` in addition to existing settings. Each SHALL have a sensible default value applied when not explicitly configured.

#### Scenario: Default settings applied on first use
- **WHEN** the app is opened for the first time without saved settings
- **THEN** all new thresholds SHALL use their default values: `grayFlatThreshold: 15`, `pureBlackThreshold: 60`, `blurThreshold: 100`

#### Scenario: Existing saved settings remain intact
- **WHEN** a user has existing saved settings from a previous version
- **THEN** the existing fields SHALL be preserved and new fields SHALL fall back to defaults
