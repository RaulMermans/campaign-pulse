import assert from "node:assert/strict";
import test from "node:test";
import sampleRows from "../../data/sample-newsletter-export-rows.json";
import { buildEditableColumnMapping } from "./columnMapping";
import { buildRowDiagnostics, csvExportAdapter, type CsvExportRow } from "./csvExportAdapter";
import { assessUploadedSessionLoad, labelUploadedSessionDataset } from "./uploadSession";

const rows = sampleRows as CsvExportRow[];
const columns = Object.keys(rows[0]);

test("session load guard accepts a valid mapped dataset", () => {
  const mapping = buildEditableColumnMapping(columns);
  const diagnostics = buildRowDiagnostics(rows);
  const dataset = csvExportAdapter.normalize(rows).dataset;
  const assessment = assessUploadedSessionLoad({
    parseErrorCount: 0,
    mappingEntries: mapping.entries,
    diagnostics,
    dataset
  });

  assert.equal(assessment.canLoad, true);
  assert.deepEqual(assessment.reasons, []);
});

test("session load guard blocks parse errors, unmapped fields, zero accepted rows, and invalid datasets", () => {
  const invalidRows = structuredClone(rows);
  invalidRows.forEach((row) => {
    row.sent = "0";
    row.delivered = "1";
  });
  const mapping = buildEditableColumnMapping(columns, { newsletterId: null });
  const diagnostics = buildRowDiagnostics(invalidRows);
  const dataset = csvExportAdapter.normalize(invalidRows).dataset;
  const assessment = assessUploadedSessionLoad({
    parseErrorCount: 1,
    mappingEntries: mapping.entries,
    diagnostics,
    dataset
  });

  assert.equal(assessment.canLoad, false);
  assert.ok(assessment.reasons.some((reason) => reason.includes("parse errors")));
  assert.ok(assessment.reasons.some((reason) => reason.includes("required field")));
  assert.ok(assessment.reasons.some((reason) => reason.includes("At least one row")));
  assert.ok(assessment.reasons.some((reason) => reason.includes("blocking validation errors")));
});

test("uploaded session dataset receives the session source label", () => {
  const dataset = csvExportAdapter.normalize(rows).dataset;
  const labeled = labelUploadedSessionDataset(dataset);

  assert.equal(labeled.metadata.source.id, "uploaded-csv-session");
  assert.equal(labeled.metadata.source.label, "Uploaded CSV session");
  assert.equal(labeled.metadata.sourceMetadata.source, "Uploaded CSV session");
});
