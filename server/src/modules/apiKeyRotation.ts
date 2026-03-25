// ============================================================
// API KEY ROTATION MODULE
// Hong Hoang Text RPG — Server-Side
// ============================================================
// Manages rotation of API keys from the `apisv` table.
// Keys are cycled round-robin by ascending id.
// On quota/rate-limit errors, the current key is skipped
// and the next one is tried in-flight.
// ============================================================

import { supabase } from '../lib/supabase';
import { ApiKeyServer, ApiKeyUser } from '../types';

// In-memory cursor for key rotation
let currentKeyId: number | null = null;

/**
 * Fetch the next active API key from `apisv`, cycling round-robin.
 * Returns null if no active keys exist.
 */
export async function getNextApiKey(): Promise<ApiKeyServer | null> {
  const { data: keys, error } = await supabase
    .from('apisv')
    .select('*')
    .eq('is_active', true)
    .order('id', { ascending: true });

  if (error || !keys || keys.length === 0) {
    console.error('[KeyRotation] No active keys in apisv:', error?.message);
    return null;
  }

  // If we have no cursor, start at the first key
  if (currentKeyId === null) {
    currentKeyId = keys[0].id;
    return keys[0] as ApiKeyServer;
  }

  // Find the index of the current key
  const idx = keys.findIndex((k) => k.id === currentKeyId);

  // Advance to next key, wrapping around
  const nextIdx = (idx + 1) % keys.length;
  const nextKey = keys[nextIdx] as ApiKeyServer;
  currentKeyId = nextKey.id;
  return nextKey;
}

/**
 * Get the next key after a specific key id (for in-flight failover).
 * Used when a key fails mid-request.
 */
export async function getNextApiKeyAfter(failedId: number): Promise<ApiKeyServer | null> {
  const { data: keys, error } = await supabase
    .from('apisv')
    .select('*')
    .eq('is_active', true)
    .order('id', { ascending: true });

  if (error || !keys || keys.length === 0) return null;

  const idx = keys.findIndex((k) => k.id === failedId);
  const nextIdx = (idx + 1) % keys.length;
  const nextKey = keys[nextIdx] as ApiKeyServer;

  // Don't cycle to the same key if there's only 1
  if (nextKey.id === failedId) return null;

  currentKeyId = nextKey.id;
  return nextKey;
}

/**
 * Mark a key as having failed (quota/rate-limit error).
 * Updates last_error timestamp. Optionally deactivates if permanent failure.
 */
export async function markKeyFailure(id: number, error: string, deactivate = false): Promise<void> {
  const update: Partial<ApiKeyServer> = { last_error: error };
  if (deactivate) update.is_active = false;

  const { error: dbErr } = await supabase
    .from('apisv')
    .update(update)
    .eq('id', id);

  if (dbErr) {
    console.error('[KeyRotation] Failed to mark key failure:', dbErr.message);
  } else {
    console.warn(`[KeyRotation] Key id=${id} error recorded. Deactivated=${deactivate}`);
  }
}

/**
 * Mark a key as successfully used, updating last_used_at.
 */
export async function markKeyUsed(id: number): Promise<void> {
  const { error } = await supabase
    .from('apisv')
    .update({ last_used_at: new Date().toISOString(), last_error: null })
    .eq('id', id);

  if (error) {
    console.error('[KeyRotation] Failed to mark key used:', error.message);
  }
}

/**
 * Sync keys from a user's `apius` table into the server `apisv` pool.
 * Called by admin action or background sync.
 */
export async function syncApiSvFromUserKeys(username?: string): Promise<{ added: number; skipped: number }> {
  let query = supabase.from('apius').select('*').eq('is_active', true);
  if (username) query = query.eq('username', username);

  const { data: userKeys, error } = await query;
  if (error || !userKeys) {
    console.error('[KeyRotation] Failed to fetch user keys:', error?.message);
    return { added: 0, skipped: 0 };
  }

  // Get existing keys in apisv to avoid duplicates
  const { data: existingKeys } = await supabase.from('apisv').select('api_key');
  const existingSet = new Set((existingKeys || []).map((k) => k.api_key));

  let added = 0;
  let skipped = 0;

  for (const userKey of userKeys as ApiKeyUser[]) {
    if (existingSet.has(userKey.api_key)) {
      skipped++;
      continue;
    }

    const { error: insertErr } = await supabase.from('apisv').insert({
      api_key: userKey.api_key,
      source_username: userKey.username,
      is_active: true,
    });

    if (insertErr) {
      console.error(`[KeyRotation] Failed to insert key for ${userKey.username}:`, insertErr.message);
    } else {
      added++;
    }
  }

  console.log(`[KeyRotation] Sync done. Added=${added} Skipped=${skipped}`);
  return { added, skipped };
}

/**
 * Helper: call an AI API function with automatic key rotation on failure.
 * fn receives an api_key string and should throw on quota/rate errors.
 */
export async function withKeyRotation<T>(
  fn: (apiKey: string, keyId: number) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | null = null;
  let failedId: number | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const keyEntry: ApiKeyServer | null = failedId
      ? await getNextApiKeyAfter(failedId)
      : await getNextApiKey();

    if (!keyEntry) {
      // Try the fallback env key
      const fallback = process.env.GEMINI_API_KEY;
      if (fallback && attempt === 0) {
        try {
          return await fn(fallback, -1);
        } catch (e) {
          lastError = e as Error;
          continue;
        }
      }
      throw new Error('[KeyRotation] No API keys available. Please add keys to apisv or set GEMINI_API_KEY.');
    }

    try {
      const result = await fn(keyEntry.api_key, keyEntry.id);
      await markKeyUsed(keyEntry.id);
      return result;
    } catch (e: unknown) {
      const errMsg = (e as Error).message || '';
      const isQuotaError =
        errMsg.includes('quota') ||
        errMsg.includes('exhausted') ||
        errMsg.includes('rate') ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED');

      if (isQuotaError) {
        console.warn(`[KeyRotation] Key id=${keyEntry.id} hit quota error. Rotating...`);
        await markKeyFailure(keyEntry.id, errMsg);
        failedId = keyEntry.id;
        lastError = e as Error;
        continue;
      }

      // Non-quota error — don't rotate, surface the error
      await markKeyFailure(keyEntry.id, errMsg);
      throw e;
    }
  }

  throw lastError || new Error('[KeyRotation] Max retries exceeded');
}
