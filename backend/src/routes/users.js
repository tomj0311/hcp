import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { sendRegistrationEmail } from '../services/emailService.js';
import crypto from 'crypto';
import { verifyTokenMiddleware } from '../utils/auth.js';

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

// ---------------- Public routes ----------------
router.post('/patients',[
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({min:8}).withMessage('Password must be at least 8 characters')
], async (req,res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json({errors:errors.array()});

  const patients = read(patientsFile);
  // Duplicate email check
  if(patients.some(p=> p.email === req.body.email)){
    return res.status(400).json({message:'Email already registered. Please log in or use a different email.'});
  }

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

// ---------------- Protected routes ----------------
router.get('/doctors', verifyTokenMiddleware, (req,res)=>{
  res.json(read(doctorsFile));
});

router.post('/doctors', verifyTokenMiddleware, [body('name').notEmpty()],async (req,res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json({errors:errors.array()});
  const doctors = read(doctorsFile);
  const doctor = { id: uuid(), rank: Math.floor(Math.random()*100), active: true, aiAgent: req.body.aiAgent || null, ...req.body };
  doctors.push(doctor);
  write(doctorsFile, doctors);
  sendRegistrationEmail(doctor.email, 'doctor').catch(()=>{});
  res.status(201).json(doctor);
});

router.get('/patients', verifyTokenMiddleware, (req,res)=>{
  res.json(read(patientsFile));
});

// Admin-only: create & activate patient directly (no email verification step)
router.post('/patients/admin', verifyTokenMiddleware, [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').optional().isLength({min:8}).withMessage('Password must be at least 8 characters when provided')
], async (req,res)=>{
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({error:'admin only'});
  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json({errors:errors.array()});

  const patients = read(patientsFile);
  if(patients.some(p=> p.email === req.body.email)){
    return res.status(400).json({message:'Email already registered.'});
  }

  let { password, ...rest } = req.body;
  let generated = false;
  if(!password){
    password = crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g,'').slice(0,12);
    generated = true;
  }
  const hash = await bcrypt.hash(password,10);
  const patient = { id: uuid(), active:true, password: hash, ...rest };
  patients.push(patient);
  write(patientsFile, patients);
  // Optionally still send welcome email (without verification)
  sendRegistrationEmail(patient.email, 'patient').catch(()=>{});
  const { password: _pw, ...sanitized } = patient;
  res.status(201).json({ ...sanitized, tempPassword: generated ? password : undefined });
});

export default router;
