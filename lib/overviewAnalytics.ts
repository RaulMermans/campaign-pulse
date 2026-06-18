import type { Campaign, Newsletter, SaturationLevel, Segment, SegmentSummary } from "./newsletterTypes";
import { getNewsletterSaturation } from "./newsletterSaturation";
import { getSegmentSummaries } from "./newsletterMetrics";

export interface MonthlyOverviewPoint {
  month: string;
  label: string;
  sendCount: number;
  revenue: number;
  totalDelivered: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  engagementRate: number;
  revenuePerRecipient: number;
  unsubscribeRate: number;
  audiencePressureScore: number;
  rollingRevenueAverage: number;
  rollingEngagementAverage: number;
}

export interface CampaignContributionPoint {
  campaignId: string;
  campaignName: string;
  color: string;
  sendCount: number;
  revenue: number;
  revenueShare: number;
  revenuePerRecipient: number;
  openRate: number;
  clickToOpenRate: number;
  unsubscribeRate: number;
  efficiencyScore: number;
}

export interface SegmentOpportunityPoint {
  segmentId: string;
  segmentName: string;
  revenue: number;
  revenuePerRecipient: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  sendCount: number;
  pressureScore: number;
  opportunityScore: number;
  riskScore: number;
  saturationLevel: SaturationLevel;
}

export interface NewsletterAnomaly {
  newsletterId: string;
  newsletterName: string;
  campaignName: string;
  severity: "positive" | "warning";
  metric: "revenue" | "engagement" | "unsubscribe";
  score: number;
  evidence: string;
  recommendation: string;
}

export interface OverviewAnalytics {
  selectedMonth: string;
  currentMonth: MonthlyOverviewPoint;
  previousMonth: MonthlyOverviewPoint | null;
  monthlyTrend: MonthlyOverviewPoint[];
  monthOverMonthRevenueChange: number;
  monthOverMonthEngagementChange: number;
  campaignContribution: CampaignContributionPoint[];
  pressureRevenuePoints: SegmentOpportunityPoint[];
  bestOpportunitySegment: SegmentOpportunityPoint;
  highestRiskSegment: SegmentOpportunityPoint;
  anomalousNewsletters: NewsletterAnomaly[];
  campaignEfficiencyScore: number;
  audiencePressureScore: number;
  executiveHealthScore: number;
  revenueConcentrationShare: number;
  segmentRevenueConcentrationShare: number;
}

export function getOverviewAnalytics(newsletters: Newsletter[], campaigns: Campaign[], segments: Segment[], selectedMonth?: string): OverviewAnalytics {
  const months = Array.from(new Set(newsletters.map(getMonthKey))).sort();
  const month = selectedMonth && months.includes(selectedMonth) ? selectedMonth : months.at(-1) ?? "";
  const baseTrend = months.map((monthKey) => getMonthlyPoint(monthKey, newsletters.filter((newsletter) => getMonthKey(newsletter) === monthKey), newsletters));
  const monthlyTrend = baseTrend.map((point, index) => {
    const window = baseTrend.slice(Math.max(0, index - 2), index + 1);
    return {
      ...point,
      rollingRevenueAverage: safeDivide(sum(window, (item) => item.revenue), window.length),
      rollingEngagementAverage: safeDivide(sum(window, (item) => item.engagementRate), window.length)
    };
  });
  const currentMonth = monthlyTrend.find((point) => point.month === month) ?? getEmptyMonthPoint(month);
  const previousMonth = monthlyTrend[monthlyTrend.findIndex((point) => point.month === month) - 1] ?? null;
  const currentNewsletters = newsletters.filter((newsletter) => getMonthKey(newsletter) === month);
  const campaignContribution = getCampaignContribution(campaigns, currentNewsletters);
  const pressureRevenuePoints = getSegmentOpportunityPoints(segments, campaigns, currentNewsletters);
  const fallbackSegment = getEmptySegmentPoint();
  const bestOpportunitySegment = [...pressureRevenuePoints].sort((a, b) => b.opportunityScore - a.opportunityScore)[0] ?? fallbackSegment;
  const highestRiskSegment = [...pressureRevenuePoints].sort((a, b) => b.riskScore - a.riskScore)[0] ?? fallbackSegment;
  const anomalousNewsletters = getNewsletterAnomalies(currentNewsletters);
  const campaignEfficiencyScore = safeDivide(sum(campaignContribution, (campaign) => campaign.efficiencyScore * campaign.revenueShare), sum(campaignContribution, (campaign) => campaign.revenueShare));
  const audiencePressureScore = currentMonth.audiencePressureScore;
  const revenueConcentrationShare = campaignContribution[0]?.revenueShare ?? 0;
  const segmentRevenueTotal = sum(pressureRevenuePoints, (point) => point.revenue);
  const segmentRevenueConcentrationShare = safeDivide(Math.max(...pressureRevenuePoints.map((point) => point.revenue), 0), segmentRevenueTotal);

  return {
    selectedMonth: month,
    currentMonth,
    previousMonth,
    monthlyTrend,
    monthOverMonthRevenueChange: previousMonth ? percentChange(currentMonth.revenue, previousMonth.revenue) : 0,
    monthOverMonthEngagementChange: previousMonth ? percentChange(currentMonth.engagementRate, previousMonth.engagementRate) : 0,
    campaignContribution,
    pressureRevenuePoints,
    bestOpportunitySegment,
    highestRiskSegment,
    anomalousNewsletters,
    campaignEfficiencyScore,
    audiencePressureScore,
    executiveHealthScore: getExecutiveHealthScore(currentMonth, previousMonth, revenueConcentrationShare, anomalousNewsletters.length),
    revenueConcentrationShare,
    segmentRevenueConcentrationShare
  };
}

