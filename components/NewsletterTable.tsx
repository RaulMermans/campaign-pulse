import type { Campaign, Newsletter } from "@/lib/newsletterTypes";
import {
  calculateClickRate,
  calculateClickToOpenRate,
  calculateOpenRate,
  calculateRevenuePerRecipient,
  getNewsletterRank,
  getSendDate
} from "@/lib/newsletterMetrics";
import { getNewsletterSaturation } from "@/lib/newsletterSaturation";
import { evaluateActualsAgainstTargets, resolveTargets } from "@/lib/targetEvaluation";
import type { TargetSettings } from "@/lib/targetTypes";
import { formatCurrency, formatCurrencyPrecise, formatDateLabel, formatPercent } from "@/lib/formatters";
import { CampaignColorTag } from "./CampaignColorTag";
import { StatusBadge } from "./StatusBadge";
import { TargetStatusBadge } from "./TargetStatusBadge";

interface NewsletterTableProps {
  newsletters: Newsletter[];
  campaigns: Campaign[];
  targetSettings: TargetSettings;
  onSelectNewsletter: (newsletter: Newsletter) => void;
}

export function NewsletterTable({ newsletters, campaigns, targetSettings, onSelectNewsletter }: NewsletterTableProps) {
  const sorted = [...newsletters].sort((a, b) => a.timing.sentAt.localeCompare(b.timing.sentAt));
  const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
  const globalTargets = resolveTargets(targetSettings, "global");

  return (
    <section className="rounded-xl border border-line bg-card p-5 shadow-soft md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Newsletter audit layer</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-ink">All sends</h2>
        </div>
        <p className="text-sm text-muted">Sorted chronologically. Select a row for the same detail read as the calendar.</p>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-line">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-left text-sm">
            <thead className="bg-white text-xs uppercase tracking-[0.16em] text-muted">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Newsletter</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">RPR</th>
                <th className="px-4 py-3">Engagement</th>
                <th className="px-4 py-3">Targets</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-card">
              {sorted.map((newsletter) => {
                const saturation = getNewsletterSaturation(newsletter, newsletters);
                const rank = getNewsletterRank(newsletter, newsletters);
                const targetComparisons = evaluateActualsAgainstTargets({
                  actuals: {
                    openRate: calculateOpenRate(newsletter),
                    clickRate: calculateClickRate(newsletter),
                    clickToOpenRate: calculateClickToOpenRate(newsletter),
                    revenuePerRecipient: calculateRevenuePerRecipient(newsletter)
                  },
                  targets: globalTargets
                });
                const targetSummary = getTopTargetExceptions(targetComparisons);

                return (
                  <tr
                    key={newsletter.id}
                    className="group cursor-pointer align-top transition hover:bg-slate-50/80 focus:bg-slate-50/80 focus:outline-none"
                    role="button"
                    tabIndex={0}
                    aria-label={`Open details for ${newsletter.name}`}
                    onClick={() => onSelectNewsletter(newsletter)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectNewsletter(newsletter);
                      }
                    }}
                  >
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink/20 bg-white text-sm font-semibold text-ink">#{rank}</span>
                    </td>
                    <td className="min-w-[220px] px-4 py-4">
                      <p className="font-semibold text-ink">{newsletter.name}</p>
                      <p className="mt-1 text-xs leading-5 text-muted">&quot;{newsletter.content.subjectLine}&quot;</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted">{formatDateLabel(getSendDate(newsletter))}</td>
                    <td className="min-w-[190px] px-4 py-4">
                      <CampaignColorTag color={campaignById.get(newsletter.campaign.id)?.color ?? "#78716c"} label={newsletter.campaign.name} />
                    </td>
                    <td className="px-4 py-4 font-medium text-ink">{formatCurrency(newsletter.metrics.revenue, newsletter.metrics.currency)}</td>
                    <td className="px-4 py-4 font-medium text-ink">{formatCurrencyPrecise(calculateRevenuePerRecipient(newsletter), newsletter.metrics.currency)}</td>
                    <td className="min-w-[170px] px-4 py-4 text-muted">
                      <p className="font-medium text-ink">{formatPercent(calculateClickToOpenRate(newsletter))} CTOR</p>
                      <p className="mt-1 text-xs">{formatPercent(calculateOpenRate(newsletter))} OR / {formatPercent(calculateClickRate(newsletter))} CTR</p>
                    </td>
                    <td className="min-w-[190px] px-4 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {targetSummary.map((comparison) => (
                          <TargetStatusBadge key={comparison.key} comparison={comparison} currency={newsletter.metrics.currency} compact />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4"><StatusBadge level={saturation.saturationLevel} /></td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted group-hover:text-ink">Open</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function getTopTargetExceptions(comparisons: ReturnType<typeof evaluateActualsAgainstTargets>) {
  const orderedKeys = ["revenuePerRecipient", "clickToOpenRate", "clickRate", "openRate"] as const;
  const failures = orderedKeys
    .flatMap((key) => {
      const comparison = comparisons[key];
      return comparison && comparison.status !== "On track" ? [comparison] : [];
    })
    .slice(0, 2);

  if (failures.length) return failures;

  return orderedKeys.flatMap((key) => {
    const comparison = comparisons[key];
    return comparison ? [comparison] : [];
  }).slice(0, 1);
}
