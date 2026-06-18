import { getNewsletterSaturation, getSaturationLevel } from "./newsletterSaturation";
import type { Newsletter, SaturationLevel } from "./newsletterTypes";

export interface CalendarDateCell {
  date: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
}

export interface CalendarPeriodSummary {
  sends: number;
  revenue: number;
  delivered: number;
  strongestSend: Newsletter | null;
  highestPressureStatus: SaturationLevel;
  highestPressureNewsletter: Newsletter | null;
  highestRiskAudience: string;
  highestRiskCampaign: string;
  pressureNote: string;
  suggestedNextAction: string;
}

export function getMonthCalendarGrid(month: string): CalendarDateCell[] {
  const [year, monthIndex] = parseMonthKey(month);
  const firstDay = new Date(year, monthIndex - 1, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = addDays(firstDay, -mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return {
      date: toDateKey(date),
      dayOfMonth: date.getDate(),
      isCurrentMonth: date.getMonth() === monthIndex - 1
    };
  });
}

export function getWeekRange(date: string): string[] {
  const selectedDate = parseDateKey(date);
  const mondayOffset = (selectedDate.getDay() + 6) % 7;
  const start = addDays(selectedDate, -mondayOffset);

  return Array.from({ length: 7 }, (_, index) => toDateKey(addDays(start, index)));
}

export function groupNewslettersByDay(newsletters: Newsletter[]): Record<string, Newsletter[]> {
  const grouped = newsletters.reduce<Record<string, Newsletter[]>>((acc, newsletter) => {
    const date = getNewsletterDateKey(newsletter);
    acc[date] ||= [];
    acc[date].push(newsletter);
    return acc;
  }, {});

  Object.values(grouped).forEach((items) => items.sort((a, b) => a.timing.sentAt.localeCompare(b.timing.sentAt)));
  return grouped;
}

export function getNewslettersForDate(newsletters: Newsletter[], date: string): Newsletter[] {
  const dateKey = normalizeDateKey(date);
  return newsletters
    .filter((newsletter) => getNewsletterDateKey(newsletter) === dateKey)
    .sort((a, b) => a.timing.sentAt.localeCompare(b.timing.sentAt));
}

export function getWeekSummary(newsletters: Newsletter[], allNewsletters: Newsletter[] = newsletters): CalendarPeriodSummary {
  return getPeriodSummary(newsletters, allNewsletters);
}

export function getDaySummary(newsletters: Newsletter[], allNewsletters: Newsletter[] = newsletters): CalendarPeriodSummary {
  return getPeriodSummary(newsletters, allNewsletters);
}

function getPeriodSummary(newsletters: Newsletter[], allNewsletters: Newsletter[]): CalendarPeriodSummary {
  const strongestSend = newsletters.length ? [...newsletters].sort((a, b) => b.metrics.revenue - a.metrics.revenue)[0] : null;
  const pressureRanked = newsletters
    .map((newsletter) => ({
      newsletter,
      saturation: getNewsletterSaturation(newsletter, allNewsletters)
    }))
    .sort((a, b) => {
      const levelDelta = saturationLevelWeight(b.saturation.saturationLevel) - saturationLevelWeight(a.saturation.saturationLevel);
      return levelDelta || b.saturation.saturationScore - a.saturation.saturationScore;
    });
  const highestPressure = pressureRanked[0] ?? null;
  const averagePressure = newsletters.length
    ? newsletters.reduce((total, newsletter) => total + getNewsletterSaturation(newsletter, allNewsletters).saturationScore, 0) / newsletters.length
    : 0;
  const highestPressureStatus = highestPressure?.saturation.saturationLevel ?? getSaturationLevel(averagePressure);
  const highestPressureNewsletter = highestPressure?.newsletter ?? null;

  return {
    sends: newsletters.length,
    revenue: newsletters.reduce((total, newsletter) => total + newsletter.metrics.revenue, 0),
    delivered: newsletters.reduce((total, newsletter) => total + newsletter.metrics.delivered, 0),
    strongestSend,
    highestPressureStatus,
    highestPressureNewsletter,
    highestRiskAudience: highestPressureNewsletter?.audience.audienceName ?? "No active pressure",
    highestRiskCampaign: highestPressureNewsletter?.campaign.name ?? "No active campaign risk",
    pressureNote: getPressureNote(highestPressureStatus, highestPressureNewsletter),
    suggestedNextAction: getSuggestedNextAction(highestPressureStatus, highestPressureNewsletter)
  };
}

function getPressureNote(level: SaturationLevel, newsletter: Newsletter | null): string {
  if (!newsletter) return "No sends in this period, so no audience pressure is active.";
  if (level === "healthy") return `${newsletter.audience.audienceName} is within a healthy pressure range.`;
  if (level === "watch") return `${newsletter.audience.audienceName} is the watchpoint; keep the next send lighter or more editorial.`;
  return `${newsletter.audience.audienceName} is carrying the period's highest pressure from ${newsletter.campaign.name}.`;
}

function getSuggestedNextAction(level: SaturationLevel, newsletter: Newsletter | null): string {
  if (!newsletter) return "Use the open space for recovery, testing, or a high-fit strategic send.";
  if (level === "overexposed" || level === "saturated") {
    return `Protect ${newsletter.audience.audienceName} before another ${newsletter.campaign.type} push.`;
  }
  if (level === "watch") return `Sequence the next ${newsletter.campaign.name} send away from the same audience.`;
  return `Keep cadence steady and reuse the strongest pattern from ${newsletter.name}.`;
}

function saturationLevelWeight(level: SaturationLevel): number {
  return { healthy: 1, watch: 2, saturated: 3, overexposed: 4 }[level];
}

function parseMonthKey(month: string): [number, number] {
  const [year, monthIndex] = month.split("-").map(Number);
  return [year, monthIndex];
}

function parseDateKey(date: string): Date {
  const [year, monthIndex, day] = normalizeDateKey(date).split("-").map(Number);
  return new Date(year, monthIndex - 1, day);
}

function normalizeDateKey(date: string): string {
  return date.slice(0, 10);
}

function getNewsletterDateKey(newsletter: Newsletter): string {
  return newsletter.timing.sentAt.slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
