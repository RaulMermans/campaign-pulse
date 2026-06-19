# CRM/ESP Source Mapping Examples

Sprint 20 documents how flat CRM/ESP exports can map into the Campaign Pulse normalized adapter contract.

These are implementation examples, not promises that every vendor export uses identical headers. Export formats vary by report, account configuration, locale, and product version. The current product reads only the static fake fixture in `data/sample-newsletter-export-rows.json`; it does not connect to vendor APIs.

Reference inspiration/context for vibe-coding workflows: https://github.com/filipecalegario/awesome-vibe-coding.git

## Normalized row expectation

The CSV adapter expects one row per newsletter x segment with these required fields:

| Export field | Normalized destination |
| --- | --- |
| `sendDate` | `newsletter.timing.sentAt` and campaign date range |
| `newsletterId`, `newsletterName` | newsletter identity |
| `campaignId`, `campaignName` | campaign identity and newsletter campaign reference |
| `segmentId`, `segmentName` | segment identity and segment performance reference |
| `sent`, `delivered` | newsletter and segment delivery metrics |
| `opens`, `clicks` | `uniqueOpens`, `uniqueClicks` |
| `orders`, `revenue` | conversion and revenue facts |
| `unsubscribes`, `spamComplaints` | audience safety facts |

`subject` and `creativeAngle` are optional. Missing normalized content, offer, campaign strategy, segment profile, timezone, currency, and attribution fields receive documented demo defaults.

## Klaviyo export example

Expected fields:

- message/campaign ID and name
- send time
- subject
- list or segment ID and name
- recipients, delivered, unique opens, unique clicks
- placed orders, attributed revenue, unsubscribes, spam complaints

Mapping:

| Klaviyo-style field | Campaign Pulse field |
| --- | --- |
| Campaign ID / Message ID | `newsletterId` |
| Campaign Name | `newsletterName` |
| Campaign grouping or flow name | `campaignId`, `campaignName` |
| Send Time | `sendDate` |
| Subject | `subject` |
| Segment/List ID and name | `segmentId`, `segmentName` |
| Recipients / Delivered | `sent`, `delivered` |
| Unique Opens / Unique Clicks | `opens`, `clicks` |
| Placed Order / Revenue | `orders`, `revenue` |
| Unsubscribes / Spam Complaints | matching safety fields |

Unsupported or commonly missing fields:

- Campaign Pulse campaign goal, color, stage, and sequence metadata
- segment lifecycle stage and value tier
- creative URL, CTA metadata, offer detail, and exclusion segments

Assumptions:

- Export metrics are already grouped to one message x segment row.
- Revenue uses one consistent account currency and attribution definition.
- Opens and clicks are unique counts.

Future API integration notes:

- A future Klaviyo adapter would resolve campaigns, flows, lists/segments, and metric attribution through authenticated APIs before producing this same normalized contract.
- OAuth/API keys, pagination, rate limits, backfills, and scheduled sync are outside Sprint 20.

## Mailchimp export example

Expected fields:

- campaign ID and title
- send time and subject line
- audience/list and saved segment identifiers
- emails sent, delivered, unique opens, unique clicks
- orders, revenue, unsubscribes, abuse reports

Mapping:

| Mailchimp-style field | Campaign Pulse field |
| --- | --- |
| Campaign ID | `newsletterId` |
| Campaign Title | `newsletterName` |
| Folder/tag/automation grouping | `campaignId`, `campaignName` |
| Send Time | `sendDate` |
| Subject Line | `subject` |
| Audience/Segment ID and name | `segmentId`, `segmentName` |
| Emails Sent / Successful Deliveries | `sent`, `delivered` |
| Unique Opens / Unique Clicks | `opens`, `clicks` |
| Orders / Revenue | `orders`, `revenue` |
| Unsubscribed / Abuse Reports | `unsubscribes`, `spamComplaints` |

Unsupported or commonly missing fields:

- a durable parent campaign grouping for one-off sends
- Campaign Pulse creative angle and offer metadata
- ecommerce facts when store tracking is not configured

Assumptions:

- A stable synthetic parent campaign ID may be created from a folder, automation, tag, or reporting period.
- Missing ecommerce metrics must be exported as numeric zero only when the source confirms no activity, not when tracking is unavailable.

Future API integration notes:

- A future adapter would join campaign reports, audience segments, and ecommerce reports.
- API authentication, account selection, pagination, and incremental sync are not implemented.

## HubSpot export example

