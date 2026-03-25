// ============================================================
// AUTH ROUTES
// POST /api/auth/register
// POST /api/auth/login
// ============================================================
// INSECURE: Password stored as plain text per spec.
// This is prototype-only behavior. See users table comments.
// ============================================================

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase';

const router = Router();

// ---- REGISTER ----
router.post('/register', async (req: Request, res: Response) => {
  const { username, pass } = req.body as { username: string; pass?: string };

  if (!username || username.trim() === '') {
    res.status(400).json({ error: 'Username không được để trống.' });
    return;
  }

  // Check existing
  const { data: existing } = await supabase
    .from('users')
    .select('username')
    .eq('username', username)
    .single();

  if (existing) {
    res.status(409).json({ error: 'Username đã tồn tại.' });
    return;
  }

  // INSECURE: storing plaintext password — prototype only
  const { error } = await supabase.from('users').insert({
    username,
    pass: pass ?? null,
    is_admin: false,
    ban: null,
  });

  if (error) {
    res.status(500).json({ error: 'Tạo tài khoản thất bại: ' + error.message });
    return;
  }

  const token = jwt.sign(
    { username, is_admin: false },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  res.json({ token, username, is_admin: false });
});

// ---- LOGIN ----
router.post('/login', async (req: Request, res: Response) => {
  const { username, pass } = req.body as { username: string; pass?: string };

  if (!username || username.trim() === '') {
    res.status(400).json({ error: 'Vui lòng nhập username.' });
    return;
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('username, pass, is_admin, ban')
    .eq('username', username)
    .single();

  if (error || !user) {
    res.status(404).json({ error: 'Tài khoản không tồn tại.' });
    return;
  }

  // Ban check
  if (user.ban && user.ban.trim() !== '') {
    res.status(403).json({ error: `Tài khoản bị khóa: ${user.ban}` });
    return;
  }

  // INSECURE: plaintext password comparison — prototype only
  const passMatch = (user.pass ?? '') === (pass ?? '');
  if (!passMatch) {
    res.status(401).json({ error: 'Mật khẩu không đúng.' });
    return;
  }

  const token = jwt.sign(
    { username: user.username, is_admin: user.is_admin },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  res.json({ token, username: user.username, is_admin: user.is_admin });
});

export default router;
