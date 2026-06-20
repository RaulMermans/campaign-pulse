# Campaign Pulse - Sprint Plan

## Sprint 00 - Scaffold + mock data

Goal: Build the first static prototype with a rich local JSON data source.

Deliverables:

- Next.js app scaffold
- TypeScript types
- Mock newsletter JSON
- Metric utilities
- Insight utilities
- KPI strip
- Calendar section
- Intelligence panel
- Campaign cards
- Newsletter table

Acceptance criteria:

- App runs locally.
- Dashboard reads from JSON.
- KPI values are calculated.
- Newsletter table lists all sends.
- Intelligence panel shows best performer and warnings.

## Sprint 01 - Interface polish

Goal: Make the product feel like a premium newsletter command center.

Deliverables:

- Stronger visual hierarchy
- Better calendar card design
- Campaign color system refinement
- Desktop/tablet responsive polish
- Clearer saturation states

## Sprint 02 - Newsletter detail drawer

Goal: Allow deep inspection of each send.

Deliverables:

- Click newsletter card/table row
- Right-side drawer
- Content metadata
- Offer metadata
- Segment performance
- Diagnosis/recommendation block

## Sprint 03 - Campaign detail layer

Goal: Make campaign comparison more strategic.

Deliverables:

- Campaign-level averages
- Best/worst send per campaign
- Sequence timeline
- Campaign-level diagnosis

## Sprint 04 - Segment saturation heatmap + insight engine

Goal: Make saturation and strategic recommendations visible.

Deliverables:

- Segment x week heatmap
- Saturation levels
- Clickable cell details
- Segment fatigue explanations
- Best performer insight
- Fatigue warning
- High OR / low CTOR diagnosis
- Segment mismatch insight
- Revenue efficiency insight

## Sprint 05 - Stabilization + Monthly Report Polish

Goal: Stabilize project hygiene and add a portfolio-ready monthly report.

Deliverables:

- Non-interactive Next.js ESLint config
- Package lockfile from install workflow
- Project-control files: `CLAUDE.md`, `DESIGN.md`, `plan.md`, `SCRATCHPAD.md`
- Monthly Performance Report section
- Executive Summary, Performance Highlights, Campaign Learnings, Segment Learnings, Saturation Risks, and Recommended Next Actions
- Print report action using browser print behavior
- README status update

Status:

- Implemented in the static JSON architecture.
- Report values are calculated from existing newsletter, campaign, segment, saturation, and insight utilities.
- Documentation should continue referencing the vibe-coding workflow repo where relevant: https://github.com/filipecalegario/awesome-vibe-coding.git

## Sprint 06 - Data Intake Simulation

Goal: Demonstrate the future intake path without adding upload, backend, database, auth, or external APIs.

Deliverables:

- `data/import-sample.json` with cleaned Excel/API-shaped rows
- Import row types and validation issue types
- Validation helpers for required fields, metric sanity, and duplicate newsletter-segment rows
- Normalizer helpers that convert flat rows into dashboard-shaped campaigns, segments, and newsletters
- Data Intake Simulation dashboard section
- Data intake docs

Status:

- Implemented as a static demo.
- Existing dashboard still reads `data/newsletter-performance.json`.
- Simulated workflow: cleaned Excel/API export -> validation -> normalization -> dashboard-ready preview.
- Documentation should continue referencing the vibe-coding workflow repo where relevant: https://github.com/filipecalegario/awesome-vibe-coding.git

## Sprint 07 - Portfolio/public-ready pass

Goal: Make the project presentation-ready.

Deliverables:

- README polish
- Case study notes
- Screenshots
- Empty states
- Deployment notes
- Final UI refinement

Status:

- Implemented as the public-readiness pass.
- README now works as a portfolio project page with deployment notes, verification commands, environment notes, public safety notes, and roadmap.
- Case study notes live in `docs/case-study.md`.
- App metadata uses the public Campaign Pulse title and description.

## Sprint 08 - Computed Intelligence Refactor

Goal: Move derived analytics out of JSON and into TypeScript utilities.

Deliverables:

