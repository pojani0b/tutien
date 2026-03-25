// ============================================================
// REALTIME EVENT BROADCASTER
// Hong Hoang Text RPG — Supabase Realtime
// ============================================================
// The backend inserts to Supabase, which triggers Realtime
// automatically on subscribed tables (world_events, world_entities, etc.)
//
// This module provides helper functions the backend uses to:
// 1. Send notices via Supabase Realtime Broadcast channels
//    (for typed server→client messages beyond table changes)
// 2. Create properly-typed world event rows which Postgres CDC
//    then fans out to all subscribed clients in the same server.
// ============================================================

import { supabase } from '../lib/supabase';
import { WorldEvent } from '../types';
import { commitWorldEvent } from './worldEngine';

// ---- TYPED BROADCAST PAYLOADS ----

export type BroadcastType =
  | 'death_notice'
  | 'resource_claimed'
  | 'territory_destroyed'
  | 'leaderboard_update'
  | 'admin_broadcast'
  | 'player_joined'
  | 'player_left'
  | 'realm_ascend';

export interface BroadcastPayload {
  type: BroadcastType;
  server_id: string;
  data: Record<string, unknown>;
}

/**
 * Send a typed broadcast message to all clients in a server channel.
 * Clients subscribe to "server:{server_id}" channel.
 */
export async function broadcastToServer(
  serverId: string,
  type: BroadcastType,
  data: Record<string, unknown>
): Promise<void> {
  const channel = supabase.channel(`server:${serverId}`);

  const result = await channel.send({
    type: 'broadcast',
    event: type,
    payload: { type, server_id: serverId, data },
  });

  if (result !== 'ok') {
    console.error(`[Broadcast] Failed to send ${type} to server ${serverId}:`, result);
  }
}

// ---- CONVENIENCE BROADCAST METHODS ----

export async function broadcastDeathNotice(
  serverId: string,
  params: {
    character_id: string;
    character_name: string;
    killer_name?: string;
    death_reason: string;
    world_time: number;
  }
): Promise<void> {
  await broadcastToServer(serverId, 'death_notice', params);
}

export async function broadcastResourceClaimed(
  serverId: string,
  params: {
    entity_id: string;
    entity_name: string;
    claimer_name: string;
    claimer_id: string;
    is_one_time: boolean;
    respawn_at?: string;
  }
): Promise<void> {
  await broadcastToServer(serverId, 'resource_claimed', params);
}

export async function broadcastTerritoryDestroyed(
  serverId: string,
  params: {
    entity_id: string;
    entity_name: string;
    destroyer_name: string;
    new_state: Record<string, unknown>;
  }
): Promise<void> {
  await broadcastToServer(serverId, 'territory_destroyed', params);
}

export async function broadcastLeaderboardUpdate(
  serverId: string,
  params: {
    category: string;
    top_n: Array<{ rank: number; name: string; value: number }>;
  }
): Promise<void> {
  await broadcastToServer(serverId, 'leaderboard_update', params);
}

/**
 * Admin broadcast message — shown to all players in a server.
 * Stored in world_events and also broadcast via channel.
 */
export async function broadcastAdminMessage(
  serverId: string,
  adminUsername: string,
  message: string,
  worldTime: number
): Promise<WorldEvent | null> {
  const event = await commitWorldEvent({
    server_id: serverId,
    actor_character_id: undefined,
    target_ids: [],
    event_type: 'broadcast',
    payload: { admin: adminUsername, message },
    result: {},
    world_time: worldTime,
  });

  await broadcastToServer(serverId, 'admin_broadcast', {
    message,
    admin: adminUsername,
    world_time: worldTime,
  });

  return event;
}

export async function broadcastRealmAscend(
  serverId: string,
  params: {
    character_name: string;
    old_realm: string;
    new_realm: string;
  }
): Promise<void> {
  await broadcastToServer(serverId, 'realm_ascend', params);
}
