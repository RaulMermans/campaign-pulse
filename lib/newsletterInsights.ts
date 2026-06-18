import type {
  Campaign,
  CampaignSummary,
  Newsletter,
  NewsletterDetailInsight,
  NewsletterInsight,
  RecommendedAction,
  Segment,
  SegmentSummary,
  SegmentWeeklySaturation
} from "./newsletterTypes";
import {
  calculateClickRate,
  calculateClickToOpenRate,
  calculateOpenRate,
  calculateRevenuePerRecipient,
  calculateUnsubscribeRate,
  getBestNewsletter,
  getBestSegment,
  getCampaignSummaries,
  getMostSaturatedSegment,
  getNewsletterScore,
  getSegmentSummaries,
  getWeakestCampaign
} from "./newsletterMetrics";
import { getNewsletterSaturation, getSegmentWeeklySaturation } from "./newsletterSaturation";
import { formatCurrency, formatCurrencyPrecise, formatPercent } from "./formatters";

export function getGlobalInsights(newsletters: Newsletter[], campaigns: Campaign[] = [], segments: Segment[] = []): NewsletterInsight[] {
  return uniqueInsights([
    ...getPerformanceInsights(newsletters),
    ...getRevenueInsights(newsletters, campaigns, segments),
    ...getSaturationInsights(newsletters, campaigns, segments),
    ...getSegmentInsights(newsletters, campaigns, segments),
    ...getCampaignInsights(newsletters, campaigns)
  ]).slice(0, 12);
}

export function getPerformanceInsights(newsletters: Newsletter[]): NewsletterInsight[] {
  const insights: NewsletterInsight[] = [];
  const best = getBestNewsletter(newsletters);
  const worst = getWorstNewsletter(newsletters);

  if (best) {
    insights.push({
      id: `best-newsletter-${best.id}`,
      type: "best_newsletter",
      severity: "positive",
      title: `${best.name} is the best performer`,
      message: `${best.campaign.name} paired strong audience fit with high post-open intent.`,
      evidence: `${formatCurrencyPrecise(calculateRevenuePerRecipient(best), best.metrics.currency)} RPR, ${formatPercent(calculateClickToOpenRate(best))} CTOR, ${formatCurrency(best.metrics.revenue, best.metrics.currency)} revenue.`,
      recommendation: `Reuse the ${clean(best.content.creativeAngle)} angle with ${best.audience.audienceName}, then test one CTA variant before increasing volume.`,
      relatedNewsletterIds: [best.id],
      relatedCampaignIds: [best.campaign.id],
      relatedSegmentIds: best.audience.segmentIds
    });
  }

  if (worst) {
    insights.push({
      id: `worst-newsletter-${worst.id}`,
      type: "worst_newsletter",
      severity: "warning",
      title: `${worst.name} is the weakest send`,
      message: "The send under-indexed on the blended score of RPR, CTR, CTOR, and unsubscribe pressure.",
      evidence: `${formatPercent(calculateClickRate(worst))} CTR, ${formatPercent(calculateClickToOpenRate(worst))} CTOR, ${formatCurrencyPrecise(calculateRevenuePerRecipient(worst), worst.metrics.currency)} RPR.`,
      recommendation: "Do not scale this message shape until the audience fit, offer clarity, or creative angle changes.",
      relatedNewsletterIds: [worst.id],
      relatedCampaignIds: [worst.campaign.id],
      relatedSegmentIds: worst.audience.segmentIds
    });
  }

  const highOpenLowCtor = newsletters
    .filter((newsletter) => calculateOpenRate(newsletter) > 0.38 && calculateClickToOpenRate(newsletter) < 0.09)
    .sort((a, b) => calculateOpenRate(b) - calculateOpenRate(a))[0];

  if (highOpenLowCtor) {
    insights.push({
      id: `high-open-low-ctor-${highOpenLowCtor.id}`,
      type: "high_or_low_ctor",
      severity: "warning",
      title: `${highOpenLowCtor.name} won the open but lost the click`,
      message: "The inbox promise is working, but the opened experience is not converting intent.",
      evidence: `${formatPercent(calculateOpenRate(highOpenLowCtor))} OR vs ${formatPercent(calculateClickToOpenRate(highOpenLowCtor))} CTOR.`,
      recommendation: "Keep the subject-line framing, but tighten offer hierarchy, CTA language, and landing-page continuity.",
      relatedNewsletterIds: [highOpenLowCtor.id],
      relatedCampaignIds: [highOpenLowCtor.campaign.id],
      relatedSegmentIds: highOpenLowCtor.audience.segmentIds
    });
  }

  const lowOpenStrongCtor = newsletters
    .filter((newsletter) => calculateOpenRate(newsletter) < 0.32 && calculateClickToOpenRate(newsletter) > 0.11)
    .sort((a, b) => calculateClickToOpenRate(b) - calculateClickToOpenRate(a))[0];

  if (lowOpenStrongCtor) {
    insights.push({
      id: `low-open-strong-ctor-${lowOpenStrongCtor.id}`,
      type: "low_or_strong_ctor",
      severity: "positive",
      title: `${lowOpenStrongCtor.name} has hidden intent`,
      message: "Reach was limited by the open, but the people who opened showed strong click intent.",
      evidence: `${formatPercent(calculateOpenRate(lowOpenStrongCtor))} OR with ${formatPercent(calculateClickToOpenRate(lowOpenStrongCtor))} CTOR.`,
      recommendation: "Rework the subject line and send timing before changing the offer or creative body.",
      relatedNewsletterIds: [lowOpenStrongCtor.id],
      relatedCampaignIds: [lowOpenStrongCtor.campaign.id],
      relatedSegmentIds: lowOpenStrongCtor.audience.segmentIds
    });
  }

  return insights;
}

