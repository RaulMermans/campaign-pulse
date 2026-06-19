import type { AudienceMember } from "../audienceTypes";
import type { Campaign, Newsletter, NewsletterData, Segment } from "../newsletterTypes";
import type { TargetSettings } from "../targetTypes";
import type { NormalizedDataset, NormalizedSegmentPerformance } from "./normalizedSchema";
import type { DataAdapter } from "./types";
import { validateNormalizedDataset } from "./validateNormalizedDataset";

export interface DemoJsonAdapterInput extends NewsletterData {
  audienceMembers?: AudienceMember[];
  targets?: TargetSettings;
}

const source = {
  id: "campaign-pulse-demo-json",
  label: "Demo JSON",
  type: "demo_json" as const
};

export const demoJsonAdapter: DataAdapter<unknown, NormalizedDataset> = {
  ...source,
  validate: validateNormalizedDataset,
  normalize(input) {
    const validation = validateNormalizedDataset(input);
    const root = asRecord(input);
    const campaigns = getArray<Campaign>(root?.campaigns);
    const segments = getArray<Segment>(root?.segments);
    const newsletters = getArray<Newsletter>(root?.newsletters);
    const audienceMembers = getArray<AudienceMember>(root?.audienceMembers);
    const targets = asRecord(root?.targets) ? root?.targets as unknown as TargetSettings : null;
    const sourceMetadata = asRecord(root?.meta)
      ? root?.meta as NewsletterData["meta"] & Record<string, unknown>
      : {
          projectName: "Campaign Pulse",
          currency: newsletters[0]?.metrics.currency ?? "EUR",
          source: source.label,
          generatedAt: new Date(0).toISOString()
        };
    const segmentPerformance: NormalizedSegmentPerformance[] = newsletters.flatMap((newsletter) =>
      Array.isArray(newsletter.segmentPerformance)
        ? newsletter.segmentPerformance.map((performance) => ({
            ...performance,
            newsletterId: newsletter.id,
            campaignId: newsletter.campaign?.id ?? ""
          }))
        : []
    );

    return {
      dataset: {
        campaigns,
        segments,
        newsletters,
        segmentPerformance,
        audienceMembers,
        targets,
        metadata: {
          source,
          importedAt: typeof sourceMetadata.generatedAt === "string" ? sourceMetadata.generatedAt : new Date(0).toISOString(),
          recordCounts: {
            campaigns: campaigns.length,
            segments: segments.length,
            newsletters: newsletters.length,
            segmentPerformance: segmentPerformance.length,
            audienceMembers: audienceMembers.length
          },
          validation,
          sourceMetadata
        }
      },
      warnings: validation.warnings,
      errors: validation.errors
    };
  }
};

function getArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value.filter((item) => asRecord(item)) as T[] : [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}
