// ADMIN PANEL — Full admin control interface
import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { adminApi } from '../services/api';

export default function AdminPanel() {
  const { setShowAdminPanel, selectedServer, addNotification } = useGameStore();
  const [tab, setTab] = useState<'players' | 'broadcast' | 'entity' | 'logs'>('players');
  const [searchQ, setSearchQ] = useState('');
  const [players, setPlayers] = useState<Array<{ character_id: string; name: string; username: string; realm: string; is_dead: boolean }>>([]);
  const [selectedChar, setSelectedChar] = useState<Record<string, unknown> | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [logs, setLogs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  const searchPlayers = async () => {
    const res = await adminApi.searchPlayers(searchQ, selectedServer?.server_id);
    setPlayers(res as typeof players);
  };

  const loadChar = async (charId: string) => {
    const data = await adminApi.getPlayer(charId);
    setSelectedChar(data as Record<string, unknown>);
  };

  const saveChar = async () => {
    if (!selectedChar) return;
    setLoading(true);
    try {
      await adminApi.editPlayer(selectedChar.character_id as string, selectedChar);
      addNotification('Đã lưu chỉnh sửa nhân vật.', 'gold');
    } catch (e: unknown) { addNotification((e as Error).message, 'danger'); }
    finally { setLoading(false); }
  };

  const sendBroadcast = async () => {
    if (!selectedServer || !broadcastMsg.trim()) return;
    await adminApi.broadcast(selectedServer.server_id, broadcastMsg);
    addNotification('Đã phát sóng thông báo.', 'gold');
    setBroadcastMsg('');
  };

  const loadLogs = async () => {
    const data = await adminApi.getLogs();
    setLogs(data);
  };

  const adminAction = async (action: string, args: unknown[] = []) => {
    if (!selectedChar) return;
    setLoading(true);
    try {
      switch (action) {
        case 'revive': await adminApi.revive(selectedChar.character_id as string, 100, selectedChar.server_id as string); addNotification('Đã hồi sinh nhân vật.', 'gold'); break;
        case 'permadeath': await adminApi.permadeath(selectedChar.character_id as string, 'Admin permadeath', selectedChar.server_id as string); addNotification('Permadeath thực thi.', 'danger'); break;
        case 'god_on': await adminApi.setGodMode(selectedChar.character_id as string, true); addNotification('God mode BẬT.', 'gold'); break;
        case 'god_off': await adminApi.setGodMode(selectedChar.character_id as string, false); addNotification('God mode TẮT.', 'info'); break;
        case 'teleport': { const loc = prompt('Địa điểm đến:') ?? ''; if (loc) { await adminApi.teleport(selectedChar.character_id as string, loc); addNotification(`Đã teleport tới ${loc}.`, 'gold'); } break; }
        case 'gift_cultivation': { const v = parseInt(prompt('Số tu vi cộng:') ?? '0') || 0; await adminApi.gift(selectedChar.character_id as string, 'cultivation', v); addNotification(`Đã tặng ${v} tu vi.`, 'gold'); break; }
        case 'ban_user': { const r = prompt('Lý do ban:') ?? 'Vi phạm'; await adminApi.ban(selectedChar.username as string, r); addNotification(`Đã ban ${selectedChar.username}.`, 'danger'); break; }
        case 'unban_user': await adminApi.unban(selectedChar.username as string); addNotification(`Đã unban ${selectedChar.username}.`, 'gold'); break;
      }
      await loadChar(selectedChar.character_id as string);
    } catch (e: unknown) { addNotification((e as Error).message, 'danger'); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400 }} onClick={() => setShowAdminPanel(false)} />
      <div style={{
        position: 'fixed',
        left: 0, top: 0, bottom: 0,
        width: Math.min(420, window.innerWidth),
        background: '#0a0505',
        border: '1px solid var(--red-blood)',
        borderLeft: 'none',
        zIndex: 401,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--red-blood)', display: 'flex', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, color: 'var(--text-danger)', fontSize: 15 }}>⚒ Admin Panel</h3>
          <button className="btn btn-ghost" onClick={() => setShowAdminPanel(false)} style={{ padding: '2px 8px' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(139,26,26,0.3)' }}>
          {(['players', 'broadcast', 'entity', 'logs'] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); if (t === 'logs') loadLogs(); }} style={{
              flex: 1, padding: '8px 4px', background: 'none', border: 'none',
              borderBottom: tab === t ? '2px solid var(--red-bright)' : '2px solid transparent',
              color: tab === t ? 'var(--text-danger)' : 'var(--text-dim)', fontSize: 11, cursor: 'pointer',
            }}>
              {t === 'players' ? '👤 Người chơi' : t === 'broadcast' ? '📣 Broadcast' : t === 'entity' ? '🌐 Entity' : '📋 Logs'}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {/* PLAYERS */}
          {tab === 'players' && (
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <input id="admin-search-input" value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Tên nhân vật..." style={{ flex: 1, fontSize: 12 }}
                  onKeyDown={(e) => e.key === 'Enter' && searchPlayers()} />
                <button className="btn btn-danger" onClick={searchPlayers} style={{ fontSize: 12, padding: '6px 12px' }}>Tìm</button>
              </div>

              {/* Player list */}
              {players.map((p) => (
                <div key={p.character_id} onClick={() => loadChar(p.character_id)}
                  style={{
                    background: selectedChar?.character_id === p.character_id ? 'rgba(139,26,26,0.2)' : 'var(--bg-dark)',
                    border: `1px solid ${selectedChar?.character_id === p.character_id ? 'var(--red-blood)' : 'var(--border-dim)'}`,
                    borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginBottom: 6, cursor: 'pointer',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: p.is_dead ? 'var(--text-danger)' : 'var(--text-primary)', fontSize: 13 }}>
                      {p.is_dead ? '☠ ' : ''}{p.name}
                    </span>
                    <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>{p.realm}</span>
                  </div>
                  <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>{p.username}</span>
                </div>
              ))}

              {/* Selected char detail */}
              {selectedChar && (
                <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--red-blood)', borderRadius: 'var(--radius-md)', padding: 14, marginTop: 12 }}>
                  <h4 style={{ color: 'var(--text-danger)', marginBottom: 12, fontSize: 14 }}>
                    ⚒ {selectedChar.name as string}
                  </h4>

                  {/* Quick edit fields */}
                  {(['cultivation', 'hp', 'mp', 'lifespan', 'luck', 'foundation'] as const).map((field) => (
                    <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <label style={{ width: 90, fontSize: 12, color: 'var(--text-secondary)' }}>{field}</label>
                      <input
                        id={`admin-edit-${field}`}
                        type="number"
                        value={(selectedChar[field] as number) ?? 0}
                        onChange={(e) => setSelectedChar((prev) => prev ? { ...prev, [field]: parseInt(e.target.value) } : null)}
                        style={{ width: 90, fontSize: 12, padding: '4px 8px' }}
                      />
                    </div>
                  ))}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <button id="admin-save-btn" className="btn btn-danger" onClick={saveChar} disabled={loading} style={{ fontSize: 12 }}>
                      {loading ? '...' : '💾 Lưu'}
                    </button>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      { label: '✅ Revive', action: 'revive' },
                      { label: '☠ Permadeath', action: 'permadeath' },
                      { label: '⚡ God ON', action: 'god_on' },
                      { label: '🔒 God OFF', action: 'god_off' },
                      { label: '🚀 Teleport', action: 'teleport' },
                      { label: '🎁 Tặng Tu Vi', action: 'gift_cultivation' },
                      { label: '🔨 Ban', action: 'ban_user' },
                      { label: '🔓 Unban', action: 'unban_user' },
                    ].map((btn) => (
                      <button key={btn.action} className="btn btn-ghost"
                        onClick={() => adminAction(btn.action)}
                        style={{ fontSize: 11, padding: '4px 10px' }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BROADCAST */}
          {tab === 'broadcast' && (
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Gửi thông báo toàn server
              </label>
              <textarea
                id="admin-broadcast-input"
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                placeholder="Nội dung thông báo..."
                rows={4}
                style={{ width: '100%', marginBottom: 10, resize: 'vertical' }}
              />
              <button id="admin-broadcast-btn" className="btn btn-danger" onClick={sendBroadcast} style={{ width: '100%' }}>
                📣 Phát Sóng
              </button>
            </div>
          )}

          {/* ENTITY */}
          {tab === 'entity' && (
            <div>
              <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 12 }}>Spawn / Remove Entity trên server</p>
              <button className="btn btn-ghost" style={{ width: '100%', marginBottom: 8, fontSize: 13 }}
                onClick={async () => {
                  const name = prompt('Tên entity:') ?? '';
                  const type = prompt('Loại (opportunity/territory/faction/npc):') ?? 'npc';
                  if (name && selectedServer) {
                    await adminApi.spawnEntity({ server_id: selectedServer.server_id, entity_type: type, name, state: {} });
                    addNotification(`Đã spawn ${name}.`, 'gold');
                  }
                }}
              >
                ➕ Spawn Entity
              </button>
              <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                Để remove entity: nhập entity_id vào console hoặc dùng API trực tiếp. UI chi tiết hơn sẽ được thêm trong bản tiếp theo.
              </p>
            </div>
          )}

          {/* LOGS */}
          {tab === 'logs' && (
            <div>
              {(logs as Array<{ id: string; action_type: string; admin_username: string; target_type: string; target_id: string; created_at: string }>).map((log) => (
                <div key={log.id} style={{
                  background: 'var(--bg-dark)', border: '1px solid var(--border-dim)',
                  borderRadius: 'var(--radius-sm)', padding: '8px 10px', marginBottom: 6, fontSize: 11,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-danger)' }}>[{log.action_type}]</span>
                    <span style={{ color: 'var(--text-dim)' }}>{new Date(log.created_at).toLocaleString('vi-VN')}</span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {log.admin_username} → {log.target_type}: {log.target_id.slice(0, 20)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
