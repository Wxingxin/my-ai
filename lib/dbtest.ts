// lib/dbtest.ts
import { getMongoDb } from "@/lib/db";

export type MongoTestResult = {
  ok: boolean;
  db: string | null;
  collection: string;
  message: string;
  upsertedId: string | null;
  matchedCount: number;
  modifiedCount: number;
};

type MongoStartupTestCache = {
  promise?: Promise<MongoTestResult>;
};

const globalForMongoStartupTest = globalThis as typeof globalThis & {
  __mongoStartupTest?: MongoStartupTestCache;
};

const startupTestCache = globalForMongoStartupTest.__mongoStartupTest ?? {};

globalForMongoStartupTest.__mongoStartupTest = startupTestCache;

const TEST_COLLECTION_NAME = "test";
const TEST_DOCUMENT_KEY = "mongodb-startup-test";

/**
 * 如何使用
 * 在app/layout.tsx文件中使用
 * 1. import { runMongoStartupTest } from "@/lib/test";
 * 2. await runMongoStartupTest();
 */
export async function writeMongoTestDocument(): Promise<MongoTestResult> {
  const db = await getMongoDb();
  const collection = db.collection(TEST_COLLECTION_NAME);

  const result = await collection.updateOne(
    { key: TEST_DOCUMENT_KEY },
    {
      $setOnInsert: {
        key: TEST_DOCUMENT_KEY,
        message: "MongoDB startup test succeeded.",
        createdAt: new Date(),
      },
      $set: {
        lastCheckedAt: new Date(),
      },
    },
    { upsert: true },
  );

  return {
    ok: true,
    db: db.databaseName,
    collection: collection.collectionName,
    message: "MongoDB test write succeeded.",
    upsertedId: result.upsertedId ? String(result.upsertedId) : null,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  };
}

export async function getMongoTestConfig() {
  return {
    ok: true,
    db: process.env.MONGODB_DB ?? null,
    uri: process.env.MONGODB_URI ?? null,
    collection: TEST_COLLECTION_NAME,
  };
}

export async function runMongoStartupTest() {
  if (startupTestCache.promise) {
    return startupTestCache.promise;
  }

  startupTestCache.promise = (async () => {
    try {
      const result = await writeMongoTestDocument();
      console.log("MongoDB startup test succeeded:", result);
      return result;
    } catch (error) {
      console.error("MongoDB startup test failed:", error);

      return {
        ok: false,
        db: process.env.MONGODB_DB ?? null,
        collection: TEST_COLLECTION_NAME,
        message:
          error instanceof Error ? error.message : "Unknown MongoDB error",
        upsertedId: null,
        matchedCount: 0,
        modifiedCount: 0,
      } satisfies MongoTestResult;
    }
  })();

  return startupTestCache.promise;
}
