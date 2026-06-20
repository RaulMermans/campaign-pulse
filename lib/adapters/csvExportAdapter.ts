import type { Campaign, Newsletter, Segment, SegmentPerformance } from "../newsletterTypes";
import type { NormalizedDataset, NormalizedSegmentPerformance } from "./normalizedSchema";
import type { AdapterValidationIssue, AdapterValidationResult, DataAdapter } from "./types";
import { validateNormalizedDataset } from "./validateNormalizedDataset";

export interface CsvExportRow {
  sendDate?: unknown;
  newsletterName?: unknown;
  newsletterId?: unknown;
  campaignName?: unknown;
  campaignId?: unknown;
  segmentName?: unknown;
  segmentId?: unknown;
  subject?: unknown;
  creativeAngle?: unknown;
  sent?: unknown;
  delivered?: unknown;
  opens?: unknown;
  clicks?: unknown;
  orders?: unknown;
  revenue?: unknown;
  unsubscribes?: unknown;
  spamComplaints?: unknown;
  [field: string]: unknown;
}

interface ParsedExportRow {
  rowIndex: number;
  sendDate: string;
  newsletterName: string;
  newsletterId: string;
  campaignName: string;
  campaignId: string;
  segmentName: string;
  segmentId: string;
  subject: string;
  creativeAngle: string;
  sent: number;
  delivered: number;
  opens: number;
  clicks: number;
  orders: number;
  revenue: number;
  unsubscribes: number;
  spamComplaints: number;
}

const source = {
  id: "campaign-pulse-sample-csv-export",
  label: "Sample CSV export",
  type: "csv_export" as const
};

const requiredTextFields = [
  "sendDate",
  "newsletterId",
  "newsletterName",
  "campaignId",
  "campaignName",
  "segmentId",
  "segmentName"
] as const;

const numericFields = [
  "sent",
  "delivered",
  "opens",
  "clicks",
  "orders",
  "revenue",
  "unsubscribes",
  "spamComplaints"
] as const;

const campaignColors = ["#7c3aed", "#0f766e", "#c026d3", "#d97706", "#2563eb", "#be123c"];

export interface RowDiagnosticIssue {
  code: string;
  errorType: string;
  reason: string;
  field: string;
  rawValue: string;
}

export interface RowDiagnostic {
  rowNumber: number;
  accepted: boolean;
  newsletterId: string;
  newsletterName: string;
  campaignId: string;
  segmentId: string;
  errors: RowDiagnosticIssue[];
  warnings: RowDiagnosticIssue[];
}

export const csvExportAdapter: DataAdapter<unknown, NormalizedDataset> = {
  ...source,
  validate(input) {
    return buildNormalization(input).validation;
  },
  normalize(input) {
    const result = buildNormalization(input);
    return {
      dataset: result.dataset,
      warnings: result.validation.warnings,
      errors: result.validation.errors
    };
  }
};

export function buildRowDiagnostics(input: unknown): RowDiagnostic[] {
  if (!Array.isArray(input)) return [];

  return input.flatMap((value, rowIndex) => {
    if (!isRecord(value)) return [];
    const row = value as CsvExportRow;
    const { parsed, errors, warnings } = parseRowIsolated(row, rowIndex);
    return [{
      rowNumber: rowIndex + 1,
      accepted: errors.length === 0,
      newsletterId: parsed.newsletterId,
      newsletterName: parsed.newsletterName,
      campaignId: parsed.campaignId,
      segmentId: parsed.segmentId,
      errors: errors.map((issueItem) => adapterIssueToRowDiagnostic(issueItem, row)),
      warnings: warnings.map((issueItem) => adapterIssueToRowDiagnostic(issueItem, row))
    }];
  });
}

function adapterIssueToRowDiagnostic(issueItem: AdapterValidationIssue, row: CsvExportRow): RowDiagnosticIssue {
  const fieldMatch = issueItem.path?.match(/\.([^.[\]]+)$/);
  const field = fieldMatch ? fieldMatch[1] : (issueItem.path ?? "");
  const rawValue = field && field in row ? String(row[field as keyof CsvExportRow] ?? "") : "";
  return {
    code: issueItem.code,
    errorType: codeToErrorType(issueItem.code),
    reason: issueItem.message,
    field,
    rawValue
  };
}

