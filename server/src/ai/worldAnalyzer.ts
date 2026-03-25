// ============================================================
// AI ENGINE 2: WORLD ANALYZER (prompt2)
// "Thiên Cơ Quan Trắc"
// Runs every 60 seconds per server via cron.
// Hong Hoang Text RPG — Server-Side Only
// ============================================================

import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { withKeyRotation } from '../modules/apiKeyRotation';
import { supabase } from '../lib/supabase';
import { WorldEntity, WorldEvent, Server } from '../types';

const SYSTEM_PROMPT = `Bạn là "Thiên Cơ Quan Trắc" phụ trách cập nhật đại thế của một server Hồng Hoang mỗi 1 phút.

MỤC TIÊU
- Phân tích các world_events mới.
- Cập nhật biến động thế giới ở cấp server.
- Không được rewrite lịch sử trái với event log.
- Luôn ưu tiên nhất quán timeline.

QUY TẮC
- Nếu một nhân vật đã chết và không có event revive hợp lệ thì vẫn là dead.
- Nếu một vùng bị phá hủy thì giữ destroyed=true cho đến khi có world event phục dựng.
- Nếu cơ duyên một lần đã bị lấy thì không tái sinh.
- Nếu cơ duyên tái tạo được thì chỉ respawn khi đủ điều kiện thời gian và điều kiện lore.
- Nếu hai hành động mâu thuẫn cùng nhắm một entity, ưu tiên event đến trước hoặc event có authority cao hơn theo rule server.
- Tạo biến động phụ hợp lý: danh vọng tăng, thù hận tăng, tông môn phản ứng, thiên cơ nhiễu loạn, khí vận đổi chiều...
- Không buff vô cớ cho người chơi.

ĐỊNH DẠNG TRẢ VỀ
{
  "server_narrative": "tóm tắt đại thế trong 1 phút vừa qua",
  "entity_updates": [],
  "faction_updates": [],
  "ranking_updates": [],
  "announcements": [],
  "rumors": [],
  "admin_flags": [],
  "respawns": [],
  "next_world_time": 0
}

PHONG CÁCH
- Viết như thiên đạo quan sát thế gian.
- Ngắn gọn nhưng có trọng lượng.
- Nhấn vào nhân quả và hậu quả dây chuyền.`;

export interface WorldAnalyzerOutput {
  server_narrative: string;
  entity_updates: Array<{ entity_id: string; changes: Partial<WorldEntity> }>;
  faction_updates: Array<Record<string, unknown>>;
  ranking_updates: Array<Record<string, unknown>>;
  announcements: string[];
  rumors: string[];
  admin_flags: string[];
  respawns: Array<{ entity_id: string; respawn_reason: string }>;
  next_world_time: number;
}

export async function runWorldAnalyzer(serverId: string): Promise<WorldAnalyzerOutput | null> {
  // Fetch server info
  const { data: server } = await supabase
    .from('servers')
    .select('*')
    .eq('server_id', serverId)
    .single();

  if (!server) return null;

  // Fetch recent events (last 60 seconds)
  const since = new Date(Date.now() - 60_000).toISOString();
  const { data: recentEvents } = await supabase
    .from('world_events')
    .select('*')
    .eq('server_id', serverId)
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  // Fetch key entities (factions + territories)
  const { data: keyEntities } = await supabase
    .from('world_entities')
    .select('*')
    .eq('server_id', serverId)
    .in('entity_type', ['faction', 'territory'])
    .limit(20);

  // Fetch respawn candidates
  const { data: respawnCandidates } = await supabase
    .from('world_entities')
    .select('*')
    .eq('server_id', serverId)
    .eq('is_destroyed', false)
    .not('respawn_at', 'is', null)
    .lte('respawn_at', new Date().toISOString());

  // Fetch active players count
  const { count: activePlayers } = await supabase
    .from('characters')
    .select('*', { count: 'exact', head: true })
    .eq('server_id', serverId)
    .eq('is_dead', false);

  const inputPayload = JSON.stringify({
    server_info: server,
    latest_world_time: (server as Server).world_time,
    recent_world_events: (recentEvents || []).slice(0, 30),
    key_entities_snapshot: keyEntities || [],
    key_factions_snapshot: (keyEntities || []).filter((e: WorldEntity) => e.entity_type === 'faction'),
    active_players_summary: { count: activePlayers ?? 0 },
    resource_respawn_candidates: respawnCandidates || [],
  });

  const result = await withKeyRotation(async (apiKey) => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    });

    const response = await model.generateContent(inputPayload);
    return response.response.text();
  });

  try {
    const parsed = JSON.parse(result) as WorldAnalyzerOutput;

    // Apply entity updates from analyzer
    for (const update of parsed.entity_updates) {
      const { entity_id, changes } = update;
      const { data: current } = await supabase
        .from('world_entities')
        .select('version')
        .eq('entity_id', entity_id)
        .single();

      await supabase
        .from('world_entities')
        .update({ ...changes, version: ((current as { version: number } | null)?.version ?? 0) + 1 })
        .eq('entity_id', entity_id);
    }

    // Process respawns
    for (const respawn of parsed.respawns) {
      await supabase
        .from('world_entities')
        .update({ is_destroyed: false, respawn_at: null, state: {} })
        .eq('entity_id', respawn.entity_id);
    }

    // Advance world time
    await supabase
      .from('servers')
      .update({ world_time: parsed.next_world_time })
      .eq('server_id', serverId);

    return parsed;
  } catch {
    console.error('[WorldAnalyzer] Failed to parse analyzer output');
    return null;
  }
}
