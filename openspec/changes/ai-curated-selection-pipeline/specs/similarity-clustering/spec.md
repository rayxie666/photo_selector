## ADDED Requirements

### Requirement: System computes a CLIP embedding for every Stage-2-passing photo
The system SHALL produce a 512-dimensional embedding using `open_clip` ViT-B/32 for every photo whose status is `pending` after Stage 2.

#### Scenario: Embedding endpoint returns vectors
- **WHEN** the frontend sends `POST /api/similarity/embed` with multipart images
- **THEN** the backend returns `[{id, embedding: number[512]}]`

### Requirement: System clusters photos into similarity groups
The system SHALL cluster embeddings with DBSCAN (cosine distance, configurable `eps`, default 0.15, `min_samples=2`) to identify burst / near-duplicate groups.

#### Scenario: Cluster endpoint groups photos
- **WHEN** the frontend sends `POST /api/similarity/cluster` with images
- **THEN** the backend returns `[{photoId, clusterId}]`; photos with no neighbors above the threshold receive a unique singleton cluster id

#### Scenario: Singleton clusters bypass PK
- **WHEN** a photo is the only member of its cluster
- **THEN** its status advances directly to `finalist`

#### Scenario: Multi-photo clusters enter PK queue
- **WHEN** a cluster has 2+ photos
- **THEN** the cluster is added to the PK queue, ordered by aesthetic score (highest first) so the strongest candidate is shown first

### Requirement: System exposes cluster configuration to users
The system SHALL allow users to adjust the DBSCAN `eps` value via settings to make similarity matching stricter or looser.

#### Scenario: Adjusting eps re-clusters on next run
- **WHEN** user changes `eps` in settings and triggers Stage 3
- **THEN** clustering uses the new value; existing PK results are invalidated and the queue is rebuilt
