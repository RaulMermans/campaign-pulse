# Campaign Pulse

Campaign Pulse is a newsletter performance command center for campaign, segment, revenue, and saturation intelligence.

It is a polished static demo built to show how a lifecycle or newsletter team could move from monthly send data to strategic decisions without digging through spreadsheets.

Reference inspiration/context for vibe-coding workflows: https://github.com/filipecalegario/awesome-vibe-coding.git

## Problem

Newsletter teams can usually see metrics, but the work gets harder when they need judgment:

- Which campaign actually carried the month?
- Which audience segment is worth protecting?
- Which sends created fatigue?
- Which creative pattern should be repeated?
- What should change before the next campaign cycle?

Most dashboards show the numbers. Campaign Pulse is designed to explain the month.

## Solution

Campaign Pulse turns raw local newsletter facts into an editorial analytics workspace with:

- monthly KPI hierarchy
- calendar-first send review
- campaign and segment intelligence
- visual audience intelligence with segment selection
- saturation heatmap
- newsletter detail drawer
- rule-based insight engine
- recommended next actions
- print-ready monthly performance report
- static data intake simulation

The interface is intentionally premium and restrained: soft neutral background, strong typography, clean cards, subtle borders, and muted campaign accents.

## Core Features

- **Monthly command center:** Sidebar workspace with focused overview, calendar, newsletters, campaigns, audience, insights, report, and data screens.
- **Clickable newsletters:** Calendar cards and table rows open the same detail drawer.
- **Campaign performance:** One card per campaign with sends, revenue, rates, best/weakest send, saturation, and takeaway.
- **Audience intelligence workspace:** All active segments stay visible in a master overview; click one segment to open a rich detail panel with value vs pressure, trend lines, campaign fit, newsletter history, and demo-only sample members.
- **Overview data science brief:** Month-over-month movement, 3-month rolling averages, campaign and segment concentration, pressure vs revenue, opportunity/risk ranking, anomaly callouts, campaign efficiency, audience pressure, and executive health are computed from raw local facts.
- **Saturation heatmap:** Segment x week view that highlights healthy, watch, saturated, and overexposed states.
- **Insight engine:** Rule-based reads for best performer, revenue outliers, unsubscribe warnings, campaign decay, and promotional pressure.
- **Monthly report:** Strategic memo with executive summary, learnings, risks, and recommended next actions.
- **Data intake simulation:** Cleaned Excel/API-shaped rows are validated and normalized into dashboard-ready data for preview.

## Product Navigation

Sprint 09 reorganized the original long dashboard into a sidebar-based internal tool. The shared month/year selector stays in the top bar and applies across every screen.

1. Overview
2. Calendar
3. Newsletters
4. Campaigns
5. Audience
6. Insights
7. Report
8. Data

Calendar cards and performance table rows continue to open the same newsletter detail drawer.

Sprint 11 added a global UX/UI clarity pass: simpler navigation labels, a compact global header, a decision-led Overview, deduplicated P1/P2/P3 recommendations, a prioritized Insights action board, a more decision-led newsletter drawer, and a calmer monthly memo report.

Sprint 12 turns Audience into a visual intelligence workspace. The screen now uses computed Recharts views for value vs pressure, revenue/engagement trends, and campaign fit, all derived from raw local newsletter facts and demo-only audience member records.

Sprint 13 restores the full Audience landscape with a master-detail UX: every segment appears in a compact decision card before the selected segment detail panel opens. Sprint 13 also upgrades Overview into a computed data-science brief with rolling averages, concentration analysis, pressure/revenue visuals, opportunity and risk ranking, deterministic anomaly callouts, campaign efficiency, audience pressure, and executive health scoring.

Sprint 14 is the deployment reliability pass. The repo now standardizes on npm with `package-lock.json`, adds a stable `npm run test` command for focused TypeScript utility tests, ignores generated artifacts, and documents the clean verification and demo deployment workflow.

