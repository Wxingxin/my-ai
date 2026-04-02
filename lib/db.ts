// lib/db.ts
//Mongoclient：MongoDB 客户端(负责连接)
// Db：某一个数据库实例
// lib/db.ts

import { Db, MongoClient } from "mongodb";

type MongoCache = {
  client: MongoClient | null;
  db: Db | null;
  promise: Promise<MongoClient> | null;
};

const globalForMongo = globalThis as typeof globalThis & {
  __mongoCache?: MongoCache;
};

const mongoCache: MongoCache = globalForMongo.__mongoCache ?? {
  client: null,
  db: null,
  promise: null,
};

globalForMongo.__mongoCache = mongoCache;

export async function getMongoDb(): Promise<Db> {
  if (mongoCache.db) {
    return mongoCache.db;
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;

  if (!uri) throw new Error("Missing MONGODB_URI");
  if (!dbName) throw new Error("Missing MONGODB_DB");

  if (!mongoCache.client) {
    mongoCache.client = new MongoClient(uri);
  }

  if (!mongoCache.promise) {
    mongoCache.promise = mongoCache.client.connect();
  }

  const client = await mongoCache.promise;

  mongoCache.db = client.db(dbName);

  return mongoCache.db;
}
