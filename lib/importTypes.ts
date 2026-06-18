import type { Campaign, Newsletter, NewsletterData, Segment } from "./newsletterTypes";

export interface RawNewsletterImportRow {
  newsletter_id: string;
  newsletter_name: string;
  campaign_id: string;
  campaign_name: string;
  campaign_type: string;
  campaign_stage: string;
  sequence_position: number;
  sent_at: string;
  subject_line: string;
  preview_text: string;
  sender_name: string;
  content_type: string;
  creative_angle: string;
  message_theme: string;
  cta_label: string;
  offer_type: string;
  discount_value: number;
  product_focus: string;
  segment_id: string;
  segment_name: string;
  audience_type: string;
  sent: number;
  delivered: number;
  bounced: number;
  unique_opens: number;
  total_opens: number;
  unique_clicks: number;
  total_clicks: number;
  orders: number;
  revenue: number;
  currency: string;
  unsubscribes: number;
  spam_complaints: number;
  attribution_window: string;
  creative_url: string;
  landing_page_url: string;
  notes: string;
}

export interface ImportValidationIssue {
  id: string;
  rowIndex: number | null;
  severity: "warning" | "error";
  field?: keyof RawNewsletterImportRow;
  message: string;
}

export interface ImportSummary {
  rowCount: number;
  newsletterCount: number;
  campaignCount: number;
  segmentCount: number;
  issueCount: number;
  errorCount: number;
  warningCount: number;
  status: "ready" | "needs_review" | "blocked";
}

export interface NormalizedNewsletterDataset extends NewsletterData {
  campaigns: Campaign[];
  segments: Segment[];
  newsletters: Newsletter[];
  importSummary: ImportSummary;
  validationIssues: ImportValidationIssue[];
}
