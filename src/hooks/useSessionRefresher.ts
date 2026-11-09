"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Periodically refreshes the session by calling /api/auth/refresh.
 * Falls back to login page if refresh fails.
 */
export function useSessionRefresher(intervalMs = 10 * 60 * 1000) {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await fetch("/api/auth/refresh", { credentials: "include" });
        if (!res.ok && res.status === 401 && !cancelled) {
          router.replace("/login");
        }
      } catch {
        // ignore transient errors
      }
    };
    const id = setInterval(refresh, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [router, intervalMs]);
}
