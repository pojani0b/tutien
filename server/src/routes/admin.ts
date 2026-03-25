// ============================================================
// ADMIN ROUTES
// All actions require is_admin=true JWT claim
// All actions logged to admin_actions table
// ============================================================

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { spawnWorldEntity, rollbackEvent } from '../modules/worldEngine';
import { broadcastAdminMessage, broadcastDeathNotice } from '../modules/realtimeBroadcaster';
import { syncApiSvFromUserKeys } from '../modules/apiKeyRotation';
import { Character, AdminAction } from '../types';

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

// ---- LOG ADMIN ACTION HELPER ----
async function logAdminAction(
  adminUsername: string,
  actionType: string,
  targetType: string,
  targetId: string,
  payload: Record<string, unknown>
) {
  await supabase.from('admin_actions').insert({
    id: uuidv4(),
    admin_username: adminUsername,
    action_type: actionType,
    target_type: targetType,
    target_id: targetId,
    payload,
  });
}

// ---- SEARCH PLAYERS ----
router.get('/players', async (req: AuthRequest, res: Response) => {
  const q = req.query.q as string; const server_id = req.query.server_id as string;
  let query = supabase.from('characters').select('character_id, name, username, server_id, realm, is_dead, cultivation');
  if (q) query = query.ilike('name', `%${q}%`);
  if (server_id) query = query.eq('server_id', server_id as string);
  const { data, error } = await query.limit(20);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// ---- GET PLAYER DETAIL ----
router.get('/player/:characterId', async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from('characters').select('*').eq('character_id', req.params.characterId).single();
  if (error || !data) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(data);
});

// ---- EDIT CHARACTER STATS ----
router.patch('/player/:characterId', async (req: AuthRequest, res: Response) => {
  const admin = req.user!.username;
  const characterId = req.params.characterId as string;
  const updates = req.body as Partial<Character>;

  // Whitelist editable fields
  const allowed: (keyof Character)[] = [
    'cultivation', 'lifespan', 'mp', 'hp', 'luck', 'foundation',
    'relations', 'inventory', 'equipment', 'stats', 'realm', 'realm_progress',
    'NSFW_enabled', 'NSFW_level',
  ];
  const safeUpdates = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k as keyof Character))
  );

  const { error } = await supabase.from('characters').update(safeUpdates).eq('character_id', characterId);
  if (error) { res.status(500).json({ error: error.message }); return; }

  await logAdminAction(admin, 'edit_stats', 'character', characterId, safeUpdates);
  res.json({ success: true });
});

// ---- REVIVE CHARACTER ----
router.post('/player/:characterId/revive', async (req: AuthRequest, res: Response) => {
  const admin = req.user!.username;
  const characterId = req.params.characterId as string;
  const { hp = 100, server_id } = req.body as { hp: number; server_id: string };

  const { error } = await supabase.from('characters')
    .update({ is_dead: false, hp, death_reason: null })
    .eq('character_id', characterId);

  if (error) { res.status(500).json({ error: error.message }); return; }

  await logAdminAction(admin, 'revive', 'character', characterId, { hp });
  res.json({ success: true });
});

// ---- PERMADEATH (permanent kill) ----
router.post('/player/:characterId/permadeath', async (req: AuthRequest, res: Response) => {
  const admin = req.user!.username;
  const characterId = req.params.characterId as string;
  const { reason = 'Admin permadeath', server_id, world_time = 0 } = req.body as {
    reason: string; server_id: string; world_time: number;
  };

  const { data: char } = await supabase.from('characters').select('*')
    .eq('character_id', characterId).single();
  if (!char) { res.status(404).json({ error: 'Not found' }); return; }

  await supabase.from('characters')
    .update({ is_dead: true, hp: 0, death_reason: reason })
    .eq('character_id', characterId);

  await broadcastDeathNotice(server_id, {
    character_id: characterId,
    character_name: (char as Character).name,
    death_reason: reason,
    world_time,
  });

  await logAdminAction(admin, 'permadeath', 'character', characterId, { reason });
  res.json({ success: true });
});