function codeToErrorType(code: string): string {
  switch (code) {
    case "missing_send_date": return "Missing required field";
    case "missing_newsletter_reference": return "Missing required field";
    case "missing_campaign_reference": return "Missing required field";
    case "missing_segment_reference": return "Missing required field";
    case "invalid_date": return "Invalid date";
    case "invalid_numeric_field": return "Invalid number";
    case "negative_metric": return "Negative metric";
    case "delivered_exceeds_sent": return "Delivery sanity";
    case "missing_optional_field": return "Missing optional field";
    default: return "Validation error";
  }
}

export function parseCsvExportNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
  if (typeof value !== "string") return Number.NaN;

  let normalized = value.trim();
  if (!normalized) return Number.NaN;

  const isParenthesizedNegative = normalized.startsWith("(") && normalized.endsWith(")");
  normalized = normalized
    .replace(/[€$£¥%]/g, "")
    .replace(/\s|\u00a0/g, "")
    .replace(/[()]/g, "");

  if (!normalized || !/[0-9]/.test(normalized)) return Number.NaN;

  const commaIndex = normalized.lastIndexOf(",");
  const dotIndex = normalized.lastIndexOf(".");

  if (commaIndex >= 0 && dotIndex >= 0) {
    const decimalSeparator = commaIndex > dotIndex ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = normalized.replaceAll(thousandsSeparator, "").replace(decimalSeparator, ".");
  } else if (commaIndex >= 0) {
    normalized = normalizeSingleSeparator(normalized, ",");
  } else if (dotIndex >= 0) {
    normalized = normalizeSingleSeparator(normalized, ".");
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return Number.NaN;
  return isParenthesizedNegative ? -parsed : parsed;
}

function buildNormalization(input: unknown): { dataset: NormalizedDataset; validation: AdapterValidationResult } {
  const adapterWarnings: AdapterValidationIssue[] = [];
  const adapterErrors: AdapterValidationIssue[] = [];
  const rows = getRows(input, adapterErrors);
  const rowResults = rows.map((row, rowIndex) => parseRowIsolated(row, rowIndex));
  rowResults.forEach((result) => {
    adapterErrors.push(...result.errors);
    adapterWarnings.push(...result.warnings);
  });
  const parsedRows = rowResults.map((result) => result.parsed);
  const campaigns = buildCampaigns(parsedRows, adapterWarnings);
  const segments = buildSegments(parsedRows, adapterWarnings);
  const newsletters = buildNewsletters(parsedRows, adapterWarnings);
  const segmentPerformance: NormalizedSegmentPerformance[] = newsletters.flatMap((newsletter) =>
    newsletter.segmentPerformance.map((performance) => ({
      ...performance,
      newsletterId: newsletter.id,
      campaignId: newsletter.campaign.id
    }))
  );
  const validDates = parsedRows.map((row) => row.sendDate).filter(isValidDate).sort();
  const importedAt = validDates.length
    ? new Date(validDates[validDates.length - 1]).toISOString()
    : new Date(0).toISOString();
  const sourceMetadata = {
    projectName: "Campaign Pulse",
    currency: "EUR",
    source: "Static fake newsletter CSV/export fixture",
    generatedAt: importedAt,
    schemaVersion: "csv-export-adapter-v1",
    sourceShape: "one_newsletter_x_segment_per_row"
  };
  const normalizedValidation = validateNormalizedDataset({
    campaigns,
    segments,
    newsletters,
    audienceMembers: [],
    targets: null,
    meta: sourceMetadata
  });
  const validation = createValidation(
    dedupeIssues([...adapterWarnings, ...normalizedValidation.warnings]),
    dedupeIssues([...adapterErrors, ...normalizedValidation.errors])
  );

  return {
    dataset: {
      campaigns,
      segments,
      newsletters,
      segmentPerformance,
      audienceMembers: [],
      targets: null,
      metadata: {
        source,
        importedAt,
        recordCounts: {
          campaigns: campaigns.length,
          segments: segments.length,
          newsletters: newsletters.length,
          segmentPerformance: segmentPerformance.length,
          audienceMembers: 0
        },
        validation,
        sourceMetadata
      }
    },
    validation
  };
}

function getRows(input: unknown, errors: AdapterValidationIssue[]): CsvExportRow[] {
  if (!Array.isArray(input)) {
    errors.push(issue("invalid_export_root", "CSV/export input must be an array of flat row objects.", "$"));
    return [];
  }
  if (!input.length) {
    errors.push(issue("empty_export", "CSV/export input must contain at least one row.", "$"));
  }

  return input.flatMap((value, rowIndex) => {
    if (isRecord(value)) return [value as CsvExportRow];
    errors.push(issue("invalid_export_row", "Export row must be an object.", `rows[${rowIndex}]`));
    return [];
  });
}

