import assert from "node:assert/strict";
import test from "node:test";
import sampleRows from "../../data/sample-newsletter-export-rows.json";
import type { CsvExportRow } from "./csvExportAdapter";
import { buildRowDiagnostics, csvExportAdapter, parseCsvExportNumber } from "./csvExportAdapter";

const validRows = sampleRows as CsvExportRow[];

test("valid CSV/export rows normalize into the shared dataset shape", () => {
  const result = csvExportAdapter.normalize(validRows);

  assert.equal(result.errors.length, 0);
  assert.equal(result.dataset.campaigns.length, 2);
  assert.equal(result.dataset.segments.length, 3);
  assert.equal(result.dataset.newsletters.length, 3);
  assert.equal(result.dataset.segmentPerformance.length, 6);
  assert.equal(result.dataset.metadata.source.type, "csv_export");
  assert.equal(result.dataset.newsletters[0].campaign.id, "export_camp_summer");
  assert.equal(result.dataset.segmentPerformance[0].newsletterId, "export_nl_001");
});

test("repeated campaign, segment, and newsletter references merge correctly", () => {
  const result = csvExportAdapter.normalize(validRows);
  const summerCampaigns = result.dataset.campaigns.filter((campaign) => campaign.id === "export_camp_summer");
  const vipSegments = result.dataset.segments.filter((segment) => segment.id === "export_seg_vip");
  const preview = result.dataset.newsletters.find((newsletter) => newsletter.id === "export_nl_001");

  assert.equal(summerCampaigns.length, 1);
  assert.equal(vipSegments.length, 1);
  assert.equal(preview?.segmentPerformance.length, 2);
  assert.equal(preview?.metrics.sent, 32000);
  assert.equal(preview?.metrics.revenue, 11240.5);
});

test("comma decimals, currency, percentage strings, and whitespace parse safely", () => {
  assert.equal(parseCsvExportNumber(" € 1.234,56 "), 1234.56);
  assert.equal(parseCsvExportNumber("$1,234.56"), 1234.56);
  assert.equal(parseCsvExportNumber("31,4"), 31.4);
  assert.equal(parseCsvExportNumber("31.4%"), 31.4);
  assert.equal(parseCsvExportNumber(" 9 000 "), 9000);
  assert.ok(Number.isNaN(parseCsvExportNumber("")));
});

test("missing required fields produce adapter errors", () => {
  const rows = clone(validRows);
  rows[0].newsletterId = " ";
  rows[0].campaignName = "";
  rows[0].segmentId = undefined;
  rows[0].sendDate = "";
  const result = csvExportAdapter.validate(rows);

  assert.ok(result.errors.some((validationIssue) => validationIssue.code === "missing_send_date"));
  assert.ok(result.errors.some((validationIssue) => validationIssue.code === "missing_newsletter_reference"));
  assert.ok(result.errors.some((validationIssue) => validationIssue.code === "missing_campaign_reference"));
  assert.ok(result.errors.some((validationIssue) => validationIssue.code === "missing_segment_reference"));
});

test("invalid dates produce errors", () => {
  const rows = clone(validRows);
  rows[0].sendDate = "not-a-date";
  const result = csvExportAdapter.validate(rows);

  assert.ok(result.errors.some((validationIssue) => validationIssue.code === "invalid_date"));
});

test("invalid numeric fields produce errors", () => {
  const rows = clone(validRows);
  rows[0].clicks = "not available";
  const result = csvExportAdapter.validate(rows);

  assert.ok(result.errors.some((validationIssue) => validationIssue.code === "invalid_numeric_field" && validationIssue.path === "rows[0].clicks"));
});

test("negative metrics produce errors", () => {
  const rows = clone(validRows);
  rows[0].revenue = "-1";
  const result = csvExportAdapter.validate(rows);

  assert.ok(result.errors.some((validationIssue) => validationIssue.code === "negative_metric" && validationIssue.path === "rows[0].revenue"));
});

test("delivered greater than sent fails validation", () => {
  const rows = clone(validRows);
  rows[0].sent = "100";
  rows[0].delivered = "101";
  const result = csvExportAdapter.validate(rows);

  assert.ok(result.errors.some((validationIssue) => validationIssue.code === "delivered_exceeds_sent"));
});

