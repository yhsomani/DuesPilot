export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

interface ApiEnvelope<T> {
  data: T;
}

/**
 * Thin client for the app's JSON API. Assumes responses take the shape
 * `{ data: T }` on success and `{ error: string }` on failure.
 */
export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  if (res.status === 401) {
    const callbackUrl = encodeURIComponent(window.location.pathname + window.location.search);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- generic fetch helper; full redirect required on session expiry
    window.location.href = `/login?callbackUrl=${callbackUrl}`;
    throw new ApiError("Unauthorized", 401);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const message =
      (body as { error?: string } | null)?.error || "Something went wrong.";
    throw new ApiError(message, res.status);
  }

  return (body as ApiEnvelope<T>).data;
}

export async function apiPost<TReq, TRes>(
  path: string,
  body: TReq
): Promise<TRes> {
  return api<TRes>(path, { method: "POST", body: JSON.stringify(body) });
}

export async function apiPatch<TReq, TRes>(
  path: string,
  body: TReq
): Promise<TRes> {
  return api<TRes>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export async function apiDel<TRes>(path: string): Promise<TRes> {
  return api<TRes>(path, { method: "DELETE" });
}
