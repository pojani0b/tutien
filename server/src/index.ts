// ============================================================
// SERVER ENTRY POINT
// Hong Hoang Text RPG — Express Server
// ============================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load .env before anything else
dotenv.config();

import authRoutes from './routes/auth';
import gameRoutes from './routes/game';
import adminRoutes from './routes/admin';
import aiSettingsRoutes from './routes/aiSettings';
import { startWorldAnalyzerCron } from './cron/worldAnalyzerCron';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// ---- MIDDLEWARE ----
app.use(cors({
  origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- ROUTES ----
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiSettingsRoutes);

// ---- TOS endpoint (public) ----
app.get('/api/tos', async (_req, res) => {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await supabase
    .from('tos_documents').select('content, version').eq('doc_key', 'main_tos').single();
  res.json(data ?? { content: '', version: '1.0' });
});

// ---- HEALTH ----
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---- 404 ----
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ---- ERROR HANDLER ----
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ---- START ----
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔥 Hồng Hoang RPG Server running on port ${PORT}`);
  console.log(`   Mode: ${process.env.NODE_ENV ?? 'development'}`);

  // Start world analyzer cron
  startWorldAnalyzerCron();
});

export default app;
