import mongoose from "mongoose";
import { connectDB } from "@/lib/db";

/**
 * Uptime probe: 200 `{ status: "ok" }` when the app can reach MongoDB, else 503.
 * Deliberately says nothing else (no versions, hosts or error text).
 */
export async function GET() {
  try {
    await connectDB();
    await mongoose.connection.db!.admin().ping();
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
