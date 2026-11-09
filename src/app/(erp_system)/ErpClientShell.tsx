"use client";

import { useSessionRefresher } from "@/hooks/useSessionRefresher";

export function ErpClientShell() {
  useSessionRefresher();
  return null;
}
