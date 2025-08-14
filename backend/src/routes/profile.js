import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { body, validationResult } from 'express-validator';
import { verifyTokenMiddleware } from '../utils/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', '..', 'data');
const consumersDir = path.join(dataDir, 'consumers');
const providersDir = path.join(dataDir, 'providers');
const consumersFile = path.join(consumersDir, 'consumers.json');
const providersFile = path.join(providersDir, 'providers.json');

function read(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}

function write(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function normEmail(e) {
  return (e || '').trim().toLowerCase();
}

const router = Router();

// Get user profile
router.get('/profile', verifyTokenMiddleware, (req, res) => {
  const { role, id } = req.user;
  
  let users = [];
  if (role === 'consumer') {
    users = read(consumersFile);
  } else if (role === 'provider') {
    users = read(providersFile);
  } else {
    return res.status(400).json({ error: 'Invalid role' });
  }
  
  const user = users.find(u => u.id === id);
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
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { role, id } = req.user;
  let users = [];
  let filePath = '';
  
  if (role === 'consumer') {
    users = read(consumersFile);
    filePath = consumersFile;
  } else if (role === 'provider') {
    users = read(providersFile);
    filePath = providersFile;
  } else {
    return res.status(400).json({ error: 'Invalid role' });
  }
  
  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Update user data
  const updatedUser = { ...users[userIndex], ...req.body };
  
  // Update name if firstName or lastName changed
  if (req.body.firstName || req.body.lastName) {
    updatedUser.name = `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim();
  }
  
  users[userIndex] = updatedUser;
  write(filePath, users);
  
  // Remove sensitive data before responding
  const { password, ...safeUser } = updatedUser;
  res.json(safeUser);
});

// Check if profile is complete
router.get('/profile/completeness', verifyTokenMiddleware, (req, res) => {
  const { role, id } = req.user;
  
  let users = [];
  if (role === 'consumer') {
    users = read(consumersFile);
  } else if (role === 'provider') {
    users = read(providersFile);
  } else {
    return res.status(400).json({ error: 'Invalid role' });
  }
  
  const user = users.find(u => u.id === id);
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
