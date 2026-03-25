# Hồng Hoang Text RPG — Implementation Plan

A full-stack, production-minded multiplayer Text RPG set in the Hồng Hoang universe.  
Server-authoritative, Supabase-backed, React frontend, Node/Express backend, AI-driven narrative.

> [!IMPORTANT]
> **Stack**: React (Vite) + Express.js (Node) + Supabase (PostgreSQL + Realtime) + Google Gemini API  
> **Project root**: `c:/Users/OS/.gemini/antigravity/scratch/my-new-project`

---

## User Review Required

> [!WARNING]
> **Plaintext passwords**: Per spec, `users.pass` is stored as plain text. Code will include a clear `// INSECURE — prototype only` comment. This must be changed to hashed passwords before any production deployment.

> [!CAUTION]
> **NSFW content (prompt3)**: The third AI engine contains explicit adult content per user specification. All NSFW content is gated behind `NSFW_enabled=true` and `NSFW_level` thresholds set per character. The server enforces this gate — the client never receives explicit content unless the flag is set.

> [!NOTE]
> **User-provided data TODOs**: The following lists will have placeholder seeds and must be replaced by the user:
> - Danh sách Đại Đạo (Grand Dao list)
> - Danh sách Thiên Phú (Talents list — file4 content used as lore basis, placeholders provided)
> - Danh sách Tài Năng (Skills list — file5 content used as lore basis, placeholders provided)
> - Nội dung TOS full text (file6 content used, already seeded to `tos_documents`)

---

## Proposed Changes

### Project Scaffold

#### [NEW] Project structure
```
my-new-project/
├── client/                    # React + Vite frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Screen-level components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── store/             # State management (Zustand)
│   │   ├── services/          # API calls to backend
│   │   ├── types/             # TypeScript interfaces
│   │   └── minigames/         # Breakthrough, Alchemy, Forge
│   ├── index.html
│   └── vite.config.ts
├── server/                    # Express.js authoritative backend
│   ├── src/
│   │   ├── routes/            # Auth, game, admin, AI
│   │   ├── modules/
│   │   │   ├── apiKeyRotation.ts
│   │   │   ├── worldEngine.ts
│   │   │   ├── realtimeBroadcaster.ts
│   │   │   └── aiOrchestrator.ts
│   │   ├── ai/
│   │   │   ├── gameplayNarrator.ts   # prompt1
│   │   │   ├── worldAnalyzer.ts      # prompt2
│   │   │   └── nsfwEngine.ts         # prompt3
│   │   ├── validators/        # Action validators
│   │   ├── cron/              # World analyzer cron
│   │   └── types/             # Shared TS types
│   └── index.ts
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seeds/
│       ├── 01_servers.sql
│       ├── 02_tos.sql
│       ├── 03_tianfu.sql       # Thiên phú seed
│       ├── 04_talents.sql      # Tài năng seed
│       └── 05_ai_settings.sql
├── .env.example
├── DEPLOYMENT.md
└── package.json (workspace root)
```

---

### Database Layer

#### [NEW] `supabase/migrations/001_initial_schema.sql`
All 11 tables per spec:
- `users`, `servers`, `save_slots`, `characters`, `world_entities`, `world_events`, `admin_actions`
- `apius`, `apisv`, `ai_settings`, `tos_documents`
- Row-Level Security (RLS) policies: clients can only read their own data; all writes go through backend
- Indexes on `server_id`, `username`, `character_id` for performance
- `version` column on `world_entities` for optimistic locking

#### [NEW] `supabase/seeds/` (5 seed files)
- `01_servers.sql` — 6 servers with era names
- `02_tos.sql` — TOS content from file6
- `03_tianfu.sql` — Thiên phú list (per file4 lore, placeholder entries)
- `04_talents.sql` — Tài năng list (per file5 lore, placeholder entries)
- `05_ai_settings.sql` — Default AI settings row

---

### Backend (Server-Side)

#### [NEW] `server/src/modules/apiKeyRotation.ts`
- `getNextApiKey()` — round-robin by `id` ascending among active keys in `apisv`
- `markKeyFailure(id, error)` — update `last_error`, optionally deactivate
- `markKeyUsed(id)` — update `last_used_at`
- `syncApiSvFromUserKeys(username)` — copy from `apius` to `apisv`
- In-memory cursor tracking current key index

#### [NEW] `server/src/modules/worldEngine.ts`
- `validateAction(characterId, action, worldSnapshot)` — check prerequisites
- `acquireEntityLock(entityId)` — Supabase FOR UPDATE advisory lock in transaction
- `commitWorldEvent(event)` — write to `world_events` + update `world_entities` + `characters` atomically
- `rollbackEvent(eventId)` — admin rollback

#### [NEW] `server/src/modules/realtimeBroadcaster.ts`
- Uses Supabase Realtime channels per `server_id`
- Broadcasts: world events, death notices, resource claimed, territory destroyed, leaderboard update, admin broadcasts

