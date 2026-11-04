'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Deadline } from '../types';
import { HeroTaskCard } from '../components/HeroTaskCard';
import { DeadlineCard } from '../components/DeadlineCard';
import { Skeleton } from '../components/Skeleton';
import { Toast } from '../components/Toast';
import styles from './Home.module.css';

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; undoId?: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await api.getRankedNext();
      setDeadlines(res.rankedDeadlines || []);
      setOverdueCount(res.overdueCount || 0);
    } catch (err) {
      console.error('Failed to load ranked deadlines:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (user) {
      loadData();
    }
  }, [user, authLoading, router, loadData]);

  async function handleMarkComplete(id: string) {
    const target = deadlines.find((d) => d.id === id);
    if (!target) return;

    // Optimistic UI update
    setDeadlines((prev) => prev.filter((d) => d.id !== id));

    try {
      await api.updateDeadline(id, { status: 'completed' });
      setToast({
        message: `✓ Completed "${target.title}"`,
        undoId: id,
      });
    } catch (err) {
      console.error('Failed to complete deadline:', err);
      loadData(); // roll back on failure
    }
  }

  async function handleUndo(id: string) {
    try {
      await api.updateDeadline(id, { status: 'active' });
      setToast(null);
      loadData();
    } catch (err) {
      console.error('Failed to undo deadline completion:', err);
    }
  }

  if (authLoading || (!user && loading)) {
    return (
      <div>
        <Skeleton height="3rem" count={1} style={{ marginBottom: '1.5rem' }} />
        <Skeleton height="14rem" count={1} style={{ marginBottom: '1.5rem' }} />
        <Skeleton height="4rem" count={3} />
      </div>
    );
  }

  const topTask = deadlines.length > 0 ? deadlines[0] : null;
  const upNextTasks = deadlines.slice(1);

  return (
    <div>
      <header className={styles.header}>
        <div className={styles.greetingRow}>
          <div>
            <h1 className={styles.title}>Do This Next</h1>
            <p className={styles.subtitle}>
              Prioritized by smart slack time. Plan smart, move forward.
            </p>
          </div>
          <Link href="/add" className={styles.addBtn}>
            + Add deadline
          </Link>
        </div>
      </header>

      {overdueCount > 0 && (
        <div className={styles.overdueBanner} role="alert">
          <span className={styles.overdueText}>
            ⚠️ You have {overdueCount} {overdueCount === 1 ? 'deadline' : 'deadlines'} overdue!
          </span>
          <Link href="/deadlines?tab=overdue" style={{ textDecoration: 'underline', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-danger)' }}>
            View overdue →
          </Link>
        </div>
      )}

      {loading ? (
        <div>
          <Skeleton height="14rem" count={1} style={{ marginBottom: '1.5rem' }} />
          <Skeleton height="4rem" count={2} />
        </div>
      ) : topTask ? (
        <>
          <HeroTaskCard
            task={topTask}
            onComplete={handleMarkComplete}
            onEdit={() => router.push('/deadlines')}
          />

          {upNextTasks.length > 0 && (
            <div>
              <h2 className={styles.sectionTitle}>
                <span>Up Next</span>
                <span className={styles.sectionCount}>{upNextTasks.length}</span>
              </h2>
              {upNextTasks.map((t) => (
                <DeadlineCard
                  key={t.id}
                  deadline={t}
                  onToggleStatus={(id, status) => {
                    if (status === 'completed') {
                      handleMarkComplete(id);
                    }
                  }}
                  onEdit={() => router.push('/deadlines')}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎉</div>
          <h2 className={styles.emptyTitle}>Sab nipta diya!</h2>
          <p className={styles.subtitle}>
            You have no pending deadlines right now. Relax, or capture what's coming up next.
          </p>
          <Link href="/add" className={styles.addBtn}>
            + Add a deadline
          </Link>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          onUndo={toast.undoId ? () => handleUndo(toast.undoId!) : undefined}
          onClose={() => setToast(null)}
          duration={5000}
        />
      )}
    </div>
  );
}
