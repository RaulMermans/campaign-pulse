import assert from "node:assert/strict";
import test from "node:test";
import { applyMappingToRows, buildEditableColumnMapping } from "./columnMapping";
import { buildRowDiagnostics, csvExportAdapter } from "./csvExportAdapter";
import { parseCsvText } from "./csvParser";

const canonicalHeader = [
  "sendDate",
  "newsletterId",
  "newsletterName",
  "campaignId",
  "campaignName",
  "segmentId",
  "segmentName",
  "sent",
  "delivered",
  "opens",
  "clicks",
  "orders",
  "revenue",
  "unsubscribes",
  "spamComplaints"
].join(",");

test("parses quoted values and escaped quotes", () => {
  const result = parseCsvText('name,subject\nCampaign,"The ""summer"" edit"\n');

  assert.equal(result.errors.length, 0);
  assert.equal(result.rows[0].subject, 'The "summer" edit');
});

test("keeps commas inside quoted values", () => {
  const result = parseCsvText('name,subject\nCampaign,"New, now"\n');

  assert.equal(result.errors.length, 0);
  assert.equal(result.rows[0].subject, "New, now");
});

test("ignores blank lines and trims headers and values", () => {
  const result = parseCsvText(" name , value \n\n Alpha , 10 \r\n   \n");

  assert.deepEqual(result.columns, ["name", "value"]);
  assert.deepEqual(result.rows, [{ name: "Alpha", value: "10" }]);
});

test("reports malformed rows and unclosed quoted values", () => {
  const mismatched = parseCsvText("name,value\nAlpha,10,extra\n");
  const unclosed = parseCsvText('name,value\nAlpha,"10\n');

  assert.ok(mismatched.errors.some((error) => error.message.includes("Expected 2 values")));
  assert.ok(unclosed.errors.some((error) => error.message.includes("not closed")));
});

test("uploaded alias rows normalize through editable mapping", () => {
  const csv = [
    "send_date,newsletterId,email_name,campaignId,campaign,segmentId,segmentName,recipients,delivered,opens_unique,clicks_unique,placed_order,revenue_eur,unsub,spam",
    "2026-06-20,nl-1,Launch,camp-1,Summer,seg-1,VIP,1000,980,400,80,12,1200,2,0"
  ].join("\n");
  const parsed = parseCsvText(csv);
  const mapping = buildEditableColumnMapping(parsed.columns);
  const mappedRows = applyMappingToRows(parsed.rows, mapping.entries);
  const normalized = csvExportAdapter.normalize(mappedRows);

  assert.equal(parsed.errors.length, 0);
  assert.equal(normalized.errors.length, 0);
  assert.equal(normalized.dataset.newsletters.length, 1);
  assert.equal(normalized.dataset.newsletters[0].metrics.revenue, 1200);
});

test("invalid uploaded rows are rejected by row diagnostics", () => {
  const parsed = parseCsvText(`${canonicalHeader}\n2026-06-20,nl-1,Launch,camp-1,Summer,seg-1,VIP,100,101,40,8,1,100,0,0`);
  const diagnostics = buildRowDiagnostics(parsed.rows);

  assert.equal(diagnostics[0].accepted, false);
  assert.ok(diagnostics[0].errors.some((error) => error.code === "delivered_exceeds_sent"));
});
