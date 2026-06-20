import type { AudienceMember } from "../audienceTypes";
import { getAudienceMapPoints, getSegmentMovement } from "../audienceMetrics";
import type { NormalizedDataset } from "../adapters/normalizedSchema";
import type { RowDiagnostic } from "../adapters/csvExportAdapter";
import type { ImportValidationIssue } from "../importTypes";
import { getGlobalInsights, getRecommendedNextActions } from "../newsletterInsights";
import {
  getBestCampaign,
  getBestNewsletter,
  getBestSegment,
  getCampaignSummaries,
  getMonthlySummary,
  getMostSaturatedSegment,
  getNewsletterRank,
  getNewsletterRates,
  getSegmentSummaries
} from "../newsletterMetrics";
import { getNewsletterSaturation } from "../newsletterSaturation";
import type { Campaign, Newsletter, Segment } from "../newsletterTypes";
import { evaluateActualsAgainstTargets, resolveTargets } from "../targetEvaluation";
import type { TargetSettings } from "../targetTypes";
import type { CsvRow } from "./exportCsv";

export function buildNewsletterRankingExportRows(
  newsletters: Newsletter[],
  targetSettings: TargetSettings
): CsvRow[] {
  const globalTargets = resolveTargets(targetSettings, "global");

  return [...newsletters]
    .sort((a, b) => getNewsletterRank(a, newsletters) - getNewsletterRank(b, newsletters))
    .map((newsletter) => {
      const rates = getNewsletterRates(newsletter);
      const comparisons = evaluateActualsAgainstTargets({
        actuals: {
          openRate: rates.openRate,
          clickRate: rates.clickRate,
          clickToOpenRate: rates.clickToOpenRate,
          revenuePerRecipient: rates.revenuePerRecipient
        },
        targets: globalTargets
      });
      const saturation = getNewsletterSaturation(newsletter, newsletters);

      return {
        rank: getNewsletterRank(newsletter, newsletters),
        newsletterId: newsletter.id,
        newsletter: newsletter.name,
        sentAt: newsletter.timing.sentAt,
        campaign: newsletter.campaign.name,
        subjectLine: newsletter.content.subjectLine,
        delivered: newsletter.metrics.delivered,
        revenue: newsletter.metrics.revenue,
        currency: newsletter.metrics.currency,
        openRate: rates.openRate,
        clickRate: rates.clickRate,
        clickToOpenRate: rates.clickToOpenRate,
        conversionRate: rates.conversionRate,
        revenuePerRecipient: rates.revenuePerRecipient,
        unsubscribeRate: rates.unsubscribeRate,
        saturationScore: saturation.saturationScore,
        saturationLevel: saturation.saturationLevel,
        openRateStatus: comparisons.openRate?.status,
        clickRateStatus: comparisons.clickRate?.status,
        clickToOpenRateStatus: comparisons.clickToOpenRate?.status,
        revenuePerRecipientStatus: comparisons.revenuePerRecipient?.status
      };
    });
}

