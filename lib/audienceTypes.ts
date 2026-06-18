import type { SaturationLevel } from "./newsletterTypes";

export type FatigueRisk = "low" | "medium" | "high" | "critical";
export type SegmentDecisionLabel = "Protect" | "Scale carefully" | "Cool down" | "Rebuild" | "Test editorial";
export type SegmentMovementLabel = "Growing" | "Stable" | "Declining" | "Fatigued" | "Recovering";

export interface AudienceMember {
  id: string;
  segmentIds: string[];
  maskedEmail: string;
  emailHash?: string;
  country: string;
  city: string;
  lifecycleStage: string;
  totalOrders: number;
  totalRevenue: number;
  lastPurchaseDate: string;
  lastEmailOpenDate: string;
  lastEmailClickDate: string;
  engagementScore: number;
  fatigueRisk: FatigueRisk;
  preferredCategory: string;
}

export interface SegmentMemberSummary {
  memberCount: number;
  totalOrders: number;
  totalRevenue: number;
  averageRevenue: number;
  averageEngagementScore: number;
  highFatigueCount: number;
  topCountry: string;
  topCity: string;
  topCategory: string;
  lifecycleMix: Record<string, number>;
  fatigueMix: Record<FatigueRisk, number>;
  recentOpenCount: number;
  recentClickCount: number;
}

export interface SegmentTrendPoint {
  date: string;
  label: string;
  newsletterId: string;
  newsletterName: string;
  campaignName: string;
  revenue: number;
  revenuePerRecipient: number;
  delivered: number;
}

export interface SegmentEngagementTrendPoint {
  date: string;
  label: string;
  newsletterId: string;
  newsletterName: string;
  campaignName: string;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  unsubscribeRate: number;
}

export interface SegmentCampaignFit {
  campaignId: string;
  campaignName: string;
  campaignType: string;
  color: string;
  sendCount: number;
  revenue: number;
  revenuePerRecipient: number;
  openRate: number;
  clickToOpenRate: number;
  unsubscribeRate: number;
  fitScore: number;
}

export interface AudienceMapPoint {
  segmentId: string;
  name: string;
  lifecycleStage: string;
  valueTier: string;
  value: number;
  pressure: number;
  revenue: number;
  revenuePerRecipient: number;
  sendCount: number;
  memberCount: number;
  engagementScore: number;
  saturationLevel: SaturationLevel;
  decisionLabel: SegmentDecisionLabel;
  priorityScore: number;
  opportunityScore: number;
}

export interface SegmentMovement {
  label: SegmentMovementLabel;
  explanation: string;
  evidence: {
    sendCount: number;
    revenuePerRecipientChange: number;
    openRateChange: number;
    clickToOpenRateChange: number;
    unsubscribeRateChange: number;
    highFatigueShare: number;
  };
}