function parseRowIsolated(
  row: CsvExportRow,
  rowIndex: number
): { parsed: ParsedExportRow; errors: AdapterValidationIssue[]; warnings: AdapterValidationIssue[] } {
  const errors: AdapterValidationIssue[] = [];
  const warnings: AdapterValidationIssue[] = [];

  requiredTextFields.forEach((field) => {
    if (!cleanString(row[field])) {
      const code = field === "sendDate"
        ? "missing_send_date"
        : field.startsWith("newsletter")
          ? "missing_newsletter_reference"
          : field.startsWith("campaign")
            ? "missing_campaign_reference"
            : "missing_segment_reference";
      errors.push(issue(code, `${field} is required.`, `rows[${rowIndex}].${field}`));
    }
  });

  const sendDate = cleanString(row.sendDate);
  if (sendDate && !isValidDate(sendDate)) {
    errors.push(issue("invalid_date", "sendDate must be a parseable date string.", `rows[${rowIndex}].sendDate`));
  }

  const metrics = numericFields.reduce<Record<(typeof numericFields)[number], number>>((parsed, field) => {
    const value = parseCsvExportNumber(row[field]);
    parsed[field] = value;
    if (!Number.isFinite(value)) {
      errors.push(issue("invalid_numeric_field", `${field} must be a valid number.`, `rows[${rowIndex}].${field}`));
    } else if (value < 0) {
      errors.push(issue("negative_metric", `${field} cannot be negative.`, `rows[${rowIndex}].${field}`));
    }
    return parsed;
  }, {} as Record<(typeof numericFields)[number], number>);

  if (Number.isFinite(metrics.sent) && Number.isFinite(metrics.delivered) && metrics.delivered > metrics.sent) {
    errors.push(issue("delivered_exceeds_sent", "delivered cannot be greater than sent.", `rows[${rowIndex}].delivered`));
  }

  const subject = cleanString(row.subject);
  const creativeAngle = cleanString(row.creativeAngle);
  if (!subject) {
    warnings.push(issue("missing_optional_field", "subject is missing; a neutral import label will be used.", `rows[${rowIndex}].subject`, "warning"));
  }
  if (!creativeAngle) {
    warnings.push(issue("missing_optional_field", "creativeAngle is missing; \"unspecified\" will be used.", `rows[${rowIndex}].creativeAngle`, "warning"));
  }

  return {
    parsed: {
      rowIndex,
      sendDate,
      newsletterId: cleanString(row.newsletterId) || `missing_newsletter_${rowIndex + 1}`,
      newsletterName: cleanString(row.newsletterName) || "Unnamed imported newsletter",
      campaignId: cleanString(row.campaignId) || `missing_campaign_${rowIndex + 1}`,
      campaignName: cleanString(row.campaignName) || "Unnamed imported campaign",
      segmentId: cleanString(row.segmentId) || `missing_segment_${rowIndex + 1}`,
      segmentName: cleanString(row.segmentName) || "Unnamed imported segment",
      subject: subject || "Imported newsletter",
      creativeAngle: creativeAngle || "unspecified",
      ...metrics
    },
    errors,
    warnings
  };
}

function buildCampaigns(rows: ParsedExportRow[], warnings: AdapterValidationIssue[]): Campaign[] {
  const grouped = groupBy(rows, (row) => row.campaignId);

  return Array.from(grouped.entries()).map(([campaignId, campaignRows], index) => {
    warnOnConflictingNames(campaignRows, "campaignName", campaignId, "campaign", warnings);
    const validDates = campaignRows.map((row) => row.sendDate).filter(isValidDate).sort();
    const fallbackDate = campaignRows[0]?.sendDate ?? "";
    const campaignName = campaignRows[0]?.campaignName ?? "Unnamed imported campaign";
    const campaignType = inferCampaignType(campaignName);

    return {
      id: campaignId,
      name: campaignName,
      type: campaignType,
      goal: getCampaignGoal(campaignType),
      color: campaignColors[index % campaignColors.length],
      startDate: validDates[0] ? toDateOnly(validDates[0]) : fallbackDate,
      endDate: validDates.length ? toDateOnly(validDates[validDates.length - 1]) : fallbackDate
    };
  });
}

