import type { AdapterValidationStatus } from "./types";

export type MappingConfidence = "exact" | "inferred" | "missing";

export interface ColumnMappingEntry {
  sourceField: string;
  normalizedField: string;
  confidence: MappingConfidence;
  required: boolean;
  description: string;
}

export interface ColumnMappingPreview {
  detectedSourceColumns: string[];
  mappings: ColumnMappingEntry[];
  unmappedSourceFields: string[];
  missingRequiredFields: string[];
  stats: {
    total: number;
    required: number;
    optional: number;
    exact: number;
    inferred: number;
    missing: number;
  };
}

export interface ImportReadinessSummary {
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  warningRows: number;
  normalizedCampaigns: number;
  normalizedSegments: number;
  normalizedNewsletters: number;
  normalizedSegmentRows: number;
  validationStatus: AdapterValidationStatus;
}

const CSV_EXPORT_FIELD_DEFINITIONS: Array<{
  sourceField: string;
  normalizedField: string;
  required: boolean;
  description: string;
}> = [
  { sourceField: "sendDate", normalizedField: "newsletter.timing.sentAt", required: true, description: "Send date and time" },
  { sourceField: "newsletterId", normalizedField: "newsletter.id", required: true, description: "Unique newsletter identifier" },
  { sourceField: "newsletterName", normalizedField: "newsletter.name", required: true, description: "Newsletter display name" },
  { sourceField: "campaignId", normalizedField: "campaign.id", required: true, description: "Campaign identifier" },
  { sourceField: "campaignName", normalizedField: "campaign.name", required: true, description: "Campaign display name" },
  { sourceField: "segmentId", normalizedField: "segmentPerformance.segmentId", required: true, description: "Audience segment identifier" },
  { sourceField: "segmentName", normalizedField: "segmentPerformance.segmentName", required: true, description: "Audience segment name" },
  { sourceField: "sent", normalizedField: "metrics.sent", required: true, description: "Total emails sent" },
  { sourceField: "delivered", normalizedField: "metrics.delivered", required: true, description: "Successfully delivered count" },
  { sourceField: "opens", normalizedField: "metrics.uniqueOpens", required: true, description: "Unique opens count" },
  { sourceField: "clicks", normalizedField: "metrics.uniqueClicks", required: true, description: "Unique clicks count" },
  { sourceField: "orders", normalizedField: "metrics.orders", required: true, description: "Attributed order count" },
  { sourceField: "revenue", normalizedField: "metrics.revenue", required: true, description: "Attributed revenue amount" },
  { sourceField: "unsubscribes", normalizedField: "metrics.unsubscribes", required: true, description: "Unsubscribe count" },
  { sourceField: "spamComplaints", normalizedField: "metrics.spamComplaints", required: true, description: "Spam complaint count" },
  { sourceField: "subject", normalizedField: "content.subjectLine", required: false, description: "Email subject line" },
  { sourceField: "creativeAngle", normalizedField: "content.creativeAngle", required: false, description: "Creative angle label" }
];

export function buildColumnMappingPreview(sampleRow?: Record<string, unknown>): ColumnMappingPreview {
  const detectedSourceColumns = sampleRow
    ? Object.keys(sampleRow)
    : CSV_EXPORT_FIELD_DEFINITIONS.map((def) => def.sourceField);
  const detectedSet = new Set(detectedSourceColumns);
  const knownSourceFields = new Set(CSV_EXPORT_FIELD_DEFINITIONS.map((def) => def.sourceField));

  const mappings: ColumnMappingEntry[] = CSV_EXPORT_FIELD_DEFINITIONS.map((def) => ({
    sourceField: def.sourceField,
    normalizedField: def.normalizedField,
    confidence: detectedSet.has(def.sourceField) ? "exact" : "missing",
    required: def.required,
    description: def.description
  }));

  const unmappedSourceFields = detectedSourceColumns.filter((col) => !knownSourceFields.has(col));
  const missingRequiredFields = mappings
    .filter((mapping) => mapping.required && mapping.confidence === "missing")
    .map((mapping) => mapping.sourceField);

  return {
    detectedSourceColumns,
    mappings,
    unmappedSourceFields,
    missingRequiredFields,
    stats: {
      total: mappings.length,
      required: mappings.filter((mapping) => mapping.required).length,
      optional: mappings.filter((mapping) => !mapping.required).length,
      exact: mappings.filter((mapping) => mapping.confidence === "exact").length,
      inferred: mappings.filter((mapping) => mapping.confidence === "inferred").length,
      missing: mappings.filter((mapping) => mapping.confidence === "missing").length
    }
  };
}

export function buildImportReadinessSummary(
  rowDiagnostics: Array<{ accepted: boolean; warnings: unknown[] }>,
  counts: { campaigns: number; segments: number; newsletters: number; segmentPerformance: number },
  validationStatus: AdapterValidationStatus
): ImportReadinessSummary {
  const acceptedRows = rowDiagnostics.filter((row) => row.accepted).length;
  const rejectedRows = rowDiagnostics.filter((row) => !row.accepted).length;
  const warningRows = rowDiagnostics.filter((row) => row.accepted && row.warnings.length > 0).length;

  return {
    totalRows: rowDiagnostics.length,
    acceptedRows,
    rejectedRows,
    warningRows,
    normalizedCampaigns: counts.campaigns,
    normalizedSegments: counts.segments,
    normalizedNewsletters: counts.newsletters,
    normalizedSegmentRows: counts.segmentPerformance,
    validationStatus
  };
}
