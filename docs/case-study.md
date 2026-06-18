# Campaign Pulse Case Study

Campaign Pulse is a newsletter performance command center built as a static, portfolio-ready prototype. It turns a month of newsletter sends into campaign, segment, saturation, revenue, and recommendation intelligence.

Reference inspiration/context for vibe-coding workflows: https://github.com/filipecalegario/awesome-vibe-coding.git

## Project Overview

The product is designed for lifecycle marketers, founders, newsletter managers, and brand operators who need to understand not only what happened, but what should happen next.

Campaign Pulse uses local JSON to simulate a cleaned analytics export. The app then calculates metrics, detects audience pressure, generates rule-based insights, and packages the month into a strategic report.

## Why This Tool Exists

Newsletter performance work often breaks down across tools:

- email platform metrics
- campaign plans
- revenue attribution
- segment definitions
- spreadsheet exports
- qualitative creative notes

Teams can see open rates and clicks, but they still have to answer harder questions manually: which campaign carried revenue, which audience is tired, which message shape deserves another test, and which segment should be protected.

Campaign Pulse exists to compress that work into one command center.

## Target User

Primary users:

- lifecycle marketers
- ecommerce operators
- newsletter managers
- founders running lean marketing teams
- CRM and retention teams

The user is analytical, time-constrained, and responsible for making tradeoffs between revenue pressure and audience trust.

## Product Thesis

Most analytics dashboards stop at reporting. Campaign Pulse should behave more like a strategist:

- surface the strongest pattern
- expose the highest-risk audience pressure
- connect revenue to campaign and segment behavior
- explain why a send performed well or poorly
- recommend the next action with supporting evidence

The interface is not a generic admin panel. It is an editorial analytics room: quiet, structured, and built for interpretation.

## Key UX Decisions

**Calendar as the visual hero**

The month is the natural unit of newsletter strategy. The calendar makes cadence visible before the user reads a table.

**One drawer for every send**

Calendar cards and table rows open the same newsletter detail drawer. This keeps exploration consistent and lets users move from overview to detail without losing context.

**Campaigns and segments as strategic systems**

Campaign and segment cards summarize not only rates and revenue, but best/worst performers, saturation, and data-derived takeaways.

**Saturation as a first-class diagnostic**

The heatmap makes overexposure visible by segment and week. It turns fatigue from a vague concern into an inspectable signal.

**Monthly report as the executive layer**

The report translates dashboard findings into a memo: executive summary, highlights, learnings, risks, and recommended next actions.

## Data Architecture

The live dashboard reads:

```text
data/newsletter-performance.json
```

The normalized model contains:

- `campaigns`
- `segments`
- `newsletters`
- newsletter metrics
- content metadata
- offer metadata
- segment-level performance
- saturation diagnosis

Sprint 06 added a static intake simulation:

```text
data/import-sample.json
```

That sample represents cleaned Excel/API-shaped rows where each row is one newsletter x one segment. Validation and normalization utilities demonstrate how a future ingestion layer could become dashboard-ready data without changing the current static architecture.

## Intelligence Layer

The insight engine is deterministic and rule-based. It generates evidence-backed reads for:

- best newsletter
- weakest newsletter
- strongest revenue campaign
- best revenue-per-recipient segment
- most saturated segment
- high OR but low CTOR
- low OR but strong CTOR
- unsubscribe warning
- campaign decay
- repeated promotional pressure

Each insight carries severity, message, evidence, recommendation, and related entity IDs when relevant.

## What Makes It Different

A normal analytics dashboard asks the user to interpret charts.

Campaign Pulse does more of the strategic work:

- It ties performance to campaigns, segments, content, and saturation.
- It makes audience fatigue visible.
- It explains the likely cause of degradation.
- It recommends concrete next actions.
- It packages the month into a report that can be printed or shared.

The result feels closer to a decision room than a metrics console.

## Screenshots

Suggested public screenshots:

- Calendar hero with intelligence panel
- Newsletter detail drawer
- Campaign performance cards
- Segment intelligence cards
- Saturation heatmap detail state
- Monthly performance report
- Data intake simulation

## Public Readiness

The project is safe to show publicly as a static demo:

- no backend
- no database
- no authentication
- no real upload/import
- no external API calls
- no AI/LLM calls
- no environment variables
- no secrets or private URLs

Sample data is synthetic and uses placeholder `example.com` URLs.

## Future Improvements

- Add public screenshots and a short product walkthrough.
- Add invalid-row import examples.
- Add campaign sequence drill-downs.
- Add segment recovery and suppression scenarios.
- Add a real ingestion layer only after the static demo story is complete.
- Plan a future Next.js major upgrade separately from product polish.
