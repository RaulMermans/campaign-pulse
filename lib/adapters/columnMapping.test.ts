import assert from "node:assert/strict";
import test from "node:test";
import {
  buildColumnMappingPreview,
  buildEditableColumnMapping,
  buildImportReadinessSummary,
  applyMappingToRows
} from "./columnMapping";

// ── Sprint 21 tests (unchanged) ────────────────────────────────────────────

test("buildColumnMappingPreview detects all expected fields from a complete sample row", () => {
  const sampleRow = {
    sendDate: "2026-06-01",
    newsletterId: "nl-001",
    newsletterName: "Test",
    campaignId: "camp-001",
    campaignName: "Test Campaign",
    segmentId: "seg-001",
    segmentName: "VIP",
    sent: "1000",
    delivered: "980",
    opens: "400",
    clicks: "50",
    orders: "10",
    revenue: "500",
    unsubscribes: "2",
    spamComplaints: "0",
    subject: "Test subject",
    creativeAngle: "newness"
  };
  const preview = buildColumnMappingPreview(sampleRow);

  assert.ok(preview.detectedSourceColumns.includes("sendDate"));
  assert.ok(preview.detectedSourceColumns.includes("subject"));
  assert.equal(preview.stats.total, 17);
  assert.equal(preview.stats.required, 15);
  assert.equal(preview.stats.optional, 2);
});

test("exact confidence when source field matches expected field name", () => {
  const sampleRow = { sendDate: "2026-06-01", newsletterId: "nl-001" };
  const preview = buildColumnMappingPreview(sampleRow);
  const sendDateEntry = preview.mappings.find((m) => m.sourceField === "sendDate");
  const newsletterIdEntry = preview.mappings.find((m) => m.sourceField === "newsletterId");

  assert.equal(sendDateEntry?.confidence, "exact");
  assert.equal(newsletterIdEntry?.confidence, "exact");
});

test("missing confidence when required field is absent from source row", () => {
  const sampleRow = { sendDate: "2026-06-01" };
  const preview = buildColumnMappingPreview(sampleRow);
  const newsletterIdEntry = preview.mappings.find((m) => m.sourceField === "newsletterId");
  const campaignIdEntry = preview.mappings.find((m) => m.sourceField === "campaignId");

  assert.equal(newsletterIdEntry?.confidence, "missing");
  assert.equal(campaignIdEntry?.confidence, "missing");
});

test("missing required fields list contains only required fields that are absent", () => {
  const sampleRow = { sendDate: "2026-06-01", newsletterId: "nl-001" };
  const preview = buildColumnMappingPreview(sampleRow);

  assert.ok(preview.missingRequiredFields.includes("newsletterName"));
  assert.ok(preview.missingRequiredFields.includes("campaignId"));
  assert.ok(!preview.missingRequiredFields.includes("subject"), "optional field should not appear in missingRequiredFields");
  assert.ok(!preview.missingRequiredFields.includes("sendDate"), "present field should not appear in missingRequiredFields");
});

test("unmapped source fields are identified when source has unknown columns", () => {
  const sampleRow = {
    sendDate: "2026-06-01",
    unknownColumn: "some-value",
    anotherUnknown: "123"
  };
  const preview = buildColumnMappingPreview(sampleRow);

  assert.ok(preview.unmappedSourceFields.includes("unknownColumn"));
  assert.ok(preview.unmappedSourceFields.includes("anotherUnknown"));
  assert.ok(!preview.unmappedSourceFields.includes("sendDate"));
});

test("buildColumnMappingPreview with no sample row uses all expected fields as detected", () => {
  const preview = buildColumnMappingPreview();

  assert.equal(preview.stats.exact, 17);
  assert.equal(preview.stats.missing, 0);
  assert.equal(preview.missingRequiredFields.length, 0);
});

test("stats counts are consistent with mappings", () => {
  const sampleRow = { sendDate: "2026-06-01" };
  const preview = buildColumnMappingPreview(sampleRow);
  const exactCount = preview.mappings.filter((m) => m.confidence === "exact").length;
  const missingCount = preview.mappings.filter((m) => m.confidence === "missing").length;

  assert.equal(preview.stats.exact, exactCount);
  assert.equal(preview.stats.missing, missingCount);
  assert.equal(preview.stats.inferred, 0);
});