#### [NEW] `server/src/ai/gameplayNarrator.ts` (prompt1)
- Constructs full prompt with world snapshot, character sheet, memory, recent events
- Enforces NSFW gate based on `NSFW_enabled` + `NSFW_level`
- Calls selected Gemini model via API key rotation
- Returns structured JSON: narrative + proposed_effects + risk

#### [NEW] `server/src/ai/worldAnalyzer.ts` (prompt2)
- Runs every 60s per server via cron
- Reads recent `world_events`, key entities/factions
- Returns: entity_updates, faction_updates, ranking_updates, announcements, rumors
- Writes back to Supabase

#### [NEW] `server/src/ai/nsfwEngine.ts` (prompt3)
- Only invoked when `NSFW_enabled=true`
- Respects `NSFW_level` (0–5) and filter settings
- Returns relation_delta + new_flags + future_hooks

#### [NEW] `server/src/routes/`
- `auth.ts` — POST `/api/auth/login`, POST `/api/auth/register`
- `game.ts` — POST `/api/game/action`, GET `/api/game/state`, GET `/api/game/rankings`
- `character.ts` — POST `/api/character/create`, GET `/api/character/:id`
- `admin.ts` — All admin actions (requires `is_admin=true` JWT claim)
- `aiSettings.ts` — GET/PUT `/api/ai-settings`, key import/export

---

### Frontend (React + Vite)

#### [NEW] `client/src/pages/`
- `TosPage.tsx` — Full-screen modal, content from backend, checkbox + continue
- `AuthPage.tsx` — Login/register, ban message display, no max-length
- `ServerSelectPage.tsx` — 6 swipeable server cards, AI settings panel below
- `SaveSlotPage.tsx` — 3 slots per server; empty = `+`, filled = "Vào game" + "Xóa"
- `CharacterCreatePage.tsx` — Full form, code 161982 unlocks: unlimited talents, golden finger field, NSFW toggles
- `RollPage.tsx` — 6 rolls with probability tiers, cumulative score, tier counts
- `StatAllocPage.tsx` — Distribute points to căn cơ, khí vận, sub-stats; tier caps enforced
- `GamePage.tsx` — Main in-game UI

#### [NEW] `client/src/components/`
- `Header.tsx` — Left: hamburger, castle icon, location. Right: admin button, realm icon, stats button
- `StatsPanel.tsx` — Tabs: realm/breakthrough, relations, inventory/equipment, leaderboard, settings
- `ActionInput.tsx` — Text input, Enter to send, RPG log feed
- `AdminPanel.tsx` — Player search, stat editor, gift system, god mode, all admin actions
- `AISettingsPanel.tsx` — API key management (add/import/export), sliders, model dropdown, filters
- `RealtimeFeed.tsx` — World event notifications overlay

#### [NEW] `client/src/minigames/`
- `BreakthroughMinigame.tsx` — 9 lightning tribulation rounds, 3 thunder types, phantom armor, pills
- `AlchemyMinigame.tsx` — Temperature bar, golden zone, fire control, familiarity tracking
- `ForgeMinigame.tsx` — Type selector, material selector, forge button, success%/break display

#### [NEW] `client/src/store/`
- `useGameStore.ts` — Zustand store: auth, character, world state, chat log, realtime events
- `useRealtimeStore.ts` — Supabase Realtime subscription management

#### [NEW] `client/src/types/`
- `character.ts`, `worldEntity.ts`, `worldEvent.ts`, `adminAction.ts`, `aiSettings.ts`

---

### Config & Docs

#### [NEW] `.env.example`
```
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Gemini
GEMINI_API_KEY=  # fallback if apisv is empty

# Server
PORT=3001
JWT_SECRET=

# Client (public, non-secret)
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=  # read-only anon key for Realtime subscriptions only
```

#### [NEW] `DEPLOYMENT.md`
- Local dev setup steps
- Supabase migration/seed commands
- Environment variable descriptions
- Production deployment checklist
- TODO items for user data

---

## Verification Plan

### Automated Tests
No existing test suite detected. The following manual integration checks will be performed using the browser subagent after startup:

```bash
# Start backend
cd server && npm run dev

# Start frontend  
cd client && npm run dev
```

### Manual Verification
1. **TOS modal** — Open `http://localhost:5173`, verify full-screen TOS appears, checkbox required before proceeding
2. **Auth** — Register new user, login, verify banned user sees ban message
3. **Server select** — 6 cards swipeable, AI settings panel opens below
4. **Save slots** — Empty slots show `+`, create character fills slot, "Vào game"/"Xóa" appear
5. **Character creation** — Enter code `161982`, verify: unlimited talents, golden finger field, NSFW toggle appear
6. **Roll screen** — 6 rolls display with tier labels and cumulative score
7. **Stat allocation** — Tier caps enforced; with code, uncapped
8. **In-game UI** — Send action, AI narrative appears in log, header shows location
9. **Realtime** — Two browser tabs same server, action in tab1 appears in tab2's feed
10. **Admin panel** — Login as `is_admin=true` user, admin button appears, stat edit works
11. **Minigames** — Breakthrough launches on realm progress 100%, alchemy/forge from inventory
