import type { Campaign, Newsletter } from "@/lib/newsletterTypes";
import { getBestCampaign, getCampaignSummaries, getWeakestCampaign } from "@/lib/newsletterMetrics";
import { getCampaignTakeaway } from "@/lib/newsletterInsights";
import { evaluateActualsAgainstTargets, resolveTargets } from "@/lib/targetEvaluation";
import { buildCampaignPerformanceExportRows } from "@/lib/export/exportData";
import { downloadCsv } from "@/lib/export/exportCsv";
import { buildExportFilename } from "@/lib/export/exportFilename";
import type { TargetSettings } from "@/lib/targetTypes";
import { formatCurrency, formatCurrencyPrecise, formatNumber, formatPercent } from "@/lib/formatters";
import { CampaignColorTag, hexToRgba } from "./CampaignColorTag";
import { StatusBadge } from "./StatusBadge";
import { TargetStatusBadge } from "./TargetStatusBadge";

interface CampaignPerformanceProps {
  month: string;
  sourceLabel: string;
  campaigns: Campaign[];
  newsletters: Newsletter[];
  currency: string;
  targetSettings: TargetSettings;
}

export function CampaignPerformance({ month, sourceLabel, campaigns, newsletters, currency, targetSettings }: CampaignPerformanceProps) {
  const summaries = getCampaignSummaries(campaigns, newsletters);
  const bestCampaign = getBestCampaign(campaigns, newsletters);
  const weakestCampaign = getWeakestCampaign(campaigns, newsletters);
  const totalRevenue = summaries.reduce((total, summary) => total + summary.revenue, 0);

  return (
    <section className="rounded-xl border border-line bg-card p-5 shadow-soft md:p-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Campaign performance</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-ink">Campaigns as strategic systems</h2>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-2 xl:min-w-[520px]">
          <SummaryPill label="Best campaign" value={bestCampaign?.campaign.name ?? "n/a"} />
          <SummaryPill label="Weakest campaign" value={weakestCampaign?.campaign.name ?? "n/a"} />
          <button
            type="button"
            className="rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-ink sm:col-span-2 sm:justify-self-end"
            onClick={() => downloadCsv(
              buildExportFilename({ source: sourceLabel, month, descriptor: "campaign-performance", extension: "csv" }),
              buildCampaignPerformanceExportRows(campaigns, newsletters, targetSettings)
            )}
          >
            Export campaign CSV
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {summaries.map((summary) => {
          const targetComparisons = evaluateActualsAgainstTargets({
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
          const recommendation = getCampaignRecommendation(summary.saturationLevel, targetComparisons);
          const contribution = totalRevenue ? summary.revenue / totalRevenue : 0;
          const targetSummary = getCampaignTargetSummary(targetComparisons);

          return (
            <article
              key={summary.campaign.id}
              className="rounded-lg border bg-slate-50/80 p-5"
              style={{
                borderColor: hexToRgba(summary.campaign.color, 0.24),
                boxShadow: `inset 4px 0 0 ${hexToRgba(summary.campaign.color, 0.7)}`
              }}
            >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <CampaignColorTag color={summary.campaign.color} label={summary.campaign.name} type={summary.campaign.type} />
                    <h3 className="mt-3 text-xl font-semibold tracking-normal text-ink">{summary.campaign.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{summary.campaign.goal}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge severity={recommendation === "Repeat" ? "positive" : recommendation === "Pause" ? "critical" : "warning"} label={recommendation} />
                    <StatusBadge level={summary.saturationLevel} />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Metric label="Revenue" value={formatCurrency(summary.revenue, currency)} />
                  <Metric label="Contribution" value={formatPercent(contribution)} />
                  <Metric label="Pressure score" value={`${summary.averageSaturationScore.toFixed(0)}/100`} />
                  <Metric label="Sends" value={String(summary.sendCount)} />
                  <Metric label="CTOR" value={formatPercent(summary.clickToOpenRate)} />
                  <Metric label="RPR" value={formatCurrencyPrecise(summary.revenuePerRecipient, currency)} />
                  <Metric label="Sent" value={formatNumber(summary.totalSent)} />
                  <Metric label="Unsub" value={formatPercent(summary.unsubscribeRate)} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {targetSummary.map((comparison) => (
                    <TargetStatusBadge key={comparison.key} comparison={comparison} currency={currency} />
                  ))}
                </div>

                <div className="mt-5 grid gap-3 border-t border-line pt-4 text-sm md:grid-cols-2">
                  <p className="text-muted">Best send: <span className="font-medium text-ink">{summary.bestNewsletter?.name ?? "n/a"}</span></p>
                  <p className="text-muted">Weakest send: <span className="font-medium text-ink">{summary.weakestNewsletter?.name ?? "n/a"}</span></p>
                </div>

                <p className="mt-4 rounded-lg border border-line bg-card p-4 text-sm leading-6 text-ink">{getCampaignTakeaway(summary)}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function getCampaignRecommendation(
  level: ReturnType<typeof getCampaignSummaries>[number]["saturationLevel"],
  comparisons: ReturnType<typeof evaluateActualsAgainstTargets>
): "Repeat" | "Repair" | "Pause" {
  if (level === "overexposed" || comparisons.pressureScore?.status === "Off track") return "Pause";
  if (
    comparisons.monthlyRevenue?.status === "Off track" ||
    comparisons.revenuePerRecipient?.status === "Off track" ||
    comparisons.clickToOpenRate?.status === "Off track"
  ) {
    return "Repair";
  }
  return "Repeat";
}

function getCampaignTargetSummary(comparisons: ReturnType<typeof evaluateActualsAgainstTargets>) {
  const keys = ["monthlyRevenue", "revenuePerRecipient", "clickToOpenRate", "pressureScore"] as const;
  const exceptions = keys
    .flatMap((key) => {
      const comparison = comparisons[key];
      return comparison && comparison.status !== "On track" ? [comparison] : [];
    })
    .slice(0, 2);

  if (exceptions.length) return exceptions;

  return keys.flatMap((key) => {
    const comparison = comparisons[key];
    return comparison ? [comparison] : [];
  }).slice(0, 2);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-card p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-slate-50/80 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 font-semibold text-ink">{value}</p>
    </div>
  );
}
