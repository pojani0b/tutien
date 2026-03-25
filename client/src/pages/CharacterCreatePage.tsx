// CHARACTER CREATE PAGE
// Full form with code 161982 unlock system
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';

// ---- SEED DATA (from DB seeds / file4/file5 lore) ----
// TODO: Load these from /api/ai/... or embed as constants
const TIANFU_OPTIONS = [
  { name: 'Thiên Linh Căn', type: 'tu_luyen' },
  { name: 'Kim Linh Căn', type: 'tu_luyen' },
  { name: 'Ngũ Linh Căn', type: 'tu_luyen' },
  { name: 'Tán Linh Căn', type: 'tu_luyen' },
  { name: 'Hỗn Nguyên Linh Căn', type: 'tu_luyen' },
  { name: 'Thần Tốc Phản Ứng', type: 'chien_dau' },
  { name: 'Thép Thân Kim Cốt', type: 'chien_dau' },
  { name: 'Chiến Ý Bất Diệt', type: 'chien_dau' },
  { name: 'Dược Vương Túc Duyên', type: 'luyen_dan' },
  { name: 'Đan Đạo Thiên Mệnh', type: 'luyen_dan' },
  { name: 'Trận Đạo Thần Nhãn', type: 'tran_phap' },
  { name: 'Thần Thức Hải Vô Biên', type: 'linh_hon' },
  { name: 'Lôi Đình Chi Thể', type: 'nguyen_to' },
  { name: 'Hỏa Linh Chi Thể', type: 'nguyen_to' },
  { name: 'Vạn Thú Thân Duyên', type: 'ngu_thu' },
];

const TALENT_OPTIONS = [
  { name: 'Thiện Ngôn Lệnh Sắc', type: 'social' },
  { name: 'Hùng Biện Thuyết Khách', type: 'social' },
  { name: 'Thuyết Phục Tâm Lý', type: 'social' },
  { name: 'Đàm Phán Cao Thủ', type: 'social' },
  { name: 'Đế Vương Khí Tức', type: 'leadership' },
  { name: 'Thu Phục Nhân Tâm', type: 'leadership' },
  { name: 'Trăm Mưu Nghìn Kế', type: 'strategy' },
  { name: 'Thiên Cơ Quan Sát', type: 'strategy' },
  { name: 'Phán Đoán Nhân Tâm', type: 'strategy' },
  { name: 'Đọc Thế Chiến Đấu', type: 'combat' },
  { name: 'Võ Học Thiên Tài', type: 'combat' },
  { name: 'Bác Học Đa Tài', type: 'craft' },
  { name: 'Truyền Đạo Sư Biểu', type: 'craft' },
];

const DAO_PATHS = [
  'Kiếm Đạo', 'Đao Đạo', 'Quyền Đạo', 'Trận Đạo', 'Đan Đạo', 'Luyện Khí Đạo',
  'Phù Lục Đạo', 'Thần Thức Đạo', 'Thể Tu Đại Đạo', 'Lôi Đạo', 'Hỏa Đạo',
  'Băng Đạo', 'Hư Không Đạo', 'Thời Gian Đạo', 'Ngự Thú Đạo', 'Độc Đạo',
  'Huyết Đạo', 'Sát Đạo', 'Không Gian Đạo', 'Hỗn Độn Đạo',
];

const SPECIAL_CODE = '161982';

