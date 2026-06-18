export type TargetInputKind = "currency" | "percent" | "number";

export function displayTargetInputValue(value: number, kind: TargetInputKind): string {
  const display = kind === "percent" ? (value * 100).toFixed(2) : value.toFixed(kind === "currency" ? 2 : 0);
  return display.replace(/\.?0+$/, "") || "0";
}

export function parseTargetInputValue(value: string, kind: TargetInputKind): number {
  const normalized = value.trim().replace(",", ".");
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return kind === "percent" ? numeric / 100 : numeric;
}
