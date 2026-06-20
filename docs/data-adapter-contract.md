# Campaign Pulse Data Adapter Contract

Sprint 19 introduces a source-independent boundary between raw local data and dashboard analytics.

Reference inspiration/context for vibe-coding workflows: https://github.com/filipecalegario/awesome-vibe-coding.git

## Flow

```text
raw source -> adapter validation -> normalization -> computed analytics -> dashboard
```

The current source remains `data/newsletter-performance.json`, supplemented by demo audience members and default targets. The app now consumes the normalized result from `demoJsonAdapter`.

## Adapter Interface

Every adapter declares:

- source id
- source label
- source type
- `validate(input)`
- `normalize(input)`
- structured warnings and errors

Supported source types are:

- `demo_json`
- `csv_export`
- `klaviyo_export`
- `mailchimp_export`
- `hubspot_export`
- `customer_io_export`

`demo_json` and the static `csv_export` fixture adapter are implemented. Vendor-specific adapters remain future work.

## Normalized Dataset

The internal dataset contains:

- campaigns
- segments
- newsletters
- flattened segment performance rows with newsletter and campaign references
- audience members when available
- targets when available
- metadata with source identity, imported timestamp, record counts, original source metadata, and validation status

Existing campaign, segment, newsletter, and metric meanings are preserved. Derived rates and intelligence are not stored by the adapter.

## Validation

Errors are returned for:

- missing required campaign, segment, or newsletter arrays
- duplicate newsletter IDs
- newsletter references to unknown campaigns
- segment performance references to unknown segments
- missing or invalid numeric metrics
- unparseable campaign or send dates
- delivered counts greater than sent counts
- negative count or revenue metrics

Warnings are returned when optional audience members, targets, or source metadata are unavailable.

## Editable Column Mapping

Sprint 22 extends `lib/adapters/columnMapping.ts` with an interactive mapping model:

