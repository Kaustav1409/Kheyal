'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import styles from './Navbar.module.css';

export function Navbar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand}>
            <span className={styles.logo}>Kheयाl</span>
            <span className={styles.tagline}>Socho. Plan karo. Kar dikhao.</span>
          </Link>

          {!isAuthPage && (
            <nav className={styles.navDesktop}>
              <Link href="/" className={`${styles.navLink} ${pathname === '/' ? styles.active : ''}`}>
                Do this next
              </Link>
              <Link href="/add" className={`${styles.navLink} ${pathname === '/add' ? styles.active : ''}`}>
                + Add deadline
              </Link>
              <Link href="/deadlines" className={`${styles.navLink} ${pathname === '/deadlines' ? styles.active : ''}`}>
                All deadlines
              </Link>
              <Link href="/settings" className={`${styles.navLink} ${pathname === '/settings' ? styles.active : ''}`}>
                Settings
              </Link>
            </nav>
          )}

          {isAuthPage && (
            <div className={styles.navDesktop}>
              {pathname === '/login' ? (
                <Link href="/signup" className={styles.navLink}>
                  Sign up
                </Link>
              ) : (
                <Link href="/login" className={styles.navLink}>
                  Log in
                </Link>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Mobile Sticky Bottom Navigation */}
      {!isAuthPage && (
        <nav className={styles.bottomBar}>
          <Link href="/" className={`${styles.mobileTab} ${pathname === '/' ? styles.mobileTabActive : ''}`}>
            <span className={styles.tabIcon}>⚡</span>
            <span>Do next</span>
          </Link>
          <Link href="/add" className={`${styles.mobileTab} ${pathname === '/add' ? styles.mobileTabActive : ''}`}>
            <span className={styles.tabIcon}>➕</span>
            <span>Add</span>
          </Link>
          <Link href="/deadlines" className={`${styles.mobileTab} ${pathname === '/deadlines' ? styles.mobileTabActive : ''}`}>
            <span className={styles.tabIcon}>📋</span>
            <span>All</span>
          </Link>
          <Link href="/settings" className={`${styles.mobileTab} ${pathname === '/settings' ? styles.mobileTabActive : ''}`}>
            <span className={styles.tabIcon}>⚙️</span>
            <span>Settings</span>
          </Link>
        </nav>
      )}
    </>
  );
}