Sprint 15 is the UX/UI polish and portfolio screenshot pass. It fixes the global topbar/content overlap, calms repeated card textures into clearer hero, metric, analysis, detail, and action panels, makes major charts question-led with short annotations, tightens the Overview decision brief, simplifies Audience segment cards while keeping every segment visible, fixes Calendar month clipping with compact event cards and `+N more` overflow, and sharpens the newsletter drawer and monthly report for portfolio capture.

Sprint 16 adds editable business targets and segment movement intelligence. Global, campaign, and segment targets live in `data/targets.json`, can be edited on the Data screen, and persist in browser `localStorage`; source performance facts still come from local JSON. Overview, Audience, Campaigns, Newsletters, and Report show compact target status comparisons, while Audience labels each active segment as Growing, Stable, Declining, Fatigued, or Recovering from deterministic monthly trend and demo-member fatigue signals.

Sprint 17 is an interaction clarity and visual system pass. It standardizes the app around clearer hero readouts, metric strips, analysis panels, detail panels, action panels, target status groups, and decision labels without changing the static architecture or analytics formulas. Overview now reads more like mission control, target chips are metric-specific, Audience has a clearer selected-segment path, Calendar pressure is more visual, Newsletters and Campaigns scan by rank/revenue/risk/recommendation, Data targets are grouped by business, engagement, and safety goals, and the Report/drawer are cleaner for screenshots and print.

Sprint 18 adds a GitHub Actions quality gate and Vercel deployment preparation. CI verifies the npm install, tests, lint, typecheck, production build, and source-clean packaging rules on pull requests and pushes to `main`. Vercel remains connected through Git for preview and production deployments.

Sprint 19 adds the first real data adapter boundary. The existing demo newsletter JSON, synthetic audience members, and default targets are normalized through `demoJsonAdapter` before dashboard analytics run. The Data screen reports adapter status, normalized record counts, validation issues, and future source placeholders without adding live integrations or upload UI.

Sprint 20 adds a second implemented adapter for static flat CSV/export-shaped rows. The fake fixture in `data/sample-newsletter-export-rows.json` is parsed, validated, merged, and normalized into the same dataset shape as Demo JSON. The Data screen shows sample CSV readiness and required fields; `docs/source-mapping-examples.md` documents Klaviyo, Mailchimp, HubSpot, Customer.io, and generic CSV mappings. There is still no upload UI or live CRM/ESP integration.

Sprint 22 adds an editable column-mapping preview to the Data screen. Users can remap unrecognized source fields to normalized Campaign Pulse fields before import. An alias map auto-infers common ESP/CRM export variants (`send_date → sendDate`, `recipients → sent`, `opens_unique → opens`, etc.) with `inferred` confidence. Per-field dropdowns let users override any mapping; confidence becomes `manual`. Mapping confidence is now `exact | inferred | manual | missing`. The accepted/rejected row counts and diagnostics table update live as mappings change. Duplicate source-column mappings and missing required fields produce inline warnings. Custom mapping persists in `localStorage` under `campaign_pulse_column_mapping_v1`. No upload UI, live CRM/ESP integration, backend, database, auth, or OAuth were added.

Sprint 21 adds an inspectable import-readiness console to the Data screen. The static CSV/export fixture is inspected through a column-mapping preview that shows detected source columns, normalized field destinations, mapping confidence (`exact | inferred | missing`), and a required-fields checklist. Per-row diagnostics report accepted and rejected rows with error type, affected field, raw value, and human-readable reason. An import-readiness summary shows total, accepted, and rejected row counts alongside normalized entity counts. All diagnostics are additive; the normalized dataset shape and active dashboard source are unchanged. There is still no upload UI, editable mappings, or live CRM/ESP integration.

## Data Model

The live dashboard keeps its raw, multi-month static source files:

```text
data/newsletter-performance.json
data/audience-members.json
data/targets.json
```

Sprint 19 routes those files through:

```text
demo JSON -> adapter validation -> normalized dataset -> computed analytics -> dashboard
```

