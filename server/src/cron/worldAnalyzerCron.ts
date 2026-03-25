// ============================================================
// WORLD ANALYZER CRON JOB
// Runs every 60 seconds for each active server
// ============================================================

import cron from 'node-cron';
import { supabase } from '../lib/supabase';
import { runWorldAnalyzer } from '../ai/worldAnalyzer';
import { broadcastAdminMessage } from '../modules/realtimeBroadcaster';

export function startWorldAnalyzerCron() {
  console.log('[Cron] World Analyzer scheduled: every 60 seconds');

  cron.schedule('* * * * *', async () => {
    try {
      const { data: servers } = await supabase
        .from('servers')
        .select('server_id, name, world_time')
        .order('era_index');

      if (!servers || servers.length === 0) return;

      for (const server of servers as Array<{ server_id: string; name: string; world_time: number }>) {
        try {
          const result = await runWorldAnalyzer(server.server_id);
          if (result && result.announcements.length > 0) {
            for (const announcement of result.announcements) {
              await broadcastAdminMessage(server.server_id, 'system', announcement, result.next_world_time);
            }
          }
          if (result) {
            console.log(`[Cron] Server ${server.name}: ${result.server_narrative.slice(0, 60)}...`);
          }
        } catch (err) {
          console.error(`[Cron] World Analyzer failed for server ${server.server_id}:`, err);
        }
      }
    } catch (err) {
      console.error('[Cron] Failed to fetch servers:', err);
    }
  });
}