- Raw multi-month `data/newsletter-performance.json` as the main dashboard dataset
- Raw newsletter types without stored rates, saturation, rankings, insights, or recommendations
- Computed metric helpers for OR, CTR, CTOR, conversion rate, revenue efficiency, unsubscribe rate, and bounce rate
- Computed saturation/fatigue helpers for 7-day and 14-day pressure, levels, signals, diagnosis, and recommendations
- Insight engine generated from computed analytics
- Month selector that defaults to the latest available reporting month
- Dashboard components updated to read computed utilities instead of derived JSON fields

Status:

- Implemented in the static JSON architecture.
- JSON stores source facts only; metrics, saturation, fatigue, insights, and recommendations are calculated by the interface.
- Documentation should continue referencing the vibe-coding workflow repo where relevant: https://github.com/filipecalegario/awesome-vibe-coding.git

## Sprint 09 - Product Navigation + Calendar Workspace

Goal: Refactor the single long dashboard into a sidebar-based internal tool with focused workspaces.

Deliverables:

- Persistent product shell with left sidebar navigation and top month/year selector
- Overview screen with KPI strip, best performer, highest-risk warning, top opportunity, recommended actions, and compact monthly snapshot
- Dedicated Calendar workspace with weekly send-density cards and larger newsletter calendar cards
- Performance screen with ranked sends, best/worst comparisons, and the existing audit table
- Focused Campaigns, Segments, Insights, Report, and Data Intake screens using the existing analytics components
- Shared selected-month state that filters every screen consistently
- Existing newsletter detail drawer preserved from calendar cards and table rows

Status:

- Implemented with local navigation inside `app/page.tsx` to avoid unnecessary routing expansion.
- Existing TypeScript analytics, saturation, insight, report, and data-intake utilities remain reused from Sprint 08.
- Documentation should continue referencing the vibe-coding workflow repo where relevant: https://github.com/filipecalegario/awesome-vibe-coding.git

## Sprint 10 - Real Calendar Workspace

Goal: Replace the weekly send board with a true calendar workspace for inspecting send cadence, revenue concentration, and audience pressure.

Deliverables:

- Calendar state for Month, Week, and Day views
- Today, Previous, and Next controls that stay aligned with the shared month/year selector
- Monday-first month grid with muted outside-month days
- Week view with seven day columns and compact newsletter cards
- Day view with selected-day totals, campaign, audience, segments, and recommendations
- Calendar utility helpers for month grids, week ranges, day grouping, date lookup, and period summaries
- Compact summary panel for sends, revenue, delivered volume, strongest send, pressure risk, and suggested next action

Status:

- Implemented in the static JSON architecture.
- Existing campaign badges, saturation calculations, recommendations, and newsletter detail drawer remain reused.
- Documentation should continue referencing the vibe-coding workflow repo where relevant: https://github.com/filipecalegario/awesome-vibe-coding.git

## Sprint 11 - Global UX/UI Clarity Pass

Goal: Make the command center easier to scan by improving hierarchy, reducing repeated UI noise, and making each workspace answer one clear question.

Deliverables:

- Simplified navigation labels: Newsletters, Audience, and Data replace the older abstract labels.
- Compact global header with product name, selected month, and static dataset status.
- Decision-led Overview with one monthly takeaway, four core metrics, Keep/Fix/Watch cards, top P1/P2/P3 actions, and links into deeper workspaces.
- Deduplicated recommendations grouped into P1 critical action, P2 opportunity, and P3 watch item with evidence, affected area, and next-screen routing.
- Insights screen reframed as a Critical / Opportunities / Watchlist action board.
- Newsletter drawer reframed around main read, recommended next move, supporting metrics, and Action Plan.
- Monthly report reframed as a calmer memo with executive summary, what worked, what underperformed, audience risk, operating plan, and appendix metrics.

Status:

- Implemented in the static JSON architecture with no backend, database, auth, upload/import flow, external API, AI call, chart library, or PDF library added.
- Existing TypeScript utilities remain the source of computed metrics, saturation, fatigue, insights, and recommendations from raw local JSON facts.
- Documentation should continue referencing the vibe-coding workflow repo where relevant: https://github.com/filipecalegario/awesome-vibe-coding.git

## Sprint 12 - Audience Intelligence + Data Visualization

Goal: Transform Audience from a generated metric-card grid into a visual audience intelligence workspace.

Deliverables:

