// ============================================================
// API SERVICE LAYER
// All calls go to the backend (never to Supabase directly)
// ============================================================

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

function getToken(): string {
  try {
    const stored = localStorage.getItem('hong-hoang-store');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.auth?.token ?? '';
    }
  } catch { /* */ }
  return '';
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Request failed');
  }

  return res.json() as Promise<T>;
}

// ---- AUTH ----
export const authApi = {
  login: (username: string, pass: string) =>
    request<{ token: string; username: string; is_admin: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, pass }),
    }),
  register: (username: string, pass: string) =>
    request<{ token: string; username: string; is_admin: boolean }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, pass }),
    }),
};

// ---- TOS ----
export const tosApi = {
  get: () => fetch(`${BASE_URL}/tos`).then((r) => r.json()) as Promise<{ content: string; version: string }>,
};

// ---- GAME ----
export const gameApi = {
  getServers: () => request<unknown[]>('/game/servers'),
  getSlots: (serverId: string) => request<unknown[]>(`/game/slots/${serverId}`),
  deleteSlot: (serverId: string, slotIndex: number) =>
    request<{ success: boolean }>(`/game/slot/${serverId}/${slotIndex}`, { method: 'DELETE' }),
  createCharacter: (body: unknown) =>
    request<{ character_id: string }>('/game/create-character', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getState: (characterId: string) => request<unknown>(`/game/state/${characterId}`),
  submitAction: (body: { character_id: string; action: string; chat_history: unknown[] }) =>
    request<{
      narrative: string;
      nsfw_narrative: string | null;
      follow_up_options: string[];
      requires_server_resolution: boolean;
      risk: unknown;
      world_event_id: string | null;
    }>('/game/action', { method: 'POST', body: JSON.stringify(body) }),
  getRankings: (serverId: string) => request<unknown>(`/game/rankings/${serverId}`),
};

// ---- AI SETTINGS ----
export const aiApi = {
  getSettings: () => request<unknown>('/ai/settings'),
  updateSettings: (body: unknown) =>
    request<unknown>('/ai/settings', { method: 'PUT', body: JSON.stringify(body) }),
  getKeys: () => request<unknown[]>('/ai/keys'),
  addKey: (api_key: string, project_label?: string) =>
    request<unknown>('/ai/keys', {
      method: 'POST',
      body: JSON.stringify({ api_key, project_label }),
    }),
  importKeys: (text: string) =>
    request<{ added: number }>('/ai/keys/import', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  exportKeys: async () => {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/ai/keys/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'api_keys.txt';
    a.click();
    URL.revokeObjectURL(url);
  },
  deleteKey: (id: string) => request<unknown>(`/ai/keys/${id}`, { method: 'DELETE' }),
  getTos: () => request<{ content: string; version: string }>('/ai/tos'),
};

// ---- ADMIN ----
export const adminApi = {
  searchPlayers: (q: string, server_id?: string) =>
    request<unknown[]>(`/admin/players?q=${q}${server_id ? `&server_id=${server_id}` : ''}`),
  getPlayer: (characterId: string) => request<unknown>(`/admin/player/${characterId}`),
  editPlayer: (characterId: string, updates: unknown) =>
    request<unknown>(`/admin/player/${characterId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  revive: (characterId: string, hp = 100, server_id: string) =>
    request<unknown>(`/admin/player/${characterId}/revive`, {
      method: 'POST',
      body: JSON.stringify({ hp, server_id }),
    }),
  permadeath: (characterId: string, reason: string, server_id: string) =>
    request<unknown>(`/admin/player/${characterId}/permadeath`, {
      method: 'POST',
      body: JSON.stringify({ reason, server_id }),
    }),
  ban: (username: string, reason: string) =>
    request<unknown>(`/admin/user/${username}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  unban: (username: string) =>
    request<unknown>(`/admin/user/${username}/unban`, { method: 'POST' }),
  setGodMode: (characterId: string, enabled: boolean) =>
    request<unknown>(`/admin/player/${characterId}/godmode`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }),
  gift: (characterId: string, type: string, value: unknown) =>
    request<unknown>(`/admin/gift/${characterId}`, {
      method: 'POST',
      body: JSON.stringify({ type, value }),
    }),
  giftAll: (serverId: string, type: string, value: unknown) =>
    request<unknown>(`/admin/gift-all/${serverId}`, {
      method: 'POST',
      body: JSON.stringify({ type, value }),
    }),
  teleport: (characterId: string, location: string) =>
    request<unknown>(`/admin/player/${characterId}/teleport`, {
      method: 'POST',
      body: JSON.stringify({ location }),
    }),
  spawnEntity: (body: unknown) =>
    request<unknown>('/admin/entity/spawn', { method: 'POST', body: JSON.stringify(body) }),
  removeEntity: (entityId: string) =>
    request<unknown>(`/admin/entity/${entityId}`, { method: 'DELETE' }),
  rollbackEvent: (eventId: string) =>
    request<unknown>(`/admin/event/${eventId}/rollback`, { method: 'POST' }),
  broadcast: (serverId: string, message: string) =>
    request<unknown>(`/admin/broadcast/${serverId}`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  setRespawn: (entityId: string, respawn_at: string) =>
    request<unknown>(`/admin/entity/${entityId}/respawn`, {
      method: 'PATCH',
      body: JSON.stringify({ respawn_at }),
    }),
  getLogs: () => request<unknown[]>('/admin/logs'),
  syncKeys: (username?: string) =>
    request<unknown>('/admin/sync-keys', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),
};
