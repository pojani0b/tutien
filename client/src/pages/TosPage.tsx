// TOS PAGE — Full-screen modal with scrollable content, checkbox, and continue button
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { tosApi } from '../services/api';

export default function TosPage() {
  const { setTosAccepted } = useGameStore();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [version, setVersion] = useState('1.0');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tosApi.get().then((data) => {
      setContent(data.content);
      setVersion(data.version);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleContinue = () => {
    if (!agreed) return;
    setTosAccepted(true);
    navigate('/auth');
  };

  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: 40, paddingBottom: 40 }}>
      <div className="modal-box" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>⚜️ Thỏa Thuận Điều Khoản Dịch Vụ</h1>
          <span className="badge badge-gold">Phiên bản {version}</span>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          background: 'var(--bg-dark)',
          border: '1px solid var(--border-dim)',
          borderRadius: 'var(--radius-md)',
          padding: '20px 24px',
          marginBottom: 20,
          fontFamily: 'var(--font-serif)',
          fontSize: '14px',
          lineHeight: '2',
          whiteSpace: 'pre-wrap',
          color: 'var(--text-primary)',
        }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <div className="spinner" />
            </div>
          ) : content || 'Đang tải điều khoản...'}
        </div>

        {/* Agreement */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          marginBottom: 20,
          color: 'var(--text-secondary)',
          fontSize: 14,
        }}>
          <input
            id="tos-agree-checkbox"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: 'var(--gold-main)', cursor: 'pointer' }}
          />
          Tôi đã đọc, hiểu và đồng ý với toàn bộ các điều khoản trên.
        </label>

        {/* Continue */}
        <button
          id="tos-continue-btn"
          className="btn btn-gold"
          onClick={handleContinue}
          disabled={!agreed}
          style={{ alignSelf: 'center', minWidth: 180, fontSize: 15 }}
        >
          Tiếp Tục →
        </button>
      </div>
    </div>
  );
}
