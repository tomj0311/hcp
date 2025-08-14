import { Router } from 'express';
import { collections } from '../db.js';
import { body, validationResult } from 'express-validator';
import { verifyTokenMiddleware } from '../utils/auth.js';

// Switch to MongoDB models

function normEmail(e) {
  return (e || '').trim().toLowerCase();
}

const router = Router();

// Get user profile
router.get('/profile', verifyTokenMiddleware, async (req, res) => {
  const { role, id } = req.user;
  
  let user;
  if (role === 'consumer') {
  const { consumers } = collections();
  user = await consumers.findOne({ id }, { projection: { _id:0 } });
  } else if (role === 'provider') {
  const { providers } = collections();
  user = await providers.findOne({ id }, { projection: { _id:0 } });
  } else {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Remove sensitive data
  const { password, ...safeUser } = user;
  res.json(safeUser);
});

// Update user profile
router.put('/profile', verifyTokenMiddleware, [
  body('firstName').optional().isLength({ min: 1, max: 50 }),
  body('lastName').optional().isLength({ min: 1, max: 50 }),
  body('phone').optional().isLength({ min: 7, max: 20 }),
  body('address1').optional().isLength({ max: 120 }),
  body('address2').optional().isLength({ max: 120 }),
  body('city').optional().isLength({ max: 60 }),
  body('state').optional().isLength({ max: 60 }),
  body('postalCode').optional().isLength({ max: 20 }),
  body('country').optional().isLength({ max: 60 }),
  // Provider-specific fields
  body('organization').optional().isLength({ max: 120 }),
  body('specialization').optional().isLength({ max: 120 }),
  body('bio').optional().isLength({ max: 1000 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { role, id } = req.user;
  let user;
  const cols = collections();
  if (role === 'consumer') {
    user = await cols.consumers.findOne({ id });
  } else if (role === 'provider') {
    user = await cols.providers.findOne({ id });
  } else {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Update user data
  const update = { ...req.body };
  
  // Update name if firstName or lastName changed
  if (req.body.firstName || req.body.lastName) {
    const firstName = update.firstName ?? user.firstName;
    const lastName = update.lastName ?? user.lastName;
    update.name = `${firstName || ''} ${lastName || ''}`.trim();
  }
  if (role === 'consumer') {
    await cols.consumers.updateOne({ id }, { $set: update });
    user = await cols.consumers.findOne({ id });
  } else {
    await cols.providers.updateOne({ id }, { $set: update });
    user = await cols.providers.findOne({ id });
  }
  
  // Remove sensitive data before responding
  const { password, ...safeUser } = user;
  res.json(safeUser);
});

// Check if profile is complete
router.get('/profile/completeness', verifyTokenMiddleware, async (req, res) => {
  const { role, id } = req.user;
  
  let user;
  if (role === 'consumer') {
  user = await collections().consumers.findOne({ id });
  } else if (role === 'provider') {
  user = await collections().providers.findOne({ id });
  } else {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Define required fields for each role
  const requiredFields = {
    consumer: ['firstName', 'lastName', 'email', 'phone'],
    provider: ['firstName', 'lastName', 'email', 'phone', 'organization', 'specialization']
  };
  
  const required = requiredFields[role] || [];
  const missing = required.filter(field => !user[field] || user[field].trim() === '');
  
  const completeness = {
    isComplete: missing.length === 0,
    missingFields: missing,
    completionPercentage: Math.round(((required.length - missing.length) / required.length) * 100)
  };
  
  res.json(completeness);
});

export default router;
