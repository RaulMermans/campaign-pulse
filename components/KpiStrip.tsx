import { formatCurrency, formatCurrencyPrecise, formatNumber, formatPercent } from "@/lib/formatters";
import { getMonthlySummary } from "@/lib/newsletterMetrics";
import type { Newsletter } from "@/lib/newsletterTypes";
import { StatusBadge } from "./StatusBadge";

interface KpiStripProps {
  newsletters: Newsletter[];
  currency: string;
}

export function KpiStrip({ newsletters, currency }: KpiStripProps) {
  const summary = getMonthlySummary(newsletters);
  const secondaryKpis = [
    { label: "Avg OR", value: formatPercent(summary.openRate), note: "unique opens" },
    { label: "Avg CTR", value: formatPercent(summary.clickRate), note: "delivered clicks" },
    { label: "Avg CTOR", value: formatPercent(summary.clickToOpenRate), note: "post-open intent" },
    { label: "RPR", value: formatCurrencyPrecise(summary.revenuePerRecipient, currency), note: "revenue / delivered" },
    { label: "Unsub rate", value: formatPercent(summary.unsubscribeRate), note: `${formatPercent(summary.spamComplaintRate)} spam` }
  ];

  return (
    <section className="grid gap-3 lg:grid-cols-[1.15fr_1fr] 2xl:grid-cols-[1.15fr_1fr_0.8fr]">
      <article className="rounded-xl border border-line bg-card p-5 shadow-soft md:p-6" style={{ boxShadow: "inset 4px 0 0 #171817" }}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Monthly outcome</p>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-4xl font-semibold tracking-normal text-ink md:text-5xl">{formatCurrency(summary.revenue, currency)}</p>
            <p className="mt-2 text-sm leading-6 text-muted">Revenue from {formatNumber(summary.totalDelivered)} delivered emails.</p>
          </div>
          <div className="rounded-lg border border-line bg-slate-50/80 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Total sent</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{formatNumber(summary.totalSent)}</p>
          </div>
        </div>
      </article>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:col-span-1">
        {secondaryKpis.map((kpi) => (
          <article key={kpi.label} className="rounded-lg border border-line bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{kpi.label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-normal text-ink">{kpi.value}</p>
            <p className="mt-1 text-xs leading-5 text-muted">{kpi.note}</p>
          </article>
        ))}
      </div>

      <article className="rounded-xl border border-line bg-card p-5 shadow-sm 2xl:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Audience pressure</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <StatusBadge level={summary.saturationLevel} />
          <p className="text-3xl font-semibold tracking-normal text-ink">{summary.averageSaturationScore.toFixed(0)}</p>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted">Average saturation score across the month.</p>
      </article>
    </section>
  );
}
