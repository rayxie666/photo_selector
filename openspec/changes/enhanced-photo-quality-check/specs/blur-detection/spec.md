## ADDED Requirements

### Requirement: Detect out-of-focus images
The system SHALL apply a Laplacian convolution to detect blurry (虚焦) images that cannot be recovered through post-processing. A 3×3 Laplacian kernel ([0,1,0,1,-4,1,0,1,0]) is applied to the grayscale image and the variance of the response is computed; low variance indicates low sharpness.

#### Scenario: Blurry image flagged
- **WHEN** the Laplacian variance of the image is below `blurThreshold` (default: 100)
- **THEN** `AnalysisResult.isBlurry` SHALL be `true` and `isFlagged` SHALL be `true`

#### Scenario: Sharp image not flagged as blurry
- **WHEN** the Laplacian variance is at or above `blurThreshold`
- **THEN** `AnalysisResult.isBlurry` SHALL be `false`

#### Scenario: Analysis performed on downsized image
- **WHEN** an image exceeds 800px in either dimension
- **THEN** blur detection SHALL be performed on the already-downsampled version used for other analyses (no additional resize step required)

### Requirement: Blur sensitivity setting
The system SHALL provide a configurable `blurThreshold` in `AnalysisSettings` (range: 10–500, default: 100) allowing users to calibrate detection for their typical shooting conditions.

#### Scenario: Lower threshold for soft-focus style photography
- **WHEN** user sets `blurThreshold` to 30
- **THEN** only severely out-of-focus images are flagged, allowing intentional soft bokeh to pass

#### Scenario: Higher threshold for strict sharpness requirement
- **WHEN** user sets `blurThreshold` to 200
- **THEN** images with slight motion blur or missed focus are also flagged
