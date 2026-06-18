# Campaign Pulse - Data Contract

The dashboard uses a raw, multi-month JSON file. It stores source facts only; derived analytics are calculated in TypeScript utilities.

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

Future ingestion should follow:

```text
Cleaned Excel/API export -> validation layer -> raw normalized JSON/API response -> dashboard calculations
```

For a real version, each cleaned Excel row should represent:

```text
one newsletter x one segment
```

That shape avoids duplicating campaign metadata while preserving segment-level analysis.
