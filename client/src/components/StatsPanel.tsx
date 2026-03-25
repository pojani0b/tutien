// STATS PANEL — Slide-over with tabs
import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { gameApi } from '../services/api';
import BreakthroughMinigame from '../minigames/BreakthroughMinigame';

const TABS = [
  { id: 'realm', label: '⚡ Cảnh Giới' },
  { id: 'relations', label: '❤ Quan Hệ' },
  { id: 'inventory', label: '🎒 Balo' },
  { id: 'equipment', label: '⚔ Trang Bị' },
  { id: 'ranking', label: '🏆 Bảng XH' },
  { id: 'settings', label: '⚙ Cài Đặt' },
];

export default function StatsPanel() {
  const { activeCharacter, selectedServer, statsTab, setStatsTab, setShowStatsPanel } = useGameStore();
  const [rankings, setRankings] = useState<Record<string, unknown[]>>({});
  const [showBreakthrough, setShowBreakthrough] = useState(false);

  useEffect(() => {
    if (statsTab === 'ranking' && selectedServer) {
      gameApi.getRankings(selectedServer.server_id).then((data) => {
        setRankings(data as Record<string, unknown[]>);
      });
    }
  }, [statsTab, selectedServer]);

  if (!activeCharacter) return null;

  const char = activeCharacter;
  const realmPct = Math.min(100, char.realm_progress ?? 0);

  return (
    <>
      {/* Overlay */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 }}
        onClick={() => setShowStatsPanel(false)}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: Math.min(380, window.innerWidth),
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border)',
        zIndex: 301,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>{char.name}</h3>
          <button className="btn btn-ghost" onClick={() => setShowStatsPanel(false)} style={{ padding: '4px 8px' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border-dim)', flexShrink: 0 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={`stats-tab-${tab.id}`}
              onClick={() => setStatsTab(tab.id)}
              style={{
                padding: '8px 12px',
                background: 'none',
                border: 'none',
                borderBottom: statsTab === tab.id ? '2px solid var(--gold-bright)' : '2px solid transparent',
                color: statsTab === tab.id ? 'var(--gold-bright)' : 'var(--text-dim)',
                fontSize: 12,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '16px', overflow: 'auto' }}>
          {/* REALM TAB */}
          {statsTab === 'realm' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: '1.3rem', marginBottom: 4 }}>{char.realm}</h2>
                <div className="progress-bar" style={{ height: 10, marginBottom: 8 }}>
                  <div className="progress-bar-fill" style={{ width: `${realmPct}%` }} />
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{realmPct.toFixed(1)}% tu vi</p>
              </div>

              {/* Core stats */}
              {[
                ['HP', char.hp], ['MP', char.mp], ['Thọ Nguyên', char.lifespan],
                ['Căn Cơ', char.foundation], ['Khí Vận', char.luck], ['Tu Vi', char.cultivation],
              ].map(([label, val]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ color: 'var(--gold-bright)' }}>{val as number}</span>
                </div>
              ))}

              {/* Sub stats */}
              {Object.entries(char.stats ?? {}).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-dim)' }}>{key}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{val as number}</span>
                </div>
              ))}

              {/* Breakthrough button */}
              {realmPct >= 100 && (
                <button
                  id="breakthrough-btn"
                  className="btn btn-gold animate-glow"
                  onClick={() => setShowBreakthrough(true)}
                  style={{ width: '100%', marginTop: 20, fontSize: 15, padding: '12px' }}
                >
                  ⚡ Đột Phá Cảnh Giới
                </button>
              )}
            </div>
          )}

          {/* RELATIONS TAB */}
          {statsTab === 'relations' && (
            <div>
              {Object.keys(char.relations ?? {}).length === 0 ? (
                <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Chưa có quan hệ nào được ghi nhận.</p>
              ) : (
                Object.entries(char.relations ?? {}).map(([targetId, rel]) => {
                  const r = rel as { target_name: string; affection: number; trust: number; resentment: number };
                  return (
                    <div key={targetId} style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-dim)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                      marginBottom: 10,
                    }}>
                      <h4 style={{ marginBottom: 8, fontSize: 14 }}>{r.target_name}</h4>
                      <div className="progress-bar" style={{ marginBottom: 4 }}>
                        <div className="progress-bar-fill" style={{ width: `${Math.max(0, r.affection)}%`, background: 'linear-gradient(90deg, var(--jade-dim), var(--jade-bright))' }} />
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                        Hảo cảm: {r.affection} | Tin tưởng: {r.trust} | Oán hận: {r.resentment}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* INVENTORY TAB */}
          {statsTab === 'inventory' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(char.inventory ?? []).length === 0 && (
                <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Túi trống.</p>
              )}
              {(char.inventory ?? []).map((item: unknown, i) => {
                const it = item as { name: string; type: string; quantity: number; grade?: string };
                return (
                  <div key={i} style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-dim)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      <span style={{ color: 'var(--gold-bright)', fontSize: 14 }}>{it.name}</span>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11, marginLeft: 8 }}>[{it.type}]</span>
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>×{it.quantity}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* EQUIPMENT TAB */}
          {statsTab === 'equipment' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(['ao', 'quan', 'vu_khi', 'phap_bao', 'co_bao'] as const).map((slot) => {
                const item = (char.equipment as Record<string, unknown>)?.[slot] as { name: string; grade?: string } | undefined;
                return (
                  <div key={slot} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-dim)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                  }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      {slot === 'ao' ? '👘 Áo' : slot === 'quan' ? '👖 Quần' : slot === 'vu_khi' ? '⚔ Vũ Khí' : slot === 'phap_bao' ? '💎 Pháp Bảo' : '🏺 Cổ Bảo'}
                    </span>
                    {item ? (
                      <span style={{ color: 'var(--gold-bright)', fontSize: 13 }}>{item.name}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Trống</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* RANKING TAB */}
          {statsTab === 'ranking' && (
            <div>
              {Object.entries(rankings).map(([category, list]) => (
                <div key={category} style={{ marginBottom: 20 }}>
                  <h4 style={{ marginBottom: 10, color: 'var(--gold-bright)', fontSize: 13 }}>
                    {category === 'cultivation' ? '⚡ Tu Vi' :
                     category === 'battle_power' ? '⚔ Chiến Lực' :
                     category === 'luck' ? '🍀 Khí Vận' :
                     category === 'alchemy' ? '💊 Luyện Đan' :
                     '📣 Danh Vọng'}
                  </h4>
                  {(list as Array<{ name: string; [key: string]: unknown }>).map((entry, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      padding: '5px 0',
                      borderBottom: '1px solid var(--border-dim)',
                    }}>
                      <span style={{ color: i < 3 ? 'var(--gold-bright)' : 'var(--text-secondary)' }}>
                        #{i + 1} {entry.name}
                      </span>
                      <span style={{ color: 'var(--text-dim)' }}>
                        {Object.values(entry).find((v) => typeof v === 'number') as number}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* SETTINGS TAB */}
          {statsTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Chế độ NSFW</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className={`badge ${char.NSFW_enabled ? 'badge-danger' : 'badge-gold'}`}>
                    {char.NSFW_enabled ? `Bật (Cấp ${char.NSFW_level})` : 'Tắt'}
                  </span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>API Keys</label>
                <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Quản lý trong màn hình chọn server → AI Settings</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Breakthrough minigame */}
      {showBreakthrough && (
        <BreakthroughMinigame onClose={() => setShowBreakthrough(false)} />
      )}
    </>
  );
}