- `data/audience-members.json` with fake/demo masked `.test` audience members only.
- Audience member and audience metric helpers for segment membership, member summaries, revenue trends, engagement trends, campaign fit, and value-vs-pressure map points.
- Recharts-powered audience map, segment trend, and campaign fit visualizations.
- Interactive segment selection from the map, summary signals, and priority list.
- Selected segment detail panel with status, member count, revenue, RPR, OR, CTOR, unsubscribe rate, sends, and recommendation.
- Newsletter history and sample demo-member table for the selected segment.

Status:

- Implemented in the static JSON architecture.
- Charts are computed from raw local newsletter `segmentPerformance[]` facts and synthetic audience member records.
- No backend, database, auth, upload/import flow, external API, AI/LLM call, D3, PDF library, or real customer data was added.
- Documentation should continue referencing the vibe-coding workflow repo where relevant: https://github.com/filipecalegario/awesome-vibe-coding.git

## Sprint 13 - Audience Master-Detail + Overview Data Science

Goal: Restore all-segment visibility in Audience while making Overview a sharper computed decision brief.

Deliverables:

- Audience master overview with every active segment shown at once.
- Segment decision cards with status, revenue, RPR, OR, CTOR, sends, saturation/fatigue, recommendation, and selected state.
- Selected segment detail panel that reuses AudienceMapChart, SegmentTrendChart, CampaignFitChart, newsletter history, and demo-only member records.
- `lib/overviewAnalytics.ts` for deterministic month-over-month movement, 3-month rolling revenue and engagement averages, campaign and segment revenue concentration, pressure vs revenue, opportunity/risk ranking, anomaly callouts, campaign efficiency, audience pressure, and executive health score.
- Overview visuals for revenue trend vs rolling average, OR/CTR/CTOR trend, segment opportunity/risk quadrant, campaign contribution, and anomaly callouts.

Status:

- Implemented in the static JSON architecture.
- Overview analytics are calculated from raw `data/newsletter-performance.json` facts.
- Synthetic audience members remain demo-only support records and are not real customer data.
- No backend, database, auth, upload/import flow, external API, AI/LLM call, D3, PDF library, or real customer data was added.
- Documentation should continue referencing the vibe-coding workflow repo where relevant: https://github.com/filipecalegario/awesome-vibe-coding.git

## Sprint 14 - Build Reliability + Repo Cleanup + Deploy Prep

Goal: Make the feature-complete static demo clean, verifiable, and ready for public deployment.

Deliverables:

- npm standardized as the package manager with `package-lock.json` as the single lockfile.
- pnpm lock/workspace files removed because there is no documented pnpm project requirement.
- `tsx` added as a dev dependency for focused TypeScript utility tests.
- `npm run test` added for `newsletterCalendar`, `newsletterInsights`, `audienceMetrics`, and `overviewAnalytics` tests.
- `.gitignore` updated for generated artifacts, including `node_modules/`, `.next/`, and `tsconfig.tsbuildinfo`.
- README deployment notes updated with install, test, build, start, no-env, local JSON, and demo-data guidance.
- Portfolio screenshot checklist added for Overview data science, Audience master-detail, Calendar, newsletter drawer, and Report memo.
- Dependency audit reviewed with `npm audit --omit=dev`; no force audit fixes are part of this sprint.

Status:

- Implemented as a reliability and deployment-prep pass only.
- Product features, raw local JSON data, synthetic audience members, and analytics formulas remain unchanged.
- Verification flow is `npm ci`, `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`, and optional `npm run start`.
- Documentation should continue referencing the vibe-coding workflow repo where relevant: https://github.com/filipecalegario/awesome-vibe-coding.git

## Sprint 15 - UX/UI Polish + Portfolio Screenshot Pass

Goal: Make Campaign Pulse clearer, calmer, and portfolio-screenshot ready without adding major features or changing the static data architecture.

Deliverables:

- Global topbar/header spacing fixed so content no longer slides under the month selector.
- Visual system tightened into clearer panel roles: hero readout, metric strip, analysis panels, detail panels, and action panels.
- Major charts use question-led titles and short annotations that explain what to inspect.
- Overview remains a decision brief organized around what happened, why, where risk sits, and what to do next.
- Audience keeps every segment visible, simplifies segment cards to decision essentials, and moves selected segment detail closer to the overview.
- Calendar month view uses compact event cards, lighter selected-day state, clearer click behavior, and `+N more` overflow to avoid clipping.
- Newsletter drawer has a wider desktop layout, compact sticky header, clearer Main Read / Recommended Next Move treatment, and stronger Saturation Diagnosis.
- Monthly report has a cleaner executive memo hierarchy, calmer spacing, and print-friendly layout refinements.

