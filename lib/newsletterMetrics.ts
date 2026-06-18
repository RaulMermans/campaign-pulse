import type {
  Campaign,
  CampaignSummary,
  Newsletter,
  NewsletterRates,
  SaturationLevel,
  Segment,
  SegmentCampaignSummary,
  SegmentPerformance,
  SegmentSummary
} from "./newsletterTypes";
import { getNewsletterSaturation, getSaturationLevel } from "./newsletterSaturation";

interface SummaryScoreInput {
  revenuePerRecipient: number;
  clickToOpenRate: number;
  clickRate: number;
  unsubscribeRate: number;
}

export function calculateOpenRate(newsletter: Newsletter): number {
  return safeDivide(newsletter.metrics.uniqueOpens, newsletter.metrics.delivered);
}

export function calculateClickRate(newsletter: Newsletter): number {
  return safeDivide(newsletter.metrics.uniqueClicks, newsletter.metrics.delivered);
}

export function calculateClickToOpenRate(newsletter: Newsletter): number {
  return safeDivide(newsletter.metrics.uniqueClicks, newsletter.metrics.uniqueOpens);
}

export function calculateConversionRate(newsletter: Newsletter): number {
  return safeDivide(newsletter.metrics.orders, newsletter.metrics.delivered);
}

export function calculateRevenuePerRecipient(newsletter: Newsletter): number {
  return safeDivide(newsletter.metrics.revenue, newsletter.metrics.delivered);
}

export function calculateRevenuePerOpen(newsletter: Newsletter): number {
  return safeDivide(newsletter.metrics.revenue, newsletter.metrics.uniqueOpens);
}

export function calculateRevenuePerClick(newsletter: Newsletter): number {
  return safeDivide(newsletter.metrics.revenue, newsletter.metrics.uniqueClicks);
}

export function calculateUnsubscribeRate(newsletter: Newsletter): number {
  return safeDivide(newsletter.metrics.unsubscribes, newsletter.metrics.delivered);
}

export function calculateBounceRate(newsletter: Newsletter): number {
  return safeDivide(newsletter.metrics.bounced, newsletter.metrics.sent);
}

export function getNewsletterRates(newsletter: Newsletter): NewsletterRates {
  return {
    openRate: calculateOpenRate(newsletter),
    clickRate: calculateClickRate(newsletter),
    clickToOpenRate: calculateClickToOpenRate(newsletter),
    conversionRate: calculateConversionRate(newsletter),
    revenuePerRecipient: calculateRevenuePerRecipient(newsletter),
    revenuePerOpen: calculateRevenuePerOpen(newsletter),
    revenuePerClick: calculateRevenuePerClick(newsletter),
    unsubscribeRate: calculateUnsubscribeRate(newsletter),
    bounceRate: calculateBounceRate(newsletter),
    spamComplaintRate: safeDivide(newsletter.metrics.spamComplaints, newsletter.metrics.delivered)
  };
}

export function getNewsletterScore(newsletter: Newsletter): number {
  const rates = getNewsletterRates(newsletter);
  return rates.revenuePerRecipient * 100 + rates.clickToOpenRate * 55 + rates.clickRate * 70 + rates.conversionRate * 30 - rates.unsubscribeRate * 18;
}

export function getNewsletterRank(newsletter: Newsletter, newsletters: Newsletter[]): number {
  return [...newsletters].sort((a, b) => getNewsletterScore(b) - getNewsletterScore(a)).findIndex((item) => item.id === newsletter.id) + 1;
}

export function getBestNewsletter(newsletters: Newsletter[]): Newsletter | null {
  if (!newsletters.length) return null;
  return [...newsletters].sort((a, b) => getNewsletterScore(b) - getNewsletterScore(a))[0];
}

export function getWorstNewsletter(newsletters: Newsletter[]): Newsletter | null {
  if (!newsletters.length) return null;
  return [...newsletters].sort((a, b) => getNewsletterScore(a) - getNewsletterScore(b))[0];
}

export function getMonthlySummary(newsletters: Newsletter[]) {
  const totals = getNewsletterTotals(newsletters);
  const averageSaturationScore = safeDivide(sum(newsletters, (item) => getNewsletterSaturation(item, newsletters).saturationScore), newsletters.length);

  return {
    ...totals,
    spamComplaintRate: safeDivide(sum(newsletters, (item) => item.metrics.spamComplaints), totals.totalDelivered),
    averageSaturationScore,
    saturationLevel: getSaturationLevel(averageSaturationScore)
  };
}

export function getAvailableMonths(newsletters: Newsletter[]): string[] {
  return Array.from(new Set(newsletters.map(getMonthKey))).sort();
}

