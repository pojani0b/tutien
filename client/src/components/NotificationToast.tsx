// NOTIFICATION TOAST — shows realtime alerts
import React from 'react';
import { useGameStore } from '../store/useGameStore';

export default function NotificationToast() {
  const { notifications, removeNotification } = useGameStore();

  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 12,
      right: 12,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      maxWidth: 340,
    }}>
      {notifications.map((n) => (
        <div
          key={n.id}
          className="animate-fade-in"
          onClick={() => removeNotification(n.id)}
          style={{
            background: n.type === 'danger' ? 'rgba(139,26,26,0.95)' :
                        n.type === 'gold' ? 'rgba(30,22,10,0.95)' :
                        'rgba(16,16,16,0.95)',
            border: `1px solid ${n.type === 'danger' ? 'var(--red-blood)' : n.type === 'gold' ? 'var(--border-bright)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            color: n.type === 'danger' ? 'var(--text-danger)' :
                   n.type === 'gold' ? 'var(--gold-bright)' : 'var(--text-primary)',
            fontSize: 13,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            boxShadow: 'var(--shadow-deep)',
          }}
        >
          {n.message}
        </div>
      ))}
    </div>
  );
}
