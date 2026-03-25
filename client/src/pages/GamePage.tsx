// MAIN GAME PAGE
// Header with hamburger, location, realm button, stats panel, admin button
// Bottom: action input, RPG log feed
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { gameApi } from '../services/api';
import StatsPanel from '../components/StatsPanel';
import AdminPanel from '../components/AdminPanel';

export default function GamePage() {
  const navigate = useNavigate();
  const {
    activeCharacter, auth, chatLog, addChatMessage, isLoading, setIsLoading,
    showStatsPanel, setShowStatsPanel, showAdminPanel, setShowAdminPanel,
    worldEventFeed, addNotification, logout,
  } = useGameStore();

  const [action, setAction] = useState('');
  const [location, setLocation] = useState('Bí Cảnh Hoang Vu');
  const [showFeed, setShowFeed] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll log to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  if (!activeCharacter) {
    navigate('/servers');
    return null;
  }

  const handleSubmit = async () => {
    const trimmed = action.trim();
    if (!trimmed || isLoading) return;

    setAction('');
    addChatMessage({ role: 'user', content: trimmed, timestamp: new Date().toISOString() });
    setIsLoading(true);

    try {
      const res = await gameApi.submitAction({
        character_id: activeCharacter.character_id,
        action: trimmed,
        chat_history: chatLog.slice(-20),
      });

      const narrative = res.narrative;
      const nsfwPart = res.nsfw_narrative ? `\n\n${res.nsfw_narrative}` : '';
      const fullContent = narrative + nsfwPart;

      addChatMessage({
        role: 'assistant',
        content: fullContent,
        follow_up_options: res.follow_up_options ?? [],
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      addChatMessage({
        role: 'assistant',
        content: `⚠ Lỗi: ${(err as Error).message}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const realmPercent = Math.min(100, Math.max(0, activeCharacter.realm_progress ?? 0));
  const isDead = activeCharacter.is_dead;

  return (
    <div style={{
      height: '100vh',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* ---- HEADER ---- */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 14px',
        borderBottom: '1px solid var(--border-dim)',
        background: 'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
        flexShrink: 0,
      }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            id="header-menu-btn"
            className="btn btn-ghost"
            onClick={() => setShowFeed(!showFeed)}
            style={{ padding: '4px 8px', fontSize: 16 }}
          >
            ☰
          </button>
          <button
            id="header-castle-btn"
            className="btn btn-ghost"
            onClick={() => navigate('/servers')}
            style={{ padding: '4px 8px', fontSize: 14 }}
          >
            🏯
          </button>
          <span style={{ color: 'var(--text-dim)', fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📍 {location}
          </span>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {auth.isAdmin && (
            <button
              id="header-admin-btn"
              className="btn btn-danger"
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              ⚒ Admin
            </button>
          )}
          <button
            id="header-realm-btn"
            className="btn btn-ghost"
            onClick={() => { setShowStatsPanel(true); useGameStore.setState({ statsTab: 'realm' }); }}
            style={{ padding: '4px 8px', fontSize: 14 }}
            title="Cảnh Giới"
          >
            🧘
          </button>
          <button
            id="header-stats-btn"
            className="btn btn-ghost"
            onClick={() => setShowStatsPanel(!showStatsPanel)}
            style={{ padding: '4px 8px', fontSize: 14 }}
            title="Chỉ Số"
          >
            📊
          </button>
        </div>
      </div>

      {/* ---- REALM BAR (under header) ---- */}
      <div style={{ padding: '4px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>
          <span>
            {isDead ? '☠ ĐÃ TỬ VONG' : activeCharacter.realm} — {activeCharacter.name}
          </span>
          <span>{realmPercent.toFixed(0)}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{
              width: `${realmPercent}%`,
              background: isDead ? 'var(--red-blood)' : undefined,
            }}
          />
        </div>
      </div>

      {/* ---- CHAT LOG ---- */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {chatLog.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 40 }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--gold-dim)', marginBottom: 8 }}>洪荒</p>
            <p>Thiên đạo vô tình, vạn linh tự độ.</p>
            <p>Hãy nhập hành động của bạn bên dưới...</p>
          </div>
        )}

        {chatLog.map((msg, i) => (
          <div
            key={i}
            className="animate-fade-in"
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '92%',
            }}
          >
            {msg.role === 'user' ? (
              <div style={{
                background: 'rgba(200,145,42,0.12)',
                border: '1px solid var(--border)',
                borderRadius: '12px 12px 2px 12px',
                padding: '8px 14px',
                color: 'var(--text-primary)',
                fontSize: 14,
              }}>
                {msg.content}
              </div>
            ) : (
              <div>
                <div style={{
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-dim)',
                  borderRadius: '2px 12px 12px 12px',
                  padding: '14px 18px',
                  fontFamily: 'var(--font-serif)',
                  fontSize: 15,
                  lineHeight: 1.9,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                </div>
                {/* Follow-up options */}
                {msg.follow_up_options && msg.follow_up_options.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {msg.follow_up_options.map((opt, j) => (
                      <button
                        key={j}
                        id={`followup-${i}-${j}`}
                        className="btn btn-ghost"
                        onClick={() => { setAction(opt); inputRef.current?.focus(); }}
                        style={{ fontSize: 12, padding: '4px 10px' }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div style={{ alignSelf: 'flex-start' }}>
            <div style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-dim)',
              borderRadius: '2px 12px 12px 12px',
              padding: '12px 18px',
              display: 'flex',
              gap: 6,
              alignItems: 'center',
            }}>
              <div className="spinner" style={{ width: 16, height: 16 }} />
              <span style={{ color: 'var(--text-dim)', fontSize: 13, fontFamily: 'var(--font-serif)' }}>
                Thiên Đạo đang diễn hóa...
              </span>
            </div>
          </div>
        )}

        <div ref={logEndRef} />
      </div>

      {/* ---- WORLD EVENT FEED (side panel) ---- */}
      {showFeed && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: 48,
          bottom: 0,
          width: 280,
          background: 'rgba(8,8,8,0.97)',
          border: '1px solid var(--border-dim)',
          borderLeft: 'none',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>📡 Thiên Địa Đại Sự</h3>
            <button className="btn btn-ghost" onClick={() => setShowFeed(false)} style={{ padding: '2px 6px' }}>✕</button>
          </div>
          {worldEventFeed.length === 0 && (
            <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>Chưa có sự kiện nào...</p>
          )}
          {worldEventFeed.map((evt) => (
            <div key={evt.event_id} style={{
              background: 'var(--bg-dark)',
              border: '1px solid var(--border-dim)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 10px',
              marginBottom: 6,
              fontSize: 12,
            }}>
              <span style={{ color: 'var(--text-dim)' }}>[{evt.event_type}]</span>{' '}
              <span style={{ color: 'var(--text-secondary)' }}>
                {JSON.stringify(evt.payload).slice(0, 80)}...
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ---- ACTION INPUT ---- */}
      {isDead ? (
        <div style={{
          flexShrink: 0,
          borderTop: '1px solid var(--red-blood)',
          padding: '12px 16px',
          background: 'rgba(139,26,26,0.15)',
          textAlign: 'center',
        }}>
          <p style={{ color: 'var(--text-danger)', fontFamily: 'var(--font-serif)', fontSize: 15 }}>
            ☠ Ngươi đã tử vong — {activeCharacter.death_reason ?? 'Không rõ nguyên nhân'}
          </p>
          <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>Chờ quản trị viên hồi sinh hoặc bắt đầu hành trình mới.</p>
        </div>
      ) : (
        <div style={{
          flexShrink: 0,
          borderTop: '1px solid var(--border-dim)',
          padding: '10px 14px',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
          background: 'rgba(0,0,0,0.95)',
        }}>
          <textarea
            ref={inputRef}
            id="game-action-input"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập hành động của bạn... (Enter để gửi, Shift+Enter xuống dòng)"
            rows={2}
            style={{
              flex: 1,
              resize: 'none',
              minHeight: 40,
              maxHeight: 120,
              fontSize: 14,
            }}
            disabled={isLoading}
          />
          <button
            id="game-submit-btn"
            className="btn btn-gold"
            onClick={handleSubmit}
            disabled={isLoading || !action.trim()}
            style={{ padding: '8px 16px', flexShrink: 0 }}
          >
            {isLoading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : '⚔'}
          </button>
        </div>
      )}

      {/* ---- STATS PANEL (slide-over) ---- */}
      {showStatsPanel && <StatsPanel />}

      {/* ---- ADMIN PANEL (slide-over) ---- */}
      {showAdminPanel && <AdminPanel />}
    </div>
  );
}