export function getLatestMonth(newsletters: Newsletter[]): string {
  return getAvailableMonths(newsletters).at(-1) ?? "";
}

export function filterNewslettersByMonth(newsletters: Newsletter[], month: string): Newsletter[] {
  return newsletters.filter((newsletter) => getMonthKey(newsletter) === month);
}

export function getMonthKey(newsletter: Newsletter): string {
  return newsletter.timing.sentAt.slice(0, 7);
}

export function getSendDate(newsletter: Newsletter): string {
  return newsletter.timing.sentAt.slice(0, 10);
}

export function getSendDay(newsletter: Newsletter): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date(newsletter.timing.sentAt));
}

export function getSendHour(newsletter: Newsletter): number {
  return new Date(newsletter.timing.sentAt).getHours();
}

export function getWeekOfMonth(newsletter: Newsletter): number {
  return Math.ceil(new Date(newsletter.timing.sentAt).getDate() / 7);
}

export function groupNewslettersByCampaign(newsletters: Newsletter[]) {
  return newsletters.reduce<Record<string, Newsletter[]>>((acc, newsletter) => {
    acc[newsletter.campaign.id] ||= [];
    acc[newsletter.campaign.id].push(newsletter);
    return acc;
  }, {});
}

export function groupNewslettersByWeek(newsletters: Newsletter[]) {
  const grouped = newsletters.reduce<Record<number, Newsletter[]>>((acc, newsletter) => {
    acc[getWeekOfMonth(newsletter)] ||= [];
    acc[getWeekOfMonth(newsletter)].push(newsletter);
    return acc;
  }, {});
  Object.values(grouped).forEach((items) => items.sort((a, b) => a.timing.sentAt.localeCompare(b.timing.sentAt)));
  return grouped;
}

export function getCampaignSummaries(campaigns: Campaign[], newsletters: Newsletter[]): CampaignSummary[] {
  const grouped = groupNewslettersByCampaign(newsletters);
  return campaigns.map((campaign) => {
    const campaignNewsletters = grouped[campaign.id] ?? [];
    const averageSaturationScore = safeDivide(sum(campaignNewsletters, (item) => getNewsletterSaturation(item, newsletters).saturationScore), campaignNewsletters.length);
    return {
      campaign,
      sendCount: campaignNewsletters.length,
      ...getNewsletterTotals(campaignNewsletters),
      averageSaturationScore,
      saturationLevel: getSaturationLevel(averageSaturationScore),
      bestNewsletter: getBestNewsletter(campaignNewsletters),
      weakestNewsletter: getWorstNewsletter(campaignNewsletters)
    };
  });
}

export function getBestCampaign(campaigns: Campaign[], newsletters: Newsletter[]): CampaignSummary | null {
  const summaries = getCampaignSummaries(campaigns, newsletters).filter((summary) => summary.sendCount > 0);
  return summaries.length ? [...summaries].sort((a, b) => getSummaryScore(b) - getSummaryScore(a))[0] : null;
}

export function getWeakestCampaign(campaigns: Campaign[], newsletters: Newsletter[]): CampaignSummary | null {
  const summaries = getCampaignSummaries(campaigns, newsletters).filter((summary) => summary.sendCount > 0);
  return summaries.length ? [...summaries].sort((a, b) => getSummaryScore(a) - getSummaryScore(b))[0] : null;
}

export function getCampaignSaturationLevel(newsletters: Newsletter[]): SaturationLevel {
  const averageSaturationScore = safeDivide(sum(newsletters, (item) => getNewsletterSaturation(item, newsletters).saturationScore), newsletters.length);
  return getSaturationLevel(averageSaturationScore);
}

export function getSegmentSummaries(segments: Segment[], campaigns: Campaign[], newsletters: Newsletter[]): SegmentSummary[] {
  return segments.map((segment) => {
    const entries = newsletters.flatMap((newsletter) =>
      newsletter.segmentPerformance.filter((performance) => performance.segmentId === segment.id).map((performance) => ({ newsletter, performance }))
    );
    const touchedNewsletters = entries.map((entry) => entry.newsletter);
    const averageSaturationScore = safeDivide(sum(touchedNewsletters, (newsletter) => getNewsletterSaturation(newsletter, newsletters).saturationScore), touchedNewsletters.length);
    return {
      segment,
      sendCount: entries.length,
      ...getSegmentTotals(entries.map((entry) => entry.performance)),
      averageSaturationScore,
      saturationLevel: getSaturationLevel(averageSaturationScore),
      bestCampaign: getBestCampaignForSegment(segment.id, campaigns, newsletters)
    };
  });
}