// ---- FREEZE USER ----
router.post('/user/:username/ban', async (req: AuthRequest, res: Response) => {
  const admin = req.user!.username;
  const { reason = 'Bị quản trị viên khóa tài khoản' } = req.body as { reason: string };
  const username = req.params.username as string;

  const { error } = await supabase.from('users').update({ ban: reason }).eq('username', username);
  if (error) { res.status(500).json({ error: error.message }); return; }

  await logAdminAction(admin, 'ban', 'user', username, { reason });
  res.json({ success: true });
});

// ---- UNBAN USER ----
router.post('/user/:username/unban', async (req: AuthRequest, res: Response) => {
  const admin = req.user!.username;
  const username = req.params.username as string;
  const { error } = await supabase.from('users').update({ ban: null }).eq('username', username);
  if (error) { res.status(500).json({ error: error.message }); return; }
  await logAdminAction(admin, 'unban', 'user', username, {});
  res.json({ success: true });
});

// ---- GOD MODE ----
router.post('/player/:characterId/godmode', async (req: AuthRequest, res: Response) => {
  const admin = req.user!.username;
  const characterId = req.params.characterId as string;
  const { enabled } = req.body as { enabled: boolean };

  const { data: char } = await supabase.from('characters').select('stats').eq('character_id', characterId).single();
  if (!char) { res.status(404).json({ error: 'Not found' }); return; }

  const newStats = { ...(char as { stats: Record<string, unknown> }).stats, god_mode: enabled };
  await supabase.from('characters').update({ stats: newStats }).eq('character_id', characterId);
  await logAdminAction(admin, enabled ? 'add_god_mode' : 'remove_god_mode', 'character', characterId, { enabled });
  res.json({ success: true });
});

// ---- GIFT (single player) ----
router.post('/gift/:characterId', async (req: AuthRequest, res: Response) => {
  const admin = req.user!.username;
  const characterId = req.params.characterId as string;
  const { type, value } = req.body as { type: 'cultivation' | 'luck' | 'item'; value: unknown };

  const { data: char } = await supabase.from('characters').select('*').eq('character_id', characterId).single();
  if (!char) { res.status(404).json({ error: 'Not found' }); return; }
  const character = char as Character;

  let updatePayload: Partial<Character> = {};
  if (type === 'cultivation') updatePayload.cultivation = character.cultivation + (value as number);
  else if (type === 'luck') updatePayload.luck = character.luck + (value as number);
  else if (type === 'item') {
    updatePayload.inventory = [...character.inventory, value as Character['inventory'][0]];
  }

  await supabase.from('characters').update(updatePayload).eq('character_id', characterId);
  await logAdminAction(admin, 'gift', 'character', characterId, { type, value: value as Record<string, unknown> });
  res.json({ success: true });
});

// ---- GIFT ALL PLAYERS IN SERVER ----
router.post('/gift-all/:serverId', async (req: AuthRequest, res: Response) => {
  const admin = req.user!.username;
  const serverId = req.params.serverId as string;
  const { type, value } = req.body as { type: string; value: unknown };

  const { data: chars } = await supabase
    .from('characters').select('character_id, cultivation, luck, inventory')
    .eq('server_id', serverId).eq('is_dead', false);

  if (!chars) { res.status(500).json({ error: 'Failed to fetch characters' }); return; }

  for (const char of chars as Array<{
    character_id: string;
    cultivation: number;
    luck: number;
    inventory: Character['inventory'];
  }>) {
    let updatePayload: Partial<Character> = {};
    if (type === 'cultivation') updatePayload.cultivation = char.cultivation + (value as number);
    else if (type === 'luck') updatePayload.luck = char.luck + (value as number);
    else if (type === 'item') updatePayload.inventory = [...char.inventory, value as Character['inventory'][0]];
    await supabase.from('characters').update(updatePayload).eq('character_id', char.character_id);
  }

  await logAdminAction(admin, 'gift_all', 'server', serverId, { type, value: value as Record<string, unknown> });
  res.json({ success: true, affected: chars.length });
});

