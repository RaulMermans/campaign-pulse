import type { InsightSeverity, SaturationLevel } from "@/lib/newsletterTypes";

const saturationClasses: Record<SaturationLevel, string> = {
  healthy: "border-emerald-200 bg-emerald-50/70 text-emerald-800",
  watch: "border-amber-200 bg-amber-50/75 text-amber-800",
  saturated: "border-orange-200 bg-orange-50/75 text-orange-800",
  overexposed: "border-red-200 bg-red-50/75 text-red-800"
};

const severityClasses: Record<InsightSeverity, string> = {
  positive: "border-emerald-200 bg-emerald-50/70 text-emerald-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  warning: "border-amber-200 bg-amber-50/75 text-amber-800",
  critical: "border-red-200 bg-red-50/75 text-red-800"
};

interface StatusBadgeProps {
  level?: SaturationLevel;
  severity?: InsightSeverity;
  label?: string;
}

export function StatusBadge({ level, severity, label }: StatusBadgeProps) {
  const className = level ? saturationClasses[level] : severity ? severityClasses[severity] : severityClasses.neutral;
  const display = label ?? level ?? severity ?? "neutral";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold capitalize ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {display.replaceAll("_", " ")}
    </span>
  );
}
