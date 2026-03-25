// SAVE SLOT PAGE
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { gameApi } from '../services/api';

interface SaveSlot {
  id: string;
  slot_index: 1 | 2 | 3;
  save_name?: string;
  character_json?: {
    name?: string;
    realm?: string;
    cultivation?: number;
    is_dead?: boolean;
  };
  is_deleted: boolean;
}

export default function SaveSlotPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const { selectedServer, setActiveCharacter, addNotification } = useGameStore();
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingSlot, setDeletingSlot] = useState<number | null>(null);

  const fetchSlots = () => {
    if (!serverId) return;
    setLoading(true);
    gameApi.getSlots(serverId).then((data) => {
      setSlots(data as SaveSlot[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchSlots(); }, [serverId]);

  const getSlot = (idx: 1 | 2 | 3) =>
    slots.find((s) => s.slot_index === idx && !s.is_deleted);

  const handleEnterGame = (slot: SaveSlot) => {
    if (slot.character_json) {
      setActiveCharacter({ ...slot.character_json, server_id: serverId! } as never);
      navigate('/game');
    }
  };

  const handleDeleteSlot = async (idx: number) => {
    if (!serverId) return;
    setDeletingSlot(idx);
    try {
      await gameApi.deleteSlot(serverId, idx);
      addNotification('Đã xóa save slot.', 'info');
      fetchSlots();
    } catch (err: unknown) {
      addNotification((err as Error).message, 'danger');
    } finally {
      setDeletingSlot(null);
    }
  };

  const renderSlot = (idx: 1 | 2 | 3) => {
    const slot = getSlot(idx);
    const isEmpty = !slot;

    return (
      <div
        key={idx}
        id={`save-slot-${idx}`}
        style={{
          position: 'relative',
          background: 'var(--bg-card)',
          border: `1px solid ${isEmpty ? 'var(--border-dim)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: isEmpty ? '48px 32px' : '24px 32px',
          textAlign: 'center',
          minHeight: 160,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          cursor: isEmpty ? 'pointer' : 'default',
          boxShadow: isEmpty ? 'none' : 'var(--shadow-gold)',
        }}
        onClick={isEmpty ? () => navigate(`/server/${serverId}/create/${idx}`) : undefined}
        onMouseEnter={(e) => {
          if (isEmpty) {
            e.currentTarget.style.borderColor = 'var(--gold-dim)';
            e.currentTarget.style.background = 'var(--bg-hover)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = isEmpty ? 'var(--border-dim)' : 'var(--border)';
          e.currentTarget.style.background = 'var(--bg-card)';
        }}
      >
        {/* Slot label */}
        <div style={{
          position: 'absolute',
          top: 8,
          left: 12,
          fontSize: 11,
          color: 'var(--text-dim)',
        }}>
          Slot {idx}
        </div>

        {isEmpty ? (
          <>
            <div style={{ fontSize: 36, color: 'var(--text-dim)', marginBottom: 8 }}>+</div>
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Tạo nhân vật mới</p>
          </>
        ) : (
          <>
            {/* Delete button at top right */}
            <button
              id={`delete-slot-${idx}`}
              className="btn btn-danger"
              onClick={(e) => { e.stopPropagation(); handleDeleteSlot(idx); }}
              disabled={deletingSlot === idx}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                padding: '3px 8px',
                fontSize: 11,
              }}
            >
              {deletingSlot === idx ? '...' : '✕ Xóa'}
            </button>

            {/* Character info */}
            <div style={{ marginBottom: 12 }}>
              {slot.character_json?.is_dead && (
                <span className="badge badge-danger" style={{ marginBottom: 8, display: 'inline-block' }}>☠ TỬ VONG</span>
              )}
              <h3 style={{ color: 'var(--gold-bright)', margin: '4px 0' }}>
                {slot.character_json?.name ?? 'Vô Danh'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                {slot.character_json?.realm ?? 'Phàm Nhân'}
              </p>
              <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                {slot.save_name ?? `Slot ${idx}`}
              </p>
            </div>

            {/* Enter game button (center) */}
            <button
              id={`enter-game-slot-${idx}`}
              className="btn btn-gold"
              onClick={() => handleEnterGame(slot)}
              style={{ fontSize: 14, padding: '8px 24px' }}
            >
              ⚔ Vào Game
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      padding: '24px 20px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/servers')} style={{ fontSize: 18 }}>
          ‹
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{selectedServer?.name ?? 'Chọn Server'}</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: 12, margin: 0 }}>
            Chọn save slot để tiếp tục hoặc tạo nhân vật mới
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16, maxWidth: 500, margin: '0 auto' }}>
          {([1, 2, 3] as const).map(renderSlot)}
        </div>
      )}
    </div>
  );
}