export function getRevenueInsights(newsletters: Newsletter[], campaigns: Campaign[] = [], segments: Segment[] = []): NewsletterInsight[] {
  const insights: NewsletterInsight[] = [];
  const campaignSummaries = campaigns.length ? getCampaignSummaries(campaigns, newsletters) : [];
  const strongestRevenueCampaign = [...campaignSummaries].filter((summary) => summary.sendCount).sort((a, b) => b.revenue - a.revenue)[0];
  const bestRprSegment = segments.length && campaigns.length ? getBestSegment(segments, campaigns, newsletters) : null;
  const averageRevenue = newsletters.reduce((total, newsletter) => total + newsletter.metrics.revenue, 0) / Math.max(newsletters.length, 1);
  const revenueOutlier = [...newsletters].sort((a, b) => b.metrics.revenue - a.metrics.revenue)[0];

  if (strongestRevenueCampaign) {
    insights.push({
      id: `strongest-revenue-campaign-${strongestRevenueCampaign.campaign.id}`,
      type: "strongest_revenue_campaign",
      severity: "positive",
      title: `${strongestRevenueCampaign.campaign.name} is carrying revenue`,
      message: "This campaign generated the strongest total revenue pool for the month.",
      evidence: `${formatCurrency(strongestRevenueCampaign.revenue)} revenue across ${strongestRevenueCampaign.sendCount} sends, with ${formatCurrencyPrecise(strongestRevenueCampaign.revenuePerRecipient)} RPR.`,
      recommendation: "Extract the winning audience and creative pattern before adding more campaign volume.",
      relatedCampaignIds: [strongestRevenueCampaign.campaign.id],
      relatedNewsletterIds: strongestRevenueCampaign.bestNewsletter ? [strongestRevenueCampaign.bestNewsletter.id] : []
    });
  }

  if (bestRprSegment) {
    insights.push({
      id: `best-rpr-segment-${bestRprSegment.segment.id}`,
      type: "best_rpr_segment",
      severity: "positive",
      title: `${bestRprSegment.segment.name} is the highest-quality revenue segment`,
      message: "This segment produces the most revenue per delivered email, so it deserves protected cadence and careful creative fit.",
      evidence: `${formatCurrencyPrecise(bestRprSegment.revenuePerRecipient)} RPR, ${formatCurrency(bestRprSegment.revenue)} revenue, ${formatPercent(bestRprSegment.unsubscribeRate)} unsub rate.`,
      recommendation: `Prioritize ${bestRprSegment.bestCampaign?.campaign.name ?? "its best-fit campaign"} for this segment and avoid broad promotional overlap.`,
      relatedSegmentIds: [bestRprSegment.segment.id],
      relatedCampaignIds: bestRprSegment.bestCampaign ? [bestRprSegment.bestCampaign.campaign.id] : []
    });
  }

  if (revenueOutlier && revenueOutlier.metrics.revenue > averageRevenue * 1.45) {
    insights.push({
      id: `revenue-outlier-${revenueOutlier.id}`,
      type: "revenue_outlier",
      severity: "positive",
      title: `${revenueOutlier.name} is a revenue outlier`,
      message: "The send materially outperformed the average revenue contribution.",
      evidence: `${formatCurrency(revenueOutlier.metrics.revenue, revenueOutlier.metrics.currency)} revenue vs ${formatCurrency(averageRevenue, revenueOutlier.metrics.currency)} average send revenue.`,
      recommendation: "Inspect the segment mix, offer, and creative angle as a reusable launch pattern.",
      relatedNewsletterIds: [revenueOutlier.id],
      relatedCampaignIds: [revenueOutlier.campaign.id],
      relatedSegmentIds: revenueOutlier.audience.segmentIds
    });
  }

  return insights;
}

