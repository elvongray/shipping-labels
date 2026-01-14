export type ImportStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type ValidationStatus = "NEEDS_INFO" | "INVALID" | "READY";
export type AddressVerificationStatus =
  | "NOT_STARTED"
  | "VALID"
  | "CORRECTED"
  | "INVALID"
  | "FAILED";

export type ImportJob = {
  id: string;
  created_at: string;
  updated_at: string;
  original_filename: string;
  status: ImportStatus;
  progress_total: number;
  progress_done: number;
  error_summary?: string | null;
  meta?: Record<string, unknown> | null;
  ready_count?: number;
  invalid_count?: number;
  needs_info_count?: number;
};

export type Shipment = {
  id: string;
  import_job: string;
  row_number?: number;
  external_order_number?: string | null;
  sku?: string | null;
  from_name?: string | null;
  from_company?: string | null;
  from_street1?: string | null;
  from_street2?: string | null;
  from_city?: string | null;
  from_state?: string | null;
  from_postal_code?: string | null;
  from_country?: string | null;
  to_name?: string | null;
  to_company?: string | null;
  to_street1?: string | null;
  to_street2?: string | null;
  to_city?: string | null;
  to_state?: string | null;
  to_postal_code?: string | null;
  to_country?: string | null;
  weight_oz?: number | null;
  length_in?: number | null;
  width_in?: number | null;
  height_in?: number | null;
  validation_status: ValidationStatus;
  validation_errors?: unknown;
  address_verification_status: AddressVerificationStatus;
  address_verification_details?: unknown;
  selected_service?: string | null;
  selected_service_price_cents?: number | null;
  label_status?: "NOT_PURCHASED" | "PURCHASED" | "FAILED";
  label_url?: string | null;
};

export type PresetAddress = {
  id: string;
  name: string;
  contact_name?: string | null;
  company?: string | null;
  street1: string;
  street2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country?: string | null;
};

export type PresetPackage = {
  id: string;
  name: string;
  weight_oz: number;
  length_in: number;
  width_in: number;
  height_in: number;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};
