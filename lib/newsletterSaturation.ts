import type {
  Newsletter,
  SaturationAnalysis,
  SaturationLevel,
  Segment,
  SegmentPerformance,
  SegmentSaturationHeatmap,
  SegmentWeeklySaturation
} from "./newsletterTypes";

export function getNewsletterSaturation(newsletter: Newsletter, newsletters: Newsletter[] = []): SaturationAnalysis {
  const related = newsletters.length ? newsletters : [newsletter];
  const sentAt = new Date(newsletter.timing.sentAt);
  const segmentIds = newsletter.audience.segmentIds.length ? newsletter.audience.segmentIds : newsletter.segmentPerformance.map((segment) => segment.segmentId);
  const recent7d = getRecentSegmentSends(newsletter, related, segmentIds, 7);
  const recent14d = getRecentSegmentSends(newsletter, related, segmentIds, 14);
  const prior = getPriorNewsletter(newsletter, related);
  const trend = getPerformanceTrend(newsletter, prior);
  const repeatedCampaignType = hasRepeatedValue(recent7d.map((item) => item.campaign.type));
  const repeatedCreativeAngle = hasRepeatedValue(recent7d.map((item) => item.content.creativeAngle));
  const repeatedOffer = hasRepeatedValue(recent7d.map((item) => item.offer.offerType));
  const signals = getFatigueSignals(newsletter, prior, recent7d.length, repeatedCampaignType, repeatedCreativeAngle, repeatedOffer);
  const score = getSaturationScore(newsletter, prior, recent7d.length, recent14d.length, signals.length, repeatedCampaignType, repeatedCreativeAngle, repeatedOffer);
  const level = getSaturationLevel(score);

  return {
    saturationScore: score,
    saturationLevel: level,
    sendPressure7d: recent7d.length,
    sendPressure14d: recent14d.length,
    sameSegmentSends7d: recent7d.length,
    performanceTrend: trend,
    fatigueSignals: signals,
    diagnosis: getNewsletterDiagnosis(newsletter, level, sentAt, recent7d.length, trend, signals)
  };
}

export function getSegmentWeeklySaturation(segments: Segment[], newsletters: Newsletter[]): SegmentSaturationHeatmap {
  const maxWeek = Math.max(...newsletters.map((newsletter) => getWeekOfMonth(newsletter)), 1);
  const weeks = Array.from({ length: maxWeek }, (_, index) => index + 1);

  return {
    weeks,
    rows: segments.map((segment) => ({
      segment,
      cells: weeks.map((week) => getWeeklySegmentMetrics(segment, week, newsletters))
    }))
  };
}

export function getWeeklySegmentMetrics(segment: Segment, week: number, newsletters: Newsletter[]): SegmentWeeklySaturation {
  const entries = getSegmentWeekEntries(segment.id, week, newsletters);
  const previousEntries = getSegmentWeekEntries(segment.id, week - 1, newsletters);
  const totals = getSegmentTotals(entries.map((entry) => entry.performance));
  const previousTotals = previousEntries.length ? getSegmentTotals(previousEntries.map((entry) => entry.performance)) : null;
  const repeatedCampaignType = getRepeatedValue(entries.map((entry) => entry.newsletter.campaign.type));
  const repeatedCreativeAngle = getRepeatedValue(entries.map((entry) => entry.newsletter.content.creativeAngle));
  const repeatedOffer = getRepeatedValue(entries.map((entry) => entry.newsletter.offer.offerType));
  const saturationScore = getWeeklySaturationScore(totals, previousTotals, entries.length, repeatedCampaignType, repeatedCreativeAngle, repeatedOffer);

  return {
    segment,
    week,
    weekLabel: `Week ${week}`,
    newsletters: entries.map(({ newsletter }) => ({
      id: newsletter.id,
      name: newsletter.name,
      campaignName: newsletter.campaign.name,
      campaignType: newsletter.campaign.type,
      contentType: newsletter.content.contentType,
      creativeAngle: newsletter.content.creativeAngle,
      sentAt: newsletter.timing.sentAt
    })),
    sendCount: entries.length,
    ...totals,
    previousOpenRate: previousTotals?.openRate ?? null,
    previousClickRate: previousTotals?.clickRate ?? null,
    previousClickToOpenRate: previousTotals?.clickToOpenRate ?? null,
    previousUnsubscribeRate: previousTotals?.unsubscribeRate ?? null,
    saturationScore,
    saturationLevel: getSaturationLevel(saturationScore),
    repeatedCampaignType,
    repeatedCreativeAngle
  };
}

