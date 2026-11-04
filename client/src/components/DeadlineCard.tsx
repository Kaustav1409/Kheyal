'use client';

import React from 'react';
import { Deadline } from '../types';
import { formatDue, getCountdown } from '../lib/dateUtils';
import styles from './DeadlineCard.module.css';

interface DeadlineCardProps {
  deadline: Deadline;
  onToggleStatus?: (id: string, newStatus: 'active' | 'completed') => void;
  onEdit?: (deadline: Deadline) => void;
  onDelete?: (id: string) => void;
  showCheckbox?: boolean;
}

export function DeadlineCard({
  deadline,
  onToggleStatus,
  onEdit,
  onDelete,
  showCheckbox = true,
}: DeadlineCardProps) {
  const isCompleted = deadline.status === 'completed';
  const countdown = getCountdown(deadline.dueAt);
  const isOverdue = !isCompleted && (deadline.isOverdue || countdown.isOverdue);

  return (
    <div className={`${styles.card} ${isCompleted ? styles.cardCompleted : ''}`}>
      {showCheckbox && (
        <div className={styles.checkboxContainer}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={isCompleted}
            onChange={() => {
              if (onToggleStatus) {
                onToggleStatus(deadline.id, isCompleted ? 'active' : 'completed');
              }
            }}
            aria-label={isCompleted ? 'Mark active' : 'Mark completed'}
          />
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.headerRow}>
          <h3 className={`${styles.title} ${isCompleted ? styles.completedTitle : ''}`}>
            {deadline.title}
          </h3>
          {deadline.subject && (
            <span className={styles.subjectChip}>{deadline.subject}</span>
          )}
        </div>

        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            📅 {formatDue(deadline.dueAt, deadline.hasDueTime)}
          </span>

          {countdown.text && !isCompleted && (
            <span className={`${styles.metaItem} ${isOverdue ? styles.overdueBadge : ''}`}>
              ⏱️ {countdown.text}
            </span>
          )}

          {deadline.effortHours != null ? (
            <span className={styles.metaItem}>
              ⏳ ~{deadline.effortHours}h effort
            </span>
          ) : !isCompleted && (
            <span className={styles.metaItem} style={{ color: 'var(--color-ink-muted)' }}>
              ⏳ No estimate
            </span>
          )}

          {isCompleted && deadline.completedAt && (
            <span className={styles.metaItem} style={{ color: 'var(--color-success)' }}>
              ✓ Completed {new Date(deadline.completedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        {onEdit && (
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => onEdit(deadline)}
            title="Edit deadline"
            aria-label="Edit"
          >
            ✏️
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.deleteBtn}`}
            onClick={() => onDelete(deadline.id)}
            title="Delete deadline"
            aria-label="Delete"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}
