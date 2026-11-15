import "server-only";
import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import type { ZodType } from "zod";
import { verifiedSession } from "@/lib/auth/verified-session";
import { redactForLog } from "@/lib/log";
import { fieldErrors } from "@/lib/validation/fields";

/**
 * Every JSON API response is `{ data }` on success or
 * `{ error: { code, message, fields? } }` on failure.
 */
export type ApiErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "LOCKED"
  | "INTERNAL";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; fields?: Record<string, string> };
}

const STATUS: Record<ApiErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  LOCKED: 423,
  INTERNAL: 500,
};

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public fields?: Record<string, string>,
    public headers?: Record<string, string>
  ) {
    super(message);
  }
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse<{ data: T }> {
  return NextResponse.json({ data }, init);
}

export function fail(err: ApiError): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) } },
    { status: STATUS[err.code], headers: err.headers }
  );
}

/** Parse JSON body against a Zod schema, throwing a field-level ApiError. */
export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new ApiError("VALIDATION", "Request body must be JSON");
  }
  return parseWith(schema, json);
}

export function parseWith<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw new ApiError("VALIDATION", "Please fix the highlighted fields", fieldErrors(result.error));
}

type Handler<C> = (request: Request, ctx: C) => Promise<Response>;

/**
 * Wrap a route handler: converts ApiError (and unexpected errors) into the
 * JSON envelope. Does not require auth — see `withAuth`.
 */
export function withApi<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (request, ctx) => {
    try {
      return await handler(request, ctx);
    } catch (err) {
      // Next's own control-flow errors (e.g. cookies() during build-time prerender) must propagate.
      unstable_rethrow(err);
      if (err instanceof ApiError) return fail(err);
      // Mongo/Mongoose errors can quote the offending document (e.g. a duplicate email): redact.
      console.error("[api] unhandled error", redactForLog(err));
      return fail(new ApiError("INTERNAL", "Something went wrong. Please try again."));
    }
  };
}

export interface AuthContext {
  userId: Types.ObjectId;
}

type AuthedHandler<C> = (request: Request, ctx: C, auth: AuthContext) => Promise<Response>;

/**
 * Wrap a route handler that requires a logged-in user. Verifies the cookie AND that
 * the session hasn't been revoked (connects to the DB as a side effect).
 */
export function withAuth<C = unknown>(handler: AuthedHandler<C>): Handler<C> {
  return withApi<C>(async (request, ctx) => {
    const session = await verifiedSession();
    if (!session) throw new ApiError("UNAUTHORIZED", "Please sign in");
    return handler(request, ctx, { userId: session.userId });
  });
}

/** A route `[id]` param as an ObjectId, or a 404 (never a 500 from a malformed id). */
export function idParam(id: string, notFound = "Not found"): Types.ObjectId {
  if (!/^[0-9a-f]{24}$/i.test(id)) throw new ApiError("NOT_FOUND", notFound);
  return new Types.ObjectId(id);
}
