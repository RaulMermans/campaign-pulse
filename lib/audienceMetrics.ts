import type {
  AudienceMapPoint,
  AudienceMember,
  SegmentMovement,
  SegmentCampaignFit,
  SegmentDecisionLabel,
  SegmentEngagementTrendPoint,
  SegmentMemberSummary,
  SegmentTrendPoint
} from "./audienceTypes";
import type { Campaign, Newsletter, Segment, SegmentPerformance, SegmentSummary } from "./newsletterTypes";
import { getSegmentSummaries } from "./newsletterMetrics";

export function getMembersForSegment(members: AudienceMember[], segmentId: string): AudienceMember[] {
  return members.filter((member) => member.segmentIds.includes(segmentId));
}

export function getSegmentMemberSummary(segmentId: string, members: AudienceMember[]): SegmentMemberSummary {
  const segmentMembers = getMembersForSegment(members, segmentId);
  const memberCount = segmentMembers.length;
  const totalOrders = sum(segmentMembers, (member) => member.totalOrders);
  const totalRevenue = sum(segmentMembers, (member) => member.totalRevenue);
  const averageEngagementScore = safeDivide(sum(segmentMembers, (member) => member.engagementScore), memberCount);
  const fatigueMix = {
    low: segmentMembers.filter((member) => member.fatigueRisk === "low").length,
    medium: segmentMembers.filter((member) => member.fatigueRisk === "medium").length,
    high: segmentMembers.filter((member) => member.fatigueRisk === "high").length,
    critical: segmentMembers.filter((member) => member.fatigueRisk === "critical").length
  };

  return {
    memberCount,
    totalOrders,
    totalRevenue,
    averageRevenue: safeDivide(totalRevenue, memberCount),
    averageEngagementScore,
    highFatigueCount: fatigueMix.high + fatigueMix.critical,
    topCountry: topValue(segmentMembers.map((member) => member.country)),
    topCity: topValue(segmentMembers.map((member) => member.city)),
    topCategory: topValue(segmentMembers.map((member) => member.preferredCategory)),
    lifecycleMix: countValues(segmentMembers.map((member) => member.lifecycleStage)),
    fatigueMix,
    recentOpenCount: segmentMembers.filter((member) => daysSince(member.lastEmailOpenDate) <= 30).length,
    recentClickCount: segmentMembers.filter((member) => daysSince(member.lastEmailClickDate) <= 30).length
  };
}

export function getSegmentRevenueTrend(segmentId: string, newsletters: Newsletter[]): SegmentTrendPoint[] {
  return getSegmentEntries(segmentId, newsletters).map(({ newsletter, performance }) => ({
    date: newsletter.timing.sentAt.slice(0, 10),
    label: shortDate(newsletter.timing.sentAt),
    newsletterId: newsletter.id,
    newsletterName: newsletter.name,
    campaignName: newsletter.campaign.name,
    revenue: performance.revenue,
    revenuePerRecipient: safeDivide(performance.revenue, performance.delivered),
    delivered: performance.delivered
  }));
}

export function getSegmentEngagementTrend(segmentId: string, newsletters: Newsletter[]): SegmentEngagementTrendPoint[] {
  return getSegmentEntries(segmentId, newsletters).map(({ newsletter, performance }) => ({
    date: newsletter.timing.sentAt.slice(0, 10),
    label: shortDate(newsletter.timing.sentAt),
    newsletterId: newsletter.id,
    newsletterName: newsletter.name,
    campaignName: newsletter.campaign.name,
    openRate: safeDivide(performance.uniqueOpens, performance.delivered),
    clickRate: safeDivide(performance.uniqueClicks, performance.delivered),
    clickToOpenRate: safeDivide(performance.uniqueClicks, performance.uniqueOpens),
    unsubscribeRate: safeDivide(performance.unsubscribes, performance.delivered)
  }));
}

