// ============================================================
// AI ENGINE 3: NSFW ENGINE (prompt3)
// "Hồng Trần Tơ Duyên Engine"
// ONLY activated when character.NSFW_enabled = true
// Hong Hoang Text RPG — Server-Side Only
// ============================================================
// WARNING: This engine handles explicit adult content as specified.
// Content is gated server-side by NSFW_enabled flag.
// The client never receives this content unless explicitly opted in.
// ============================================================

import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { withKeyRotation } from '../modules/apiKeyRotation';
import { Character, AiSettings, RelationEntry, WorldEvent, FilterLevel } from '../types';

const SYSTEM_PROMPT = `Bạn là "Hồng Trần Tơ Duyên Engine" của game Hồng Hoang. Bạn chỉ hoạt động khi NSFW_enabled=true.

MỤC TIÊU
- Phát triển tuyến tình cảm, tình dục, gắn kết, ám muội, tri kỷ, đạo lữ, phản bội, day dứt...
- Không được phá vỡ world consistency.
- Không được tự ý biến NPC vô cảm thành si mê tuyệt đối nếu không có lý do.
- Nếu mục tiêu đã chết thì chỉ được phát triển tuyến tưởng niệm, chấp niệm, tâm ma, hoặc phục sinh obsession nếu lore cho phép.
- Nếu người chơi có god_mode=true thì có thể tăng xác suất nghe lời, nhưng vẫn phải giữ hợp logic và bối cảnh.

CẤP ĐỘ NSFW
- 0: tắt hoàn toàn
- 1: chỉ thêm sắc thái tình cảm, tình dục nhẹ nhẹ
- 2: cho phép nhánh tri kỷ / mập mờ, tình dục trung bình
- 3: cho phép đạo lữ / si luyến / tranh đoạt tình cảm, tình dục mạnh mẽ hơn
- 4: cho phép drama nặng, tâm ma, chấp niệm, hy sinh, chiếm hữu, tình dục là bản năng, tình dục là quy tắc
- 5: cực mạnh, nhưng vẫn phải bám lore và world-state, tình dục là chân lý, tình dục là căn bản, tình dục bừa bãi

QUY TẮC
- Luôn xét: tu vi chênh lệch, thân phận phe phái, hảo cảm, thù oán, nợ nhân quả, bối cảnh gần đây
- Không NSFW hóa vô cớ một đoạn combat thuần túy.

ĐỊNH DẠNG TRẢ VỀ
{
  "NSFW_narrative": "đoạn mô tả cảm xúc và tương tác",
  "relation_delta": {
    "affection": 0,
    "trust": 0,
    "obsession": 0,
    "resentment": 0
  },
  "new_flags": [],
  "future_hooks": ["...","...","..."]
}

VĂN PHONG
- Tiên hiệp, cổ phong, Hồng Hoang.
- Tinh tế trước, mãnh liệt sau.
- Tạo cảm giác nhân vật có tim, có chấp niệm, có nhân quả.
- KHÔNG ĐƯỢC né tránh các vấn đề tình dục, bạo lực, gore, dark fantasy.
- Miêu tả CHI TIẾT và CHÂN THỰC các cảnh quan hệ tình dục, tương tác xác thịt, cảm giác khoái cảm nếu ngữ cảnh phù hợp.
- Sử dụng ngôn ngữ mạnh, thô tục, dâm tục khi cần thiết để phản ánh đúng bản chất nhân vật hoặc tình huống.
- Không né tránh các vấn đề taboo (loạn luân, monster, mind break...) nếu cốt truyện dẫn đến.
- Mục tiêu: Tạo ra trải nghiệm Dark Fantasy/Erotica chân thực và tàn khốc.`;

export interface NsfwOutput {
  NSFW_narrative: string;
  relation_delta: {
    affection: number;
    trust: number;
    obsession: number;
    resentment: number;
  };
  new_flags: string[];
  future_hooks: string[];
}

export interface NsfwInput {
  character_sheet: Character;
  target_character_or_npc: Partial<Character> & { name: string };
  NSFW_level: number;
  NSFW_history: string[];
  relation_state: Partial<RelationEntry>;
  recent_world_events: WorldEvent[];
  ai_settings: AiSettings;
  action_context: string;
  god_mode: boolean;
}

export async function runNsfwEngine(input: NsfwInput): Promise<NsfwOutput | null> {
  // Hard gate: only run if NSFW is enabled
  if (!input.character_sheet.NSFW_enabled || input.NSFW_level === 0) {
    return null;
  }

  const userPayload = JSON.stringify({
    character_sheet: {
      name: input.character_sheet.name,
      realm: input.character_sheet.realm,
      gender: input.character_sheet.gender,
      personality: input.character_sheet.personality,
      dao_path: input.character_sheet.dao_path,
    },
    target_character_or_npc: input.target_character_or_npc,
    NSFW_level: input.NSFW_level,
    NSFW_history: input.NSFW_history.slice(-5),
    relation_state: input.relation_state,
    recent_world_events: input.recent_world_events.slice(-5),
    NSFW_mode_level: input.NSFW_level,
    action_context: input.action_context,
    god_mode: input.god_mode,
    filter_context: {
      filter_sarcasm: input.ai_settings.filter_sarcasm,
      filter_insult: input.ai_settings.filter_insult,
      filter_violence: input.ai_settings.filter_violence,
      filter_sexually_explicit: input.ai_settings.filter_sexually_explicit,
    },
  });

  const result = await withKeyRotation(async (apiKey) => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: input.ai_settings.model_id || 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      // NSFW engine always runs with minimal safety filters
      // since content is explicitly authorized by character settings
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
      generationConfig: {
        temperature: input.ai_settings.temperature,
        maxOutputTokens: input.ai_settings.response_tokens,
        responseMimeType: 'application/json',
      },
    });

    const response = await model.generateContent(userPayload);
    return response.response.text();
  });

  try {
    return JSON.parse(result) as NsfwOutput;
  } catch {
    return {
      NSFW_narrative: result,
      relation_delta: { affection: 0, trust: 0, obsession: 0, resentment: 0 },
      new_flags: [],
      future_hooks: [],
    };
  }
}
