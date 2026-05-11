'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Force-check for a new sw.js on every app open — don't rely on browser heuristics
      registration.update();

      // When the user brings the app back to foreground, check again
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          registration.update();
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);

      // When a new SW takes control (skipWaiting fired), reload so the page
      // runs the fresh JS/CSS bundle rather than the stale cached version
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      return () => {
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }).catch(() => {});
  }, []);

  return null;
}
