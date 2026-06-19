import type { AdapterValidationIssue, AdapterValidationResult } from "./types";

const newsletterMetricFields = [
  "sent",
  "delivered",
  "bounced",
  "uniqueOpens",
  "totalOpens",
  "uniqueClicks",
  "totalClicks",
  "orders",
  "revenue",
  "unsubscribes",
  "spamComplaints"
] as const;

const segmentMetricFields = [
  "sent",
  "delivered",
  "uniqueOpens",
  "uniqueClicks",
  "orders",
  "revenue",
  "unsubscribes"
] as const;

export function validateNormalizedDataset(input: unknown): AdapterValidationResult {
  const warnings: AdapterValidationIssue[] = [];
  const errors: AdapterValidationIssue[] = [];
  const root = asRecord(input);

  if (!root) {
    return {
      status: "error",
      warnings,
      errors: [issue("invalid_root", "Dataset must be an object.", "$")]
    };
  }

  const campaigns = requireArray(root, "campaigns", errors);
  const segments = requireArray(root, "segments", errors);
  const newsletters = requireArray(root, "newsletters", errors);

  if (!Array.isArray(root.audienceMembers)) {
    warnings.push(issue("missing_optional_audience_members", "Optional audienceMembers data is not available.", "audienceMembers", "warning"));
  }
  if (!isRecord(root.targets)) {
    warnings.push(issue("missing_optional_targets", "Optional target settings are not available.", "targets", "warning"));
  }
  if (!isRecord(root.meta)) {
    warnings.push(issue("missing_optional_metadata", "Optional source metadata is not available.", "meta", "warning"));
  }

  const campaignIds = new Set<string>();
  campaigns.forEach((value, index) => {
    const campaign = asRecord(value);
    if (!campaign || !isNonEmptyString(campaign.id)) {
      errors.push(issue("missing_campaign_id", "Campaign id is required.", `campaigns[${index}].id`));
      return;
    }
    campaignIds.add(campaign.id);
    validateDate(campaign.startDate, `campaigns[${index}].startDate`, errors);
    validateDate(campaign.endDate, `campaigns[${index}].endDate`, errors);
  });

  const segmentIds = new Set<string>();
  segments.forEach((value, index) => {
    const segment = asRecord(value);
    if (!segment || !isNonEmptyString(segment.id)) {
      errors.push(issue("missing_segment_id", "Segment id is required.", `segments[${index}].id`));
      return;
    }
    segmentIds.add(segment.id);
  });

  const newsletterIds = new Set<string>();
  newsletters.forEach((value, newsletterIndex) => {
    const newsletter = asRecord(value);
    const basePath = `newsletters[${newsletterIndex}]`;
    if (!newsletter) {
      errors.push(issue("invalid_newsletter", "Newsletter must be an object.", basePath));
      return;
    }

    if (!isNonEmptyString(newsletter.id)) {
      errors.push(issue("missing_newsletter_id", "Newsletter id is required.", `${basePath}.id`));
    } else if (newsletterIds.has(newsletter.id)) {
      errors.push(issue("duplicate_newsletter_id", `Newsletter id "${newsletter.id}" must be unique.`, `${basePath}.id`));
    } else {
      newsletterIds.add(newsletter.id);
    }

    const campaign = asRecord(newsletter.campaign);
    const campaignId = campaign?.id;
    if (!isNonEmptyString(campaignId)) {
      errors.push(issue("missing_newsletter_campaign", "Newsletter campaign id is required.", `${basePath}.campaign.id`));
    } else if (!campaignIds.has(campaignId)) {
      errors.push(issue("broken_campaign_reference", `Newsletter references unknown campaign "${campaignId}".`, `${basePath}.campaign.id`));
    }

    const timing = asRecord(newsletter.timing);
    validateDate(timing?.sentAt, `${basePath}.timing.sentAt`, errors);

    const metrics = asRecord(newsletter.metrics);
    if (!metrics) {
      errors.push(issue("missing_newsletter_metrics", "Newsletter metrics are required.", `${basePath}.metrics`));
    } else {
      validateMetrics(metrics, newsletterMetricFields, `${basePath}.metrics`, errors);
      validateDelivery(metrics, `${basePath}.metrics`, errors);
    }

    if (!Array.isArray(newsletter.segmentPerformance)) {
      errors.push(issue("missing_segment_performance", "Newsletter segmentPerformance must be an array.", `${basePath}.segmentPerformance`));
      return;
    }

    newsletter.segmentPerformance.forEach((value, segmentIndex) => {
      const performance = asRecord(value);
      const performancePath = `${basePath}.segmentPerformance[${segmentIndex}]`;
      if (!performance) {
        errors.push(issue("invalid_segment_performance", "Segment performance must be an object.", performancePath));
        return;
      }

      if (!isNonEmptyString(performance.segmentId)) {
        errors.push(issue("missing_segment_reference", "Segment performance segmentId is required.", `${performancePath}.segmentId`));
      } else if (!segmentIds.has(performance.segmentId)) {
        errors.push(issue("broken_segment_reference", `Segment performance references unknown segment "${performance.segmentId}".`, `${performancePath}.segmentId`));
      }

      validateMetrics(performance, segmentMetricFields, performancePath, errors);
      validateDelivery(performance, performancePath, errors);
    });
  });

  return {
    status: errors.length ? "error" : warnings.length ? "warning" : "valid",
    warnings,
    errors
  };
}

function requireArray(root: Record<string, unknown>, key: string, errors: AdapterValidationIssue[]): unknown[] {
  if (Array.isArray(root[key])) return root[key];
  errors.push(issue("missing_required_array", `Required array "${key}" is missing.`, key));
  return [];
}

function validateMetrics(
  metrics: Record<string, unknown>,
  fields: readonly string[],
  path: string,
  errors: AdapterValidationIssue[]
) {
  fields.forEach((field) => {
    const value = metrics[field];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      errors.push(issue("invalid_numeric_metric", `${field} must be a valid number.`, `${path}.${field}`));
    } else if (value < 0) {
      errors.push(issue("negative_metric", `${field} cannot be negative.`, `${path}.${field}`));
    }
  });
}

function validateDelivery(metrics: Record<string, unknown>, path: string, errors: AdapterValidationIssue[]) {
  if (
    typeof metrics.sent === "number"
    && Number.isFinite(metrics.sent)
    && typeof metrics.delivered === "number"
    && Number.isFinite(metrics.delivered)
    && metrics.delivered > metrics.sent
  ) {
    errors.push(issue("delivered_exceeds_sent", "delivered cannot be greater than sent.", `${path}.delivered`));
  }
}

function validateDate(value: unknown, path: string, errors: AdapterValidationIssue[]) {
  if (!isNonEmptyString(value) || Number.isNaN(Date.parse(value))) {
    errors.push(issue("invalid_date", "Date must be a parseable date string.", path));
  }
}

function issue(
  code: string,
  message: string,
  path: string,
  severity: AdapterValidationIssue["severity"] = "error"
): AdapterValidationIssue {
  return { code, message, path, severity };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return asRecord(value) !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
