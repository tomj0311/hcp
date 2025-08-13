import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import authRouter from './routes/auth.js';
import userRouter from './routes/users.js';
import paymentRouter from './routes/payments.js';
import uploadsRouter from './routes/uploads.js';
import meetupsRouter from './routes/meetups.js';
import { initMatchmaking } from './ws/matchmaking.js';
import { verifyTokenMiddleware } from './utils/auth.js';
import { seedProviders } from './services/seedProviders.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Basic startup diagnostics (non-sensitive)
if(!process.env.JWT_SECRET){
  process.env.JWT_SECRET = 'dev_jwt_secret';
  console.warn('[WARN] JWT_SECRET not set; using insecure development fallback.');
}
console.log('[BOOT] Starting API with config:', {
  PORT: process.env.PORT || 4000,
  CLIENT_URL: process.env.CLIENT_URL,
  TLS: !!(process.env.TLS_KEY && process.env.TLS_CERT),
  NODE_ENV: process.env.NODE_ENV
});

process.on('unhandledRejection', (reason)=>{
  console.error('[UNHANDLED_REJECTION]', reason);
});
process.on('uncaughtException', (err)=>{
  console.error('[UNCAUGHT_EXCEPTION]', err);
});

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || '*'}));
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req,res)=> res.json({status:'ok'}));
app.use('/auth', authRouter);
// Users router now internally protects only the routes that require auth.
app.use('/users', userRouter);
app.use('/payments', verifyTokenMiddleware, paymentRouter);
app.use('/uploads', uploadsRouter);
app.use('/meetups', meetupsRouter);

// simple temp storage
if(!fs.existsSync(path.join(__dirname,'..','data'))){
  fs.mkdirSync(path.join(__dirname,'..','data'),{recursive:true});
}
// seed initial AI providers once
seedProviders();

const port = process.env.PORT || 4000;
const useTLS = process.env.TLS_KEY && process.env.TLS_CERT;
let server;
if(useTLS){
  const options = {
    key: fs.readFileSync(process.env.TLS_KEY),
    cert: fs.readFileSync(process.env.TLS_CERT)
  };
  server = https.createServer(options, app);
} else {
  server = http.createServer(app);
}

// WebSocket setup
const wss = new WebSocketServer({ server, path: '/ws' });
initMatchmaking(wss);

server.listen(port, ()=>{
  console.log(`API listening on ${useTLS?'https':'http'}://localhost:${port}`);
});