export function getSegmentMovement(segmentId: string, newsletters: Newsletter[], members: AudienceMember[] = []): SegmentMovement {
  const entries = getSegmentEntries(segmentId, newsletters);
  const memberSummary = getSegmentMemberSummary(segmentId, members);
  const highFatigueShare = safeDivide(memberSummary.highFatigueCount, Math.max(memberSummary.memberCount, 1));

  if (entries.length < 2) {
    return {
      label: highFatigueShare >= 0.4 ? "Fatigued" : "Stable",
      explanation: highFatigueShare >= 0.4
        ? "Movement is limited, but synthetic member records show elevated fatigue, so this segment needs a pressure check."
        : "Movement is stable because there is not enough month-level send history to prove a shift.",
      evidence: {
        sendCount: entries.length,
        revenuePerRecipientChange: 0,
        openRateChange: 0,
        clickToOpenRateChange: 0,
        unsubscribeRateChange: 0,
        highFatigueShare
      }
    };
  }

  const first = getPerformanceRates(entries[0].performance);
  const last = getPerformanceRates(entries[entries.length - 1].performance);
  const revenuePerRecipientChange = safeRelativeChange(last.revenuePerRecipient, first.revenuePerRecipient);
  const openRateChange = last.openRate - first.openRate;
  const clickToOpenRateChange = last.clickToOpenRate - first.clickToOpenRate;
  const unsubscribeRateChange = last.unsubscribeRate - first.unsubscribeRate;
  const engagementImproved = openRateChange >= 0.03 || clickToOpenRateChange >= 0.018;
  const engagementDeclined = openRateChange <= -0.035 || clickToOpenRateChange <= -0.02;
  const revenueImproved = revenuePerRecipientChange >= 0.15;
  const revenueDeclined = revenuePerRecipientChange <= -0.18;
  const unsubscribeImproved = unsubscribeRateChange <= -0.001;
  const unsubscribeWorsened = unsubscribeRateChange >= 0.001;

  if ((engagementImproved || revenueImproved) && unsubscribeImproved) {
    return buildMovement("Recovering", `Segment response is recovering: engagement or revenue improved while unsubscribe pressure eased across ${entries.length} sends.`, entries.length, revenuePerRecipientChange, openRateChange, clickToOpenRateChange, unsubscribeRateChange, highFatigueShare);
  }

  if (highFatigueShare >= 0.4 && (revenueDeclined || engagementDeclined || last.unsubscribeRate >= 0.004)) {
    return buildMovement("Fatigued", `Synthetic member records show elevated fatigue, and recent send performance is carrying weaker value or higher unsubscribe pressure.`, entries.length, revenuePerRecipientChange, openRateChange, clickToOpenRateChange, unsubscribeRateChange, highFatigueShare);
  }

  if (revenueImproved && engagementImproved && !unsubscribeWorsened) {
    return buildMovement("Growing", `Revenue per recipient improved and engagement strengthened across ${entries.length} sends without a meaningful unsubscribe lift.`, entries.length, revenuePerRecipientChange, openRateChange, clickToOpenRateChange, unsubscribeRateChange, highFatigueShare);
  }

  if ((revenueDeclined || engagementDeclined) && !unsubscribeImproved) {
    return buildMovement("Declining", `Segment response is declining: value or engagement fell without enough unsubscribe relief to call it recovery.`, entries.length, revenuePerRecipientChange, openRateChange, clickToOpenRateChange, unsubscribeRateChange, highFatigueShare);
  }

  return buildMovement("Stable", `Segment movement is stable: changes stayed inside the tolerance band across ${entries.length} sends.`, entries.length, revenuePerRecipientChange, openRateChange, clickToOpenRateChange, unsubscribeRateChange, highFatigueShare);
}

export function getSegmentCampaignFit(segmentId: string, campaigns: Campaign[], newsletters: Newsletter[]): SegmentCampaignFit[] {
  const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
  const grouped = getSegmentEntries(segmentId, newsletters).reduce<Record<string, SegmentPerformance[]>>((acc, entry) => {
    acc[entry.newsletter.campaign.id] ||= [];
    acc[entry.newsletter.campaign.id].push(entry.performance);
    return acc;
  }, {});

  return Object.entries(grouped)
    .flatMap(([campaignId, performances]) => {
      const campaign = campaignById.get(campaignId);
      if (!campaign) return [];
      const totals = getSegmentTotals(performances);
      const fitScore = getFitScore(totals.revenuePerRecipient, totals.openRate, totals.clickToOpenRate, totals.unsubscribeRate, performances.length);

      return [{
        campaignId,
        campaignName: campaign.name,
        campaignType: campaign.type,
        color: campaign.color,
        sendCount: performances.length,
        revenue: totals.revenue,
        revenuePerRecipient: totals.revenuePerRecipient,
        openRate: totals.openRate,
        clickToOpenRate: totals.clickToOpenRate,
        unsubscribeRate: totals.unsubscribeRate,
        fitScore
      }];
    })
    .sort((a, b) => b.fitScore - a.fitScore);
}