export function getBestSegment(segments: Segment[], campaigns: Campaign[], newsletters: Newsletter[]): SegmentSummary | null {
  const summaries = getSegmentSummaries(segments, campaigns, newsletters).filter((summary) => summary.sendCount > 0);
  return summaries.length ? [...summaries].sort((a, b) => getSummaryScore(b) - getSummaryScore(a))[0] : null;
}

export function getMostSaturatedSegment(segments: Segment[], campaigns: Campaign[], newsletters: Newsletter[]): SegmentSummary | null {
  const summaries = getSegmentSummaries(segments, campaigns, newsletters).filter((summary) => summary.sendCount > 0);
  return summaries.length ? [...summaries].sort((a, b) => b.averageSaturationScore - a.averageSaturationScore)[0] : null;
}

function getNewsletterTotals(newsletters: Newsletter[]) {
  const totalSent = sum(newsletters, (item) => item.metrics.sent);
  const totalDelivered = sum(newsletters, (item) => item.metrics.delivered);
  const uniqueOpens = sum(newsletters, (item) => item.metrics.uniqueOpens);
  const uniqueClicks = sum(newsletters, (item) => item.metrics.uniqueClicks);
  const orders = sum(newsletters, (item) => item.metrics.orders);
  const revenue = sum(newsletters, (item) => item.metrics.revenue);
  const unsubscribes = sum(newsletters, (item) => item.metrics.unsubscribes);
  return {
    totalSent,
    totalDelivered,
    uniqueOpens,
    uniqueClicks,
    orders,
    revenue,
    unsubscribes,
    openRate: safeDivide(uniqueOpens, totalDelivered),
    clickRate: safeDivide(uniqueClicks, totalDelivered),
    clickToOpenRate: safeDivide(uniqueClicks, uniqueOpens),
    conversionRate: safeDivide(orders, totalDelivered),
    revenuePerRecipient: safeDivide(revenue, totalDelivered),
    unsubscribeRate: safeDivide(unsubscribes, totalDelivered)
  };
}

function getSegmentTotals(performances: SegmentPerformance[]) {
  const totalSent = sum(performances, (item) => item.sent);
  const totalDelivered = sum(performances, (item) => item.delivered);
  const uniqueOpens = sum(performances, (item) => item.uniqueOpens);
  const uniqueClicks = sum(performances, (item) => item.uniqueClicks);
  const orders = sum(performances, (item) => item.orders);
  const revenue = sum(performances, (item) => item.revenue);
  const unsubscribes = sum(performances, (item) => item.unsubscribes);
  return {
    totalSent,
    totalDelivered,
    uniqueOpens,
    uniqueClicks,
    orders,
    revenue,
    unsubscribes,
    openRate: safeDivide(uniqueOpens, totalDelivered),
    clickRate: safeDivide(uniqueClicks, totalDelivered),
    clickToOpenRate: safeDivide(uniqueClicks, uniqueOpens),
    conversionRate: safeDivide(orders, totalDelivered),
    revenuePerRecipient: safeDivide(revenue, totalDelivered),
    unsubscribeRate: safeDivide(unsubscribes, totalDelivered)
  };
}

function getBestCampaignForSegment(segmentId: string, campaigns: Campaign[], newsletters: Newsletter[]): SegmentCampaignSummary | null {
  const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
  const grouped = newsletters.reduce<Record<string, { newsletter: Newsletter; performance: SegmentPerformance }[]>>((acc, newsletter) => {
    newsletter.segmentPerformance
      .filter((performance) => performance.segmentId === segmentId)
      .forEach((performance) => {
        acc[newsletter.campaign.id] ||= [];
        acc[newsletter.campaign.id].push({ newsletter, performance });
      });
    return acc;
  }, {});
  const summaries = Object.entries(grouped).flatMap(([campaignId, entries]) => {
    const campaign = campaignById.get(campaignId);
    if (!campaign) return [];
    return [{ campaign, sendCount: entries.length, ...getSegmentTotals(entries.map((entry) => entry.performance)) }];
  });
  return summaries.length ? [...summaries].sort((a, b) => getSummaryScore(b) - getSummaryScore(a))[0] : null;
}

function getSummaryScore(summary: SummaryScoreInput): number {
  return summary.revenuePerRecipient * 100 + summary.clickToOpenRate * 55 + summary.clickRate * 70 - summary.unsubscribeRate * 18;
}

function safeDivide(numerator: number, denominator: number): number {
  return denominator ? numerator / denominator : 0;
}

function sum<T>(items: T[], selector: (item: T) => number): number {
  return items.reduce((total, item) => total + selector(item), 0);
}
