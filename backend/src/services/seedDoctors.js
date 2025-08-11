import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname,'..','..','data');
const doctorsFile = path.join(dataDir,'doctors.json');

const baseAgent = {
  description: 'AI medical assistant',
  category: 'HealthCare',
  instructions: 'Provide general medical guidance, not a diagnosis.',
  model: { path: 'ai.model.openai', api_key: 'demo', id: 'gpt-4.1' },
  tools: { 'ai.tools.firecrawl': {}, 'ai.tools.exa': { api_key: 'exa_demo_key' } },
  memory: { history: { enabled: true, num: 3 } },
  knowledge: { sources: { 'ai.knowledge.text': { uploaded_files:['out.csv'], path:'users/api-test/knowledge/ai.knowledge.text' } }, chunk: { strategy:'semantic', size:800, overlap:80 }, add_context:true }
};

export function seedDoctors(){
  if(!fs.existsSync(dataDir)) fs.mkdirSync(dataDir,{recursive:true});
  if(fs.existsSync(doctorsFile)) {
    console.log('[SEED] Doctors already exist, skipping seed');
    return; // don't overwrite
  }
  console.log('[SEED] Creating initial doctors...');
  const names = ['Dr. Ava','Dr. Liam','Dr. Noah','Dr. Emma','Dr. Mia','Dr. Zoe'];
  const doctors = names.map(n=> ({ id: uuid(), name:n, rank: Math.floor(Math.random()*100), active:true, aiAgent: { name:n, ...baseAgent }}));
  fs.writeFileSync(doctorsFile, JSON.stringify(doctors,null,2));
  console.log('[SEED] Doctors seeded successfully');
}
