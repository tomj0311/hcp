import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname,'..','..','data');
const providersDir = path.join(dataDir,'providers');
if(!fs.existsSync(providersDir)) fs.mkdirSync(providersDir,{recursive:true});
const providersFile = path.join(providersDir,'providers.json');

const baseAgent = {
  description: 'AI consultation assistant',
  category: 'ConsultFlow',
  instructions: 'Provide general consultation guidance and support.',
  model: { path: 'ai.model.openai', api_key: 'demo', id: 'gpt-4.1' },
  tools: { 'ai.tools.firecrawl': {}, 'ai.tools.exa': { api_key: 'exa_demo_key' } },
  memory: { history: { enabled: true, num: 3 } },
  knowledge: { sources: { 'ai.knowledge.text': { uploaded_files:['out.csv'], path:'users/api-test/knowledge/ai.knowledge.text' } }, chunk: { strategy:'semantic', size:800, overlap:80 }, add_context:true }
};

export function seedDoctors(){
  // backward exported name for compatibility; seeds providers now
  if(!fs.existsSync(providersFile)){
    console.log('[SEED] Creating initial providers...');
    const names = ['Provider Ava','Provider Liam','Provider Noah','Provider Emma','Provider Mia','Provider Zoe'];
    const providers = names.map(n=> ({ id: uuid(), name:n, rank: Math.floor(Math.random()*100), role:'provider', active:true, aiAgent: { name:n, ...baseAgent }}));
    fs.writeFileSync(providersFile, JSON.stringify(providers,null,2));
    console.log('[SEED] Providers seeded successfully');
  } else {
    console.log('[SEED] Providers already exist, skipping seed');
  }
}
