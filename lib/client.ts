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

  if (!res.ok || !body || body.error) {
    const err = body?.error;
    throw new ApiClientError(res.status, err?.code ?? "HTTP_ERROR", err?.message ?? `Request failed (${res.status})`, err?.fields);
  }
  return body.data as T;
}