export function getSaturationInsights(newsletters: Newsletter[], campaigns: Campaign[] = [], segments: Segment[] = []): NewsletterInsight[] {
  const insights: NewsletterInsight[] = [];
  const mostSaturated = segments.length && campaigns.length ? getMostSaturatedSegment(segments, campaigns, newsletters) : null;
  const unsubscribeWarning = [...newsletters]
    .filter((newsletter) => calculateUnsubscribeRate(newsletter) > 0.003)
    .sort((a, b) => calculateUnsubscribeRate(b) - calculateUnsubscribeRate(a))[0];
  const pressureCell = segments.length ? getMostPressuredCell(segments, newsletters) : null;

  if (mostSaturated) {
    insights.push({
      id: `most-saturated-segment-${mostSaturated.segment.id}`,
      type: "most_saturated_segment",
      severity: mostSaturated.saturationLevel === "overexposed" ? "critical" : "warning",
      title: `${mostSaturated.segment.name} is the saturation watchpoint`,
      message: "This audience has the highest average pressure and should be protected before the next campaign cycle.",
      evidence: `${mostSaturated.averageSaturationScore.toFixed(0)}/100 saturation score, ${mostSaturated.sendCount} sends, ${formatPercent(mostSaturated.unsubscribeRate)} unsub rate.`,
      recommendation: "Reduce commercial overlap and use editorial or value-led content before another offer.",
      relatedSegmentIds: [mostSaturated.segment.id],
      relatedCampaignIds: mostSaturated.bestCampaign ? [mostSaturated.bestCampaign.campaign.id] : []
    });
  }

  if (unsubscribeWarning) {
    insights.push({
      id: `unsubscribe-warning-${unsubscribeWarning.id}`,
      type: "unsubscribe_warning",
      severity: "critical",
      title: `${unsubscribeWarning.name} triggered an unsubscribe warning`,
      message: "The send shows audience cost that can undermine future revenue if repeated.",
      evidence: `${formatPercent(calculateUnsubscribeRate(unsubscribeWarning))} unsub rate with ${unsubscribeWarning.metrics.unsubscribes} unsubscribes.`,
      recommendation: "Suppress low-fit or recently touched segments before the next commercial send.",
      relatedNewsletterIds: [unsubscribeWarning.id],
      relatedCampaignIds: [unsubscribeWarning.campaign.id],
      relatedSegmentIds: unsubscribeWarning.audience.segmentIds
    });
  }

  if (pressureCell) {
    insights.push({
      id: `repeated-pressure-${pressureCell.segment.id}-w${pressureCell.week}`,
      type: "repeated_promotional_pressure",
      severity: pressureCell.saturationLevel === "overexposed" ? "critical" : "warning",
      title: `${pressureCell.segment.name} absorbed repeated pressure in ${pressureCell.weekLabel}`,
      message: "Same-segment weekly density is high enough to create fatigue risk.",
      evidence: `${pressureCell.sendCount} sends, ${formatPercent(pressureCell.openRate)} OR, ${formatPercent(pressureCell.unsubscribeRate)} unsub rate.`,
      recommendation: "Pause promotional sends for 72 hours or swap the next touch to editorial content.",
      relatedSegmentIds: [pressureCell.segment.id],
      relatedNewsletterIds: pressureCell.newsletters.map((newsletter) => newsletter.id)
    });
  }

  return insights;
}

