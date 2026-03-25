// ALCHEMY MINIGAME - Luyện Đan
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { adminApi } from '../services/api';

const INGREDIENTS = [
  { id: 'thao_duoc_1', name: 'Linh Khí Thảo', type: 'linh_thao', value: 10 },
  { id: 'thao_duoc_2', name: 'Bách Niên Huyết Sâm', type: 'linh_thao', value: 30 },
  { id: 'thao_duoc_3', name: 'Hỏa Tinh Cốc', type: 'linh_thao', value: 50 },
  { id: 'thao_duoc_4', name: 'Ngọc Cốt Quả', type: 'linh_thao', value: 80 },
];

export default function AlchemyMinigame({ onClose }: { onClose: () => void }) {
  const { activeCharacter, addNotification, setActiveCharacter } = useGameStore();
  const [phase, setPhase] = useState<'select' | 'brew' | 'result'>('select');
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
  const [temperature, setTemperature] = useState(50);
  const [progress, setProgress] = useState(0);
  const [isBrewing, setIsBrewing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; item?: string; msg: string } | null>(null);

  const tempRef = useRef(temperature);
  const progRef = useRef(progress);
  const isBrewingRef = useRef(isBrewing);

  const alchemyStat = (activeCharacter?.stats as Record<string, number>)?.alchemy ?? 0;
  const sweetSpotMin = 65 - (alchemyStat / 10);
  const sweetSpotMax = 85 + (alchemyStat / 10);

  useEffect(() => {
    tempRef.current = temperature;
    progRef.current = progress;
    isBrewingRef.current = isBrewing;
  }, [temperature, progress, isBrewing]);

  useEffect(() => {
    if (phase !== 'brew') return;

    let loop: number;
    const runAlch = () => {
      if (!isBrewingRef.current) return;

      // Temp naturally falls
      const newTemp = Math.max(0, tempRef.current - 0.5);
      setTemperature(newTemp);

      // Progress increases if in sweet spot
      if (newTemp >= sweetSpotMin && newTemp <= sweetSpotMax) {
        const newProg = Math.min(100, progRef.current + 2);
        setProgress(newProg);
        if (newProg >= 100) {
          finishBrew(true);
          return;
        }
      }

      // Overheat penalty
      if (newTemp > 95) {
        finishBrew(false, 'Nhiệt độ quá cao, nổ đan!');
        return;
      }
      // Too cold penalty
      if (newTemp < 20 && progRef.current > 0) {
        finishBrew(false, 'Hỏa hầu không đủ, kết đan thất bại!');
        return;
      }

      loop = requestAnimationFrame(() => setTimeout(runAlch, 100)); // ~10fps tick
    };

    runAlch();
    return () => cancelAnimationFrame(loop);
  }, [phase, sweetSpotMin, sweetSpotMax]);

  const pumpHeat = () => {
    if (!isBrewing) return;
    setTemperature((t) => Math.min(100, t + 10));
  };

  const finishBrew = async (success: boolean, msg?: string) => {
    setIsBrewing(false);
    setPhase('result');
    const ingredient = INGREDIENTS.find(i => i.id === selectedIngredient);

    if (success && ingredient) {
      const rewardName = ingredient.value >= 50 ? 'Thiên Địa Đan' : 'Tụ Khí Đan';
      setResult({ success: true, item: rewardName, msg: `Luyện chế thành công [${rewardName}]!` });

      // Add to inventory
      const char = activeCharacter!;
      const newInv = [...(char.inventory as unknown[]), { name: rewardName, type: 'dan_duoc', quantity: 1 }];
      try {
        await adminApi.editPlayer(char.character_id, { inventory: newInv, stats: { ...(char.stats as object), alchemy: alchemyStat + 1 } });
        const updated = await adminApi.getPlayer(char.character_id);
        setActiveCharacter(updated as never);
        addNotification(`Nhận được 1x ${rewardName}`, 'gold');
      } catch (e) {
        console.error(e);
      }
    } else {
      setResult({ success: false, msg: msg ?? 'Luyện đan thất bại, dược liệu hóa thành tro bụi.' });
    }
  };

  const startBrew = () => {
    if (!selectedIngredient) return;
    setPhase('brew');
    setProgress(0);
    setTemperature(50);
    setIsBrewing(true);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)',
      zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--jade)',
        borderRadius: 'var(--radius-lg)', padding: 32, width: '100%', maxWidth: 500,
        textAlign: 'center', boxShadow: '0 0 40px rgba(42,139,106,0.2)'
      }}>
        {phase === 'select' && (
          <>
            <h2 style={{ fontSize: 24, marginBottom: 16, color: 'var(--jade-bright)' }}>💊 Khai Lò Luyện Đan</h2>
            <p style={{ color: 'var(--text-dim)', marginBottom: 20 }}>Chọn dược liệu để bắt đầu.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
              {INGREDIENTS.map(i => (
                <button
                  key={i.id}
                  className={`btn ${selectedIngredient === i.id ? 'btn-jade' : 'btn-ghost'}`}
                  onClick={() => setSelectedIngredient(i.id)}
                >
                  {i.name}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Thoát</button>
              <button className="btn btn-jade" onClick={startBrew} disabled={!selectedIngredient} style={{ flex: 1 }}>Khai Lò →</button>
            </div>
          </>
        )}

        {phase === 'brew' && (
          <>
            <h2 style={{ fontSize: 20, marginBottom: 24, color: 'var(--jade-bright)' }}>🔥 Chưởng Khống Hỏa Hầu</h2>

            {/* Heat Bar */}
            <div style={{ position: 'relative', height: 24, background: 'var(--bg-dark)', borderRadius: 12, marginBottom: 8, overflow: 'hidden', border: '1px solid var(--border-dim)' }}>
              {/* Sweet spot indicator */}
              <div style={{ position: 'absolute', left: `${sweetSpotMin}%`, width: `${sweetSpotMax - sweetSpotMin}%`, height: '100%', background: 'rgba(42,139,106,0.4)' }} />
              {/* Current temp */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${temperature}%`, background: temperature > 95 ? 'var(--red-bright)' : 'var(--gold-bright)', transition: 'width 0.1s' }} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 24 }}>Hỏa Hầu: Hãy giữ vạch nhiệt độ nằm trong vùng xanh ngọc.</p>

            {/* Progress Bar */}
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, textAlign: 'left' }}>Tiến độ ngưng đan:</p>
            <div className="progress-bar" style={{ height: 12, marginBottom: 32 }}>
              <div className="progress-bar-fill" style={{ width: `${progress}%`, background: 'var(--jade-bright)', transition: 'width 0.1s' }} />
            </div>

            <button
              className="btn btn-danger"
              onMouseDown={pumpHeat}
              onTouchStart={(e) => { e.preventDefault(); pumpHeat(); }}
              style={{ width: 120, height: 120, borderRadius: '50%', fontSize: 24, userSelect: 'none', boxShadow: '0 0 20px rgba(200,34,34,0.4)', alignSelf: 'center' }}
            >
              🔥 Bơm Lửa
            </button>
          </>
        )}

        {phase === 'result' && result && (
          <>
            <h2 style={{ fontSize: 28, marginBottom: 16, color: result.success ? 'var(--jade-bright)' : 'var(--red-bright)' }}>
              {result.success ? 'Đan Thành Hóa Hình' : 'Lò Nổ Đan Phá'}
            </h2>
            <p style={{ fontSize: 16, marginBottom: 24 }}>{result.msg}</p>
            <button className="btn btn-jade" onClick={onClose} style={{ padding: '10px 32px' }}>Dọn Dẹp</button>
          </>
        )}
      </div>
    </div>
  );
}
