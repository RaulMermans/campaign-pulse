import assert from "node:assert/strict";
import test from "node:test";
import {
  getAudienceMapPoints,
  getMembersForSegment,
  getSegmentMovement,
  getSegmentCampaignFit,
  getSegmentEngagementTrend,
  getSegmentMemberSummary,
  getSegmentRevenueTrend
} from "./audienceMetrics";
import type { AudienceMember } from "./audienceTypes";
import type { Campaign, Newsletter, Segment } from "./newsletterTypes";

const segments: Segment[] = [
  {
    id: "seg_vip",
    name: "VIP Customers",
    description: "Repeat buyers",
    lifecycleStage: "loyalty",
    valueTier: "premium"
  },
  {
    id: "seg_cold",
    name: "Cold Audience",
    description: "Low recent engagement",
    lifecycleStage: "cold",
    valueTier: "low"
  }
];

const campaigns: Campaign[] = [
  {
    id: "camp_launch",
    name: "Launch",
    type: "promotion",
    goal: "Revenue",
    color: "#059669",
    startDate: "2026-06-01",
    endDate: "2026-06-30"
  },
  {
    id: "camp_editorial",
    name: "Editorial",
    type: "editorial",
    goal: "Engagement",
    color: "#4f46e5",
    startDate: "2026-06-01",
    endDate: "2026-06-30"
  }
];

const members: AudienceMember[] = [
  {
    id: "mem_001",
    segmentIds: ["seg_vip"],
    maskedEmail: "vip-001@example.test",
    country: "Spain",
    city: "Madrid",
    lifecycleStage: "loyalty",
    totalOrders: 8,
    totalRevenue: 780,
    lastPurchaseDate: "2026-06-02",
    lastEmailOpenDate: "2026-06-12",
    lastEmailClickDate: "2026-06-12",
    engagementScore: 92,
    fatigueRisk: "low",
    preferredCategory: "Tailoring"
  },
  {
    id: "mem_002",
    segmentIds: ["seg_vip", "seg_cold"],
    maskedEmail: "hybrid-002@example.test",
    country: "Spain",
    city: "Barcelona",
    lifecycleStage: "reactivation",
    totalOrders: 3,
    totalRevenue: 290,
    lastPurchaseDate: "2026-03-10",
    lastEmailOpenDate: "2026-06-11",
    lastEmailClickDate: "2026-06-10",
    engagementScore: 61,
    fatigueRisk: "medium",
    preferredCategory: "Resort"
  },
  {
    id: "mem_003",
    segmentIds: ["seg_cold"],
    maskedEmail: "cold-003@example.test",
    country: "France",
    city: "Paris",
    lifecycleStage: "cold",
    totalOrders: 0,
    totalRevenue: 0,
    lastPurchaseDate: "2025-09-01",
    lastEmailOpenDate: "2026-05-20",
    lastEmailClickDate: "2026-04-18",
    engagementScore: 24,
    fatigueRisk: "high",
    preferredCategory: "Archive"
  }
];

const newsletters: Newsletter[] = [
  makeNewsletter("nl_001", "camp_launch", "Launch", "2026-06-05T10:00:00.000Z", [
    makePerformance("seg_vip", "VIP Customers", 1000, 900, 540, 110, 38, 5400, 2),
    makePerformance("seg_cold", "Cold Audience", 2000, 1900, 300, 40, 8, 720, 14)
  ]),
  makeNewsletter("nl_002", "camp_editorial", "Editorial", "2026-06-12T10:00:00.000Z", [
    makePerformance("seg_vip", "VIP Customers", 800, 760, 410, 70, 16, 2100, 1),
    makePerformance("seg_cold", "Cold Audience", 1500, 1450, 260, 30, 3, 180, 9)
  ])
];

test("audience member helpers summarize demo members for a segment", () => {
  assert.deepEqual(getMembersForSegment(members, "seg_vip").map((member) => member.id), ["mem_001", "mem_002"]);

  const summary = getSegmentMemberSummary("seg_vip", members);

  assert.equal(summary.memberCount, 2);
  assert.equal(summary.totalOrders, 11);
  assert.equal(summary.totalRevenue, 1070);
  assert.equal(summary.topCountry, "Spain");
  assert.equal(summary.topCategory, "Tailoring");
  assert.equal(summary.highFatigueCount, 0);
});

test("audience metric helpers derive trends, fit, and map points from newsletter facts", () => {
  const revenueTrend = getSegmentRevenueTrend("seg_vip", newsletters);
  const engagementTrend = getSegmentEngagementTrend("seg_vip", newsletters);
  const campaignFit = getSegmentCampaignFit("seg_vip", campaigns, newsletters);
  const mapPoints = getAudienceMapPoints(segments, campaigns, newsletters, members);

  assert.deepEqual(revenueTrend.map((point) => point.revenue), [5400, 2100]);
  assert.deepEqual(engagementTrend.map((point) => Number(point.openRate.toFixed(2))), [0.6, 0.54]);
  assert.equal(campaignFit[0].campaignId, "camp_launch");
  assert.equal(mapPoints[0].segmentId, "seg_vip");
  assert.ok(mapPoints[0].value > mapPoints[1].value);
  assert.ok(mapPoints[1].pressure >= mapPoints[0].pressure);
});

test("segment movement labels explain growth, fatigue, and recovery from monthly trends", () => {
  const growing = getSegmentMovement("seg_vip", [
    makeNewsletter("nl_003", "camp_launch", "Launch", "2026-06-05T10:00:00.000Z", [
      makePerformance("seg_vip", "VIP Customers", 1000, 950, 310, 48, 8, 760, 2)
    ]),
    makeNewsletter("nl_004", "camp_editorial", "Editorial", "2026-06-19T10:00:00.000Z", [
      makePerformance("seg_vip", "VIP Customers", 1000, 950, 430, 86, 18, 1800, 2)
    ])
  ], members);
  const fatigued = getSegmentMovement("seg_cold", newsletters, members);
  const recovering = getSegmentMovement("seg_cold", [
    makeNewsletter("nl_005", "camp_launch", "Launch", "2026-06-05T10:00:00.000Z", [
      makePerformance("seg_cold", "Cold Audience", 1000, 950, 180, 20, 2, 120, 12)
    ]),
    makeNewsletter("nl_006", "camp_editorial", "Editorial", "2026-06-19T10:00:00.000Z", [
      makePerformance("seg_cold", "Cold Audience", 1000, 950, 285, 43, 6, 430, 4)
    ])
  ], members);

  assert.equal(growing.label, "Growing");
  assert.match(growing.explanation, /Revenue per recipient improved/);
  assert.equal(fatigued.label, "Fatigued");
  assert.match(fatigued.explanation, /fatigue/);
  assert.equal(recovering.label, "Recovering");
  assert.match(recovering.explanation, /recovering/);
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