export function getSegmentInsights(newsletters: Newsletter[], campaigns: Campaign[] = [], segments: Segment[] = []): NewsletterInsight[] {
  if (!segments.length || !campaigns.length) return [];

  const summaries = getSegmentSummaries(segments, campaigns, newsletters).filter((summary) => summary.sendCount);
  const mismatch = [...summaries]
    .filter((summary) => summary.openRate > 0.36 && summary.clickToOpenRate < 0.085)
    .sort((a, b) => b.openRate - a.openRate)[0];

  if (!mismatch) return [];

  return [{
    id: `segment-intent-gap-${mismatch.segment.id}`,
    type: "segment_intent_gap",
    severity: "warning",
    title: `${mismatch.segment.name} opens but does not commit`,
    message: "This segment is receptive in the inbox, but the post-open offer or content path is under-converting.",
    evidence: `${formatPercent(mismatch.openRate)} OR vs ${formatPercent(mismatch.clickToOpenRate)} CTOR.`,
    recommendation: "Match CTA, product focus, and lifecycle stage more tightly before increasing send count.",
    relatedSegmentIds: [mismatch.segment.id],
    relatedCampaignIds: mismatch.bestCampaign ? [mismatch.bestCampaign.campaign.id] : []
  }];
}

export function getCampaignInsights(newsletters: Newsletter[], campaigns: Campaign[] = []): NewsletterInsight[] {
  if (!campaigns.length) return [];

  const insights: NewsletterInsight[] = [];
  const weakest = getWeakestCampaign(campaigns, newsletters);
  const decay = getCampaignDecay(campaigns, newsletters);

  if (weakest) {
    insights.push({
      id: `weakest-campaign-${weakest.campaign.id}`,
      type: "weakest_campaign",
      severity: "warning",
      title: `${weakest.campaign.name} is the weakest campaign system`,
      message: "Its blended efficiency trails other campaigns once revenue, click depth, and unsubscribe cost are considered.",
      evidence: `${formatCurrencyPrecise(weakest.revenuePerRecipient)} RPR, ${formatPercent(weakest.clickToOpenRate)} CTOR, ${formatPercent(weakest.unsubscribeRate)} unsub rate.`,
      recommendation: "Reduce send count or rebuild the sequence around the strongest newsletter before extending it.",
      relatedCampaignIds: [weakest.campaign.id],
      relatedNewsletterIds: [weakest.bestNewsletter?.id, weakest.weakestNewsletter?.id].filter(Boolean) as string[]
    });
  }

  if (decay) {
    insights.push({
      id: `campaign-decay-${decay.campaignId}`,
      type: "campaign_decay",
      severity: "warning",
      title: `${decay.campaignName} shows campaign decay`,
      message: "Later sends are losing engagement compared with the first half of the sequence.",
      evidence: `Open rate moved from ${formatPercent(decay.firstOpenRate)} to ${formatPercent(decay.lastOpenRate)}; CTR moved from ${formatPercent(decay.firstClickRate)} to ${formatPercent(decay.lastClickRate)}.`,
      recommendation: "Shorten the sequence or insert a non-commercial reset before the final urgency window.",
      relatedCampaignIds: [decay.campaignId],
      relatedNewsletterIds: decay.newsletterIds
    });
  }

  return insights;
}

