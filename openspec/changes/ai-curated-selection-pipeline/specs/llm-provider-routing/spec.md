## ADDED Requirements

### Requirement: System provides a unified LLM provider interface
The backend SHALL expose a single set of HTTP endpoints whose underlying LLM is selected per request, supporting at minimum: OpenAI, Anthropic, Google, and the locally installed Claude Code CLI.

#### Scenario: Provider selected via request header
- **WHEN** a request to `POST /api/critique/topk` includes header `X-LLM-Provider: anthropic`
- **THEN** the backend routes the call to the Anthropic provider implementation

#### Scenario: Unknown provider rejected
- **WHEN** the `X-LLM-Provider` header value is not one of the registered providers
- **THEN** the backend responds 400 with `{error: 'unknown_provider', available: [...]}`

### Requirement: Cloud LLM providers accept user-supplied credentials per request
Cloud-based providers (OpenAI, Anthropic, Google) SHALL accept an API key via the `Authorization` header and SHALL NOT use any server-side credentials.

#### Scenario: Missing API key for cloud provider
- **WHEN** a request selects a cloud provider but does not include an `Authorization` header
- **THEN** the backend responds 401 with `{error: 'missing_api_key', provider: '...'}`

### Requirement: Claude Code CLI provider invokes the local claude binary
The system SHALL provide a Claude Code CLI provider that invokes the `claude` executable from the user's PATH and parses its JSON output, requiring no API key.

#### Scenario: CLI provider used without API key
- **WHEN** a request selects `X-LLM-Provider: claude-cli` without an `Authorization` header
- **THEN** the backend invokes `claude -p <prompt> --output-format json` and parses the structured response

#### Scenario: CLI binary missing
- **WHEN** the `claude` binary is not found in PATH at request time
- **THEN** the backend responds 503 with `{error: 'cli_unavailable', hint: 'install Claude Code from claude.com/code'}`

#### Scenario: CLI provider passes images as file paths
- **WHEN** the CLI provider needs to send an image to `claude`
- **THEN** it writes the image to a temporary file, references the path in the prompt, and deletes the temp file after the CLI exits (regardless of success or failure)

### Requirement: System reports per-provider availability
The system SHALL expose `GET /api/llm/providers` returning the availability of each provider so the frontend can show health indicators.

#### Scenario: List provider availability
- **WHEN** the frontend requests `GET /api/llm/providers`
- **THEN** the backend responds with `[{id, requiresApiKey: bool, available: bool, reason?: string}]` for every registered provider
