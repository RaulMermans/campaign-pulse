import assert from "node:assert/strict";
import test from "node:test";
import { getOverviewAnalytics } from "./overviewAnalytics";
import type { Campaign, Newsletter, Segment } from "./newsletterTypes";

const segments: Segment[] = [
  {
    id: "seg_vip",
    name: "VIP",
    description: "High-value customers",
    lifecycleStage: "loyalty",
    valueTier: "premium"
  },
  {
    id: "seg_reactivation",
    name: "Reactivation",
    description: "Lapsed customers",
    lifecycleStage: "reactivation",
    valueTier: "growth"
  }
];

const campaigns: Campaign[] = [
  {
    id: "camp_launch",
    name: "Launch",
    type: "promotion",
    goal: "Revenue",
    color: "#059669",
    startDate: "2026-04-01",
    endDate: "2026-06-30"
  },
  {
    id: "camp_editorial",
    name: "Editorial",
    type: "editorial",
    goal: "Engagement",
    color: "#4f46e5",
    startDate: "2026-04-01",
    endDate: "2026-06-30"
  }
];

const newsletters: Newsletter[] = [
  makeNewsletter("apr_launch", "camp_launch", "Launch", "2026-04-08T10:00:00.000Z", [
    makePerformance("seg_vip", "VIP", 1000, 980, 360, 80, 24, 2100, 2),
    makePerformance("seg_reactivation", "Reactivation", 1400, 1360, 310, 46, 10, 600, 6)
  ]),
  makeNewsletter("may_launch", "camp_launch", "Launch", "2026-05-08T10:00:00.000Z", [
    makePerformance("seg_vip", "VIP", 1100, 1080, 430, 105, 32, 3200, 2),
    makePerformance("seg_reactivation", "Reactivation", 1500, 1450, 340, 54, 12, 720, 7)
  ]),
  makeNewsletter("jun_launch", "camp_launch", "Launch", "2026-06-08T10:00:00.000Z", [
    makePerformance("seg_vip", "VIP", 1200, 1180, 510, 140, 46, 5400, 2),
    makePerformance("seg_reactivation", "Reactivation", 1700, 1630, 330, 44, 8, 500, 12)
  ]),
  makeNewsletter("jun_editorial", "camp_editorial", "Editorial", "2026-06-15T10:00:00.000Z", [
    makePerformance("seg_vip", "VIP", 800, 780, 390, 74, 14, 1600, 1),
    makePerformance("seg_reactivation", "Reactivation", 1000, 970, 250, 31, 4, 200, 8)
  ])
];

test("overview analytics computes month movement, rolling averages, concentration, and segment decisions", () => {
  const analytics = getOverviewAnalytics(newsletters, campaigns, segments, "2026-06");

  assert.equal(analytics.currentMonth.month, "2026-06");
  assert.equal(analytics.monthlyTrend.length, 3);
  assert.ok(analytics.monthOverMonthRevenueChange > 0);
  assert.ok(analytics.monthOverMonthEngagementChange > 0);
  assert.equal(analytics.monthlyTrend.at(-1)?.rollingRevenueAverage, analytics.currentMonth.rollingRevenueAverage);
  assert.equal(analytics.campaignContribution[0].campaignId, "camp_launch");
  assert.equal(analytics.bestOpportunitySegment.segmentId, "seg_vip");
  assert.equal(analytics.highestRiskSegment.segmentId, "seg_reactivation");
  assert.ok(analytics.pressureRevenuePoints.every((point) => point.pressureScore >= 0 && point.pressureScore <= 100));
  assert.ok(analytics.campaignContribution.every((campaign) => campaign.efficiencyScore >= 0));
  assert.ok(analytics.executiveHealthScore >= 0 && analytics.executiveHealthScore <= 100);
});

function makeNewsletter(id: string, campaignId: string, campaignName: string, sentAt: string, segmentPerformance: Newsletter["segmentPerformance"]): Newsletter {
  const sent = segmentPerformance.reduce((total, item) => total + item.sent, 0);
  const delivered = segmentPerformance.reduce((total, item) => total + item.delivered, 0);
  const uniqueOpens = segmentPerformance.reduce((total, item) => total + item.uniqueOpens, 0);
  const uniqueClicks = segmentPerformance.reduce((total, item) => total + item.uniqueClicks, 0);
  const orders = segmentPerformance.reduce((total, item) => total + item.orders, 0);
  const revenue = segmentPerformance.reduce((total, item) => total + item.revenue, 0);
  const unsubscribes = segmentPerformance.reduce((total, item) => total + item.unsubscribes, 0);

  return {
    id,
    externalId: id,
    name: `${campaignName} send`,
    title: `${campaignName} send`,
    status: "sent",
    campaign: {
      id: campaignId,
      name: campaignName,
      type: campaignName === "Launch" ? "promotion" : "editorial",
      stage: "send",
      sequencePosition: 1,
      sequenceTotal: 1
    },
    timing: {
      sentAt,
      timezone: "UTC"
    },
    content: {
      subjectLine: "Subject",
      previewText: "Preview",
      senderName: "Campaign Pulse",
      contentType: "newsletter",
      creativeAngle: "newness",
      messageTheme: "launch",
      ctaLabel: "Shop",
      ctaType: "commerce",
      landingPageUrl: "https://example.com",
      creativeUrl: "https://example.com",
      notes: ""
    },
    offer: {
      offerType: "new_collection",
      discountValue: 0,
      discountType: "none",
      productFocus: "Core",
      collection: "SS26",
      pricePoint: "premium",
      businessGoal: "revenue"
    },
    audience: {
      audienceName: "Test audience",
      audienceType: "mixed",
      primarySegmentId: segmentPerformance[0]?.segmentId ?? "seg_vip",
      segmentIds: segmentPerformance.map((item) => item.segmentId),
      exclusionSegmentIds: [],
      recipientCount: sent
    },
    metrics: {
      sent,
      delivered,
      bounced: sent - delivered,
      uniqueOpens,
      totalOpens: uniqueOpens,
      uniqueClicks,
      totalClicks: uniqueClicks,
      orders,
      revenue,
      currency: "EUR",
      unsubscribes,
      spamComplaints: 0,
      attributionWindow: "7d"
    },
    segmentPerformance
  };
}

function makePerformance(
  segmentId: string,
  segmentName: string,
  sent: number,
  delivered: number,
  uniqueOpens: number,
  uniqueClicks: number,
  orders: number,
  revenue: number,
  unsubscribes: number
): Newsletter["segmentPerformance"][number] {
  return {
    segmentId,
    segmentName,
    sent,
    delivered,
    uniqueOpens,
    uniqueClicks,
    orders,
    revenue,
    unsubscribes
  };
}
