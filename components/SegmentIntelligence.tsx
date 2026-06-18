import { useEffect, useMemo, useState } from "react";
import audienceMembersJson from "@/data/audience-members.json";
import type { AudienceMapPoint, AudienceMember, SegmentCampaignFit, SegmentMovement } from "@/lib/audienceTypes";
import type { Campaign, Newsletter, Segment, SegmentSummary } from "@/lib/newsletterTypes";
import {
  getAudienceMapPoints,
  getMembersForSegment,
  getSegmentCampaignFit,
  getSegmentEngagementTrend,
  getSegmentMemberSummary,
  getSegmentMovement,
  getSegmentRevenueTrend
} from "@/lib/audienceMetrics";
import { evaluateActualsAgainstTargets, resolveTargets } from "@/lib/targetEvaluation";
import type { TargetComparisonMap, TargetSettings } from "@/lib/targetTypes";
import { getSegmentSummaries } from "@/lib/newsletterMetrics";
import { getSegmentTakeaway } from "@/lib/newsletterInsights";
import { formatCurrency, formatCurrencyPrecise, formatDateLabel, formatNumber, formatPercent } from "@/lib/formatters";
import { AudienceMapChart, CampaignFitChart, SegmentTrendChart } from "./AudienceCharts";
import { CampaignColorTag } from "./CampaignColorTag";
import { StatusBadge } from "./StatusBadge";
import { TargetStatusBadge } from "./TargetStatusBadge";

const audienceMembers = audienceMembersJson as AudienceMember[];

interface SegmentIntelligenceProps {
  segments: Segment[];
  campaigns: Campaign[];
  newsletters: Newsletter[];
  currency: string;
  targetSettings: TargetSettings;
  onSelectNewsletter: (newsletter: Newsletter) => void;
  onDetailModeChange?: (isDetailOpen: boolean) => void;
}

