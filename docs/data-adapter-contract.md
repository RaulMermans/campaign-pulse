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

## Current Limits

Sprint 20 adds no live CRM/API integration, file upload, scheduled sync, webhooks, OAuth, backend services, databases, auth, secrets, or AI calls. `csvExportAdapter` accepts in-memory flat rows from a fake local fixture; future upload or vendor adapters should produce the same normalized dataset before analytics run.

## CSV/export parsing

The static CSV/export adapter:

- expects one newsletter x one segment per row
- merges repeated campaign, segment, newsletter, and newsletter/segment references
- trims whitespace and parses common comma/dot decimal and currency formats
- strips percentage signs while retaining the displayed numeric value
- defaults optional subject and creative-angle metadata
- reports source-row issues, then reuses `validateNormalizedDataset` for normalized reference and metric validation

See `docs/source-mapping-examples.md` for Klaviyo, Mailchimp, HubSpot, Customer.io, and generic CSV examples.
