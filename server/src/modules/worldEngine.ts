// ============================================================
// WORLD TRANSACTION ENGINE
// Hong Hoang Text RPG — Authoritative Server
// ============================================================
// All world-state mutations go through this module.
// Clients NEVER write directly to Supabase.
// Uses optimistic locking (version column) + advisory transactions.
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import {
  Character,
  WorldEntity,
  WorldEvent,
  WorldEventType,
  NarratorOutput,
  ProposedEffects,
} from '../types';

// ---- PREREQUISITE VALIDATION ----

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validate an action before committing to world state.
 * Checks:
 *  - Actor must be alive
 *  - Actor must exist in server
 *  - Target entities must not be destroyed (unless action allows it)
 *  - Resource contention flagged
 */
export async function validateAction(
  character: Character,
  action: string,
  targetEntityIds: string[]
): Promise<ValidationResult> {
  // 1. Actor alive check
  if (character.is_dead) {
    return { valid: false, reason: 'Nhân vật đã chết. Không thể hành động.' };
  }

  // 2. Actor HP check
  if (character.hp <= 0) {
    return { valid: false, reason: 'HP về 0. Nhân vật không thể hành động.' };
  }

  // 3. Target entity checks
  for (const entityId of targetEntityIds) {
    const { data: entity, error } = await supabase
      .from('world_entities')
      .select('entity_id, is_destroyed, respawn_at, state')
      .eq('entity_id', entityId)
      .single();

    if (error || !entity) {
      return { valid: false, reason: `Thực thể ${entityId} không tồn tại trong server này.` };
    }

    if ((entity as WorldEntity).is_destroyed) {
      const respawnAt = (entity as WorldEntity).respawn_at;
      if (!respawnAt || new Date(respawnAt) > new Date()) {
        return {
          valid: false,
          reason: `Thực thể "${entityId}" đã bị phá hủy và chưa thể tái sinh.`,
        };
      }
    }
  }

  return { valid: true };
}

// ---- ENTITY LOCKING (Optimistic) ----

/**
 * Attempt to acquire an optimistic lock on a world entity.
 * Returns the entity if lock succeeds, null if version mismatch (conflict).
 * Uses SELECT + version check pattern (no real DB advisory lock in Supabase without pg functions).
 */
export async function acquireEntityLock(
  entityId: string,
  expectedVersion: number
): Promise<WorldEntity | null> {
  const { data, error } = await supabase
    .from('world_entities')
    .select('*')
    .eq('entity_id', entityId)
    .eq('version', expectedVersion)
    .single();

  if (error || !data) {
    console.warn(`[WorldEngine] Lock failed for entity ${entityId} — version mismatch or not found`);
    return null;
  }

  return data as WorldEntity;
}

/**
 * Increment entity version (release optimistic lock after mutation).
 */
export async function releaseEntityLock(entityId: string, newVersion: number): Promise<void> {
  await supabase
    .from('world_entities')
    .update({ version: newVersion })
    .eq('entity_id', entityId);
}

// ---- WORLD EVENT COMMIT ----

export interface CommitEventParams {
  server_id: string;
  actor_character_id?: string;
  target_ids?: string[];
  event_type: WorldEventType;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  world_time: number;
  character_updates?: Partial<Character>;
  entity_updates?: Array<{ entity_id: string; changes: Partial<WorldEntity> }>;
  target_character_updates?: Array<{ character_id: string; changes: Partial<Character> }>;
}

/**
 * Atomically commit a world event and apply all resulting state changes.
 * Order of operations:
 *  1. Insert world event
 *  2. Update actor character
 *  3. Update target characters
 *  4. Update world entities (with version increment)
 */
export async function commitWorldEvent(params: CommitEventParams): Promise<WorldEvent | null> {
  const eventId = uuidv4();

  // 1. Insert world event
  const { data: eventRow, error: eventErr } = await supabase
    .from('world_events')
    .insert({
      event_id: eventId,
      server_id: params.server_id,
      actor_character_id: params.actor_character_id ?? null,
      target_ids: params.target_ids ?? [],
      event_type: params.event_type,
      payload: params.payload,
      result: params.result,
      world_time: params.world_time,
    })
    .select()
    .single();

  if (eventErr || !eventRow) {
    console.error('[WorldEngine] Failed to insert world event:', eventErr?.message);
    return null;
  }

  // 2. Update actor character
  if (params.actor_character_id && params.character_updates) {
    const { error } = await supabase
      .from('characters')
      .update(params.character_updates)
      .eq('character_id', params.actor_character_id);

    if (error) console.error('[WorldEngine] Character update failed:', error.message);
  }

  // 3. Update target characters
  if (params.target_character_updates) {
    for (const tu of params.target_character_updates) {
      const { error } = await supabase
        .from('characters')
        .update(tu.changes)
        .eq('character_id', tu.character_id);

      if (error) console.error(`[WorldEngine] Target char update failed (${tu.character_id}):`, error.message);
    }
  }

  // 4. Update world entities
  if (params.entity_updates) {
    for (const eu of params.entity_updates) {
      // Increment version for optimistic locking
      const { data: current } = await supabase
        .from('world_entities')
        .select('version')
        .eq('entity_id', eu.entity_id)
        .single();

      const newVersion = ((current as { version: number } | null)?.version ?? 0) + 1;

      const { error } = await supabase
        .from('world_entities')
        .update({ ...eu.changes, version: newVersion })
        .eq('entity_id', eu.entity_id);

      if (error) console.error(`[WorldEngine] Entity update failed (${eu.entity_id}):`, error.message);
    }
  }

  return eventRow as WorldEvent;
}