Screenshot checklist:

- Overview decision brief and question-led charts.
- Audience all-segment overview.
- Audience selected segment detail.
- Pressure heatmap.
- Calendar Month view with compact cards and `+N more` overflow.
- Newsletter detail drawer.
- Monthly report screen and print preview.

Status:

- Implemented as a UX/UI polish pass only.
- Data architecture did not change: no backend, database, auth, uploads/imports, external APIs, AI calls, D3, PDF library, or real customer data were added.
- Dashboard data still comes from raw local `data/newsletter-performance.json`; metrics, saturation, fatigue, insights, recommendations, and report values remain computed from local facts.
- Documentation should continue referencing the vibe-coding workflow repo where relevant: https://github.com/filipecalegario/awesome-vibe-coding.git

## Sprint 16 - Editable Targets + Segment Movement Intelligence

Goal: Add editable business targets and segment movement intelligence without expanding the product into a backend, upload flow, planner, or new major screen.

Deliverables:

- `data/targets.json` with demo defaults for global, campaign, and segment targets.
- Target types, browser persistence helpers, deterministic target evaluation, tolerance bands, and status labels: On track, Watch, Off track.
- Data screen target editor with global targets, selected campaign targets, selected segment targets, Save, and Reset to demo defaults.
- Browser `localStorage` persistence for target edits, while source newsletter facts remain static local JSON demo data.
- Compact target status comparisons in Overview, Audience, Campaigns, Newsletters, and Monthly Report.
- Segment movement labels: Growing, Stable, Declining, Fatigued, Recovering.
- Movement explanations in Audience detail, computed from monthly segment trends and synthetic demo audience-member fatigue signals.
- Metric definitions documented: OR = opens / delivered, CTR = clicks / delivered, CTOR = clicks / opens, conversion rate = orders / delivered, RPR = revenue / delivered, unsubscribe rate = unsubscribes / delivered, spam rate = spam complaints / delivered.

Status:

- Implemented as an intelligence sprint only.
- No newsletter-level targets were added.
- No backend, database, auth, uploads/imports, external APIs, AI/LLM calls, D3, Planner, Insight action state, PDF library, benchmarks, or real customer data were added.
- Dashboard data still comes from raw local `data/newsletter-performance.json`; targets come from `data/targets.json` defaults plus browser `localStorage` edits.
- Documentation should continue referencing the vibe-coding workflow repo where relevant: https://github.com/filipecalegario/awesome-vibe-coding.git

## Sprint 17 - Interaction Clarity + Visual System Pass

Goal: Make Campaign Pulse easier to understand at a glance through clearer design, not more product surface area.

Deliverables:

- Reusable visual roles tightened across hero readouts, metric strips, analysis panels, detail panels, action panels, target status groups, and decision labels.
- Metric-specific target chips such as `Revenue on track`, `RPR on track`, `Pressure off track`, and `CTOR watch`.
- Overview reframed as mission control with business health, revenue vs target, engagement vs target, pressure risk, and best next move above the fold.
- Audience all-segment surface keeps every segment visible while improving selected state, click affordance, movement/target labels, pressure-map explanation, and selected detail hero connection.
- Calendar Month view communicates pressure through day tone and rails, clearer selected days, compact clickable send cards, `+N more`, and softer empty days while keeping Month / Week / Day.
- Newsletters table scans by rank, revenue, engagement, top target exceptions, risk, and open affordance.
- Campaign cards show Repeat / Repair / Pause recommendation, compact target summary, best send, weakest send, contribution, and existing pressure score.
- Data target editor stays a simple local form but groups fields by Business goals, Engagement goals, and Audience safety limits; comma and dot decimal inputs parse safely.
- Monthly Report uses a compact target strip, one-sentence target interpretation, cleaner memo spacing, and print-friendly layout.
- Newsletter drawer has a stronger sticky header, clearer Main Read -> Recommended Move -> Evidence order, and a stronger Saturation Diagnosis with fewer repeated mini metric boxes.

Status:

