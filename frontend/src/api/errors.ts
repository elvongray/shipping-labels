import type { ApiError } from "./types";

export class ApiClientError extends Error {
  code: string;
  status: number;
  requestId?: string;
  details?: unknown;

  constructor(
    message: string,
    options: {
      code: string;
      status: number;
      requestId?: string;
      details?: unknown;
    },
  ) {
    super(message);
    this.name = "ApiClientError";
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId;
    this.details = options.details;
  }
}

export function toApiClientError(
  status: number,
  requestId: string | null,
  payload?: ApiError,
) {
  const code = payload?.error?.code ?? "UNKNOWN";
  const message = payload?.error?.message ?? "Request failed";
  const details = payload?.error?.details;

  return new ApiClientError(message, {
    code,
    status,
    requestId: requestId ?? undefined,
    details,
  });
}
