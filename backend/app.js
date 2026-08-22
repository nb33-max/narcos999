import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { supabase } from './db/supabase.js';
import { verifyToken } from './lib/auth.js';
import apiRouter from './routes/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
  req.getAuth = async () => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return null;
    const userId = verifyToken(token);
    if (!userId) return null;
    const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    return data || null;
  };
  next();
});

app.use('/api', apiRouter);

app.get('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

if (fs.existsSync(path.join(__dirname, '..', 'frontend', 'dist'))) {
  app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  });
}

export default app;
