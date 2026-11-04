import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string;
  height?: string;
  count?: number;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = '1rem', count = 1, style }: SkeletonProps) {
  if (count > 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', ...style }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={styles.skeleton} style={{ width, height }} />
        ))}
      </div>
    );
  }
  return <div className={styles.skeleton} style={{ width, height, ...style }} />;
}

export function CardSkeleton() {
  return (
    <div className={styles.cardSkeleton}>
      <Skeleton width="40%" height="1.25rem" />
      <Skeleton width="85%" height="1.75rem" />
      <Skeleton width="60%" height="1rem" />
      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
        <Skeleton width="5rem" height="2rem" />
        <Skeleton width="5rem" height="2rem" />
      </div>
    </div>
  );
}
