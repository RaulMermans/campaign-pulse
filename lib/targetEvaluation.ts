import type { TargetActuals, TargetComparison, TargetComparisonMap, TargetScope, TargetSettings, TargetValues } from "./targetTypes";

const TARGET_DEFINITIONS: Array<{
  actualKey: keyof TargetActuals;
  targetKey: keyof TargetValues;
  label: string;
  direction: "minimum" | "maximum";
}> = [
  { actualKey: "monthlyRevenue", targetKey: "monthlyRevenue", label: "Revenue", direction: "minimum" },
  { actualKey: "openRate", targetKey: "openRate", label: "OR", direction: "minimum" },
  { actualKey: "clickRate", targetKey: "clickRate", label: "CTR", direction: "minimum" },
  { actualKey: "clickToOpenRate", targetKey: "clickToOpenRate", label: "CTOR", direction: "minimum" },
  { actualKey: "conversionRate", targetKey: "conversionRate", label: "Conversion", direction: "minimum" },
  { actualKey: "revenuePerRecipient", targetKey: "revenuePerRecipient", label: "RPR", direction: "minimum" },
  { actualKey: "unsubscribeRate", targetKey: "maxUnsubscribeRate", label: "Unsub", direction: "maximum" },
  { actualKey: "spamRate", targetKey: "maxSpamRate", label: "Spam", direction: "maximum" },
  { actualKey: "sendsPerSegmentWeek", targetKey: "maxSendsPerSegmentWeek", label: "Weekly sends", direction: "maximum" },
  { actualKey: "pressureScore", targetKey: "maxPressureScore", label: "Pressure", direction: "maximum" }
];

const WATCH_TOLERANCE = 0.1;

export function resolveTargets(settings: TargetSettings, scope: TargetScope, id?: string): TargetValues {
  if (scope === "global" || !id) return { ...settings.global };
  const overrides = scope === "campaign" ? settings.campaigns[id] : settings.segments[id];
  return { ...settings.global, ...overrides };
}

export function evaluateActualsAgainstTargets({ actuals, targets }: { actuals: TargetActuals; targets: TargetValues }): TargetComparisonMap {
  return TARGET_DEFINITIONS.reduce<TargetComparisonMap>((acc, definition) => {
    const actual = actuals[definition.actualKey];
    const target = targets[definition.targetKey];
    if (typeof actual !== "number" || typeof target !== "number") return acc;

    acc[definition.actualKey] = {
      key: definition.actualKey,
      targetKey: definition.targetKey,
      label: definition.label,
      actual,
      target,
      direction: definition.direction,
      variance: getVariance(actual, target, definition.direction),
      status: getTargetStatus(actual, target, definition.direction)
    };
    return acc;
  }, {});
}

export function getTargetStatus(actual: number, target: number, direction: TargetComparison["direction"]): TargetComparison["status"] {
  if (target <= 0) return actual <= 0 ? "On track" : "Off track";
  if (direction === "minimum") {
    if (actual >= target) return "On track";
    if (actual >= target * (1 - WATCH_TOLERANCE)) return "Watch";
    return "Off track";
  }
  if (actual <= target) return "On track";
  if (actual <= target * (1 + WATCH_TOLERANCE)) return "Watch";
  return "Off track";
}

function getVariance(actual: number, target: number, direction: TargetComparison["direction"]): number {
  if (!target) return 0;
  return direction === "minimum" ? actual / target - 1 : 1 - actual / target;
}
