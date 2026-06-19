# Campaign Pulse - Data Contract

The dashboard uses raw, multi-month local JSON source facts. Sprint 19 validates and normalizes those facts through the demo adapter before derived analytics are calculated in TypeScript utilities.

Reference inspiration/context for vibe-coding workflows: https://github.com/filipecalegario/awesome-vibe-coding.git

## Source File

```text
data/newsletter-performance.json
```

## Root Shape

```ts
{
  meta: {...},
  campaigns: Campaign[],
  segments: Segment[],
  newsletters: Newsletter[]
}
```

## Adapter Flow

```text
data/newsletter-performance.json
  + optional audience members and targets
  -> demoJsonAdapter.validate()
  -> demoJsonAdapter.normalize()
  -> NormalizedDataset
  -> dashboard analytics
```

The adapter preserves existing campaign, segment, newsletter, and nested segment performance business objects. It also exposes a flattened segment performance collection plus source metadata, record counts, and validation status.

See `docs/data-adapter-contract.md` for the Sprint 19 adapter interface and validation rules.

## Campaign

```ts
{
  id: string;
  name: string;
  type: string;
  goal: string;
  color: string;
  startDate: string;
  endDate: string;
}
```

## Segment

```ts
{
  id: string;
  name: string;
  description: string;
  lifecycleStage: string;
  valueTier: string;
}
```

## Newsletter

Each newsletter stores source data for identity, campaign association, `timing.sentAt`, content metadata, offer metadata, audience metadata, raw aggregate counts, and raw `segmentPerformance[]` rows.

Do not store precomputed rates, rankings, saturation scores, fatigue diagnoses, insights, or recommendations in the JSON.

## Metrics Rule

Store raw counts only. Calculate rates in the app.

```text
Open Rate = uniqueOpens / delivered
CTR = uniqueClicks / delivered
CTOR = uniqueClicks / uniqueOpens
Conversion Rate = orders / delivered
RPR = revenue / delivered
Unsubscribe Rate = unsubscribes / delivered
Bounce Rate = bounced / sent
```

## Segment Performance

Each newsletter includes raw `segmentPerformance[]` counts so the interface can detect which audiences responded and where fatigue appears.

## Computed Intelligence

The app derives:

- month/year/date facets from `timing.sentAt`
- dashboard, campaign, segment, and monthly summaries
- 7-day and 14-day segment pressure
- saturation level: `healthy | watch | saturated | overexposed`
- fatigue signals, diagnoses, rankings, insights, and recommended actions

## Real Intake Later

Future ingestion should implement the same adapter contract:

```text
Cleaned Excel/API export -> validation layer -> raw normalized JSON/API response -> dashboard calculations
```

CSV export, Klaviyo, Mailchimp, HubSpot, and Customer.io are placeholders only. There is no live integration, upload UI, scheduled sync, webhook, OAuth, backend, database, or secret management in Sprint 19.

For a real version, each cleaned Excel row should represent:

```text
one newsletter x one segment
```

That shape avoids duplicating campaign metadata while preserving segment-level analysis.
