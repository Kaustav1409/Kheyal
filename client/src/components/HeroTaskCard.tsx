'use client';

import React from 'react';
import { Deadline } from '../types';
import { formatDue, formatStartBy, getCountdown } from '../lib/dateUtils';
import styles from './HeroTaskCard.module.css';

interface HeroTaskCardProps {
  task: Deadline;
  onComplete: (id: string) => void;
  onEdit?: (task: Deadline) => void;
}

export function HeroTaskCard({ task, onComplete, onEdit }: HeroTaskCardProps) {
  const countdown = getCountdown(task.dueAt);
  const isOverdue = task.isOverdue || countdown.isOverdue;
  const startByFormatted = formatStartBy(task.suggestedStartBy, task.hasDueTime);

  return (
    <div className={`${styles.card} ${isOverdue ? styles.overdueCard : ''}`}>
      <div className={styles.headerRow}>
        <div className="flex items-center gap-2">
          <span className={`${styles.badge} ${isOverdue ? styles.overdueBadge : ''}`}>
            {isOverdue ? '⚠️ #1 OVERDUE' : '⚡ #1 DO THIS NEXT'}
          </span>
          {task.subject && (
            <span className={styles.subjectChip}>{task.subject}</span>
          )}
        </div>
        {countdown.text && (
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isOverdue ? 'var(--color-danger)' : 'var(--color-peach-dark)' }}>
            {countdown.text}
          </span>
        )}
      </div>

      <h2 className={styles.title}>{task.title}</h2>

      <div className={styles.metaGrid}>
        <div className={styles.metaItem}>
          <span className={styles.metaIcon}>📅</span>
          <span><strong>Due:</strong> {formatDue(task.dueAt, task.hasDueTime)}</span>
        </div>

        {task.effortHours != null ? (
          <div className={styles.metaItem}>
            <span className={styles.metaIcon}>⏱️</span>
            <span><strong>Effort:</strong> ~{task.effortHours} {task.effortHours === 1 ? 'hour' : 'hours'}</span>
            {task.slackHours != null && (
              <span style={{ color: 'var(--color-ink-muted)', fontSize: '0.85rem' }}>
                ({task.slackHours > 0 ? `~${task.slackHours.toFixed(1)}h slack` : '0h slack'})
              </span>
            )}
          </div>
        ) : (
          <div className={styles.metaItem}>
            <span className={styles.metaIcon}>⏱️</span>
            <span style={{ color: 'var(--color-lavender)' }}>
              Effort not set
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(task)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-lavender)',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    marginLeft: '0.4rem',
                    fontSize: '0.85rem',
                  }}
                >
                  (Add estimate)
                </button>
              )}
            </span>
          </div>
        )}

        {startByFormatted && (
          <div className={styles.metaItem}>
            <span className={styles.metaIcon}>🎯</span>
            <span>
              <strong>Suggested start-by:</strong> {startByFormatted}
              {task.isStartByApproximate && ' (approx)'}
            </span>
          </div>
        )}
      </div>

      {task.reason && (
        <div className={styles.reasonBox}>
          {task.reason}
        </div>
      )}

      <button
        type="button"
        className={styles.completeBtn}
        onClick={() => onComplete(task.id)}
      >
        <span>✓</span> Ho gaya! Mark as Done
      </button>

      <span className={styles.note}>
        Start-by time ek suggestion hai, promise nahi. Slack = bacha hua samay − estimated effort.
      </span>
    </div>
  );
}
