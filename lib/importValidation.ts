import type { ImportSummary, ImportValidationIssue, RawNewsletterImportRow } from "./importTypes";

const requiredFields: (keyof RawNewsletterImportRow)[] = [
  "newsletter_id",
  "newsletter_name",
  "campaign_id",
  "campaign_name",
  "campaign_type",
  "campaign_stage",
  "sequence_position",
  "sent_at",
  "subject_line",
  "preview_text",
  "sender_name",
  "content_type",
  "creative_angle",
  "message_theme",
  "cta_label",
  "offer_type",
  "discount_value",
  "product_focus",
  "segment_id",
  "segment_name",
  "audience_type",
  "sent",
  "delivered",
  "bounced",
  "unique_opens",
  "total_opens",
  "unique_clicks",
  "total_clicks",
  "orders",
  "revenue",
  "currency",
  "unsubscribes",
  "spam_complaints",
  "attribution_window",
  "creative_url",
  "landing_page_url",
  "notes"
];

const metricFields: (keyof RawNewsletterImportRow)[] = [
  "sequence_position",
  "discount_value",
  "sent",
  "delivered",
  "bounced",
  "unique_opens",
  "total_opens",
  "unique_clicks",
  "total_clicks",
  "orders",
  "revenue",
  "unsubscribes",
  "spam_complaints"
];

export function validateImportRows(rows: RawNewsletterImportRow[]): ImportValidationIssue[] {
  return [
    ...findMissingRequiredFields(rows),
    ...findInvalidMetricValues(rows),
    ...findDuplicateNewsletterSegmentRows(rows)
  ];
}

export function getImportSummary(rows: RawNewsletterImportRow[], issues = validateImportRows(rows)): ImportSummary {
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;

  return {
    rowCount: rows.length,
    newsletterCount: new Set(rows.map((row) => row.newsletter_id).filter(Boolean)).size,
    campaignCount: new Set(rows.map((row) => row.campaign_id).filter(Boolean)).size,
    segmentCount: new Set(rows.map((row) => row.segment_id).filter(Boolean)).size,
    issueCount: issues.length,
    errorCount,
    warningCount,
    status: errorCount ? "blocked" : warningCount ? "needs_review" : "ready"
  };
}

export function findMissingRequiredFields(rows: RawNewsletterImportRow[]): ImportValidationIssue[] {
  return rows.flatMap((row, rowIndex) =>
    requiredFields.flatMap((field) => {
      const value = row[field];
      if (value === null || value === undefined || value === "") {
        return [createIssue(rowIndex, "error", field, `Missing required field: ${field}.`)];
      }
      return [];
    })
  );
}

export function findInvalidMetricValues(rows: RawNewsletterImportRow[]): ImportValidationIssue[] {
  return rows.flatMap((row, rowIndex) => {
    const issues: ImportValidationIssue[] = [];

    metricFields.forEach((field) => {
      const value = row[field];
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        issues.push(createIssue(rowIndex, "error", field, `${field} must be a valid non-negative number.`));
      }
    });

    if (isNumber(row.delivered) && isNumber(row.sent) && row.delivered > row.sent) {
      issues.push(createIssue(rowIndex, "error", "delivered", "Delivered cannot be greater than sent."));
    }

    if (isNumber(row.unique_opens) && isNumber(row.delivered) && row.unique_opens > row.delivered) {
      issues.push(createIssue(rowIndex, "error", "unique_opens", "Unique opens cannot be greater than delivered."));
    }

    if (isNumber(row.unique_clicks) && isNumber(row.delivered) && row.unique_clicks > row.delivered) {
      issues.push(createIssue(rowIndex, "error", "unique_clicks", "Unique clicks cannot be greater than delivered."));
    }

    return issues;
  });
}

export function findDuplicateNewsletterSegmentRows(rows: RawNewsletterImportRow[]): ImportValidationIssue[] {
  const seen = new Map<string, number>();
  const issues: ImportValidationIssue[] = [];

  rows.forEach((row, rowIndex) => {
    const key = `${row.newsletter_id}::${row.segment_id}`;
    const firstIndex = seen.get(key);

    if (firstIndex !== undefined) {
      issues.push({
        id: `duplicate-${row.newsletter_id}-${row.segment_id}-${rowIndex}`,
        rowIndex,
        severity: "error",
        message: `Duplicate newsletter + segment row also appears at row ${firstIndex + 1}.`
      });
      return;
    }

    seen.set(key, rowIndex);
  });

  return issues;
}

function createIssue(
  rowIndex: number,
  severity: ImportValidationIssue["severity"],
  field: keyof RawNewsletterImportRow,
  message: string
): ImportValidationIssue {
  return {
    id: `${field}-${rowIndex}-${message.replaceAll(" ", "-").toLowerCase()}`,
    rowIndex,
    severity,
    field,
    message
  };
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
