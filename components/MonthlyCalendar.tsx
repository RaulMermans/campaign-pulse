import type { ReactNode } from "react";
import type { Campaign, Newsletter } from "@/lib/newsletterTypes";
import {
  getDaySummary,
  getMonthCalendarGrid,
  getNewslettersForDate,
  getWeekRange,
  getWeekSummary,
  groupNewslettersByDay,
  type CalendarPeriodSummary
} from "@/lib/newsletterCalendar";
import { getNewsletterDetailInsight } from "@/lib/newsletterInsights";
import { getNewsletterSaturation } from "@/lib/newsletterSaturation";
import { formatCurrency, formatDateLabel, formatMonth, formatNumber } from "@/lib/formatters";
import { CampaignColorTag, hexToRgba } from "./CampaignColorTag";
import { StatusBadge } from "./StatusBadge";

export type CalendarView = "month" | "week" | "day";

interface MonthlyCalendarProps {
  month: string;
  calendarView: CalendarView;
  selectedDate: string;
  newsletters: Newsletter[];
  campaigns: Campaign[];
  onViewChange: (view: CalendarView) => void;
  onDateSelect: (date: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onSelectNewsletter: (newsletter: Newsletter) => void;
}

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthlyCalendar({
  month,
  calendarView,
  selectedDate,
  newsletters,
  campaigns,
  onViewChange,
  onDateSelect,
  onPrevious,
  onNext,
  onToday,
  onSelectNewsletter
}: MonthlyCalendarProps) {
  const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
  const groupedByDay = groupNewslettersByDay(newsletters);
  const selectedWeek = getWeekRange(selectedDate);
  const selectedDayNewsletters = getNewslettersForDate(newsletters, selectedDate);
  const weekNewsletters = selectedWeek.flatMap((date) => getNewslettersForDate(newsletters, date));
  const periodNewsletters =
    calendarView === "day" ? selectedDayNewsletters : calendarView === "week" ? weekNewsletters : newsletters;
  const summary =
    calendarView === "day"
      ? getDaySummary(periodNewsletters, newsletters)
      : calendarView === "week"
        ? getWeekSummary(periodNewsletters, newsletters)
        : getWeekSummary(periodNewsletters, newsletters);

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="rounded-xl border border-line bg-card p-4 shadow-soft md:p-5">
        <CalendarToolbar
          month={month}
          calendarView={calendarView}
          selectedDate={selectedDate}
          onViewChange={onViewChange}
          onPrevious={onPrevious}
          onNext={onNext}
          onToday={onToday}
        />

        <div className="mt-5">
          {calendarView === "month" ? (
            <MonthView
              month={month}
              selectedDate={selectedDate}
              groupedByDay={groupedByDay}
              campaignById={campaignById}
              newsletters={newsletters}
              onDateSelect={onDateSelect}
              onSelectNewsletter={onSelectNewsletter}
            />
          ) : null}

          {calendarView === "week" ? (
            <WeekView
              weekDates={selectedWeek}
              newsletters={newsletters}
              campaignById={campaignById}
              selectedDate={selectedDate}
              onDateSelect={onDateSelect}
              onSelectNewsletter={onSelectNewsletter}
            />
          ) : null}

          {calendarView === "day" ? (
            <DayView
              selectedDate={selectedDate}
              newsletters={selectedDayNewsletters}
              allNewsletters={newsletters}
              campaignById={campaignById}
              summary={summary}
              onSelectNewsletter={onSelectNewsletter}
            />
          ) : null}
        </div>
      </div>

      <SummaryPanel view={calendarView} month={month} selectedDate={selectedDate} summary={summary} />
    </section>
  );
}

