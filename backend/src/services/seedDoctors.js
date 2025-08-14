import { v4 as uuid } from 'uuid';
import { collections } from '../db.js';

const baseAgent = {
  description: 'AI consultation assistant',
  category: 'ConsultFlow',
  instructions: 'Provide general consultation guidance and support.',
  model: { path: 'ai.model.openai', api_key: 'demo', id: 'gpt-4.1' },
  tools: { 'ai.tools.firecrawl': {}, 'ai.tools.exa': { api_key: 'exa_demo_key' } },
  memory: { history: { enabled: true, num: 3 } },
  knowledge: { sources: { 'ai.knowledge.text': { uploaded_files:['out.csv'], path:'users/api-test/knowledge/ai.knowledge.text' } }, chunk: { strategy:'semantic', size:800, overlap:80 }, add_context:true }
};

export async function seedDoctors(){
  // backward exported name for compatibility; seeds providers now into MongoDB
  const { providers } = collections();
  const count = await providers.estimatedDocumentCount();
  if (count > 0) {
    console.log('[SEED] Providers already exist, skipping seed');
    return;
  }
  console.log('[SEED] Creating initial providers in DB...');
  const names = ['Provider Ava','Provider Liam','Provider Noah','Provider Emma','Provider Mia','Provider Zoe'];
  const docs = names.map(n=> ({ id: uuid(), name:n, rank: Math.floor(Math.random()*100), role:'provider', active:true, aiAgent: { name:n, ...baseAgent }}));
  await providers.insertMany(docs);
  console.log('[SEED] Providers seeded successfully');
}
