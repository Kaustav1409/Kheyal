'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import styles from '../Auth.module.css';

export default function SignupPage() {
  const router = useRouter();
  const { user, signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      await signup(email, password, timezone);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.authWrapper}>
      <div className={styles.authCard}>
        <h1 className={styles.title}>Join Kheyal</h1>
        <p className={styles.subtitle}>Plan Smart. Move Forward.</p>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="signup-email">
              Email Address
            </label>
            <input
              id="signup-email"
              type="email"
              required
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.edu"
              autoComplete="email"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="signup-password">
              Password (min. 8 characters)
            </label>
            <input
              id="signup-password"
              type="password"
              required
              minLength={8}
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting}
          >
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className={styles.footerText}>
          Already have an account?
          <Link href="/login" className={styles.link}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