The adapter contract lives in `lib/adapters/`. `demoJsonAdapter` handles the active dashboard source and `csvExportAdapter` handles the static fake flat-row fixture. Klaviyo, Mailchimp, HubSpot, and Customer.io remain typed future placeholders only.

The normalized dataset contains:

- campaigns
- segments
- newsletters
- flattened segment performance rows
- audience members when available
- targets when available
- source metadata, imported timestamp, record counts, and validation status

Validation checks required arrays, unique newsletter IDs, campaign and segment references, numeric metrics, parseable dates, delivered vs sent, and non-negative counts. Missing optional audience, target, or metadata inputs produce warnings; missing required structures or invalid facts produce errors. See `docs/data-adapter-contract.md`.

Synthetic audience records use masked `.test` identities only. They are not real customer data and do not introduce a backend, database, auth, upload/import flow, external API, or AI/LLM call.

Targets support global, campaign, and segment scopes. There are no newsletter-level targets. Browser edits are saved to `localStorage` under the current browser profile; resetting on the Data screen restores the demo defaults from `data/targets.json`.

The root shape is:

```ts
{
  meta: {...},
  campaigns: Campaign[],
  segments: Segment[],
  newsletters: Newsletter[]
}
```

Each newsletter stores source facts only: campaign/content/offer metadata, send timestamps, raw aggregate counts, and raw `segmentPerformance[]` rows. Rates are calculated in the app:

- Open Rate = `uniqueOpens / delivered`
- CTR = `uniqueClicks / delivered`
- CTOR = `uniqueClicks / uniqueOpens`
- Conversion Rate = `orders / delivered`
- RPR = `revenue / delivered`
- Unsubscribe Rate = `unsubscribes / delivered`
- Spam Rate = `spamComplaints / delivered`

The dashboard does not use a backend, database, auth, upload flow, external API, or environment variables.

Sprint 08 moved derived analytics fully into TypeScript utilities. The JSON does not store precomputed rates, saturation scores, fatigue diagnoses, rankings, insights, or recommendations. The dashboard derives month/year facets from `timing.sentAt` and defaults to the latest available reporting month.

Sprint 12 audience charts are also computed in TypeScript from raw newsletter `segmentPerformance[]` facts plus the synthetic audience member data. Fake member rows are used only to demonstrate how a segment profile and sample table could feel in a real command center.

Sprint 13 overview analytics live in TypeScript utilities and are calculated from raw `data/newsletter-performance.json` facts. The synthetic audience members remain demo-only support data for the Audience detail view and are not treated as real customer records.

Sprint 15 did not change the data architecture. The app still reads raw local JSON facts and computes metrics, saturation, fatigue, insights, recommendations, and report values in TypeScript utilities.

Sprint 16 keeps that architecture unchanged. Target status, target tolerance bands, and segment movement labels are computed in TypeScript from local demo facts plus browser-saved target settings. No backend, database, auth, upload/import, external API, AI/LLM call, PDF library, D3, or real customer data was added.

Sprint 17 also keeps that architecture unchanged. It adds no backend, database, auth, upload/import flow, external API, AI/LLM call, PDF library, D3, new screens, or new analytics formulas. The work is limited to UI clarity, safer local target input parsing, and documentation.

Sprint 19 changes the ingestion boundary, not the business meaning of the data. Metrics, saturation, fatigue, insights, recommendations, targets, and report values remain computed from normalized local facts. There is still no live CRM/API integration, backend, database, auth, upload UI, scheduled sync, webhook, OAuth, secret, or AI call.

Sprint 20 proves export normalization readiness without changing the active dashboard source. CSV/export parsing trims whitespace, accepts common decimal/currency/percentage formatting, merges repeated references, and validates required fields, dates, numeric values, negative metrics, delivery sanity, and normalized references. No upload UI, live vendor API, backend, OAuth, or sync process was added.

## Target Editor

The Data screen includes a simple target editor for:

- global targets
- campaign targets
- segment targets

