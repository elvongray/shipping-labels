import { toApiClientError } from "./errors";
import type { ApiError } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: Record<string, unknown> | FormData;
};

function isFormData(body: RequestOptions["body"]): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers = new Headers(options.headers);
  const body = options.body;

  if (body && !isFormData(body)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body: body ? (isFormData(body) ? body : JSON.stringify(body)) : undefined,
  });

  if (!response.ok) {
    let payload: ApiError | undefined;
    try {
      payload = (await response.json()) as ApiError;
    } catch {
      payload = undefined;
    }
    const requestId = response.headers.get("X-Request-ID");
    throw toApiClientError(response.status, requestId, payload);
  }

  return parseResponse<T>(response);
}
