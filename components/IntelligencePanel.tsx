import type { Campaign, Newsletter, NewsletterInsight, Segment } from "@/lib/newsletterTypes";
import { getGlobalInsights, getRecommendedNextActions } from "@/lib/newsletterInsights";
import { StatusBadge } from "./StatusBadge";

interface IntelligencePanelProps {
  newsletters: Newsletter[];
  campaigns: Campaign[];
  segments: Segment[];
}

export function IntelligencePanel({ newsletters, campaigns, segments }: IntelligencePanelProps) {
  const insights = getGlobalInsights(newsletters, campaigns, segments);
  const actions = getRecommendedNextActions(insights);
  const bestPerformer = insights.find((insight) => insight.type === "best_newsletter");
  const highestRisk = [...insights]
    .filter((insight) => insight.severity === "critical" || insight.severity === "warning")
    .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))[0];
  const topOpportunity = insights.find((insight) => insight.severity === "positive" && insight.type !== "best_newsletter");
  const primaryAction = actions[0];

  return (
    <aside className="rounded-xl border border-line bg-card p-5 shadow-soft md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Intelligence panel</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-normal text-ink">What deserves action</h2>
      <p className="mt-3 text-sm leading-6 text-muted">Rule-based reads from newsletter, campaign, segment, and saturation signals.</p>

      <div className="mt-6 grid gap-3">
        {bestPerformer ? <SignalCard label="Best performer" insight={bestPerformer} /> : null}
        {highestRisk ? <SignalCard label="Highest risk" insight={highestRisk} /> : null}
        {topOpportunity ? <SignalCard label="Top opportunity" insight={topOpportunity} /> : null}
      </div>

      {primaryAction ? (
        <article className="mt-5 rounded-lg border border-line bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Recommended next action</p>
          <h3 className="mt-3 text-base font-semibold text-ink">{primaryAction.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{primaryAction.action}</p>
          <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">{primaryAction.evidence}</p>
        </article>
      ) : null}

      <div className="mt-5 space-y-3">
        {insights.slice(0, 5).map((insight) => (
          <InsightCard key={insight.id ?? `${insight.type}-${insight.title}`} insight={insight} />
        ))}
      </div>

      <div className="mt-5 grid gap-3">
        {actions.slice(0, 4).map((action) => (
          <article key={action.id} className="rounded-md border border-line bg-slate-50/80 p-3">
            <div className="mb-2"><StatusBadge severity={action.priority} /></div>
            <p className="text-sm font-semibold text-ink">{action.title}</p>
            <p className="mt-1 text-xs leading-5 text-muted">{action.action}</p>
          </article>
        ))}
      </div>
    </aside>
  );
}

function SignalCard({ label, insight }: { label: string; insight: NewsletterInsight }) {
  return (
    <article className="rounded-lg border border-line bg-slate-50/80 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <h3 className="mt-2 text-base font-semibold text-ink">{insight.title}</h3>
      <p className="mt-2 text-xs leading-5 text-muted">{insight.evidence ?? insight.message}</p>
    </article>
  );
}

function InsightCard({ insight }: { insight: NewsletterInsight }) {
  return (
    <article className="rounded-lg border border-line bg-slate-50/80 p-4">
      <div className="mb-3"><StatusBadge severity={insight.severity} /></div>
      <h3 className="text-sm font-semibold text-ink">{insight.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{insight.message}</p>
      {insight.evidence ? <p className="mt-2 text-xs leading-5 text-muted">Evidence: {insight.evidence}</p> : null}
      <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">Next move: {insight.recommendation}</p>
    </article>
  );
}

function severityWeight(severity: NewsletterInsight["severity"]): number {
  return { critical: 4, warning: 3, positive: 2, neutral: 1 }[severity];
}