function buildSegments(rows: ParsedExportRow[], warnings: AdapterValidationIssue[]): Segment[] {
  const grouped = groupBy(rows, (row) => row.segmentId);

  return Array.from(grouped.entries()).map(([segmentId, segmentRows]) => {
    warnOnConflictingNames(segmentRows, "segmentName", segmentId, "segment", warnings);
    const segmentName = segmentRows[0]?.segmentName ?? "Unnamed imported segment";
    return {
      id: segmentId,
      name: segmentName,
      description: `Imported ${segmentName.toLowerCase()} audience from the static CSV/export fixture.`,
      lifecycleStage: inferLifecycleStage(segmentName),
      valueTier: inferValueTier(segmentName)
    };
  });
}

function buildNewsletters(rows: ParsedExportRow[], warnings: AdapterValidationIssue[]): Newsletter[] {
  const grouped = groupBy(rows, (row) => row.newsletterId);
  const campaignSequences = new Map<string, string[]>();

  Array.from(grouped.values()).forEach((newsletterRows) => {
    const first = newsletterRows[0];
    const ids = campaignSequences.get(first.campaignId) ?? [];
    ids.push(first.newsletterId);
    campaignSequences.set(first.campaignId, ids);
  });
  campaignSequences.forEach((ids) => {
    ids.sort((left, right) => {
      const leftDate = grouped.get(left)?.[0]?.sendDate ?? "";
      const rightDate = grouped.get(right)?.[0]?.sendDate ?? "";
      return leftDate.localeCompare(rightDate);
    });
  });

  return Array.from(grouped.entries()).map(([newsletterId, newsletterRows]) => {
    const first = newsletterRows[0];
    warnOnConflictingNames(newsletterRows, "newsletterName", newsletterId, "newsletter", warnings);
    const mergedSegmentPerformance = mergeSegmentPerformance(newsletterRows);
    const metrics = sumNewsletterMetrics(mergedSegmentPerformance, newsletterRows);
    const sequence = campaignSequences.get(first.campaignId) ?? [newsletterId];
    const segmentIds = mergedSegmentPerformance.map((performance) => performance.segmentId);

    return {
      id: newsletterId,
      externalId: newsletterId,
      name: first.newsletterName,
      title: first.newsletterName,
      status: "sent",
      campaign: {
        id: first.campaignId,
        name: first.campaignName,
        type: inferCampaignType(first.campaignName),
        stage: "exported",
        sequencePosition: Math.max(sequence.indexOf(newsletterId) + 1, 1),
        sequenceTotal: sequence.length
      },
      timing: {
        sentAt: first.sendDate,
        timezone: "UTC"
      },
      content: {
        subjectLine: first.subject,
        previewText: "",
        senderName: "Imported ESP export",
        contentType: "newsletter",
        creativeAngle: first.creativeAngle,
        messageTheme: first.creativeAngle,
        ctaLabel: "",
        ctaType: "unknown",
        landingPageUrl: "",
        creativeUrl: "",
        notes: "Normalized from the static fake CSV/export fixture."
      },
      offer: {
        offerType: "unknown",
        discountValue: 0,
        discountType: "none",
        productFocus: "",
        collection: "",
        pricePoint: "unknown",
        businessGoal: getCampaignGoal(inferCampaignType(first.campaignName))
      },
      audience: {
        audienceName: mergedSegmentPerformance.map((performance) => performance.segmentName).join(" + "),
        audienceType: "mixed",
        primarySegmentId: segmentIds[0] ?? "",
        segmentIds,
        exclusionSegmentIds: [],
        recipientCount: metrics.sent
      },
      metrics,
      segmentPerformance: mergedSegmentPerformance
    };
  });
}

function mergeSegmentPerformance(rows: ParsedExportRow[]): SegmentPerformance[] {
  return Array.from(groupBy(rows, (row) => row.segmentId).values()).map((segmentRows) => {
    const first = segmentRows[0];
    return {
      segmentId: first.segmentId,
      segmentName: first.segmentName,
      sent: sumParsedRows(segmentRows, "sent"),
      delivered: sumParsedRows(segmentRows, "delivered"),
      uniqueOpens: sumParsedRows(segmentRows, "opens"),
      uniqueClicks: sumParsedRows(segmentRows, "clicks"),
      orders: sumParsedRows(segmentRows, "orders"),
      revenue: sumParsedRows(segmentRows, "revenue"),
      unsubscribes: sumParsedRows(segmentRows, "unsubscribes")
    };
  });
}

