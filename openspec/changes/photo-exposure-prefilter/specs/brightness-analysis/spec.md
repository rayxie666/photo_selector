## ADDED Requirements

### Requirement: System analyzes photo brightness
The system SHALL analyze each uploaded photo to determine its overall brightness level (明暗度).

#### Scenario: Analyze photo with correct brightness
- **WHEN** a photo has mean luminosity between 40 and 200
- **THEN** the system marks the photo as "correct brightness"

#### Scenario: Analyze photo that is too dark
- **WHEN** a photo has mean luminosity below 40
- **THEN** the system marks the photo as "too dark"

#### Scenario: Analyze photo that is too bright
- **WHEN** a photo has mean luminosity above 200
- **THEN** the system marks the photo as "too bright"

### Requirement: System calculates luminosity from RGB values
The system SHALL calculate luminosity using the standard formula: L = 0.299*R + 0.587*G + 0.114*B.

#### Scenario: Calculate luminosity for color photo
- **WHEN** a color photo is analyzed
- **THEN** the system calculates luminosity using weighted RGB values

#### Scenario: Calculate luminosity for grayscale photo
- **WHEN** a grayscale photo is analyzed
- **THEN** the system calculates luminosity directly from pixel values

### Requirement: System displays brightness indicator
The system SHALL display a visual indicator showing each photo's brightness status.

#### Scenario: Display too dark indicator
- **WHEN** a photo is marked as too dark
- **THEN** the system displays a dark/moon icon badge on the photo thumbnail

#### Scenario: Display too bright indicator
- **WHEN** a photo is marked as too bright
- **THEN** the system displays a bright/sun icon badge on the photo thumbnail

#### Scenario: Display correct brightness indicator
- **WHEN** a photo is marked as having correct brightness
- **THEN** the system displays no brightness warning badge

### Requirement: Brightness thresholds are configurable
The system SHALL allow users to adjust the brightness threshold values.

#### Scenario: User adjusts dark threshold
- **WHEN** user changes the "too dark" threshold from 40 to 60
- **THEN** photos with luminosity below 60 are marked as "too dark"

#### Scenario: User adjusts bright threshold
- **WHEN** user changes the "too bright" threshold from 200 to 180
- **THEN** photos with luminosity above 180 are marked as "too bright"