- Implemented as a UX/UI clarity pass only.
- No backend, database, auth, uploads/imports, external APIs, AI/LLM calls, D3, Planner, Insight workflow states, PDF library, new screens, major analytics formulas, or real customer data were added.
- Dashboard data still comes from raw local `data/newsletter-performance.json`; metrics, saturation, fatigue, insights, recommendations, targets, and report values remain computed in TypeScript from local facts plus browser-saved target settings.
- Screenshot readiness should focus on Overview mission control, Audience all-segment and detail views, Calendar pressure month view, scannable Newsletters/Campaigns, target editor grouping, Report target strip, and newsletter drawer diagnosis.
- Documentation should continue referencing the vibe-coding workflow repo where relevant: https://github.com/filipecalegario/awesome-vibe-coding.git

## Sprint 18 - GitHub Actions CI + Vercel Deployment Prep

Goal: Add a reliable repository quality gate and prepare the static Next.js demo for Git-connected Vercel deployments without changing the product.

Deliverables:

- `.github/workflows/ci.yml` triggered by pull requests and pushes to `main`.
- Node 20 CI with npm caching, `npm ci`, tests, lint, typecheck, and production build.
- Concurrency cancellation for superseded runs on the same branch or pull request.
- Source-clean CI guard that rejects committed `node_modules/`, `.next/`, `.pnpm-store/`, `tsconfig.tsbuildinfo`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`.
- `npm run verify` convenience command for test, lint, typecheck, and build.
- `.vercelignore` for dependency output, build output, coverage, logs, PID files, screenshots/exports, and temporary ZIP/PDF artifacts.
- Removal of pnpm workspace metadata while retaining `package-lock.json` as the only lockfile.
- README documentation for Vercel settings, Git preview/production deployments, local JSON data, browser-only target persistence, synthetic demo audience members, source-clean packaging, and the manual dependency-audit policy.

CI commands:

```bash
npm ci
npm run test
npm run lint
npm run typecheck
npm run build
```

Local verification:

```bash
npm ci
npm run verify
```

Vercel deployment checklist:

- Framework preset: Next.js.
- Install with `npm ci`.
- Build with `npm run build`.
- Leave the output directory at the Vercel default.
- Use `main` as the production branch.
- Configure no environment variables unless the architecture changes.
- Review a Git-connected preview deployment before production.

Source-clean packaging checklist:

- Keep `package-lock.json`.
- Exclude generated/dependency artifacts, pnpm metadata, logs, PID files, coverage, screenshots/exports, and temporary ZIP/PDF files.
- Keep application source, raw local JSON demo data, and required Next.js/npm configuration files.

Status:

- Implemented as CI and deployment preparation only.
- GitHub Actions verifies test, lint, typecheck, build, and source cleanliness.
- Vercel handles preview and production deployments through Git integration.
- `npm audit` is intentionally not a failing CI step; run `npm audit --omit=dev` manually and avoid `npm audit fix --force` without a controlled framework-upgrade QA pass.
- No backend, database, auth, uploads/imports, external APIs, AI/LLM calls, D3, new screens, analytics formula changes, or real customer data were added.
- Documentation continues to reference the vibe-coding workflow repo where relevant: https://github.com/filipecalegario/awesome-vibe-coding.git

## Sprint 19 - Adapter Contract + Demo Adapter

Goal: Introduce a real ingestion boundary so the dashboard no longer passes demo JSON directly into analytics.

Deliverables:

- `lib/adapters/` contract, normalized schema, demo JSON adapter, validation helper, and focused tests.
- Source types for Demo JSON, CSV export, Klaviyo, Mailchimp, HubSpot, and Customer.io.
- Demo JSON normalization for campaigns, segments, newsletters, flattened segment performance, optional audience members, optional targets, and metadata.
- Validation for required arrays, unique newsletter IDs, campaign/segment references, numeric metrics, parseable dates, delivered vs sent, and non-negative counts.
- App data loading routed through `demoJsonAdapter` before analytics.
- Audience demo members and default targets included in the normalized dataset when available.
- Data screen adapter readiness section with current source, status, record counts, issues, and future adapter placeholders.
- Adapter tests added to the existing npm test command.
- README and data contract documentation updated for the normalized data flow.

Status:

- Implemented as the smallest complete adapter architecture sprint.
- `demo_json` is the only implemented adapter. CSV export, Klaviyo, Mailchimp, HubSpot, and Customer.io are future placeholders only.
- Existing raw local JSON remains in place and retains its business meaning.
- Metrics, saturation, fatigue, insights, recommendations, targets, and reports remain computed in TypeScript from normalized facts.
- No live CRM/API integration, backend, database, auth, upload UI, scheduled sync, webhook, OAuth, secrets, AI/LLM calls, new screens, or major UX redesign were added.
- Documentation continues to reference the vibe-coding workflow repo where relevant: https://github.com/filipecalegario/awesome-vibe-coding.git

## Sprint 21 - Static Column-Mapping Preview + Rejected-Row Diagnostics

Goal: Make the Data screen show an inspectable import-readiness console: detected columns, mapped fields, accepted rows, rejected rows, and validation reasons.

Deliverables:

- `lib/adapters/columnMapping.ts` with `MappingConfidence` (`exact | inferred | missing`), `ColumnMappingEntry`, `ColumnMappingPreview`, `ImportReadinessSummary` types, and `buildColumnMappingPreview` and `buildImportReadinessSummary` helper functions.
- `buildRowDiagnostics` export from `lib/adapters/csvExportAdapter.ts` with `RowDiagnostic` and `RowDiagnosticIssue` types. Each diagnostic includes row number, accepted flag, source identifiers (newsletterId, campaignId, segmentId), and per-issue error type, human-readable reason, affected field, and raw value.
- Refactored `parseRowIsolated` inside the CSV adapter so per-row issues are tracked separately and accumulated; existing normalization output is unchanged.
- Import-readiness summary with total, accepted, rejected, and warning row counts plus normalized entity counts and validation status.
- Data screen now shows a compact import-readiness console section with: summary stats strip, column-mapping table (source field, normalized field, confidence, required flag), required-fields checklist with pass/fail indicators, rejected-row diagnostics table, accepted-rows confirmation panel, future-source placeholders, and unmapped-column callout.
- Column-mapping preview tests in `lib/adapters/columnMapping.test.ts`.
- Row-diagnostics tests added to `lib/adapters/csvExportAdapter.test.ts`: accepted/rejected counts, row number, identifiers, invalid dates, invalid numbers, negative metrics, delivered exceeds sent, and missing required fields with reason text.
- `package.json` test command includes `columnMapping.test.ts`.

Status:

- Implemented as the smallest complete adapter-inspection sprint.
- Static fixture only; no upload UI, live CRM/ESP API, editable mappings, backend, database, auth, OAuth, scheduled sync, webhooks, AI calls, new major screens, or major UX redesign were added.
- CSV adapter shape and normalized dataset output are unchanged; diagnostics are additive.
- Demo JSON adapter, CSV adapter, all existing analytics, targets, tests, CI, and Vercel deployment remain intact.
- Documentation continues to reference the vibe-coding workflow repo where relevant: https://github.com/filipecalegario/awesome-vibe-coding.git

## Sprint 20 - CSV Export Adapter + CRM/ESP Mapping Docs

Goal: Prove that realistic flat ESP/CRM export rows can normalize into the existing adapter contract without adding upload UI or live integrations.

Deliverables:

- `data/sample-newsletter-export-rows.json` with fake one-newsletter x one-segment rows.
- `lib/adapters/csvExportAdapter.ts` for flat-row parsing, merging, normalization, and validation.
- Parsing for whitespace, empty strings, comma/dot decimals, currency symbols, percentage strings, invalid numbers, and invalid dates.
- Validation for required send/newsletter/campaign/segment fields, negative metrics, delivered greater than sent, and broken normalized references.
- Focused adapter tests included in `npm run test`.
- Data screen readiness for the active Demo JSON adapter and the static sample CSV adapter.
- Required CSV field guidance and future Klaviyo, Mailchimp, HubSpot, and Customer.io source placeholders.
- `docs/source-mapping-examples.md` with vendor mapping assumptions and future API notes.

Status:

- Implemented as a static adapter-readiness sprint.
- Demo JSON remains the active dashboard source; the CSV/export fixture proves a second source can produce the same normalized dataset shape.
- The adapter assumes one newsletter x one segment per row and sums row metrics into newsletter aggregates.
- No upload UI, live CRM/ESP API, backend, database, auth, OAuth, secrets, scheduled sync, webhooks, AI calls, new screens, or major UX redesign were added.
- Documentation continues to reference the vibe-coding workflow repo where relevant: https://github.com/filipecalegario/awesome-vibe-coding.git
