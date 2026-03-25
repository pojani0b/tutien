// ============================================================
// AI SETTINGS ROUTES
// GET  /api/ai/settings
// PUT  /api/ai/settings
// POST /api/ai/keys             — Add a user API key
// GET  /api/ai/keys             — List user API keys
// DELETE /api/ai/keys/:id
// POST /api/ai/keys/import      — Import keys from text (newline/comma separated)
// GET  /api/ai/keys/export      — Export keys as plain text
// ============================================================

import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { AiSettings, ApiKeyUser } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
router.use(requireAuth);

// ---- GET AI SETTINGS ----
router.get('/settings', async (req: AuthRequest, res: Response) => {
  const username = req.user!.username;
  const { server_id } = req.query;

  const { data } = await supabase
    .from('ai_settings')
    .select('*')
    .eq('username', username)
    .is('server_id', server_id ?? null)
    .single();

  // Return defaults if no settings found
  const defaults: AiSettings = {
    username,
    server_id: null,
    temperature: 0.9,
    memory_window: 10,
    summary_every: 10,
    response_tokens: 4860,
    model_id: 'gemini-2.5-flash',
    filter_enabled: false,
    filter_violence: 'off',
    filter_sexually_explicit: 'off',
    filter_insult: 'off',
    filter_sarcasm: 'off',
  };

  res.json(data ?? defaults);
});

// ---- UPDATE AI SETTINGS ----
router.put('/settings', async (req: AuthRequest, res: Response) => {
  const username = req.user!.username;
  const body = req.body as Partial<AiSettings>;

  const updates: Partial<AiSettings> = {
    temperature: body.temperature ?? 0.9,
    memory_window: body.memory_window ?? 10,
    summary_every: body.summary_every ?? 10,
    response_tokens: body.response_tokens ?? 4860,
    model_id: body.model_id ?? 'gemini-2.5-flash',
    filter_enabled: body.filter_enabled ?? false,
    filter_violence: body.filter_violence ?? 'off',
    filter_sexually_explicit: body.filter_sexually_explicit ?? 'off',
    filter_insult: body.filter_insult ?? 'off',
    filter_sarcasm: body.filter_sarcasm ?? 'off',
  };

  const { error } = await supabase.from('ai_settings').upsert(
    { username, server_id: body.server_id ?? null, ...updates },
    { onConflict: 'username,server_id' }
  );

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

// ---- LIST API KEYS (masked) ----
router.get('/keys', async (req: AuthRequest, res: Response) => {
  const username = req.user!.username;
  const { data } = await supabase
    .from('apius').select('id, project_label, is_active, priority, last_error, last_used_at')
    .eq('username', username).order('priority');
  res.json(data ?? []);
});

// ---- ADD API KEY ----
router.post('/keys', async (req: AuthRequest, res: Response) => {
  const username = req.user!.username;
  const { api_key, project_label, priority = 0 } = req.body as {
    api_key: string; project_label?: string; priority?: number;
  };

  if (!api_key?.trim()) { res.status(400).json({ error: 'API key không được rỗng' }); return; }

  const { error } = await supabase.from('apius').insert({
    id: uuidv4(),
    username,
    project_label: project_label ?? null,
    api_key: api_key.trim(),
    is_active: true,
    priority,
  });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

// ---- IMPORT KEYS FROM TEXT ----
router.post('/keys/import', async (req: AuthRequest, res: Response) => {
  const username = req.user!.username;
  const { text } = req.body as { text: string };

  if (!text) { res.status(400).json({ error: 'No text provided' }); return; }

  // Split by newlines, commas, or semicolons — deduplicate
  const keys = [...new Set(
    text.split(/[\n,;]+/).map((k) => k.trim()).filter((k) => k.length > 0)
  )];

  let added = 0;
  for (const key of keys) {
    const { error } = await supabase.from('apius').insert({
      id: uuidv4(),
      username,
      api_key: key,
      is_active: true,
      priority: 0,
    });
    if (!error) added++;
  }

  res.json({ added, total: keys.length });
});

// ---- EXPORT KEYS AS PLAIN TEXT ----
router.get('/keys/export', async (req: AuthRequest, res: Response) => {
  const username = req.user!.username;
  const { data } = await supabase
    .from('apius').select('api_key').eq('username', username).eq('is_active', true);

  const text = (data ?? []).map((k: { api_key: string }) => k.api_key).join('\n');
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename="api_keys.txt"');
  res.send(text);
});

// ---- DELETE API KEY ----
router.delete('/keys/:id', async (req: AuthRequest, res: Response) => {
  const username = req.user!.username;
  const { error } = await supabase
    .from('apius').delete()
    .eq('id', req.params.id).eq('username', username);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

// ---- GET TOS ----
router.get('/tos', async (_req: AuthRequest, res: Response) => {
  const { data } = await supabase
    .from('tos_documents').select('content, version').eq('doc_key', 'main_tos').single();
  res.json(data ?? { content: '', version: '1.0' });
});

export default router;
