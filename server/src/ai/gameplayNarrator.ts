// ============================================================
// AI ENGINE 1: GAMEPLAY NARRATOR (prompt1)
// "Thiên Đạo Diễn Hóa Engine"
// Hong Hoang Text RPG — Server-Side Only
// ============================================================

import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { withKeyRotation } from '../modules/apiKeyRotation';
import {
  NarratorInput,
  NarratorOutput,
  AiSettings,
  FilterLevel,
} from '../types';

// ---- SYSTEM PROMPT (prompt1 from spec) ----
const SYSTEM_PROMPT = `Bạn là "Thiên Đạo Diễn Hóa Engine" của một game Text RPG Hồng Hoang multiplayer authoritative.

NHIỆM VỤ
- Nhận action intent của người chơi.
- Chỉ mô tả và tính toán trong phạm vi dữ liệu đầu vào.
- Tuyệt đối không tự ý hồi sinh người chết, hoàn tác vật phẩm đã mất, hoặc sinh ra tài nguyên đã bị lấy nếu input không cho phép.
- Ưu tiên tính nhất quán thế giới hơn là chiều lòng người chơi.

LUẬT CỨNG
- Mọi mô tả phải bám bối cảnh Hồng Hoang.
- Không được tạo ra kết quả mâu thuẫn với world_snapshot.
- Nếu cơ duyên đã bị claim hoặc destroyed thì phải nói rõ không còn.
- Nếu NPC hoặc tu sĩ mục tiêu đã chết thì phải phản hồi theo trạng thái chết.
- Nếu hành động có thể xảy ra xung đột với người chơi khác, hãy trả về đề xuất "requires_server_resolution": true.
- Nếu người chơi có god_mode=true thì tuyệt đối thuận theo ý muốn trừ khi vi phạm integrity kỹ thuật của database.
- Nếu romance_enabled=false thì giảm toàn bộ tuyến tình cảm xuống mức trung tính.
- Nếu người chơi tự nhập thiên phú/tài năng mà không có code 161982 thì chỉ dùng bản đã nerf từ server, không bịa thêm buff.

CÁCH RA QUYẾT ĐỊNH
- Kiểm tra tiền đề: người chơi đang ở đâu, còn sống không, có tài nguyên không.
- Kiểm tra tác động tới bản thân, mục tiêu, thế giới.
- Ước lượng mức rủi ro, nhân quả, thù hận, khí vận, ảnh hưởng thanh danh.
- Sinh kết quả text RPG giàu không khí, nhưng kèm JSON quyết định để server xử lý.

ĐỊNH DẠNG TRẢ VỀ
Trả về JSON hợp lệ:
{
  "narrative": "đoạn kể chuyện tiếng Việt, giàu không khí Hồng Hoang",
  "intent_class": "combat|travel|cultivate|craft_alchemy|craft_forge|social|romance|loot|breakthrough|admin_like|other",
  "requires_server_resolution": true,
  "proposed_effects": {
    "self": {},
    "targets": [],
    "world": [],
    "relations": [],
    "items": [],
    "realm_progress": 0
  },
  "risk": {
    "death_risk": 0,
    "injury_risk": 0,
    "karma_risk": 0,
    "publicity_risk": 0
  },
  "follow_up_options": ["...","...","..."]
}

VĂN PHONG
- Hắc ám, hùng vĩ, tiên hiệp, Hồng Hoang.
- Mỗi phản hồi phải có cảm giác thế giới thật sự đang sống.
- Không lan man quá mức; ưu tiên hành động, hậu quả, nhân quả, đại thế.`;

// ---- FILTER MAPPING ----
// Map our filter levels to Gemini HarmBlockThreshold
function mapFilter(level: FilterLevel): HarmBlockThreshold {
  switch (level) {
    case 'off':    return HarmBlockThreshold.BLOCK_NONE;
    case 'low':    return HarmBlockThreshold.BLOCK_LOW_AND_ABOVE;
    case 'medium': return HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE;
    case 'high':   return HarmBlockThreshold.BLOCK_ONLY_HIGH;
    default:       return HarmBlockThreshold.BLOCK_NONE;
  }
}

// ---- AVAILABLE MODELS (easy to update) ----
export const AVAILABLE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
];

