// AI SETTINGS PANEL — API keys, sliders, model, filters
import React, { useState, useEffect, useRef } from 'react';
import { aiApi } from '../services/api';
import { useGameStore } from '../store/useGameStore';

const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  // Add more models here freely
];

const FILTER_LEVELS = ['off', 'low', 'medium', 'high'] as const;

export default function AISettingsPanel() {
  const { addNotification } = useGameStore();
  const [settings, setSettings] = useState({
    temperature: 0.9,
    memory_window: 10,
    summary_every: 10,
    response_tokens: 4860,
    model_id: 'gemini-2.5-flash',
    filter_enabled: false,
    filter_violence: 'off',
    filter_sexually_explicit: 'off',
    filter_insult: 'off',
    filter_sarcasm: 'off',
  });
  const [keys, setKeys] = useState<Array<{ id: string; project_label?: string; is_active: boolean }>>([]);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    aiApi.getSettings().then((s) => setSettings(s as typeof settings)).catch(() => {});
    aiApi.getKeys().then((k) => setKeys(k as typeof keys)).catch(() => {});
  }, []);

  const saveSettings = async () => {
    setLoading(true);
    try {
      await aiApi.updateSettings(settings);
      addNotification('Đã lưu cài đặt AI.', 'gold');
    } catch (err: unknown) {
      addNotification((err as Error).message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const addKey = async () => {
    if (!newKey.trim()) return;
    try {
      await aiApi.addKey(newKey.trim(), newLabel.trim() || undefined);
      setNewKey(''); setNewLabel('');
      const refreshed = await aiApi.getKeys();
      setKeys(refreshed as typeof keys);
      addNotification('Đã thêm API key.', 'gold');
    } catch (err: unknown) {
      addNotification((err as Error).message, 'danger');
    }
  };

  const importFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const res = await aiApi.importKeys(text);
      const r = res as { added: number };
      addNotification(`Đã import ${r.added} key mới.`, 'gold');
      const refreshed = await aiApi.getKeys();
      setKeys(refreshed as typeof keys);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const deleteKey = async (id: string) => {
    await aiApi.deleteKey(id);
    setKeys((prev) => prev.filter((k) => k.id !== id));
    addNotification('Đã xóa key.', 'info');
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <h3 style={{ marginBottom: 20, fontSize: '1rem' }}>⚙ Cài Đặt AI</h3>

      {/* API KEYS */}
      <section style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>🔑 API Keys</h4>

        {/* Key list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {keys.map((k) => (
            <div key={k.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--bg-dark)', border: '1px solid var(--border-dim)',
              borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: 12,
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                {k.project_label ?? 'Key'} — {k.is_active ? '✓ Active' : '✗ Inactive'}
              </span>
              <button className="btn btn-danger" onClick={() => deleteKey(k.id)} style={{ padding: '2px 8px', fontSize: 11 }}>
                ✕
              </button>
            </div>
          ))}
          {keys.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Chưa có key nào.</p>}
        </div>

        {/* Add key */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input
            id="ai-key-input"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Dán API key vào đây..."
            style={{ flex: 1, fontSize: 12 }}
            onKeyDown={(e) => e.key === 'Enter' && addKey()}
          />
          <input
            id="ai-key-label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Nhãn (tùy chọn)"
            style={{ width: 100, fontSize: 12 }}
          />
          <button id="ai-key-add-btn" className="btn btn-jade" onClick={addKey} style={{ fontSize: 12, padding: '6px 12px' }}>+</button>
        </div>

        {/* Import / Export */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()} style={{ fontSize: 12 }}>
            📂 Import .txt
          </button>
          <button id="ai-key-export-btn" className="btn btn-ghost" onClick={aiApi.exportKeys} style={{ fontSize: 12 }}>
            💾 Export .txt
          </button>
          <input ref={fileRef} type="file" accept=".txt" style={{ display: 'none' }} onChange={importFile} />
        </div>
      </section>

      <div className="divider" />

      {/* MODEL */}
      <section style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
          🤖 Mô Hình AI
        </label>
        <select
          id="ai-model-select"
          value={settings.model_id}
          onChange={(e) => setSettings((s) => ({ ...s, model_id: e.target.value }))}
          style={{ width: '100%' }}
        >
          {MODELS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </section>

      {/* TEMPERATURE */}
      <section style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
          <span>🌡 Độ Sáng Tạo</span>
          <span style={{ color: 'var(--gold-bright)' }}>{settings.temperature.toFixed(2)}</span>
        </div>
        <input type="range" min={0} max={2} step={0.05} value={settings.temperature}
          onChange={(e) => setSettings((s) => ({ ...s, temperature: parseFloat(e.target.value) }))} style={{ width: '100%' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)' }}>
          <span>Ổn định</span><span>Sáng tạo</span>
        </div>
      </section>

      {/* MEMORY WINDOW */}
      <section style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
          <span>🧠 Bộ Nhớ Chat</span>
          <span style={{ color: 'var(--gold-bright)' }}>{settings.memory_window} chat</span>
        </div>
        <input type="range" min={10} max={50} step={5} value={settings.memory_window}
          onChange={(e) => setSettings((s) => ({ ...s, memory_window: parseInt(e.target.value) }))} style={{ width: '100%' }} />
      </section>

      {/* RESPONSE TOKENS */}
      <section style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
          <span>📝 Độ Dài Phản Hồi</span>
          <span style={{ color: 'var(--gold-bright)' }}>{settings.response_tokens} tokens</span>
        </div>
        <input type="range" min={2000} max={16000} step={500} value={settings.response_tokens}
          onChange={(e) => setSettings((s) => ({ ...s, response_tokens: parseInt(e.target.value) }))} style={{ width: '100%' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)' }}>
          <span>Chi tiết hơn</span><span>Nhanh hơn</span>
        </div>
      </section>

      <div className="divider" />

      {/* FILTERS */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>🛡 Bộ Lọc Nội Dung</h4>
          <button
            id="ai-filter-toggle"
            className={`btn ${settings.filter_enabled ? 'btn-jade' : 'btn-ghost'}`}
            onClick={() => setSettings((s) => ({ ...s, filter_enabled: !s.filter_enabled }))}
            style={{ fontSize: 12, padding: '4px 12px' }}
          >
            {settings.filter_enabled ? 'Bật' : 'Tắt'}
          </button>
        </div>

        {settings.filter_enabled && ['violence', 'sexually_explicit', 'insult', 'sarcasm'].map((key) => (
          <div key={key} style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>
              {key === 'violence' ? '🩸 Bạo lực' :
               key === 'sexually_explicit' ? '🔞 Tình dục' :
               key === 'insult' ? '🗣 Xúc phạm' : '😏 Mỉa mai'}
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {FILTER_LEVELS.map((level) => {
                const settingKey = `filter_${key}` as keyof typeof settings;
                return (
                  <button
                    key={level}
                    id={`filter-${key}-${level}`}
                    className={`btn ${settings[settingKey] === level ? 'btn-gold' : 'btn-ghost'}`}
                    onClick={() => setSettings((s) => ({ ...s, [settingKey]: level }))}
                    style={{ fontSize: 11, padding: '3px 8px', flex: 1 }}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Save */}
      <button
        id="ai-settings-save-btn"
        className="btn btn-gold"
        onClick={saveSettings}
        disabled={loading}
        style={{ width: '100%', padding: '10px', fontSize: 14 }}
      >
        {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : '💾 Lưu Cài Đặt'}
      </button>
    </div>
  );
}
