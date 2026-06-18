export type SaturationLevel = "healthy" | "watch" | "saturated" | "overexposed";
export type InsightSeverity = "positive" | "neutral" | "warning" | "critical";

export interface Campaign {
  id: string;
  name: string;
  type: "promotion" | "editorial" | "retention" | "event" | string;
  goal: string;
  color: string;
  startDate: string;
  endDate: string;
}

export interface Segment {
  id: string;
  name: string;
  description: string;
  lifecycleStage: string;
  valueTier: string;
}

export interface NewsletterMetrics {
  sent: number;
  delivered: number;
  bounced: number;
  uniqueOpens: number;
  totalOpens: number;
  uniqueClicks: number;
  totalClicks: number;
  orders: number;
  revenue: number;
  currency: string;
  unsubscribes: number;
  spamComplaints: number;
  attributionWindow: string;
}

export interface SegmentPerformance {
  segmentId: string;
  segmentName: string;
  sent: number;
  delivered: number;
  uniqueOpens: number;
  uniqueClicks: number;
  orders: number;
  revenue: number;
  unsubscribes: number;
}

export interface NewsletterInsight {
  id?: string;
  type: string;
  severity: InsightSeverity;
  title: string;
  message: string;
  evidence?: string;
  recommendation: string;
  relatedNewsletterIds?: string[];
  relatedCampaignIds?: string[];
  relatedSegmentIds?: string[];
}

export interface RecommendedAction {
  id: string;
  priority: InsightSeverity;
  priorityLabel: "P1 critical action" | "P2 opportunity" | "P3 watch item";
  title: string;
  action: string;
  evidence: string;
  reason: string;
  affectedArea: string;
  nextScreen: "Newsletters" | "Campaigns" | "Audience" | "Insights";
  relatedInsightId: string;
}

export interface NewsletterDetailInsight {
  summary: string;
  performanceRead: string;
  segmentNotes: string[];
  saturationDiagnosis: string;
  recommendation: string;
}

export interface Newsletter {
  id: string;
  externalId: string;
  name: string;
  title: string;
  status: "sent" | "draft" | "scheduled" | string;
  campaign: {
    id: string;
    name: string;
    type: string;
    stage: string;
    sequencePosition: number;
    sequenceTotal: number;
  };
  timing: {
    sentAt: string;
    timezone: string;
  };
  content: {
    subjectLine: string;
    previewText: string;
    senderName: string;
    contentType: string;
    creativeAngle: string;
    messageTheme: string;
    ctaLabel: string;
    ctaType: string;
    landingPageUrl: string;
    creativeUrl: string;
    notes: string;
  };
  offer: {
    offerType: string;
    discountValue: number;
    discountType: string;
    productFocus: string;
    collection: string;
    pricePoint: string;
    businessGoal: string;
  };
  audience: {
    audienceName: string;
    audienceType: string;
    primarySegmentId: string;
    segmentIds: string[];
    exclusionSegmentIds: string[];
    recipientCount: number;
  };
  metrics: NewsletterMetrics;
  segmentPerformance: SegmentPerformance[];
}

export interface NewsletterData {
  meta: {
    projectName: string;
    month?: string;
    currency: string;
    source: string;
    generatedAt: string;
    schemaVersion?: string;
    sourceShape?: string;
    dateRange?: {
      start: string;
      end: string;
    };
  };
  campaigns: Campaign[];
  segments: Segment[];
  newsletters: Newsletter[];
}

export interface NewsletterRates {
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  conversionRate: number;
  revenuePerRecipient: number;
  revenuePerOpen: number;
  revenuePerClick: number;
  unsubscribeRate: number;
  bounceRate: number;
  spamComplaintRate: number;
}

export interface SaturationAnalysis {
  saturationScore: number;
  saturationLevel: SaturationLevel;
  sendPressure7d: number;
  sendPressure14d: number;
  sameSegmentSends7d: number;
  performanceTrend: "rising" | "stable" | "declining" | "recovering" | string;
  fatigueSignals: string[];
  diagnosis: string;
}

export interface CampaignSummary {
  campaign: Campaign;
  sendCount: number;
  totalSent: number;
  totalDelivered: number;
  uniqueOpens: number;
  uniqueClicks: number;
  orders: number;
  revenue: number;
  unsubscribes: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  conversionRate: number;
  revenuePerRecipient: number;
  unsubscribeRate: number;
  averageSaturationScore: number;
  saturationLevel: SaturationLevel;
  bestNewsletter: Newsletter | null;
  weakestNewsletter: Newsletter | null;
}

export interface SegmentCampaignSummary {
  campaign: Campaign;
  sendCount: number;
  totalSent: number;
  totalDelivered: number;
  uniqueOpens: number;
  uniqueClicks: number;
  orders: number;
  revenue: number;
  unsubscribes: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  conversionRate: number;
  revenuePerRecipient: number;
  unsubscribeRate: number;
}

export interface SegmentSummary {
  segment: Segment;
  sendCount: number;
  totalSent: number;
  totalDelivered: number;
  uniqueOpens: number;
  uniqueClicks: number;
  orders: number;
  revenue: number;
  unsubscribes: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  conversionRate: number;
  revenuePerRecipient: number;
  unsubscribeRate: number;
  averageSaturationScore: number;
  saturationLevel: SaturationLevel;
  bestCampaign: SegmentCampaignSummary | null;
}

export interface SegmentWeekNewsletter {
  id: string;
  name: string;
  campaignName: string;
  campaignType: string;
  contentType: string;
  creativeAngle: string;
  sentAt: string;
}

export interface SegmentWeeklySaturation {
  segment: Segment;
  week: number;
  weekLabel: string;
  newsletters: SegmentWeekNewsletter[];
  sendCount: number;
  totalSent: number;
  totalDelivered: number;
  uniqueOpens: number;
  uniqueClicks: number;
  orders: number;
  revenue: number;
  unsubscribes: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  conversionRate: number;
  revenuePerRecipient: number;
  unsubscribeRate: number;
  previousOpenRate: number | null;
  previousClickRate: number | null;
  previousClickToOpenRate: number | null;
  previousUnsubscribeRate: number | null;
  saturationScore: number;
  saturationLevel: SaturationLevel;
  repeatedCampaignType: string | null;
  repeatedCreativeAngle: string | null;
}

export interface SegmentSaturationHeatmap {
  weeks: number[];
  rows: {
    segment: Segment;
    cells: SegmentWeeklySaturation[];
  }[];
}
