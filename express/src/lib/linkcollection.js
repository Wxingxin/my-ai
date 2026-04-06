const { ObjectId } = require("mongodb");

const { getMongoDb } = require("./db");

const globalForChatCollection = globalThis;

async function getUsersCollection() {
  const db = await getMongoDb();
  return db.collection(process.env.MONGODB_COLLECTION_USERS || "users");
}

async function getTodosCollection() {
  const db = await getMongoDb();
  return db.collection(process.env.MONGODB_COLLECTION_TODOS || "todos");
}

async function ensureChatConversationIndexes(collection) {
  if (!globalForChatCollection.__chatConversationsIndexesPromise) {
    globalForChatCollection.__chatConversationsIndexesPromise = collection
      .createIndexes([
        {
          key: { userId: 1, updatedAt: -1 },
          name: "user_updatedAt_desc",
        },
      ])
      .then(() => undefined);
  }

  await globalForChatCollection.__chatConversationsIndexesPromise;
}

async function getChatConversationsCollection() {
  const db = await getMongoDb();
  const collection = db.collection(
    process.env.MONGODB_COLLECTION_CHAT_CONVERSATIONS || "chat_conversations",
  );

  await ensureChatConversationIndexes(collection);

  return collection;
}

module.exports = {
  ObjectId,
  getChatConversationsCollection,
  getTodosCollection,
  getUsersCollection,
};
