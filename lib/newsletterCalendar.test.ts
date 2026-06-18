import assert from "node:assert/strict";
import test from "node:test";
import {
  getDaySummary,
  getMonthCalendarGrid,
  getNewslettersForDate,
  getWeekRange,
  getWeekSummary,
  groupNewslettersByDay
} from "./newsletterCalendar";
import type { Newsletter } from "./newsletterTypes";

function makeNewsletter(id: string, sentAt: string, revenue: number, delivered = 1000): Newsletter {
  return {
    id,
    externalId: id,
    name: `Send ${id}`,
    title: `Title ${id}`,
    status: "sent",
    campaign: {
      id: id === "c" ? "retention" : "promo",
      name: id === "c" ? "Retention" : "Promo",
      type: id === "c" ? "retention" : "promotion",
      stage: "launch",
      sequencePosition: 1,
      sequenceTotal: 1
    },
    timing: {
      sentAt,
      timezone: "UTC"
    },
    content: {
      subjectLine: `Subject ${id}`,
      previewText: `Preview ${id}`,
      senderName: "Campaign Pulse",
      contentType: "newsletter",
      creativeAngle: "commercial",
      messageTheme: "value",
      ctaLabel: "Shop",
      ctaType: "button",
      landingPageUrl: "https://example.com",
      creativeUrl: "https://example.com",
      notes: ""
    },
    offer: {
      offerType: "discount",
      discountValue: 10,
      discountType: "percent",
      productFocus: "Core",
      collection: "Main",
      pricePoint: "mid",
      businessGoal: "Revenue"
    },
    audience: {
      audienceName: id === "c" ? "Loyalists" : "Buyers",
      audienceType: "segment",
      primarySegmentId: id === "c" ? "loyalists" : "buyers",
      segmentIds: id === "c" ? ["loyalists"] : ["buyers"],
      exclusionSegmentIds: [],
      recipientCount: delivered
    },
    metrics: {
      sent: delivered,
      delivered,
      bounced: 0,
      uniqueOpens: Math.round(delivered * 0.4),
      totalOpens: Math.round(delivered * 0.5),
      uniqueClicks: Math.round(delivered * 0.08),
      totalClicks: Math.round(delivered * 0.1),
      orders: 20,
      revenue,
      currency: "EUR",
      unsubscribes: id === "c" ? 8 : 1,
      spamComplaints: 0,
      attributionWindow: "7d"
    },
    segmentPerformance: [
      {
        segmentId: id === "c" ? "loyalists" : "buyers",
        segmentName: id === "c" ? "Loyalists" : "Buyers",
        sent: delivered,
        delivered,
        uniqueOpens: Math.round(delivered * 0.4),
        uniqueClicks: Math.round(delivered * 0.08),
        orders: 20,
        revenue,
        unsubscribes: id === "c" ? 8 : 1
      }
    ]
  };
}

const newsletters = [
  makeNewsletter("a", "2025-02-03T09:00:00.000Z", 1200),
  makeNewsletter("b", "2025-02-03T14:00:00.000Z", 1800),
  makeNewsletter("c", "2025-02-09T10:00:00.000Z", 900)
];

test("getMonthCalendarGrid returns a Monday-first grid with outside-month days muted", () => {
  const grid = getMonthCalendarGrid("2025-02");

  assert.equal(grid.length, 42);
  assert.equal(grid[0].date, "2025-01-27");
  assert.equal(grid[0].isCurrentMonth, false);
  assert.equal(grid[5].date, "2025-02-01");
  assert.equal(grid[5].isCurrentMonth, true);
  assert.equal(grid[41].date, "2025-03-09");
});

test("getWeekRange returns Monday through Sunday for the selected date", () => {
  assert.deepEqual(getWeekRange("2025-02-06"), [
    "2025-02-03",
    "2025-02-04",
    "2025-02-05",
    "2025-02-06",
    "2025-02-07",
    "2025-02-08",
    "2025-02-09"
  ]);
});

test("groupNewslettersByDay and getNewslettersForDate keep sends on the correct day", () => {
  const grouped = groupNewslettersByDay(newsletters);

  assert.equal(grouped["2025-02-03"].length, 2);
  assert.deepEqual(getNewslettersForDate(newsletters, "2025-02-09").map((newsletter) => newsletter.id), ["c"]);
});

test("getWeekSummary and getDaySummary aggregate orientation details", () => {
  const week = getWeekSummary(newsletters, newsletters);
  const day = getDaySummary(getNewslettersForDate(newsletters, "2025-02-03"), newsletters);

  assert.equal(week.sends, 3);
  assert.equal(week.revenue, 3900);
  assert.equal(week.strongestSend?.id, "b");
  assert.equal(week.highestRiskAudience, "Buyers");
  assert.equal(day.sends, 2);
  assert.equal(day.delivered, 2000);
  assert.equal(day.strongestSend?.id, "b");
});
