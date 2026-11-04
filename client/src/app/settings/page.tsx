'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Skeleton } from '../../components/Skeleton';
import styles from './Settings.module.css';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [bufferHours, setBufferHours] = useState(2);
  const [quietStart, setQuietStart] = useState('23:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
      setPushEnabled(Notification.permission === 'granted');
    }
  }, []);

  async function handleTogglePush() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Push notifications are not supported in this browser.');
      return;
    }

    if (!pushEnabled) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        setPushEnabled(true);
        setMessage('Push notifications enabled!');
      } else {
        alert('Notification permission was denied. Please allow notifications in your browser settings.');
      }
    } else {
      setPushEnabled(false);
      setMessage('Push notifications disabled.');
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  if (authLoading || !user) {
    return (
      <div className={styles.container}>
        <Skeleton height="3rem" count={1} style={{ marginBottom: '1.5rem' }} />
        <Skeleton height="10rem" count={2} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage your account, notification rules, and preferences.</p>
      </header>

      {message && (
        <div style={{ backgroundColor: '#DEF7EC', color: '#03543F', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {message}
        </div>
      )}

      {/* Account Info */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>👤 Account</h2>
        <div className={styles.itemRow}>
          <div>
            <div className={styles.itemLabel}>Email</div>
            <div className={styles.itemHint}>{user.email}</div>
          </div>
        </div>
        <div className={styles.itemRow}>
          <div>
            <div className={styles.itemLabel}>Timezone</div>
            <div className={styles.itemHint}>{user.timezone || 'Asia/Kolkata'}</div>
          </div>
        </div>
      </section>

      {/* Push Notifications */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🔔 Push Reminders</h2>
        <p className={styles.sectionDesc}>
          Get timely alerts at 48h, 24h, and 6h before deadlines so nothing sneaks up on you.
        </p>

        <div className={styles.itemRow}>
          <div>
            <div className={styles.itemLabel}>Browser Push Notifications</div>
            <div className={styles.itemHint}>
              Status: <span className={`${styles.badge} ${pushEnabled ? styles.badgeSuccess : styles.badgeWarning}`}>
                {notificationPermission}
              </span>
            </div>
          </div>
          <div
            className={`${styles.toggleSwitch} ${pushEnabled ? styles.toggleSwitchActive : ''}`}
            onClick={handleTogglePush}
            role="switch"
            aria-checked={pushEnabled}
          >
            <div className={`${styles.toggleThumb} ${pushEnabled ? styles.toggleThumbActive : ''}`} />
          </div>
        </div>

        <div className={styles.itemRow}>
          <div>
            <div className={styles.itemLabel}>Quiet Hours</div>
            <div className={styles.itemHint}>Reminders arriving during this window are deferred until morning.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="time"
              className={styles.input}
              value={quietStart}
              onChange={(e) => setQuietStart(e.target.value)}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>to</span>
            <input
              type="time"
              className={styles.input}
              value={quietEnd}
              onChange={(e) => setQuietEnd(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Planning Intelligence */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>⏱️ Planning Intelligence</h2>
        <p className={styles.sectionDesc}>
          Suggested start-by times add a breathing buffer before your deadline.
        </p>

        <div>
          <div className={styles.itemLabel}>
            Planning Buffer: <strong>{bufferHours} {bufferHours === 1 ? 'hour' : 'hours'}</strong>
          </div>
          <div className={styles.itemHint} style={{ marginBottom: '0.75rem' }}>
            Formula: Start-by = Due Date − Estimated Effort − {bufferHours}h buffer.
          </div>
          <div className={styles.sliderContainer}>
            <input
              type="range"
              min="0"
              max="6"
              step="0.5"
              value={bufferHours}
              onChange={(e) => setBufferHours(parseFloat(e.target.value))}
              className={styles.slider}
            />
          </div>
        </div>
      </section>

      {/* App & Session */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🚪 Session</h2>
        <button
          type="button"
          className={styles.logoutBtn}
          onClick={handleLogout}
        >
          Log Out of Kheyal
        </button>
      </section>
    </div>
  );
}
