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
const patientsFile = path.join(dataDir,'patients.json');
function read(file){
  if(!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}

const router = Router();

// Provide development fallbacks so login works even if .env wasn't copied.
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '123';

router.post('/login', [body('username').notEmpty(), body('password').notEmpty()], async (req,res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json({errors:errors.array()});
  const { username, password } = req.body;
  if(username === ADMIN_USER && password === ADMIN_PASS){
    const token = generateToken({ role:'admin', username });
    return res.json({ token, role:'admin' });
  }
  // patient login fallback (email as username)
  const patients = read(patientsFile);
  const patient = patients.find(p=> p.email === username);
  if(patient && patient.active){
    const ok = await bcrypt.compare(password, patient.password);
    if(ok){
      const token = generateToken({ role:'patient', id: patient.id, email: patient.email });
      return res.json({ token, role:'patient' });
    }
  }
  return res.status(401).json({error:'invalid credentials'});
});

export default router;
