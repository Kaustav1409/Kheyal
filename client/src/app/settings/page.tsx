'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentPushSubscription,
} from '../../lib/pwa';
import { Skeleton } from '../../components/Skeleton';
import styles from './Settings.module.css';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [bufferHours, setBufferHours] = useState(2);
  const [quietStart, setQuietStart] = useState('23:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function checkSubscription() {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotificationPermission(Notification.permission);
        const sub = await getCurrentPushSubscription();
        setPushEnabled(Boolean(sub) && Notification.permission === 'granted');
      }
    }
    checkSubscription();
  }, []);

  async function handleTogglePush() {
    if (!isPushSupported()) {
      setMessage({
        text: 'Push notifications are not supported in this browser or over insecure HTTP.',
        type: 'error',
      });
      return;
    }

    setPushLoading(true);
    setMessage(null);

    try {
      if (!pushEnabled) {
        await subscribeToPush();
        setPushEnabled(true);
        setNotificationPermission('granted');
        setMessage({
          text: '✓ Push reminders enabled! You will receive timely alerts at 48h, 24h, and 6h before deadlines.',
          type: 'success',
        });
      } else {
        await unsubscribeFromPush();
        setPushEnabled(false);
        setMessage({
          text: 'Push notifications disabled for this device.',
          type: 'success',
        });
      }
    } catch (err: any) {
      setMessage({
        text: err.message || 'Failed to toggle push notifications.',
        type: 'error',
      });
    } finally {
      setPushLoading(false);
    }
  }

  async function handleSendTestPush() {
    setTestPushLoading(true);
    setMessage(null);

    try {
      const res = await api.sendTestPush();
      setMessage({
        text: `✓ ${res.message}! Dispatched to ${res.deliveredCount} active subscription(s).`,
        type: 'success',
      });
    } catch (err: any) {
      setMessage({
        text: err.message || 'Failed to send test push notification.',
        type: 'error',
      });
    } finally {
      setTestPushLoading(false);
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
        <div
          style={{
            backgroundColor: message.type === 'success' ? '#DEF7EC' : '#FDE8E8',
            color: message.type === 'success' ? '#03543F' : '#9B1C1C',
            border: `1px solid ${message.type === 'success' ? '#BCF0DA' : '#F8B4B4'}`,
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.25rem',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          {message.text}
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
        <h2 className={styles.sectionTitle}>🔔 Push Reminders (PWA)</h2>
        <p className={styles.sectionDesc}>
          Get alerts at 48h, 24h, and 6h before deadlines so nothing sneaks up on you.
        </p>

        <div className={styles.itemRow}>
          <div>
            <div className={styles.itemLabel}>Browser Push Notifications</div>
            <div className={styles.itemHint}>
              Permission:{' '}
              <span
                className={`${styles.badge} ${
                  pushEnabled ? styles.badgeSuccess : styles.badgeWarning
                }`}
              >
                {notificationPermission}
              </span>
            </div>
          </div>
          <div
            className={`${styles.toggleSwitch} ${pushEnabled ? styles.toggleSwitchActive : ''}`}
            onClick={pushLoading ? undefined : handleTogglePush}
            role="switch"
            aria-checked={pushEnabled}
            style={{ opacity: pushLoading ? 0.6 : 1 }}
          >
            <div
              className={`${styles.toggleThumb} ${
                pushEnabled ? styles.toggleThumbActive : ''
              }`}
            />
          </div>
        </div>

        {pushEnabled && (
          <button
            type="button"
            className={styles.testBtn}
            onClick={handleSendTestPush}
            disabled={testPushLoading}
          >
            {testPushLoading ? 'Sending...' : '🔔 Send Test Notification'}
          </button>
        )}

        <div className={styles.itemRow} style={{ marginTop: '0.75rem' }}>
          <div>
            <div className={styles.itemLabel}>Quiet Hours</div>
            <div className={styles.itemHint}>
              Reminders arriving during this window are deferred until morning.
            </div>
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

      {/* Progressive Web App Install Instructions */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>📱 App Installation (PWA)</h2>
        <p className={styles.sectionDesc}>
          Install Kheyal on your Android, iOS, or laptop homescreen for the full native app experience and reliable notification display.
        </p>
        <div className={styles.installGuide}>
          <strong>How to install:</strong>
          <ol>
            <li>On Android Chrome: Tap menu (⋮) $\rightarrow$ <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
            <li>On iPhone Safari: Tap Share button ($\uparrow$) $\rightarrow$ scroll down $\rightarrow$ <strong>"Add to Home Screen"</strong>.</li>
            <li>On Desktop Chrome/Edge: Click the install icon ($\oplus$) in the address bar.</li>
          </ol>
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
