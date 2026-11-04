'use client';

import React, { useState, useEffect } from 'react';
import { ParsePreview } from '../types';
import styles from './ParsePreviewCard.module.css';

interface ParsePreviewCardProps {
  preview: ParsePreview;
  onConfirm: (data: {
    title: string;
    subject: string | null;
    dueAt: string | null;
    hasDueTime: boolean;
    effortHours: number | null;
  }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ParsePreviewCard({
  preview,
  onConfirm,
  onCancel,
  loading = false,
}: ParsePreviewCardProps) {
  const [title, setTitle] = useState(preview.title || '');
  const [subject, setSubject] = useState(preview.subject || '');
  const [hasDueTime, setHasDueTime] = useState(preview.hasDueTime);
  const [effortHours, setEffortHours] = useState<string>(
    preview.effortHours != null ? String(preview.effortHours) : ''
  );

  // Parse local date and time from preview.dueAt
  const [dateStr, setDateStr] = useState<string>(() => {
    if (!preview.dueAt) return '';
    const d = new Date(preview.dueAt);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [timeStr, setTimeStr] = useState<string>(() => {
    if (!preview.dueAt || !preview.hasDueTime) return '23:59';
    const d = new Date(preview.dueAt);
    if (isNaN(d.getTime())) return '23:59';
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hrs}:${mins}`;
  });

  // Re-sync if preview prop changes
  useEffect(() => {
    setTitle(preview.title || '');
    setSubject(preview.subject || '');
    setHasDueTime(preview.hasDueTime);
    setEffortHours(preview.effortHours != null ? String(preview.effortHours) : '');

    if (preview.dueAt) {
      const d = new Date(preview.dueAt);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setDateStr(`${year}-${month}-${day}`);
        const hrs = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        setTimeStr(`${hrs}:${mins}`);
      }
    } else {
      setDateStr('');
      setTimeStr('23:59');
    }
  }, [preview]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    let dueAtIso: string | null = null;
    if (dateStr) {
      const [year, month, day] = dateStr.split('-').map(Number);
      let hrs = 23;
      let mins = 59;
      if (hasDueTime && timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        hrs = h;
        mins = m;
      }
      const localDate = new Date(year, month - 1, day, hrs, mins, 0);
      dueAtIso = localDate.toISOString();
    }

    onConfirm({
      title: title.trim(),
      subject: subject.trim() || null,
      dueAt: dueAtIso,
      hasDueTime,
      effortHours: effortHours.trim() ? parseFloat(effortHours) : null,
    });
  }

  return (
    <form className={styles.card} onSubmit={handleSave}>
      <div className={styles.header}>
        <span className={styles.badge}>📋 Review & Confirm</span>
        <span className={styles.instructions}>Make changes if needed before saving</span>
      </div>

      {preview.warnings && preview.warnings.length > 0 && (
        <div className={styles.warningBox}>
          <strong>⚠️ Note:</strong>
          <ul className={styles.warningList}>
            {preview.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="preview-title">
          Deadline Title *
        </label>
        <input
          id="preview-title"
          type="text"
          className={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g. Complete DBMS lab assignment"
        />
      </div>

      <div className={styles.row2}>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="preview-subject">
            Subject / Course (optional)
          </label>
          <input
            id="preview-subject"
            type="text"
            className={styles.input}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. DBMS, CS101, Project"
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="preview-effort">
            Estimated Effort (hours)
          </label>
          <input
            id="preview-effort"
            type="number"
            step="0.5"
            min="0"
            max="1000"
            className={styles.input}
            value={effortHours}
            onChange={(e) => setEffortHours(e.target.value)}
            placeholder="e.g. 2.5"
          />
        </div>
      </div>

      <div className={styles.row2}>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="preview-date">
            Due Date
          </label>
          <input
            id="preview-date"
            type="date"
            className={styles.input}
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="preview-time">
            Due Time
          </label>
          <input
            id="preview-time"
            type="time"
            className={styles.input}
            value={timeStr}
            disabled={!hasDueTime}
            onChange={(e) => setTimeStr(e.target.value)}
          />
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={!hasDueTime}
              onChange={(e) => setHasDueTime(!e.target.checked)}
            />
            No specific time (default end-of-day 23:59)
          </label>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={onCancel}
          disabled={loading}
        >
          Discard
        </button>
        <button
          type="submit"
          className={styles.confirmBtn}
          disabled={loading || !title.trim()}
        >
          {loading ? 'Saving...' : '✓ Confirm & Save Deadline'}
        </button>
      </div>
    </form>
  );
}
