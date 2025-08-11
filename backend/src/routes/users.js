import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { sendRegistrationEmail } from '../services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname,'..','..','data');
const doctorsFile = path.join(dataDir,'doctors.json');
const patientsFile = path.join(dataDir,'patients.json');
const verificationFile = path.join(dataDir,'patient_verifications.json');

function read(file){
  if(!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}
function write(file,data){
  fs.writeFileSync(file, JSON.stringify(data,null,2));
}

const router = Router();

router.get('/doctors',(req,res)=>{
  res.json(read(doctorsFile));
});

router.post('/doctors',[body('name').notEmpty()],async (req,res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json({errors:errors.array()});
  const doctors = read(doctorsFile);
  const doctor = { id: uuid(), rank: Math.floor(Math.random()*100), active: true, aiAgent: req.body.aiAgent || null, ...req.body };
  doctors.push(doctor);
  write(doctorsFile, doctors);
  // fire and forget email
  sendRegistrationEmail(doctor.email, 'doctor').catch(()=>{});
  res.status(201).json(doctor);
});

router.get('/patients',(req,res)=>{
  res.json(read(patientsFile));
});

router.post('/patients',[body('name').notEmpty(), body('password').isLength({min:6})], async (req,res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json({errors:errors.array()});
  const patients = read(patientsFile);
  const verificationTokens = read(verificationFile);
  const { password, ...rest } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const patient = { id: uuid(), active:false, password: hash, ...rest };
  patients.push(patient);
  write(patientsFile, patients);
  const token = uuid();
  verificationTokens.push({ token, patientId: patient.id, createdAt: Date.now() });
  write(verificationFile, verificationTokens);
  sendRegistrationEmail(patient.email, 'patient').catch(()=>{});
  res.status(201).json({ id: patient.id, verifyToken: token });
});

router.post('/patients/verify',[body('token').notEmpty()], (req,res)=>{
  const { token } = req.body;
  const patients = read(patientsFile);
  const verificationTokens = read(verificationFile);
  const record = verificationTokens.find(v=> v.token === token);
  if(!record) return res.status(400).json({error:'invalid token'});
  const patient = patients.find(p=> p.id === record.patientId);
  if(!patient) return res.status(400).json({error:'patient not found'});
  patient.active = true;
  write(patientsFile, patients);
  const remaining = verificationTokens.filter(v=> v.token !== token);
  write(verificationFile, remaining);
  res.json({status:'verified'});
});

router.post('/patients/login',[body('email').isEmail(), body('password').notEmpty()], async (req,res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json({errors:errors.array()});
  const patients = read(patientsFile);
  const patient = patients.find(p=> p.email === req.body.email);
  if(!patient) return res.status(401).json({error:'invalid credentials'});
  if(!patient.active) return res.status(403).json({error:'not verified'});
  const ok = await bcrypt.compare(req.body.password, patient.password);
  if(!ok) return res.status(401).json({error:'invalid credentials'});
  res.json({ id: patient.id, name: patient.name, email: patient.email, role:'patient' });
});

export default router;
