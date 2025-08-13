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
// New generic data layout (providers & consumers stored in separate sub-folders)
const providersDir = path.join(dataDir,'providers');
const consumersDir = path.join(dataDir,'consumers');
if(!fs.existsSync(providersDir)) fs.mkdirSync(providersDir,{recursive:true});
if(!fs.existsSync(consumersDir)) fs.mkdirSync(consumersDir,{recursive:true});
const providersFile = path.join(providersDir,'providers.json');
const consumersFile = path.join(consumersDir,'consumers.json');
const consumerVerificationFile = path.join(consumersDir,'verifications.json');

function read(file){
  if(!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}
function write(file,data){
  fs.writeFileSync(file, JSON.stringify(data,null,2));
}

const router = Router();

// ---------------- Public routes ----------------
// ---------------- Consumer (formerly patient) public registration ----------------
// Standard consumer registration with extended profile fields
router.post('/consumers',[
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({min:8}).withMessage('Password must be at least 8 characters'),
  body('confirmPassword').custom((val,{req})=> val === req.body.password).withMessage('Passwords do not match'),
  body('phone').optional().isString().isLength({min:7,max:20}).withMessage('Phone length invalid'),
  body('postalCode').optional().isLength({max:20}),
  body('country').optional().isLength({max:60}),
  body('state').optional().isLength({max:60}),
  body('city').optional().isLength({max:60}),
  body('address1').optional().isLength({max:120}),
  body('address2').optional().isLength({max:120})
], async (req,res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json({errors:errors.array()});

  const consumers = read(consumersFile);
  if(consumers.some(p=> p.email === req.body.email)){
    return res.status(400).json({message:'Email already registered. Please log in or use a different email.'});
  }

  const verificationTokens = read(consumerVerificationFile);
  const { password, confirmPassword, firstName, lastName, ...rest } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const consumer = { id: uuid(), role:'consumer', active:false, password: hash, createdAt: Date.now(), firstName, lastName, name: `${firstName} ${lastName}`.trim(), ...rest };
  consumers.push(consumer);
  write(consumersFile, consumers);
  const token = uuid();
  verificationTokens.push({ token, consumerId: consumer.id, createdAt: Date.now() });
  write(consumerVerificationFile, verificationTokens);
  sendRegistrationEmail(consumer.email, 'consumer').catch(()=>{});
  res.status(201).json({ id: consumer.id, verifyToken: token });
});

router.post('/consumers/verify',[body('token').notEmpty()], (req,res)=>{
  const { token } = req.body;
  const consumers = read(consumersFile);
  const verificationTokens = read(consumerVerificationFile);
  const record = verificationTokens.find(v=> v.token === token);
  if(!record) return res.status(400).json({error:'invalid token'});
  const consumer = consumers.find(p=> p.id === record.consumerId);
  if(!consumer) return res.status(400).json({error:'consumer not found'});
  consumer.active = true;
  write(consumersFile, consumers);
  const remaining = verificationTokens.filter(v=> v.token !== token);
  write(consumerVerificationFile, remaining);
  res.json({status:'verified'});
});

router.post('/consumers/login',[body('email').isEmail(), body('password').notEmpty()], async (req,res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json({errors:errors.array()});
  const consumers = read(consumersFile);
  const consumer = consumers.find(p=> p.email === req.body.email);
  if(!consumer) return res.status(401).json({error:'invalid credentials'});
  if(!consumer.active) return res.status(403).json({error:'not verified'});
  const ok = await bcrypt.compare(req.body.password, consumer.password);
  if(!ok) return res.status(401).json({error:'invalid credentials'});
  res.json({ id: consumer.id, name: consumer.name, email: consumer.email, role:'consumer' });
});

// ---------------- Protected routes ----------------
// ---------------- Provider (formerly doctor) public registration + listing ----------------
router.get('/providers', verifyTokenMiddleware, (req,res)=>{
  res.json(read(providersFile));
});

// Providers can self-register (public) with password (to allow login) or we can auto-generate one if omitted
router.post('/providers', [
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
  body('email').isEmail(),
  body('password').optional().isLength({min:8}).withMessage('Password must be at least 8 characters when provided'),
  body('confirmPassword').optional().custom((val,{req})=> !req.body.password || val === req.body.password).withMessage('Passwords do not match'),
  body('phone').optional().isString().isLength({min:7,max:20}),
  body('organization').optional().isLength({max:120}),
  body('specialization').optional().isLength({max:120}),
  body('bio').optional().isLength({max:1000}),
  body('country').optional().isLength({max:60}),
  body('state').optional().isLength({max:60}),
  body('city').optional().isLength({max:60}),
  body('address1').optional().isLength({max:120}),
  body('address2').optional().isLength({max:120}),
  body('postalCode').optional().isLength({max:20})
], async (req,res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json({errors:errors.array()});
  const providers = read(providersFile);
  if(providers.some(p=> p.email === req.body.email)) return res.status(400).json({message:'Email already registered.'});
  let { password, confirmPassword, firstName, lastName, ...rest } = req.body;
  let generated = false;
  if(!password){
    password = crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g,'').slice(0,12);
    generated = true;
  }
  const hash = await bcrypt.hash(password,10);
  const provider = { id: uuid(), role:'provider', active:true, password: hash, rank: Math.floor(Math.random()*100), aiAgent: rest.aiAgent || null, createdAt: Date.now(), firstName, lastName, name: `${firstName} ${lastName}`.trim(), ...rest };
  providers.push(provider);
  write(providersFile, providers);
  sendRegistrationEmail(provider.email, 'provider').catch(()=>{});
  const { password: _pw, ...sanitized } = provider;
  res.status(201).json({ ...sanitized, tempPassword: generated ? password : undefined });
});