export function getRecommendedNextActions(insights: NewsletterInsight[]): RecommendedAction[] {
  const tiers: {
    label: RecommendedAction["priorityLabel"];
    matches: (insight: NewsletterInsight) => boolean;
    fallbackTitle: string;
  }[] = [
    {
      label: "P1 critical action",
      matches: (insight) => insight.severity === "critical",
      fallbackTitle: "Protect the audience"
    },
    {
      label: "P2 opportunity",
      matches: (insight) => insight.severity === "positive",
      fallbackTitle: "Scale the pattern"
    },
    {
      label: "P3 watch item",
      matches: (insight) => insight.severity === "warning" || insight.severity === "neutral",
      fallbackTitle: "Watch the next send"
    }
  ];
  const sorted = [...insights].sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity));
  const used = new Set<string>();

  return tiers.flatMap((tier, index) => {
    const insight = sorted.find((candidate) => tier.matches(candidate) && !used.has(actionDedupeKey(candidate)));
    if (!insight) return [];
    used.add(actionDedupeKey(insight));

    return [{
      id: `action-${tier.label.slice(0, 2).toLowerCase()}-${insight.id ?? insight.type}-${index}`,
      priority: insight.severity,
      priorityLabel: tier.label,
      title: actionTitle(insight) || tier.fallbackTitle,
      action: insight.recommendation,
      evidence: insight.evidence ?? insight.message,
      reason: insight.evidence ?? insight.message,
      affectedArea: getAffectedArea(insight),
      nextScreen: getNextScreen(insight),
      relatedInsightId: insight.id ?? insight.type
    }];
  });
}

export function getBestPerformerInsight(newsletters: Newsletter[]): NewsletterInsight | null {
  return getPerformanceInsights(newsletters).find((insight) => insight.type === "best_newsletter") ?? null;
}

export function getSaturationWarnings(newsletters: Newsletter[]): NewsletterInsight[] {
  return getSaturationInsights(newsletters).filter((insight) => insight.severity === "warning" || insight.severity === "critical");
}

export function getNewsletterDetailInsight(newsletter: Newsletter, newsletters: Newsletter[] = [newsletter]): NewsletterDetailInsight {
  const openRate = calculateOpenRate(newsletter);
  const clickRate = calculateClickRate(newsletter);
  const ctor = calculateClickToOpenRate(newsletter);
  const rpr = calculateRevenuePerRecipient(newsletter);
  const unsubRate = calculateUnsubscribeRate(newsletter);
  const saturation = getNewsletterSaturation(newsletter, newsletters);
  const strong = getNewsletterScore(newsletter) > 20;
  const segmentNotes = newsletter.segmentPerformance
    .map((segment) => {
      const segmentOpenRate = safeDivide(segment.uniqueOpens, segment.delivered);
      const segmentClickRate = safeDivide(segment.uniqueClicks, segment.delivered);
      return `${segment.segmentName}: ${formatPercent(segmentOpenRate)} OR, ${formatPercent(segmentClickRate)} CTR, ${formatCurrency(segment.revenue, newsletter.metrics.currency)} revenue.`;
    })
    .slice(0, 3);

  return {
    summary: strong
      ? `${newsletter.name} worked because ${clean(newsletter.content.creativeAngle)} had enough audience fit to turn opens into revenue.`
      : `${newsletter.name} needs refinement because engagement depth or revenue efficiency lagged the month.`
    ,
    performanceRead: `${formatPercent(openRate)} OR, ${formatPercent(clickRate)} CTR, ${formatPercent(ctor)} CTOR, ${formatCurrencyPrecise(rpr, newsletter.metrics.currency)} RPR, and ${formatPercent(unsubRate)} unsub rate.`,
    segmentNotes,
    saturationDiagnosis: saturation.diagnosis,
    recommendation: saturation.saturationLevel === "overexposed" || saturation.saturationLevel === "saturated"
      ? "Rest overlapping audiences before repeating this message type."
      : strong
        ? `Repeat the ${clean(newsletter.content.creativeAngle)} angle with a small CTA or subject-line test.`
        : "Keep the core lesson, but change the audience, offer clarity, or CTA before scaling."
  };
}