export function SegmentIntelligence({ segments, campaigns, newsletters, currency, targetSettings, onSelectNewsletter, onDetailModeChange }: SegmentIntelligenceProps) {
  const summaries = useMemo(() => getSegmentSummaries(segments, campaigns, newsletters).filter((summary) => summary.sendCount > 0), [segments, campaigns, newsletters]);
  const mapPoints = useMemo(() => getAudienceMapPoints(segments, campaigns, newsletters, audienceMembers), [segments, campaigns, newsletters]);
  const movementsBySegmentId = useMemo(() => new Map(summaries.map((summary) => [summary.segment.id, getSegmentMovement(summary.segment.id, newsletters, audienceMembers)])), [newsletters, summaries]);
  const defaultSegmentId = mapPoints[0]?.segmentId ?? summaries[0]?.segment.id ?? "";
  const [selectedSegmentId, setSelectedSegmentId] = useState(defaultSegmentId);
  const [detailSegmentId, setDetailSegmentId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedSegmentId || !mapPoints.some((point) => point.segmentId === selectedSegmentId)) {
      setSelectedSegmentId(defaultSegmentId);
    }
  }, [defaultSegmentId, mapPoints, selectedSegmentId]);

  useEffect(() => {
    if (detailSegmentId && !mapPoints.some((point) => point.segmentId === detailSegmentId)) {
      setDetailSegmentId(null);
      onDetailModeChange?.(false);
    }
  }, [detailSegmentId, mapPoints, onDetailModeChange]);

  const activeSegmentId = detailSegmentId ?? selectedSegmentId;
  const selectedSummary = summaries.find((summary) => summary.segment.id === activeSegmentId) ?? summaries[0];
  const selectedPoint = mapPoints.find((point) => point.segmentId === selectedSummary?.segment.id) ?? mapPoints[0];
  const selectedMembers = selectedSummary ? getMembersForSegment(audienceMembers, selectedSummary.segment.id) : [];
  const memberSummary = selectedSummary ? getSegmentMemberSummary(selectedSummary.segment.id, audienceMembers) : null;
  const revenueTrend = selectedSummary ? getSegmentRevenueTrend(selectedSummary.segment.id, newsletters) : [];
  const engagementTrend = selectedSummary ? getSegmentEngagementTrend(selectedSummary.segment.id, newsletters) : [];
  const campaignFit = selectedSummary ? getSegmentCampaignFit(selectedSummary.segment.id, campaigns, newsletters) : [];
  const history = selectedSummary ? getSegmentNewsletterHistory(selectedSummary.segment.id, newsletters) : [];
  const selectedMovement = selectedSummary ? movementsBySegmentId.get(selectedSummary.segment.id) ?? getSegmentMovement(selectedSummary.segment.id, newsletters, audienceMembers) : null;
  const selectedTargetComparisons = selectedSummary && selectedPoint
    ? evaluateActualsAgainstTargets({
      actuals: {
        monthlyRevenue: selectedSummary.revenue,
        openRate: selectedSummary.openRate,
        clickRate: selectedSummary.clickRate,
        clickToOpenRate: selectedSummary.clickToOpenRate,
        conversionRate: selectedSummary.conversionRate,
        revenuePerRecipient: selectedSummary.revenuePerRecipient,
        unsubscribeRate: selectedSummary.unsubscribeRate,
        sendsPerSegmentWeek: getMaxSegmentWeeklySends(selectedSummary.segment.id, newsletters),
        pressureScore: selectedPoint.pressure
      },
      targets: resolveTargets(targetSettings, "segment", selectedSummary.segment.id)
    })
    : {};
  const topSignals = getTopSignals(mapPoints);

  if (!selectedSummary || !selectedPoint || !memberSummary) {
    return (
      <section className="rounded-xl border border-line bg-card p-6 shadow-soft">
        <p className="text-sm text-muted">No audience segment activity is available for this month.</p>
      </section>
    );
  }

  const openSegmentDetail = (segmentId: string) => {
    setSelectedSegmentId(segmentId);
    setDetailSegmentId(segmentId);
    onDetailModeChange?.(true);
  };

  const closeSegmentDetail = () => {
    setDetailSegmentId(null);
    onDetailModeChange?.(false);
  };

  if (detailSegmentId) {
    return (
      <section className="rounded-xl border border-line bg-card shadow-soft">
        <div className="border-b border-line bg-[#fbfbf8] px-5 py-5 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <button
                type="button"
                className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-ink"
                onClick={closeSegmentDetail}
              >
                Back to all segments
              </button>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-muted">Audience detail screen</p>
              <h2 className="mt-2 max-w-3xl text-2xl font-semibold tracking-normal text-ink md:text-3xl">{selectedSummary.segment.name}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Use this view to decide whether to protect, cool down, or scale the segment before the next campaign cycle.</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StatusBadge label={getDecisionDisplayLabel(selectedPoint.decisionLabel)} severity={getDecisionSeverity(selectedPoint.decisionLabel)} />
                {selectedMovement ? <StatusBadge label={selectedMovement.label} severity={getMovementSeverity(selectedMovement.label)} /> : null}
                {selectedTargetComparisons.revenuePerRecipient ? <TargetStatusBadge comparison={selectedTargetComparisons.revenuePerRecipient} currency={currency} /> : null}
                {selectedTargetComparisons.pressureScore ? <TargetStatusBadge comparison={selectedTargetComparisons.pressureScore} currency={currency} /> : null}
              </div>
            </div>
            <SelectedSegmentPanel summary={selectedSummary} point={selectedPoint} memberSummary={memberSummary} movement={selectedMovement} targetComparisons={selectedTargetComparisons} campaignFit={campaignFit} currency={currency} />
          </div>
        </div>

        <div className="border-b border-line px-5 py-4 md:px-6">
          <SegmentSwitcher points={mapPoints} selectedSegmentId={selectedSummary.segment.id} onSelectSegment={openSegmentDetail} />
        </div>

        <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid min-w-0 gap-6">
            <article className="rounded-lg border border-line bg-slate-50/60 p-4 md:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Pressure map</p>
                  <h3 className="mt-2 text-lg font-semibold tracking-normal text-ink">Can {selectedSummary.segment.name} absorb more pressure?</h3>
                </div>
                <p className="max-w-lg text-sm leading-6 text-muted">Right means stronger RPR, higher means more pressure, and larger bubbles reflect demo member count. The dark bubble is the selected segment.</p>
              </div>
              <AudienceMapChart points={mapPoints} selectedSegmentId={selectedSummary.segment.id} currency={currency} onSelectSegment={openSegmentDetail} />
            </article>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <article className="rounded-lg border border-line bg-card p-4 md:p-5">
                <SectionHeader label="Trend" title="Is this segment still acting after each send?" note="Each point is a newsletter touch for the selected segment." />
                <SegmentTrendChart revenueTrend={revenueTrend} engagementTrend={engagementTrend} currency={currency} />
              </article>

              <article className="rounded-lg border border-line bg-card p-4 md:p-5">
                <SectionHeader label="Campaign fit" title="Which campaign system fits this audience?" note="Fit blends RPR, OR, CTOR, sends, and unsubscribe cost." />
                {campaignFit.length ? <CampaignFitChart data={campaignFit} /> : <EmptyPanel text="No campaign fit is available for this segment." />}
              </article>
            </div>

            <article className="rounded-lg border border-line bg-card p-4 md:p-5">
              <SectionHeader label="Newsletter history" title="What this segment received" note="Rows open the same newsletter detail drawer used elsewhere." />
              <SegmentHistoryTable history={history} currency={currency} onSelectNewsletter={onSelectNewsletter} />
            </article>
          </div>

          <aside className="grid min-w-0 content-start gap-4">
            <SampleMemberTable members={selectedMembers} currency={currency} />
          </aside>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-line bg-card shadow-soft">
      <div className="border-b border-line px-5 py-5 md:px-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.8fr)] xl:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Audience intelligence</p>
            <h2 className="mt-2 max-w-3xl text-2xl font-semibold tracking-normal text-ink md:text-3xl">See the full segment landscape, then open the pressure behind one audience.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              Every active segment stays visible. Select one card to open a dedicated segment detail screen with charts, history, and member evidence.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {topSignals.map((signal) => (
              <SignalButton key={signal.label} signal={signal} onSelectSegment={openSegmentDetail} selectedSegmentId={selectedSegmentId} />
            ))}
          </div>
        </div>
      </div>

      <div className="border-b border-line bg-slate-50/50 p-5 md:p-6">
        <SegmentOverviewGrid
          summaries={summaries}
          points={mapPoints}
          selectedSegmentId={selectedSegmentId}
          currency={currency}
          targetSettings={targetSettings}
          movementsBySegmentId={movementsBySegmentId}
          newsletters={newsletters}
          onSelectSegment={openSegmentDetail}
        />
      </div>
    </section>
  );
}