Editable fields are monthly revenue, OR, CTR, CTOR, conversion rate, RPR, maximum unsubscribe rate, maximum spam rate, maximum sends per segment/week, and maximum pressure score. Campaign and segment targets inherit global defaults unless overridden. Save writes the settings to browser `localStorage`; Reset removes saved edits and reloads the demo defaults from `data/targets.json`.

Target statuses use deterministic tolerance bands:

- **On track:** actual meets or beats the target.
- **Watch:** actual is within the tolerance band.
- **Off track:** actual is outside the tolerance band.

For maximum targets such as unsubscribe rate, spam rate, weekly sends, and pressure score, lower actuals are better.

Sprint 17 makes status chips metric-specific in the UI, such as `Revenue on track`, `RPR on track`, `Pressure off track`, and `CTOR watch`, so compact rows do not require surrounding context to be understood.

## Segment Movement

Audience movement labels are deterministic and local:

- **Growing:** revenue per recipient and engagement are improving without a meaningful unsubscribe lift.
- **Stable:** movement stays inside the tolerance band.
- **Declining:** value or engagement falls without enough unsubscribe relief.
- **Fatigued:** synthetic member fatigue plus weak value, weak engagement, or high unsubscribe pressure needs attention.
- **Recovering:** engagement or value improves while unsubscribe pressure eases.

The movement logic uses month-level segment send trends from `segmentPerformance[]` and synthetic demo audience-member fatigue mix where useful.

## Insight Engine

The insight layer is rule-based and deterministic. It derives strategic reads from local data, including:

- best and weakest newsletter
- strongest revenue campaign
- most valuable segment
- most saturated segment
- high open rate with low CTOR
- low open rate with strong CTOR
- revenue outliers
- unsubscribe warnings
- campaign decay
- repeated promotional pressure

Each insight includes a severity, evidence, recommendation, and related newsletter/campaign/segment IDs where relevant.

## Saturation Heatmap

The heatmap translates segment exposure into a weekly diagnostic view. It considers:

- send count to the same segment
- engagement movement
- unsubscribe pressure
- revenue efficiency
- repeated campaign or creative pressure

Cells are clickable and show the newsletters sent, average rates, saturation level, diagnosis, and recommended next action.

## Data Intake Simulation

Sprint 06 added a static intake rehearsal:

```text
cleaned Excel/API export -> validation -> normalization -> dashboard-ready preview
```

The raw sample lives in:

```text
data/import-sample.json
```

Each row represents one newsletter x one segment. Validation checks required fields, metric sanity, impossible delivered/open/click values, and duplicate newsletter-segment rows. The normalizer groups flat rows into campaigns, segments, and newsletters with raw `segmentPerformance[]` facts.

This is not a real upload/import feature. It is a public demo of the future architecture.

Sprint 20 adds a separate adapter fixture:

```text
data/sample-newsletter-export-rows.json
  -> csvExportAdapter
  -> NormalizedDataset
```

The fixture is fake/demo-only and represents one newsletter x one segment per row. Mapping guidance lives in `docs/source-mapping-examples.md`.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Static local JSON
- ESLint with Next core web vitals

## Run Locally