export default function CharacterCreatePage() {
  const { serverId, slotIndex } = useParams<{ serverId: string; slotIndex: string }>();
  const navigate = useNavigate();
  const { setHasCode161982, hasCode161982 } = useGameStore();

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [codeUnlocked, setCodeUnlocked] = useState(hasCode161982);
  const [gender, setGender] = useState('nam');
  const [customGender, setCustomGender] = useState('');
  const [origin, setOrigin] = useState('');
  const [appearance, setAppearance] = useState('');
  const [personality, setPersonality] = useState('');
  const [likes, setLikes] = useState('');
  const [dislikes, setDislikes] = useState('');
  const [daoPath, setDaoPath] = useState('');
  const [selectedTianfu, setSelectedTianfu] = useState<string[]>([]);
  const [customTianfu, setCustomTianfu] = useState('');
  const [selectedTalents, setSelectedTalents] = useState<string[]>([]);
  const [customTalents, setCustomTalents] = useState('');
  const [goldenFinger, setGoldenFinger] = useState('');
  const [nsfwEnabled, setNsfwEnabled] = useState(false);
  const [nsfwLevel, setNsfwLevel] = useState(0);
  const [codeError, setCodeError] = useState('');

  const maxTianfu = codeUnlocked ? Infinity : 4;
  const maxTalents = codeUnlocked ? Infinity : 6;

  const handleCodeCheck = () => {
    if (code === SPECIAL_CODE) {
      setCodeUnlocked(true);
      setHasCode161982(true);
      setCodeError('');
    } else {
      setCodeError('Mã không hợp lệ');
    }
  };

  const toggleTianfu = (name: string) => {
    setSelectedTianfu((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      if (prev.length >= maxTianfu) return prev;
      return [...prev, name];
    });
  };

  const toggleTalent = (name: string) => {
    setSelectedTalents((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      if (prev.length >= maxTalents) return prev;
      return [...prev, name];
    });
  };

  // Parse comma/dot/slash/semicolon separated custom entries
  const parseCustom = (text: string) =>
    text.split(/[,./;，。；]+/).map((s) => s.trim()).filter(Boolean);

  const handleContinue = () => {
    if (!name.trim()) return;

    const allTianfu = [
      ...selectedTianfu.map((n) => ({ name: n, type: 'selected', is_custom: false })),
      ...parseCustom(customTianfu).map((n) => ({ name: n, type: 'custom', is_custom: true, nerfed: !codeUnlocked })),
    ];
    const allTalents = [
      ...selectedTalents.map((n) => ({ name: n, type: 'selected', is_custom: false })),
      ...parseCustom(customTalents).map((n) => ({ name: n, type: 'custom', is_custom: true, nerfed: !codeUnlocked })),
    ];

    const characterData = {
      server_id: serverId,
      slot_index: parseInt(slotIndex ?? '1'),
      save_name: name,
      character: {
        name,
        gender: gender === 'custom' ? customGender : gender,
        origin,
        appearance,
        personality,
        likes,
        dislikes,
        dao_path: daoPath,
        talents: allTalents,
        aptitudes: allTianfu,
        golden_finger: codeUnlocked
          ? { enabled: true, raw_input: parseCustom(goldenFinger) }
          : { enabled: false },
        NSFW_enabled: nsfwEnabled,
        NSFW_level: nsfwLevel,
        stats: {},
        foundation: 0,
        luck: 0,
      },
    };

    // Store temporarily for roll screen
    sessionStorage.setItem('pending_character', JSON.stringify(characterData));
    navigate('/roll');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: 'var(--text-primary)', padding: '20px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>‹</button>
          <h2 style={{ margin: 0 }}>✦ Tạo Nhân Vật</h2>
          {codeUnlocked && <span className="badge badge-gold">⚡ Code Kích Hoạt</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Name + Code */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Tên Nhân Vật *
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="char-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên..."
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {/* Code unlock */}
          {!codeUnlocked && (
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>
                Mã Đặc Biệt (tùy chọn)
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="char-code"
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setCodeError(''); }}
                  placeholder="Nhập mã..."
                  style={{ flex: 1 }}
                  onKeyDown={(e) => e.key === 'Enter' && handleCodeCheck()}
                />
                <button className="btn btn-ghost" onClick={handleCodeCheck}>Kích hoạt</button>
              </div>
              {codeError && <p style={{ color: 'var(--text-danger)', fontSize: 12, marginTop: 4 }}>{codeError}</p>}
            </div>
          )}

          {/* Gender */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Giới Tính
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['nam', 'nữ', 'vô giới', 'custom'].map((g) => (
                <button
                  key={g}
                  id={`gender-${g}`}
                  className={`btn ${gender === g ? 'btn-gold' : 'btn-ghost'}`}
                  onClick={() => setGender(g)}
                  style={{ fontSize: 13 }}
                >
                  {g === 'custom' ? '✏ Tự nhập' : g}
                </button>
              ))}
            </div>
            {gender === 'custom' && (
              <input
                style={{ marginTop: 8, width: '100%' }}
                value={customGender}
                onChange={(e) => setCustomGender(e.target.value)}
                placeholder="Nhập giới tính..."
              />
            )}
          </div>

          {/* Text fields */}
          {[
            { id: 'origin', label: 'Xuất Thân', val: origin, set: setOrigin, ph: 'Ví dụ: Tiểu thư thế gia, con nhà nghèo...' },
            { id: 'appearance', label: 'Ngoại Hình', val: appearance, set: setAppearance, ph: 'Mô tả ngoại hình...' },
            { id: 'personality', label: 'Tính Cách', val: personality, set: setPersonality, ph: 'Mô tả tính cách...' },
            { id: 'likes', label: 'Sở Thích', val: likes, set: setLikes, ph: 'Thứ bạn thích...' },
            { id: 'dislikes', label: 'Sở Ghét', val: dislikes, set: setDislikes, ph: 'Thứ bạn ghét...' },
          ].map(({ id, label, val, set, ph }) => (
            <div key={id}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                {label}
              </label>
              <textarea
                id={`char-${id}`}
                value={val}
                onChange={(e) => set(e.target.value)}
                placeholder={ph}
                rows={2}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
          ))}

          {/* Đại Đạo */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Đại Đạo Bản Thân
            </label>
            <select
              id="char-dao-path"
              value={daoPath}
              onChange={(e) => setDaoPath(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">-- Chọn Đại Đạo --</option>
              {DAO_PATHS.map((dp) => (
                <option key={dp} value={dp}>{dp}</option>
              ))}
            </select>
          </div>

          {/* Thiên Phú */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Thiên Phú {!codeUnlocked && <span style={{ color: 'var(--text-dim)' }}>(tối đa {maxTianfu})</span>}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {TIANFU_OPTIONS.map((tf) => {
                const selected = selectedTianfu.includes(tf.name);
                const disabled = !selected && selectedTianfu.length >= maxTianfu;
                return (
                  <button
                    key={tf.name}
                    id={`tianfu-${tf.name}`}
                    className={`btn ${selected ? 'btn-gold' : 'btn-ghost'}`}
                    onClick={() => toggleTianfu(tf.name)}
                    disabled={disabled}
                    style={{ fontSize: 12, opacity: disabled ? 0.4 : 1 }}
                  >
                    {tf.name}
                  </button>
                );
              })}
            </div>
            <input
              placeholder="Tự nhập (dùng dấu phẩy, chấm, / hoặc ; để ngăn cách)..."
              value={customTianfu}
              onChange={(e) => setCustomTianfu(e.target.value)}
              style={{ width: '100%', fontSize: 12 }}
            />
            {!codeUnlocked && customTianfu && (
              <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                ⚠ Thiên phú tự nhập sẽ được AI cân bằng lại (nerf). Dùng code đặc biệt để vô hiệu hóa.
              </p>
            )}
          </div>

          {/* Tài Năng */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Tài Năng {!codeUnlocked && <span style={{ color: 'var(--text-dim)' }}>(tối đa {maxTalents})</span>}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {TALENT_OPTIONS.map((t) => {
                const selected = selectedTalents.includes(t.name);
                const disabled = !selected && selectedTalents.length >= maxTalents;
                return (
                  <button
                    key={t.name}
                    id={`talent-${t.name}`}
                    className={`btn ${selected ? 'btn-jade' : 'btn-ghost'}`}
                    onClick={() => toggleTalent(t.name)}
                    disabled={disabled}
                    style={{ fontSize: 12, opacity: disabled ? 0.4 : 1 }}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
            <input
              placeholder="Tự nhập tài năng (dùng , . / ; để ngăn cách)..."
              value={customTalents}
              onChange={(e) => setCustomTalents(e.target.value)}
              style={{ width: '100%', fontSize: 12 }}
            />
          </div>

          {/* Code 161982 extras */}
          {codeUnlocked && (
            <>
              {/* Golden Finger */}
              <div style={{
                background: 'rgba(200,145,42,0.08)',
                border: '1px solid var(--border-bright)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
              }}>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--gold-bright)', marginBottom: 8, fontFamily: 'var(--font-serif)' }}>
                  ⚡ Bàn Tay Vàng / Hack
                </label>
                <input
                  id="char-golden-finger"
                  value={goldenFinger}
                  onChange={(e) => setGoldenFinger(e.target.value)}
                  placeholder="Nhập các ưu thế đặc biệt (dùng , . / ; ngăn cách)..."
                  style={{ width: '100%' }}
                />
              </div>

              {/* NSFW */}
              <div style={{
                background: 'rgba(100,0,100,0.1)',
                border: '1px solid rgba(150,0,150,0.3)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label style={{ color: 'var(--purple-bright)', fontFamily: 'var(--font-serif)' }}>
                    ❤ Chế Độ Tình Cảm / NSFW
                  </label>
                  <button
                    id="char-nsfw-toggle"
                    className={`btn ${nsfwEnabled ? 'btn-danger' : 'btn-ghost'}`}
                    onClick={() => setNsfwEnabled(!nsfwEnabled)}
                    style={{ fontSize: 12 }}
                  >
                    {nsfwEnabled ? 'Bật' : 'Tắt'}
                  </button>
                </div>

                {nsfwEnabled && (
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                      Cấp độ NSFW: {nsfwLevel}
                    </label>
                    <input
                      id="char-nsfw-level"
                      type="range"
                      min={0}
                      max={5}
                      value={nsfwLevel}
                      onChange={(e) => setNsfwLevel(parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                      <span>Tốt lành</span>
                      <span>Dark Fantasy</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Continue Button */}
          <button
            id="char-continue-btn"
            className="btn btn-gold"
            onClick={handleContinue}
            disabled={!name.trim()}
            style={{ padding: '12px', fontSize: 15, marginTop: 8 }}
          >
            Tiến Hành Roll Thiên Phú →
          </button>
        </div>
      </div>
    </div>
  );
}
