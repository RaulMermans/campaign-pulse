# Campaign Pulse - Data Intake Simulation

Sprint 06 adds a static rehearsal of the future data intake workflow.

Reference inspiration/context for vibe-coding workflows: https://github.com/filipecalegario/awesome-vibe-coding.git

## Current Source

The live dashboard reads raw, multi-month local JSON from:

```text
data/newsletter-performance.json
```

No backend, upload, database, auth, external API, or AI/LLM call exists. Metrics, saturation, fatigue, insights, and recommendations are computed in TypeScript from raw counts and send dates.

## Import Sample

The raw sample lives in:

```text
data/import-sample.json
```

It represents cleaned Excel/API-shaped rows where each row is:

```text
one newsletter x one segment
```

That shape preserves segment-level performance while avoiding duplicated dashboard logic.

## Pipeline

The simulated flow is:

```text
cleaned Excel/API export -> validation -> raw normalization -> dashboard calculations
```

Validation checks required fields, numeric metric values, impossible delivered/open/click counts, and duplicate `newsletter_id + segment_id` rows.

Normalization groups flat rows into raw dashboard facts:

- campaigns
- segments
- newsletters with raw `segmentPerformance[]`

## Product Boundary

This is portfolio demo infrastructure only. A future real intake sprint can add upload or API ingestion, but Sprint 06 intentionally keeps the app static and dependency-free.
