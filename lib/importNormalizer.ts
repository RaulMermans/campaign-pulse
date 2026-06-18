import type { Campaign, Newsletter, Segment } from "./newsletterTypes";
import type { NormalizedNewsletterDataset, RawNewsletterImportRow } from "./importTypes";
import { getImportSummary, validateImportRows } from "./importValidation";

const campaignColors = ["#a77d55", "#6f8f83", "#8b7aa8", "#b36b5e", "#687d9c", "#9b8f5e"];

export function normalizeImportRows(rows: RawNewsletterImportRow[]): NormalizedNewsletterDataset {
  const validationIssues = validateImportRows(rows);
  const campaigns = buildCampaignsFromImport(rows);
  const segments = buildSegmentsFromImport(rows);
  const newsletters = buildNewslettersFromImport(rows);
  const firstMonth = newsletters[0]?.timing.sentAt.slice(0, 7) ?? "2026-03";
  const currency = rows.find((row) => row.currency)?.currency ?? "EUR";

  return {
    meta: {
      projectName: "Campaign Pulse",
      month: firstMonth,
      currency,
      source: "cleaned_excel_api_import_simulation",
      generatedAt: new Date("2026-03-31T18:00:00+01:00").toISOString()
    },
    campaigns,
    segments,
    newsletters,
    importSummary: getImportSummary(rows, validationIssues),
    validationIssues
  };
}

export function buildCampaignsFromImport(rows: RawNewsletterImportRow[]): Campaign[] {
  const grouped = groupBy(rows, (row) => row.campaign_id);

  return Object.entries(grouped).map(([campaignId, campaignRows], index) => {
    const sortedDates = campaignRows.map((row) => row.sent_at).sort();
    const first = campaignRows[0];

    return {
      id: campaignId,
      name: first.campaign_name,
      type: first.campaign_type,
      goal: getCampaignGoal(first.campaign_type),
      color: campaignColors[index % campaignColors.length],
      startDate: sortedDates[0]?.slice(0, 10) ?? "",
      endDate: sortedDates[sortedDates.length - 1]?.slice(0, 10) ?? ""
    };
  });
}

export function buildSegmentsFromImport(rows: RawNewsletterImportRow[]): Segment[] {
  const grouped = groupBy(rows, (row) => row.segment_id);

  return Object.entries(grouped).map(([segmentId, segmentRows]) => {
    const first = segmentRows[0];

    return {
      id: segmentId,
      name: first.segment_name,
      description: `Imported ${first.segment_name.toLowerCase()} audience from cleaned row-level export.`,
      lifecycleStage: getLifecycleStage(first.segment_name),
      valueTier: getValueTier(first.segment_name)
    };
  });
}

export function buildNewslettersFromImport(rows: RawNewsletterImportRow[]): Newsletter[] {
  const grouped = groupBy(rows, (row) => row.newsletter_id);
  const sequenceTotals = getCampaignSequenceTotals(rows);

  return Object.entries(grouped).map(([newsletterId, newsletterRows]) => {
    const first = newsletterRows[0];
    const metrics = sumNewsletterMetrics(newsletterRows);
    const segmentIds = newsletterRows.map((row) => row.segment_id);

    return {
      id: newsletterId,
      externalId: newsletterId,
      name: first.newsletter_name,
      title: first.newsletter_name,
      status: "sent",
      campaign: {
        id: first.campaign_id,
        name: first.campaign_name,
        type: first.campaign_type,
        stage: first.campaign_stage,
        sequencePosition: first.sequence_position,
        sequenceTotal: sequenceTotals[first.campaign_id] ?? first.sequence_position
      },
      timing: {
        sentAt: first.sent_at,
        timezone: "Europe/Madrid"
      },
      content: {
        subjectLine: first.subject_line,
        previewText: first.preview_text,
        senderName: first.sender_name,
        contentType: first.content_type,
        creativeAngle: first.creative_angle,
        messageTheme: first.message_theme,
        ctaLabel: first.cta_label,
        ctaType: getCtaType(first.offer_type),
        landingPageUrl: first.landing_page_url,
        creativeUrl: first.creative_url,
        notes: first.notes
      },
      offer: {
        offerType: first.offer_type,
        discountValue: first.discount_value,
        discountType: first.discount_value > 0 ? "percent" : "none",
        productFocus: first.product_focus,
        collection: first.product_focus,
        pricePoint: "mixed",
        businessGoal: getCampaignGoal(first.campaign_type)
      },
      audience: {
        audienceName: newsletterRows.map((row) => row.segment_name).join(" + "),
        audienceType: first.audience_type,
        primarySegmentId: first.segment_id,
        segmentIds,
        exclusionSegmentIds: [],
        recipientCount: metrics.sent
      },
      metrics,
      segmentPerformance: newsletterRows.map((row) => ({
        segmentId: row.segment_id,
        segmentName: row.segment_name,
        sent: row.sent,
        delivered: row.delivered,
        uniqueOpens: row.unique_opens,
        uniqueClicks: row.unique_clicks,
        orders: row.orders,
        revenue: row.revenue,
        unsubscribes: row.unsubscribes
      }))
    };
  });
}

function sumNewsletterMetrics(rows: RawNewsletterImportRow[]): Newsletter["metrics"] {
  return {
    sent: sum(rows, "sent"),
    delivered: sum(rows, "delivered"),
    bounced: sum(rows, "bounced"),
    uniqueOpens: sum(rows, "unique_opens"),
    totalOpens: sum(rows, "total_opens"),
    uniqueClicks: sum(rows, "unique_clicks"),
    totalClicks: sum(rows, "total_clicks"),
    orders: sum(rows, "orders"),
    revenue: sum(rows, "revenue"),
    currency: rows[0]?.currency ?? "EUR",
    unsubscribes: sum(rows, "unsubscribes"),
    spamComplaints: sum(rows, "spam_complaints"),
    attributionWindow: rows[0]?.attribution_window ?? "7d"
  };
}

function getCampaignSequenceTotals(rows: RawNewsletterImportRow[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.campaign_id] = Math.max(acc[row.campaign_id] ?? 0, row.sequence_position);
    return acc;
  }, {});
}

function getCampaignGoal(campaignType: string): string {
  const goals: Record<string, string> = {
    promotion: "Drive revenue while monitoring audience pressure.",
    editorial: "Build engagement and product context before commercial pushes.",
    event: "Convert high-intent audiences into event participation.",
    retention: "Recover valuable audiences with lower-pressure content."
  };

  return goals[campaignType] ?? "Import campaign performance into the dashboard.";
}

function getLifecycleStage(segmentName: string): string {
  const value = segmentName.toLowerCase();
  if (value.includes("vip")) return "loyalty";
  if (value.includes("recent")) return "post_purchase";
  if (value.includes("lead")) return "acquisition";
  if (value.includes("event")) return "intent";
  return "active";
}

function getValueTier(segmentName: string): string {
  const value = segmentName.toLowerCase();
  if (value.includes("vip")) return "high";
  if (value.includes("recent")) return "medium_high";
  if (value.includes("lead")) return "developing";
  return "medium";
}

function getCtaType(offerType: string): string {
  if (offerType.includes("event")) return "registration";
  if (offerType.includes("discount") || offerType.includes("access")) return "commerce";
  return "content";
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    acc[getKey(item)] ||= [];
    acc[getKey(item)].push(item);
    return acc;
  }, {});
}

function sum(rows: RawNewsletterImportRow[], field: keyof RawNewsletterImportRow): number {
  return rows.reduce((total, row) => total + Number(row[field] ?? 0), 0);
}