// ---- SARCASM POST-PROCESSOR ----
function applySarcasmFilter(text: string, level: FilterLevel): string {
  if (level === 'off' || level === 'low') return text;
  // Light post-processing: tone down obvious sarcastic phrases
  // A production system would use a dedicated classifier here
  const sarcasmPhrases = [
    /thật tuyệt vời thay/gi,
    /thật là giỏi/gi,
    /ồ thật không/gi,
  ];
  let cleaned = text;
  if (level === 'high') {
    sarcasmPhrases.forEach((p) => { cleaned = cleaned.replace(p, ''); });
  }
  return cleaned;
}

// ---- MAIN NARRATOR FUNCTION ----

export async function runGameplayNarrator(input: NarratorInput): Promise<NarratorOutput> {
  const { ai_settings, system_flags } = input;

  // If NSFW is disabled, add a policy note to prompt
  const nsfwPolicy = system_flags.NSFW_enabled
    ? `NSFW_enabled=true, NSFW_level=${system_flags.NSFW_level}`
    : 'NSFW_enabled=false — giảm tất cả nội dung tình cảm xuống mức trung tính.';

  const userMessage = buildUserPrompt(input, nsfwPolicy);

  const result = await withKeyRotation(async (apiKey) => {
    const genAI = new GoogleGenerativeAI(apiKey);

    const safetySettings = ai_settings.filter_enabled
      ? [
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: mapFilter(ai_settings.filter_violence),
          },
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: mapFilter(ai_settings.filter_insult),
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: mapFilter(ai_settings.filter_insult),
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: mapFilter(ai_settings.filter_sexually_explicit),
          },
        ]
      : [
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ];

    const model = genAI.getGenerativeModel({
      model: ai_settings.model_id || 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      safetySettings,
      generationConfig: {
        temperature: ai_settings.temperature,
        maxOutputTokens: ai_settings.response_tokens,
        responseMimeType: 'application/json',
      },
    });

    const response = await model.generateContent(userMessage);
    return response.response.text();
  });

  try {
    const parsed = JSON.parse(result) as NarratorOutput;
    // Post-process sarcasm
    if (ai_settings.filter_sarcasm !== 'off') {
      parsed.narrative = applySarcasmFilter(parsed.narrative, ai_settings.filter_sarcasm);
    }
    return parsed;
  } catch {
    // Graceful degradation if JSON parse fails
    return {
      narrative: result,
      intent_class: 'other',
      requires_server_resolution: false,
      proposed_effects: { self: {}, targets: [], world: [], relations: [], items: [], realm_progress: 0 },
      risk: { death_risk: 0, injury_risk: 0, karma_risk: 0, publicity_risk: 0 },
      follow_up_options: [],
    };
  }
}

function buildUserPrompt(input: NarratorInput, nsfwPolicy: string): string {
  return JSON.stringify({
    server_info: {
      server_id: input.server_info.server_id,
      name: input.server_info.name,
      era_name: input.server_info.era_name,
      world_time: input.server_info.world_time,
    },
    world_snapshot: input.world_snapshot,
    character_sheet: {
      name: input.character_sheet.name,
      gender: input.character_sheet.gender,
      realm: input.character_sheet.realm,
      realm_progress: input.character_sheet.realm_progress,
      hp: input.character_sheet.hp,
      mp: input.character_sheet.mp,
      lifespan: input.character_sheet.lifespan,
      cultivation: input.character_sheet.cultivation,
      foundation: input.character_sheet.foundation,
      luck: input.character_sheet.luck,
      dao_path: input.character_sheet.dao_path,
      aptitudes: input.character_sheet.aptitudes,
      talents: input.character_sheet.talents,
      golden_finger: input.character_sheet.golden_finger,
      stats: input.character_sheet.stats,
      is_dead: input.character_sheet.is_dead,
    },
    nearby_entities: input.nearby_entities,
    recent_world_events: input.recent_world_events.slice(0, 10),
    memory_summary: input.memory_summary,
    last_messages: input.last_messages.slice(-input.ai_settings.memory_window),
    player_action: input.player_action,
    system_flags: { ...input.system_flags, nsfw_policy: nsfwPolicy },
  });
}
