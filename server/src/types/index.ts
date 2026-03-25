// ============================================================
// SHARED TYPESCRIPT INTERFACES
// Hong Hoang Text RPG — Types
// ============================================================

export interface User {
  username: string;
  pass?: string; // INSECURE: plaintext — prototype only
  is_admin: boolean;
  ban?: string | null;
  created_at: string;
}

export interface Server {
  server_id: string;
  name: string;
  era_index: number;
  era_name: string;
  world_time: number;
  status: Record<string, unknown>;
}

export interface SaveSlot {
  id: string;
  username: string;
  server_id: string;
  slot_index: 1 | 2 | 3;
  save_name?: string;
  character_json?: Character;
  world_anchor_version: number;
  is_deleted: boolean;
}

// ---- REALM PROGRESSION ----
export type RealmName =
  | 'Phàm Nhân'
  | 'Luyện Khí'
  | 'Trúc Cơ'
  | 'Kim Đan'
  | 'Nguyên Anh'
  | 'Hóa Thần'
  | 'Luyện Hư'
  | 'Hợp Thể'
  | 'Đại Thừa'
  | 'Độ Kiếp'
  | 'Tiên Cảnh'
  | 'Thiên Tiên'
  | 'Đại La Kim Tiên'
  | 'Thánh Nhân'
  | 'Đại Thánh'
  | 'Thiên Đạo Thánh Nhân'
  | string; // extensible

// ---- CHARACTER ----
export interface Character {
  character_id: string;
  username: string;
  server_id: string;
  slot_index: number;
  name: string;
  gender: 'nam' | 'nữ' | 'vô giới' | string;
  origin?: string;
  appearance?: string;
  personality?: string;
  likes?: string;
  dislikes?: string;
  dao_path?: string;
  talents: TalentEntry[];       // Tài năng
  aptitudes: AptitudeEntry[];   // Thiên phú
  golden_finger: GoldenFinger;  // Bàn tay vàng (code 161982)
  NSFW_enabled: boolean;
  NSFW_level: 0 | 1 | 2 | 3 | 4 | 5;
  realm: RealmName;
  realm_progress: number;       // 0-100
  hp: number;
  mp: number;
  lifespan: number;
  cultivation: number;
  foundation: number;           // Căn cơ
  luck: number;                 // Khí vận
  stats: CharacterStats;
  relations: Record<string, RelationEntry>;
  inventory: InventoryItem[];
  equipment: Equipment;
  is_dead: boolean;
  death_reason?: string | null;
  created_at: string;
}

export interface TalentEntry {
  name: string;
  type: string;
  desc?: string;
  is_custom?: boolean;
  nerfed?: boolean;
}

export interface AptitudeEntry {
  name: string;
  type: string;
  desc?: string;
  is_custom?: boolean;
  nerfed?: boolean;
}

export interface GoldenFinger {
  raw_input?: string[];         // original user input
  processed?: string[];         // AI-normalized entries
  enabled?: boolean;
}

export interface CharacterStats {
  attack?: number;
  defense?: number;
  speed?: number;
  perception?: number;
  charm?: number;
  alchemy?: number;
  forging?: number;
  array?: number;               // Trận pháp
  fame?: number;                // Danh vọng
  battle_power?: number;        // Chiến lực
  [key: string]: number | undefined;
}

export interface RelationEntry {
  target_id: string;
  target_name: string;
  affection: number;            // -100 to 100
  trust: number;
  obsession: number;
  resentment: number;
  flags: string[];
}

// ---- ITEMS / PHÁP BẢO ----
export type ItemGrade =
  // Below immortal: 1-9
  | 'phàm_1' | 'phàm_2' | 'phàm_3' | 'phàm_4' | 'phàm_5'
  | 'phàm_6' | 'phàm_7' | 'phàm_8' | 'phàm_9'
  // Immortal+
  | 'hau_thien_linh_bao'
  | 'tien_thien_linh_bao'
  | 'tien_thien_chi_bao'
  | 'hon_don_linh_bao'
  | 'hon_don_chi_bao';

export type ItemSlot = 'ao' | 'quan' | 'vu_khi' | 'phap_bao' | 'co_bao';

export interface InventoryItem {
  item_id: string;
  name: string;
  type: 'pill' | 'weapon' | 'armor' | 'treasure' | 'material' | 'misc';
  grade?: ItemGrade;
  slot?: ItemSlot;
  quantity: number;
  stats?: Record<string, number>;
  desc?: string;
}

export interface Equipment {
  ao?: InventoryItem;       // Áo giáp
  quan?: InventoryItem;     // Quần
  vu_khi?: InventoryItem;   // Vũ khí
  phap_bao?: InventoryItem; // Pháp bảo
  co_bao?: InventoryItem;   // Cổ bảo
}

// ---- WORLD ENTITY ----
export type EntityType =
  | 'opportunity'   // Cơ duyên
  | 'territory'     // Lãnh thổ
  | 'faction'       // Thế lực
  | 'npc'
  | 'resource'
  | 'artifact'
  | 'dungeon'
  | string;

export interface WorldEntity {
  entity_id: string;
  server_id: string;
  entity_type: EntityType;
  name: string;
  state: Record<string, unknown>;
  is_destroyed: boolean;
  owner_character_id?: string | null;
  respawn_at?: string | null;
  version: number; // optimistic lock
}

