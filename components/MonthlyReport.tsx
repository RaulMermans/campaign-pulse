"use client";

import type { ReactNode } from "react";
import type { Campaign, Newsletter, Segment } from "@/lib/newsletterTypes";
import {
  getBestCampaign,
  getBestNewsletter,
  getBestSegment,
  getMonthlySummary,
  getMostSaturatedSegment
} from "@/lib/newsletterMetrics";
import { getGlobalInsights, getRecommendedNextActions } from "@/lib/newsletterInsights";
import { evaluateActualsAgainstTargets, resolveTargets } from "@/lib/targetEvaluation";
import type { TargetSettings } from "@/lib/targetTypes";
import { formatCurrency, formatCurrencyPrecise, formatMonth, formatNumber, formatPercent } from "@/lib/formatters";
import { StatusBadge } from "./StatusBadge";
import { TargetStatusBadge } from "./TargetStatusBadge";

interface MonthlyReportProps {
  month: string;
  currency: string;
  campaigns: Campaign[];
  segments: Segment[];
  newsletters: Newsletter[];
  targetSettings: TargetSettings;
}

export function MonthlyReport({ month, currency, campaigns, segments, newsletters, targetSettings }: MonthlyReportProps) {
  const summary = getMonthlySummary(newsletters);
  const bestNewsletter = getBestNewsletter(newsletters);
  const strongestCampaign = getBestCampaign(campaigns, newsletters);
  const mostValuableSegment = getBestSegment(segments, campaigns, newsletters);
  const mostSaturatedSegment = getMostSaturatedSegment(segments, campaigns, newsletters);
  const insights = getGlobalInsights(newsletters, campaigns, segments);
  const actions = getRecommendedNextActions(insights);
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
  const targetStrip = getReportTargetStrip(targetComparisons);
  const targetInterpretation = getTargetInterpretation(targetStrip);

  function printReport() {
    document.getElementById("monthly-report")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => window.print(), 250);
  }

  return (
    <section id="monthly-report" className="rounded-xl border border-line bg-[#fffefb] p-5 shadow-soft md:p-8 print:border-0 print:bg-white print:p-0 print:shadow-none">
      <div className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-start lg:justify-between print:pb-4">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Executive memo</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal text-ink md:text-4xl">
            {formatMonth(month)} strategic memo
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            A print-ready readout of the month: what performed, where pressure is building, and what should happen next.
          </p>
        </div>
        <button
          type="button"
          onClick={printReport}
          className="no-print inline-flex w-fit items-center justify-center rounded-md border border-ink bg-ink px-4 py-2 text-sm font-semibold text-card transition hover:-translate-y-0.5 hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-ink/30"
        >
          Print report
        </button>
      </div>

      <div className="mt-6 grid gap-3 border-b border-line pb-5 md:grid-cols-4 print:mt-4 print:pb-4">
        <ReportMetric label="Revenue" value={formatCurrency(summary.revenue, currency)} />
        <ReportMetric label="Delivered" value={formatNumber(summary.totalDelivered)} />
        <ReportMetric label="Click depth" value={formatPercent(summary.clickToOpenRate)} />
        <ReportMetric label="Pressure" value={summary.averageSaturationScore.toFixed(0)} badge={<StatusBadge level={summary.saturationLevel} />} />
      </div>

      <div className="mt-5 rounded-lg border border-line bg-[#f7f8f3] p-4 print:break-inside-avoid">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm font-semibold leading-6 text-ink">{targetInterpretation}</p>
          <div className="flex flex-wrap gap-2">
            {targetStrip.map((comparison) => (
              <TargetStatusBadge key={comparison.key} comparison={comparison} currency={currency} compact />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[1fr_1fr] print:mt-5 print:gap-4">
        <ReportBlock title="Executive Summary" emphasis>
          <p>
            {formatMonth(month)} generated <strong>{formatCurrency(summary.revenue, currency)}</strong> from{" "}
            <strong>{formatNumber(summary.totalDelivered)}</strong> delivered emails. Revenue quality is strongest where{" "}
            <strong>{bestNewsletter?.name ?? "the top newsletter"}</strong> and{" "}
            <strong>{mostValuableSegment?.segment.name ?? "the best segment"}</strong> overlap.
          </p>
          <p>
            The operating constraint is audience pressure: <strong>{mostSaturatedSegment?.segment.name ?? "the highest-pressure segment"}</strong>{" "}
            should be protected before the next commercial push.
          </p>
        </ReportBlock>

        <ReportBlock title="What Worked">
          <dl className="grid gap-3 sm:grid-cols-2">
            <MemoStat label="Best newsletter" value={bestNewsletter?.name ?? "n/a"} note={bestNewsletter ? `${formatCurrency(bestNewsletter.metrics.revenue, currency)} revenue` : "No sends"} />
            <MemoStat label="Strongest campaign" value={strongestCampaign?.campaign.name ?? "n/a"} note={strongestCampaign ? `${formatCurrencyPrecise(strongestCampaign.revenuePerRecipient, currency)} RPR` : "No campaign data"} />
            <MemoStat label="Best segment" value={mostValuableSegment?.segment.name ?? "n/a"} note={mostValuableSegment ? `${formatCurrencyPrecise(mostValuableSegment.revenuePerRecipient, currency)} RPR` : "No segment data"} />
            <MemoStat label="Reusable pattern" value={bestNewsletter?.content.creativeAngle.replaceAll("_", " ") ?? "n/a"} note="Creative angle to test again" />
          </dl>
        </ReportBlock>

        <ReportBlock title="What Underperformed">
          <p>
            <strong>{strongestCampaign?.weakestNewsletter?.name ?? "The weakest send"}</strong> should not be scaled without a change to audience fit, offer clarity, or creative hierarchy.
          </p>
          <p>
            If the month shows campaign decay, shorten the sequence or insert a non-commercial reset before the final urgency window.
          </p>
        </ReportBlock>

        <ReportBlock title="Audience Risk">
          <p>
            <strong>{mostSaturatedSegment?.segment.name ?? "The most saturated segment"}</strong> is the primary watchpoint
            {mostSaturatedSegment
              ? ` at ${mostSaturatedSegment.averageSaturationScore.toFixed(0)}/100 average pressure and ${formatPercent(mostSaturatedSegment.unsubscribeRate)} unsubscribe rate.`
              : "."}
          </p>
          <p>
            Keep the next send plan focused on fewer commercial overlaps, more creative variety, and suppression of recently over-touched cohorts.
          </p>
        </ReportBlock>

        <ReportBlock title="Target Performance">
          <p>{targetInterpretation}</p>
          <p>
            The compact strip above uses browser-saved global targets for revenue, CTOR, RPR, and pressure.
          </p>
        </ReportBlock>

        <ReportBlock title="Recommended Operating Plan" emphasis>
          <ol className="space-y-3">
            {actions.map((action) => (
              <li key={action.id} className="rounded-lg border border-line bg-white p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-line bg-slate-50 px-2.5 py-1 text-xs font-semibold text-muted">{action.priorityLabel}</span>
                  <StatusBadge severity={action.priority} />
                </div>
                <p className="font-semibold text-ink">{action.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{action.action}</p>
                <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">{action.affectedArea}. Next screen: {action.nextScreen}</p>
              </li>
            ))}
          </ol>
        </ReportBlock>

        <ReportBlock title="Appendix / Supporting Metrics">
          <div className="grid gap-3 sm:grid-cols-2">
            <ReportMetric label="Total sent" value={formatNumber(summary.totalSent)} />
            <ReportMetric label="Avg OR" value={formatPercent(summary.openRate)} />
            <ReportMetric label="Avg CTR" value={formatPercent(summary.clickRate)} />
            <ReportMetric label="RPR" value={formatCurrencyPrecise(summary.revenuePerRecipient, currency)} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ReportMetric label="Best newsletter" value={bestNewsletter?.name ?? "n/a"} />
            <MemoStat label="Most saturated segment" value={mostSaturatedSegment?.segment.name ?? "n/a"} note={mostSaturatedSegment ? `${mostSaturatedSegment.averageSaturationScore.toFixed(0)}/100 pressure` : "No segment data"} />
          </div>
        </ReportBlock>
      </div>

      <div className="mt-6 rounded-lg border border-line bg-[#f7f8f3] p-5 print:mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Evidence notes</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {insights.slice(0, 3).map((insight) => (
            <article key={insight.id ?? insight.title} className="rounded-lg border border-line bg-card p-4">
              <StatusBadge severity={insight.severity} />
              <h3 className="mt-3 text-sm font-semibold text-ink">{insight.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted">{insight.evidence ?? insight.message}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReportMetric({ label, value, badge }: { label: string; value: string; badge?: ReactNode }) {
  return (
    <article className="min-w-0 rounded-md border border-line bg-white p-4 print:p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="truncate text-xl font-semibold tracking-normal text-ink">{value}</p>
        {badge}
      </div>
    </article>
  );
}

function ReportBlock({ title, children, emphasis = false }: { title: string; children: ReactNode; emphasis?: boolean }) {
  return (
    <article className={`rounded-lg border p-5 text-sm leading-6 text-muted print:break-inside-avoid ${emphasis ? "border-ink/20 bg-white shadow-sm" : "border-line bg-[#fbfbf8]"}`}>
      <h3 className="mb-3 text-lg font-semibold tracking-normal text-ink">{title}</h3>
      <div className="space-y-3">{children}</div>
    </article>
  );
}

function MemoStat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
      <dd className="mt-1 text-xs text-muted">{note}</dd>
    </div>
  );
}

function getReportTargetStrip(comparisons: ReturnType<typeof evaluateActualsAgainstTargets>) {
  return (["monthlyRevenue", "clickToOpenRate", "revenuePerRecipient", "pressureScore"] as const).flatMap((key) => {
    const comparison = comparisons[key];
    return comparison ? [comparison] : [];
  });
}

function getTargetInterpretation(comparisons: ReturnType<typeof getReportTargetStrip>): string {
  const offTrack = comparisons.filter((comparison) => comparison.status === "Off track");
  const watch = comparisons.filter((comparison) => comparison.status === "Watch");
  if (offTrack.length) return `${offTrack.map((comparison) => comparison.label).join(", ")} need repair before the next campaign cycle.`;
  if (watch.length) return `${watch.map((comparison) => comparison.label).join(", ")} are close enough to protect, not blindly scale.`;
  return "Revenue quality and pressure are inside the current target guardrails.";
}
