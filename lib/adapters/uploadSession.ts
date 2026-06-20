import type { EditableMappingEntry } from "./columnMapping";
import type { RowDiagnostic } from "./csvExportAdapter";
import type { NormalizedDataset } from "./normalizedSchema";

export interface SessionLoadAssessment {
  canLoad: boolean;
  reasons: string[];
}

export function assessUploadedSessionLoad({
  parseErrorCount,
  mappingEntries,
  diagnostics,
  dataset
}: {
  parseErrorCount: number;
  mappingEntries: EditableMappingEntry[];
  diagnostics: RowDiagnostic[];
  dataset: NormalizedDataset;
}): SessionLoadAssessment {
  const reasons: string[] = [];
  const invalidRequiredMappings = mappingEntries.filter(
    (entry) => entry.required && entry.validationState !== "mapped"
  );
  const acceptedRows = diagnostics.filter((diagnostic) => diagnostic.accepted).length;

  if (parseErrorCount > 0) {
    reasons.push("Resolve CSV parse errors before loading the session.");
  }
  if (invalidRequiredMappings.length > 0) {
    reasons.push("Map every required field to one valid, unique source column.");
  }
  if (acceptedRows === 0) {
    reasons.push("At least one row must pass validation.");
  }
  if (dataset.metadata.validation.status === "error") {
    reasons.push("The normalized dataset has blocking validation errors.");
  }
  if (dataset.campaigns.length === 0) {
    reasons.push("The normalized dataset must include at least one campaign.");
  }
  if (dataset.segments.length === 0) {
    reasons.push("The normalized dataset must include at least one segment.");
  }
  if (dataset.newsletters.length === 0) {
    reasons.push("The normalized dataset must include at least one newsletter.");
  }

  return { canLoad: reasons.length === 0, reasons };
}

export function labelUploadedSessionDataset(dataset: NormalizedDataset): NormalizedDataset {
  return {
    ...dataset,
    metadata: {
      ...dataset.metadata,
      source: {
        id: "uploaded-csv-session",
        label: "Uploaded CSV session",
        type: "csv_export"
      },
      sourceMetadata: {
        ...dataset.metadata.sourceMetadata,
        source: "Uploaded CSV session"
      }
    }
  };
}
