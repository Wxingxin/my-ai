const { MongoClient } = require("mongodb");

const globalForMongo = globalThis;

if (!globalForMongo.__expressMongoCache) {
  globalForMongo.__expressMongoCache = {
    client: null,
    db: null,
    promise: null,
  };
}

const mongoCache = globalForMongo.__expressMongoCache;

async function getMongoDb() {
  if (mongoCache.db) {
    return mongoCache.db;
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;

  if (!uri) {
    throw new Error("Missing MONGODB_URI");
  }

  if (!dbName) {
    throw new Error("Missing MONGODB_DB");
  }

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

module.exports = {
  getMongoDb,
};