export function getAudienceMapPoints(segments: Segment[], campaigns: Campaign[], newsletters: Newsletter[], members: AudienceMember[] = []): AudienceMapPoint[] {
  return getSegmentSummaries(segments, campaigns, newsletters)
    .filter((summary) => summary.sendCount > 0)
    .map((summary) => {
      const memberSummary = getSegmentMemberSummary(summary.segment.id, members);
      const fatiguePressure = safeDivide(memberSummary.highFatigueCount, Math.max(memberSummary.memberCount, 1)) * 22;
      const pressure = clamp(Math.round(summary.averageSaturationScore * 0.66 + summary.unsubscribeRate * 4800 + fatiguePressure), 0, 100);
      const engagementScore = memberSummary.memberCount ? memberSummary.averageEngagementScore : Math.round(summary.openRate * 100);
      const opportunityScore = summary.revenuePerRecipient * 140 + summary.clickToOpenRate * 65 + Math.max(0, 70 - pressure) * 0.22;
      const priorityScore = pressure * 0.82 + summary.revenuePerRecipient * 95 + summary.revenue / 2600;

      return {
        segmentId: summary.segment.id,
        name: summary.segment.name,
        lifecycleStage: summary.segment.lifecycleStage,
        valueTier: summary.segment.valueTier,
        value: summary.revenuePerRecipient,
        pressure,
        revenue: summary.revenue,
        revenuePerRecipient: summary.revenuePerRecipient,
        sendCount: summary.sendCount,
        memberCount: memberSummary.memberCount,
        engagementScore,
        saturationLevel: summary.saturationLevel,
        decisionLabel: getSegmentDecisionLabel(summary, pressure),
        priorityScore,
        opportunityScore
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

export function getSegmentDecisionLabel(summary: SegmentSummary, pressure = summary.averageSaturationScore): SegmentDecisionLabel {
  if (pressure >= 72 || summary.saturationLevel === "overexposed" || summary.saturationLevel === "saturated" || summary.unsubscribeRate > 0.0045) return "Cool down";
  if (summary.revenuePerRecipient > 0.22 && summary.unsubscribeRate < 0.0025 && pressure < 60) return "Protect";
  if (summary.openRate > 0.35 && summary.clickToOpenRate < 0.085) return "Test editorial";
  if (summary.openRate < 0.24 || summary.clickToOpenRate < 0.055 || summary.revenuePerRecipient < 0.045) return "Rebuild";
  return "Scale carefully";
}

function getSegmentEntries(segmentId: string, newsletters: Newsletter[]) {
  return newsletters
    .flatMap((newsletter) =>
      newsletter.segmentPerformance
        .filter((performance) => performance.segmentId === segmentId)
        .map((performance) => ({ newsletter, performance }))
    )
    .sort((a, b) => a.newsletter.timing.sentAt.localeCompare(b.newsletter.timing.sentAt));
}

function getPerformanceRates(performance: SegmentPerformance) {
  return {
    openRate: safeDivide(performance.uniqueOpens, performance.delivered),
    clickRate: safeDivide(performance.uniqueClicks, performance.delivered),
    clickToOpenRate: safeDivide(performance.uniqueClicks, performance.uniqueOpens),
    revenuePerRecipient: safeDivide(performance.revenue, performance.delivered),
    unsubscribeRate: safeDivide(performance.unsubscribes, performance.delivered)
  };
}

function buildMovement(
  label: SegmentMovement["label"],
  explanation: string,
  sendCount: number,
  revenuePerRecipientChange: number,
  openRateChange: number,
  clickToOpenRateChange: number,
  unsubscribeRateChange: number,
  highFatigueShare: number
): SegmentMovement {
  return {
    label,
    explanation,
    evidence: {
      sendCount,
      revenuePerRecipientChange,
      openRateChange,
      clickToOpenRateChange,
      unsubscribeRateChange,
      highFatigueShare
    }
  };
}

function safeRelativeChange(current: number, previous: number): number {
  if (!previous) return current ? 1 : 0;
  return (current - previous) / previous;
}

function getSegmentTotals(performances: SegmentPerformance[]) {
  const totalDelivered = sum(performances, (item) => item.delivered);
  const uniqueOpens = sum(performances, (item) => item.uniqueOpens);
  const uniqueClicks = sum(performances, (item) => item.uniqueClicks);
  const revenue = sum(performances, (item) => item.revenue);
  const unsubscribes = sum(performances, (item) => item.unsubscribes);

  return {
    revenue,
    openRate: safeDivide(uniqueOpens, totalDelivered),
    clickToOpenRate: safeDivide(uniqueClicks, uniqueOpens),
    revenuePerRecipient: safeDivide(revenue, totalDelivered),
    unsubscribeRate: safeDivide(unsubscribes, totalDelivered)
  };
}

function getFitScore(revenuePerRecipient: number, openRate: number, clickToOpenRate: number, unsubscribeRate: number, sendCount: number): number {
  return Math.max(0, Math.round(revenuePerRecipient * 360 + openRate * 48 + clickToOpenRate * 82 + Math.min(sendCount, 4) * 3 - unsubscribeRate * 1200));
}

function topValue(values: string[]): string {
  return Object.entries(countValues(values)).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "n/a";
}

function countValues(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function daysSince(date: string): number {
  const value = new Date(date).getTime();
  if (Number.isNaN(value)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - value) / (24 * 60 * 60 * 1000));
}

function shortDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(date));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function safeDivide(numerator: number, denominator: number): number {
  return denominator ? numerator / denominator : 0;
}

function sum<T>(items: T[], selector: (item: T) => number): number {
  return items.reduce((total, item) => total + selector(item), 0);
}