export function getNewsletterSpecificInsights(newsletter: Newsletter, newsletters: Newsletter[] = [newsletter]): NewsletterInsight[] {
  const detail = getNewsletterDetailInsight(newsletter, newsletters);
  const saturation = getNewsletterSaturation(newsletter, newsletters);
  const rateSeverity: NewsletterInsight["severity"] =
    saturation.saturationLevel === "overexposed"
      ? "critical"
      : saturation.saturationLevel === "saturated"
        ? "warning"
        : getNewsletterScore(newsletter) > 20
          ? "positive"
          : "neutral";

  const insights: NewsletterInsight[] = [{
    id: `newsletter-read-${newsletter.id}`,
    type: "newsletter_detail",
    severity: rateSeverity,
    title: "Computed send read",
    message: detail.summary,
    evidence: detail.performanceRead,
    recommendation: detail.recommendation,
    relatedNewsletterIds: [newsletter.id],
    relatedCampaignIds: [newsletter.campaign.id],
    relatedSegmentIds: newsletter.audience.segmentIds
  }];

  if (calculateOpenRate(newsletter) > 0.38 && calculateClickToOpenRate(newsletter) < 0.09) {
    insights.push({
      id: `detail-high-open-low-ctor-${newsletter.id}`,
      type: "high_or_low_ctor",
      severity: "warning",
      title: "Inbox promise outpaced click intent",
      message: "The subject line earned attention, but the opened experience did not create enough action.",
      evidence: `${formatPercent(calculateOpenRate(newsletter))} OR vs ${formatPercent(calculateClickToOpenRate(newsletter))} CTOR.`,
      recommendation: "Keep the inbox framing and tighten the offer hierarchy, CTA, and landing-page continuity.",
      relatedNewsletterIds: [newsletter.id],
      relatedCampaignIds: [newsletter.campaign.id],
      relatedSegmentIds: newsletter.audience.segmentIds
    });
  }

  if (calculateUnsubscribeRate(newsletter) > 0.003 || saturation.saturationLevel === "overexposed") {
    insights.push({
      id: `detail-pressure-${newsletter.id}`,
      type: "send_pressure",
      severity: saturation.saturationLevel === "overexposed" ? "critical" : "warning",
      title: "Audience cost needs attention",
      message: saturation.diagnosis,
      evidence: `${saturation.sendPressure7d} same-segment sends in 7 days with ${formatPercent(calculateUnsubscribeRate(newsletter))} unsub rate.`,
      recommendation: "Pause overlapping promotional touches or switch the next message to editorial/value-led content.",
      relatedNewsletterIds: [newsletter.id],
      relatedCampaignIds: [newsletter.campaign.id],
      relatedSegmentIds: newsletter.audience.segmentIds
    });
  }

  return insights.slice(0, 4);
}

export function getCampaignTakeaway(summary: CampaignSummary): string {
  if (!summary.sendCount) return "No sends were recorded for this campaign in the selected month.";

  if (summary.saturationLevel === "overexposed" || summary.saturationLevel === "saturated") {
    return `${summary.campaign.name} is producing ${formatCurrencyPrecise(summary.revenuePerRecipient)} RPR, but pressure is the constraint. Keep the strongest creative and reduce overlap before the next push.`;
  }

  if (summary.bestNewsletter && summary.bestNewsletter.id !== summary.weakestNewsletter?.id && summary.revenuePerRecipient > 0.18) {
    return `${summary.bestNewsletter.name} is the repeatable pattern. Use its ${clean(summary.bestNewsletter.content.creativeAngle)} angle while cutting the weaker send mechanics.`;
  }

  if (summary.clickToOpenRate < 0.09 && summary.openRate > 0.35) {
    return "The campaign earns attention but needs a stronger post-open path: sharpen offer hierarchy, CTA clarity, and landing continuity.";
  }

  if (summary.openRate < 0.32) {
    return "The campaign needs fresher inbox framing before more volume. Test subject promise and sender timing before scaling.";
  }

  return "Performance is balanced enough to keep in rotation; look for one creative angle to scale and one audience pocket to rest.";
}