Expected fields:

- marketing email ID and name
- campaign ID/name when assigned
- send date and subject
- recipient list/segment identifier
- sent, delivered, unique opens, unique clicks
- orders/revenue from an agreed commerce attribution export
- unsubscribes and spam reports

Mapping:

| HubSpot-style field | Campaign Pulse field |
| --- | --- |
| Marketing Email ID / Name | `newsletterId`, `newsletterName` |
| Campaign ID / Campaign Name | `campaignId`, `campaignName` |
| Send Date | `sendDate` |
| Subject | `subject` |
| List ID / List Name | `segmentId`, `segmentName` |
| Sent / Delivered | matching delivery fields |
| Unique Opens / Unique Clicks | `opens`, `clicks` |
| Attributed deals/orders and revenue | `orders`, `revenue` |
| Unsubscribes / Spam Reports | matching safety fields |

Unsupported or commonly missing fields:

- order and revenue facts in a standalone email-performance export
- exact segment-level performance if the report is email-level only
- Campaign Pulse content, offer, and audience classification fields

Assumptions:

- Revenue requires a separately agreed attribution model and join key.
- A contact-list export alone is not sufficient; aggregate performance must remain privacy-safe.

Future API integration notes:

- A future adapter would join marketing email analytics, campaigns, lists, and commerce/deal attribution.
- Private-app credentials, OAuth, scopes, association joins, and sync jobs are outside Sprint 20.

## Customer.io export example

Expected fields:

- delivery/message ID and newsletter or broadcast name
- campaign/broadcast/workflow identifier
- sent time and subject
- segment identifier/name
- sent, delivered, unique opened, unique clicked
- conversion count/revenue when tracked
- unsubscribed and spam complaint counts

Mapping:

| Customer.io-style field | Campaign Pulse field |
| --- | --- |
| Delivery/Message ID | `newsletterId` |
| Newsletter/Broadcast name | `newsletterName` |
| Campaign/Broadcast/Workflow ID and name | `campaignId`, `campaignName` |
| Sent At | `sendDate` |
| Subject | `subject` |
| Segment ID / Segment Name | `segmentId`, `segmentName` |
| Sent / Delivered | matching delivery fields |
| Unique Opened / Unique Clicked | `opens`, `clicks` |
| Converted / Tracked revenue | `orders`, `revenue` |
| Unsubscribed / Spammed | matching safety fields |

Unsupported or commonly missing fields:

- stable ecommerce revenue without custom event tracking
- creative angle, offer detail, campaign goal, and segment value tier
- segment-level rows when only message totals are exported

Assumptions:

- Conversion and revenue definitions are configured consistently before export.
- Broadcasts and journeys are reduced to one parent campaign concept for Campaign Pulse.

Future API integration notes:

- A future adapter would resolve broadcasts, campaigns, deliveries, segments, and tracked conversion events.
- Credentials, workspace selection, pagination, webhooks, and scheduled imports are not implemented.

## Generic CSV export

Expected fields are the adapter’s canonical headers:

```text
sendDate, newsletterName, newsletterId, campaignName, campaignId,
segmentName, segmentId, subject, creativeAngle, sent, delivered,
opens, clicks, orders, revenue, unsubscribes, spamComplaints
```

Mapping:

- Identity fields create and merge campaigns, segments, and newsletters.
- Each row becomes segment performance; repeated newsletter/segment rows are summed.
- Newsletter aggregate metrics are summed from its segment rows.
- Campaign start/end dates are derived from valid newsletter send dates.
- `subject` defaults to `Imported newsletter`; `creativeAngle` defaults to `unspecified`.

Unsupported or missing fields:

- audience members and editable targets
- newsletter preview text, CTA, URLs, offer metadata, exclusions, and detailed attribution settings
- vendor-specific fields that do not map to raw Campaign Pulse facts

Parsing assumptions:

- Whitespace is trimmed.
- European and US-style decimal/currency strings are normalized.
- Currency symbols are removed; the static fixture defaults to EUR.
- Percentage signs are removed and the displayed numeric value is retained (`31.4%` becomes `31.4`).
- Empty or invalid required numeric values are errors.
- Negative metrics, invalid dates, missing references, and delivered greater than sent are errors.

Future API integration notes:

- A later upload flow could parse a user-selected file and pass rows to this adapter without changing analytics.
- Upload UI, storage, live APIs, OAuth, secrets, scheduled sync, and webhooks are intentionally absent.
