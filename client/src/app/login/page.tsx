'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import styles from '../Auth.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();
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
    setSubmitting(true);

    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.authWrapper}>
      <div className={styles.authCard}>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Log in to check your upcoming deadlines</p>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="login-email">
              Email Address
            </label>
            <input
              id="login-email"
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
            <label className={styles.label} htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting}
          >
            {submitting ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className={styles.footerText}>
          Don't have an account?
          <Link href="/signup" className={styles.link}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
