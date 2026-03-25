// FORGING MINIGAME - Luyện Khí
import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { adminApi } from '../services/api';

const MATS = [
  { id: 'sat_thuong', name: 'Phàm Thiết', tier: 1, baseChance: 90 },
  { id: 'huyen_thiet', name: 'Huyền Thiết', tier: 2, baseChance: 70 },
  { id: 'tinh_kim', name: 'Tinh Vẫn Kim', tier: 3, baseChance: 40 },
  { id: 'can_khon_thach', name: 'Càn Khôn Hư Thạch', tier: 4, baseChance: 15 },
];

const TYPES = [
  { id: 'vu_khi', label: '⚔ Vũ Khí' },
  { id: 'ao', label: '👘 Pháp Bào' },
  { id: 'phap_bao', label: '💎 Pháp Bảo Hộ Thể' },
];

export default function ForgeMinigame({ onClose }: { onClose: () => void }) {
  const { activeCharacter, addNotification, setActiveCharacter } = useGameStore();
  const [targetType, setTargetType] = useState('vu_khi');
  const [selectedMat, setSelectedMat] = useState(MATS[0]);
  const [forging, setForging] = useState(false);
  const [result, setResult] = useState<{ success: boolean; name?: string; msg: string; glow: string } | null>(null);

  const forgeStat = (activeCharacter?.stats as Record<string, number>)?.forging ?? 0;
  const luck = activeCharacter?.luck ?? 0;

  // Calculate success rate
  const successRate = Math.min(99, selectedMat.baseChance + (forgeStat * 0.5) + (luck * 0.2));

  const handleForge = async () => {
    setForging(true);
    setResult(null);

    // Simulate delay
    await new Promise((r) => setTimeout(r, 1500));

    const roll = Math.random() * 100;
    const isSuccess = roll <= successRate;

    if (isSuccess) {
      const typeLabel = TYPES.find(t => t.id === targetType)?.label.split(' ')[1] ?? 'Khí Cụ';
      const itemName = `${selectedMat.name} ${typeLabel}`;
      setResult({
        success: true,
        name: itemName,
        msg: `Khí mang xông trời! ${itemName} xuất thế!`,
        glow: selectedMat.tier >= 3 ? 'var(--gold-bright)' : 'var(--text-primary)',
      });

      // Equip it automatically for prototype
      const char = activeCharacter!;
      const newEquip = { ...(char.equipment as object), [targetType]: { name: itemName, grade: `Bậc ${selectedMat.tier}` } };
      try {
        await adminApi.editPlayer(char.character_id, {
          equipment: newEquip,
          stats: { ...(char.stats as object), forging: forgeStat + 1 }
        });
        const updated = await adminApi.getPlayer(char.character_id);
        setActiveCharacter(updated as never);
        addNotification(`Đã trang bị ${itemName}!`, 'gold');
      } catch (e) {
        console.error(e);
      }
    } else {
      setResult({
        success: false,
        msg: 'Thất bại! Vết nứt lan dài, vật liệu vỡ vụn thành bã.',
        glow: 'var(--red-bright)',
      });
    }

    setForging(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)',
      zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--text-dim)',
        borderRadius: 'var(--radius-lg)', padding: 32, width: '100%', maxWidth: 500,
        textAlign: 'center', boxShadow: '0 0 40px rgba(100,100,100,0.2)'
      }}>
        {!result ? (
          <>
            <h2 style={{ fontSize: 24, marginBottom: 16 }}>🔨 Đúc Kiếm Khí / Luyện Bộ</h2>
            <p style={{ color: 'var(--text-dim)', marginBottom: 20 }}>Tỷ lệ thành công dựa trên Luyện Khí thuật và Khí Vận.</p>

            {/* Type */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {TYPES.map(t => (
                <button
                  key={t.id}
                  className={`btn ${targetType === t.id ? 'btn-gold' : 'btn-ghost'}`}
                  onClick={() => setTargetType(t.id)}
                  style={{ flex: 1, padding: 8, fontSize: 12 }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Material */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
              {MATS.map(m => (
                <button
                  key={m.id}
                  className={`btn ${selectedMat.id === m.id ? 'btn-gold' : 'btn-ghost'}`}
                  onClick={() => setSelectedMat(m)}
                  style={{ padding: 12 }}
                >
                  <div style={{ fontWeight: 600, color: m.tier >= 3 ? 'var(--gold-bright)' : 'inherit' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Gốc: {m.baseChance}%</div>
                </button>
              ))}
            </div>

            {/* Success Rate */}
            <div style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: 8, marginBottom: 24, border: '1px solid var(--border-dim)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Dự kiến Thành Công: </span>
              <span style={{ fontSize: 18, color: successRate >= 70 ? 'var(--jade-bright)' : successRate >= 40 ? 'var(--gold-bright)' : 'var(--text-danger)', fontWeight: 700 }}>
                {successRate.toFixed(1)}%
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }} disabled={forging}>Thoát</button>
              <button className="btn btn-gold" onClick={handleForge} disabled={forging} style={{ flex: 2, fontSize: 16 }}>
                {forging ? <span className="spinner" style={{ width: 18, height: 18 }} /> : '🔨 Đập Búa'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 28, marginBottom: 16, color: result.glow, textShadow: result.success ? `0 0 20px ${result.glow}` : 'none' }}>
              {result.success ? 'KHÍ ĐẠO HÓA LINH' : 'VỠ VỤN'}
            </h2>
            <p style={{ fontSize: 15, marginBottom: 32, color: 'var(--text-primary)' }}>{result.msg}</p>
            <button className="btn btn-ghost" onClick={() => setResult(null)} style={{ padding: '10px 32px' }}>Dọn dẹp Bệ Đúc</button>
            <button className="btn btn-gold" onClick={onClose} style={{ padding: '10px 32px', marginLeft: 12 }}>Rời Đi</button>
          </>
        )}
      </div>
    </div>
  );
}
