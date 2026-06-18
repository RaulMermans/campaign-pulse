# Campaign Pulse — Project Brief

## 1. Project identity

**Name:** Campaign Pulse  
**Archetype:** prototype  
**One-line pitch:** A newsletter performance command center that turns monthly sends into campaign, segment, and saturation intelligence.

## 2. Problem + user

Newsletter operators often have performance data scattered across email platforms, revenue tools, and spreadsheets. They can see metrics, but they struggle to interpret campaign rhythm, audience fatigue, segment quality, and what should be repeated.

**Primary users:** marketers, brand operators, founders, newsletter managers, lifecycle teams.

**User story:** As a newsletter operator, I want a single command center for campaign performance so that I can understand what worked, what degraded, and what to do next.

## 3. Outcome + success metrics

Success looks like:

- User understands the month in under 10 seconds.
- Best newsletter and best campaign are obvious.
- Segment saturation is visible.
- Detail data is available without spreadsheet hunting.

KPIs:

- Dashboard renders all sends.
- Metrics are calculated from JSON, not hardcoded.
- At least 3 strategic insights appear from mock data.

## 4. Constraints

- Use local JSON for Sprint 00.
- No backend.
- No auth.
- No database.
- No external APIs.
- Keep dependencies minimal.

## 5. Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Static JSON

## 6. MVP features

- KPI strip
- Monthly calendar
- Newsletter cards
- Intelligence panel
- Campaign performance cards
- Newsletter audit table
- Mock saturation diagnosis

## 7. Risks + unknowns

- Fake data must feel realistic enough to support interface logic.
- Saturation logic should be clearly framed as directional, not absolute truth.
- The UI must avoid becoming a generic admin dashboard.

## 8. Data + integrations

Current:

- `data/newsletter-performance.json`

Future:

- Cleaned Excel upload
- Google Sheets
- Klaviyo
- Mailchimp
- Shopify
- Stripe

## 9. UX notes

The interface should feel like an editorial strategy room: premium, clean, analytical, and strategic. The dashboard should translate raw metrics into judgment.

## 10. First tasks

1. Scaffold static dashboard.
2. Add mock JSON data.
3. Add metric utilities.
4. Render command-center interface.
5. Prepare next sprint for UI polish and detail drawer.
