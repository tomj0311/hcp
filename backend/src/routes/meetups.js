import { Router } from 'express';
import { collections } from '../db.js';
import { body, validationResult } from 'express-validator';
import { v4 as uuid } from 'uuid';
import { verifyTokenMiddleware } from '../utils/auth.js';

function normEmail(e){ return (e||'').trim().toLowerCase(); }

const router = Router();

// Create a new one-to-one meetup (consumer<->provider)
router.post('/', verifyTokenMiddleware, [
  body('targetUserId').notEmpty().withMessage('targetUserId required'),
  body('start').notEmpty().withMessage('start ISO datetime required'),
  body('end').notEmpty().withMessage('end ISO datetime required'),
  body('title').optional().isLength({max:120}),
  body('description').optional().isLength({max:2000})
], async (req,res)=>{
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
  let targetUser = null;
  let targetRole = null;
  if(user.role === 'consumer'){
    targetUser = await collections().providers.findOne({ id: targetUserId });
    targetRole = 'provider';
  } else if(user.role === 'provider') {
    targetUser = await collections().consumers.findOne({ id: targetUserId });
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
  await collections().events.insertOne(event);
  console.log('[MEETUPS][CREATE] created', event.id);
  res.status(201).json(event);
});

// List events for current user
router.get('/', verifyTokenMiddleware, async (req,res)=>{
  const user = req.user;
  if(!user) return res.status(401).json({error:'unauthorized'});
  const events = await collections().events.find({ $or: [ { requesterId: user.id }, { participantId: user.id } ] }, { projection: { _id:0 } }).toArray();
  res.json(events.sort((a,b)=> new Date(a.start) - new Date(b.start)));
});

// Get single event (must be participant)
router.get('/:id', verifyTokenMiddleware, async (req,res)=>{
  const user = req.user;
  const event = await collections().events.findOne({ id: req.params.id }, { projection: { _id:0 } });
  if(!event) return res.status(404).json({error:'not found'});
  if(event.requesterId !== user.id && event.participantId !== user.id && user.role !== 'admin'){
    return res.status(403).json({error:'forbidden'});
  }
  res.json(event);
});

// Update status (cancel) or details
router.patch('/:id', verifyTokenMiddleware, [
  body('status').optional().isIn(['scheduled','cancelled','completed'])
], async (req,res)=>{
  const user = req.user;
  const events = collections().events;
  const event = await events.findOne({ id: req.params.id });
  if(!event) return res.status(404).json({error:'not found'});
  if(event.requesterId !== user.id && event.participantId !== user.id && user.role !== 'admin'){
    return res.status(403).json({error:'forbidden'});
  }
  const { status, title, description, start, end } = req.body;
  if(status) event.status = status;
  if(title) event.title = title;
  if(description !== undefined) event.description = description;
  if(start){ const sd = new Date(start); if(!isNaN(sd.getTime())) event.start = sd.toISOString(); }
  if(end){ const ed = new Date(end); if(!isNaN(ed.getTime())) event.end = ed.toISOString(); }
  await events.updateOne({ id: req.params.id }, { $set: event });
  res.json(event);
});

export default router;