export function getSegmentTakeaway(summary: SegmentSummary): string {
  if (!summary.sendCount) return "No segment-level sends were recorded for this segment in the selected month.";

  if (summary.saturationLevel === "overexposed" || summary.saturationLevel === "saturated") {
    return `${summary.segment.name} is showing pressure. Protect the list with fewer commercial sends and use editorial recovery before the next offer.`;
  }

  if (summary.revenuePerRecipient > 0.22 && summary.unsubscribeRate < 0.002) {
    return `${summary.segment.name} is a quality revenue pocket. Scale carefully through ${summary.bestCampaign?.campaign.name ?? "the best-fit campaign"} rather than broad sends.`;
  }

  if (summary.clickToOpenRate < 0.08 && summary.openRate > 0.36) {
    return `${summary.segment.name} opens, but intent is thin. Match the CTA and product focus more tightly to lifecycle stage.`;
  }

  if (summary.unsubscribeRate > 0.003) {
    return `${summary.segment.name} is sensitive to cadence. Suppress lower-fit campaigns and give this audience more space between offers.`;
  }

  return `${summary.segment.name} is stable. Use ${summary.bestCampaign?.campaign.name ?? "the top campaign"} as the reference for the next test.`;
}

export function getFatigueDiagnosis(cell: SegmentWeeklySaturation): string {
  if (!cell.sendCount) {
    return `${cell.segment.name} did not receive any sends in ${cell.weekLabel}. No saturation signal is available for this week.`;
  }

  const signals: string[] = [];
  if (cell.sendCount >= 3) signals.push(`${cell.sendCount} sends landed in the same week`);
  if (cell.previousOpenRate !== null && cell.previousOpenRate - cell.openRate > 0.05) signals.push("open rate declined");
  if (cell.previousClickRate !== null && cell.previousClickRate - cell.clickRate > 0.01) signals.push("CTR declined");
  if (cell.previousClickToOpenRate !== null && cell.previousClickToOpenRate - cell.clickToOpenRate > 0.02) signals.push("CTOR declined");
  if (cell.previousUnsubscribeRate !== null && cell.unsubscribeRate - cell.previousUnsubscribeRate > 0.001) signals.push("unsubscribe rate increased");
  if (cell.revenuePerRecipient < 0.08) signals.push("revenue per recipient is weak");
  if (cell.repeatedCampaignType) signals.push(`repeated ${clean(cell.repeatedCampaignType)} pressure`);
  if (cell.repeatedCreativeAngle) signals.push(`repeated ${clean(cell.repeatedCreativeAngle)} angle`);

  if (!signals.length) {
    return `${cell.segment.name} received ${cell.sendCount} send${cell.sendCount === 1 ? "" : "s"} in ${cell.weekLabel}. Engagement and unsubscribe signals remain within a healthy range.`;
  }

  return `${cell.segment.name} received ${cell.sendCount} send${cell.sendCount === 1 ? "" : "s"} in ${cell.weekLabel}. ${sentenceList(signals)}. Likely cause: ${getLikelyCause(cell)}.`;
}

export function getRecommendedActionForSaturation(cell: SegmentWeeklySaturation): string {
  if (!cell.sendCount) return "Keep this audience out of recovery logic unless later weeks show new pressure.";

  if (cell.saturationLevel === "overexposed") {
    return "Pause promotional sends to this segment for 72 hours or switch to editorial/value-led content.";
  }

  if (cell.saturationLevel === "saturated") {
    return "Suppress overlapping commercial campaigns next week and send only one high-fit message.";
  }

  if (cell.saturationLevel === "watch") {
    return "Keep cadence light, vary the creative angle, and monitor unsubscribe rate before the next push.";
  }

  return "Maintain the current cadence and use this week as a healthy benchmark.";
}

function getWorstNewsletter(newsletters: Newsletter[]): Newsletter | null {
  if (!newsletters.length) return null;
  return [...newsletters].sort((a, b) => getNewsletterScore(a) - getNewsletterScore(b))[0];
}

function getMostPressuredCell(segments: Segment[], newsletters: Newsletter[]): SegmentWeeklySaturation | null {
  const cells = getSegmentWeeklySaturation(segments, newsletters).rows.flatMap((row) => row.cells).filter((cell) => cell.sendCount > 0);
  if (!cells.length) return null;
  return [...cells].sort((a, b) => b.saturationScore - a.saturationScore)[0];
}