test("buildRowDiagnostics returns accepted and rejected row counts for valid rows", () => {
  const diagnostics = buildRowDiagnostics(validRows);

  assert.equal(diagnostics.length, validRows.length);
  assert.ok(diagnostics.every((d) => d.accepted), "all sample fixture rows should be accepted");
  assert.ok(diagnostics.every((d) => d.errors.length === 0));
});

test("buildRowDiagnostics includes row number starting at 1", () => {
  const diagnostics = buildRowDiagnostics(validRows);

  assert.equal(diagnostics[0].rowNumber, 1);
  assert.equal(diagnostics[1].rowNumber, 2);
});

test("buildRowDiagnostics includes newsletter, campaign, and segment identifiers", () => {
  const diagnostics = buildRowDiagnostics(validRows);
  const first = diagnostics[0];

  assert.equal(first.newsletterId, "export_nl_001");
  assert.equal(first.campaignId, "export_camp_summer");
  assert.equal(first.segmentId, "export_seg_vip");
});

test("buildRowDiagnostics rejects row with invalid date", () => {
  const rows = clone(validRows);
  rows[0].sendDate = "not-a-date";
  const diagnostics = buildRowDiagnostics(rows);

  assert.equal(diagnostics[0].accepted, false);
  const invalidDateError = diagnostics[0].errors.find((e) => e.code === "invalid_date");
  assert.ok(invalidDateError, "should have invalid_date error");
  assert.equal(invalidDateError?.errorType, "Invalid date");
  assert.equal(invalidDateError?.field, "sendDate");
  assert.equal(invalidDateError?.rawValue, "not-a-date");
});

test("buildRowDiagnostics rejects row with invalid number", () => {
  const rows = clone(validRows);
  rows[1].clicks = "not available";
  const diagnostics = buildRowDiagnostics(rows);

  assert.equal(diagnostics[1].accepted, false);
  const numericError = diagnostics[1].errors.find((e) => e.code === "invalid_numeric_field");
  assert.ok(numericError, "should have invalid_numeric_field error");
  assert.equal(numericError?.errorType, "Invalid number");
  assert.equal(numericError?.field, "clicks");
  assert.equal(numericError?.rawValue, "not available");
});

test("buildRowDiagnostics rejects row with negative metric", () => {
  const rows = clone(validRows);
  rows[0].revenue = "-500";
  const diagnostics = buildRowDiagnostics(rows);

  assert.equal(diagnostics[0].accepted, false);
  const negativeError = diagnostics[0].errors.find((e) => e.code === "negative_metric");
  assert.ok(negativeError, "should have negative_metric error");
  assert.equal(negativeError?.errorType, "Negative metric");
  assert.equal(negativeError?.field, "revenue");
});

test("buildRowDiagnostics rejects row where delivered exceeds sent", () => {
  const rows = clone(validRows);
  rows[0].sent = "100";
  rows[0].delivered = "101";
  const diagnostics = buildRowDiagnostics(rows);

  assert.equal(diagnostics[0].accepted, false);
  const deliveryError = diagnostics[0].errors.find((e) => e.code === "delivered_exceeds_sent");
  assert.ok(deliveryError, "should have delivered_exceeds_sent error");
  assert.equal(deliveryError?.errorType, "Delivery sanity");
});

test("buildRowDiagnostics rejects row with missing required fields and includes reason", () => {
  const rows = clone(validRows);
  rows[0].newsletterId = "";
  rows[0].campaignId = undefined;
  const diagnostics = buildRowDiagnostics(rows);

  assert.equal(diagnostics[0].accepted, false);
  assert.ok(diagnostics[0].errors.some((e) => e.code === "missing_newsletter_reference"));
  assert.ok(diagnostics[0].errors.some((e) => e.code === "missing_campaign_reference"));
  assert.ok(diagnostics[0].errors.every((e) => e.reason.length > 0), "all errors should have a reason");
});

test("buildRowDiagnostics returns empty array for non-array input", () => {
  assert.deepEqual(buildRowDiagnostics(null), []);
  assert.deepEqual(buildRowDiagnostics("string"), []);
  assert.deepEqual(buildRowDiagnostics({}), []);
});

function clone(rows: CsvExportRow[]): CsvExportRow[] {
  return structuredClone(rows);
}
