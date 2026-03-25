// ============================================================
// SUPABASE REALTIME HOOK
// Subscribes to server channel for live world events
// Uses public anon key — reads only
// ============================================================

import { useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useGameStore } from '../store/useGameStore';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://txaveuqmckywokvtzvay.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4YXZldXFtY2t5d29rdnR6dmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTk0MjksImV4cCI6MjA4OTkzNTQyOX0.U8WUXSAp3t-61e66lahVV37QTKx0o49TjGBAsBK0Qwk';

// Create a separate anon client for Realtime (read-only, public anon key)
const supabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function useRealtime() {
  const { activeCharacter, addWorldEvent, addNotification } = useGameStore();
  const channelRef = useRef<ReturnType<typeof supabaseClient.channel> | null>(null);

  useEffect(() => {
    if (!supabaseClient || !activeCharacter?.server_id) return;

    const serverId = activeCharacter.server_id;

    // Cleanup old subscription
    if (channelRef.current) {
      supabaseClient.removeChannel(channelRef.current);
    }

    // Subscribe to world_events table changes for this server
    const channel = supabaseClient
      .channel(`server-realtime:${serverId}`)
      // Table-level CDC for world_events
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'world_events',
        filter: `server_id=eq.${serverId}`,
      }, (payload) => {
        const event = payload.new as {
          event_id: string;
          event_type: string;
          payload: Record<string, unknown>;
          created_at: string;
          world_time: number;
        };

        addWorldEvent(event);

        // Show notifications for important events
        if (event.event_type === 'death') {
          const p = event.payload as { reason?: string };
          addNotification(`☠️ Tử vong: ${p.reason ?? ''}`, 'danger');
        } else if (event.event_type === 'broadcast') {
          const p = event.payload as { message?: string };
          if (p.message) addNotification(`📣 ${p.message}`, 'gold');
        } else if (event.event_type === 'realm_ascend') {
          const p = event.payload as { character_name?: string; new_realm?: string };
          addNotification(`⚡ ${p.character_name} đã đột phá tới ${p.new_realm}!`, 'gold');
        } else if (event.event_type === 'resource_claimed') {
          const p = event.payload as Record<string, string>;
          addNotification(`🏆 ${p.claimer_name} đã lấy ${p.entity_name}`, 'info');
        }
      })
      // Broadcast channel messages (admin broadcasts, etc.)
      .on('broadcast', { event: 'admin_broadcast' }, (payload) => {
        const data = payload.payload as { data?: { message?: string } };
        if (data?.data?.message) {
          addNotification(`📣 ${data.data.message}`, 'gold');
        }
      })
      .on('broadcast', { event: 'death_notice' }, (payload) => {
        const data = payload.payload as { data?: { character_name?: string; death_reason?: string } };
        if (data?.data) {
          addNotification(`☠️ ${data.data.character_name} đã tử vong: ${data.data.death_reason}`, 'danger');
        }
      })
      .on('broadcast', { event: 'realm_ascend' }, (payload) => {
        const data = payload.payload as { data?: { character_name?: string; new_realm?: string } };
        if (data?.data) {
          addNotification(`⚡ ${data.data.character_name} đã đột phá tới ${data.data.new_realm}!`, 'gold');
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Connected to server channel: ${serverId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Channel error. Will retry...');
          setTimeout(() => channel.subscribe(), 3000);
        }
      });

    channelRef.current = channel;

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [activeCharacter?.server_id]);
}
