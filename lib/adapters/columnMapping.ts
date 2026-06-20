import type { AdapterValidationStatus } from "./types";

export type MappingConfidence = "exact" | "inferred" | "manual" | "missing";

export type MappingValidationState = "mapped" | "missing" | "duplicate" | "invalid";

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

export interface EditableMappingEntry {
  sourceField: string;
  normalizedField: string;
  required: boolean;
  description: string;
  detectedSourceColumn: string | null;
  selectedSourceColumn: string | null;
  confidence: MappingConfidence;
  validationState: MappingValidationState;
}

export interface EditableColumnMapping {
  availableSourceColumns: string[];
  entries: EditableMappingEntry[];
  warnings: string[];
}

// Alias map: common ESP/CRM export variant → canonical adapter field name
const ALIAS_MAP: Record<string, string> = {
  send_date: "sendDate",
  campaign: "campaignName",
  email_name: "newsletterName",
  recipients: "sent",
  opens_unique: "opens",
  clicks_unique: "clicks",
  placed_order: "orders",
  revenue_eur: "revenue",
  unsub: "unsubscribes",
  spam: "spamComplaints"
};

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

function inferSourceColumnFromAliases(canonicalField: string, availableColumns: Set<string>): string | null {
  for (const [alias, canonical] of Object.entries(ALIAS_MAP)) {
    if (canonical === canonicalField && availableColumns.has(alias)) {
      return alias;
    }
  }
  return null;
}

export function buildEditableColumnMapping(
  availableSourceColumns: string[],
  savedMapping?: Record<string, string | null>
): EditableColumnMapping {
  const availableSet = new Set(availableSourceColumns);

  const entries: EditableMappingEntry[] = CSV_EXPORT_FIELD_DEFINITIONS.map((def) => {
    let detectedSourceColumn: string | null = null;
    let detectedConfidence: MappingConfidence = "missing";

    if (availableSet.has(def.sourceField)) {
      detectedSourceColumn = def.sourceField;
      detectedConfidence = "exact";
    } else {
      const inferred = inferSourceColumnFromAliases(def.sourceField, availableSet);
      if (inferred) {
        detectedSourceColumn = inferred;
        detectedConfidence = "inferred";
      }
    }

    let selectedSourceColumn = detectedSourceColumn;
    let confidence: MappingConfidence = detectedConfidence;

    if (savedMapping && def.sourceField in savedMapping) {
      const savedCol = savedMapping[def.sourceField] ?? null;
      selectedSourceColumn = savedCol;
      if (selectedSourceColumn === detectedSourceColumn) {
        confidence = detectedConfidence;
      } else {
        confidence = selectedSourceColumn ? "manual" : "missing";
      }
    }

    return {
      sourceField: def.sourceField,
      normalizedField: def.normalizedField,
      required: def.required,
      description: def.description,
      detectedSourceColumn,
      selectedSourceColumn,
      confidence,
      validationState: "mapped"
    };
  });

  const columnUsageCount = new Map<string, number>();
  entries.forEach((entry) => {
    if (entry.selectedSourceColumn) {
      columnUsageCount.set(
        entry.selectedSourceColumn,
        (columnUsageCount.get(entry.selectedSourceColumn) ?? 0) + 1
      );
    }
  });

  const validatedEntries: EditableMappingEntry[] = entries.map((entry) => {
    let validationState: MappingValidationState;
    if (!entry.selectedSourceColumn) {
      validationState = "missing";
    } else if (!availableSet.has(entry.selectedSourceColumn)) {
      validationState = "invalid";
    } else if ((columnUsageCount.get(entry.selectedSourceColumn) ?? 0) > 1) {
      validationState = "duplicate";
    } else {
      validationState = "mapped";
    }
    return { ...entry, validationState };
  });

  const duplicatedColumns = new Set(
    validatedEntries
      .filter((e) => e.validationState === "duplicate" && e.selectedSourceColumn)
      .map((e) => e.selectedSourceColumn as string)
  );
  const duplicateWarnings = Array.from(duplicatedColumns).map(
    (col) => `Source column "${col}" is mapped to multiple normalized fields.`
  );
  const missingRequiredWarnings = validatedEntries
    .filter((e) => e.required && e.validationState === "missing")
    .map((e) => `Required field "${e.sourceField}" (${e.description}) has no source column selected.`);
  const invalidWarnings = validatedEntries
    .filter((e) => e.validationState === "invalid")
    .map((e) => `Source column "${e.selectedSourceColumn}" selected for "${e.sourceField}" is not available.`);

  return {
    availableSourceColumns,
    entries: validatedEntries,
    warnings: [...duplicateWarnings, ...missingRequiredWarnings, ...invalidWarnings]
  };
}

export function applyMappingToRows(
  rows: Record<string, unknown>[],
  entries: EditableMappingEntry[]
): Record<string, unknown>[] {
  return rows.map((row) => {
    const mapped: Record<string, unknown> = { ...row };
    entries.forEach((entry) => {
      if (entry.selectedSourceColumn) {
        mapped[entry.sourceField] = row[entry.selectedSourceColumn];
      }
    });
    return mapped;
  });
}
