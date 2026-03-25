// AUTH PAGE — Login / Register
// No max-length limits on username/password fields
// Empty password is allowed per spec
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { authApi } from '../services/api';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const navigate = useNavigate();
  const { setAuth, addNotification } = useGameStore();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) { setError('Vui lòng nhập username.'); return; }
    setLoading(true);
    setError('');

    try {
      const res = mode === 'login'
        ? await authApi.login(username, pass)
        : await authApi.register(username, pass);

      setAuth({ token: res.token, username: res.username, isAdmin: res.is_admin });
      addNotification(`Chào mừng, ${res.username}!`, 'gold');
      navigate('/servers');
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 30%, rgba(200,145,42,0.05) 0%, #000 70%)',
      padding: 20,
    }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: '2.5rem', letterSpacing: '0.15em', textShadow: '0 0 30px rgba(200,145,42,0.4)' }}>
          洪荒
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, letterSpacing: '0.2em', marginTop: 4 }}>
          THIÊN ĐẠO DIỄN HÓA ENGINE
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px 36px',
        width: '100%',
        maxWidth: 380,
        boxShadow: 'var(--shadow-deep), var(--shadow-gold)',
      }}>
        {/* Mode Tabs */}
        <div style={{ display: 'flex', marginBottom: 24, borderBottom: '1px solid var(--border-dim)' }}>
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              id={`auth-tab-${m}`}
              onClick={() => { setMode(m); setError(''); }}
              style={{
                flex: 1,
                padding: '10px 0',
                background: 'none',
                border: 'none',
                borderBottom: mode === m ? '2px solid var(--gold-bright)' : '2px solid transparent',
                color: mode === m ? 'var(--gold-bright)' : 'var(--text-dim)',
                fontFamily: 'var(--font-serif)',
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.2s',
                letterSpacing: '0.05em',
              }}
            >
              {m === 'login' ? '⚔ Đăng Nhập' : '✦ Tạo Tài Khoản'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Tên Người Dùng
            </label>
            {/* NO maxLength per spec */}
            <input
              id="auth-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên..."
              autoComplete="username"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>Mật Khẩu</span>
              <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>(Có thể để trống)</span>
            </label>
            {/* NO maxLength, empty password allowed per spec */}
            <input
              id="auth-password"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Mật khẩu (tùy chọn)..."
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              style={{ width: '100%' }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(139,26,26,0.3)',
              border: '1px solid var(--red-blood)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              color: 'var(--text-danger)',
              fontSize: 13,
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Submit */}
          <button
            id="auth-submit-btn"
            type="submit"
            className="btn btn-gold"
            disabled={loading}
            style={{ marginTop: 8, fontSize: 15, padding: '10px' }}
          >
            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> :
              mode === 'login' ? '踏入洪荒 →' : '创造 →'}
          </button>
        </form>

        {/* Footer note */}
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 20 }}>
          Bằng cách tiếp tục, bạn xác nhận đã đồng ý với điều khoản dịch vụ.
        </p>
      </div>
    </div>
  );
}
