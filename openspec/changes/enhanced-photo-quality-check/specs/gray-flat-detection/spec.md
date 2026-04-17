## ADDED Requirements

### Requirement: Detect gray-flat images
The system SHALL analyze each photo's HSL saturation distribution to detect "dead gray" (死灰) images — photos with severely low overall saturation that make them unsuitable for post-processing.

#### Scenario: Image flagged as gray-flat
- **WHEN** the average HSL saturation across all pixels is below the configured `grayFlatThreshold` (default: 15%)
- **THEN** `AnalysisResult.isGrayFlat` SHALL be `true` and `isFlagged` SHALL be `true`

#### Scenario: Normal colorful image not flagged
- **WHEN** the average HSL saturation is at or above `grayFlatThreshold`
- **THEN** `AnalysisResult.isGrayFlat` SHALL be `false`

#### Scenario: Intentional monochrome not auto-removed
- **WHEN** an image is detected as gray-flat
- **THEN** the system SHALL flag it but NOT automatically delete it; the user retains full control

### Requirement: Gray-flat sensitivity setting
The system SHALL provide a configurable `grayFlatThreshold` in `AnalysisSettings` (range: 0–50%, default: 15%) to adjust detection sensitivity.

#### Scenario: User lowers threshold for monochrome-friendly mode
- **WHEN** user sets `grayFlatThreshold` to 5%
- **THEN** only near-completely desaturated images are flagged, preserving intentional low-saturation photography

#### Scenario: User raises threshold for strict color check
- **WHEN** user sets `grayFlatThreshold` to 30%
- **THEN** images with noticeably muted colors are also flagged