function CalendarToolbar({
  month,
  calendarView,
  selectedDate,
  onViewChange,
  onPrevious,
  onNext,
  onToday
}: {
  month: string;
  calendarView: CalendarView;
  selectedDate: string;
  onViewChange: (view: CalendarView) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{getRangeLabel(calendarView, month, selectedDate)}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-normal text-ink">Calendar</h2>
        <p className="mt-1 text-sm leading-6 text-muted">Click a day to inspect cadence; click a send to open its newsletter drawer.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
        <div className="inline-flex rounded-lg border border-line bg-white p-1">
          {(["month", "week", "day"] as CalendarView[]).map((view) => (
            <button
              key={view}
              type="button"
              className={`rounded-md px-3 py-2 text-sm font-semibold capitalize transition focus:outline-none focus:ring-2 focus:ring-ink ${
                calendarView === view ? "bg-ink text-white" : "text-muted hover:bg-slate-50 hover:text-ink"
              }`}
              onClick={() => onViewChange(view)}
              aria-pressed={calendarView === view}
            >
              {view}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-ink" onClick={onToday}>
            Today
          </button>
          <button type="button" className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-ink" onClick={onPrevious} aria-label="Previous period">
            Prev
          </button>
          <button type="button" className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-ink" onClick={onNext} aria-label="Next period">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function MonthView({
  month,
  selectedDate,
  groupedByDay,
  campaignById,
  newsletters,
  onDateSelect,
  onSelectNewsletter
}: {
  month: string;
  selectedDate: string;
  groupedByDay: Record<string, Newsletter[]>;
  campaignById: Map<string, Campaign>;
  newsletters: Newsletter[];
  onDateSelect: (date: string) => void;
  onSelectNewsletter: (newsletter: Newsletter) => void;
}) {
  const grid = getMonthCalendarGrid(month);

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="grid grid-cols-7 border-b border-line bg-slate-50/80">
        {weekdays.map((day) => (
          <div key={day} className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-7 sm:divide-x sm:divide-y-0">
        {grid.map((cell) => {
          const dayNewsletters = groupedByDay[cell.date] ?? [];
          const visibleNewsletters = dayNewsletters.slice(0, 2);
          const isSelected = cell.date === selectedDate;
          const pressureLevel = getDayPressureLevel(dayNewsletters, newsletters);
          const hasSends = dayNewsletters.length > 0;

          return (
            <div
              key={cell.date}
              role="button"
              tabIndex={0}
              className={`relative min-h-[138px] cursor-pointer border-b border-line p-2 text-left transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ink sm:border-b ${
                cell.isCurrentMonth ? getDayToneClass(pressureLevel, hasSends) : "bg-slate-50/40 text-muted"
              } ${isSelected ? "ring-2 ring-inset ring-ink" : ""}`}
              onClick={() => onDateSelect(cell.date)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onDateSelect(cell.date);
                }
              }}
            >
              <span className={`absolute inset-x-2 top-0 h-1 rounded-b-full ${getPressureRailClass(pressureLevel, hasSends)}`} />
              <div className="mb-2 flex items-center justify-between">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${isSelected ? "bg-ink text-white" : cell.isCurrentMonth ? "text-ink" : "text-muted"}`}>{cell.dayOfMonth}</span>
                {dayNewsletters.length ? (
                  <span className="rounded-md border border-line bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-muted">{dayNewsletters.length} sends</span>
                ) : null}
              </div>

              <div className="space-y-1.5">
                {visibleNewsletters.map((newsletter) => (
                  <MonthNewsletterCard
                    key={newsletter.id}
                    newsletter={newsletter}
                    campaign={campaignById.get(newsletter.campaign.id)}
                    newsletters={newsletters}
                    onSelectNewsletter={onSelectNewsletter}
                  />
                ))}
                {dayNewsletters.length > visibleNewsletters.length ? (
                  <p className="rounded-md border border-dashed border-line bg-slate-50/80 px-2 py-1 text-xs font-semibold text-muted">
                    +{dayNewsletters.length - visibleNewsletters.length} more
                  </p>
                ) : null}
                {!dayNewsletters.length && cell.isCurrentMonth ? <p className="pt-6 text-center text-[11px] font-medium text-muted/60">No sends</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  weekDates,
  newsletters,
  campaignById,
  selectedDate,
  onDateSelect,
  onSelectNewsletter
}: {
  weekDates: string[];
  newsletters: Newsletter[];
  campaignById: Map<string, Campaign>;
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onSelectNewsletter: (newsletter: Newsletter) => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-7">
      {weekDates.map((date) => {
        const dayNewsletters = getNewslettersForDate(newsletters, date);
        const isSelected = selectedDate === date;

        return (
          <article key={date} className={`min-h-[360px] rounded-lg border bg-white p-3 shadow-sm ${isSelected ? "border-ink" : "border-line"}`}>
            <button type="button" className="w-full rounded-md p-1 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-ink" onClick={() => onDateSelect(date)}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{getWeekdayLabel(date)}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-lg font-semibold text-ink">{formatDateLabel(date)}</p>
                <span className="rounded-md border border-line bg-slate-50 px-2 py-1 text-xs font-semibold text-muted">{dayNewsletters.length} sends</span>
              </div>
            </button>

            <div className="mt-3 space-y-3">
              {dayNewsletters.length ? (
                dayNewsletters.map((newsletter) => (
                  <WeekNewsletterCard
                    key={newsletter.id}
                    newsletter={newsletter}
                    campaign={campaignById.get(newsletter.campaign.id)}
                    newsletters={newsletters}
                    onSelectNewsletter={onSelectNewsletter}
                  />
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-line bg-slate-50/70 p-3 text-sm leading-5 text-muted">No sends planned.</p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function DayView({
  selectedDate,
  newsletters,
  allNewsletters,
  campaignById,
  summary,
  onSelectNewsletter
}: {
  selectedDate: string;
  newsletters: Newsletter[];
  allNewsletters: Newsletter[];
  campaignById: Map<string, Campaign>;
  summary: CalendarPeriodSummary;
  onSelectNewsletter: (newsletter: Newsletter) => void;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <DayStat label="Date" value={formatFullDate(selectedDate)} />
        <DayStat label="Total sends" value={formatNumber(summary.sends)} />
        <DayStat label="Revenue" value={formatCurrency(summary.revenue, newsletters[0]?.metrics.currency)} />
        <DayStat label="Highest pressure" value={summary.highestPressureStatus} badge={<StatusBadge level={summary.highestPressureStatus} />} />
      </div>

      <div className="mt-5 space-y-3">
        {newsletters.length ? (
          newsletters.map((newsletter) => {
            const campaign = campaignById.get(newsletter.campaign.id);
            const saturation = getNewsletterSaturation(newsletter, allNewsletters);
            const insight = getNewsletterDetailInsight(newsletter, allNewsletters);

            return (
              <button
                key={newsletter.id}
                type="button"
                className="w-full rounded-lg border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-ink"
                style={{
                  borderColor: hexToRgba(campaign?.color ?? "#78716c", 0.22),
                  boxShadow: `inset 4px 0 0 ${hexToRgba(campaign?.color ?? "#78716c", 0.72)}`
                }}
                onClick={() => onSelectNewsletter(newsletter)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <CampaignColorTag color={campaign?.color ?? "#78716c"} label={newsletter.campaign.name} type={newsletter.campaign.stage} />
                  <StatusBadge level={saturation.saturationLevel} />
                </div>
                <h3 className="mt-3 text-xl font-semibold tracking-normal text-ink">{newsletter.name}</h3>
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                  <MiniFact label="Campaign" value={newsletter.campaign.name} />
                  <MiniFact label="Audience" value={newsletter.audience.audienceName} />
                  <MiniFact label="Segments" value={newsletter.segmentPerformance.map((segment) => segment.segmentName).join(", ")} />
                </div>
                <p className="mt-4 rounded-md border border-line bg-slate-50/80 p-3 text-sm leading-6 text-muted">
                  Recommendation: <span className="font-medium text-ink">{insight?.recommendation ?? summary.suggestedNextAction}</span>
                </p>
              </button>
            );
          })
        ) : (
          <p className="rounded-lg border border-dashed border-line bg-slate-50/70 p-5 text-sm leading-6 text-muted">
            No newsletters were sent on this day.
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryPanel({
  view,
  month,
  selectedDate,
  summary
}: {
  view: CalendarView;
  month: string;
  selectedDate: string;
  summary: CalendarPeriodSummary;
}) {
  const currency = summary.strongestSend?.metrics.currency ?? "EUR";

  return (
    <aside className="rounded-xl border border-line bg-card p-5 shadow-soft xl:sticky xl:top-5 xl:self-start">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{view} summary</p>
      <h2 className="mt-2 text-xl font-semibold tracking-normal text-ink">{getRangeLabel(view, month, selectedDate)}</h2>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <SummaryMetric label="Sends" value={formatNumber(summary.sends)} />
        <SummaryMetric label="Revenue" value={formatCurrency(summary.revenue, currency)} />
        <SummaryMetric label="Delivered" value={formatNumber(summary.delivered)} />
        <SummaryMetric label="Pressure" value={summary.highestPressureStatus} badge={<StatusBadge level={summary.highestPressureStatus} />} />
      </div>

      <div className="mt-5 space-y-4 border-t border-line pt-5">
        <SummaryLine label="Strongest send" value={summary.strongestSend?.name ?? "No sends"} />
        <SummaryLine label="Highest-risk audience" value={summary.highestRiskAudience} />
        <SummaryLine label="Highest-risk campaign" value={summary.highestRiskCampaign} />
      </div>

      <div className="mt-5 rounded-lg border border-line bg-slate-50/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Pressure note</p>
        <p className="mt-2 text-sm leading-6 text-ink">{summary.pressureNote}</p>
      </div>

      <div className="mt-3 rounded-lg border border-line bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Suggested next action</p>
        <p className="mt-2 text-sm leading-6 text-ink">{summary.suggestedNextAction}</p>
      </div>
    </aside>
  );
}

function MonthNewsletterCard({
  newsletter,
  campaign,
  newsletters,
  onSelectNewsletter
}: {
  newsletter: Newsletter;
  campaign?: Campaign;
  newsletters: Newsletter[];
  onSelectNewsletter: (newsletter: Newsletter) => void;
}) {
  const saturation = getNewsletterSaturation(newsletter, newsletters);

  return (
    <button
      type="button"
      className="block w-full rounded-md border bg-white/95 px-2 py-1.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
      style={{
        borderColor: hexToRgba(campaign?.color ?? "#78716c", 0.22),
        boxShadow: `inset 3px 0 0 ${hexToRgba(campaign?.color ?? "#78716c", 0.75)}`
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelectNewsletter(newsletter);
      }}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: campaign?.color ?? "#78716c" }} />
        <span className="truncate text-xs font-semibold text-ink">{newsletter.name}</span>
      </span>
      <span className="mt-1 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[11px] font-medium text-muted">{newsletter.campaign.name}</span>
        <span className="text-xs font-semibold text-ink">{formatCurrency(newsletter.metrics.revenue, newsletter.metrics.currency)}</span>
      </span>
      <span className="mt-1 block truncate text-[11px] font-semibold capitalize text-muted">
        {saturation.saturationLevel.replaceAll("_", " ")} pressure
      </span>
    </button>
  );
}

function WeekNewsletterCard({
  newsletter,
  campaign,
  newsletters,
  onSelectNewsletter
}: {
  newsletter: Newsletter;
  campaign?: Campaign;
  newsletters: Newsletter[];
  onSelectNewsletter: (newsletter: Newsletter) => void;
}) {
  const saturation = getNewsletterSaturation(newsletter, newsletters);
  const keySignal = saturation.fatigueSignals[0]?.replaceAll("_", " ") ?? `${saturation.performanceTrend} pressure`;

  return (
    <button
      type="button"
      className="w-full rounded-lg border bg-card p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
      style={{ borderColor: hexToRgba(campaign?.color ?? "#78716c", 0.22) }}
      onClick={() => onSelectNewsletter(newsletter)}
    >
      <CampaignColorTag color={campaign?.color ?? "#78716c"} label={newsletter.campaign.name} />
      <h3 className="mt-3 text-sm font-semibold leading-5 text-ink">{newsletter.name}</h3>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink">{formatCurrency(newsletter.metrics.revenue, newsletter.metrics.currency)}</span>
        <StatusBadge level={saturation.saturationLevel} />
      </div>
      <p className="mt-2 text-xs leading-5 text-muted">{keySignal}</p>
    </button>
  );
}

function DayStat({ label, value, badge }: { label: string; value: string; badge?: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-slate-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="font-semibold capitalize text-ink">{value}</p>
        {badge}
      </div>
    </div>
  );
}

function SummaryMetric({ label, value, badge }: { label: string; value: string; badge?: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold capitalize text-ink">{value}</p>
        {badge}
      </div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-5 text-ink">{value}</p>
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50/80 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium capitalize text-ink">{value.replaceAll("_", " ")}</p>
    </div>
  );
}

function getRangeLabel(view: CalendarView, month: string, selectedDate: string): string {
  if (view === "month") return formatMonth(month);
  if (view === "day") return formatFullDate(selectedDate);
  const week = getWeekRange(selectedDate);
  return `${formatDateLabel(week[0])} - ${formatDateLabel(week[6])}`;
}

function getWeekdayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(parseLocalDate(date));
}

function formatFullDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(parseLocalDate(date));
}

function parseLocalDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getDayPressureLevel(dayNewsletters: Newsletter[], allNewsletters: Newsletter[]) {
  const weights = { healthy: 1, watch: 2, saturated: 3, overexposed: 4 };
  return dayNewsletters
    .map((newsletter) => getNewsletterSaturation(newsletter, allNewsletters).saturationLevel)
    .sort((a, b) => weights[b] - weights[a])[0] ?? "healthy";
}

function getDayToneClass(level: ReturnType<typeof getDayPressureLevel>, hasSends: boolean): string {
  if (!hasSends) return "bg-[#fbfbf8] hover:bg-white";
  if (level === "overexposed") return "bg-red-50/55 hover:bg-red-50/75";
  if (level === "saturated") return "bg-orange-50/60 hover:bg-orange-50/80";
  if (level === "watch") return "bg-amber-50/55 hover:bg-amber-50/75";
  return "bg-emerald-50/35 hover:bg-white";
}

function getPressureRailClass(level: ReturnType<typeof getDayPressureLevel>, hasSends: boolean): string {
  if (!hasSends) return "bg-transparent";
  if (level === "overexposed") return "bg-red-500";
  if (level === "saturated") return "bg-orange-500";
  if (level === "watch") return "bg-amber-500";
  return "bg-emerald-600";
}