export function buildSegmentStatusExportRows({
  segments,
  campaigns,
  newsletters,
  audienceMembers,
  targetSettings
}: {
  segments: Segment[];
  campaigns: Campaign[];
  newsletters: Newsletter[];
  audienceMembers: AudienceMember[];
  targetSettings: TargetSettings;
}): CsvRow[] {
  const summaries = getSegmentSummaries(segments, campaigns, newsletters).filter((summary) => summary.sendCount > 0);
  const pointsById = new Map(
    getAudienceMapPoints(segments, campaigns, newsletters, audienceMembers).map((point) => [point.segmentId, point])
  );

  return summaries.map((summary) => {
    const point = pointsById.get(summary.segment.id);
    const movement = getSegmentMovement(summary.segment.id, newsletters, audienceMembers);
    const comparisons = evaluateActualsAgainstTargets({
      actuals: {
        monthlyRevenue: summary.revenue,
        openRate: summary.openRate,
        clickRate: summary.clickRate,
        clickToOpenRate: summary.clickToOpenRate,
        conversionRate: summary.conversionRate,
        revenuePerRecipient: summary.revenuePerRecipient,
        unsubscribeRate: summary.unsubscribeRate,
        sendsPerSegmentWeek: getMaxSegmentWeeklySends(summary.segment.id, newsletters),
        pressureScore: point?.pressure ?? summary.averageSaturationScore
      },
      targets: resolveTargets(targetSettings, "segment", summary.segment.id)
    });

    return {
      segmentId: summary.segment.id,
      segment: summary.segment.name,
      lifecycleStage: summary.segment.lifecycleStage,
      valueTier: summary.segment.valueTier,
      movement: movement.label,
      movementExplanation: movement.explanation,
      decision: point?.decisionLabel ?? "",
      sends: summary.sendCount,
      delivered: summary.totalDelivered,
      revenue: summary.revenue,
      revenuePerRecipient: summary.revenuePerRecipient,
      openRate: summary.openRate,
      clickRate: summary.clickRate,
      clickToOpenRate: summary.clickToOpenRate,
      conversionRate: summary.conversionRate,
      unsubscribeRate: summary.unsubscribeRate,
      pressureScore: point?.pressure ?? summary.averageSaturationScore,
      saturationLevel: summary.saturationLevel,
      revenueStatus: comparisons.monthlyRevenue?.status,
      revenuePerRecipientStatus: comparisons.revenuePerRecipient?.status,
      openRateStatus: comparisons.openRate?.status,
      clickToOpenRateStatus: comparisons.clickToOpenRate?.status,
      unsubscribeRateStatus: comparisons.unsubscribeRate?.status,
      pressureStatus: comparisons.pressureScore?.status
    };
  });
}

export function buildCampaignPerformanceExportRows(
  campaigns: Campaign[],
  newsletters: Newsletter[],
  targetSettings: TargetSettings
): CsvRow[] {
  const summaries = getCampaignSummaries(campaigns, newsletters).filter((summary) => summary.sendCount > 0);
  const totalRevenue = summaries.reduce((total, summary) => total + summary.revenue, 0);

  return summaries.map((summary) => {
    const comparisons = evaluateActualsAgainstTargets({
      actuals: {
        monthlyRevenue: summary.revenue,
        openRate: summary.openRate,
        clickRate: summary.clickRate,
        clickToOpenRate: summary.clickToOpenRate,
        conversionRate: summary.conversionRate,
        revenuePerRecipient: summary.revenuePerRecipient,
        unsubscribeRate: summary.unsubscribeRate,
        pressureScore: summary.averageSaturationScore
      },
      targets: resolveTargets(targetSettings, "campaign", summary.campaign.id)
    });

    return {
      campaignId: summary.campaign.id,
      campaign: summary.campaign.name,
      type: summary.campaign.type,
      goal: summary.campaign.goal,
      sends: summary.sendCount,
      delivered: summary.totalDelivered,
      revenue: summary.revenue,
      revenueContribution: totalRevenue ? summary.revenue / totalRevenue : 0,
      openRate: summary.openRate,
      clickRate: summary.clickRate,
      clickToOpenRate: summary.clickToOpenRate,
      conversionRate: summary.conversionRate,
      revenuePerRecipient: summary.revenuePerRecipient,
      unsubscribeRate: summary.unsubscribeRate,
      pressureScore: summary.averageSaturationScore,
      saturationLevel: summary.saturationLevel,
      bestNewsletter: summary.bestNewsletter?.name ?? "",
      weakestNewsletter: summary.weakestNewsletter?.name ?? "",
      revenueStatus: comparisons.monthlyRevenue?.status,
      revenuePerRecipientStatus: comparisons.revenuePerRecipient?.status,
      clickToOpenRateStatus: comparisons.clickToOpenRate?.status,
      pressureStatus: comparisons.pressureScore?.status
    };
  });
}