function getCampaignDecay(campaigns: Campaign[], newsletters: Newsletter[]) {
  for (const campaign of campaigns) {
    const sends = newsletters
      .filter((newsletter) => newsletter.campaign.id === campaign.id)
      .sort((a, b) => a.timing.sentAt.localeCompare(b.timing.sentAt));
    if (sends.length < 3) continue;

    const midpoint = Math.ceil(sends.length / 2);
    const first = getAggregateRates(sends.slice(0, midpoint));
    const last = getAggregateRates(sends.slice(midpoint));

    if (first.openRate - last.openRate > 0.05 || first.clickRate - last.clickRate > 0.012) {
      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        firstOpenRate: first.openRate,
        lastOpenRate: last.openRate,
        firstClickRate: first.clickRate,
        lastClickRate: last.clickRate,
        newsletterIds: sends.map((newsletter) => newsletter.id)
      };
    }
  }

  return null;
}

function getAggregateRates(newsletters: Newsletter[]) {
  const delivered = newsletters.reduce((total, newsletter) => total + newsletter.metrics.delivered, 0);
  const opens = newsletters.reduce((total, newsletter) => total + newsletter.metrics.uniqueOpens, 0);
  const clicks = newsletters.reduce((total, newsletter) => total + newsletter.metrics.uniqueClicks, 0);

  return {
    openRate: safeDivide(opens, delivered),
    clickRate: safeDivide(clicks, delivered)
  };
}

function uniqueInsights(insights: NewsletterInsight[]): NewsletterInsight[] {
  const seen = new Set<string>();
  return insights.filter((insight) => {
    const key = insight.id ?? `${insight.type}-${insight.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function severityWeight(severity: NewsletterInsight["severity"]): number {
  return { critical: 4, warning: 3, positive: 2, neutral: 1 }[severity];
}

function actionTitle(insight: NewsletterInsight): string {
  if (insight.severity === "critical") return "Protect the audience";
  if (insight.severity === "warning") return "Adjust the next send";
  if (insight.severity === "positive") return "Scale the proven pattern";
  return "Inspect the signal";
}

function actionDedupeKey(insight: NewsletterInsight): string {
  const relatedId = insight.relatedSegmentIds?.[0] ?? insight.relatedCampaignIds?.[0] ?? insight.relatedNewsletterIds?.[0] ?? insight.type;
  return `${insight.severity}-${relatedId}`;
}

function getAffectedArea(insight: NewsletterInsight): string {
  if (insight.relatedSegmentIds?.[0]) return `Segment: ${insight.relatedSegmentIds[0]}`;
  if (insight.relatedNewsletterIds?.[0]) return `Newsletter: ${insight.relatedNewsletterIds[0]}`;
  if (insight.relatedCampaignIds?.[0]) return `Campaign: ${insight.relatedCampaignIds[0]}`;
  return "Monthly portfolio";
}

function getNextScreen(insight: NewsletterInsight): RecommendedAction["nextScreen"] {
  if (insight.relatedSegmentIds?.[0]) return "Audience";
  if (insight.relatedNewsletterIds?.[0]) return "Newsletters";
  if (insight.relatedCampaignIds?.[0]) return "Campaigns";
  return "Insights";
}

function getLikelyCause(cell: SegmentWeeklySaturation): string {
  if (cell.repeatedCampaignType === "promotion" || cell.repeatedCreativeAngle === "discount" || cell.repeatedCreativeAngle === "scarcity") {
    return "repeated promotional pressure";
  }

  if (cell.sendCount >= 3) return "send density is outpacing audience intent";
  if (cell.repeatedCampaignType) return `repeated ${clean(cell.repeatedCampaignType)} messaging`;
  if (cell.revenuePerRecipient < 0.08) return "low commercial fit for the segment";
  return "audience fatigue or message mismatch";
}

function sentenceList(items: string[]): string {
  const [first, ...rest] = items;
  return `${first.charAt(0).toUpperCase()}${first.slice(1)}${rest.length ? ` while ${rest.join(", ")}` : ""}`;
}

function clean(value: string): string {
  return value.replaceAll("_", " ");
}

function safeDivide(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return numerator / denominator;
}
