'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Deadline } from '../../types';
import { DeadlineCard } from '../../components/DeadlineCard';
import { Skeleton } from '../../components/Skeleton';
import styles from './Deadlines.module.css';

type Tab = 'upcoming' | 'overdue' | 'completed';

function DeadlinesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [activeDeadlines, setActiveDeadlines] = useState<Deadline[]>([]);
  const [completedDeadlines, setCompletedDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<Tab>(
    (searchParams.get('tab') as Tab) || 'upcoming'
  );
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  // Edit Modal state
  const [editingTask, setEditingTask] = useState<Deadline | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editEffort, setEditEffort] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editHasTime, setEditHasTime] = useState(true);

  // Delete Modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [activeRes, completedRes] = await Promise.all([
        api.getDeadlines('active'),
        api.getDeadlines('completed'),
      ]);
      setActiveDeadlines(activeRes.deadlines || []);
      setCompletedDeadlines(completedRes.deadlines || []);
    } catch (err) {
      console.error('Failed to load deadlines:', err);
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

  // Split active into upcoming and overdue
  const { upcomingList, overdueList } = useMemo(() => {
    const now = new Date();
    const upcoming: Deadline[] = [];
    const overdue: Deadline[] = [];

    activeDeadlines.forEach((d) => {
      const isOver = d.dueAt ? new Date(d.dueAt) < now : false;
      if (isOver) {
        overdue.push(d);
      } else {
        upcoming.push(d);
      }
    });

    return { upcomingList: upcoming, overdueList: overdue };
  }, [activeDeadlines]);

  // Extract unique subjects
  const allSubjects = useMemo(() => {
    const set = new Set<string>();
    [...activeDeadlines, ...completedDeadlines].forEach((d) => {
      if (d.subject) set.add(d.subject);
    });
    return Array.from(set);
  }, [activeDeadlines, completedDeadlines]);

  // Filter current list
  const displayedDeadlines = useMemo(() => {
    let list: Deadline[] = [];
    if (currentTab === 'upcoming') list = upcomingList;
    else if (currentTab === 'overdue') list = overdueList;
    else list = completedDeadlines;

    if (selectedSubject !== 'all') {
      list = list.filter((d) => d.subject === selectedSubject);
    }
    return list;
  }, [currentTab, upcomingList, overdueList, completedDeadlines, selectedSubject]);

  async function handleToggleStatus(id: string, newStatus: 'active' | 'completed') {
    try {
      await api.updateDeadline(id, { status: newStatus });
      loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  }

  function openEdit(task: Deadline) {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditSubject(task.subject || '');
    setEditEffort(task.effortHours != null ? String(task.effortHours) : '');
    setEditHasTime(task.hasDueTime);

    if (task.dueAt) {
      const d = new Date(task.dueAt);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setEditDate(`${year}-${month}-${day}`);
      const hrs = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      setEditTime(`${hrs}:${mins}`);
    } else {
      setEditDate('');
      setEditTime('23:59');
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;

    let dueAtIso: string | null = null;
    if (editDate) {
      const [year, month, day] = editDate.split('-').map(Number);
      let hrs = 23;
      let mins = 59;
      if (editHasTime && editTime) {
        const [h, m] = editTime.split(':').map(Number);
        hrs = h;
        mins = m;
      }
      const localDate = new Date(year, month - 1, day, hrs, mins, 0);
      dueAtIso = localDate.toISOString();
    }

    try {
      await api.updateDeadline(editingTask.id, {
        title: editTitle.trim(),
        subject: editSubject.trim() || null,
        dueAt: dueAtIso,
        hasDueTime: editHasTime,
        effortHours: editEffort.trim() ? parseFloat(editEffort) : null,
      });
      setEditingTask(null);
      loadData();
    } catch (err) {
      console.error('Failed to save edit:', err);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingId) return;
    try {
      await api.deleteDeadline(deletingId);
      setDeletingId(null);
      loadData();
    } catch (err) {
      console.error('Failed to delete deadline:', err);
    }
  }

  if (authLoading || (!user && loading)) {
    return (
      <div>
        <Skeleton height="3rem" count={1} style={{ marginBottom: '1.5rem' }} />
        <Skeleton height="4rem" count={4} />
      </div>
    );
  }

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>All Deadlines</h1>
          <Link
            href="/add"
            style={{
              backgroundColor: 'var(--color-ink)',
              color: '#FFFFFF',
              padding: '0.6rem 1.1rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            + Add deadline
          </Link>
        </div>

        <div className={styles.controlsRow}>
          <div className={styles.tabs} role="tablist">
            <button
              type="button"
              className={`${styles.tab} ${currentTab === 'upcoming' ? styles.activeTab : ''}`}
              onClick={() => setCurrentTab('upcoming')}
              role="tab"
              aria-selected={currentTab === 'upcoming'}
            >
              Upcoming
              <span className={`${styles.badge} ${currentTab === 'upcoming' ? styles.activeBadge : ''}`}>
                {upcomingList.length}
              </span>
            </button>

            <button
              type="button"
              className={`${styles.tab} ${currentTab === 'overdue' ? styles.activeTab : ''}`}
              onClick={() => setCurrentTab('overdue')}
              role="tab"
              aria-selected={currentTab === 'overdue'}
            >
              Overdue
              <span className={`${styles.badge} ${currentTab === 'overdue' ? styles.activeBadge : ''}`}>
                {overdueList.length}
              </span>
            </button>

            <button
              type="button"
              className={`${styles.tab} ${currentTab === 'completed' ? styles.activeTab : ''}`}
              onClick={() => setCurrentTab('completed')}
              role="tab"
              aria-selected={currentTab === 'completed'}
            >
              Completed
              <span className={`${styles.badge} ${currentTab === 'completed' ? styles.activeBadge : ''}`}>
                {completedDeadlines.length}
              </span>
            </button>
          </div>

          {allSubjects.length > 0 && (
            <select
              className={styles.subjectFilter}
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              aria-label="Filter by subject"
            >
              <option value="all">All Subjects</option>
              {allSubjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <Skeleton height="4rem" count={3} />
      ) : displayedDeadlines.length > 0 ? (
        <div>
          {displayedDeadlines.map((d) => (
            <DeadlineCard
              key={d.id}
              deadline={d}
              onToggleStatus={handleToggleStatus}
              onEdit={openEdit}
              onDelete={(id) => setDeletingId(id)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          {currentTab === 'upcoming' && 'No upcoming deadlines. Chill karo ya add karo!'}
          {currentTab === 'overdue' && 'No overdue deadlines! Sab control mein hai. 🎯'}
          {currentTab === 'completed' && 'No completed deadlines yet. Pehla kaam khatam karo!'}
        </div>
      )}

      {/* Edit Modal */}
      {editingTask && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Edit Deadline</h2>
            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Title *
                </label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-paper-border)', borderRadius: 'var(--radius-sm)' }}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Subject
                  </label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-paper-border)', borderRadius: 'var(--radius-sm)' }}
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    placeholder="e.g. DBMS"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Effort (hrs)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-paper-border)', borderRadius: 'var(--radius-sm)' }}
                    value={editEffort}
                    onChange={(e) => setEditEffort(e.target.value)}
                    placeholder="e.g. 2.5"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-paper-border)', borderRadius: 'var(--radius-sm)' }}
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Due Time
                  </label>
                  <input
                    type="time"
                    disabled={!editHasTime}
                    style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-paper-border)', borderRadius: 'var(--radius-sm)' }}
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '1.25rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!editHasTime}
                  onChange={(e) => setEditHasTime(!e.target.checked)}
                />
                No specific time (23:59)
              </label>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelModalBtn}
                  onClick={() => setEditingTask(null)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.saveBtn}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Delete Deadline?</h2>
            <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Are you sure you want to permanently delete this deadline? Pending reminders for it will also be cancelled.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelModalBtn}
                onClick={() => setDeletingId(null)}
              >
                Keep it
              </button>
              <button
                type="button"
                className={styles.confirmDeleteBtn}
                onClick={handleConfirmDelete}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeadlinesPage() {
  return (
    <Suspense
      fallback={
        <div>
          <Skeleton height="3rem" count={1} style={{ marginBottom: '1.5rem' }} />
          <Skeleton height="4rem" count={4} />
        </div>
      }
    >
      <DeadlinesContent />
    </Suspense>
  );
}
