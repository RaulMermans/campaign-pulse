interface CampaignColorTagProps {
  color: string;
  label: string;
  type?: string;
}

export function CampaignColorTag({ color, label, type }: CampaignColorTagProps) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold text-ink"
      style={{
        borderColor: hexToRgba(color, 0.24),
        backgroundColor: hexToRgba(color, 0.07)
      }}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">{label}</span>
      {type ? <span className="hidden text-muted sm:inline">/ {type}</span> : null}
    </span>
  );
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  if ([red, green, blue].some(Number.isNaN)) {
    return `rgba(120, 113, 108, ${alpha})`;
  }

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