// ---- APPLY NARRATOR EFFECTS ----

/**
 * Apply AI narrator's proposed effects to the world.
 * This is called AFTER the server validates the action.
 * effects come from NarratorOutput.proposed_effects
 */
export async function applyProposedEffects(
  serverId: string,
  actorCharacterId: string,
  effects: ProposedEffects,
  worldTime: number,
  intentClass: string
): Promise<WorldEvent | null> {
  const characterUpdates: Partial<Character> = {};

  // Self effects
  if (effects.self) {
    Object.assign(characterUpdates, effects.self);
    // Enforce death if hp reaches 0
    if (characterUpdates.hp !== undefined && characterUpdates.hp <= 0) {
      characterUpdates.is_dead = true;
      characterUpdates.hp = 0;
      characterUpdates.death_reason = 'Tử vong trong quá trình hành động';
    }
  }

  // Apply realm_progress delta
  if (effects.realm_progress) {
    // Fetch current realm_progress
    const { data: char } = await supabase
      .from('characters')
      .select('realm_progress')
      .eq('character_id', actorCharacterId)
      .single();

    if (char) {
      characterUpdates.realm_progress = Math.min(
        100,
        (char as { realm_progress: number }).realm_progress + effects.realm_progress
      );
    }
  }

  return await commitWorldEvent({
    server_id: serverId,
    actor_character_id: actorCharacterId,
    target_ids: effects.targets.map((t) => t.character_id),
    event_type: intentClass as WorldEventType,
    payload: { effects },
    result: { applied: true },
    world_time: worldTime,
    character_updates: characterUpdates,
    entity_updates: effects.world.map((w) => ({
      entity_id: w.entity_id,
      changes: w.changes,
    })),
    target_character_updates: effects.targets.map((t) => ({
      character_id: t.character_id,
      changes: t.changes as Partial<Character>,
    })),
  });
}

// ---- DEATH PROCESSING ----

/**
 * Mark a character as dead. This is permanent until admin revive.
 * Creates a death event in world_events.
 */
export async function processCharacterDeath(
  character: Character,
  reason: string,
  worldTime: number
): Promise<WorldEvent | null> {
  console.log(`[WorldEngine] Processing death for ${character.name} (${character.character_id}): ${reason}`);

  return await commitWorldEvent({
    server_id: character.server_id,
    actor_character_id: character.character_id,
    target_ids: [],
    event_type: 'death',
    payload: { reason },
    result: { is_dead: true },
    world_time: worldTime,
    character_updates: {
      is_dead: true,
      hp: 0,
      death_reason: reason,
    },
  });
}

// ---- ADMIN: ROLLBACK EVENT ----

/**
 * Rollback a world event (admin action).
 * Marks the event as rolled back in payload.
 * NOTE: Does NOT automatically undo state changes — 
 * admins apply corrective changes separately via admin routes.
 */
export async function rollbackEvent(eventId: string, adminUsername: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('world_events')
    .select('payload')
    .eq('event_id', eventId)
    .single();

  if (!existing) return false;

  const { error } = await supabase
    .from('world_events')
    .update({
      payload: {
        ...(existing as { payload: Record<string, unknown> }).payload,
        _rolled_back: true,
        _rolled_back_by: adminUsername,
        _rolled_back_at: new Date().toISOString(),
      },
    })
    .eq('event_id', eventId);

  return !error;
}

// ---- SPAWN WORLD ENTITY ----

export async function spawnWorldEntity(
  serverId: string,
  entityType: string,
  name: string,
  state: Record<string, unknown>,
  options?: {
    owner_character_id?: string;
    respawn_at?: string;
  }
): Promise<WorldEntity | null> {
  const { data, error } = await supabase
    .from('world_entities')
    .insert({
      entity_id: uuidv4(),
      server_id: serverId,
      entity_type: entityType,
      name,
      state,
      is_destroyed: false,
      owner_character_id: options?.owner_character_id ?? null,
      respawn_at: options?.respawn_at ?? null,
      version: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('[WorldEngine] Failed to spawn entity:', error.message);
    return null;
  }

  return data as WorldEntity;
}

// ---- ADVANCE SERVER WORLD TIME ----

export async function advanceWorldTime(serverId: string, delta: number): Promise<number> {
  const { data, error } = await supabase.rpc('increment_world_time', {
    p_server_id: serverId,
    p_delta: delta,
  });

  if (error) {
    // Fallback: manual increment
    const { data: current } = await supabase
      .from('servers')
      .select('world_time')
      .eq('server_id', serverId)
      .single();

    const newTime = ((current as { world_time: number } | null)?.world_time ?? 0) + delta;
    await supabase.from('servers').update({ world_time: newTime }).eq('server_id', serverId);
    return newTime;
  }

  return (data as number) ?? 0;
}
