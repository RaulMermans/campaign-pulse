import defaultTargets from "@/data/targets.json";
import type { TargetSettings, TargetValues } from "./targetTypes";

export const TARGET_STORAGE_KEY = "campaign-pulse-targets-v1";

const targetKeys: Array<keyof TargetValues> = [
  "monthlyRevenue",
  "openRate",
  "clickRate",
  "clickToOpenRate",
  "conversionRate",
  "revenuePerRecipient",
  "maxUnsubscribeRate",
  "maxSpamRate",
  "maxSendsPerSegmentWeek",
  "maxPressureScore"
];

export function getDefaultTargetSettings(): TargetSettings {
  return normalizeTargetSettings(defaultTargets as TargetSettings);
}

export function loadTargetSettings(): TargetSettings {
  const defaults = getDefaultTargetSettings();
  if (typeof window === "undefined") return defaults;

  try {
    const stored = window.localStorage.getItem(TARGET_STORAGE_KEY);
    if (!stored) return defaults;
    return normalizeTargetSettings({ ...defaults, ...JSON.parse(stored) });
  } catch {
    return defaults;
  }
}

export function saveTargetSettings(settings: TargetSettings): TargetSettings {
  const normalized = normalizeTargetSettings(settings);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TARGET_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function resetTargetSettings(): TargetSettings {
  const defaults = getDefaultTargetSettings();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TARGET_STORAGE_KEY);
  }
  return defaults;
}

export function normalizeTargetSettings(settings: TargetSettings): TargetSettings {
  const defaults = defaultTargets as TargetSettings;
  return {
    global: normalizeTargetValues({ ...defaults.global, ...settings.global }, defaults.global),
    campaigns: normalizeTargetGroup(settings.campaigns ?? {}, defaults.global),
    segments: normalizeTargetGroup(settings.segments ?? {}, defaults.global)
  };
}

function normalizeTargetGroup(group: TargetSettings["campaigns"], fallback: TargetValues): TargetSettings["campaigns"] {
  return Object.fromEntries(
    Object.entries(group).map(([id, values]) => [id, normalizeTargetOverrides(values, fallback)])
  );
}

function normalizeTargetOverrides(values: Partial<TargetValues>, fallback: TargetValues): Partial<TargetValues> {
  return targetKeys.reduce<Partial<TargetValues>>((acc, key) => {
    if (values[key] === undefined) return acc;
    acc[key] = cleanNumber(values[key], fallback[key]);
    return acc;
  }, {});
}

function normalizeTargetValues(values: Partial<TargetValues>, fallback: TargetValues): TargetValues {
  return targetKeys.reduce<TargetValues>((acc, key) => {
    acc[key] = cleanNumber(values[key], fallback[key]);
    return acc;
  }, { ...fallback });
}

function cleanNumber(value: unknown, fallback: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}
