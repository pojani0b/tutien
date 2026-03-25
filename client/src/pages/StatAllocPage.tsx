// STAT ALLOCATION PAGE
// Distribute roll points into căn cơ, khí vận, sub-stats
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { gameApi } from '../services/api';

type TierQuality = 'phe_vat' | 'thuong_nhan' | 'thien_tai' | 'ki_tai' | 'yeu_niet';

const TIER_CAPS: Record<TierQuality, number> = {
  phe_vat: 17,
  thuong_nhan: 35,
  thien_tai: 45,
  ki_tai: 59,
  yeu_niet: Infinity,
};

const QUALITY_LABELS: Array<{ min: number; max: number; label: string; color: string }> = [
  { min: 0, max: 17, label: 'Phế Vật', color: '#555' },
  { min: 18, max: 35, label: 'Thường Nhân', color: 'var(--text-primary)' },
  { min: 36, max: 45, label: 'Thiên Tài', color: 'var(--jade-bright)' },
  { min: 46, max: 59, label: 'Kỳ Tài', color: 'var(--gold-bright)' },
  { min: 60, max: Infinity, label: 'Yêu Nghiệt Trấn Áp 1 Thời Đại', color: '#ff4400' },
];

function getQualityLabel(val: number) {
  return QUALITY_LABELS.find((q) => val >= q.min && val <= q.max) ?? QUALITY_LABELS[0];
}

export default function StatAllocPage() {
  const navigate = useNavigate();
  const { auth, setActiveCharacter, addNotification, hasCode161982 } = useGameStore();

  const pending = JSON.parse(sessionStorage.getItem('pending_character') ?? '{}');
  const totalPoints: number = pending.totalRollPoints ?? 30;
  const topTierFromRolls: TierQuality = (() => {
    const rolls = (pending.rollResults ?? []) as Array<{ tier: TierQuality }>;
    const tierPriority: TierQuality[] = ['yeu_niet', 'ki_tai', 'thien_tai', 'thuong_nhan', 'phe_vat'];
    for (const tp of tierPriority) {
      if (rolls.some((r) => r.tier === tp)) return tp;
    }
    return 'phe_vat';
  })();

  const cap = hasCode161982 ? Infinity : TIER_CAPS[topTierFromRolls];

  const [foundation, setFoundation] = useState(0); // Căn Cơ
  const [luck, setLuck] = useState(0);             // Khí Vận
  const [subStats, setSubStats] = useState({
    attack: 0, defense: 0, speed: 0, perception: 0, charm: 0, alchemy: 0, forging: 0,
  });
  const [loading, setLoading] = useState(false);

  const used = foundation + luck + Object.values(subStats).reduce((s, v) => s + v, 0);
  const remaining = hasCode161982 ? Infinity : totalPoints - used;

  const setFoundationSafe = (v: number) => {
    if (v < 0) return;
    if (!hasCode161982 && v > cap) return;
    if (!hasCode161982 && v - foundation > remaining) return;
    setFoundation(v);
  };

  const setLuckSafe = (v: number) => {
    if (v < 0) return;
    if (!hasCode161982 && v > cap) return;
    if (!hasCode161982 && v - luck > remaining) return;
    setLuck(v);
  };

  const setSubStat = (key: string, v: number) => {
    const delta = v - (subStats[key as keyof typeof subStats] ?? 0);
    if (v < 0) return;
    if (!hasCode161982 && v > cap) return;
    if (!hasCode161982 && delta > remaining) return;
    setSubStats((prev) => ({ ...prev, [key]: v }));
  };

  const foundationQuality = getQualityLabel(foundation);
  const luckQuality = getQualityLabel(luck);

  const handleConfirm = async () => {
    if (!pending.character) return;
    setLoading(true);
    try {
      const body = {
        server_id: pending.server_id,
        slot_index: pending.slot_index,
        save_name: pending.save_name,
        character: {
          ...pending.character,
          foundation,
          luck,
          stats: {
            ...subStats,
            battle_power: foundation + luck + Object.values(subStats).reduce((s, v) => s + v, 0),
          },
        },
      };

      const result = await gameApi.createCharacter(body);
      const characterId = (result as { character_id: string }).character_id;

      // Fetch state and enter game
      const state = await gameApi.getState(characterId);
      const char = (state as { character: unknown }).character as Record<string, unknown>;
      setActiveCharacter(char as never);
      addNotification(`Nhân vật ${pending.character.name} đã được tạo!`, 'gold');
      sessionStorage.removeItem('pending_character');
      navigate('/game');
    } catch (err: unknown) {
      addNotification((err as Error).message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const StatRow = ({ label, key, val, set }: { label: string; key: string; val: number; set: (v: number) => void }) => {
    const quality = getQualityLabel(val);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ width: 110, fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>{label}</span>
        <button className="btn btn-ghost" onClick={() => set(val - 1)} style={{ padding: '4px 10px', fontSize: 16 }}>−</button>
        <span style={{ width: 40, textAlign: 'center', color: quality.color, fontWeight: 700 }}>{val}</span>
        <button className="btn btn-ghost" onClick={() => set(val + 1)} style={{ padding: '4px 10px', fontSize: 16 }}>+</button>
        <span style={{ fontSize: 11, color: quality.color, flex: 1 }}>{quality.label}</span>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000', padding: '24px 20px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0 }}>⚖ Phân Bổ Chỉ Số</h2>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>Điểm còn lại</p>
            <p style={{ color: 'var(--gold-bright)', fontSize: 22, fontWeight: 700, margin: 0 }}>
              {hasCode161982 ? '∞' : remaining}
            </p>
          </div>
        </div>

        {/* Quality thresholds */}
        <div style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-dim)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          marginBottom: 20,
          fontSize: 12,
        }}>
          <p style={{ color: 'var(--text-dim)', marginBottom: 6 }}>Mốc điểm cảnh giới chỉ số:</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {QUALITY_LABELS.map((q) => (
              <span key={q.label} style={{ color: q.color }}>
                {q.max === Infinity ? `${q.min}+` : `${q.min}–${q.max}`}: {q.label}
              </span>
            ))}
          </div>
          {!hasCode161982 && (
            <p style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 6 }}>
              Giới hạn mỗi mục theo tầng roll cao nhất của bạn ({topTierFromRolls}): ≤ {cap === Infinity ? '∞' : cap}
            </p>
          )}
        </div>

        {/* Core stats */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, marginBottom: 12, color: 'var(--text-secondary)' }}>Chỉ Số Căn Bản</h3>
          <StatRow label="Căn Cơ (Foundation)" key="foundation" val={foundation} set={setFoundationSafe} />
          <StatRow label="Khí Vận (Luck)" key="luck" val={luck} set={setLuckSafe} />
        </div>

        {/* Sub stats */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, marginBottom: 12, color: 'var(--text-secondary)' }}>Chỉ Số Phụ</h3>
          {Object.entries(subStats).map(([key, val]) => (
            <StatRow
              key={key}
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              key={key}
              val={val}
              set={(v) => setSubStat(key, v)}
            />
          ))}
        </div>

        {/* Confirm */}
        <button
          id="alloc-confirm-btn"
          className="btn btn-gold"
          onClick={handleConfirm}
          disabled={loading}
          style={{ width: '100%', padding: '12px', fontSize: 15 }}
        >
          {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : '⚔ Bước Vào Hồng Hoang →'}
        </button>
      </div>
    </div>
  );
}
