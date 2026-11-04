'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { ParsePreview } from '../../types';
import { ParsePreviewCard } from '../../components/ParsePreviewCard';
import { Skeleton } from '../../components/Skeleton';
import styles from './AddDeadline.module.css';

const EXAMPLE_DEADLINES = [
  'DBMS Lab Assignment by tomorrow 5 PM ~3h',
  'Operating Systems Project submission on Friday 23:59 ~8h',
  'AI Quiz on 28 Oct ~1.5h',
  'Submit scholarship documents next Monday 10am',
];

export default function AddDeadlinePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [inputVal, setInputVal] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<ParsePreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className={styles.container}>
        <Skeleton height="3rem" count={1} style={{ marginBottom: '1.5rem' }} />
        <Skeleton height="8rem" count={1} />
      </div>
    );
  }

  async function handleParse(textToParse: string) {
    if (!textToParse.trim()) return;
    setError(null);
    setParsing(true);

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      const res = await api.parseDeadline(textToParse.trim(), tz);
      setPreview(res.preview);
    } catch (err: any) {
      setError(err.message || 'Failed to parse deadline string.');
    } finally {
      setParsing(false);
    }
  }

  function handleManualToggle() {
    setPreview({
      title: inputVal.trim() || '',
      subject: null,
      dueAt: null,
      hasDueTime: false,
      effortHours: null,
      warnings: [],
    });
  }

  async function handleConfirmSave(data: {
    title: string;
    subject: string | null;
    dueAt: string | null;
    hasDueTime: boolean;
    effortHours: number | null;
  }) {
    setError(null);
    setSaving(true);

    try {
      await api.createDeadline(data);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to save deadline.');
      setSaving(false);
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Add Deadline</h1>
        <p className={styles.subtitle}>
          Type naturally in one line — date, time, and effort will be recognized automatically.
        </p>
      </header>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.inputCard}>
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            handleParse(inputVal);
          }}
        >
          <input
            type="text"
            className={styles.nlpInput}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="e.g. Complete DBMS lab assignment by Friday 5 PM ~3h"
            autoFocus
          />

          <div className={styles.buttonRow}>
            <button
              type="button"
              className={styles.toggleManualBtn}
              onClick={handleManualToggle}
            >
              Or fill structured form directly
            </button>

            <button
              type="submit"
              className={styles.parseBtn}
              disabled={parsing || !inputVal.trim()}
            >
              {parsing ? 'Analyzing...' : 'Parse & Preview →'}
            </button>
          </div>
        </form>

        <div className={styles.examplesSection}>
          <div className={styles.examplesTitle}>Try an example:</div>
          <div className={styles.chipList}>
            {EXAMPLE_DEADLINES.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                className={styles.exampleChip}
                onClick={() => {
                  setInputVal(ex);
                  handleParse(ex);
                }}
              >
                "{ex}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {preview && (
        <ParsePreviewCard
          preview={preview}
          onConfirm={handleConfirmSave}
          onCancel={() => setPreview(null)}
          loading={saving}
        />
      )}
    </div>
  );
}