export function buildMonthlyMemoExportData({
  month,
  currency,
  campaigns,
  segments,
  newsletters,
  targetSettings,
  sourceLabel
}: {
  month: string;
  currency: string;
  campaigns: Campaign[];
  segments: Segment[];
  newsletters: Newsletter[];
  targetSettings: TargetSettings;
  sourceLabel: string;
}) {
  const summary = getMonthlySummary(newsletters);
  const insights = getGlobalInsights(newsletters, campaigns, segments);
  const targetComparisons = evaluateActualsAgainstTargets({
    actuals: {
      monthlyRevenue: summary.revenue,
      openRate: summary.openRate,
      clickRate: summary.clickRate,
      clickToOpenRate: summary.clickToOpenRate,
      conversionRate: summary.conversionRate,
      revenuePerRecipient: summary.revenuePerRecipient,
      unsubscribeRate: summary.unsubscribeRate,
      spamRate: summary.spamComplaintRate,
      pressureScore: summary.averageSaturationScore
    },
    targets: resolveTargets(targetSettings, "global")
  });

  return {
    schemaVersion: "campaign-pulse-monthly-memo-v1",
    month,
    currency,
    source: sourceLabel,
    summary,
    highlights: {
      bestNewsletter: getBestNewsletter(newsletters)?.name ?? null,
      strongestCampaign: getBestCampaign(campaigns, newsletters)?.campaign.name ?? null,
      bestSegment: getBestSegment(segments, campaigns, newsletters)?.segment.name ?? null,
      mostSaturatedSegment: getMostSaturatedSegment(segments, campaigns, newsletters)?.segment.name ?? null
    },
    targetComparisons,
    insights,
    recommendedActions: getRecommendedNextActions(insights)
  };
}

export function buildAdapterValidationExport(dataset: NormalizedDataset) {
  return {
    source: dataset.metadata.source,
    importedAt: dataset.metadata.importedAt,
    recordCounts: dataset.metadata.recordCounts,
    status: dataset.metadata.validation.status,
    errors: dataset.metadata.validation.errors,
    warnings: dataset.metadata.validation.warnings
  };
}

export function buildImportDiagnosticsExport({
  dataset,
  rowDiagnostics,
  importValidationIssues
}: {
  dataset: NormalizedDataset;
  rowDiagnostics: RowDiagnostic[];
  importValidationIssues: ImportValidationIssue[];
}) {
  return {
    source: dataset.metadata.source,
    activeValidation: buildAdapterValidationExport(dataset),
    activeSessionDiagnostics: dataset.metadata.sourceMetadata.importDiagnostics ?? null,
    sampleCsv: summarizeRowDiagnostics(rowDiagnostics),
    intakeSimulation: {
      issueCount: importValidationIssues.length,
      issues: importValidationIssues
    }
  };
}

function summarizeRowDiagnostics(rowDiagnostics: RowDiagnostic[]) {
  return {
    totalRows: rowDiagnostics.length,
    acceptedRows: rowDiagnostics.filter((row) => row.accepted).length,
    rejectedRows: rowDiagnostics.filter((row) => !row.accepted).length,
    rows: rowDiagnostics
  };
}

function getMaxSegmentWeeklySends(segmentId: string, newsletters: Newsletter[]): number {
  const weeklyCounts = newsletters.reduce<Record<string, number>>((counts, newsletter) => {
    if (!newsletter.segmentPerformance.some((performance) => performance.segmentId === segmentId)) return counts;
    const weekKey = `${newsletter.timing.sentAt.slice(0, 7)}-${Math.ceil(new Date(newsletter.timing.sentAt).getDate() / 7)}`;
    counts[weekKey] = (counts[weekKey] ?? 0) + 1;
    return counts;
  }, {});

  return Math.max(0, ...Object.values(weeklyCounts));
}
