import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyTokenMiddleware } from '../utils/auth.js';
import { getBucket, collections } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Configure multer to buffer files in memory before piping to GridFS
const storage = multer.memoryStorage();

// File filter to allow common file types
const fileFilter = (req, file, cb) => {
  // Allow images, documents, and text files
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
    'application/json'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

// Configure multer with size limit (200MB)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024 // 200MB in bytes
  }
});

// Upload endpoint - requires authentication
router.post('/upload', verifyTokenMiddleware, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const bucket = getBucket();
    const metaCol = collections().consumers; // we'll store file refs per user in their document
    const email = req.user.email;

    const results = [];
    for (const file of req.files) {
      const filename = `${Date.now()}-${Math.round(Math.random()*1e9)}-${file.originalname}`;
      const uploadStream = bucket.openUploadStream(filename, { contentType: file.mimetype, metadata: { email } });
      await new Promise((resolve, reject) => {
        uploadStream.end(file.buffer, err => err ? reject(err) : resolve());
      });
      results.push({ filename, size: file.size, mimetype: file.mimetype });
    }

    res.json({ message: 'Files uploaded successfully', files: results, userEmail: email });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get user's uploaded files
router.get('/files', verifyTokenMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    const bucket = getBucket();
    const cursor = bucket.find({ 'metadata.email': email });
    const files = await cursor.toArray();
    const list = files.map(f => ({ filename: f.filename, size: f.length, uploadDate: f.uploadDate, id: f._id }));
    res.json({ files: list });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Download a file by filename
router.get('/files/:filename', verifyTokenMiddleware, async (req, res) => {
  try {
    const bucket = getBucket();
    const filename = req.params.filename;
    const file = await bucket.find({ filename, 'metadata.email': req.user.email }).next();
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    bucket.openDownloadStreamByName(filename).pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 200MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 10 files.' });
    }
  }
  
  if (error.message === 'File type not allowed') {
    return res.status(400).json({ error: 'File type not allowed' });
  }
  
  res.status(500).json({ error: 'Upload failed' });
});

export default router;
