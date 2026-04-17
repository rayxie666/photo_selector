## ADDED Requirements

### Requirement: Detect pure-black images
The system SHALL identify "dead black" (死黑) images — photos where an overwhelming portion of pixels have luminosity below 5, indicating virtually no recoverable detail in post-processing. This is distinct from normal underexposure which may still contain salvageable tonal information.

#### Scenario: Image flagged as pure-black
- **WHEN** the proportion of pixels with luminosity < 5 exceeds `pureBlackThreshold` (default: 60%)
- **THEN** `AnalysisResult.isPureBlack` SHALL be `true` and `isFlagged` SHALL be `true`

#### Scenario: Underexposed image with recoverable detail not flagged as pure-black
- **WHEN** the image is flagged as `underexposed` but extreme-dark pixel proportion is below `pureBlackThreshold`
- **THEN** `AnalysisResult.isPureBlack` SHALL be `false`

#### Scenario: Both underexposed and pure-black can be true simultaneously
- **WHEN** an image meets criteria for both `underexposed` exposure status and `isPureBlack`
- **THEN** both fields SHALL independently be set to their respective values

### Requirement: Pure-black sensitivity setting
The system SHALL provide a configurable `pureBlackThreshold` in `AnalysisSettings` (range: 20–90%, default: 60%) to define how extreme the darkness must be before flagging.

#### Scenario: Strict threshold for low-key photography
- **WHEN** user sets `pureBlackThreshold` to 80%
- **THEN** only images that are nearly entirely black are flagged, preserving intentional dark dramatic scenes