test("buildImportReadinessSummary counts accepted and rejected rows", () => {
  const diagnostics = [
    { accepted: true, warnings: [] },
    { accepted: false, warnings: [] },
    { accepted: false, warnings: [] },
    { accepted: true, warnings: [{}] }
  ];
  const counts = { campaigns: 2, segments: 3, newsletters: 4, segmentPerformance: 6 };
  const summary = buildImportReadinessSummary(diagnostics, counts, "warning");

  assert.equal(summary.totalRows, 4);
  assert.equal(summary.acceptedRows, 2);
  assert.equal(summary.rejectedRows, 2);
  assert.equal(summary.warningRows, 1);
  assert.equal(summary.normalizedCampaigns, 2);
  assert.equal(summary.normalizedSegments, 3);
  assert.equal(summary.normalizedNewsletters, 4);
  assert.equal(summary.normalizedSegmentRows, 6);
  assert.equal(summary.validationStatus, "warning");
});

test("buildImportReadinessSummary with all accepted rows", () => {
  const diagnostics = [
    { accepted: true, warnings: [] },
    { accepted: true, warnings: [] }
  ];
  const counts = { campaigns: 1, segments: 1, newsletters: 2, segmentPerformance: 2 };
  const summary = buildImportReadinessSummary(diagnostics, counts, "valid");

  assert.equal(summary.acceptedRows, 2);
  assert.equal(summary.rejectedRows, 0);
  assert.equal(summary.validationStatus, "valid");
});

// ── Sprint 22 tests ────────────────────────────────────────────────────────

test("buildEditableColumnMapping exact match when source has canonical field name", () => {
  const cols = ["sendDate", "newsletterId", "newsletterName", "campaignId", "campaignName",
    "segmentId", "segmentName", "sent", "delivered", "opens", "clicks",
    "orders", "revenue", "unsubscribes", "spamComplaints"];
  const mapping = buildEditableColumnMapping(cols);
  const entry = mapping.entries.find((e) => e.sourceField === "sendDate");

  assert.equal(entry?.confidence, "exact");
  assert.equal(entry?.selectedSourceColumn, "sendDate");
  assert.equal(entry?.detectedSourceColumn, "sendDate");
  assert.equal(entry?.validationState, "mapped");
});

test("buildEditableColumnMapping infers alias send_date → sendDate", () => {
  const mapping = buildEditableColumnMapping(["send_date"]);
  const entry = mapping.entries.find((e) => e.sourceField === "sendDate");

  assert.equal(entry?.confidence, "inferred");
  assert.equal(entry?.selectedSourceColumn, "send_date");
  assert.equal(entry?.detectedSourceColumn, "send_date");
});

test("buildEditableColumnMapping infers all documented aliases", () => {
  const aliasColumns = [
    "send_date", "campaign", "email_name", "recipients",
    "opens_unique", "clicks_unique", "placed_order",
    "revenue_eur", "unsub", "spam"
  ];
  const mapping = buildEditableColumnMapping(aliasColumns);

  const checks: Array<[string, string]> = [
    ["sendDate", "send_date"],
    ["campaignName", "campaign"],
    ["newsletterName", "email_name"],
    ["sent", "recipients"],
    ["opens", "opens_unique"],
    ["clicks", "clicks_unique"],
    ["orders", "placed_order"],
    ["revenue", "revenue_eur"],
    ["unsubscribes", "unsub"],
    ["spamComplaints", "spam"]
  ];

  for (const [canonical, alias] of checks) {
    const entry = mapping.entries.find((e) => e.sourceField === canonical);
    assert.equal(entry?.confidence, "inferred", `${canonical} should be inferred from ${alias}`);
    assert.equal(entry?.selectedSourceColumn, alias, `${canonical} should use ${alias}`);
  }
});

test("buildEditableColumnMapping shows missing when no match or alias exists", () => {
  const mapping = buildEditableColumnMapping(["unknownColumn"]);
  const entry = mapping.entries.find((e) => e.sourceField === "sendDate");

  assert.equal(entry?.confidence, "missing");
  assert.equal(entry?.selectedSourceColumn, null);
  assert.equal(entry?.detectedSourceColumn, null);
  assert.equal(entry?.validationState, "missing");
});

test("buildEditableColumnMapping applies saved mapping with manual confidence", () => {
  const cols = ["sendDate", "send_date", "newsletterId", "newsletterName",
    "campaignId", "campaignName", "segmentId", "segmentName",
    "sent", "delivered", "opens", "clicks", "orders", "revenue",
    "unsubscribes", "spamComplaints"];
  const saved = { sendDate: "send_date" };
  const mapping = buildEditableColumnMapping(cols, saved);
  const entry = mapping.entries.find((e) => e.sourceField === "sendDate");

  assert.equal(entry?.selectedSourceColumn, "send_date");
  assert.equal(entry?.confidence, "manual");
  assert.equal(entry?.detectedSourceColumn, "sendDate");
});

test("buildEditableColumnMapping keeps exact confidence when saved mapping matches auto-detected", () => {
  const cols = ["sendDate"];
  const saved = { sendDate: "sendDate" };
  const mapping = buildEditableColumnMapping(cols, saved);
  const entry = mapping.entries.find((e) => e.sourceField === "sendDate");

  assert.equal(entry?.confidence, "exact");
  assert.equal(entry?.selectedSourceColumn, "sendDate");
});

