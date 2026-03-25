// BREAKTHROUGH MINIGAME - Lightning Tribulation (Thiên Kiếp)
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { adminApi, gameApi } from '../services/api';

const REALM_ORDER = [
  'Phàm Nhân', 'Luyện Khí', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh', 'Hóa Thần',
  'Luyện Hư', 'Hợp Thể', 'Đại Thừa', 'Độ Kiếp', 'Thiên Tiên', 'Kim Tiên',
  'Thái Ất', 'Đại La', 'Đạo Tổ'
];

export default function BreakthroughMinigame({ onClose }: { onClose: () => void }) {
  const { activeCharacter, addNotification, setActiveCharacter } = useGameStore();
  const [phase, setPhase] = useState<'intro' | 'strikes' | 'success' | 'fail'>('intro');
  const [strikeCount, setStrikeCount] = useState(0);
  const [maxStrikes, setMaxStrikes] = useState(3);
  const [hp, setHp] = useState(100);
  const [shield, setShield] = useState(0);

  const char = activeCharacter!;
  const currentRealmIdx = REALM_ORDER.indexOf(char.realm);
  const nextRealm = REALM_ORDER[currentRealmIdx + 1] ?? 'Đỉnh Phong';

  useEffect(() => {
    // Base strikes on realm tier
    setMaxStrikes(Math.min(9, Math.max(3, currentRealmIdx * 2)));
    setHp(char.hp);
    setShield((char.foundation ?? 0) * 10); // Foundation acts as shield
  }, [char]);

  const handleDefend = (type: 'body' | 'mana' | 'item') => {
    // Lightning hits
    const dmg = 20 + Math.random() * 30 * currentRealmIdx;
    let mitigated = 0;

    if (type === 'body') mitigated = (char.stats?.defense ?? 0) * 2;
    if (type === 'mana') mitigated = char.mp * 0.5;
    if (type === 'item') mitigated = 50; // Simple item logic

    const finalDmg = Math.max(10, dmg - mitigated);

    let newShield = shield;
    let newHp = hp;

    if (newShield >= finalDmg) {
      newShield -= finalDmg;
    } else {
      const overflow = finalDmg - newShield;
      newShield = 0;
      newHp -= overflow;
    }

    setShield(newShield);
    setHp(newHp);

    if (newHp <= 0) {
      setPhase('fail');
    } else if (strikeCount + 1 >= maxStrikes) {
      setPhase('success');
      finishAscension(true);
    } else {
      setStrikeCount((c) => c + 1);
    }
  };

  const finishAscension = async (success: boolean) => {
    if (success) {
      try {
        await adminApi.editPlayer(char.character_id, {
          realm: nextRealm,
          realm_progress: 0,
          hp: 100, // Full heal
          mp: 100,
          cultivation: char.cultivation + 500,
        });

        // Trigger broadcast via simple action payload
        await gameApi.submitAction({
          character_id: char.character_id,
          action: `*Ta đã bình an vượt qua thiên kiếp, chính thức phi thăng ${nextRealm}!*`,
          chat_history: [],
        });

        const updated = await gameApi.getState(char.character_id);
        setActiveCharacter((updated as { character: unknown }).character as never);
        addNotification(`Đột phá thành công! Cảnh giới hiện tại: ${nextRealm}`, 'gold');
      } catch (e) {
        addNotification('Lỗi cập nhật cảnh giới', 'danger');
      }
    } else {
      addNotification('Đột phá thất bại. Tụt cảnh giới hoặc tổn thương nghiêm trọng.', 'danger');
      await adminApi.editPlayer(char.character_id, {
        hp: 1,
        realm_progress: 50,
      });
      const updated = await gameApi.getState(char.character_id);
      setActiveCharacter((updated as { character: unknown }).character as never);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)',
      zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--gold-bright)',
        borderRadius: 'var(--radius-lg)', padding: 32, width: '100%', maxWidth: 500,
        textAlign: 'center', boxShadow: '0 0 40px rgba(200,145,42,0.2)'
      }}>
        {phase === 'intro' && (
          <>
            <h2 style={{ fontSize: 24, marginBottom: 16 }}>⚡ Thiên Kiếp Giáng Lâm</h2>
            <p>Ngươi sắp sửa đột phá <span style={{ color: 'var(--gold-bright)' }}>{nextRealm}</span>.</p>
            <p style={{ color: 'var(--text-dim)', marginBottom: 24 }}>Cửu cửu thiên kiếp, nhục thân và nguyên thần đều bị thử thách. Nếu thất bại, nhẹ thì trọng thương, nặng thì hồn phi phách tán.</p>
            <button className="btn btn-gold" onClick={() => setPhase('strikes')} style={{ padding: '12px 32px' }}>Nghênh Tiếp Đạo Lôi →</button>
            <button className="btn btn-ghost" onClick={onClose} style={{ marginTop: 16, display: 'block', width: '100%' }}>Rời Đi (Bỏ Cuộc)</button>
          </>
        )}

        {phase === 'strikes' && (
          <>
            <h3 style={{ color: 'var(--text-danger)', fontSize: 20, marginBottom: 8 }}>Đạo Tôn Lôi Kiếp — Đạo thứ {strikeCount + 1}/{maxStrikes}</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Sinh Lực (HP)</span>
              <span style={{ color: hp < 30 ? 'var(--text-danger)' : 'var(--jade-bright)' }}>{Math.floor(hp)}/100</span>
            </div>
            <div className="progress-bar" style={{ marginBottom: 12 }}><div className="progress-bar-fill" style={{ width: `${Math.max(0, hp)}%`, background: hp < 30 ? 'var(--red-blood)' : 'var(--jade-bright)' }} /></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Hộ Thể (Căn Cơ)</span>
              <span style={{ color: 'var(--gold-bright)' }}>{Math.floor(shield)}</span>
            </div>
            <div className="progress-bar" style={{ background: 'var(--bg-dark)', marginBottom: 24 }}><div className="progress-bar-fill" style={{ width: `${Math.min(100, (shield/(char.foundation*10))*100)}%`, background: 'var(--gold-main)' }} /></div>

            <p style={{ marginBottom: 16, color: 'var(--text-dim)' }}>Sắp giáng xuống! Chọn cách ngạnh kháng:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn btn-danger" onClick={() => handleDefend('body')}>Dùng Nhục Thân Đỡ Lôi</button>
              <button className="btn btn-jade" onClick={() => handleDefend('mana')}>Dùng Pháp Lực Ngưng Thuẫn</button>
              <button className="btn btn-ghost" onClick={() => handleDefend('item')}>Tế Xuất Pháp Bảo Đỡ Đòn</button>
            </div>
          </>
        )}

        {phase === 'success' && (
          <>
            <h2 style={{ color: 'var(--gold-bright)', fontSize: 28, marginBottom: 16 }}>Tiên Âm Lượn Lờ</h2>
            <p>Trải qua tử kiếp, dục hỏa trùng sinh. Cảnh giới vững vàng tại <strong style={{ color: 'var(--gold-bright)' }}>{nextRealm}</strong>.</p>
            <button className="btn btn-gold" onClick={onClose} style={{ marginTop: 24, padding: '10px 32px' }}>Tiếp Tục Tu Luyện</button>
          </>
        )}

        {phase === 'fail' && (
          <>
            <h2 style={{ color: 'var(--text-danger)', fontSize: 24, marginBottom: 16 }}>Đạo Hủy Nhân Vong</h2>
            <p>Ngươi không chịu nổi uy áp của Thiên Đạo. Kinh mạch đứt đoạn, tu vi tổn hao nặng nề.</p>
            <button className="btn btn-ghost" onClick={onClose} style={{ marginTop: 24, padding: '10px 32px' }}>Trị Thương Cứu Chữa</button>
          </>
        )}
      </div>
    </div>
  );
}
