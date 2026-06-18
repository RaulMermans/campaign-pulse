import { formatCurrency, formatCurrencyPrecise, formatNumber, formatPercent } from "@/lib/formatters";
import type { TargetComparison } from "@/lib/targetTypes";

const statusClasses: Record<TargetComparison["status"], string> = {
  "On track": "border-emerald-200 bg-emerald-50/70 text-emerald-800",
  Watch: "border-amber-200 bg-amber-50/75 text-amber-800",
  "Off track": "border-red-200 bg-red-50/75 text-red-800"
};

interface TargetStatusBadgeProps {
  comparison: TargetComparison;
  currency?: string;
  compact?: boolean;
}

export function TargetStatusBadge({ comparison, currency = "EUR", compact = false }: TargetStatusBadgeProps) {
  const label = getMetricSpecificStatusLabel(comparison);

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border ${compact ? "px-2 py-0.5" : "px-2.5 py-1"} text-xs font-semibold ${statusClasses[comparison.status]}`} title={`${comparison.label}: ${formatTargetValue(comparison.actual, comparison.key, currency)} vs target ${formatTargetValue(comparison.target, comparison.key, currency)}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function TargetComparisonCard({ comparison, currency = "EUR" }: { comparison: TargetComparison; currency?: string }) {
  return (
    <article className="min-w-0 rounded-lg border border-line bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{comparison.label}</p>
        <TargetStatusBadge comparison={comparison} currency={currency} compact />
      </div>
      <p className="mt-2 text-sm font-semibold text-ink">{formatTargetValue(comparison.actual, comparison.key, currency)}</p>
      <p className="mt-1 truncate text-xs text-muted">Target {formatTargetValue(comparison.target, comparison.key, currency)}</p>
    </article>
  );
}

function formatTargetValue(value: number, key: TargetComparison["key"], currency: string): string {
  if (key === "monthlyRevenue") return formatCurrency(value, currency);
  if (key === "revenuePerRecipient") return formatCurrencyPrecise(value, currency);
  if (key === "pressureScore") return `${value.toFixed(0)}/100`;
  if (key === "sendsPerSegmentWeek") return formatNumber(value);
  return formatPercent(value);
}

function getMetricSpecificStatusLabel(comparison: TargetComparison): string {
  return `${comparison.label} ${comparison.status.toLowerCase()}`;
}
