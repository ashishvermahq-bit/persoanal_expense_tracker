import mongoose from "mongoose";


// Cached connection lives on the global object to survive hot-reloads in dev
// and to be reused across serverless invocations in production.
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var __mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global.__mongooseCache ?? { conn: null, promise: null };
global.__mongooseCache = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    // Checked at boot too (instrumentation.ts); here so a missing value fails clearly, not at import.
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) throw new Error("MONGODB_URI is not defined in environment variables");
    cache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      // Serverless: many short-lived instances each hold a pool, so keep it small
      // (Atlas M0 allows 500 connections in total) and fail fast when the DB is down.
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    // Don't cache a failed connect: the next request should retry, not rethrow forever.
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}
