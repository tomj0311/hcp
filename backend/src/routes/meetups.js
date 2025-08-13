import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { body, validationResult } from 'express-validator';
import { v4 as uuid } from 'uuid';
import { verifyTokenMiddleware } from '../utils/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname,'..','..','data');
const providersDir = path.join(dataDir,'providers');
const consumersDir = path.join(dataDir,'consumers');
const eventsDir = path.join(dataDir,'events');
if(!fs.existsSync(eventsDir)) fs.mkdirSync(eventsDir,{recursive:true});

function read(file){
  if(!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}
function normEmail(e){ return (e||'').trim().toLowerCase(); }

const providersFile = path.join(providersDir,'providers.json');
const consumersFile = path.join(consumersDir,'consumers.json');

function getAllEvents(){
  if(!fs.existsSync(eventsDir)) return [];
  const files = fs.readdirSync(eventsDir).filter(f=> f.endsWith('.json'));
  return files.map(f=>{
    try { return JSON.parse(fs.readFileSync(path.join(eventsDir,f))); } catch { return null; }
  }).filter(Boolean);
}

function writeEvent(evt){
  fs.writeFileSync(path.join(eventsDir, `${evt.id}.json`), JSON.stringify(evt,null,2));
}

const router = Router();

// Create a new one-to-one meetup (consumer<->provider)
router.post('/', verifyTokenMiddleware, [
  body('targetUserId').notEmpty().withMessage('targetUserId required'),
  body('start').notEmpty().withMessage('start ISO datetime required'),
  body('end').notEmpty().withMessage('end ISO datetime required'),
  body('title').optional().isLength({max:120}),
  body('description').optional().isLength({max:2000})
], (req,res)=>{
  console.log('[MEETUPS][CREATE] raw body', req.body);
  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json({errors:errors.array()});

  const { targetUserId, start, end, title, description } = req.body;
  const user = req.user; // {role, id, ...}
  if(!user || !['consumer','provider'].includes(user.role)){
    return res.status(403).json({error:'only authenticated consumer or provider can create meetups'});
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  if(isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate){
    return res.status(400).json({error:'invalid start/end'});
  }
  const providers = read(providersFile);
  const consumers = read(consumersFile);
  let targetUser = null;
  let targetRole = null;
  if(user.role === 'consumer'){
    targetUser = providers.find(p=> p.id === targetUserId);
    targetRole = 'provider';
  } else if(user.role === 'provider') {
    targetUser = consumers.find(c=> c.id === targetUserId);
    targetRole = 'consumer';
  }
  if(!targetUser){
    return res.status(404).json({error:'target user not found'});
  }

  const event = {
    id: uuid(),
    type: 'meetup',
    title: title || 'Meetup',
    description: description || '',
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    createdAt: Date.now(),
    requesterId: user.id,
    requesterRole: user.role,
    participantId: targetUserId,
    participantRole: targetRole,
    status: 'scheduled'
  };
  writeEvent(event);
  console.log('[MEETUPS][CREATE] created', event.id);
  res.status(201).json(event);
});

// List events for current user
router.get('/', verifyTokenMiddleware, (req,res)=>{
  const user = req.user;
  if(!user) return res.status(401).json({error:'unauthorized'});
  const events = getAllEvents().filter(e=> e.requesterId === user.id || e.participantId === user.id);
  res.json(events.sort((a,b)=> new Date(a.start) - new Date(b.start)));
});

// Get single event (must be participant)
router.get('/:id', verifyTokenMiddleware, (req,res)=>{
  const user = req.user;
  const file = path.join(eventsDir, `${req.params.id}.json`);
  if(!fs.existsSync(file)) return res.status(404).json({error:'not found'});
  const event = JSON.parse(fs.readFileSync(file));
  if(event.requesterId !== user.id && event.participantId !== user.id && user.role !== 'admin'){
    return res.status(403).json({error:'forbidden'});
  }
  res.json(event);
});

// Update status (cancel) or details
router.patch('/:id', verifyTokenMiddleware, [
  body('status').optional().isIn(['scheduled','cancelled','completed'])
], (req,res)=>{
  const user = req.user;
  const file = path.join(eventsDir, `${req.params.id}.json`);
  if(!fs.existsSync(file)) return res.status(404).json({error:'not found'});
  const event = JSON.parse(fs.readFileSync(file));
  if(event.requesterId !== user.id && event.participantId !== user.id && user.role !== 'admin'){
    return res.status(403).json({error:'forbidden'});
  }
  const { status, title, description, start, end } = req.body;
  if(status) event.status = status;
  if(title) event.title = title;
  if(description !== undefined) event.description = description;
  if(start){ const sd = new Date(start); if(!isNaN(sd.getTime())) event.start = sd.toISOString(); }
  if(end){ const ed = new Date(end); if(!isNaN(ed.getTime())) event.end = ed.toISOString(); }
  writeEvent(event);
  res.json(event);
});

export default router;
