import { useEffect, useMemo, useState, type ReactNode } from "react";
import importRows from "@/data/import-sample.json";
import type { Campaign, Segment } from "@/lib/newsletterTypes";
import type { NormalizedDatasetMetadata } from "@/lib/adapters/normalizedSchema";
import { futureAdapterSources } from "@/lib/adapters/types";
import type { RawNewsletterImportRow } from "@/lib/importTypes";
import { normalizeImportRows } from "@/lib/importNormalizer";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { displayTargetInputValue, parseTargetInputValue, type TargetInputKind } from "@/lib/targetInput";
import { resolveTargets } from "@/lib/targetEvaluation";
import type { TargetSettings, TargetValues } from "@/lib/targetTypes";
import { StatusBadge } from "./StatusBadge";

const rows = importRows as RawNewsletterImportRow[];

interface DataIntakeSimulationProps {
  campaigns: Campaign[];
  segments: Segment[];
  currency: string;
  adapterMetadata: NormalizedDatasetMetadata;
  targetSettings: TargetSettings;
  onSaveTargets: (settings: TargetSettings) => void;
  onResetTargets: () => void;
}

const targetGroups: Array<{
  title: string;
  fields: Array<{ key: keyof TargetValues; label: string; kind: TargetInputKind }>;
}> = [
  {
    title: "Business goals",
    fields: [
      { key: "monthlyRevenue", label: "Monthly revenue", kind: "currency" },
      { key: "conversionRate", label: "Conversion rate", kind: "percent" },
      { key: "revenuePerRecipient", label: "Revenue per recipient", kind: "currency" }
    ]
  },
  {
    title: "Engagement goals",
    fields: [
      { key: "openRate", label: "Open rate", kind: "percent" },
      { key: "clickRate", label: "Click rate", kind: "percent" },
      { key: "clickToOpenRate", label: "Click-to-open rate", kind: "percent" }
    ]
  },
  {
    title: "Audience safety limits",
    fields: [
      { key: "maxUnsubscribeRate", label: "Max unsubscribe rate", kind: "percent" },
      { key: "maxSpamRate", label: "Max spam rate", kind: "percent" },
      { key: "maxSendsPerSegmentWeek", label: "Max sends per segment/week", kind: "number" },
      { key: "maxPressureScore", label: "Max pressure score", kind: "number" }
    ]
  }
];

