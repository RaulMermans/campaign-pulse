import assert from "node:assert/strict";
import test from "node:test";
import { getRecommendedNextActions } from "./newsletterInsights";
import type { NewsletterInsight } from "./newsletterTypes";

const insights: NewsletterInsight[] = [
  {
    id: "critical-one",
    type: "unsubscribe_warning",
    severity: "critical",
    title: "VIP buyers triggered an unsubscribe warning",
    message: "Audience cost is rising.",
    evidence: "0.42% unsub rate.",
    recommendation: "Suppress recently touched VIP buyers.",
    relatedSegmentIds: ["vip-buyers"]
  },
  {
    id: "critical-two",
    type: "repeated_promotional_pressure",
    severity: "critical",
    title: "VIP buyers absorbed repeated pressure",
    message: "Same segment density is high.",
    evidence: "3 sends in one week.",
    recommendation: "Pause promotional sends for 72 hours.",
    relatedSegmentIds: ["vip-buyers"]
  },
  {
    id: "positive-one",
    type: "best_newsletter",
    severity: "positive",
    title: "Launch digest is the best performer",
    message: "The send paired audience fit with revenue.",
    evidence: "EUR0.31 RPR.",
    recommendation: "Reuse the editorial proof angle.",
    relatedNewsletterIds: ["launch-digest"],
    relatedCampaignIds: ["launch"]
  },
  {
    id: "warning-one",
    type: "campaign_decay",
    severity: "warning",
    title: "Spring promo shows campaign decay",
    message: "Later sends lost engagement.",
    evidence: "Open rate declined by 6 points.",
    recommendation: "Shorten the sequence.",
    relatedCampaignIds: ["spring-promo"]
  }
];

test("getRecommendedNextActions returns one deduped P1, P2, and P3 action with routing context", () => {
  const actions = getRecommendedNextActions(insights);

  assert.deepEqual(actions.map((action) => action.priorityLabel), ["P1 critical action", "P2 opportunity", "P3 watch item"]);
  assert.equal(new Set(actions.map((action) => action.title)).size, actions.length);
  assert.deepEqual(actions.map((action) => action.nextScreen), ["Audience", "Newsletters", "Campaigns"]);
  assert.deepEqual(actions.map((action) => action.affectedArea), ["Segment: vip-buyers", "Newsletter: launch-digest", "Campaign: spring-promo"]);
  assert.ok(actions.every((action) => action.reason.length > 0));
});