function SegmentOverviewGrid({
  summaries,
  points,
  selectedSegmentId,
  currency,
  targetSettings,
  movementsBySegmentId,
  newsletters,
  onSelectSegment
}: {
  summaries: SegmentSummary[];
  points: AudienceMapPoint[];
  selectedSegmentId: string;
  currency: string;
  targetSettings: TargetSettings;
  movementsBySegmentId: Map<string, SegmentMovement>;
  newsletters: Newsletter[];
  onSelectSegment: (segmentId: string) => void;
}) {
  const summariesById = new Map(summaries.map((summary) => [summary.segment.id, summary]));
  const rows = points.flatMap((point) => {
    const summary = summariesById.get(point.segmentId);
    return summary ? [{ point, summary }] : [];
  });

  return (
    <article>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">All segments</p>
          <h3 className="mt-1 text-lg font-semibold tracking-normal text-ink">Segment command surface</h3>
        </div>
        <p className="max-w-xl text-sm leading-6 text-muted">Compact cards show the decision, value, pressure, sends, and recommended move before opening the segment detail screen.</p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {rows.map(({ point, summary }) => {
          const isSelected = point.segmentId === selectedSegmentId;
          const movement = movementsBySegmentId.get(point.segmentId);
          const targetComparisons = evaluateActualsAgainstTargets({
            actuals: {
              monthlyRevenue: summary.revenue,
              revenuePerRecipient: summary.revenuePerRecipient,
              openRate: summary.openRate,
              clickToOpenRate: summary.clickToOpenRate,
              unsubscribeRate: summary.unsubscribeRate,
              sendsPerSegmentWeek: getMaxSegmentWeeklySends(summary.segment.id, newsletters),
              pressureScore: point.pressure
            },
            targets: resolveTargets(targetSettings, "segment", point.segmentId)
          });

          return (
            <button
              key={point.segmentId}
              type="button"
              className={`group min-h-[220px] rounded-lg border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-ink ${
                isSelected ? "border-ink bg-white shadow-soft ring-2 ring-ink/10" : "border-line bg-[#fbfbf8] shadow-sm hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white"
              }`}
              onClick={() => onSelectSegment(point.segmentId)}
              aria-pressed={isSelected}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{summary.segment.lifecycleStage.replaceAll("_", " ")}</p>
                  <h4 className="mt-1 truncate text-lg font-semibold tracking-normal text-ink">{summary.segment.name}</h4>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge label={getDecisionDisplayLabel(point.decisionLabel)} severity={getDecisionSeverity(point.decisionLabel)} />
                  {movement ? <StatusBadge label={movement.label} severity={getMovementSeverity(movement.label)} /> : null}
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-2">
                <MiniSegmentMetric label="Revenue" value={formatCurrency(summary.revenue, currency)} />
                <MiniSegmentMetric label="RPR" value={formatCurrencyPrecise(summary.revenuePerRecipient, currency)} />
                <MiniSegmentMetric label="Pressure" value={`${point.pressure}/100`} />
                <MiniSegmentMetric label="Sends" value={formatNumber(summary.sendCount)} />
              </dl>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StatusBadge level={summary.saturationLevel} />
                {targetComparisons.revenuePerRecipient ? <TargetStatusBadge comparison={targetComparisons.revenuePerRecipient} currency={currency} compact /> : null}
                {targetComparisons.pressureScore ? <TargetStatusBadge comparison={targetComparisons.pressureScore} currency={currency} compact /> : null}
              </div>

              <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted">{getSegmentTakeaway(summary)}</p>
              <p className={`mt-4 text-xs font-semibold uppercase tracking-[0.14em] ${isSelected ? "text-ink" : "text-muted group-hover:text-ink"}`}>
                {isSelected ? "Selected segment / open detail" : "Open segment detail"}
              </p>
            </button>
          );
        })}
      </div>
    </article>
  );
}