export function getSaturationLevel(score: number): SaturationLevel {
  if (score >= 80) return "overexposed";
  if (score >= 60) return "saturated";
  if (score >= 35) return "watch";
  return "healthy";
}

function getRecentSegmentSends(newsletter: Newsletter, newsletters: Newsletter[], segmentIds: string[], days: number): Newsletter[] {
  const sentAt = new Date(newsletter.timing.sentAt).getTime();
  const windowMs = days * 24 * 60 * 60 * 1000;

  return newsletters.filter((candidate) => {
    const candidateTime = new Date(candidate.timing.sentAt).getTime();
    if (candidateTime > sentAt || sentAt - candidateTime > windowMs) return false;
    return candidate.audience.segmentIds.some((segmentId) => segmentIds.includes(segmentId));
  });
}

function getPriorNewsletter(newsletter: Newsletter, newsletters: Newsletter[]): Newsletter | null {
  const sentAt = new Date(newsletter.timing.sentAt).getTime();
  const segmentIds = newsletter.audience.segmentIds;

  return newsletters
    .filter((candidate) => {
      const candidateTime = new Date(candidate.timing.sentAt).getTime();
      return candidate.id !== newsletter.id && candidateTime < sentAt && candidate.audience.segmentIds.some((segmentId) => segmentIds.includes(segmentId));
    })
    .sort((a, b) => b.timing.sentAt.localeCompare(a.timing.sentAt))[0] ?? null;
}

function getPerformanceTrend(newsletter: Newsletter, prior: Newsletter | null): SaturationAnalysis["performanceTrend"] {
  if (!prior) return "stable";
  const openDelta = calculateOpenRate(newsletter) - calculateOpenRate(prior);
  const clickDelta = calculateClickRate(newsletter) - calculateClickRate(prior);
  const rprDelta = calculateRevenuePerRecipient(newsletter) - calculateRevenuePerRecipient(prior);

  if (openDelta < -0.04 || clickDelta < -0.01 || rprDelta < -0.08) return "declining";
  if (openDelta > 0.03 && clickDelta > 0.006) return "rising";
  if (openDelta > 0.015 || clickDelta > 0.004) return "recovering";
  return "stable";
}

function getFatigueSignals(
  newsletter: Newsletter,
  prior: Newsletter | null,
  sendPressure7d: number,
  repeatedCampaignType: boolean,
  repeatedCreativeAngle: boolean,
  repeatedOffer: boolean
): string[] {
  const signals: string[] = [];
  if (sendPressure7d >= 3) signals.push("high_7d_send_pressure");
  if (prior && calculateOpenRate(prior) - calculateOpenRate(newsletter) > 0.04) signals.push("open_rate_decline");
  if (prior && calculateClickRate(prior) - calculateClickRate(newsletter) > 0.01) signals.push("ctr_decline");
  if (prior && calculateClickToOpenRate(prior) - calculateClickToOpenRate(newsletter) > 0.02) signals.push("ctor_decline");
  if (prior && calculateUnsubscribeRate(newsletter) - calculateUnsubscribeRate(prior) > 0.001) signals.push("unsubscribe_lift");
  if (calculateRevenuePerRecipient(newsletter) < 0.08) signals.push("low_revenue_per_recipient");
  if (repeatedCampaignType) signals.push("repeated_campaign_type");
  if (repeatedCreativeAngle) signals.push("repeated_creative_angle");
  if (repeatedOffer) signals.push("repeated_offer_type");
  return signals;
}

function getSaturationScore(
  newsletter: Newsletter,
  prior: Newsletter | null,
  sendPressure7d: number,
  sendPressure14d: number,
  signalCount: number,
  repeatedCampaignType: boolean,
  repeatedCreativeAngle: boolean,
  repeatedOffer: boolean
): number {
  let score = Math.min(sendPressure7d * 18 + sendPressure14d * 4, 70);
  score += signalCount * 4;
  if (prior && calculateOpenRate(prior) - calculateOpenRate(newsletter) > 0.04) score += 10;
  if (prior && calculateClickRate(prior) - calculateClickRate(newsletter) > 0.01) score += 8;
  if (calculateUnsubscribeRate(newsletter) > 0.0035) score += 16;
  else if (calculateUnsubscribeRate(newsletter) > 0.002) score += 8;
  if (calculateRevenuePerRecipient(newsletter) < 0.08) score += 8;
  if (repeatedCampaignType) score += 6;
  if (repeatedCreativeAngle) score += 5;
  if (repeatedOffer) score += 5;
  return Math.min(Math.round(score), 100);
}

