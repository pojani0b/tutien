// ROLL THIÊN PHÚ PAGE
// 6 rolls with probability tiers, cumulative score
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';

type Tier = 'phe_vat' | 'thuong_nhan' | 'thien_tai' | 'ki_tai' | 'yeu_niet';

interface RollResult {
  tier: Tier;
  points: number;
}

const TIERS: Array<{
  key: Tier;
  label: string;
  min: number;
  max: number;
  chance: number;
  color: string;
  glow: string;
}> = [
  { key: 'phe_vat',    label: 'Phế Vật',                       min: 2,  max: 5,  chance: 0.30,    color: '#555',              glow: 'none' },
  { key: 'thuong_nhan',label: 'Thường Nhân',                    min: 6,  max: 12, chance: 0.45,    color: 'var(--text-primary)',glow: 'none' },
  { key: 'thien_tai',  label: 'Thiên Tài',                      min: 15, max: 25, chance: 0.10,    color: 'var(--jade-bright)', glow: '0 0 12px var(--jade)' },
  { key: 'ki_tai',     label: 'Kỳ Tài',                         min: 30, max: 50, chance: 0.04999, color: 'var(--gold-bright)', glow: '0 0 20px var(--gold-main)' },
  { key: 'yeu_niet',   label: 'Yêu Nghiệt Trấn Áp 1 Thời Đại', min: 60, max: 80, chance: 0.00001, color: '#ff4400',            glow: '0 0 30px rgba(255,68,0,0.6)' },
];

function rollOnce(): RollResult {
  const r = Math.random();
  let cumulative = 0;
  for (const tier of TIERS) {
    cumulative += tier.chance;
    if (r < cumulative) {
      const points = tier.min + Math.floor(Math.random() * (tier.max - tier.min + 1));
      return { tier: tier.key, points };
    }
  }
  return { tier: 'phe_vat', points: 2 };
}

const TIER_LABELS: Record<Tier, string> = {
  phe_vat: 'Phế Vật',
  thuong_nhan: 'Thường Nhân',
  thien_tai: 'Thiên Tài',
  ki_tai: 'Kỳ Tài',
  yeu_niet: 'Yêu Nghiệt',
};

export default function RollPage() {
  const navigate = useNavigate();
  const { hasCode161982, addNotification } = useGameStore();
  const [rolls, setRolls] = useState<RollResult[]>([]);
  const [rolling, setRolling] = useState(false);
  const [animatingIdx, setAnimatingIdx] = useState<number | null>(null);
  const maxRolls = hasCode161982 ? Infinity : 6;
  const canRoll = hasCode161982 || rolls.length < 6;

  const totalPoints = hasCode161982 ? Infinity : rolls.reduce((s, r) => s + r.points, 0);

  const tierCounts = rolls.reduce((acc, r) => {
    acc[r.tier] = (acc[r.tier] ?? 0) + 1;
    return acc;
  }, {} as Record<Tier, number>);

  const handleRoll = useCallback(() => {
    if (!canRoll || rolling) return;
    setRolling(true);
    const idx = rolls.length;
    setAnimatingIdx(idx);

    // Dramatic delay
    setTimeout(() => {
      const result = rollOnce();
      setRolls((prev) => [...prev, result]);
      setAnimatingIdx(null);
      setRolling(false);

      if (result.tier === 'yeu_niet') {
        addNotification('⚡ YÊU NGHIỆT TRẤN ÁP 1 THỜI ĐẠI ⚡', 'gold');
      } else if (result.tier === 'ki_tai') {
        addNotification('✨ Kỳ Tài ra đời!', 'gold');
      }
    }, 800);
  }, [rolls, canRoll, rolling]);

  const handleContinue = () => {
    const pending = sessionStorage.getItem('pending_character');
    if (!pending) { navigate('/servers'); return; }
    const data = JSON.parse(pending);
    data.totalRollPoints = hasCode161982 ? 999999 : totalPoints;
    data.rollResults = rolls;
    sessionStorage.setItem('pending_character', JSON.stringify(data));
    navigate('/alloc');
  };

  const getTierInfo = (tier: Tier) =>
    TIERS.find((t) => t.key === tier)!;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(200,100,0,0.08) 0%, #000 50%)',
      padding: '24px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <h2 style={{ marginBottom: 4, letterSpacing: '0.1em' }}>⚡ Roll Thiên Phú</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 32 }}>
        {hasCode161982 ? '∞ Lần roll (Code đặc biệt)' : `${rolls.length}/6 lần roll`}
      </p>

      {/* Roll button */}
      <button
        id="roll-btn"
        className="btn btn-gold animate-glow"
        onClick={handleRoll}
        disabled={!canRoll || rolling}
        style={{ fontSize: 16, padding: '14px 48px', marginBottom: 32, letterSpacing: '0.1em' }}
      >
        {rolling ? '⚡ Đang roll...' : canRoll ? '⚡ Roll !!' : '✓ Hoàn Tất'}
      </button>

      {/* Rolls list */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
        {rolls.map((r, i) => {
          const info = getTierInfo(r.tier);
          return (
            <div
              key={i}
              className="animate-fade-in"
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${info.color}33`,
                borderRadius: 'var(--radius-md)',
                padding: '10px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: info.glow,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>#{i + 1}</span>
                <span style={{ color: info.color, fontFamily: 'var(--font-serif)', fontWeight: 600 }}>
                  {info.label}
                </span>
              </div>
              <span style={{ color: info.color, fontSize: 18, fontWeight: 700 }}>+{r.points}</span>
            </div>
          );
        })}

        {rolling && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'center',
            animation: 'lightning 0.8s ease',
          }}>
            <span style={{ color: 'var(--gold-bright)' }}>⚡ ⚡ ⚡</span>
          </div>
        )}
      </div>

      {/* Stats summary */}
      {rolls.length > 0 && (
        <div style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 24px',
          width: '100%',
          maxWidth: 480,
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Tổng Điểm</span>
            <span style={{ color: 'var(--gold-bright)', fontSize: 20, fontWeight: 700 }}>
              {hasCode161982 ? '∞' : totalPoints}
            </span>
          </div>
          <div className="divider" />
          {TIERS.map((t) => tierCounts[t.key] ? (
            <div key={t.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 6 }}>
              <span style={{ color: t.color }}>{t.label}</span>
              <span style={{ color: 'var(--text-secondary)' }}>×{tierCounts[t.key]}</span>
            </div>
          ) : null)}
        </div>
      )}

      {/* Continue */}
      {(rolls.length >= 6 || hasCode161982) && rolls.length > 0 && (
        <button
          id="roll-continue-btn"
          className="btn btn-gold"
          onClick={handleContinue}
          style={{ fontSize: 15, padding: '12px 48px' }}
        >
          Phân Bổ Chỉ Số →
        </button>
      )}
    </div>
  );
}