```bash
npm ci
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Verification

```bash
npm run verify
```

The combined verification command runs:

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

For a clean deployment rehearsal:

```bash
npm ci
npm run verify
npm run start
```

Package manager decision: npm is the project standard for this demo. Keep `package-lock.json`; do not add pnpm lockfiles or workspace files unless the project is deliberately migrated and documented.

GitHub Actions runs the same `test`, `lint`, `typecheck`, and `build` quality gate on pull requests and pushes to `main`. It also fails when generated/dependency artifacts or pnpm metadata are committed.

## Vercel Deployment

Recommended platform: **Vercel**.

Import the GitHub repository into Vercel with these settings:

- Framework preset: Next.js
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: leave the Vercel default
- Environment variables: none required
- Production branch: `main`

Vercel handles preview deployments for branches and pull requests and production deployments from `main` through Git integration. No Vercel secrets are required for the app.

Deployment data comes from local JSON demo files, including `data/newsletter-performance.json`, `data/targets.json`, and synthetic `.test` audience member records from `data/audience-members.json`. Synthetic audience members are demo-only and are not real customer data. Target edits persist only in the current browser’s `localStorage`; they are not stored on the server or shared between browsers.

### Vercel Deployment Checklist

- Confirm GitHub Actions passes on `main`.
- Import the repository with the settings above.
- Leave the output directory at its default value.
- Confirm no environment variables or deployment secrets are configured unnecessarily.
- Confirm the preview deployment renders the Overview, Audience, Calendar, Newsletters, Campaigns, Data, and Report workspaces.
- Confirm target edits survive a browser refresh through `localStorage` and reset correctly to demo defaults.
- Promote or merge to `main` only after the preview deployment and CI quality gate pass.

### Source-Clean Packaging Checklist

- Keep `package-lock.json` as the only lockfile.
- Do not commit `node_modules/`, `.next/`, `.pnpm-store/`, `tsconfig.tsbuildinfo`, `pnpm-lock.yaml`, or `pnpm-workspace.yaml`.
- Keep logs, PID files, coverage output, screenshots/exports, and temporary ZIP/PDF artifacts out of the Vercel upload.
- Keep application source and deployment inputs included: `app/`, `components/`, `lib/`, `data/`, `public/` when present, `package.json`, `package-lock.json`, `next.config.mjs`, and `README.md`.

### Dependency Audit Policy

Run `npm audit --omit=dev` manually before production use. Do not run `npm audit fix --force` without a controlled framework-upgrade branch and a full QA pass because the current Next/PostCSS advisory path may require breaking framework changes.

## Public Demo Checklist

- Run `npm ci`.
- Run `npm run verify`.
- Confirm GitHub Actions passes test, lint, typecheck, build, and the source-clean guard.
- Confirm Vercel preview and production deployments are handled through Git integration.
- Optionally run `npm run start` and confirm the production server responds.
- Confirm no `.env` files or secrets are present.
- Confirm `data/newsletter-performance.json` remains the raw demo source and reaches analytics through `demoJsonAdapter`.
- Confirm the Data screen shows Demo JSON status, sample CSV adapter status/counts, column-mapping preview, required-fields checklist, accepted/rejected row summary, rejected-row diagnostics table, and future CRM/ESP placeholders.
- Confirm synthetic audience members remain clearly demo-only.
- Confirm data intake simulation is clearly labeled as static demo data.
- Confirm no backend, database, auth, upload, external API, or AI/LLM calls were added.
- Capture screenshots of:
  - Overview decision brief with question-led charts
  - Audience all-segments overview
  - selected segment detail panel
  - pressure heatmap
  - Calendar Month view with compact send cards and `+N more`
  - Newsletter detail drawer
  - Report memo in screen and print preview

Sprint 17 screenshot-readiness notes:

- Overview above the fold should show business health, revenue vs target, engagement vs target, pressure risk, and best next move in one read.
- Audience screenshots should capture both the all-segment surface and the selected segment detail hero with movement, target, and recommended move visible.
- Calendar Month view should show pressure rails, selected day state, compact clickable sends, and `+N more` overflow.
- Newsletters and Campaigns should scan by recommendation, target exceptions, revenue, risk, and click affordance.
- Report and drawer screenshots should show the compact target strip and the Main Read -> Recommended Move -> Evidence flow.

## Public Safety

No secrets, API keys, private URLs, personal data, or environment variables are required for this project.

The sample URLs in the mock data use `https://example.com/campaign-pulse-demo` and are placeholders only.

## Roadmap

- Public demo screenshots and short product walkthrough
- Invalid-row import examples and schema documentation
- Campaign drill-down timelines
- Suppression and recovery-plan scenarios
- Optional upload/API ingestion in a future non-static version
- Optional upload UI and live CRM/ESP adapters after the static CSV/export contract is proven
- Safe framework upgrade planning for future Next.js major versions

## Non-Goals

- Backend services
- Database persistence
- Authentication
- Real file upload/import
- External API sync
- AI-generated recommendations
- PDF export libraries