function getNewsletterDiagnosis(
  newsletter: Newsletter,
  level: SaturationLevel,
  sentAt: Date,
  sendPressure7d: number,
  trend: string,
  signals: string[]
): string {
  const month = getMonthKey(newsletter);
  const base = `${newsletter.audience.audienceName} received ${sendPressure7d} same-segment send${sendPressure7d === 1 ? "" : "s"} in the 7 days ending ${sentAt.toISOString().slice(0, 10)}.`;
  if (level === "healthy") return `${base} Engagement for ${month} remains within a healthy range.`;
  return `${base} Saturation is ${level}; trend is ${trend}. Likely causes: ${signals.map((signal) => signal.replaceAll("_", " ")).join(", ") || "audience pressure"}.`;
}

function getSegmentWeekEntries(segmentId: string, week: number, newsletters: Newsletter[]) {
  if (week < 1) return [];

  return newsletters
    .filter((newsletter) => getWeekOfMonth(newsletter) === week)
    .flatMap((newsletter) =>
      newsletter.segmentPerformance
        .filter((performance) => performance.segmentId === segmentId)
        .map((performance) => ({ newsletter, performance }))
    );
}

function calculateOpenRate(newsletter: Newsletter): number {
  return safeDivide(newsletter.metrics.uniqueOpens, newsletter.metrics.delivered);
}

function calculateClickRate(newsletter: Newsletter): number {
  return safeDivide(newsletter.metrics.uniqueClicks, newsletter.metrics.delivered);
}

function calculateClickToOpenRate(newsletter: Newsletter): number {
  return safeDivide(newsletter.metrics.uniqueClicks, newsletter.metrics.uniqueOpens);
}

function calculateRevenuePerRecipient(newsletter: Newsletter): number {
  return safeDivide(newsletter.metrics.revenue, newsletter.metrics.delivered);
}

function calculateUnsubscribeRate(newsletter: Newsletter): number {
  return safeDivide(newsletter.metrics.unsubscribes, newsletter.metrics.delivered);
}

function getMonthKey(newsletter: Newsletter): string {
  return newsletter.timing.sentAt.slice(0, 7);
}

function getWeekOfMonth(newsletter: Newsletter): number {
  return Math.ceil(new Date(newsletter.timing.sentAt).getDate() / 7);
}

function getWeeklySaturationScore(
  totals: ReturnType<typeof getSegmentTotals>,
  previousTotals: ReturnType<typeof getSegmentTotals> | null,
  sendCount: number,
  repeatedCampaignType: string | null,
  repeatedCreativeAngle: string | null,
  repeatedOffer: string | null
): number {
  if (!sendCount) return 0;

  let score = Math.min(sendCount * 18, 72);
  if (previousTotals) {
    if (previousTotals.openRate - totals.openRate > 0.05) score += 12;
    if (previousTotals.clickRate - totals.clickRate > 0.01) score += 10;
    if (previousTotals.clickToOpenRate - totals.clickToOpenRate > 0.02) score += 10;
    if (totals.unsubscribeRate - previousTotals.unsubscribeRate > 0.001) score += 10;
  }
  if (totals.unsubscribeRate > 0.0035) score += 18;
  else if (totals.unsubscribeRate > 0.002) score += 10;
  if (totals.revenuePerRecipient < 0.08) score += 8;
  if (repeatedCampaignType) score += 8;
  if (repeatedCreativeAngle) score += 6;
  if (repeatedOffer) score += 6;

  return Math.min(Math.round(score), 100);
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

function getRepeatedValue(values: string[]): string | null {
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).find(([, count]) => count >= 2)?.[0] ?? null;
}

function hasRepeatedValue(values: string[]): boolean {
  return Boolean(getRepeatedValue(values));
}

function safeDivide(numerator: number, denominator: number): number {
  return denominator ? numerator / denominator : 0;
}

function sum<T>(items: T[], selector: (item: T) => number): number {
  return items.reduce((total, item) => total + selector(item), 0);
}
