import { formatMonth } from "@/lib/formatters";

interface DashboardHeaderProps {
  projectName: string;
  month: string;
  availableMonths: string[];
  source: string;
  onMonthChange: (month: string) => void;
}

export function DashboardHeader({ projectName, month, availableMonths, source, onMonthChange }: DashboardHeaderProps) {
  return (
    <header className="rounded-xl border border-line bg-card px-6 py-6 shadow-soft md:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">Newsletter intelligence</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal text-ink md:text-6xl">{projectName}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
            A strategic command center for campaign performance, segment saturation, and monthly send quality.
          </p>
        </div>
        <div className="grid gap-3 text-sm text-ink sm:grid-cols-3 lg:min-w-[520px]">
          <div className="rounded-lg border border-line bg-slate-50/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Month</p>
            <select
              className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-2 font-medium text-ink outline-none transition focus:ring-2 focus:ring-ink"
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
          </div>
          <div className="rounded-lg border border-line bg-slate-50/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Campaign</p>
            <p className="mt-2 font-medium">All campaigns</p>
          </div>
          <div className="rounded-lg border border-line bg-slate-50/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Source</p>
            <p className="mt-2 truncate font-medium">{source.replaceAll("_", " ")}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
