"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis
} from "recharts";
import audienceMembersJson from "@/data/audience-members.json";
import newsletterPerformance from "@/data/newsletter-performance.json";
import defaultTargets from "@/data/targets.json";
import { CampaignPerformance } from "@/components/CampaignPerformance";
import { DataIntakeSimulation } from "@/components/DataIntakeSimulation";
import { MonthlyCalendar, type CalendarView } from "@/components/MonthlyCalendar";
import { MonthlyReport } from "@/components/MonthlyReport";
import { NewsletterDetailDrawer } from "@/components/NewsletterDetailDrawer";
import { NewsletterTable } from "@/components/NewsletterTable";
import { SaturationHeatmap } from "@/components/SaturationHeatmap";
import { SegmentIntelligence } from "@/components/SegmentIntelligence";
import { StatusBadge } from "@/components/StatusBadge";
import { TargetComparisonCard, TargetStatusBadge } from "@/components/TargetStatusBadge";
import { demoJsonAdapter } from "@/lib/adapters/demoJsonAdapter";
import { formatCurrency, formatCurrencyPrecise, formatMonth, formatNumber, formatPercent } from "@/lib/formatters";
import { getGlobalInsights, getRecommendedNextActions } from "@/lib/newsletterInsights";
import { getOverviewAnalytics, type CampaignContributionPoint, type OverviewAnalytics, type SegmentOpportunityPoint } from "@/lib/overviewAnalytics";
import { evaluateActualsAgainstTargets, resolveTargets } from "@/lib/targetEvaluation";
import { getDefaultTargetSettings, loadTargetSettings, resetTargetSettings, saveTargetSettings } from "@/lib/targetSettings";
import type { TargetComparisonMap, TargetSettings } from "@/lib/targetTypes";
import {
  calculateClickRate,
  calculateClickToOpenRate,
  calculateOpenRate,
  calculateRevenuePerRecipient,
  filterNewslettersByMonth,
  getAvailableMonths,
  getBestCampaign,
  getBestNewsletter,
  getBestSegment,
  getLatestMonth,
  getMonthlySummary,
  getNewsletterRank,
  getWeakestCampaign,
  getWorstNewsletter,
} from "@/lib/newsletterMetrics";
import type { AudienceMember } from "@/lib/audienceTypes";
import type { Campaign, Newsletter, NewsletterInsight, RecommendedAction, Segment } from "@/lib/newsletterTypes";

const adapterResult = demoJsonAdapter.normalize({
  ...newsletterPerformance,
  audienceMembers: audienceMembersJson,
  targets: defaultTargets
});
const data = adapterResult.dataset;
const availableMonths = getAvailableMonths(data.newsletters);

type ScreenId = "overview" | "calendar" | "performance" | "campaigns" | "segments" | "insights" | "report" | "data-intake";

const navigation: { id: ScreenId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "calendar", label: "Calendar" },
  { id: "performance", label: "Newsletters" },
  { id: "campaigns", label: "Campaigns" },
  { id: "segments", label: "Audience" },
  { id: "insights", label: "Insights" },
  { id: "report", label: "Report" },
  { id: "data-intake", label: "Data" }
];

const screenCopy: Record<ScreenId, { title: string; description: string }> = {
  overview: {
    title: "Overview",
    description: "Read the monthly takeaway, then choose the next workspace."
  },
  calendar: {
    title: "Calendar",
    description: "Plan and inspect newsletter send cadence."
  },
  performance: {
    title: "Newsletters",
    description: "Compare individual sends by revenue, engagement, and fatigue risk."
  },
  campaigns: {
    title: "Campaigns",
    description: "Find which campaign systems should be repeated, repaired, or rested."
  },
  segments: {
    title: "Audience",
    description: "Select a segment, inspect audience value and pressure, then decide whether to protect, scale, cool down, rebuild, or test editorial."
  },
  insights: {
    title: "Insights",
    description: "Prioritized actions generated from performance and pressure signals."
  },
  report: {
    title: "Monthly report",
    description: "Read the month as a calm executive memo with evidence and next moves."
  },
  "data-intake": {
    title: "Data",
    description: "Inspect the active demo adapter, normalized records, validation results, targets, and intake rehearsal."
  }
};

export default function Home() {
  const [selectedMonth, setSelectedMonth] = useState(getLatestMonth(data.newsletters));
  const [activeScreen, setActiveScreen] = useState<ScreenId>("overview");
  const [selectedNewsletter, setSelectedNewsletter] = useState<Newsletter | null>(null);
  const [targetSettings, setTargetSettings] = useState<TargetSettings>(() => getDefaultTargetSettings(data.targets ?? undefined));

  const newsletters = useMemo(() => filterNewslettersByMonth(data.newsletters, selectedMonth), [selectedMonth]);
  const campaigns = useMemo(() => {
    const activeCampaignIds = new Set(newsletters.map((newsletter) => newsletter.campaign.id));
    return data.campaigns.filter((campaign) => activeCampaignIds.has(campaign.id));
  }, [newsletters]);
  const segments = useMemo(() => {
    const activeSegmentIds = new Set(newsletters.flatMap((newsletter) => newsletter.segmentPerformance.map((segment) => segment.segmentId)));
    return data.segments.filter((segment) => activeSegmentIds.has(segment.id));
  }, [newsletters]);
  const insights = useMemo(() => getGlobalInsights(newsletters, campaigns, segments), [campaigns, newsletters, segments]);
  const actions = useMemo(() => getRecommendedNextActions(insights), [insights]);

  useEffect(() => {
    setTargetSettings(loadTargetSettings(data.targets ?? undefined));
  }, []);

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setSelectedNewsletter(null);
  };

  const handleSaveTargets = (settings: TargetSettings) => {
    setTargetSettings(saveTargetSettings(settings));
  };

  const handleResetTargets = () => {
    setTargetSettings(resetTargetSettings(data.targets ?? undefined));
  };

  const copy = screenCopy[activeScreen];

  return (
    <div className="min-h-screen">
      <div className="mx-auto grid max-w-[1920px] gap-4 px-4 py-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-5 lg:py-5">
        <ProductSidebar activeScreen={activeScreen} onScreenChange={setActiveScreen} />

        <main className="min-w-0">
          <TopBar
            projectName={data.metadata.sourceMetadata.projectName}
            activeScreen={activeScreen}
            month={selectedMonth}
            availableMonths={availableMonths}
            onMonthChange={handleMonthChange}
            onScreenChange={setActiveScreen}
          />

          <section className="mt-5 border-b border-line pb-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{navigation.find((item) => item.id === activeScreen)?.label}</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal text-ink md:text-3xl">{copy.title}</h1>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-muted">{copy.description}</p>
            </div>
          </section>

          <div className="mt-5">
            {newsletters.length ? (
              <ScreenContent
                screen={activeScreen}
                month={selectedMonth}
                availableMonths={availableMonths}
                currency={data.metadata.sourceMetadata.currency}
                newsletters={newsletters}
                allNewsletters={data.newsletters}
                campaigns={campaigns}
                allCampaigns={data.campaigns}
                segments={segments}
                allSegments={data.segments}
                audienceMembers={data.audienceMembers}
                adapterMetadata={data.metadata}
                targetSettings={targetSettings}
                insights={insights}
                actions={actions}
                onMonthChange={handleMonthChange}
                onScreenChange={setActiveScreen}
                onSelectNewsletter={setSelectedNewsletter}
                onSaveTargets={handleSaveTargets}
                onResetTargets={handleResetTargets}
              />
            ) : (
              <EmptyMonth month={selectedMonth} />
            )}
          </div>
        </main>
      </div>

      <NewsletterDetailDrawer newsletter={selectedNewsletter} newsletters={newsletters} campaigns={campaigns} onClose={() => setSelectedNewsletter(null)} />
    </div>
  );
}

