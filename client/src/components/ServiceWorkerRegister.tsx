'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '../lib/pwa';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      registerServiceWorker();
    }
  }, []);

  return null;
}
