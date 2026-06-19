import assert from "node:assert/strict";
import test from "node:test";
import audienceMembers from "../../data/audience-members.json";
import newsletterPerformance from "../../data/newsletter-performance.json";
import targets from "../../data/targets.json";
import type { DemoJsonAdapterInput } from "./demoJsonAdapter";
import { demoJsonAdapter } from "./demoJsonAdapter";

const validInput = {
  ...newsletterPerformance,
  audienceMembers,
  targets
} as DemoJsonAdapterInput;

test("demo adapter normalizes the valid demo JSON", () => {
  const result = demoJsonAdapter.normalize(validInput);

  assert.equal(result.errors.length, 0);
  assert.equal(result.dataset.metadata.validation.status, "valid");
  assert.equal(result.dataset.campaigns.length, newsletterPerformance.campaigns.length);
  assert.equal(result.dataset.segments.length, newsletterPerformance.segments.length);
  assert.equal(result.dataset.newsletters.length, newsletterPerformance.newsletters.length);
  assert.equal(
    result.dataset.segmentPerformance.length,
    newsletterPerformance.newsletters.reduce((total, newsletter) => total + newsletter.segmentPerformance.length, 0)
  );
  assert.equal(result.dataset.audienceMembers.length, audienceMembers.length);
  assert.deepEqual(result.dataset.targets, targets);
  assert.equal(result.dataset.segmentPerformance[0].newsletterId, newsletterPerformance.newsletters[0].id);
});

test("validation catches a missing campaigns array", () => {
  const { campaigns: _campaigns, ...input } = validInput;
  const result = demoJsonAdapter.validate(input);

  assert.equal(result.status, "error");
  assert.ok(result.errors.some((validationIssue) => validationIssue.code === "missing_required_array" && validationIssue.path === "campaigns"));
});

test("validation catches duplicate newsletter ids", () => {
  const input = clone(validInput);
  input.newsletters[1].id = input.newsletters[0].id;
  const result = demoJsonAdapter.validate(input);

  assert.ok(result.errors.some((validationIssue) => validationIssue.code === "duplicate_newsletter_id"));
});

test("validation catches invalid numeric values", () => {
  const input = clone(validInput);
  input.newsletters[0].metrics.revenue = Number.NaN;
  const result = demoJsonAdapter.validate(input);

  assert.ok(result.errors.some((validationIssue) => validationIssue.code === "invalid_numeric_metric" && validationIssue.path?.endsWith("metrics.revenue")));
});

test("validation catches broken segment and campaign references", () => {
  const input = clone(validInput);
  input.newsletters[0].campaign.id = "camp_missing";
  input.newsletters[0].segmentPerformance[0].segmentId = "seg_missing";
  const result = demoJsonAdapter.validate(input);

  assert.ok(result.errors.some((validationIssue) => validationIssue.code === "broken_campaign_reference"));
  assert.ok(result.errors.some((validationIssue) => validationIssue.code === "broken_segment_reference"));
});

function clone(input: DemoJsonAdapterInput): DemoJsonAdapterInput {
  return structuredClone(input);
}