test("buildEditableColumnMapping reset: without savedMapping reverts to auto-detected", () => {
  const cols = ["send_date"];
  const withManual = buildEditableColumnMapping(cols, { sendDate: "send_date" });
  const withoutSaved = buildEditableColumnMapping(cols);

  const manualEntry = withManual.entries.find((e) => e.sourceField === "sendDate");
  const resetEntry = withoutSaved.entries.find((e) => e.sourceField === "sendDate");

  assert.equal(manualEntry?.confidence, "inferred");
  assert.equal(resetEntry?.confidence, "inferred");
  assert.equal(resetEntry?.selectedSourceColumn, "send_date");
});

test("buildEditableColumnMapping duplicate source-column mapping warning", () => {
  const cols = ["sendDate", "newsletterId", "newsletterName", "campaignId", "campaignName",
    "segmentId", "segmentName", "sent", "delivered", "opens", "clicks",
    "orders", "revenue", "unsubscribes", "spamComplaints"];
  const saved = { sendDate: "newsletterId" };
  const mapping = buildEditableColumnMapping(cols, saved);

  const hasDuplicateWarning = mapping.warnings.some(
    (w) => w.includes("newsletterId") && w.includes("multiple")
  );
  assert.ok(hasDuplicateWarning, "should warn about duplicate source-column mapping");

  const sendDateEntry = mapping.entries.find((e) => e.sourceField === "sendDate");
  const newsletterIdEntry = mapping.entries.find((e) => e.sourceField === "newsletterId");
  assert.equal(sendDateEntry?.validationState, "duplicate");
  assert.equal(newsletterIdEntry?.validationState, "duplicate");
});

test("buildEditableColumnMapping missing required field warning", () => {
  const cols = ["sendDate"];
  const saved = { sendDate: null };
  const mapping = buildEditableColumnMapping(cols, saved);

  const hasMissingWarning = mapping.warnings.some((w) => w.includes("sendDate"));
  assert.ok(hasMissingWarning, "should warn about missing required field");

  const entry = mapping.entries.find((e) => e.sourceField === "sendDate");
  assert.equal(entry?.validationState, "missing");
});

test("buildEditableColumnMapping invalid source column when saved column not in available set", () => {
  const cols = ["sendDate"];
  const saved = { sendDate: "nonexistent_column" };
  const mapping = buildEditableColumnMapping(cols, saved);
  const entry = mapping.entries.find((e) => e.sourceField === "sendDate");

  assert.equal(entry?.validationState, "invalid");
});

test("applyMappingToRows maps aliased column to canonical field name", () => {
  const rows = [{ send_date: "2026-06-01", recipients: 1000 }];
  const mapping = buildEditableColumnMapping(["send_date", "recipients"]);
  const mapped = applyMappingToRows(rows, mapping.entries);

  assert.equal(mapped[0].sendDate, "2026-06-01");
  assert.equal(mapped[0].sent, 1000);
});

test("applyMappingToRows preserves original keys alongside mapped keys", () => {
  const rows = [{ send_date: "2026-06-01", extra: "preserved" }];
  const mapping = buildEditableColumnMapping(["send_date"]);
  const mapped = applyMappingToRows(rows, mapping.entries);

  assert.equal(mapped[0].sendDate, "2026-06-01");
  assert.equal(mapped[0].extra, "preserved");
});

test("applyMappingToRows with canonical field names produces unchanged values", () => {
  const rows = [{ sendDate: "2026-06-01", sent: 500 }];
  const mapping = buildEditableColumnMapping(["sendDate", "sent"]);
  const mapped = applyMappingToRows(rows, mapping.entries);

  assert.equal(mapped[0].sendDate, "2026-06-01");
  assert.equal(mapped[0].sent, 500);
});

test("applyMappingToRows with manual mapping uses selected source column", () => {
  const rows = [{ alt_date: "2026-06-15", sendDate: "2026-01-01" }];
  const saved = { sendDate: "alt_date" };
  const mapping = buildEditableColumnMapping(["alt_date", "sendDate"], saved);
  const mapped = applyMappingToRows(rows, mapping.entries);

  assert.equal(mapped[0].sendDate, "2026-06-15");
});

test("applyMappingToRows skips entry when selectedSourceColumn is null", () => {
  const rows = [{ sendDate: "2026-06-01" }];
  const saved = { newsletterId: null };
  const mapping = buildEditableColumnMapping(["sendDate"], saved);
  const mapped = applyMappingToRows(rows, mapping.entries);

  assert.equal(mapped[0].newsletterId, undefined);
});
