export type TargetStatusLabel = "On track" | "Watch" | "Off track";
export type TargetScope = "global" | "campaign" | "segment";

export interface TargetValues {
  monthlyRevenue: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  conversionRate: number;
  revenuePerRecipient: number;
  maxUnsubscribeRate: number;
  maxSpamRate: number;
  maxSendsPerSegmentWeek: number;
  maxPressureScore: number;
}

export type TargetOverrides = Partial<TargetValues>;

export interface TargetSettings {
  global: TargetValues;
  campaigns: Record<string, TargetOverrides>;
  segments: Record<string, TargetOverrides>;
}

export interface TargetActuals {
  monthlyRevenue?: number;
  openRate?: number;
  clickRate?: number;
  clickToOpenRate?: number;
  conversionRate?: number;
  revenuePerRecipient?: number;
  unsubscribeRate?: number;
  spamRate?: number;
  sendsPerSegmentWeek?: number;
  pressureScore?: number;
}

export interface TargetComparison {
  key: keyof TargetActuals;
  targetKey: keyof TargetValues;
  label: string;
  actual: number;
  target: number;
  status: TargetStatusLabel;
  direction: "minimum" | "maximum";
  variance: number;
}

export type TargetComparisonMap = Partial<Record<keyof TargetActuals, TargetComparison>>;
