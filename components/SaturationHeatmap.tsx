"use client";

import { useMemo, useState } from "react";
import type { Newsletter, Segment, SegmentWeeklySaturation, SaturationLevel } from "@/lib/newsletterTypes";
import { getSegmentWeeklySaturation } from "@/lib/newsletterSaturation";
import { getFatigueDiagnosis, getRecommendedActionForSaturation } from "@/lib/newsletterInsights";
import { formatCurrencyPrecise, formatDateTime, formatNumber, formatPercent } from "@/lib/formatters";
import { StatusBadge } from "./StatusBadge";

interface SaturationHeatmapProps {
  segments: Segment[];
  newsletters: Newsletter[];
  currency: string;
}

const cellClasses: Record<SaturationLevel, string> = {
  healthy: "border-emerald-100 bg-white text-emerald-800 hover:bg-emerald-50/60",
  watch: "border-amber-200 bg-amber-50/55 text-amber-800 hover:bg-amber-50",
  saturated: "border-orange-200 bg-orange-50/60 text-orange-800 hover:bg-orange-50",
  overexposed: "border-red-200 bg-red-50/65 text-red-800 hover:bg-red-50"
};

export function SaturationHeatmap({ segments, newsletters, currency }: SaturationHeatmapProps) {
  const heatmap = useMemo(() => getSegmentWeeklySaturation(segments, newsletters), [segments, newsletters]);
  const defaultSelection = useMemo(() => getDefaultSelection(heatmap.rows.flatMap((row) => row.cells)), [heatmap]);
  const [selectedCell, setSelectedCell] = useState<SegmentWeeklySaturation | null>(defaultSelection);

  return (
    <section className="rounded-xl border border-line bg-card p-5 shadow-soft md:p-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Segment saturation heatmap</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-ink">Weekly pressure and fatigue diagnosis</h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-muted">
          Rows use the actual audience segments from the mock JSON; cells compare same-segment pressure and performance against the prior week.
        </p>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div
          className="min-w-[860px] rounded-lg border border-line bg-slate-50/70 p-3"
          style={{ display: "grid", gridTemplateColumns: `minmax(180px,1.1fr) repeat(${heatmap.weeks.length}, minmax(132px,1fr))`, gap: "0.75rem" }}
        >
          <div className="px-2 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Segment</div>
          {heatmap.weeks.map((week) => (
            <div key={week} className="px-2 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Week {week}
            </div>
          ))}

          {heatmap.rows.map((row) => (
            <Row key={row.segment.id} row={row} selectedCell={selectedCell} onSelect={setSelectedCell} />
          ))}
        </div>
      </div>

      {selectedCell ? <HeatmapDetail cell={selectedCell} currency={currency} /> : null}
    </section>
  );
}

function Row({
  row,
  selectedCell,
  onSelect
}: {
  row: { segment: Segment; cells: SegmentWeeklySaturation[] };
  selectedCell: SegmentWeeklySaturation | null;
  onSelect: (cell: SegmentWeeklySaturation) => void;
}) {
  return (
    <>
      <div className="rounded-lg border border-line bg-card p-3">
        <p className="font-semibold text-ink">{row.segment.name}</p>
        <p className="mt-1 text-xs capitalize text-muted">{row.segment.lifecycleStage.replaceAll("_", " ")}</p>
      </div>
      {row.cells.map((cell) => {
        const isSelected = selectedCell?.segment.id === cell.segment.id && selectedCell.week === cell.week;

        return (
          <button
            key={`${cell.segment.id}-${cell.week}`}
            type="button"
            className={`min-h-[108px] rounded-lg border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-ink ${cellClasses[cell.saturationLevel]} ${
              isSelected ? "ring-2 ring-ink" : ""
            }`}
            onClick={() => onSelect(cell)}
            aria-label={`Open ${cell.segment.name} ${cell.weekLabel} saturation details`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold capitalize">{cell.saturationLevel}</p>
              <span className="rounded-md border border-current/20 bg-slate-50/70 px-2 py-0.5 text-xs font-semibold">{cell.sendCount}</span>
            </div>
            <p className="mt-3 text-xs leading-5">
              {cell.sendCount ? `${formatPercent(cell.openRate)} OR / ${formatPercent(cell.clickRate)} CTR` : "No sends"}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-50/80">
              <div className="h-full rounded-full bg-current" style={{ width: `${Math.max(cell.saturationScore, cell.sendCount ? 14 : 0)}%` }} />
            </div>
          </button>
        );
      })}
    </>
  );
}

function HeatmapDetail({ cell, currency }: { cell: SegmentWeeklySaturation; currency: string }) {
  return (
    <article className="mt-5 rounded-lg border border-line bg-slate-50/80 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Selected pressure cell</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-normal text-ink">
            {cell.segment.name} / {cell.weekLabel}
          </h3>
        </div>
        <StatusBadge level={cell.saturationLevel} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Sends" value={String(cell.sendCount)} />
        <Metric label="OR" value={formatPercent(cell.openRate)} />
        <Metric label="CTR" value={formatPercent(cell.clickRate)} />
        <Metric label="CTOR" value={formatPercent(cell.clickToOpenRate)} />
        <Metric label="Unsub" value={formatPercent(cell.unsubscribeRate)} />
        <Metric label="RPR" value={formatCurrencyPrecise(cell.revenuePerRecipient, currency)} />
        <Metric label="Sent" value={formatNumber(cell.totalSent)} />
        <Metric label="Score" value={`${cell.saturationScore.toFixed(0)}/100`} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Newsletters sent</p>
          <div className="mt-3 space-y-3">
            {cell.newsletters.length ? (
              cell.newsletters.map((newsletter) => (
                <div key={newsletter.id} className="border-b border-line pb-3 last:border-b-0 last:pb-0">
                  <p className="font-medium text-ink">{newsletter.name}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {formatDateTime(newsletter.sentAt)} / {newsletter.campaignName} / {newsletter.creativeAngle.replaceAll("_", " ")}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-muted">No sends reached this segment during this week.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Diagnosis</p>
          <p className="mt-3 text-sm leading-6 text-ink">{getFatigueDiagnosis(cell)}</p>
          <p className="mt-4 border-t border-line pt-4 text-sm leading-6 text-muted">
            Recommended next action: <span className="font-medium text-ink">{getRecommendedActionForSaturation(cell)}</span>
          </p>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-card p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}

function getDefaultSelection(cells: SegmentWeeklySaturation[]): SegmentWeeklySaturation | null {
  const withSends = cells.filter((cell) => cell.sendCount > 0);
  if (!withSends.length) return cells[0] ?? null;
  return [...withSends].sort((a, b) => b.saturationScore - a.saturationScore)[0];
}