function SignalButton({
  signal,
  selectedSegmentId,
  onSelectSegment
}: {
  signal: { label: string; value: string; segmentId: string; note: string };
  selectedSegmentId: string;
  onSelectSegment: (segmentId: string) => void;
}) {
  const isSelected = signal.segmentId === selectedSegmentId;
  return (
    <button
      type="button"
      className={`min-h-[96px] rounded-lg border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-ink ${
        isSelected ? "border-ink bg-ink text-white" : "border-line bg-slate-50/80 text-ink hover:border-ink/40 hover:bg-white"
      }`}
      onClick={() => onSelectSegment(signal.segmentId)}
    >
      <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${isSelected ? "text-stone-300" : "text-muted"}`}>{signal.label}</p>
      <p className="mt-2 text-sm font-semibold">{signal.value}</p>
      <p className={`mt-2 text-xs leading-5 ${isSelected ? "text-stone-300" : "text-muted"}`}>{signal.note}</p>
    </button>
  );
}

function SegmentPriorityList({ points, selectedSegmentId, onSelectSegment }: { points: AudienceMapPoint[]; selectedSegmentId: string; onSelectSegment: (segmentId: string) => void }) {
  return (
    <article className="rounded-lg border border-line bg-slate-50/70 p-4">
      <SectionHeader label="Priority list" title="Segments to inspect" note="Sorted by risk, value, and monthly revenue." />
      <div className="mt-4 grid gap-2">
        {points.map((point, index) => {
          const isSelected = point.segmentId === selectedSegmentId;
          return (
            <button
              key={point.segmentId}
              type="button"
              className={`rounded-lg border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-ink ${
                isSelected ? "border-ink bg-white shadow-sm" : "border-line bg-card hover:border-ink/30"
              }`}
              onClick={() => onSelectSegment(point.segmentId)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">#{index + 1} / {point.decisionLabel}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-ink">{point.name}</p>
                </div>
                <span className="rounded-md border border-line bg-slate-50 px-2 py-1 text-xs font-semibold text-muted">{point.pressure}/100</span>
              </div>
            </button>
          );
        })}
      </div>
    </article>
  );
}

function SegmentSwitcher({ points, selectedSegmentId, onSelectSegment }: { points: AudienceMapPoint[]; selectedSegmentId: string; onSelectSegment: (segmentId: string) => void }) {
  return (
    <div>
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Switch segment</p>
          <h3 className="mt-1 text-base font-semibold tracking-normal text-ink">Open another audience without leaving detail</h3>
        </div>
        <p className="text-xs leading-5 text-muted">Sorted by priority and pressure.</p>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {points.map((point) => {
          const isSelected = point.segmentId === selectedSegmentId;
          return (
            <button
              key={point.segmentId}
              type="button"
              className={`shrink-0 rounded-lg border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-ink ${
                isSelected ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink/30 hover:bg-slate-50"
              }`}
              onClick={() => onSelectSegment(point.segmentId)}
            >
              <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${isSelected ? "text-stone-300" : "text-muted"}`}>{getDecisionDisplayLabel(point.decisionLabel)}</p>
              <p className="mt-1 max-w-[150px] truncate text-sm font-semibold">{point.name}</p>
              <p className={`mt-1 text-xs ${isSelected ? "text-stone-300" : "text-muted"}`}>{point.pressure}/100 pressure</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SegmentHistoryTable({
  history,
  currency,
  onSelectNewsletter
}: {
  history: ReturnType<typeof getSegmentNewsletterHistory>;
  currency: string;
  onSelectNewsletter: (newsletter: Newsletter) => void;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            <th className="border-b border-line pb-3 pr-4">Send</th>
            <th className="border-b border-line px-4 pb-3">Campaign</th>
            <th className="border-b border-line px-4 pb-3">Revenue</th>
            <th className="border-b border-line px-4 pb-3">OR</th>
            <th className="border-b border-line px-4 pb-3">CTOR</th>
            <th className="border-b border-line pl-4 pb-3">Unsub</th>
          </tr>
        </thead>
        <tbody>
          {history.map((row) => (
            <tr key={row.newsletter.id} className="group cursor-pointer" onClick={() => onSelectNewsletter(row.newsletter)}>
              <td className="border-b border-line/70 py-3 pr-4">
                <p className="font-semibold text-ink group-hover:underline">{row.newsletter.name}</p>
                <p className="mt-1 text-xs text-muted">{formatDateLabel(row.newsletter.timing.sentAt)}</p>
              </td>
              <td className="border-b border-line/70 px-4 py-3 text-muted">{row.newsletter.campaign.name}</td>
              <td className="border-b border-line/70 px-4 py-3 font-semibold text-ink">{formatCurrency(row.performance.revenue, currency)}</td>
              <td className="border-b border-line/70 px-4 py-3 text-muted">{formatPercent(row.openRate)}</td>
              <td className="border-b border-line/70 px-4 py-3 text-muted">{formatPercent(row.clickToOpenRate)}</td>
              <td className="border-b border-line/70 pl-4 py-3 text-muted">{formatPercent(row.unsubscribeRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SelectedSegmentPanel({
  summary,
  point,
  memberSummary,
  movement,
  targetComparisons,
  campaignFit,
  currency
}: {
  summary: SegmentSummary;
  point: AudienceMapPoint;
  memberSummary: NonNullable<ReturnType<typeof getSegmentMemberSummary>>;
  movement: SegmentMovement | null;
  targetComparisons: TargetComparisonMap;
  campaignFit: SegmentCampaignFit[];
  currency: string;
}) {
  const bestFit = campaignFit[0];
  const diagnosis = getSegmentPressureDiagnosis(summary, point);

  return (
    <article className="w-full rounded-lg border border-line bg-white p-4 shadow-sm lg:max-w-[440px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{summary.segment.lifecycleStage.replaceAll("_", " ")}</p>
          <h3 className="mt-2 text-lg font-semibold tracking-normal text-ink">Decision summary</h3>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge label={getDecisionDisplayLabel(point.decisionLabel)} severity={point.decisionLabel === "Cool down" ? "critical" : point.decisionLabel === "Rebuild" ? "warning" : "positive"} />
          {movement ? <StatusBadge label={movement.label} severity={getMovementSeverity(movement.label)} /> : null}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2">
        <PanelMetric label="Revenue" value={formatCurrency(summary.revenue, currency)} />
        <PanelMetric label="RPR" value={formatCurrencyPrecise(summary.revenuePerRecipient, currency)} />
        <PanelMetric label="CTOR" value={formatPercent(summary.clickToOpenRate)} />
        <PanelMetric label="Pressure" value={`${point.pressure}/100`} />
      </dl>

      <div className="mt-4 rounded-lg border border-line bg-[#f7f8f3] p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Recommended move</p>
        <p className="mt-2 text-sm leading-6 text-ink">{getSegmentTakeaway(summary)}</p>
      </div>

      {movement ? (
        <div className="mt-3 rounded-lg border border-line bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Movement</p>
          <p className="mt-2 text-sm leading-6 text-ink">{movement.explanation}</p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {targetComparisons.monthlyRevenue ? <TargetStatusBadge comparison={targetComparisons.monthlyRevenue} currency={currency} /> : null}
        {targetComparisons.revenuePerRecipient ? <TargetStatusBadge comparison={targetComparisons.revenuePerRecipient} currency={currency} /> : null}
        {targetComparisons.pressureScore ? <TargetStatusBadge comparison={targetComparisons.pressureScore} currency={currency} /> : null}
      </div>

      <details className="mt-3 rounded-lg border border-line bg-white p-3">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-muted">More evidence</summary>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <PanelMetric label="Members" value={formatNumber(memberSummary.memberCount)} />
          <PanelMetric label="OR" value={formatPercent(summary.openRate)} />
          <PanelMetric label="CTR" value={formatPercent(summary.clickRate)} />
          <PanelMetric label="Unsub" value={formatPercent(summary.unsubscribeRate)} />
          <PanelMetric label="Sends" value={String(summary.sendCount)} />
        </div>
        <p className="mt-3 text-xs leading-5 text-muted">{diagnosis}</p>
        <div className="mt-3">
          {bestFit ? <CampaignColorTag color={bestFit.color} label={bestFit.campaignName} type="best fit" /> : <span className="text-xs text-muted">No campaign fit yet</span>}
        </div>
      </details>
    </article>
  );
}

function MiniSegmentMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-slate-50/70 p-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

function SampleMemberTable({ members, currency }: { members: AudienceMember[]; currency: string }) {
  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-line bg-card p-4">
      <SectionHeader label="Demo members" title="Sample records" note="Synthetic `.test` identities only." />
      <div className="mt-4 max-w-full overflow-hidden">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[42%]" />
            <col className="w-[25%]" />
            <col className="w-[13%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              <th className="border-b border-line pb-2 pr-2">Member</th>
              <th className="border-b border-line px-2 pb-2">Place</th>
              <th className="border-b border-line px-2 pb-2 text-right">Eng.</th>
              <th className="border-b border-line pl-2 pb-2 text-right">Rev.</th>
            </tr>
          </thead>
          <tbody>
            {members.slice(0, 5).map((member) => (
              <tr key={member.id}>
                <td className="min-w-0 border-b border-line/70 py-3 pr-2 align-top">
                  <p className="truncate font-semibold text-ink" title={member.maskedEmail}>{member.maskedEmail}</p>
                  <p className="mt-1 text-xs capitalize text-muted">{member.fatigueRisk} fatigue</p>
                </td>
                <td className="min-w-0 border-b border-line/70 px-2 py-3 align-top text-xs text-muted">
                  <p className="truncate" title={`${member.city}, ${member.country}`}>{member.city}</p>
                  <p className="truncate" title={member.country}>{member.country}</p>
                </td>
                <td className="border-b border-line/70 px-2 py-3 text-right font-semibold text-ink">{member.engagementScore}</td>
                <td className="border-b border-line/70 pl-2 py-3 text-right font-semibold text-ink">
                  <span className="block truncate" title={formatCurrency(member.totalRevenue, currency)}>{formatCurrency(member.totalRevenue, currency)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function PanelMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50/70 p-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

function SectionHeader({ label, title, note }: { label: string; title: string; note: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <h3 className="mt-1 text-base font-semibold tracking-normal text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{note}</p>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return <p className="mt-4 rounded-lg border border-dashed border-line bg-slate-50/70 p-4 text-sm leading-6 text-muted">{text}</p>;
}

function getTopSignals(points: AudienceMapPoint[]) {
  const bestAudience = [...points].sort((a, b) => b.value - a.value)[0];
  const highestFatigue = [...points].sort((a, b) => b.pressure - a.pressure)[0];
  const largestOpportunity = [...points].sort((a, b) => b.opportunityScore - a.opportunityScore)[0];
  const cooldown = points.find((point) => point.decisionLabel === "Cool down") ?? highestFatigue;

  return [
    {
      label: "Best audience",
      value: bestAudience?.name ?? "n/a",
      segmentId: bestAudience?.segmentId ?? "",
      note: bestAudience ? `${getDecisionDisplayLabel(bestAudience.decisionLabel)}; strongest RPR.` : "No segment data."
    },
    {
      label: "Highest fatigue risk",
      value: highestFatigue?.name ?? "n/a",
      segmentId: highestFatigue?.segmentId ?? "",
      note: highestFatigue ? `${highestFatigue.pressure}/100 pressure.` : "No pressure signal."
    },
    {
      label: "Largest opportunity",
      value: largestOpportunity?.name ?? "n/a",
      segmentId: largestOpportunity?.segmentId ?? "",
      note: largestOpportunity ? `${getDecisionDisplayLabel(largestOpportunity.decisionLabel)}; best value headroom.` : "No opportunity signal."
    },
    {
      label: "Cooldown segment",
      value: cooldown?.name ?? "n/a",
      segmentId: cooldown?.segmentId ?? "",
      note: cooldown ? `${getDecisionDisplayLabel(cooldown.decisionLabel)}; inspect cadence.` : "No cooldown needed."
    }
  ].filter((signal) => signal.segmentId);
}

function getSegmentNewsletterHistory(segmentId: string, newsletters: Newsletter[]) {
  return newsletters
    .flatMap((newsletter) =>
      newsletter.segmentPerformance
        .filter((performance) => performance.segmentId === segmentId)
        .map((performance) => ({
          newsletter,
          performance,
          openRate: safeDivide(performance.uniqueOpens, performance.delivered),
          clickToOpenRate: safeDivide(performance.uniqueClicks, performance.uniqueOpens),
          unsubscribeRate: safeDivide(performance.unsubscribes, performance.delivered)
        }))
    )
    .sort((a, b) => b.newsletter.timing.sentAt.localeCompare(a.newsletter.timing.sentAt));
}

function safeDivide(numerator: number, denominator: number): number {
  return denominator ? numerator / denominator : 0;
}

function getDecisionSeverity(label: AudienceMapPoint["decisionLabel"]) {
  if (label === "Cool down") return "critical";
  if (label === "Rebuild" || label === "Test editorial") return "warning";
  return "positive";
}

function getDecisionDisplayLabel(label: AudienceMapPoint["decisionLabel"]): string {
  if (label === "Scale carefully") return "Scale";
  if (label === "Rebuild" || label === "Test editorial") return "Repair";
  return label;
}

function getMovementSeverity(label: SegmentMovement["label"]) {
  if (label === "Growing" || label === "Recovering") return "positive";
  if (label === "Fatigued" || label === "Declining") return "warning";
  return "neutral";
}

function getMaxSegmentWeeklySends(segmentId: string, newsletters: Newsletter[]): number {
  const weeklyCounts = newsletters.reduce<Record<string, number>>((acc, newsletter) => {
    if (!newsletter.segmentPerformance.some((performance) => performance.segmentId === segmentId)) return acc;
    const weekKey = `${newsletter.timing.sentAt.slice(0, 7)}-${Math.ceil(new Date(newsletter.timing.sentAt).getDate() / 7)}`;
    acc[weekKey] = (acc[weekKey] ?? 0) + 1;
    return acc;
  }, {});
  return Math.max(0, ...Object.values(weeklyCounts));
}

function getSegmentPressureDiagnosis(summary: SegmentSummary, point: AudienceMapPoint): string {
  const saturation = summary.saturationLevel.replaceAll("_", " ");
  if (point.pressure >= 72 || summary.saturationLevel === "overexposed" || summary.saturationLevel === "saturated") {
    return `${summary.segment.name} is in ${saturation} territory with ${summary.sendCount} sends, ${formatPercent(summary.unsubscribeRate)} unsub rate, and ${point.pressure}/100 pressure. Reduce commercial overlap before the next offer.`;
  }

  if (summary.revenuePerRecipient > 0.22 && point.pressure < 60) {
    return `${summary.segment.name} is producing quality revenue with manageable pressure. Protect cadence and keep the campaign fit narrow.`;
  }

  if (summary.openRate > 0.35 && summary.clickToOpenRate < 0.085) {
    return `${summary.segment.name} is opening but not committing. The fatigue signal is more about message fit than raw send volume.`;
  }

  return `${summary.segment.name} is currently ${saturation} with ${point.pressure}/100 pressure. Keep monitoring CTOR and unsubscribe movement before scaling.`;
}
