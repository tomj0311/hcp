import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { generateToken } from '../utils/auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname,'..','..','data');
// Updated generic consumer store
const consumersDir = path.join(dataDir,'consumers');
const providersDir = path.join(dataDir,'providers');
if(!fs.existsSync(consumersDir)) fs.mkdirSync(consumersDir,{recursive:true});
if(!fs.existsSync(providersDir)) fs.mkdirSync(providersDir,{recursive:true});
const consumersFile = path.join(consumersDir,'consumers.json');
const providersFile = path.join(providersDir,'providers.json');
function read(file){
  if(!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}

function normEmail(e){
  return (e||'').trim().toLowerCase();
}

const router = Router();

// Provide development fallbacks so login works even if .env wasn't copied.
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '123';

router.post('/login', [body('username').notEmpty(), body('password').notEmpty()], async (req,res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json({errors:errors.array()});
  const { username, password } = req.body;
  const normalized = normEmail(username);
  if(normalized === normEmail(ADMIN_USER) && password === ADMIN_PASS){
    const token = generateToken({ role:'admin', username });
    return res.json({ token, role:'admin' });
  }
  // consumer login
  const consumers = read(consumersFile);
  const consumer = consumers.find(p=> normEmail(p.email) === normalized || normEmail(p.emailOriginal) === normalized);
  if(consumer && consumer.active){
    const ok = await bcrypt.compare(password, consumer.password);
    if(ok){
      const token = generateToken({ role:'consumer', id: consumer.id, email: consumer.email });
      return res.json({ token, role:'consumer', name: consumer.name });
    }
  }
  // provider login
  const providers = read(providersFile);
  const provider = providers.find(p=> normEmail(p.email) === normalized || normEmail(p.emailOriginal) === normalized);
  if(provider && provider.active){
    const ok = await bcrypt.compare(password, provider.password);
    if(ok){
      const token = generateToken({ role:'provider', id: provider.id, email: provider.email });
      return res.json({ token, role:'provider', name: provider.name });
    }
  }
  return res.status(401).json({error:'invalid credentials'});
});

export default router;
