// ============================================================
// GAME ROUTES
// POST /api/game/action     — Submit player action to AI + world engine
// GET  /api/game/state      — Get current character + world state
// GET  /api/game/rankings   — Get leaderboard data
// GET  /api/game/servers    — List all servers
// GET  /api/game/slots      — Get save slots for a server
// POST /api/game/create-character
// DELETE /api/game/slot/:slotIndex
// ============================================================

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { runGameplayNarrator } from '../ai/gameplayNarrator';
import { runNsfwEngine } from '../ai/nsfwEngine';
import { validateAction, applyProposedEffects, processCharacterDeath } from '../modules/worldEngine';
import { broadcastDeathNotice, broadcastRealmAscend } from '../modules/realtimeBroadcaster';
import {
  Character, AiSettings, WorldSnapshot, ChatMessage, SystemFlags, NarratorInput
} from '../types';

const router = Router();
router.use(requireAuth);

// ---- GET SERVERS ----
router.get('/servers', async (_req: AuthRequest, res: Response) => {
  const { data, error } = await supabase.from('servers').select('*').order('era_index');
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// ---- GET SAVE SLOTS ----
router.get('/slots/:serverId', async (req: AuthRequest, res: Response) => {
  const { serverId } = req.params;
  const username = req.user!.username;

  const { data, error } = await supabase
    .from('save_slots')
    .select('*')
    .eq('username', username)
    .eq('server_id', serverId)
    .eq('is_deleted', false)
    .order('slot_index');

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// ---- DELETE SLOT ----
router.delete('/slot/:serverId/:slotIndex', async (req: AuthRequest, res: Response) => {
  const { serverId, slotIndex } = req.params;
  const username = req.user!.username;

  const { error } = await supabase
    .from('save_slots')
    .update({ is_deleted: true })
    .eq('username', username)
    .eq('server_id', serverId)
    .eq('slot_index', parseInt(slotIndex));

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

// ---- CREATE CHARACTER ----
router.post('/create-character', async (req: AuthRequest, res: Response) => {
  const username = req.user!.username;
  const body = req.body as {
    server_id: string;
    slot_index: 1 | 2 | 3;
    save_name: string;
    character: Partial<Character>;
  };

  const { server_id, slot_index, save_name, character } = body;

  // Check slot is available
  const { data: existing } = await supabase
    .from('save_slots')
    .select('id')
    .eq('username', username)
    .eq('server_id', server_id)
    .eq('slot_index', slot_index)
    .eq('is_deleted', false)
    .single();

  if (existing) {
    res.status(409).json({ error: 'Slot đã được sử dụng.' });
    return;
  }

  const characterId = uuidv4();
  const newCharacter: Partial<Character> = {
    character_id: characterId,
    username,
    server_id,
    slot_index,
    name: character.name ?? 'Vô Danh',
    gender: character.gender ?? 'nam',
    origin: character.origin,
    appearance: character.appearance,
    personality: character.personality,
    likes: character.likes,
    dislikes: character.dislikes,
    dao_path: character.dao_path,
    talents: character.talents ?? [],
    aptitudes: character.aptitudes ?? [],
    golden_finger: character.golden_finger ?? {},
    NSFW_enabled: character.NSFW_enabled ?? false,
    NSFW_level: character.NSFW_level ?? 0,
    realm: 'Phàm Nhân',
    realm_progress: 0,
    hp: 100,
    mp: 100,
    lifespan: 100,
    cultivation: 0,
    foundation: character.foundation ?? 0,
    luck: character.luck ?? 0,
    stats: character.stats ?? {},
    relations: character.relations ?? {},
    inventory: character.inventory ?? [],
    equipment: character.equipment ?? {},
    is_dead: false,
  };

  const { error: charErr } = await supabase.from('characters').insert(newCharacter);
  if (charErr) { res.status(500).json({ error: charErr.message }); return; }

  const { error: slotErr } = await supabase.from('save_slots').insert({
    username,
    server_id,
    slot_index,
    save_name,
    character_json: newCharacter,
    world_anchor_version: 0,
    is_deleted: false,
  });

  if (slotErr) { res.status(500).json({ error: slotErr.message }); return; }

  res.json({ character_id: characterId, success: true });
});

// ---- GET GAME STATE ----
router.get('/state/:characterId', async (req: AuthRequest, res: Response) => {
  const { characterId } = req.params;
  const username = req.user!.username;

  const { data: char, error } = await supabase
    .from('characters')
    .select('*')
    .eq('character_id', characterId)
    .eq('username', username)
    .single();

  if (error || !char) { res.status(404).json({ error: 'Nhân vật không tồn tại.' }); return; }

  // Fetch server
  const { data: server } = await supabase
    .from('servers')
    .select('*')
    .eq('server_id', (char as Character).server_id)
    .single();

  // Fetch recent events
  const { data: events } = await supabase
    .from('world_events')
    .select('*')
    .eq('server_id', (char as Character).server_id)
    .order('created_at', { ascending: false })
    .limit(20);

  res.json({ character: char, server, recent_events: events });
});

// ---- SUBMIT PLAYER ACTION ----
router.post('/action', async (req: AuthRequest, res: Response) => {
  const username = req.user!.username;
  const { character_id, action, chat_history } = req.body as {
    character_id: string;
    action: string;
    chat_history: ChatMessage[];
  };

  if (!action?.trim()) {
    res.status(400).json({ error: 'Hành động không được để trống.' });
    return;
  }

  // Fetch character
  const { data: char, error: charErr } = await supabase
    .from('characters')
    .select('*')
    .eq('character_id', character_id)
    .eq('username', username)
    .single();

  if (charErr || !char) {
    res.status(404).json({ error: 'Nhân vật không tồn tại.' });
    return;
  }

  const character = char as Character;

  if (character.is_dead) {
    res.status(400).json({ error: 'Nhân vật đã chết. Không thể thực hiện hành động.' });
    return;
  }

  // Fetch AI settings
  const { data: aiSettingsRow } = await supabase
    .from('ai_settings')
    .select('*')
    .eq('username', username)
    .is('server_id', null)
    .single();

  const aiSettings: AiSettings = aiSettingsRow as AiSettings ?? {
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

  // Fetch server
  const { data: server } = await supabase
    .from('servers')
    .select('*')
    .eq('server_id', character.server_id)
    .single();

  // Fetch nearby entities (simple: fetch all in server, limit 10)
  const { data: entities } = await supabase
    .from('world_entities')
    .select('*')
    .eq('server_id', character.server_id)
    .eq('is_destroyed', false)
    .limit(10);

  // Fetch recent world events
  const { data: recentEvents } = await supabase
    .from('world_events')
    .select('*')
    .eq('server_id', character.server_id)
    .order('created_at', { ascending: false })
    .limit(15);

  // Build system flags
  const systemFlags: SystemFlags = {
    god_mode: (character.stats as Record<string, unknown>)?.god_mode === true,
    romance_enabled: character.NSFW_enabled,
    NSFW_enabled: character.NSFW_enabled,
    NSFW_level: character.NSFW_level,
    has_code_161982: !!(character.golden_finger as Record<string, unknown>)?.enabled,
    filters: {
      violence: aiSettings.filter_violence,
      sexually_explicit: aiSettings.filter_sexually_explicit,
      insult: aiSettings.filter_insult,
      sarcasm: aiSettings.filter_sarcasm,
    },
  };

  const worldSnapshot: WorldSnapshot = {
    server_id: character.server_id,
    world_time: (server as { world_time: number })?.world_time ?? 0,
    key_entities: (entities ?? []).slice(0, 5) as unknown as [],
    key_factions: [],
    active_players_count: 1,
  };

  const narratorInput: NarratorInput = {
    server_info: server as unknown as NarratorInput['server_info'],
    world_snapshot: worldSnapshot,
    character_sheet: character,
    nearby_entities: entities as unknown as [] ?? [],
    recent_world_events: recentEvents as unknown as [] ?? [],
    memory_summary: '',
    last_messages: (chat_history ?? []).slice(-aiSettings.memory_window),
    player_action: action,
    ai_settings: aiSettings,
    system_flags: systemFlags,
  };

  // Run validation
  const validation = await validateAction(character, action, []);
  if (!validation.valid) {
    res.status(400).json({ error: validation.reason });
    return;
  }

  // Run AI narrator
  const narratorOutput = await runGameplayNarrator(narratorInput);

  // Apply effects to world
  let worldEvent = null;
  if (!narratorOutput.requires_server_resolution) {
    worldEvent = await applyProposedEffects(
      character.server_id,
      character.character_id,
      narratorOutput.proposed_effects,
      worldSnapshot.world_time,
      narratorOutput.intent_class
    );

    // Check for death
    const selfHpDelta = narratorOutput.proposed_effects.self?.hp;
    if (selfHpDelta !== undefined && selfHpDelta <= 0) {
      await processCharacterDeath(character, 'Tử trận', worldSnapshot.world_time);
      await broadcastDeathNotice(character.server_id, {
        character_id: character.character_id,
        character_name: character.name,
        death_reason: 'Tử trận trong hành động',
        world_time: worldSnapshot.world_time,
      });
    }

    // Check for realm ascend
    const newProgress = (character.realm_progress ?? 0) + (narratorOutput.proposed_effects.realm_progress ?? 0);
    if (newProgress >= 100 && narratorOutput.intent_class === 'breakthrough') {
      await broadcastRealmAscend(character.server_id, {
        character_name: character.name,
        old_realm: character.realm,
        new_realm: character.realm, // Updated by breakthrough minigame
      });
    }
  }

  // Run NSFW engine if enabled and action has romance intent
  let nsfwOutput = null;
  if (character.NSFW_enabled && narratorOutput.intent_class === 'romance') {
    nsfwOutput = await runNsfwEngine({
      character_sheet: character,
      target_character_or_npc: { name: 'NPC', realm: 'Phàm Nhân' },
      NSFW_level: character.NSFW_level,
      NSFW_history: [],
      relation_state: {},
      recent_world_events: recentEvents as unknown as [] ?? [],
      ai_settings: aiSettings,
      action_context: action,
      god_mode: systemFlags.god_mode,
    });
  }

  res.json({
    narrative: narratorOutput.narrative,
    nsfw_narrative: nsfwOutput?.NSFW_narrative ?? null,
    follow_up_options: narratorOutput.follow_up_options,
    requires_server_resolution: narratorOutput.requires_server_resolution,
    risk: narratorOutput.risk,
    world_event_id: worldEvent?.event_id ?? null,
  });
});

// ---- GET RANKINGS ----
router.get('/rankings/:serverId', async (req: AuthRequest, res: Response) => {
  const { serverId } = req.params;

  // Tu vi ranking (cultivation)
  const { data: cultivationRank } = await supabase
    .from('characters')
    .select('name, cultivation, realm')
    .eq('server_id', serverId)
    .eq('is_dead', false)
    .order('cultivation', { ascending: false })
    .limit(10);

  // Battle power (from stats.battle_power)
  const { data: allChars } = await supabase
    .from('characters')
    .select('name, stats, luck, stats->alchemy, cultivation')
    .eq('server_id', serverId)
    .eq('is_dead', false);

  const battleRank = (allChars ?? [])
    .map((c: Record<string, unknown>) => ({
      name: c.name as string,
      battle_power: ((c.stats as Record<string, number>)?.battle_power ?? (c.cultivation as number ?? 0)),
    }))
    .sort((a, b) => b.battle_power - a.battle_power)
    .slice(0, 10);

  const luckRank = (allChars ?? [])
    .map((c: Record<string, unknown>) => ({ name: c.name as string, luck: c.luck as number ?? 0 }))
    .sort((a, b) => b.luck - a.luck)
    .slice(0, 10);

  const alchemyRank = (allChars ?? [])
    .map((c: Record<string, unknown>) => ({
      name: c.name as string,
      alchemy: (c.stats as Record<string, number>)?.alchemy ?? 0,
    }))
    .sort((a, b) => b.alchemy - a.alchemy)
    .slice(0, 10);

  const fameRank = (allChars ?? [])
    .map((c: Record<string, unknown>) => ({
      name: c.name as string,
      fame: (c.stats as Record<string, number>)?.fame ?? 0,
    }))
    .sort((a, b) => b.fame - a.fame)
    .slice(0, 10);

  res.json({
    cultivation: cultivationRank,
    battle_power: battleRank,
    luck: luckRank,
    alchemy: alchemyRank,
    fame: fameRank,
  });
});

export default router;
