// SERVER SELECT PAGE
// 6 swipeable server cards, AI settings panel below
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { gameApi } from '../services/api';
import AISettingsPanel from '../components/AISettingsPanel';

interface Server {
  server_id: string;
  name: string;
  era_name: string;
  world_time: number;
  status: Record<string, unknown>;
}

const SERVER_COLORS = [
  { bg: 'rgba(100,50,0,0.3)', border: 'rgba(200,100,0,0.4)', glow: 'rgba(200,100,0,0.15)' },
  { bg: 'rgba(80,0,0,0.3)', border: 'rgba(180,0,0,0.4)', glow: 'rgba(180,0,0,0.15)' },
  { bg: 'rgba(0,40,80,0.3)', border: 'rgba(0,100,200,0.4)', glow: 'rgba(0,100,200,0.15)' },
  { bg: 'rgba(50,0,80,0.3)', border: 'rgba(130,0,200,0.4)', glow: 'rgba(130,0,200,0.15)' },
  { bg: 'rgba(20,60,20,0.3)', border: 'rgba(60,160,60,0.4)', glow: 'rgba(60,160,60,0.15)' },
  { bg: 'rgba(60,40,0,0.3)', border: 'rgba(160,120,0,0.4)', glow: 'rgba(160,120,0,0.15)' },
];

export default function ServerSelectPage() {
  const navigate = useNavigate();
  const { setSelectedServer, auth, logout } = useGameStore();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const touchStartX = useRef(0);

  useEffect(() => {
    gameApi.getServers().then((data) => {
      setServers(data as Server[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSelect = (server: Server) => {
    setSelectedServer(server);
    navigate(`/server/${server.server_id}/slots`);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -50 && currentIdx < servers.length - 1) setCurrentIdx((i) => i + 1);
    else if (dx > 50 && currentIdx > 0) setCurrentIdx((i) => i - 1);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 20%, rgba(100,60,0,0.08) 0%, #000 60%)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', margin: 0 }}>⚔ Chọn Máy Chủ</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: 12, margin: 0 }}>Mỗi server là một timeline duy nhất</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setShowAI(!showAI)} style={{ fontSize: 12 }}>
            ⚙ AI Settings
          </button>
          <button className="btn btn-ghost" onClick={logout} style={{ fontSize: 12 }}>
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Server cards carousel */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div
          style={{ flex: 1, overflow: 'hidden', padding: '20px 0' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
            {servers.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                style={{
                  width: i === currentIdx ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === currentIdx ? 'var(--gold-bright)' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
              />
            ))}
          </div>

          {/* Single visible card with arrows */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 20px' }}>
            <button
              className="btn btn-ghost"
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              style={{ fontSize: 20, padding: '8px 12px' }}
            >
              ‹
            </button>

            {servers[currentIdx] && (() => {
              const s = servers[currentIdx];
              const color = SERVER_COLORS[currentIdx % SERVER_COLORS.length];
              return (
                <div
                  id={`server-card-${s.server_id}`}
                  onClick={() => handleSelect(s)}
                  className="animate-fade-in"
                  style={{
                    background: color.bg,
                    border: `1px solid ${color.border}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '40px 32px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    flex: 1,
                    maxWidth: 400,
                    boxShadow: `0 0 40px ${color.glow}`,
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <div style={{ fontSize: 40, marginBottom: 12 }}>⚔</div>
                  <h2 style={{ color: 'var(--gold-bright)', fontSize: '1.3rem', marginBottom: 6 }}>{s.name}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>{s.era_name}</p>
                  <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>Thời Gian Thế Giới: {s.world_time}</p>
                  <div style={{
                    marginTop: 20,
                    padding: '8px 20px',
                    background: color.border,
                    borderRadius: 20,
                    color: '#fff',
                    fontSize: 13,
                    display: 'inline-block',
                  }}>
                    Bước Vào →
                  </div>
                </div>
              );
            })()}

            <button
              className="btn btn-ghost"
              onClick={() => setCurrentIdx((i) => Math.min(servers.length - 1, i + 1))}
              disabled={currentIdx === servers.length - 1}
              style={{ fontSize: 20, padding: '8px 12px' }}
            >
              ›
            </button>
          </div>

          {/* Server index */}
          <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, marginTop: 16 }}>
            {currentIdx + 1} / {servers.length}
          </p>
        </div>
      )}

      {/* AI Settings Panel (collapsible below) */}
      {showAI && (
        <div style={{ borderTop: '1px solid var(--border-dim)', padding: '20px', background: 'var(--bg-deep)' }}>
          <AISettingsPanel />
        </div>
      )}
    </div>
  );
}