export function DataIntakeSimulation({ campaigns, segments, currency, adapterMetadata, targetSettings, onSaveTargets, onResetTargets }: DataIntakeSimulationProps) {
  const normalized = normalizeImportRows(rows);
  const summary = normalized.importSummary;
  const totalRevenue = normalized.newsletters.reduce((total, newsletter) => total + newsletter.metrics.revenue, 0);
  const totalDelivered = normalized.newsletters.reduce((total, newsletter) => total + newsletter.metrics.delivered, 0);
  const [draft, setDraft] = useState(targetSettings);
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaigns[0]?.id ?? "");
  const [selectedSegmentId, setSelectedSegmentId] = useState(segments[0]?.id ?? "");
  const selectedCampaignTargets = useMemo(() => resolveTargets(draft, "campaign", selectedCampaignId), [draft, selectedCampaignId]);
  const selectedSegmentTargets = useMemo(() => resolveTargets(draft, "segment", selectedSegmentId), [draft, selectedSegmentId]);

  useEffect(() => {
    setDraft(targetSettings);
  }, [targetSettings]);

  useEffect(() => {
    if (!campaigns.some((campaign) => campaign.id === selectedCampaignId)) {
      setSelectedCampaignId(campaigns[0]?.id ?? "");
    }
  }, [campaigns, selectedCampaignId]);

  useEffect(() => {
    if (!segments.some((segment) => segment.id === selectedSegmentId)) {
      setSelectedSegmentId(segments[0]?.id ?? "");
    }
  }, [segments, selectedSegmentId]);

  const updateGlobalTarget = (key: keyof TargetValues, value: number) => {
    setDraft((current) => ({ ...current, global: { ...current.global, [key]: value } }));
  };

  const updateCampaignTarget = (key: keyof TargetValues, value: number) => {
    if (!selectedCampaignId) return;
    setDraft((current) => ({
      ...current,
      campaigns: {
        ...current.campaigns,
        [selectedCampaignId]: { ...resolveTargets(current, "campaign", selectedCampaignId), [key]: value }
      }
    }));
  };

  const updateSegmentTarget = (key: keyof TargetValues, value: number) => {
    if (!selectedSegmentId) return;
    setDraft((current) => ({
      ...current,
      segments: {
        ...current.segments,
        [selectedSegmentId]: { ...resolveTargets(current, "segment", selectedSegmentId), [key]: value }
      }
    }));
  };

  return (
    <div className="grid gap-4">
      <section className="rounded-xl border border-line bg-card p-5 shadow-soft md:p-6">
        <div className="flex flex-col gap-4 border-b border-line pb-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Adapter readiness</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-ink">Normalized data source</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              The dashboard consumes the demo dataset through the adapter contract before analytics run.
            </p>
          </div>
          <StatusBadge
            severity={adapterMetadata.validation.status === "valid" ? "positive" : adapterMetadata.validation.status === "warning" ? "warning" : "critical"}
            label={adapterMetadata.validation.status === "valid" ? "Valid" : adapterMetadata.validation.status === "warning" ? "Warning" : "Error"}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Campaigns" value={formatNumber(adapterMetadata.recordCounts.campaigns)} />
          <Metric label="Segments" value={formatNumber(adapterMetadata.recordCounts.segments)} />
          <Metric label="Newsletters" value={formatNumber(adapterMetadata.recordCounts.newsletters)} />
          <Metric label="Segment rows" value={formatNumber(adapterMetadata.recordCounts.segmentPerformance)} />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-lg border border-line bg-slate-50/75 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Current adapter</p>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted">Current source</dt>
                <dd className="font-semibold text-ink">{adapterMetadata.source.label}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-line pt-3">
                <dt className="text-muted">Adapter status</dt>
                <dd className="font-semibold capitalize text-ink">{adapterMetadata.validation.status}</dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-muted">
              No live CRM/API integration, upload, scheduled sync, webhook, or OAuth flow is enabled.
            </p>
          </article>

          <article className="rounded-lg border border-line bg-slate-50/75 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Validation warnings and errors</p>
            {[...adapterMetadata.validation.errors, ...adapterMetadata.validation.warnings].length ? (
              <ul className="mt-4 space-y-3">
                {[...adapterMetadata.validation.errors, ...adapterMetadata.validation.warnings].slice(0, 6).map((validationIssue) => (
                  <li
                    key={`${validationIssue.code}-${validationIssue.path}`}
                    className={`rounded-lg border p-3 text-sm leading-6 ${
                      validationIssue.severity === "error"
                        ? "border-rose-200 bg-rose-50 text-rose-900"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                    }`}
                  >
                    {validationIssue.path ? `${validationIssue.path}: ` : ""}{validationIssue.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-6 text-muted">No adapter validation warnings or errors.</p>
            )}
          </article>
        </div>

        <div className="mt-5 rounded-lg border border-line bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Future supported adapters</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {futureAdapterSources.map((source) => (
              <span key={source.id} className="rounded-full border border-line bg-slate-50 px-3 py-1.5 text-xs font-semibold text-muted">
                {source.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-card p-5 shadow-soft md:p-6">
        <div className="flex flex-col gap-4 border-b border-line pb-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Editable business targets</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-ink">Target editor</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Targets persist in this browser via localStorage. Source performance data remains local JSON demo data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-ink"
              onClick={() => onSaveTargets(draft)}
            >
              Save targets
            </button>
            <button
              type="button"
              className="rounded-md border border-line bg-slate-50 px-4 py-2 text-sm font-semibold text-muted transition hover:bg-white hover:text-ink focus:outline-none focus:ring-2 focus:ring-ink"
              onClick={onResetTargets}
            >
              Reset to demo defaults
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          <TargetForm title="Global targets" description="Used wherever a campaign or segment override is not set." values={draft.global} currency={currency} onChange={updateGlobalTarget} />

          <TargetForm
            title="Campaign targets"
            description="No newsletter-level targets are used in this demo."
            values={selectedCampaignTargets}
            currency={currency}
            selector={
              <select className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-ink" value={selectedCampaignId} onChange={(event) => setSelectedCampaignId(event.target.value)}>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                ))}
              </select>
            }
            onChange={updateCampaignTarget}
          />

          <TargetForm
            title="Segment targets"
            description="Segment targets support movement and pressure decisions."
            values={selectedSegmentTargets}
            currency={currency}
            selector={
              <select className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-ink" value={selectedSegmentId} onChange={(event) => setSelectedSegmentId(event.target.value)}>
                {segments.map((segment) => (
                  <option key={segment.id} value={segment.id}>{segment.name}</option>
                ))}
              </select>
            }
            onChange={updateSegmentTarget}
          />
        </div>
      </section>

      <section className="rounded-xl border border-line bg-card p-5 shadow-soft md:p-6">
      <div className="flex flex-col gap-4 border-b border-line pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Cleaned Excel/API export simulation</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-ink">Data intake rehearsal</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            A static preview of the future intake flow: cleaned row-level export, validation, normalization, then dashboard-ready data.
          </p>
        </div>
        <StatusBadge severity={summary.status === "ready" ? "positive" : summary.status === "needs_review" ? "warning" : "critical"} label={summary.status.replaceAll("_", " ")} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Import rows" value={formatNumber(summary.rowCount)} />
        <Metric label="Newsletters" value={formatNumber(summary.newsletterCount)} />
        <Metric label="Campaigns" value={formatNumber(summary.campaignCount)} />
        <Metric label="Segments" value={formatNumber(summary.segmentCount)} />
        <Metric label="Validation issues" value={formatNumber(summary.issueCount)} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-lg border border-line bg-slate-50/75 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Validation result</p>
          {normalized.validationIssues.length ? (
            <ul className="mt-4 space-y-3">
              {normalized.validationIssues.slice(0, 5).map((issue) => (
                <li key={issue.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                  Row {issue.rowIndex === null ? "n/a" : issue.rowIndex + 1}: {issue.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm leading-6 text-muted">
              No blocking issues detected. Required fields are present, metric values are valid, and newsletter-segment rows are unique.
            </p>
          )}
          <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-muted">
            This is static demo data only. No upload, backend, database, external API, or persistence exists in this sprint.
          </p>
        </article>

        <article className="rounded-lg border border-line bg-slate-50/75 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Normalized preview</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <PreviewStat label="Dashboard newsletters" value={formatNumber(normalized.newsletters.length)} />
            <PreviewStat label="Delivered" value={formatNumber(totalDelivered)} />
            <PreviewStat label="Revenue" value={formatCurrency(totalRevenue, normalized.meta.currency)} />
          </div>
          <div className="mt-5 overflow-hidden rounded-lg border border-line">
            <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr] bg-ink px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-card">
              <span>Newsletter</span>
              <span>Campaign</span>
              <span>Segments</span>
            </div>
            {normalized.newsletters.slice(0, 4).map((newsletter) => (
              <div key={newsletter.id} className="grid grid-cols-[1.2fr_0.9fr_0.9fr] border-t border-line bg-card px-4 py-3 text-sm">
                <span className="font-medium text-ink">{newsletter.name}</span>
                <span className="text-muted">{newsletter.campaign.name}</span>
                <span className="text-muted">{newsletter.segmentPerformance.length}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
    </div>
  );
}

function TargetForm({
  title,
  description,
  values,
  currency,
  selector,
  onChange
}: {
  title: string;
  description: string;
  values: TargetValues;
  currency: string;
  selector?: ReactNode;
  onChange: (key: keyof TargetValues, value: number) => void;
}) {
  return (
    <article className="rounded-lg border border-line bg-slate-50/75 p-4">
      <div className="min-h-[96px]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{title}</p>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        {selector ? <div className="mt-3">{selector}</div> : null}
      </div>
      <div className="mt-4 grid gap-4">
        {targetGroups.map((group) => (
          <fieldset key={group.title} className="rounded-lg border border-line bg-white p-3">
            <legend className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{group.title}</legend>
            <div className="mt-2 grid gap-3">
              {group.fields.map((field) => (
                <label key={field.key} className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{field.label}</span>
                  <div className="mt-1 flex items-center rounded-md border border-line bg-[#fbfbf8] px-3 py-2 focus-within:ring-2 focus-within:ring-ink">
                    {field.kind === "currency" ? <span className="mr-2 text-xs font-semibold text-muted">{currency}</span> : null}
                    <input
                      type="text"
                      inputMode="decimal"
                      className="w-full bg-transparent text-sm font-semibold text-ink outline-none"
                      value={displayTargetInputValue(values[field.key], field.kind)}
                      onChange={(event) => onChange(field.key, parseTargetInputValue(event.target.value, field.kind))}
                    />
                    {field.kind === "percent" ? <span className="ml-2 text-xs font-semibold text-muted">%</span> : null}
                  </div>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border border-line bg-slate-50/80 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-normal text-ink">{value}</p>
    </article>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-card p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 text-base font-semibold text-ink">{value}</p>
    </div>
  );
}