function ProductSidebar({ activeScreen, onScreenChange }: { activeScreen: ScreenId; onScreenChange: (screen: ScreenId) => void }) {
  return (
    <aside className="no-print lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)]">
      <div className="flex h-full flex-col rounded-xl border border-ink/80 bg-ink p-4 text-card shadow-soft">
        <div className="border-b border-white/10 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-300">Campaign Pulse</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-normal text-white">Newsletter command center</h2>
        </div>

        <nav className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1" aria-label="Product navigation">
          {navigation.map((item) => {
            const isActive = item.id === activeScreen;
            return (
              <button
                key={item.id}
                type="button"
                className={`group flex min-h-[48px] items-center rounded-lg border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-card ${
                  isActive
                    ? "border-slate-200 bg-white text-ink"
                    : "border-white/10 bg-white/[0.03] text-stone-300 hover:border-white/25 hover:bg-white/[0.07] hover:text-white"
                }`}
                onClick={() => onScreenChange(item.id)}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="block text-base font-semibold">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto hidden rounded-lg border border-white/10 bg-white/[0.05] p-4 text-sm leading-6 text-stone-300 lg:block">
          <p className="font-semibold text-white">Static dataset</p>
          <p className="mt-2">Local JSON facts, computed metrics, no backend.</p>
        </div>
      </div>
    </aside>
  );
}

function TopBar({
  projectName,
  activeScreen,
  month,
  availableMonths,
  onMonthChange,
  onScreenChange
}: {
  projectName: string;
  activeScreen: ScreenId;
  month: string;
  availableMonths: string[];
  onMonthChange: (month: string) => void;
  onScreenChange: (screen: ScreenId) => void;
}) {
  return (
    <header className="no-print relative z-20 rounded-xl border border-line bg-white/95 px-4 py-3 shadow-soft backdrop-blur md:px-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-lg font-semibold tracking-normal text-ink md:text-xl">{projectName}</h2>
            <span className="rounded-md border border-line bg-slate-50/80 px-2.5 py-1 text-xs font-semibold text-muted">{formatMonth(month)}</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">Static local dataset, metrics computed from raw newsletter facts.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px] xl:w-[520px]">
          <label className="block lg:hidden">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Screen</span>
            <select
              className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:ring-2 focus:ring-ink"
              value={activeScreen}
              onChange={(event) => onScreenChange(event.target.value as ScreenId)}
              aria-label="Select product screen"
            >
              {navigation.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Month</span>
            <select
              className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:ring-2 focus:ring-ink"
              value={month}
              onChange={(event) => onMonthChange(event.target.value)}
              aria-label="Select reporting month"
            >
              {availableMonths.map((availableMonth) => (
                <option key={availableMonth} value={availableMonth}>
                  {formatMonth(availableMonth)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </header>
  );
}

function ScreenContent({
  screen,
  month,
  availableMonths,
  currency,
  newsletters,
  allNewsletters,
  campaigns,
  allCampaigns,
  segments,
  allSegments,
  audienceMembers,
  adapterMetadata,
  targetSettings,
  insights,
  actions,
  onMonthChange,
  onScreenChange,
  onSelectNewsletter,
  onSaveTargets,
  onResetTargets
}: {
  screen: ScreenId;
  month: string;
  availableMonths: string[];
  currency: string;
  newsletters: Newsletter[];
  allNewsletters: Newsletter[];
  campaigns: Campaign[];
  allCampaigns: Campaign[];
  segments: Segment[];
  allSegments: Segment[];
  audienceMembers: AudienceMember[];
  adapterMetadata: typeof data.metadata;
  targetSettings: TargetSettings;
  insights: NewsletterInsight[];
  actions: RecommendedAction[];
  onMonthChange: (month: string) => void;
  onScreenChange: (screen: ScreenId) => void;
  onSelectNewsletter: (newsletter: Newsletter) => void;
  onSaveTargets: (settings: TargetSettings) => void;
  onResetTargets: () => void;
}) {
  const [isAudienceDrillIn, setIsAudienceDrillIn] = useState(false);

  useEffect(() => {
    if (screen !== "segments") {
      setIsAudienceDrillIn(false);
    }
  }, [screen]);

  if (screen === "overview") {
    return (
      <OverviewScreen
        currency={currency}
        month={month}
        newsletters={newsletters}
        allNewsletters={allNewsletters}
        campaigns={campaigns}
        allCampaigns={allCampaigns}
        segments={segments}
        allSegments={allSegments}
        targetSettings={targetSettings}
        insights={insights}
        actions={actions}
        onScreenChange={onScreenChange}
      />
    );
  }

  if (screen === "calendar") {
    return (
      <CalendarScreen
        month={month}
        availableMonths={availableMonths}
        newsletters={newsletters}
        campaigns={campaigns}
        onMonthChange={onMonthChange}
        onSelectNewsletter={onSelectNewsletter}
      />
    );
  }

  if (screen === "performance") {
    return <PerformanceScreen newsletters={newsletters} campaigns={campaigns} currency={currency} targetSettings={targetSettings} onSelectNewsletter={onSelectNewsletter} />;
  }

  if (screen === "campaigns") {
    return <CampaignPerformance campaigns={campaigns} newsletters={newsletters} currency={currency} targetSettings={targetSettings} />;
  }

  if (screen === "segments") {
    return (
      <div className="grid gap-4">
        <SegmentIntelligence segments={segments} campaigns={campaigns} newsletters={newsletters} audienceMembers={audienceMembers} currency={currency} targetSettings={targetSettings} onSelectNewsletter={onSelectNewsletter} onDetailModeChange={setIsAudienceDrillIn} />
        {!isAudienceDrillIn ? <SaturationHeatmap segments={segments} newsletters={newsletters} currency={currency} /> : null}
      </div>
    );
  }

  if (screen === "insights") {
    return <InsightsScreen insights={insights} actions={actions} onScreenChange={onScreenChange} />;
  }

  if (screen === "report") {
    return <MonthlyReport month={month} currency={currency} campaigns={campaigns} segments={segments} newsletters={newsletters} targetSettings={targetSettings} />;
  }

  return <DataIntakeSimulation campaigns={allCampaigns} segments={allSegments} currency={currency} adapterMetadata={adapterMetadata} targetSettings={targetSettings} onSaveTargets={onSaveTargets} onResetTargets={onResetTargets} />;
}

function OverviewScreen({
  currency,
  month,
  newsletters,
  allNewsletters,
  campaigns,
  allCampaigns,
  segments,
  allSegments,
  targetSettings,
  insights,
  actions,
  onScreenChange
}: {
  currency: string;
  month: string;
  newsletters: Newsletter[];
  allNewsletters: Newsletter[];
  campaigns: Campaign[];
  allCampaigns: Campaign[];
  segments: Segment[];
  allSegments: Segment[];
  targetSettings: TargetSettings;
  insights: NewsletterInsight[];
  actions: RecommendedAction[];
  onScreenChange: (screen: ScreenId) => void;
}) {
  const summary = getMonthlySummary(newsletters);
  const bestNewsletter = getBestNewsletter(newsletters);
  const strongestCampaign = getBestCampaign(campaigns, newsletters);
  const bestSegment = getBestSegment(segments, campaigns, newsletters);
  const highestRisk = getHighestRisk(insights);
  const topOpportunity = insights.find((insight) => insight.severity === "positive" && insight.type !== "best_newsletter");
  const analytics = useMemo(() => getOverviewAnalytics(allNewsletters, allCampaigns, allSegments, month), [allCampaigns, allNewsletters, allSegments, month]);
  const takeaway = getMonthlyTakeaway(summary.saturationLevel);
  const primaryAnomalies = analytics.anomalousNewsletters.length ? analytics.anomalousNewsletters : [];
  const topAction = actions[0];
  const leadingCampaign = analytics.campaignContribution[0];
  const healthLabel = getExecutiveHealthLabel(analytics.executiveHealthScore);
  const pressureLabel = getAudiencePressureLabel(analytics.audiencePressureScore, summary.saturationLevel);
  const targetComparisons = evaluateActualsAgainstTargets({
    actuals: {
      monthlyRevenue: summary.revenue,
      openRate: summary.openRate,
      clickRate: summary.clickRate,
      clickToOpenRate: summary.clickToOpenRate,
      conversionRate: summary.conversionRate,
      revenuePerRecipient: summary.revenuePerRecipient,
      unsubscribeRate: summary.unsubscribeRate,
      spamRate: summary.spamComplaintRate,
      pressureScore: analytics.audiencePressureScore
    },
    targets: resolveTargets(targetSettings, "global")
  });
  const revenueTarget = targetComparisons.monthlyRevenue;
  const engagementTarget = targetComparisons.clickToOpenRate ?? targetComparisons.clickRate ?? targetComparisons.openRate;
  const pressureTarget = targetComparisons.pressureScore;

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-xl border border-ink/85 bg-card shadow-soft">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="p-5 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-line bg-slate-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{formatMonth(month)}</span>
              <span className="rounded-md border border-line bg-slate-50 px-2.5 py-1 text-xs font-semibold text-muted">{newsletters.length} sends</span>
              <StatusBadge level={summary.saturationLevel} />
            </div>
            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-muted">Mission control</p>
            <h2 className="mt-2 max-w-4xl text-3xl font-semibold tracking-normal text-ink md:text-5xl">{takeaway}</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
              The month brought in {formatCurrency(summary.revenue, currency)} from {formatNumber(summary.totalDelivered)} delivered emails. Revenue is {formatSignedPercent(analytics.monthOverMonthRevenueChange)} versus last month, while response quality is {formatSignedPercent(analytics.monthOverMonthEngagementChange)}.
            </p>

            <div className="mt-7 grid gap-3 md:grid-cols-2 2xl:grid-cols-5">
              <MissionControlTile label="Business health" value={healthLabel} note={`${analytics.executiveHealthScore}/100 health score`} tone={analytics.executiveHealthScore >= 65 ? "good" : "watch"} />
              <MissionControlTile label="Revenue vs target" value={formatCurrency(summary.revenue, currency)} note={revenueTarget ? `${formatCurrency(revenueTarget.target, currency)} target` : "No target set"} badge={revenueTarget ? <TargetStatusBadge comparison={revenueTarget} currency={currency} compact /> : null} />
              <MissionControlTile label="Engagement vs target" value={formatPercent(summary.clickToOpenRate)} note={`${formatPercent(summary.openRate)} OR; ${formatPercent(summary.clickRate)} CTR`} badge={engagementTarget ? <TargetStatusBadge comparison={engagementTarget} currency={currency} compact /> : null} />
              <MissionControlTile label="Pressure risk" value={pressureLabel} note={`${analytics.highestRiskSegment.segmentName}; ${analytics.highestRiskSegment.riskScore}/100 risk`} tone={summary.saturationLevel === "healthy" ? "good" : "risk"} badge={pressureTarget ? <TargetStatusBadge comparison={pressureTarget} currency={currency} compact /> : <StatusBadge level={summary.saturationLevel} />} />
              <MissionControlTile label="Best next move" value={topAction?.title ?? "Keep monitoring"} note={topAction?.action ?? "Keep checking pressure before adding more sends."} tone="action" />
            </div>
          </div>

          <aside className="border-t border-line bg-ink p-5 text-white md:p-6 xl:border-l xl:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-300">Detail panel / Why</p>
            <div className="mt-5 grid gap-3">
              <ExecutiveScienceMetric label="Overall health" value={`${analytics.executiveHealthScore}/100`} note={`${healthLabel}. Based on revenue, response quality, pressure, concentration, and outliers.`} />
              <ExecutiveScienceMetric label="Best audience to grow" value={analytics.bestOpportunitySegment.segmentName} note={`${formatCurrencyPrecise(analytics.bestOpportunitySegment.revenuePerRecipient, currency)} per recipient with ${analytics.bestOpportunitySegment.pressureScore}/100 pressure.`} />
              <ExecutiveScienceMetric label="Audience to protect" value={analytics.highestRiskSegment.segmentName} note={`${analytics.highestRiskSegment.saturationLevel} saturation; reduce repeated commercial pressure.`} />
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-4" aria-label="Metric strip">
        <MetricCard label="Money in" value={formatCurrency(summary.revenue, currency)} note={`${formatSignedPercent(analytics.monthOverMonthRevenueChange)} vs last month`} helper="Are campaigns producing enough value?" />
        <MetricCard label="Audience reached" value={formatNumber(summary.totalDelivered)} note={`${newsletters.length} sends this month`} helper="How much pressure did the list absorb?" />
        <MetricCard label="Response quality" value={formatPercent(summary.clickToOpenRate)} note={`${formatPercent(summary.openRate)} opened, ${formatPercent(summary.clickRate)} clicked`} helper="Of the people who opened, how many acted?" />
        <MetricCard label="Audience pressure" value={`${analytics.audiencePressureScore.toFixed(0)}/100`} note={pressureLabel} helper={`${formatPercent(analytics.segmentRevenueConcentrationShare)} of segment revenue came from the top segment.`} badge={<StatusBadge level={summary.saturationLevel} />} />
      </section>

      <section className="rounded-xl border border-line bg-card p-5 shadow-soft md:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Target performance</p>
            <h3 className="mt-1 text-lg font-semibold tracking-normal text-ink">Business targets vs actuals</h3>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">Editable targets are compared with deterministic tolerance bands.</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {getTargetComparisons(targetComparisons, ["monthlyRevenue", "openRate", "clickRate", "clickToOpenRate", "conversionRate", "revenuePerRecipient", "pressureScore"]).map((comparison) => (
            <TargetComparisonCard key={comparison.key} comparison={comparison} currency={currency} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4 lg:grid-cols-3">
          <DecisionCard label="Keep doing" title={bestNewsletter?.name ?? "Best send pattern"} text={bestNewsletter ? `Repeat the ${bestNewsletter.content.creativeAngle.replaceAll("_", " ")} angle where audience pressure is controlled.` : "No send pattern is available for this month."} />
          <DecisionCard label="Fix first" title={highestRisk?.title ?? "No active warning"} text={highestRisk?.recommendation ?? "Keep pressure checks in the workflow before adding more sends."} tone="risk" />
          <DecisionCard label="Watch next" title={topOpportunity?.title ?? strongestCampaign?.campaign.name ?? bestSegment?.segment.name ?? "Campaign mix"} text={topOpportunity?.recommendation ?? "Track whether the strongest campaign can keep revenue quality without raising fatigue."} />
        </div>

        <article className="rounded-xl border border-line bg-slate-50/80 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Go deeper</p>
          <p className="mt-2 text-sm leading-6 text-muted">Choose the workspace that matches the business question you want answered next.</p>
          <div className="mt-4 grid gap-2">
            <WorkspaceLink label="Check send timing" screen="calendar" onScreenChange={onScreenChange} />
            <WorkspaceLink label="Compare newsletters" screen="performance" onScreenChange={onScreenChange} />
            <WorkspaceLink label="Protect audiences" screen="segments" onScreenChange={onScreenChange} />
            <WorkspaceLink label="Read the memo" screen="report" onScreenChange={onScreenChange} />
          </div>
        </article>
      </section>

      <section className="rounded-xl border border-ink/10 bg-[#fbfbf8] p-5 shadow-soft md:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Action panel</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-normal text-ink">Start here before planning the next send</h3>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">These are deterministic recommendations from campaign, segment, revenue, engagement, and fatigue signals in the local dataset.</p>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {actions.length ? (
            actions.slice(0, 3).map((action) => <ActionCard key={action.id} action={action} onScreenChange={onScreenChange} />)
          ) : (
            <p className="rounded-lg border border-dashed border-line bg-slate-50/70 p-4 text-sm leading-6 text-muted">No priority action was generated for this month.</p>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <OverviewChartCard label="Analysis panel / Revenue" title="Is revenue holding up or becoming campaign-dependent?" note="Trend line compares monthly revenue with the 3-month average." annotation={`Top campaign: ${leadingCampaign?.campaignName ?? "none"} at ${formatPercent(analytics.revenueConcentrationShare)} of revenue.`}>
          <RevenueTrendChart analytics={analytics} currency={currency} />
        </OverviewChartCard>
        <OverviewChartCard label="Analysis panel / Response" title="Are people still acting after opening?" note="Open rate shows attention; click-to-open shows whether attention became action." annotation={`Response quality moved ${formatSignedPercent(analytics.monthOverMonthEngagementChange)} versus last month.`}>
          <EngagementTrendChart analytics={analytics} />
        </OverviewChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <OverviewChartCard label="Analysis panel / Audience" title="Who can take more pressure, and who needs rest?" note="Further right means more pressure; higher up means better revenue per recipient." annotation={`${analytics.bestOpportunitySegment.segmentName} has the best value headroom.`}>
          <SegmentOpportunityChart points={analytics.pressureRevenuePoints} currency={currency} />
        </OverviewChartCard>
        <OverviewChartCard label="Analysis panel / Campaigns" title="Which campaign system carried the month?" note="Bars show revenue contribution by campaign system." annotation={`Overall campaign efficiency: ${analytics.campaignEfficiencyScore.toFixed(0)}/100.`}>
          <CampaignContributionChart data={analytics.campaignContribution} currency={currency} />
        </OverviewChartCard>
      </section>

      <section className="rounded-xl border border-line bg-card p-5 shadow-soft md:p-6">
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,0.7fr)_minmax(420px,1fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Outliers</p>
            <h3 className="mt-2 text-xl font-semibold tracking-normal text-ink">Sends worth a human read</h3>
            <p className="mt-2 text-sm leading-6 text-muted">These callouts explain unusual performance in plain language so the team knows what to inspect before repeating or repairing a campaign.</p>
          </div>
          <div className="grid gap-3">
            {primaryAnomalies.length ? (
              primaryAnomalies.map((anomaly) => <AnomalyCalloutCard key={`${anomaly.newsletterId}-${anomaly.metric}`} anomaly={anomaly} />)
            ) : (
              <p className="rounded-lg border border-dashed border-line bg-slate-50/70 p-4 text-sm leading-6 text-muted">No send was unusual enough to override the main monthly actions.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function CalendarScreen({
  month,
  availableMonths,
  newsletters,
  campaigns,
  onMonthChange,
  onSelectNewsletter
}: {
  month: string;
  availableMonths: string[];
  newsletters: Newsletter[];
  campaigns: Campaign[];
  onMonthChange: (month: string) => void;
  onSelectNewsletter: (newsletter: Newsletter) => void;
}) {
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [selectedDate, setSelectedDate] = useState(`${month}-01`);

  useEffect(() => {
    setSelectedDate((currentDate) => (currentDate.startsWith(month) ? currentDate : `${month}-01`));
  }, [month]);

  const handleDateSelect = (date: string) => {
    const dateMonth = date.slice(0, 7);
    if (dateMonth !== month && availableMonths.includes(dateMonth)) {
      onMonthChange(dateMonth);
    }
    setSelectedDate(date);
  };

  const handlePrevious = () => {
    if (calendarView === "month") {
      const previousMonth = getAvailableMonthStep(month, availableMonths, -1);
      onMonthChange(previousMonth);
      setSelectedDate(`${previousMonth}-01`);
      return;
    }

    const previousDate = addDaysToDateKey(selectedDate, calendarView === "week" ? -7 : -1);
    handleDateStep(previousDate);
  };

  const handleNext = () => {
    if (calendarView === "month") {
      const nextMonth = getAvailableMonthStep(month, availableMonths, 1);
      onMonthChange(nextMonth);
      setSelectedDate(`${nextMonth}-01`);
      return;
    }

    const nextDate = addDaysToDateKey(selectedDate, calendarView === "week" ? 7 : 1);
    handleDateStep(nextDate);
  };

  const handleToday = () => {
    const today = getTodayDateKey();
    const todayMonth = today.slice(0, 7);
    if (availableMonths.includes(todayMonth)) {
      onMonthChange(todayMonth);
      setSelectedDate(today);
      return;
    }
    setSelectedDate(`${month}-01`);
  };

  const handleDateStep = (date: string) => {
    const dateMonth = date.slice(0, 7);
    if (dateMonth !== month) {
      if (!availableMonths.includes(dateMonth)) return;
      onMonthChange(dateMonth);
    }
    setSelectedDate(date);
  };

  return (
    <MonthlyCalendar
      month={month}
      calendarView={calendarView}
      selectedDate={selectedDate}
      newsletters={newsletters}
      campaigns={campaigns}
      onViewChange={setCalendarView}
      onDateSelect={handleDateSelect}
      onPrevious={handlePrevious}
      onNext={handleNext}
      onToday={handleToday}
      onSelectNewsletter={onSelectNewsletter}
    />
  );
}

function PerformanceScreen({
  newsletters,
  campaigns,
  currency,
  targetSettings,
  onSelectNewsletter
}: {
  newsletters: Newsletter[];
  campaigns: Campaign[];
  currency: string;
  targetSettings: TargetSettings;
  onSelectNewsletter: (newsletter: Newsletter) => void;
}) {
  const bestNewsletter = getBestNewsletter(newsletters);
  const worstNewsletter = getWorstNewsletter(newsletters);
  const bestCampaign = getBestCampaign(campaigns, newsletters);
  const weakestCampaign = getWeakestCampaign(campaigns, newsletters);
  const ranked = [...newsletters].sort((a, b) => getNewsletterRank(a, newsletters) - getNewsletterRank(b, newsletters)).slice(0, 5);

  return (
    <div className="grid gap-4">
      <section className="grid gap-4 lg:grid-cols-4">
        <PerformanceBriefCard title="Best send" newsletter={bestNewsletter} />
        <PerformanceBriefCard title="Weakest send" newsletter={worstNewsletter} />
        <SnapshotCard label="Best campaign" value={bestCampaign?.campaign.name ?? "n/a"} note={bestCampaign ? `${formatCurrencyPrecise(bestCampaign.revenuePerRecipient, currency)} RPR` : "No campaign data"} />
        <SnapshotCard label="Weakest campaign" value={weakestCampaign?.campaign.name ?? "n/a"} note={weakestCampaign ? `${formatPercent(weakestCampaign.clickToOpenRate)} CTOR` : "No campaign data"} />
      </section>

      <section className="rounded-xl border border-line bg-card p-5 shadow-soft md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Rankings</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-ink">Top sends by blended score</h2>
          </div>
          <p className="text-sm leading-6 text-muted">Score blends RPR, CTR, CTOR, conversion, and unsubscribe pressure.</p>
        </div>
        <div className="mt-5 grid gap-3 xl:grid-cols-5">
          {ranked.map((newsletter) => (
            <button
              key={newsletter.id}
              type="button"
              className="rounded-lg border border-line bg-slate-50/80 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
              onClick={() => onSelectNewsletter(newsletter)}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Rank #{getNewsletterRank(newsletter, newsletters)}</p>
              <h3 className="mt-2 text-base font-semibold leading-5 text-ink">{newsletter.name}</h3>
              <p className="mt-3 text-sm font-semibold text-ink">{formatCurrency(newsletter.metrics.revenue, newsletter.metrics.currency)}</p>
              <p className="mt-1 text-xs text-muted">
                {formatPercent(calculateOpenRate(newsletter))} OR / {formatPercent(calculateClickToOpenRate(newsletter))} CTOR
              </p>
            </button>
          ))}
        </div>
      </section>

      <NewsletterTable newsletters={newsletters} campaigns={campaigns} targetSettings={targetSettings} onSelectNewsletter={onSelectNewsletter} />
    </div>
  );
}

function InsightsScreen({ insights, actions, onScreenChange }: { insights: NewsletterInsight[]; actions: RecommendedAction[]; onScreenChange: (screen: ScreenId) => void }) {
  const criticalActions = actions.filter((action) => action.priorityLabel === "P1 critical action");
  const opportunityActions = actions.filter((action) => action.priorityLabel === "P2 opportunity");
  const watchActions = actions.filter((action) => action.priorityLabel === "P3 watch item");
  const supportingSignals = insights.filter((insight) => !actions.some((action) => action.relatedInsightId === (insight.id ?? insight.type))).slice(0, 6);

  return (
    <div className="grid gap-4">
      <section className="grid gap-4 xl:grid-cols-3">
        <ActionColumn title="Critical" empty="No critical action is active this month." actions={criticalActions} onScreenChange={onScreenChange} />
        <ActionColumn title="Opportunities" empty="No major scale opportunity was generated." actions={opportunityActions} onScreenChange={onScreenChange} />
        <ActionColumn title="Watchlist" empty="No watch item is active this month." actions={watchActions} onScreenChange={onScreenChange} />
      </section>

      <section className="rounded-xl border border-line bg-card p-5 shadow-soft md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Supporting signals</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {supportingSignals.map((insight) => (
            <article key={insight.id ?? insight.title} className="rounded-lg border border-line bg-slate-50/80 p-4">
              <StatusBadge severity={insight.severity} />
              <h3 className="mt-3 text-sm font-semibold text-ink">{insight.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{insight.evidence ?? insight.message}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ActionColumn({
  title,
  empty,
  actions,
  onScreenChange
}: {
  title: string;
  empty: string;
  actions: RecommendedAction[];
  onScreenChange: (screen: ScreenId) => void;
}) {
  return (
    <section className="rounded-xl border border-line bg-card p-5 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{title}</p>
      <div className="mt-4 space-y-3">
        {actions.length ? actions.map((action) => <ActionCard key={action.id} action={action} onScreenChange={onScreenChange} />) : <p className="rounded-lg border border-dashed border-line bg-slate-50/70 p-4 text-sm leading-6 text-muted">{empty}</p>}
      </div>
    </section>
  );
}

function MetricCard({ label, value, note, helper, badge }: { label: string; value: string; note: string; helper?: string; badge?: ReactNode }) {
  return (
    <article className="min-w-0 rounded-lg border border-line bg-[#fbfbf8] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="truncate text-2xl font-semibold tracking-normal text-ink">{value}</p>
        {badge}
      </div>
      <p className="mt-2 text-sm leading-5 text-muted">{note}</p>
      {helper ? <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">{helper}</p> : null}
    </article>
  );
}

function MissionControlTile({
  label,
  value,
  note,
  badge,
  tone = "neutral"
}: {
  label: string;
  value: string;
  note: string;
  badge?: ReactNode;
  tone?: "neutral" | "good" | "watch" | "risk" | "action";
}) {
  const toneClass = {
    neutral: "border-line bg-[#f7f8f3]",
    good: "border-emerald-200 bg-emerald-50/60",
    watch: "border-amber-200 bg-amber-50/70",
    risk: "border-orange-200 bg-orange-50/70",
    action: "border-ink/20 bg-white"
  }[tone];

  return (
    <article className={`min-w-0 rounded-lg border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="min-w-0 text-base font-semibold leading-5 tracking-normal text-ink">{value}</p>
        {badge}
      </div>
      <p className="mt-2 text-xs leading-5 text-muted">{note}</p>
    </article>
  );
}

function PlainReadout({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="min-w-0 rounded-lg border border-line bg-[#f7f8f3] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 truncate text-base font-semibold tracking-normal text-ink">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{note}</p>
    </article>
  );
}

function DecisionCard({ label, title, text, tone = "default" }: { label: string; title: string; text: string; tone?: "default" | "risk" }) {
  return (
    <article className={`rounded-xl border p-5 shadow-sm ${tone === "risk" ? "border-amber-200 bg-amber-50/75" : "border-line bg-slate-50/80"}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <h3 className="mt-3 text-xl font-semibold tracking-normal text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
    </article>
  );
}

function ActionCard({ action, onScreenChange }: { action: RecommendedAction; onScreenChange: (screen: ScreenId) => void }) {
  const target = screenFromAction(action.nextScreen);

  return (
    <article className="rounded-lg border border-line bg-slate-50/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-line bg-card px-2.5 py-1 text-xs font-semibold text-muted">{action.priorityLabel}</span>
        <StatusBadge severity={action.priority} />
      </div>
      <h3 className="mt-3 text-base font-semibold text-ink">{action.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{action.action}</p>
      <dl className="mt-4 space-y-2 border-t border-line pt-3 text-xs leading-5 text-muted">
        <div>
          <dt className="font-semibold text-ink">Why</dt>
          <dd>{action.reason}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">Affected area</dt>
          <dd>{action.affectedArea}</dd>
        </div>
      </dl>
      <button
        type="button"
        className="mt-4 rounded-md border border-line bg-card px-3 py-2 text-xs font-semibold text-ink transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
        onClick={() => onScreenChange(target)}
      >
        Open {action.nextScreen}
      </button>
    </article>
  );
}

function WorkspaceLink({ label, screen, onScreenChange }: { label: string; screen: ScreenId; onScreenChange: (screen: ScreenId) => void }) {
  return (
    <button
      type="button"
      className="rounded-md border border-line bg-card px-3 py-2 text-left text-sm font-semibold text-ink transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
      onClick={() => onScreenChange(screen)}
    >
      {label}
    </button>
  );
}

function ExecutiveScienceMetric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.07] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-300">{label}</p>
      <p className="mt-2 truncate text-xl font-semibold tracking-normal text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-stone-300">{note}</p>
    </article>
  );
}

function OverviewChartCard({ label, title, note, annotation, children }: { label: string; title: string; note: string; annotation: string; children: ReactNode }) {
  return (
    <article className="rounded-xl border border-line bg-card p-5 shadow-soft md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
          <h3 className="mt-1 max-w-xl text-xl font-semibold tracking-normal text-ink">{title}</h3>
        </div>
        <div className="max-w-md">
          <p className="rounded-lg border border-line bg-[#f7f8f3] px-3 py-2 text-xs font-semibold leading-5 text-ink">{annotation}</p>
          <p className="mt-2 text-sm leading-6 text-muted">{note}</p>
        </div>
      </div>
      {children}
    </article>
  );
}

function ChartFrame({ className, children }: { className: string; children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className={className}>
      {isMounted ? children : <div className="flex h-full min-h-0 items-center justify-center rounded-lg border border-dashed border-line bg-slate-50/60 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Loading chart</div>}
    </div>
  );
}

function RevenueTrendChart({ analytics, currency }: { analytics: OverviewAnalytics; currency: string }) {
  return (
    <ChartFrame className="mt-5 h-[320px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={analytics.monthlyTrend} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#e4e8e1" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="#667069" tick={{ fontSize: 11 }} />
          <YAxis stroke="#667069" tick={{ fontSize: 11 }} tickFormatter={(value: number) => formatShortCurrency(value, currency)} />
          <Tooltip
            formatter={(value, name) => {
              const numericValue = Number(value ?? 0);
              return [formatCurrency(numericValue, currency), String(name)];
            }}
            labelFormatter={(label) => `${label} revenue`}
          />
          <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#171817" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="rollingRevenueAverage" name="3-month average" stroke="#0f766e" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function EngagementTrendChart({ analytics }: { analytics: OverviewAnalytics }) {
  return (
    <ChartFrame className="mt-5 h-[320px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={analytics.monthlyTrend} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#e4e8e1" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="#667069" tick={{ fontSize: 11 }} />
          <YAxis stroke="#667069" tick={{ fontSize: 11 }} tickFormatter={(value: number) => formatPercent(value)} />
          <Tooltip
            formatter={(value, name) => {
              const numericValue = Number(value ?? 0);
              return [formatPercent(numericValue), String(name)];
            }}
            labelFormatter={(label) => `${label} engagement`}
          />
          <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="openRate" name="OR" stroke="#171817" strokeWidth={2.2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="clickRate" name="CTR" stroke="#0f766e" strokeWidth={2} dot={{ r: 2 }} />
          <Line type="monotone" dataKey="clickToOpenRate" name="CTOR" stroke="#d97706" strokeWidth={2} dot={{ r: 2 }} />
          <Line type="monotone" dataKey="rollingEngagementAverage" name="3-month engagement" stroke="#667069" strokeWidth={1.8} strokeDasharray="5 5" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function SegmentOpportunityChart({ points, currency }: { points: SegmentOpportunityPoint[]; currency: string }) {
  return (
    <ChartFrame className="mt-5 h-[360px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 32, right: 96, bottom: 16, left: 8 }}>
          <CartesianGrid stroke="#e4e8e1" strokeDasharray="3 3" />
          <XAxis type="number" dataKey="pressureScore" name="Pressure" domain={[0, 108]} stroke="#667069" tick={{ fontSize: 11 }} />
          <YAxis type="number" dataKey="revenuePerRecipient" name="RPR" stroke="#667069" tick={{ fontSize: 11 }} tickFormatter={(value: number) => formatCurrencyPrecise(value, currency)} />
          <ZAxis type="number" dataKey="revenue" range={[120, 620]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={<SegmentOpportunityTooltip currency={currency} />}
          />
          <Scatter data={points} name="Segments" isAnimationActive={false}>
            {points.map((point) => (
              <Cell key={point.segmentId} fill={getSaturationChartColor(point.saturationLevel)} stroke="#171817" strokeWidth={0.7} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function SegmentOpportunityTooltip({
  active,
  payload,
  currency
}: {
  active?: boolean;
  payload?: Array<{ payload?: SegmentOpportunityPoint }>;
  currency: string;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="min-w-[220px] rounded-md border border-line bg-white px-3 py-2 text-xs shadow-soft">
      <p className="font-semibold text-ink">{point.segmentName}</p>
      <div className="mt-2 space-y-1 text-muted">
        <p>Pressure: <span className="font-medium text-ink">{point.pressureScore.toFixed(0)}/100</span></p>
        <p>Revenue per recipient: <span className="font-medium text-ink">{formatCurrencyPrecise(point.revenuePerRecipient, currency)}</span></p>
        <p>Revenue: <span className="font-medium text-ink">{formatCurrency(point.revenue, currency)}</span></p>
      </div>
    </div>
  );
}

function CampaignContributionChart({ data, currency }: { data: CampaignContributionPoint[]; currency: string }) {
  return (
    <ChartFrame className="mt-5 h-[340px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 18, bottom: 8, left: 12 }}>
          <CartesianGrid stroke="#e4e8e1" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" stroke="#667069" tick={{ fontSize: 11 }} tickFormatter={(value: number) => formatShortCurrency(value, currency)} />
          <YAxis type="category" dataKey="campaignName" width={118} stroke="#667069" tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value, name, item) => {
              const payload = item.payload as CampaignContributionPoint | undefined;
              if (String(name) === "Revenue") return [formatCurrency(Number(value ?? 0), currency), `${payload?.efficiencyScore ?? 0}/100 efficiency`];
              return [value, name];
            }}
          />
          <Bar dataKey="revenue" name="Revenue" radius={[0, 6, 6, 0]}>
            {data.map((item) => (
              <Cell key={item.campaignId} fill={item.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function AnomalyCalloutCard({ anomaly }: { anomaly: OverviewAnalytics["anomalousNewsletters"][number] }) {
  return (
    <article className={`rounded-lg border p-4 ${anomaly.severity === "positive" ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge severity={anomaly.severity} label={anomaly.metric} />
        <span className="text-xs font-semibold text-muted">{anomaly.campaignName}</span>
      </div>
      <h4 className="mt-3 text-sm font-semibold text-ink">{anomaly.newsletterName}</h4>
      <p className="mt-2 text-sm leading-6 text-muted">{anomaly.evidence}</p>
      <p className="mt-2 text-xs font-semibold leading-5 text-ink">{anomaly.recommendation}</p>
    </article>
  );
}

function screenFromAction(nextScreen: RecommendedAction["nextScreen"]): ScreenId {
  if (nextScreen === "Audience") return "segments";
  if (nextScreen === "Campaigns") return "campaigns";
  if (nextScreen === "Newsletters") return "performance";
  return "insights";
}

function getMonthlyTakeaway(level: ReturnType<typeof getMonthlySummary>["saturationLevel"]): string {
  if (level === "overexposed" || level === "saturated") return "Revenue is strong, but audience pressure is high.";
  if (level === "watch") return "Revenue is working, and cadence needs active monitoring.";
  return "Revenue is healthy, and audience pressure is controlled.";
}

function getExecutiveHealthLabel(score: number): string {
  if (score >= 80) return "Strong month";
  if (score >= 65) return "Stable month";
  if (score >= 50) return "Mixed month";
  return "Needs intervention";
}

function getAudiencePressureLabel(score: number, level: ReturnType<typeof getMonthlySummary>["saturationLevel"]): string {
  if (level === "overexposed") return "Too much pressure";
  if (level === "saturated") return "Pressure is high";
  if (level === "watch" || score >= 45) return "Pressure needs watching";
  return "Pressure is controlled";
}

function SnapshotCard({ label, value, note, badge }: { label: string; value: string; note: string; badge?: ReactNode }) {
  return (
    <article className="min-w-0 rounded-lg border border-line bg-card p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="truncate text-xl font-semibold tracking-normal text-ink">{value}</p>
        {badge}
      </div>
      <p className="mt-2 text-sm leading-5 text-muted">{note}</p>
    </article>
  );
}

function PerformanceBriefCard({ title, newsletter }: { title: string; newsletter: Newsletter | null }) {
  return (
    <article className="rounded-lg border border-line bg-card p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{title}</p>
      {newsletter ? (
        <>
          <h2 className="mt-3 text-lg font-semibold tracking-normal text-ink">{newsletter.name}</h2>
          <p className="mt-2 text-xs leading-5 text-muted">&quot;{newsletter.content.subjectLine}&quot;</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <MiniMetric label="OR" value={formatPercent(calculateOpenRate(newsletter))} />
            <MiniMetric label="CTR" value={formatPercent(calculateClickRate(newsletter))} />
            <MiniMetric label="CTOR" value={formatPercent(calculateClickToOpenRate(newsletter))} />
            <MiniMetric label="RPR" value={formatCurrencyPrecise(calculateRevenuePerRecipient(newsletter), newsletter.metrics.currency)} />
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted">No newsletter data.</p>
      )}
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-slate-50/80 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}

function EmptyMonth({ month }: { month: string }) {
  return (
    <section className="rounded-xl border border-line bg-card p-8 text-center shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{formatMonth(month)}</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-normal text-ink">No newsletters for this reporting month</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">Choose another month/year from the top bar to review available campaign, segment, and saturation data.</p>
    </section>
  );
}

function getAvailableMonthStep(month: string, availableMonths: string[], step: number): string {
  const currentIndex = availableMonths.indexOf(month);
  if (currentIndex === -1) return month;
  return availableMonths[Math.min(Math.max(currentIndex + step, 0), availableMonths.length - 1)] ?? month;
}

function addDaysToDateKey(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(year, month - 1, day);
  next.setDate(next.getDate() + days);
  return toDateKey(next);
}

function getTodayDateKey(): string {
  return toDateKey(new Date());
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getHighestRisk(insights: NewsletterInsight[]): NewsletterInsight | undefined {
  return [...insights]
    .filter((insight) => insight.severity === "critical" || insight.severity === "warning")
    .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))[0];
}

function getTargetComparisons(comparisons: TargetComparisonMap, keys: Array<keyof TargetComparisonMap>) {
  return keys.flatMap((key) => {
    const comparison = comparisons[key];
    return comparison ? [comparison] : [];
  });
}

function severityWeight(severity: NewsletterInsight["severity"]): number {
  return { critical: 4, warning: 3, positive: 2, neutral: 1 }[severity];
}

function formatSignedPercent(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatPercent(value)}`;
}

function formatShortCurrency(value: number, currency: string): string {
  if (Math.abs(value) >= 1000000) return `${formatCurrency(value / 1000000, currency)}M`;
  if (Math.abs(value) >= 1000) return `${formatCurrency(value / 1000, currency)}k`;
  return formatCurrency(value, currency);
}

function getSaturationChartColor(level: SegmentOpportunityPoint["saturationLevel"]): string {
  if (level === "overexposed") return "#dc2626";
  if (level === "saturated") return "#ea580c";
  if (level === "watch") return "#d97706";
  return "#0f766e";
}
