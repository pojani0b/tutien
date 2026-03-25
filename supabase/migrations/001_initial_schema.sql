-- ============================================================
-- HONG HOANG TEXT RPG — Supabase Migration 001
-- Run via: supabase db push  OR  psql -f this file
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  username       TEXT PRIMARY KEY,
  -- INSECURE: password stored as plain text.
  -- This is appropriate ONLY for a private/prototype server.
  -- In production, replace with argon2/bcrypt hashed password.
  pass           TEXT,
  is_admin       BOOLEAN NOT NULL DEFAULT FALSE,
  ban            TEXT,                          -- NULL or blank = not banned; non-empty = ban reason shown to user
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. SERVERS
-- ============================================================
CREATE TABLE IF NOT EXISTS servers (
  server_id      TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  era_index      INT NOT NULL,
  era_name       TEXT NOT NULL,
  world_time     BIGINT NOT NULL DEFAULT 0,
  status         JSONB NOT NULL DEFAULT '{}'
);

-- ============================================================
-- 3. SAVE SLOTS
-- ============================================================
CREATE TABLE IF NOT EXISTS save_slots (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username             TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  server_id            TEXT NOT NULL REFERENCES servers(server_id) ON DELETE CASCADE,
  slot_index           INT NOT NULL CHECK (slot_index BETWEEN 1 AND 3),
  save_name            TEXT,
  character_json       JSONB,
  world_anchor_version BIGINT NOT NULL DEFAULT 0,
  is_deleted           BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (username, server_id, slot_index)
);