// ---- TELEPORT ----
router.post('/player/:characterId/teleport', async (req: AuthRequest, res: Response) => {
  const admin = req.user!.username;
  const characterId = req.params.characterId as string;
  const { location } = req.body as { location: string };

  const { data: char } = await supabase.from('characters').select('stats').eq('character_id', characterId).single();
  if (!char) { res.status(404).json({ error: 'Not found' }); return; }

  const newStats = { ...(char as { stats: Record<string, unknown> }).stats, current_location: location };
  await supabase.from('characters').update({ stats: newStats }).eq('character_id', characterId);
  await logAdminAction(admin, 'teleport', 'character', characterId, { location });
  res.json({ success: true });
});

// ---- SPAWN WORLD ENTITY ----
router.post('/entity/spawn', async (req: AuthRequest, res: Response) => {
  const admin = req.user!.username;
  const { server_id, entity_type, name, state, respawn_at } = req.body as {
    server_id: string; entity_type: string; name: string;
    state: Record<string, unknown>; respawn_at?: string;
  };

  const entity = await spawnWorldEntity(server_id, entity_type, name, state, { respawn_at });
  if (!entity) { res.status(500).json({ error: 'Failed to spawn entity' }); return; }

  await logAdminAction(admin, 'spawn_entity', 'world_entity', entity.entity_id, { entity_type, name });
  res.json(entity);
});

// ---- REMOVE WORLD ENTITY ----
router.delete('/entity/:entityId', async (req: AuthRequest, res: Response) => {
  const admin = req.user!.username;
  const entityId = req.params.entityId as string;
  await supabase.from('world_entities').update({ is_destroyed: true }).eq('entity_id', entityId);
  await logAdminAction(admin, 'remove_entity', 'world_entity', entityId, {});
  res.json({ success: true });
});

// ---- ROLLBACK EVENT ----
router.post('/event/:eventId/rollback', async (req: AuthRequest, res: Response) => {
  const admin = req.user!.username;
  const eventId = req.params.eventId as string;
  const success = await rollbackEvent(eventId, admin);
  await logAdminAction(admin, 'rollback_event', 'world_event', eventId, {});
  res.json({ success });
});

// ---- BROADCAST TO SERVER ----
router.post('/broadcast/:serverId', async (req: AuthRequest, res: Response) => {
  const admin = req.user!.username;
  const serverId = req.params.serverId as string;
  const { message, world_time = 0 } = req.body as { message: string; world_time: number };

  const event = await broadcastAdminMessage(serverId, admin, message, world_time);
  await logAdminAction(admin, 'broadcast', 'server', serverId, { message });
  res.json({ success: true, event_id: event?.event_id });
});

// ---- SET RESPAWN ----
router.patch('/entity/:entityId/respawn', async (req: AuthRequest, res: Response) => {
  const admin = req.user!.username;
  const entityId = req.params.entityId as string;
  const { respawn_at } = req.body as { respawn_at: string };
  await supabase.from('world_entities').update({ respawn_at, is_destroyed: false }).eq('entity_id', entityId);
  await logAdminAction(admin, 'set_respawn', 'world_entity', entityId, { respawn_at });
  res.json({ success: true });
});

// ---- GET ADMIN LOGS ----
router.get('/logs', async (_req: AuthRequest, res: Response) => {
  const { data } = await supabase
    .from('admin_actions').select('*').order('created_at', { ascending: false }).limit(100);
  res.json(data);
});

// ---- SYNC API KEYS ----
router.post('/sync-keys', async (req: AuthRequest, res: Response) => {
  const { username } = req.body as { username?: string };
  const result = await syncApiSvFromUserKeys(username);
  res.json(result);
});

export default router;