router.get('/consumers', verifyTokenMiddleware, (req,res)=>{
  res.json(read(consumersFile));
});

// Admin-only: create & activate patient directly (no email verification step)
router.post('/consumers/admin', verifyTokenMiddleware, [
  body('firstName').notEmpty().withMessage('First name required'),
  body('lastName').notEmpty().withMessage('Last name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').optional().isLength({min:8}).withMessage('Password must be at least 8 characters when provided'),
  body('phone').optional().isString().isLength({min:7,max:20}),
  body('country').optional().isLength({max:60}),
  body('state').optional().isLength({max:60}),
  body('city').optional().isLength({max:60}),
  body('address1').optional().isLength({max:120}),
  body('address2').optional().isLength({max:120}),
  body('postalCode').optional().isLength({max:20})
], async (req,res)=>{
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({error:'admin only'});
  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json({errors:errors.array()});

  const consumers = read(consumersFile);
  if(consumers.some(p=> p.email === req.body.email)){
    return res.status(400).json({message:'Email already registered.'});
  }

  let { password, firstName, lastName, ...rest } = req.body;
  let generated = false;
  if(!password){
    password = crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g,'').slice(0,12);
    generated = true;
  }
  const hash = await bcrypt.hash(password,10);
  const consumer = { id: uuid(), role:'consumer', active:true, password: hash, firstName, lastName, name: `${firstName} ${lastName}`.trim(), ...rest };
  consumers.push(consumer);
  write(consumersFile, consumers);
  sendRegistrationEmail(consumer.email, 'consumer').catch(()=>{});
  const { password: _pw, ...sanitized } = consumer;
  res.status(201).json({ ...sanitized, tempPassword: generated ? password : undefined });
});

// ---------------- Backwards compatibility (legacy routes) ----------------
// Keep old endpoints responding for now to avoid breaking existing clients (will be removed later)
router.post('/patients', (req,res)=> res.status(410).json({message:'Route renamed to /consumers'}));
router.post('/patients/verify', (req,res)=> res.status(410).json({message:'Route renamed to /consumers/verify'}));
router.post('/patients/login', (req,res)=> res.status(410).json({message:'Route renamed to /consumers/login'}));
router.get('/patients', (req,res)=> res.status(410).json({message:'Route renamed to /consumers'}));
router.post('/patients/admin', (req,res)=> res.status(410).json({message:'Route renamed to /consumers/admin'}));
router.get('/doctors', (req,res)=> res.status(410).json({message:'Route renamed to /providers'}));
router.post('/doctors', (req,res)=> res.status(410).json({message:'Route renamed to /providers'}));

export default router;
