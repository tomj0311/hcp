import { MongoClient, GridFSBucket } from 'mongodb';

const DEFAULT_URI = process.env.MONGO_URL || 'mongodb://127.0.0.1:8801';
const DEFAULT_DB = process.env.MONGO_DB || 'hcp';

let client;
let db;

export async function connectDB(uri = DEFAULT_URI, dbName = DEFAULT_DB) {
  if (db) return db;
  client = new MongoClient(uri, { });
  await client.connect();
  db = client.db(dbName);
  console.log(`[DB] Connected to ${uri}/${dbName}`);
  await ensureIndexes();
  return db;
}

export function getDb() {
  if (!db) throw new Error('DB not connected. Call connectDB() first.');
  return db;
}

export function collections() {
  const d = getDb();
  return {
    consumers: d.collection('consumers'),
    providers: d.collection('providers'),
    verificationTokens: d.collection('verificationTokens'),
    events: d.collection('events'),
  };
}

export function getBucket(bucketName = 'uploads') {
  return new GridFSBucket(getDb(), { bucketName });
}

async function ensureIndexes() {
  const { consumers, providers, events, verificationTokens } = collections();
  await Promise.all([
    consumers.createIndex({ id: 1 }, { unique: true }),
    consumers.createIndex({ email: 1 }, { unique: true }),
    providers.createIndex({ id: 1 }, { unique: true }),
    providers.createIndex({ email: 1 }, { unique: true }),
    events.createIndex({ id: 1 }, { unique: true }),
    events.createIndex({ requesterId: 1, start: 1 }),
    events.createIndex({ participantId: 1, start: 1 }),
    verificationTokens.createIndex({ token: 1 }, { unique: true }),
    verificationTokens.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 3 })
  ]);
}

export async function disconnectDB(){
  if (client) await client.close();
  client = undefined;
  db = undefined;
}

