import assert from "node:assert/strict";
import test from "node:test";
import audienceMembersJson from "../../data/audience-members.json";
import newsletterPerformance from "../../data/newsletter-performance.json";
import defaultTargets from "../../data/targets.json";
import { demoJsonAdapter } from "../adapters/demoJsonAdapter";
import type { TargetSettings } from "../targetTypes";
import { escapeCsvValue, serializeCsv } from "./exportCsv";
import {
  buildCampaignPerformanceExportRows,
  buildMonthlyMemoExportData,
  buildNewsletterRankingExportRows,
  buildSegmentStatusExportRows
} from "./exportData";
import { buildExportFilename } from "./exportFilename";
import { serializeJson } from "./exportJson";

const dataset = demoJsonAdapter.normalize({
  ...newsletterPerformance,
  audienceMembers: audienceMembersJson,
  targets: defaultTargets
}).dataset;
const targets = defaultTargets as TargetSettings;
const month = "2025-05";
const newsletters = dataset.newsletters.filter((newsletter) => newsletter.timing.sentAt.startsWith(month));
const campaignIds = new Set(newsletters.map((newsletter) => newsletter.campaign.id));
const segmentIds = new Set(newsletters.flatMap((newsletter) => newsletter.segmentPerformance.map((row) => row.segmentId)));
const campaigns = dataset.campaigns.filter((campaign) => campaignIds.has(campaign.id));
const segments = dataset.segments.filter((segment) => segmentIds.has(segment.id));

test("CSV escaping handles commas, quotes, newlines, and euro symbols", () => {
  assert.equal(escapeCsvValue("plain"), "plain");
  assert.equal(escapeCsvValue("€120"), "€120");
  assert.equal(escapeCsvValue("comma,value"), '"comma,value"');
  assert.equal(escapeCsvValue('say "hello"'), '"say ""hello"""');
  assert.equal(escapeCsvValue("line one\nline two"), '"line one\nline two"');
  assert.match(serializeCsv([{ label: "European revenue", value: "€1,250" }]), /"€1,250"/);
});

test("filename generation is safe and descriptive", () => {
  const filename = buildExportFilename({
    source: "Uploaded CSV session",
    month,
    descriptor: "Newsletter ranking",
    date: new Date(2026, 5, 20),
    extension: "csv"
  });

  assert.equal(filename, "campaign-pulse-uploaded-csv-session-2025-05-newsletter-ranking-2026-06-20.csv");
});

test("monthly memo JSON export has a stable payload shape", () => {
  const payload = buildMonthlyMemoExportData({
    month,
    currency: "EUR",
    campaigns,
    segments,
    newsletters,
    targetSettings: targets,
    sourceLabel: "Demo JSON"
  });
  const parsed = JSON.parse(serializeJson(payload));

  assert.equal(parsed.schemaVersion, "campaign-pulse-monthly-memo-v1");
  assert.equal(parsed.month, month);
  assert.equal(parsed.currency, "EUR");
  assert.equal(parsed.source, "Demo JSON");
  assert.equal(typeof parsed.summary.revenue, "number");
  assert.ok(Array.isArray(parsed.insights));
  assert.ok(Array.isArray(parsed.recommendedActions));
});

test("newsletter ranking export rows are ordered and include target statuses", () => {
  const rows = buildNewsletterRankingExportRows(newsletters, targets);

  assert.equal(rows.length, newsletters.length);
  assert.deepEqual(rows.map((row) => row.rank), rows.map((_, index) => index + 1));
  assert.equal(typeof rows[0].revenue, "number");
  assert.ok(["On track", "Watch", "Off track"].includes(String(rows[0].revenuePerRecipientStatus)));
});

test("segment export rows include movement, pressure, and target status", () => {
  const rows = buildSegmentStatusExportRows({
    segments,
    campaigns,
    newsletters,
    audienceMembers: dataset.audienceMembers,
    targetSettings: targets
  });

  assert.equal(rows.length, segments.length);
  assert.ok(rows.every((row) => typeof row.movement === "string"));
  assert.ok(rows.every((row) => typeof row.pressureScore === "number"));
  assert.ok(rows.every((row) => ["On track", "Watch", "Off track"].includes(String(row.pressureStatus))));
});

test("campaign export rows include performance, contribution, and target status", () => {
  const rows = buildCampaignPerformanceExportRows(campaigns, newsletters, targets);

  assert.equal(rows.length, campaigns.length);
  assert.ok(rows.every((row) => typeof row.revenueContribution === "number"));
  assert.ok(rows.every((row) => typeof row.bestNewsletter === "string"));
  assert.ok(rows.every((row) => ["On track", "Watch", "Off track"].includes(String(row.pressureStatus))));
});
