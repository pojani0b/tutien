-- ============================================================
-- SEED 05: Default AI settings (global, no server_id)
-- One row per username — inserted when user first changes settings
-- This seed creates the system defaults reference only
-- ============================================================

-- Example default row (replace 'system' with actual user when needed)
-- INSERT INTO ai_settings (username, server_id, temperature, memory_window, summary_every, response_tokens, model_id)
-- VALUES ('system', NULL, 0.9, 10, 10, 4860, 'gemini-2.5-flash')
-- ON CONFLICT (username, server_id) DO NOTHING;

-- AI settings are created on-demand per user in the backend.
-- No static seed needed here.
SELECT 1; -- no-op placeholder
