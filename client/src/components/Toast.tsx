'use client';

import React, { useEffect } from 'react';
import styles from './Toast.module.css';

interface ToastProps {
  message: string;
  onUndo?: () => void;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, onUndo, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={styles.toastContainer}>
      <div className={styles.toast} role="alert">
        <span className={styles.message}>{message}</span>
        <div className={styles.actions}>
          {onUndo && (
            <button type="button" className={styles.undoBtn} onClick={onUndo}>
              Undo
            </button>
          )}
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Dismiss">
            ×
          </button>
        </div>
        <div className={styles.progressBar} style={{ animationDuration: `${duration}ms` }} />
      </div>
    </div>
  );
}
