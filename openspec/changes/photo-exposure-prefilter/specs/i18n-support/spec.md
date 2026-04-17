## ADDED Requirements

### Requirement: System supports English language
The system SHALL display all UI text in English when English is selected.

#### Scenario: Display UI in English
- **WHEN** user selects English as the language
- **THEN** all labels, buttons, and messages are displayed in English

#### Scenario: Default language is English
- **WHEN** user opens the application for the first time
- **THEN** the UI defaults to English

### Requirement: System supports Chinese language
The system SHALL display all UI text in Chinese (中文) when Chinese is selected.

#### Scenario: Display UI in Chinese
- **WHEN** user selects Chinese as the language
- **THEN** all labels, buttons, and messages are displayed in Chinese

#### Scenario: Chinese translations for key terms
- **WHEN** Chinese language is active
- **THEN** "Exposure" displays as "曝光" and "Brightness" displays as "明暗度"

### Requirement: User can switch language
The system SHALL provide a language switcher in the UI header.

#### Scenario: Switch from English to Chinese
- **WHEN** user clicks the language switcher and selects Chinese
- **THEN** the UI immediately updates to display Chinese text

#### Scenario: Switch from Chinese to English
- **WHEN** user clicks the language switcher and selects English
- **THEN** the UI immediately updates to display English text

### Requirement: System remembers language preference
The system SHALL persist the user's language preference in local storage.

#### Scenario: Remember language on reload
- **WHEN** user selects Chinese and reloads the page
- **THEN** the UI loads in Chinese

#### Scenario: Clear preference clears language setting
- **WHEN** user clears browser local storage and reloads
- **THEN** the UI defaults back to English

### Requirement: Language switcher displays current language
The system SHALL display the currently selected language in the switcher.

#### Scenario: Display current language indicator
- **WHEN** English is selected
- **THEN** the language switcher shows "EN" or English flag icon

#### Scenario: Display Chinese language indicator
- **WHEN** Chinese is selected
- **THEN** the language switcher shows "中" or Chinese flag icon
