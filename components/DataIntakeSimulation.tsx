import { useEffect, useMemo, useState, type ReactNode } from "react";
import importRows from "@/data/import-sample.json";
import sampleExportRows from "@/data/sample-newsletter-export-rows.json";
import type { Campaign, Segment } from "@/lib/newsletterTypes";
import type { CsvExportRow } from "@/lib/adapters/csvExportAdapter";
import { buildRowDiagnostics, csvExportAdapter } from "@/lib/adapters/csvExportAdapter";
import {
  buildColumnMappingPreview,
  buildEditableColumnMapping,
  buildImportReadinessSummary,
  applyMappingToRows
} from "@/lib/adapters/columnMapping";
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
const sampleCsvRows = sampleExportRows as CsvExportRow[];
const sampleCsvResult = csvExportAdapter.normalize(sampleCsvRows);
const sampleRowDiagnostics = buildRowDiagnostics(sampleCsvRows);
const sampleColumnMapping = buildColumnMappingPreview(
  sampleCsvRows[0] as Record<string, unknown> | undefined
);
const sampleImportSummary = buildImportReadinessSummary(
  sampleRowDiagnostics,
  sampleCsvResult.dataset.metadata.recordCounts,
  sampleCsvResult.dataset.metadata.validation.status
);
const availableSourceColumns = sampleCsvRows[0]
  ? Object.keys(sampleCsvRows[0] as Record<string, unknown>)
  : [];

