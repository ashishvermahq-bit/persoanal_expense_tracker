/**
 * Tiny typed fetch wrapper for calling our own /api routes from client
 * components. Mirrors the `{ data } | { error }` envelope in lib/api.ts.
 */
export interface ApiFailure {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {}
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    credentials: "same-origin",
  });

  type Envelope = { data?: T; error?: ApiFailure };
  let body: Envelope | null = null;
  try {
    body = (await res.json()) as Envelope;
  } catch {
    /* non-JSON body */
  }

  // Session expired or revoked mid-use (password changed elsewhere, 7-day expiry):
  // send the user to sign in and back here, instead of failing every action.
  // /api/auth/* is excluded: a wrong password on the login form is also a 401.
  if (res.status === 401 && !path.startsWith("/api/auth/") && typeof window !== "undefined") {
    const back = window.location.pathname + window.location.search;
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- auth changed: full navigation drops stale client state
    window.location.assign(`/login?reauth=1&next=${encodeURIComponent(back)}`);
  }

  if (!res.ok || !body || body.error) {
    const err = body?.error;
    throw new ApiClientError(res.status, err?.code ?? "HTTP_ERROR", err?.message ?? `Request failed (${res.status})`, err?.fields);
  }
  return body.data as T;
}