// ---- WORLD EVENT ----
export type WorldEventType =
  | 'death'
  | 'breakthrough'
  | 'loot'
  | 'combat'
  | 'territory_change'
  | 'faction_change'
  | 'broadcast'
  | 'revive'
  | 'spawn'
  | 'admin_action'
  | 'resource_claimed'
  | 'realm_ascend'
  | string;

export interface WorldEvent {
  event_id: string;
  server_id: string;
  actor_character_id?: string | null;
  target_ids: string[];
  event_type: WorldEventType;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  created_at: string;
  world_time: number;
}

// ---- ADMIN ACTION ----
export interface AdminAction {
  id: string;
  admin_username: string;
  action_type: string;
  target_type: string;
  target_id: string;
  payload: Record<string, unknown>;
  created_at: string;
}

// ---- AI SETTINGS ----
export type FilterLevel = 'off' | 'low' | 'medium' | 'high';

export interface AiSettings {
  id?: string;
  username: string;
  server_id?: string | null;
  temperature: number;            // 0.0–2.0
  memory_window: number;          // 10–50
  summary_every: number;          // default 10
  response_tokens: number;        // 2000–16000
  model_id: string;
  filter_enabled: boolean;
  filter_violence: FilterLevel;
  filter_sexually_explicit: FilterLevel;
  filter_insult: FilterLevel;
  filter_sarcasm: FilterLevel;
}

// ---- API KEY ENTRIES ----
export interface ApiKeyUser {
  id: string;
  username: string;
  project_label?: string;
  api_key: string;
  is_active: boolean;
  priority: number;
  last_error?: string;
  last_used_at?: string;
}

export interface ApiKeyServer {
  id: number;
  api_key: string;
  source_username?: string;
  is_active: boolean;
  last_used_at?: string;
  last_error?: string;
}

// ---- API KEY ROTATION STATE ----
export interface KeyRotationState {
  current_id: number;
}

// ---- AI NARRATOR INPUT ----
export interface NarratorInput {
  server_info: Server;
  world_snapshot: WorldSnapshot;
  character_sheet: Character;
  nearby_entities: WorldEntity[];
  recent_world_events: WorldEvent[];
  memory_summary: string;
  last_messages: ChatMessage[];
  player_action: string;
  ai_settings: AiSettings;
  system_flags: SystemFlags;
}

export interface WorldSnapshot {
  server_id: string;
  world_time: number;
  key_entities: WorldEntity[];
  key_factions: WorldEntity[];
  active_players_count: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SystemFlags {
  god_mode: boolean;
  romance_enabled: boolean;
  NSFW_enabled: boolean;
  NSFW_level: number;
  has_code_161982: boolean;
  filters: {
    violence: FilterLevel;
    sexually_explicit: FilterLevel;
    insult: FilterLevel;
    sarcasm: FilterLevel;
  };
}

// ---- AI NARRATOR OUTPUT ----
export interface NarratorOutput {
  narrative: string;
  intent_class: IntentClass;
  requires_server_resolution: boolean;
  proposed_effects: ProposedEffects;
  risk: RiskAssessment;
  follow_up_options: string[];
}

export type IntentClass =
  | 'combat'
  | 'travel'
  | 'cultivate'
  | 'craft_alchemy'
  | 'craft_forge'
  | 'social'
  | 'romance'
  | 'loot'
  | 'breakthrough'
  | 'admin_like'
  | 'other';

export interface ProposedEffects {
  self: Partial<Character>;
  targets: Array<{ character_id: string; changes: Partial<Character> }>;
  world: Array<{ entity_id: string; changes: Partial<WorldEntity> }>;
  relations: RelationDelta[];
  items: ItemDelta[];
  realm_progress: number;
}

export interface RelationDelta {
  target_id: string;
  affection?: number;
  trust?: number;
  obsession?: number;
  resentment?: number;
}

export interface ItemDelta {
  item_id: string;
  action: 'add' | 'remove' | 'update';
  item?: InventoryItem;
}

export interface RiskAssessment {
  death_risk: number;     // 0-100
  injury_risk: number;
  karma_risk: number;
  publicity_risk: number;
}

// ---- MINIGAME TYPES ----
export interface BreakthroughState {
  round: number;          // 1-9
  max_rounds: number;     // usually 9
  phantom_armor: number;
  hp_current: number;
  hp_max: number;
  pills_used: string[];
  lightning_log: LightningStrike[];
  status: 'pending' | 'active' | 'success' | 'failed';
}

export type LightningType = 'pham_loi' | 'ngu_hanh_dao_loi' | 'tu_tieu_than_loi';

export interface LightningStrike {
  type: LightningType;
  raw_damage: number;
  armor_reduced: number;
  final_damage: number;
  survived: boolean;
}

export interface AlchemyState {
  recipe_name: string;
  familiarity: number;    // 0-100
  temperature: number;    // 0-100
  optimal_zone_min: number;
  optimal_zone_max: number;
  success_chance: number;
  phase: 'preparing' | 'active' | 'result';
  result?: 'success' | 'fail' | 'perfect';
  pill_grade?: ItemGrade;
}

export interface ForgeState {
  item_type: ItemSlot;
  material_grade: ItemGrade;
  current_grade: ItemGrade;
  success_chance: number; // decreases each forge
  forge_count: number;
  status: 'pending' | 'active' | 'success' | 'broken';
  result_name?: string;
  result_stats?: Record<string, number>;
}

// ---- JWT PAYLOAD ----
export interface JwtPayload {
  username: string;
  is_admin: boolean;
  iat?: number;
  exp?: number;
}
