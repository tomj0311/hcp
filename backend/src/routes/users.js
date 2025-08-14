import { Router } from 'express';
import { collections } from '../db.js';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { sendRegistrationEmail } from '../services/emailService.js';
import crypto from 'crypto';
import { verifyTokenMiddleware } from '../utils/auth.js';

// Switch to MongoDB models

// Helper: normalize email consistently (trim + lowercase)
function normEmail(e){
  return (e||'').trim().toLowerCase();
}

// Helper: case-insensitive cross-collection duplicate check
async function emailExists(email){
  const target = normEmail(email);
  const { providers, consumers } = collections();
  const [p,c] = await Promise.all([
    providers.findOne({ email: target }),
    consumers.findOne({ email: target })
  ]);
  return !!(p || c);
}

// Optional phone duplicate check (across both roles). Only rejects if an existing record has identical phone string (after trim) and phone provided in request.
async function phoneExists(phone){
  if(!phone) return false;
  const target = (phone||'').trim();
  const { providers, consumers } = collections();
  const [p,c] = await Promise.all([
    providers.findOne({ phone: target }),
    consumers.findOne({ phone: target })
  ]);
  return !!(p || c);
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
  
  // Cross-role, case-insensitive email duplicate prevention
  if(await emailExists(req.body.email)){
    return res.status(400).json({message:'Email already registered. Please log in or use a different email.'});
  }
  // Phone duplicate (optional)
  if(await phoneExists(req.body.phone)){
    return res.status(400).json({message:'Phone number already associated with an existing account.'});
  }

  const { password, confirmPassword, firstName, lastName, email, ...rest } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const { consumers, verificationTokens } = collections();
  const consumer = { id: uuid(), role:'consumer', active:false, password: hash, createdAt: Date.now(), firstName, lastName, name: `${firstName} ${lastName}`.trim(), ...rest, email: normEmail(email), emailOriginal: email };
  await consumers.insertOne(consumer);
  const token = uuid();
  await verificationTokens.insertOne({ token, consumerId: consumer.id, createdAt: new Date() });
  // Send email with verification token (so user can click link or copy code)
  sendRegistrationEmail(consumer.email, 'consumer', token).catch(()=>{});
  res.status(201).json({ id: consumer.id, verifyToken: token });
});

router.post('/consumers/verify',[body('token').notEmpty()], async (req,res)=>{
  const { token } = req.body;
  const { consumers, verificationTokens } = collections();
  const record = await verificationTokens.findOne({ token });
  if(!record) return res.status(400).json({error:'invalid token'});
  const consumer = await consumers.findOne({ id: record.consumerId });
  if(!consumer) return res.status(400).json({error:'consumer not found'});
  await consumers.updateOne({ id: consumer.id }, { $set: { active: true } });
  await verificationTokens.deleteOne({ token });
  res.json({status:'verified'});
});

router.post('/consumers/login',[body('email').isEmail(), body('password').notEmpty()], async (req,res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json({errors:errors.array()});
  const target = normEmail(req.body.email);
  const { consumers } = collections();
  const consumer = await consumers.findOne({ $or: [ { email: target }, { emailOriginal: target } ] });
  if(!consumer) return res.status(401).json({error:'invalid credentials'});
  if(!consumer.active) return res.status(403).json({error:'not verified'});
  const ok = await bcrypt.compare(req.body.password, consumer.password);
  if(!ok) return res.status(401).json({error:'invalid credentials'});
  res.json({ id: consumer.id, name: consumer.name, email: consumer.email, role:'consumer' });
});

// ---------------- Protected routes ----------------
// ---------------- Provider (formerly doctor) public registration + listing ----------------
router.get('/providers', verifyTokenMiddleware, async (req,res)=>{
  const { providers } = collections();
  const list = await providers.find({}, { projection: { _id:0, password:0 } }).sort({ rank: -1 }).toArray();
  res.json(list);
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
  if(await emailExists(req.body.email)) return res.status(400).json({message:'Email already registered.'});
  if(await phoneExists(req.body.phone)) return res.status(400).json({message:'Phone number already associated with an existing account.'});
  let { password, confirmPassword, firstName, lastName, email, ...rest } = req.body;
  let generated = false;
  if(!password){
    password = crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g,'').slice(0,12);
    generated = true;
  }
  const hash = await bcrypt.hash(password,10);
  const { providers } = collections();
  const provider = { id: uuid(), role:'provider', active:true, password: hash, rank: Math.floor(Math.random()*100), aiAgent: rest.aiAgent || null, createdAt: Date.now(), firstName, lastName, name: `${firstName} ${lastName}`.trim(), ...rest, email: normEmail(email), emailOriginal: email };
  await providers.insertOne(provider);
  sendRegistrationEmail(provider.email, 'provider').catch(()=>{});
  const { password: _pw, ...sanitized } = provider;
  res.status(201).json({ ...sanitized, tempPassword: generated ? password : undefined });
});

router.get('/consumers', verifyTokenMiddleware, async (req,res)=>{
  const { consumers } = collections();
  const list = await consumers.find({}, { projection: { _id:0, password:0 } }).toArray();
  res.json(list);
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

  if(await emailExists(req.body.email)){
    return res.status(400).json({message:'Email already registered.'});
  }
  if(await phoneExists(req.body.phone)){
    return res.status(400).json({message:'Phone number already associated with an existing account.'});
  }

  let { password, firstName, lastName, email, ...rest } = req.body;
  let generated = false;
  if(!password){
    password = crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g,'').slice(0,12);
    generated = true;
  }
  const hash = await bcrypt.hash(password,10);
  const { consumers } = collections();
  const consumer = { id: uuid(), role:'consumer', active:true, password: hash, firstName, lastName, name: `${firstName} ${lastName}`.trim(), ...rest, email: normEmail(email), emailOriginal: email };
  await consumers.insertOne(consumer);
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
