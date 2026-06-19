export type AdapterSourceType =
  | "demo_json"
  | "csv_export"
  | "klaviyo_export"
  | "mailchimp_export"
  | "hubspot_export"
  | "customer_io_export";

export type AdapterValidationStatus = "valid" | "warning" | "error";
export type AdapterIssueSeverity = "warning" | "error";

export interface AdapterSource {
  id: string;
  label: string;
  type: AdapterSourceType;
}

export interface AdapterValidationIssue {
  code: string;
  severity: AdapterIssueSeverity;
  message: string;
  path?: string;
}

export interface AdapterValidationResult {
  status: AdapterValidationStatus;
  warnings: AdapterValidationIssue[];
  errors: AdapterValidationIssue[];
}

export interface AdapterNormalizationResult<TDataset> {
  dataset: TDataset;
  warnings: AdapterValidationIssue[];
  errors: AdapterValidationIssue[];
}

export interface DataAdapter<TInput, TDataset> extends AdapterSource {
  validate(input: TInput): AdapterValidationResult;
  normalize(input: TInput): AdapterNormalizationResult<TDataset>;
}

export const futureAdapterSources: AdapterSource[] = [
  { id: "klaviyo-export", label: "Klaviyo", type: "klaviyo_export" },
  { id: "mailchimp-export", label: "Mailchimp", type: "mailchimp_export" },
  { id: "hubspot-export", label: "HubSpot", type: "hubspot_export" },
  { id: "customer-io-export", label: "Customer.io", type: "customer_io_export" }
];