function sumNewsletterMetrics(
  segmentPerformance: SegmentPerformance[],
  rows: ParsedExportRow[]
): Newsletter["metrics"] {
  const sumPerformance = (field: keyof Pick<SegmentPerformance, "sent" | "delivered" | "uniqueOpens" | "uniqueClicks" | "orders" | "revenue" | "unsubscribes">) =>
    segmentPerformance.reduce((total, performance) => total + performance[field], 0);
  const sent = sumPerformance("sent");
  const delivered = sumPerformance("delivered");
  const uniqueOpens = sumPerformance("uniqueOpens");
  const uniqueClicks = sumPerformance("uniqueClicks");

  return {
    sent,
    delivered,
    bounced: Number.isFinite(sent) && Number.isFinite(delivered) ? Math.max(sent - delivered, 0) : Number.NaN,
    uniqueOpens,
    totalOpens: uniqueOpens,
    uniqueClicks,
    totalClicks: uniqueClicks,
    orders: sumPerformance("orders"),
    revenue: sumPerformance("revenue"),
    currency: "EUR",
    unsubscribes: sumPerformance("unsubscribes"),
    spamComplaints: sumParsedRows(rows, "spamComplaints"),
    attributionWindow: "7d"
  };
}

function normalizeSingleSeparator(value: string, separator: "," | "."): string {
  const parts = value.split(separator);
  if (parts.length === 1) return value;
  const fractionalPart = parts[parts.length - 1];
  const looksLikeThousands = fractionalPart.length === 3 && parts.slice(1).every((part) => part.length === 3);
  if (looksLikeThousands) return parts.join("");
  return `${parts.slice(0, -1).join("")}.${fractionalPart}`;
}

function warnOnConflictingNames(
  rows: ParsedExportRow[],
  field: "campaignName" | "segmentName" | "newsletterName",
  id: string,
  referenceType: string,
  warnings: AdapterValidationIssue[]
) {
  const names = new Set(rows.map((row) => row[field]));
  if (names.size > 1) {
    warnings.push(issue(
      `conflicting_${referenceType}_name`,
      `Repeated ${referenceType} id "${id}" has conflicting names; the first value was used.`,
      `${referenceType}s.${id}`,
      "warning"
    ));
  }
}

function inferCampaignType(campaignName: string): string {
  const normalized = campaignName.toLowerCase();
  if (normalized.includes("editorial") || normalized.includes("letter") || normalized.includes("digest")) return "editorial";
  if (normalized.includes("welcome") || normalized.includes("nurture")) return "retention";
  if (normalized.includes("event")) return "event";
  return "promotion";
}

function getCampaignGoal(campaignType: string): string {
  if (campaignType === "editorial") return "Build engagement through editorial content.";
  if (campaignType === "retention") return "Retain and reactivate newsletter audiences.";
  if (campaignType === "event") return "Drive event interest and participation.";
  return "Drive revenue while monitoring audience pressure.";
}

function inferLifecycleStage(segmentName: string): string {
  const normalized = segmentName.toLowerCase();
  if (normalized.includes("vip")) return "loyalty";
  if (normalized.includes("recent")) return "post_purchase";
  if (normalized.includes("lead")) return "acquisition";
  if (normalized.includes("lapsed")) return "winback";
  return "active";
}

function inferValueTier(segmentName: string): string {
  const normalized = segmentName.toLowerCase();
  if (normalized.includes("vip")) return "premium";
  if (normalized.includes("recent")) return "high";
  if (normalized.includes("lead")) return "developing";
  return "medium";
}

function sumParsedRows(rows: ParsedExportRow[], field: keyof ParsedExportRow): number {
  return rows.reduce((total, row) => total + Number(row[field]), 0);
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  return items.reduce((grouped, item) => {
    const key = getKey(item);
    const values = grouped.get(key) ?? [];
    values.push(item);
    grouped.set(key, values);
    return grouped;
  }, new Map<string, T[]>());
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidDate(value: string): boolean {
  return value.length > 0 && !Number.isNaN(Date.parse(value));
}

function toDateOnly(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function createValidation(warnings: AdapterValidationIssue[], errors: AdapterValidationIssue[]): AdapterValidationResult {
  return {
    status: errors.length ? "error" : warnings.length ? "warning" : "valid",
    warnings,
    errors
  };
}

function dedupeIssues(issues: AdapterValidationIssue[]): AdapterValidationIssue[] {
  const seen = new Set<string>();
  return issues.filter((validationIssue) => {
    const key = `${validationIssue.code}:${validationIssue.path}:${validationIssue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function issue(
  code: string,
  message: string,
  path: string,
  severity: AdapterValidationIssue["severity"] = "error"
): AdapterValidationIssue {
  return { code, message, path, severity };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