- `MappingConfidence`: `exact | inferred | manual | missing` (extended from Sprint 21's `exact | inferred | missing`).
- `MappingValidationState`: `mapped | missing | duplicate | invalid`.
- `EditableMappingEntry`: combines normalized field metadata with `detectedSourceColumn` (auto-detected), `selectedSourceColumn` (user's current choice), `confidence`, and `validationState`.
- `EditableColumnMapping`: `availableSourceColumns`, `entries[]`, `warnings[]`.
- `ALIAS_MAP`: deterministic alias lookup — `send_date → sendDate`, `campaign → campaignName`, `email_name → newsletterName`, `recipients → sent`, `opens_unique → opens`, `clicks_unique → clicks`, `placed_order → orders`, `revenue_eur → revenue`, `unsub → unsubscribes`, `spam → spamComplaints`.
- `buildEditableColumnMapping(availableSourceColumns, savedMapping?)`: exact match first, then alias inference, then saved manual overrides from `localStorage`-backed state.
- `applyMappingToRows(rows, entries)`: transforms source rows by writing `row[canonicalField] = row[selectedSourceColumn]` for every entry with a selected column. Used to produce adapter-ready rows from re-mapped source data before calling `buildRowDiagnostics` or `csvExportAdapter.normalize`.

### Mapping confidence rules

- `exact`: source column name exactly matches the canonical adapter field name.
- `inferred`: source column was matched via the alias map.
- `manual`: user explicitly selected a source column different from the auto-detected value; persisted in `localStorage`.
- `missing`: no source column is selected (null selection or no match/alias).

### Validation states

- `mapped`: entry has a valid, non-duplicate source column selection.
- `missing`: no source column selected; required fields also produce a warning.
- `duplicate`: the same source column is selected for more than one normalized field; a warning is emitted.
- `invalid`: selected source column is not present in `availableSourceColumns`.

### localStorage persistence

Custom fixture mapping is stored in `localStorage` under `campaign_pulse_column_mapping_v1` as `Record<string, string | null>` keyed by canonical field name. Per-field Reset removes only that field's entry; Reset all clears the key entirely. Uploaded-file mapping remains session-only. There is no server-side persistence or live API.

## Client-Side CSV Upload

Sprint 23 adds a browser-local input path:

```text
selected .csv
  -> FileReader.readAsText()
  -> parseCsvText()
  -> editable column mapping
  -> row diagnostics
  -> csvExportAdapter.normalize()
  -> in-memory dashboard session
```

The parser supports:

- one header row
- quoted values and escaped double quotes
- commas inside quoted values
- blank lines
- trimmed headers and values
- basic errors for malformed row widths, unexpected quotes, unclosed quotes, blank headers, and duplicate headers

Uploaded rows reuse the Sprint 22 mapping model and Sprint 21 diagnostics. Uploaded mapping is session-only; the existing static-fixture mapping can still persist under `campaign_pulse_column_mapping_v1`.

Session activation is blocked when:

- the parser reports errors
- a required field is missing, duplicated, or mapped to an invalid source column
- zero rows are accepted
- normalized validation status is `error`
- campaigns, segments, or newsletters are empty

A valid dataset receives the source label `Uploaded CSV session`. It replaces Demo JSON only in React state. Refreshing or selecting **Return to demo data** restores the bundled adapter result. The selected file, parsed rows, mapping, and normalized uploaded dataset are not written to localStorage or any server.

Recommended CSV fields:

| Field | Requirement |
| --- | --- |
| `sendDate` | Required parseable date/time |
| `newsletterId`, `newsletterName` | Required newsletter identity |
| `campaignId`, `campaignName` | Required campaign identity |
| `segmentId`, `segmentName` | Required segment identity |
| `sent`, `delivered` | Required non-negative delivery counts |
| `opens`, `clicks` | Required non-negative unique engagement counts |
| `orders`, `revenue` | Required non-negative conversion facts |
| `unsubscribes`, `spamComplaints` | Required non-negative safety counts |
| `subject`, `creativeAngle` | Optional content labels |

## Column-Mapping Preview

Sprint 21 adds `lib/adapters/columnMapping.ts` with:

- `MappingConfidence`: `exact | inferred | missing`
- `ColumnMappingEntry`: source field, normalized field, confidence, required flag, description
- `ColumnMappingPreview`: detected source columns, all mappings, unmapped source fields, missing required fields, and summary stats
- `ImportReadinessSummary`: total/accepted/rejected/warning row counts plus normalized entity counts and validation status
- `buildColumnMappingPreview(sampleRow?)`: builds a preview from a source row or falls back to the full expected field list
- `buildImportReadinessSummary(rowDiagnostics, counts, validationStatus)`: derives the import summary from row diagnostics

## Row Diagnostics

Sprint 21 adds row-level diagnostics to the CSV/export adapter:

- `RowDiagnosticIssue`: error code, error type label, human-readable reason, affected field, raw value
- `RowDiagnostic`: row number (1-based), accepted flag, source identifiers (newsletterId, newsletterName, campaignId, segmentId), per-row errors and warnings
- `buildRowDiagnostics(input)`: exported function that processes raw input and returns one `RowDiagnostic` per row

Row rejection reasons include: missing required field, invalid date, invalid number, negative metric, delivered greater than sent, and broken reference.

The normalized dataset shape, `csvExportAdapter.validate`, and `csvExportAdapter.normalize` outputs are unchanged. Diagnostics are additive.

## Current Limits

Sprint 23 accepts local CSV files in the browser, but adds no persistent uploaded datasets, live CRM/API integration, scheduled sync, webhooks, OAuth, backend services, databases, auth, secrets, AI calls, or new major screens. Vendor adapters should continue producing the same normalized dataset before analytics run.

## CSV/export parsing

The static CSV/export adapter:

- expects one newsletter x one segment per row
- merges repeated campaign, segment, newsletter, and newsletter/segment references
- trims whitespace and parses common comma/dot decimal and currency formats
- strips percentage signs while retaining the displayed numeric value
- defaults optional subject and creative-angle metadata
- reports source-row issues, then reuses `validateNormalizedDataset` for normalized reference and metric validation

See `docs/source-mapping-examples.md` for Klaviyo, Mailchimp, HubSpot, Customer.io, and generic CSV examples.
