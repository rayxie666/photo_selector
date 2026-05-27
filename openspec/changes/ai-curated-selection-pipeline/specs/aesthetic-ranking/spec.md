## ADDED Requirements

### Requirement: System scores every Stage-1-passing photo with a local aesthetic model
The system SHALL produce a numeric aesthetic score in `[0, 10]` for every photo whose status is `pending` after Stage 1, using a local model (LAION-Aesthetic-Predictor or NIMA).

#### Scenario: Batch scoring endpoint
- **WHEN** the frontend sends `POST /api/aesthetic/batch` with multipart images
- **THEN** the backend returns `[{id, score}]` where each `score` is a float in `[0, 10]`

#### Scenario: Stage 2 demotes the bottom slice
- **WHEN** Stage 2 completes scoring and the configured rejection ratio is `r`
- **THEN** the bottom `r` of photos by score have status set to `rejected_ai` with reason `low_aesthetic_score`

#### Scenario: Score is deterministic for identical input
- **WHEN** the same image is scored twice in succession
- **THEN** the two returned scores differ by at most 0.01

### Requirement: System offers optional LLM critique for top-ranked photos
After local scoring, the system SHALL allow users to request structured LLM critique for the top-K photos using their selected provider.

#### Scenario: Top-K critique endpoint
- **WHEN** the frontend sends `POST /api/critique/topk` with K images and a provider selection
- **THEN** the backend returns `[{id, score, composition, style, suggestion}]` where each text field is non-empty

#### Scenario: Critique results displayed alongside photos
- **WHEN** a photo has an LLM critique
- **THEN** the gallery displays the critique on hover or click of that photo's thumbnail

#### Scenario: K is user-configurable
- **WHEN** the user changes "Top-K critique count" in settings
- **THEN** the next pipeline run uses the new value, default 20

### Requirement: System estimates LLM cost before running critique
The system SHALL display an estimated token / dollar cost to the user before initiating an LLM critique batch.

#### Scenario: Cost estimation shown before run
- **WHEN** user opens the Stage 2 LLM critique panel with K photos queued
- **THEN** the UI shows `~X tokens, ~$Y` based on the selected provider's published pricing, and a "proceed" button

#### Scenario: No estimation for CLI provider
- **WHEN** the selected provider is `claude-cli`
- **THEN** the cost estimation displays "uses your Claude Code subscription"
