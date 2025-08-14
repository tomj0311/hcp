import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, collections } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..', '..');
const dataDir = path.join(root, 'data');

function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}

async function upsertMany(col, docs, key = 'id') {
  if (!docs || docs.length === 0) return 0;
  const ops = docs.map(d => ({ updateOne: { filter: { [key]: d[key] }, update: { $set: d }, upsert: true } }));
  const res = await col.bulkWrite(ops, { ordered: false });
  return (res.upsertedCount || 0) + (res.modifiedCount || 0);
}

async function run() {
  console.log('[MIGRATE] Connecting to DB...');
  await connectDB();
  const cols = collections();
  // Consumers
  const consumersFile = path.join(dataDir, 'consumers', 'consumers.json');
  const consumers = readJSON(consumersFile);
  if (consumers.length) {
    console.log(`[MIGRATE] Importing ${consumers.length} consumers...`);
    await upsertMany(cols.consumers, consumers, 'id');
  }
  // Providers
  const providersFile = path.join(dataDir, 'providers', 'providers.json');
  const providers = readJSON(providersFile);
  if (providers.length) {
    console.log(`[MIGRATE] Importing ${providers.length} providers...`);
    await upsertMany(cols.providers, providers, 'id');
  }
  // Verification tokens
  const verifFile = path.join(dataDir, 'consumers', 'verifications.json');
  const verifs = readJSON(verifFile).map(v => ({ ...v, createdAt: v.createdAt ? new Date(v.createdAt) : new Date() }));
  if (verifs.length) {
    console.log(`[MIGRATE] Importing ${verifs.length} verification tokens...`);
    await upsertMany(cols.verificationTokens, verifs, 'token');
  }
  // Events
  const eventsDir = path.join(dataDir, 'events');
  let events = [];
  if (fs.existsSync(eventsDir)) {
    const files = fs.readdirSync(eventsDir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      try { events.push(JSON.parse(fs.readFileSync(path.join(eventsDir, f), 'utf8'))); } catch {}
    }
  }
  if (events.length) {
    console.log(`[MIGRATE] Importing ${events.length} events...`);
    await upsertMany(cols.events, events, 'id');
  }
  console.log('[MIGRATE] Done.');
  process.exit(0);
}

run().catch(err => { console.error('[MIGRATE] Error:', err); process.exit(1); });
