import type { AudienceMember } from "../audienceTypes";
import type { Campaign, Newsletter, NewsletterData, Segment, SegmentPerformance } from "../newsletterTypes";
import type { TargetSettings } from "../targetTypes";
import type { AdapterSource, AdapterValidationResult } from "./types";

export interface NormalizedSegmentPerformance extends SegmentPerformance {
  newsletterId: string;
  campaignId: string;
}

export interface NormalizedRecordCounts {
  campaigns: number;
  segments: number;
  newsletters: number;
  segmentPerformance: number;
  audienceMembers: number;
}

export interface NormalizedDatasetMetadata {
  source: AdapterSource;
  importedAt: string;
  recordCounts: NormalizedRecordCounts;
  validation: AdapterValidationResult;
  sourceMetadata: NewsletterData["meta"] & Record<string, unknown>;
}

export interface NormalizedDataset {
  campaigns: Campaign[];
  segments: Segment[];
  newsletters: Newsletter[];
  segmentPerformance: NormalizedSegmentPerformance[];
  audienceMembers: AudienceMember[];
  targets: TargetSettings | null;
  metadata: NormalizedDatasetMetadata;
}
