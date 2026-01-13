import { apiFetch } from "./client";
import type {
  ImportJob,
  Shipment,
  PresetAddress,
  PresetPackage,
  Paginated,
} from "./types";

type ImportJobResponse = Omit<ImportJob, "id"> & {
  id?: string;
  import_job_id?: string;
};

function normalizeImportJob(data: ImportJobResponse): ImportJob {
  const id = data.id ?? data.import_job_id;
  if (!id) {
    throw new Error("Missing import job id");
  }
  const { import_job_id, ...rest } = data;
  return { ...rest, id };
}

export type ListShipmentsParams = {
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
};

function buildQuery(params?: Record<string, string | number | undefined>) {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function uploadImport(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<ImportJobResponse>("/imports/", {
    method: "POST",
    body: formData,
  }).then(normalizeImportJob);
}

export function getImport(importId: string) {
  return apiFetch<ImportJobResponse>(`/imports/${importId}/`).then(
    normalizeImportJob,
  );
}

export function listShipments(importId: string, params?: ListShipmentsParams) {
  const query = buildQuery(params);
  return apiFetch<Paginated<Shipment>>(
    `/imports/${importId}/shipments/${query}`,
  );
}

export function patchShipment(shipmentId: string, payload: Partial<Shipment>) {
  return apiFetch<Shipment>(`/shipments/${shipmentId}/`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteShipment(shipmentId: string) {
  return apiFetch<void>(`/shipments/${shipmentId}/`, {
    method: "DELETE",
  });
}

export function bulkShipments(
  importId: string,
  payload: Record<string, unknown>,
) {
  return apiFetch(`/imports/${importId}/shipments/bulk/`, {
    method: "POST",
    body: payload,
  });
}

export function listAddressPresets() {
  return apiFetch<PresetAddress[]>("/presets/addresses/");
}

export function createAddressPreset(payload: Partial<PresetAddress>) {
  return apiFetch<PresetAddress>("/presets/addresses/", {
    method: "POST",
    body: payload,
  });
}

export function listPackagePresets() {
  return apiFetch<PresetPackage[]>("/presets/packages/");
}

export function createPackagePreset(payload: Partial<PresetPackage>) {
  return apiFetch<PresetPackage>("/presets/packages/", {
    method: "POST",
    body: payload,
  });
}

export type QuoteRequest = { import_id: string } | { shipment_ids: string[] };

export function quoteShipping(payload: QuoteRequest) {
  return apiFetch(`/shipping/quote/`, {
    method: "POST",
    body: payload,
  });
}

export function purchase(
  importId: string,
  payload: { label_format: "LETTER" | "LABEL_4X6"; agree_to_terms: boolean },
) {
  return apiFetch(`/imports/${importId}/purchase/`, {
    method: "POST",
    body: payload,
  });
}