function getMonthlyPoint(month: string, monthNewsletters: Newsletter[], allNewsletters: Newsletter[]): MonthlyOverviewPoint {
  const totals = getNewsletterTotals(monthNewsletters);
  const audiencePressureScore = safeDivide(sum(monthNewsletters, (newsletter) => getNewsletterSaturation(newsletter, allNewsletters).saturationScore), monthNewsletters.length);

  return {
    month,
    label: shortMonth(month),
    sendCount: monthNewsletters.length,
    revenue: totals.revenue,
    totalDelivered: totals.totalDelivered,
    openRate: totals.openRate,
    clickRate: totals.clickRate,
    clickToOpenRate: totals.clickToOpenRate,
    engagementRate: getEngagementRate(totals.openRate, totals.clickRate, totals.clickToOpenRate),
    revenuePerRecipient: totals.revenuePerRecipient,
    unsubscribeRate: totals.unsubscribeRate,
    audiencePressureScore,
    rollingRevenueAverage: totals.revenue,
    rollingEngagementAverage: getEngagementRate(totals.openRate, totals.clickRate, totals.clickToOpenRate)
  };
}

function getCampaignContribution(campaigns: Campaign[], newsletters: Newsletter[]): CampaignContributionPoint[] {
  const totalRevenue = sum(newsletters, (newsletter) => newsletter.metrics.revenue);
  const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
  const grouped = newsletters.reduce<Record<string, Newsletter[]>>((acc, newsletter) => {
    acc[newsletter.campaign.id] ||= [];
    acc[newsletter.campaign.id].push(newsletter);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([campaignId, campaignNewsletters]) => {
      const campaign = campaignById.get(campaignId);
      const totals = getNewsletterTotals(campaignNewsletters);
      const revenueShare = safeDivide(totals.revenue, totalRevenue);
      return {
        campaignId,
        campaignName: campaign?.name ?? campaignNewsletters[0]?.campaign.name ?? campaignId,
        color: campaign?.color ?? "#667069",
        sendCount: campaignNewsletters.length,
        revenue: totals.revenue,
        revenueShare,
        revenuePerRecipient: totals.revenuePerRecipient,
        openRate: totals.openRate,
        clickToOpenRate: totals.clickToOpenRate,
        unsubscribeRate: totals.unsubscribeRate,
        efficiencyScore: clamp(Math.round(totals.revenuePerRecipient * 190 + totals.clickToOpenRate * 115 + totals.openRate * 42 + revenueShare * 18 - totals.unsubscribeRate * 2600), 0, 100)
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

function getSegmentOpportunityPoints(segments: Segment[], campaigns: Campaign[], newsletters: Newsletter[]): SegmentOpportunityPoint[] {
  return getSegmentSummaries(segments, campaigns, newsletters)
    .filter((summary) => summary.sendCount > 0)
    .map((summary) => getSegmentOpportunityPoint(summary))
    .sort((a, b) => b.opportunityScore + b.riskScore - (a.opportunityScore + a.riskScore));
}

function getSegmentOpportunityPoint(summary: SegmentSummary): SegmentOpportunityPoint {
  const pressureScore = clamp(Math.round(summary.averageSaturationScore * 0.74 + summary.unsubscribeRate * 5000 + summary.sendCount * 2), 0, 100);
  const opportunityScore = clamp(Math.round(summary.revenuePerRecipient * 180 + summary.clickToOpenRate * 90 + summary.openRate * 30 + Math.max(0, 70 - pressureScore) * 0.36), 0, 100);
  const riskScore = clamp(Math.round(pressureScore * 0.72 + summary.unsubscribeRate * 5500 + Math.max(0, 0.08 - summary.revenuePerRecipient) * 220), 0, 100);

  return {
    segmentId: summary.segment.id,
    segmentName: summary.segment.name,
    revenue: summary.revenue,
    revenuePerRecipient: summary.revenuePerRecipient,
    openRate: summary.openRate,
    clickRate: summary.clickRate,
    clickToOpenRate: summary.clickToOpenRate,
    sendCount: summary.sendCount,
    pressureScore,
    opportunityScore,
    riskScore,
    saturationLevel: summary.saturationLevel
  };
}

function getNewsletterAnomalies(newsletters: Newsletter[]): NewsletterAnomaly[] {
  if (newsletters.length < 2) return [];

  const metrics = newsletters.map((newsletter) => ({
    newsletter,
    revenue: newsletter.metrics.revenue,
    engagementRate: getEngagementRate(
      safeDivide(newsletter.metrics.uniqueOpens, newsletter.metrics.delivered),
      safeDivide(newsletter.metrics.uniqueClicks, newsletter.metrics.delivered),
      safeDivide(newsletter.metrics.uniqueClicks, newsletter.metrics.uniqueOpens)
    ),
    unsubscribeRate: safeDivide(newsletter.metrics.unsubscribes, newsletter.metrics.delivered)
  }));
  const revenueStats = getStats(metrics.map((item) => item.revenue));
  const engagementStats = getStats(metrics.map((item) => item.engagementRate));
  const unsubscribeStats = getStats(metrics.map((item) => item.unsubscribeRate));

  return metrics
    .flatMap((item) => {
      const revenueScore = zScore(item.revenue, revenueStats);
      const engagementScore = zScore(item.engagementRate, engagementStats);
      const unsubscribeScore = zScore(item.unsubscribeRate, unsubscribeStats);
      const anomalies: NewsletterAnomaly[] = [];

      if (revenueScore >= 0.9) {
        anomalies.push({
          newsletterId: item.newsletter.id,
          newsletterName: item.newsletter.name,
          campaignName: item.newsletter.campaign.name,
          severity: "positive",
          metric: "revenue",
          score: revenueScore,
          evidence: "Revenue materially exceeded the month pattern.",
          recommendation: "Inspect the audience and offer mix as the repeatable pattern."
        });
      }

      if (engagementScore <= -0.9) {
        anomalies.push({
          newsletterId: item.newsletter.id,
          newsletterName: item.newsletter.name,
          campaignName: item.newsletter.campaign.name,
          severity: "warning",
          metric: "engagement",
          score: Math.abs(engagementScore),
          evidence: "Engagement fell below the month pattern.",
          recommendation: "Rework the subject promise or post-open path before repeating."
        });
      }

      if (unsubscribeScore >= 0.9 && item.unsubscribeRate > 0.0025) {
        anomalies.push({
          newsletterId: item.newsletter.id,
          newsletterName: item.newsletter.name,
          campaignName: item.newsletter.campaign.name,
          severity: "warning",
          metric: "unsubscribe",
          score: unsubscribeScore,
          evidence: "Unsubscribe pressure was unusually high.",
          recommendation: "Suppress overlapping low-fit audiences before the next commercial touch."
        });
      }

      return anomalies;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function getExecutiveHealthScore(current: MonthlyOverviewPoint, previous: MonthlyOverviewPoint | null, revenueConcentrationShare: number, anomalyCount: number): number {
  const revenueMomentum = previous ? clamp(percentChange(current.revenue, previous.revenue) * 32, -18, 18) : 0;
  const engagementMomentum = previous ? clamp(percentChange(current.engagementRate, previous.engagementRate) * 70, -12, 12) : 0;
  const pressurePenalty = current.audiencePressureScore * 0.22;
  const concentrationPenalty = Math.max(0, revenueConcentrationShare - 0.55) * 24;
  const anomalyPenalty = anomalyCount * 2.5;

  return clamp(Math.round(66 + revenueMomentum + engagementMomentum - pressurePenalty - concentrationPenalty - anomalyPenalty), 0, 100);
}

function getNewsletterTotals(newsletters: Newsletter[]) {
  const totalDelivered = sum(newsletters, (newsletter) => newsletter.metrics.delivered);
  const uniqueOpens = sum(newsletters, (newsletter) => newsletter.metrics.uniqueOpens);
  const uniqueClicks = sum(newsletters, (newsletter) => newsletter.metrics.uniqueClicks);
  const revenue = sum(newsletters, (newsletter) => newsletter.metrics.revenue);
  const unsubscribes = sum(newsletters, (newsletter) => newsletter.metrics.unsubscribes);

  return {
    totalDelivered,
    uniqueOpens,
    uniqueClicks,
    revenue,
    unsubscribes,
    openRate: safeDivide(uniqueOpens, totalDelivered),
    clickRate: safeDivide(uniqueClicks, totalDelivered),
    clickToOpenRate: safeDivide(uniqueClicks, uniqueOpens),
    revenuePerRecipient: safeDivide(revenue, totalDelivered),
    unsubscribeRate: safeDivide(unsubscribes, totalDelivered)
  };
}

function getEmptyMonthPoint(month: string): MonthlyOverviewPoint {
  return {
    month,
    label: shortMonth(month),
    sendCount: 0,
    revenue: 0,
    totalDelivered: 0,
    openRate: 0,
    clickRate: 0,
    clickToOpenRate: 0,
    engagementRate: 0,
    revenuePerRecipient: 0,
    unsubscribeRate: 0,
    audiencePressureScore: 0,
    rollingRevenueAverage: 0,
    rollingEngagementAverage: 0
  };
}

function getEmptySegmentPoint(): SegmentOpportunityPoint {
  return {
    segmentId: "none",
    segmentName: "No segment",
    revenue: 0,
    revenuePerRecipient: 0,
    openRate: 0,
    clickRate: 0,
    clickToOpenRate: 0,
    sendCount: 0,
    pressureScore: 0,
    opportunityScore: 0,
    riskScore: 0,
    saturationLevel: "healthy"
  };
}

function getEngagementRate(openRate: number, clickRate: number, clickToOpenRate: number): number {
  return openRate * 0.45 + clickToOpenRate * 0.4 + clickRate * 0.15;
}

function getStats(values: number[]) {
  const mean = safeDivide(sum(values, (value) => value), values.length);
  const variance = safeDivide(sum(values, (value) => (value - mean) ** 2), values.length);
  return { mean, standardDeviation: Math.sqrt(variance) };
}

function zScore(value: number, stats: ReturnType<typeof getStats>): number {
  return stats.standardDeviation ? (value - stats.mean) / stats.standardDeviation : 0;
}

function percentChange(current: number, previous: number): number {
  return previous ? (current - previous) / previous : 0;
}

function getMonthKey(newsletter: Newsletter): string {
  return newsletter.timing.sentAt.slice(0, 7);
}

function shortMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return month;
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(year, monthNumber - 1, 1));
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
