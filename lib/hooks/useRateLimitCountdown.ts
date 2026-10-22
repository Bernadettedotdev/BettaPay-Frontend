'use client';

import { useEffect } from 'react';
import { useRateLimitStore } from '../store/rateLimitStore';

/** Keep the shared countdown current while a rate-limit window is active. */
export function useRateLimitCountdown() {
  const rateLimitedUntil = useRateLimitStore((state) => state.rateLimitedUntil);
  const tick = useRateLimitStore((state) => state.tick);

  useEffect(() => {
    if (rateLimitedUntil <= 0) return;

    // Reconcile persisted windows immediately, including ones that expired
    // while the app was closed. Each tick uses the epoch to avoid timer drift.
    tick();
    if (rateLimitedUntil <= Date.now()) return;

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [rateLimitedUntil, tick]);
}