const MAPPING_STORAGE_KEY = "campaign_pulse_column_mapping_v1";

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
              The dashboard consumes Demo JSON through the adapter contract. A static CSV/export fixture now proves a second source can reach the same normalized shape.
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

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <article className="rounded-lg border border-line bg-slate-50/75 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Current adapter</p>
                <h3 className="mt-2 text-lg font-semibold text-ink">Demo JSON</h3>
              </div>
              <StatusBadge
                severity={adapterMetadata.validation.status === "valid" ? "positive" : adapterMetadata.validation.status === "warning" ? "warning" : "critical"}
                label={adapterMetadata.validation.status}
              />
            </div>
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
              This remains the active dashboard source.
            </p>
          </article>

          <article className="rounded-lg border border-line bg-slate-50/75 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Import readiness</p>
                <h3 className="mt-2 text-lg font-semibold text-ink">Sample CSV adapter</h3>
              </div>
              <StatusBadge
                severity={sampleCsvResult.dataset.metadata.validation.status === "valid" ? "positive" : sampleCsvResult.dataset.metadata.validation.status === "warning" ? "warning" : "critical"}
                label={sampleCsvResult.dataset.metadata.validation.status}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <PreviewStat label="Campaigns" value={formatNumber(sampleCsvResult.dataset.metadata.recordCounts.campaigns)} />
              <PreviewStat label="Segments" value={formatNumber(sampleCsvResult.dataset.metadata.recordCounts.segments)} />
              <PreviewStat label="Newsletters" value={formatNumber(sampleCsvResult.dataset.metadata.recordCounts.newsletters)} />
              <PreviewStat label="Segment rows" value={formatNumber(sampleCsvResult.dataset.metadata.recordCounts.segmentPerformance)} />
            </div>
            <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-muted">
              Static fake export rows only. The adapter is implemented; upload UI is not implemented yet.
            </p>
          </article>
        </div>

        {[...adapterMetadata.validation.errors, ...adapterMetadata.validation.warnings].length ? (
          <article className="mt-5 rounded-lg border border-line bg-slate-50/75 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Demo JSON validation warnings and errors</p>
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
          </article>
        ) : null}
      </section>

      <section className="rounded-xl border border-line bg-card p-5 shadow-soft md:p-6">
        <div className="flex flex-col gap-4 border-b border-line pb-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Import-readiness console</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-ink">CSV column mapping preview</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Static inspection of how detected source columns map to normalized fields. No upload UI yet.
            </p>
          </div>
          <StatusBadge
            severity={sampleImportSummary.validationStatus === "valid" ? "positive" : sampleImportSummary.validationStatus === "warning" ? "warning" : "critical"}
            label={sampleImportSummary.validationStatus}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Metric label="Total rows" value={formatNumber(sampleImportSummary.totalRows)} />
          <Metric label="Accepted" value={formatNumber(sampleImportSummary.acceptedRows)} />
          <Metric label="Rejected" value={formatNumber(sampleImportSummary.rejectedRows)} />
          <Metric label="Campaigns" value={formatNumber(sampleImportSummary.normalizedCampaigns)} />
          <Metric label="Newsletters" value={formatNumber(sampleImportSummary.normalizedNewsletters)} />
          <Metric label="Segment rows" value={formatNumber(sampleImportSummary.normalizedSegmentRows)} />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <article className="rounded-lg border border-line bg-slate-50/75 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Column mapping</p>
            <p className="mt-1 text-xs text-muted">
              Exact: {sampleColumnMapping.stats.exact} &nbsp;·&nbsp; Inferred: {sampleColumnMapping.stats.inferred} &nbsp;·&nbsp; Missing: {sampleColumnMapping.stats.missing}
            </p>
            <div className="mt-4 overflow-hidden rounded-lg border border-line">
              <div className="grid grid-cols-[0.9fr_1.1fr_0.6fr_0.5fr] bg-ink px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-card">
                <span>Source field</span>
                <span>Normalized field</span>
                <span>Confidence</span>
                <span>Required</span>
              </div>
              {sampleColumnMapping.mappings.map((mapping) => (
                <div
                  key={mapping.sourceField}
                  className={`grid grid-cols-[0.9fr_1.1fr_0.6fr_0.5fr] border-t border-line px-3 py-2 text-xs ${
                    mapping.confidence === "missing" && mapping.required
                      ? "bg-rose-50"
                      : mapping.confidence === "missing"
                        ? "bg-amber-50"
                        : "bg-card"
                  }`}
                >
                  <span className="font-mono text-ink">{mapping.sourceField}</span>
                  <span className="text-muted">{mapping.normalizedField}</span>
                  <span className={`font-semibold ${
                    mapping.confidence === "exact" ? "text-emerald-700" :
                    mapping.confidence === "inferred" ? "text-amber-700" :
                    "text-rose-700"
                  }`}>
                    {mapping.confidence}
                  </span>
                  <span className="text-muted">{mapping.required ? "required" : "optional"}</span>
                </div>
              ))}
            </div>
            {sampleColumnMapping.missingRequiredFields.length > 0 ? (
              <p className="mt-3 text-xs text-rose-700">
                Missing required: {sampleColumnMapping.missingRequiredFields.join(", ")}
              </p>
            ) : (
              <p className="mt-3 text-xs text-emerald-700">All required fields are present.</p>
            )}
          </article>

          <article className="rounded-lg border border-line bg-slate-50/75 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Required fields checklist</p>
            <ul className="mt-4 space-y-2">
              {sampleColumnMapping.mappings.filter((mapping) => mapping.required).map((mapping) => (
                <li key={mapping.sourceField} className="flex items-start gap-3 text-xs">
                  <span className={`mt-0.5 shrink-0 text-sm leading-none ${mapping.confidence === "exact" ? "text-emerald-600" : "text-rose-500"}`}>
                    {mapping.confidence === "exact" ? "✓" : "✗"}
                  </span>
                  <div className="min-w-0">
                    <span className="font-mono font-semibold text-ink">{mapping.sourceField}</span>
                    <span className="ml-2 text-muted">{mapping.description}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-line pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Optional fields</p>
              <ul className="mt-2 space-y-1.5">
                {sampleColumnMapping.mappings.filter((mapping) => !mapping.required).map((mapping) => (
                  <li key={mapping.sourceField} className="flex items-start gap-3 text-xs text-muted">
                    <span className="mt-0.5 shrink-0 text-sm leading-none text-slate-400">
                      {mapping.confidence === "exact" ? "○" : "–"}
                    </span>
                    <span className="font-mono">{mapping.sourceField}</span>
                    <span>{mapping.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>

        {sampleRowDiagnostics.some((d) => !d.accepted) ? (
          <article className="mt-5 rounded-lg border border-line bg-slate-50/75 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Rejected-row diagnostics</p>
            <div className="mt-4 overflow-hidden rounded-lg border border-line">
              <div className="grid grid-cols-[0.4fr_0.8fr_0.8fr_0.9fr_1fr_1.1fr] bg-ink px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-card">
                <span>Row</span>
                <span>Newsletter</span>
                <span>Campaign</span>
                <span>Error type</span>
                <span>Field / value</span>
                <span>Reason</span>
              </div>
              {sampleRowDiagnostics
                .filter((d) => !d.accepted)
                .flatMap((d) =>
                  d.errors.map((e, errorIndex) => (
                    <div
                      key={`${d.rowNumber}-${errorIndex}`}
                      className="grid grid-cols-[0.4fr_0.8fr_0.8fr_0.9fr_1fr_1.1fr] border-t border-line bg-rose-50 px-3 py-2 text-xs"
                    >
                      <span className="font-semibold text-rose-700">{d.rowNumber}</span>
                      <span className="truncate text-muted" title={d.newsletterId}>{d.newsletterId || "—"}</span>
                      <span className="truncate text-muted" title={d.campaignId}>{d.campaignId || "—"}</span>
                      <span className="font-semibold text-rose-800">{e.errorType}</span>
                      <span className="truncate text-muted">
                        {e.field ? <span className="font-mono">{e.field}</span> : null}
                        {e.rawValue ? <span className="ml-1 text-rose-600">{e.rawValue}</span> : null}
                      </span>
                      <span className="text-muted">{e.reason}</span>
                    </div>
                  ))
                )
              }
            </div>
          </article>
        ) : (
          <article className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold text-emerald-800">
              All {sampleImportSummary.totalRows} sample rows accepted — no rejected rows in the static fixture.
            </p>
          </article>
        )}

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <article className="rounded-lg border border-line bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Future supported sources</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {futureAdapterSources.map((source) => (
                <span key={source.id} className="rounded-full border border-line bg-slate-50 px-3 py-1.5 text-xs font-semibold text-muted">
                  {source.label}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-muted">No live CRM/ESP API, OAuth, scheduled sync, webhook, or secrets are enabled.</p>
          </article>

          {sampleColumnMapping.unmappedSourceFields.length > 0 ? (
            <article className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">Unmapped source columns</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {sampleColumnMapping.unmappedSourceFields.map((field) => (
                  <span key={field} className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-mono font-semibold text-amber-800">
                    {field}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-amber-700">These columns are present in the source but have no mapping in the normalized schema.</p>
            </article>
          ) : null}
        </div>

        <p className="mt-4 text-xs leading-5 text-muted">
          Static fake fixture only. No upload UI, live CRM/ESP API, backend, database, auth, OAuth, or scheduled sync.
        </p>
      </section>

      <EditableMappingSection />

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

function EditableMappingSection() {
  const [savedMapping, setSavedMapping] = useState<Record<string, string | null> | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(MAPPING_STORAGE_KEY);
      if (stored) setSavedMapping(JSON.parse(stored) as Record<string, string | null>);
    } catch {
      // localStorage unavailable or invalid JSON — start with null
    }
  }, []);

  const editableMapping = useMemo(
    () => buildEditableColumnMapping(availableSourceColumns, savedMapping ?? undefined),
    [savedMapping]
  );

  const mappedRows = useMemo(
    () => applyMappingToRows(sampleCsvRows as Record<string, unknown>[], editableMapping.entries),
    [editableMapping]
  );

  const mappedDiagnostics = useMemo(() => buildRowDiagnostics(mappedRows), [mappedRows]);

  const mappedSummary = useMemo(() => {
    const result = csvExportAdapter.normalize(mappedRows);
    return buildImportReadinessSummary(
      mappedDiagnostics,
      result.dataset.metadata.recordCounts,
      result.dataset.metadata.validation.status
    );
  }, [mappedDiagnostics, mappedRows]);

  const hasCustomMapping = savedMapping !== null && Object.keys(savedMapping).length > 0;

  const handleEntryChange = (sourceField: string, newColumn: string | null) => {
    const updated = { ...(savedMapping ?? {}), [sourceField]: newColumn };
    setSavedMapping(updated);
    try {
      localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleResetEntry = (sourceField: string) => {
    const updated = { ...(savedMapping ?? {}) };
    delete updated[sourceField];
    const next = Object.keys(updated).length > 0 ? updated : null;
    setSavedMapping(next);
    try {
      if (next) {
        localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(next));
      } else {
        localStorage.removeItem(MAPPING_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  };

  const handleResetAll = () => {
    setSavedMapping(null);
    try {
      localStorage.removeItem(MAPPING_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const confidenceColor = (confidence: string) => {
    if (confidence === "exact") return "text-emerald-700";
    if (confidence === "inferred") return "text-amber-700";
    if (confidence === "manual") return "text-blue-700";
    return "text-rose-700";
  };

  const statusColor = (state: string) => {
    if (state === "mapped") return "text-emerald-700";
    if (state === "duplicate") return "text-amber-700";
    return "text-rose-700";
  };

  const rowBg = (state: string, required: boolean) => {
    if (state === "duplicate") return "bg-amber-50";
    if ((state === "missing" && required) || state === "invalid") return "bg-rose-50";
    return "bg-card";
  };

  return (
    <section className="rounded-xl border border-line bg-card p-5 shadow-soft md:p-6">
      <div className="flex flex-col gap-4 border-b border-line pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Editable mapping preview</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-ink">Column mapping editor</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Remap source columns to normalized fields before import. Exact and inferred matches are auto-detected;
            override any field using the dropdowns. Custom mapping persists in localStorage.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {hasCustomMapping ? (
            <button
              type="button"
              onClick={handleResetAll}
              className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-ink"
            >
              Reset all to detected
            </button>
          ) : null}
          <StatusBadge
            severity={editableMapping.warnings.length > 0 ? "critical" : "positive"}
            label={editableMapping.warnings.length > 0
              ? `${editableMapping.warnings.length} warning${editableMapping.warnings.length > 1 ? "s" : ""}`
              : "Mapping ready"}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Total rows" value={formatNumber(mappedSummary.totalRows)} />
        <Metric label="Accepted" value={formatNumber(mappedSummary.acceptedRows)} />
        <Metric label="Rejected" value={formatNumber(mappedSummary.rejectedRows)} />
        <Metric label="Campaigns" value={formatNumber(mappedSummary.normalizedCampaigns)} />
        <Metric label="Newsletters" value={formatNumber(mappedSummary.normalizedNewsletters)} />
        <Metric label="Segment rows" value={formatNumber(mappedSummary.normalizedSegmentRows)} />
      </div>

      {editableMapping.warnings.length > 0 ? (
        <div className="mt-5 space-y-2">
          {editableMapping.warnings.map((warning, warningIndex) => (
            <div
              key={warningIndex}
              className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900"
            >
              <span className="shrink-0 text-amber-600">!</span>
              {warning}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <article className="rounded-lg border border-line bg-slate-50/75 p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Field mapping</p>
            <p className="text-xs text-muted">
              {editableMapping.entries.filter((e) => e.confidence === "exact").length} exact
              {editableMapping.entries.filter((e) => e.confidence === "inferred").length > 0
                ? ` · ${editableMapping.entries.filter((e) => e.confidence === "inferred").length} inferred`
                : null}
              {editableMapping.entries.filter((e) => e.confidence === "manual").length > 0
                ? ` · ${editableMapping.entries.filter((e) => e.confidence === "manual").length} manual`
                : null}
              {editableMapping.entries.filter((e) => e.confidence === "missing").length > 0
                ? ` · ${editableMapping.entries.filter((e) => e.confidence === "missing").length} missing`
                : null}
            </p>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-line">
            <div className="grid grid-cols-[0.35fr_0.75fr_1fr_0.55fr_0.55fr_0.3fr] bg-ink px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-card">
              <span>Type</span>
              <span>Normalized field</span>
              <span>Source column</span>
              <span>Confidence</span>
              <span>Status</span>
              <span></span>
            </div>
            {editableMapping.entries.map((entry) => (
              <div
                key={entry.sourceField}
                className={`grid grid-cols-[0.35fr_0.75fr_1fr_0.55fr_0.55fr_0.3fr] items-center border-t border-line px-3 py-2 text-xs ${rowBg(entry.validationState, entry.required)}`}
              >
                <span className={`font-semibold ${entry.required ? "text-ink" : "text-slate-400"}`}>
                  {entry.required ? "req" : "opt"}
                </span>
                <div className="min-w-0 pr-2">
                  <div className="truncate font-mono font-semibold text-ink">{entry.sourceField}</div>
                </div>
                <div className="pr-2">
                  <select
                    className="w-full rounded border border-line bg-white px-2 py-1 text-xs font-semibold text-ink outline-none focus:ring-1 focus:ring-ink"
                    value={entry.selectedSourceColumn ?? ""}
                    onChange={(e) => handleEntryChange(entry.sourceField, e.target.value || null)}
                  >
                    <option value="">— unmapped —</option>
                    {availableSourceColumns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <span className={`font-semibold ${confidenceColor(entry.confidence)}`}>
                  {entry.confidence}
                </span>
                <span className={`font-semibold ${statusColor(entry.validationState)}`}>
                  {entry.validationState}
                </span>
                <div className="text-right">
                  {savedMapping && entry.sourceField in savedMapping ? (
                    <button
                      type="button"
                      onClick={() => handleResetEntry(entry.sourceField)}
                      className="text-[10px] font-semibold text-muted underline hover:text-ink"
                      title={`Reset to auto-detected: ${entry.detectedSourceColumn ?? "none"}`}
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs leading-5 text-muted">
            {hasCustomMapping
              ? "Custom mapping is active. Per-field Reset returns to auto-detected. Reset all clears localStorage."
              : "Auto-detected mapping. Use dropdowns to override any field. Changes persist in localStorage."}
          </p>
        </article>

        <article className="rounded-lg border border-line bg-slate-50/75 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Required fields after mapping</p>
          <ul className="mt-4 space-y-2">
            {editableMapping.entries.filter((e) => e.required).map((entry) => (
              <li key={entry.sourceField} className="flex items-start gap-3 text-xs">
                <span className={`mt-0.5 shrink-0 text-sm leading-none ${
                  entry.validationState === "mapped" ? "text-emerald-600" :
                  entry.validationState === "duplicate" ? "text-amber-500" :
                  "text-rose-500"
                }`}>
                  {entry.validationState === "mapped" ? "✓" : entry.validationState === "duplicate" ? "!" : "✗"}
                </span>
                <div className="min-w-0">
                  <span className="font-mono font-semibold text-ink">{entry.sourceField}</span>
                  {entry.selectedSourceColumn && entry.selectedSourceColumn !== entry.sourceField ? (
                    <span className="ml-2 font-mono text-blue-700">← {entry.selectedSourceColumn}</span>
                  ) : null}
                  <span className="ml-2 text-muted">{entry.description}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-line pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Alias map (auto-inferred)</p>
            <div className="mt-2 grid gap-1">
              {[
                ["send_date", "sendDate"],
                ["email_name", "newsletterName"],
                ["campaign", "campaignName"],
                ["recipients", "sent"],
                ["opens_unique", "opens"],
                ["clicks_unique", "clicks"],
                ["placed_order", "orders"],
                ["revenue_eur", "revenue"],
                ["unsub", "unsubscribes"],
                ["spam", "spamComplaints"]
              ].map(([alias, canonical]) => (
                <div key={alias} className="flex items-center gap-2 text-[10px] text-muted">
                  <span className="font-mono text-slate-500">{alias}</span>
                  <span className="text-slate-300">→</span>
                  <span className="font-mono text-ink">{canonical}</span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>

      {mappedDiagnostics.some((d) => !d.accepted) ? (
        <article className="mt-5 rounded-lg border border-line bg-slate-50/75 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Diagnostics after mapping</p>
          <div className="mt-4 overflow-hidden rounded-lg border border-line">
            <div className="grid grid-cols-[0.4fr_0.8fr_0.8fr_0.9fr_1fr_1.1fr] bg-ink px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-card">
              <span>Row</span>
              <span>Newsletter</span>
              <span>Campaign</span>
              <span>Error type</span>
              <span>Field / value</span>
              <span>Reason</span>
            </div>
            {mappedDiagnostics
              .filter((d) => !d.accepted)
              .flatMap((d) =>
                d.errors.map((e, errorIndex) => (
                  <div
                    key={`${d.rowNumber}-${errorIndex}`}
                    className="grid grid-cols-[0.4fr_0.8fr_0.8fr_0.9fr_1fr_1.1fr] border-t border-line bg-rose-50 px-3 py-2 text-xs"
                  >
                    <span className="font-semibold text-rose-700">{d.rowNumber}</span>
                    <span className="truncate text-muted" title={d.newsletterId}>{d.newsletterId || "—"}</span>
                    <span className="truncate text-muted" title={d.campaignId}>{d.campaignId || "—"}</span>
                    <span className="font-semibold text-rose-800">{e.errorType}</span>
                    <span className="truncate text-muted">
                      {e.field ? <span className="font-mono">{e.field}</span> : null}
                      {e.rawValue ? <span className="ml-1 text-rose-600">{e.rawValue}</span> : null}
                    </span>
                    <span className="text-muted">{e.reason}</span>
                  </div>
                ))
              )}
          </div>
        </article>
      ) : (
        <article className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold text-emerald-800">
            All {mappedSummary.totalRows} rows accepted with the current mapping.
          </p>
        </article>
      )}

      <p className="mt-4 text-xs leading-5 text-muted">
        Custom mapping persists in localStorage under <span className="font-mono">{MAPPING_STORAGE_KEY}</span>.
        No upload UI, live CRM/ESP API, backend, database, auth, OAuth, or scheduled sync.
      </p>
    </section>
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
