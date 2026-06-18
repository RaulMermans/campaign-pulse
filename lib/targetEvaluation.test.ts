import assert from "node:assert/strict";
import test from "node:test";
import { parseTargetInputValue } from "./targetInput";
import { evaluateActualsAgainstTargets, resolveTargets } from "./targetEvaluation";
import type { TargetSettings } from "./targetTypes";

const settings: TargetSettings = {
  global: {
    monthlyRevenue: 10000,
    openRate: 0.34,
    clickRate: 0.055,
    clickToOpenRate: 0.16,
    conversionRate: 0.018,
    revenuePerRecipient: 0.22,
    maxUnsubscribeRate: 0.003,
    maxSpamRate: 0.0004,
    maxSendsPerSegmentWeek: 3,
    maxPressureScore: 62
  },
  campaigns: {
    camp_launch: {
      monthlyRevenue: 6000,
      openRate: 0.36
    }
  },
  segments: {
    seg_vip: {
      revenuePerRecipient: 0.28,
      maxPressureScore: 56
    }
  }
};

test("resolveTargets inherits global defaults and applies campaign or segment overrides", () => {
  assert.equal(resolveTargets(settings, "campaign", "camp_launch").monthlyRevenue, 6000);
  assert.equal(resolveTargets(settings, "campaign", "camp_launch").clickRate, 0.055);
  assert.equal(resolveTargets(settings, "segment", "seg_vip").revenuePerRecipient, 0.28);
  assert.equal(resolveTargets(settings, "segment", "seg_vip").openRate, 0.34);
});

test("evaluateActualsAgainstTargets returns on track, watch, and off track statuses with max targets", () => {
  const comparisons = evaluateActualsAgainstTargets({
    actuals: {
      monthlyRevenue: 9500,
      openRate: 0.31,
      clickRate: 0.041,
      clickToOpenRate: 0.12,
      conversionRate: 0.019,
      revenuePerRecipient: 0.24,
      unsubscribeRate: 0.0032,
      spamRate: 0.0008,
      sendsPerSegmentWeek: 4,
      pressureScore: 70
    },
    targets: settings.global
  });

  assert.ok(comparisons.monthlyRevenue);
  assert.ok(comparisons.openRate);
  assert.ok(comparisons.clickRate);
  assert.ok(comparisons.conversionRate);
  assert.ok(comparisons.unsubscribeRate);
  assert.ok(comparisons.spamRate);
  assert.ok(comparisons.pressureScore);
  assert.equal(comparisons.monthlyRevenue.status, "Watch");
  assert.equal(comparisons.openRate.status, "Watch");
  assert.equal(comparisons.clickRate.status, "Off track");
  assert.equal(comparisons.conversionRate.status, "On track");
  assert.equal(comparisons.unsubscribeRate.status, "Watch");
  assert.equal(comparisons.spamRate.status, "Off track");
  assert.equal(comparisons.pressureScore.status, "Off track");
});

test("parseTargetInputValue accepts comma and dot decimals safely", () => {
  assert.equal(parseTargetInputValue("34,5", "percent"), 0.345);
  assert.equal(parseTargetInputValue("34.5", "percent"), 0.345);
  assert.equal(parseTargetInputValue("1,25", "currency"), 1.25);
  assert.equal(parseTargetInputValue("1.25", "currency"), 1.25);
  assert.equal(parseTargetInputValue("-1", "number"), 0);
  assert.equal(parseTargetInputValue("not a number", "percent"), 0);
});