-- ============================================================
-- 4. CHARACTERS
-- ============================================================
CREATE TABLE IF NOT EXISTS characters (
  character_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username         TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  server_id        TEXT NOT NULL REFERENCES servers(server_id) ON DELETE CASCADE,
  slot_index       INT NOT NULL,
  name             TEXT NOT NULL,
  gender           TEXT NOT NULL DEFAULT 'nam',
  origin           TEXT,
  appearance       TEXT,
  personality      TEXT,
  likes            TEXT,
  dislikes         TEXT,
  dao_path         TEXT,
  talents          JSONB NOT NULL DEFAULT '[]',
  aptitudes        JSONB NOT NULL DEFAULT '[]',
  golden_finger    JSONB NOT NULL DEFAULT '{}',
  NSFW_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  NSFW_level       INT NOT NULL DEFAULT 0,
  realm            TEXT NOT NULL DEFAULT 'Phàm Nhân',
  realm_progress   NUMERIC NOT NULL DEFAULT 0,
  hp               BIGINT NOT NULL DEFAULT 100,
  mp               BIGINT NOT NULL DEFAULT 100,
  lifespan         BIGINT NOT NULL DEFAULT 100,
  cultivation      BIGINT NOT NULL DEFAULT 0,
  foundation       INT NOT NULL DEFAULT 0,
  luck             INT NOT NULL DEFAULT 0,
  stats            JSONB NOT NULL DEFAULT '{}',
  relations        JSONB NOT NULL DEFAULT '{}',
  inventory        JSONB NOT NULL DEFAULT '[]',
  equipment        JSONB NOT NULL DEFAULT '{}',
  is_dead          BOOLEAN NOT NULL DEFAULT FALSE,
  death_reason     TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_characters_server ON characters(server_id);
CREATE INDEX IF NOT EXISTS idx_characters_username ON characters(username);

-- ============================================================
-- 5. WORLD ENTITIES
-- entity_type: 'opportunity' | 'territory' | 'faction' | 'npc' | 'resource' | 'artifact' | 'dungeon'
-- version: used for optimistic locking
-- ============================================================
CREATE TABLE IF NOT EXISTS world_entities (
  entity_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id           TEXT NOT NULL REFERENCES servers(server_id) ON DELETE CASCADE,
  entity_type         TEXT NOT NULL,
  name                TEXT NOT NULL,
  state               JSONB NOT NULL DEFAULT '{}',
  is_destroyed        BOOLEAN NOT NULL DEFAULT FALSE,
  owner_character_id  UUID REFERENCES characters(character_id) ON DELETE SET NULL,
  respawn_at          TIMESTAMPTZ,
  version             BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_world_entities_server ON world_entities(server_id);
CREATE INDEX IF NOT EXISTS idx_world_entities_type ON world_entities(entity_type);

-- ============================================================
-- 6. WORLD EVENTS
-- event_type: 'death' | 'breakthrough' | 'loot' | 'combat' | 'territory_change'
--             | 'faction_change' | 'broadcast' | 'revive' | 'spawn' | 'admin_action'
-- ============================================================
CREATE TABLE IF NOT EXISTS world_events (
  event_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id           TEXT NOT NULL REFERENCES servers(server_id) ON DELETE CASCADE,
  actor_character_id  UUID REFERENCES characters(character_id) ON DELETE SET NULL,
  target_ids          JSONB NOT NULL DEFAULT '[]',
  event_type          TEXT NOT NULL,
  payload             JSONB NOT NULL DEFAULT '{}',
  result              JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  world_time          BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_world_events_server ON world_events(server_id);
CREATE INDEX IF NOT EXISTS idx_world_events_created ON world_events(created_at DESC);

-- ============================================================
-- 7. ADMIN ACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_username  TEXT NOT NULL REFERENCES users(username),
  action_type     TEXT NOT NULL,
  target_type     TEXT NOT NULL,
  target_id       TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_username);

-- ============================================================
-- 8. APIUS — User-owned API keys
-- ============================================================
CREATE TABLE IF NOT EXISTS apius (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username       TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  project_label  TEXT,
  api_key        TEXT NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  priority       INT NOT NULL DEFAULT 0,
  last_error     TEXT,
  last_used_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_apius_username ON apius(username);

-- ============================================================
-- 9. APISV — Server-side pooled API keys (rotated by backend)
-- ============================================================
CREATE TABLE IF NOT EXISTS apisv (
  id              SERIAL PRIMARY KEY,
  api_key         TEXT NOT NULL,
  source_username TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at    TIMESTAMPTZ,
  last_error      TEXT
);

-- ============================================================
-- 10. AI SETTINGS
-- Per-user or per-user+server; server_id NULL = global default for user
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username             TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  server_id            TEXT REFERENCES servers(server_id) ON DELETE CASCADE,
  temperature          NUMERIC NOT NULL DEFAULT 0.9,
  memory_window        INT NOT NULL DEFAULT 10,
  summary_every        INT NOT NULL DEFAULT 10,
  response_tokens      INT NOT NULL DEFAULT 4860,
  model_id             TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  filter_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  filter_violence      TEXT NOT NULL DEFAULT 'off',
  filter_sexually_explicit TEXT NOT NULL DEFAULT 'off',
  filter_insult        TEXT NOT NULL DEFAULT 'off',
  filter_sarcasm       TEXT NOT NULL DEFAULT 'off',
  UNIQUE(username, server_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_settings_username ON ai_settings(username);

-- ============================================================
-- 11. TOS DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tos_documents (
  doc_key   TEXT PRIMARY KEY,
  content   TEXT NOT NULL,
  version   TEXT NOT NULL DEFAULT '1.0'
);

-- ============================================================
-- ROW LEVEL SECURITY
-- All sensitive writes go through the backend (service role key).
-- Client uses anon key only for Realtime subscriptions (read-only).
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE save_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE apius ENABLE ROW LEVEL SECURITY;
ALTER TABLE apisv ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tos_documents ENABLE ROW LEVEL SECURITY;

-- Allow anon/authenticated to read public data for Realtime
CREATE POLICY "public_read_servers" ON servers FOR SELECT USING (TRUE);
CREATE POLICY "public_read_tos" ON tos_documents FOR SELECT USING (TRUE);
CREATE POLICY "public_read_world_events" ON world_events FOR SELECT USING (TRUE);
CREATE POLICY "public_read_world_entities" ON world_entities FOR SELECT USING (TRUE);

-- Service role bypasses all policies (backend uses service role key)
-- No client-side write policies — all writes via backend API

-- ============================================================
-- REALTIME
-- Enable Realtime publication for live sync
-- ============================================================
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE
    world_events,
    world_entities,
    characters,
    servers;
COMMIT;
