import assert from "node:assert/strict";
import test from "node:test";
import { buildColumnMappingPreview, buildImportReadinessSummary } from "./columnMapping";

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
