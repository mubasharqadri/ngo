import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export type AuditChange = { field: string; oldValue: unknown; newValue: unknown };

const SENSITIVE = /password|hash|secret|token/i;

function mask(key: string, value: unknown): unknown {
  if (SENSITIVE.test(key) && value !== null && value !== undefined && value !== "") return "••••••";
  return value ?? null;
}

/** Compute field-level diff between old and new rows (used for update audit). */
export function diffRows(
  oldRow: Record<string, unknown> | null,
  newRow: Record<string, unknown>
): AuditChange[] {
  const changes: AuditChange[] = [];
  if (!oldRow) return Object.keys(newRow).map((k) => ({ field: k, oldValue: null, newValue: mask(k, newRow[k]) }));
  for (const key of Object.keys(newRow)) {
    if (key === "id" || key === "createdAt" || key === "updatedAt") continue;
    const a = oldRow[key];
    const b = newRow[key];
    const as = a === null || a === undefined ? "" : typeof a === "object" ? JSON.stringify(a) : String(a);
    const bs = b === null || b === undefined ? "" : typeof b === "object" ? JSON.stringify(b) : String(b);
    if (as !== bs) {
      changes.push({ field: key, oldValue: mask(key, a), newValue: mask(key, b) });
    }
  }
  return changes;
}

/** Rows flattened for create/delete audit */
export function snapshotChanges(row: Record<string, unknown>, mode: "create" | "delete"): AuditChange[] {
  return Object.keys(row)
    .filter((k) => k !== "id" && k !== "createdAt")
    .map((k) => ({
      field: k,
      oldValue: mode === "delete" ? mask(k, row[k]) : null,
      newValue: mode === "create" ? mask(k, row[k]) : null,
    }));
}

export async function logAudit(entry: {
  userId?: number | null;
  userName?: string | null;
  module: string;
  recordId?: number | null;
  action: string;
  changes?: AuditChange[];
  ipAddress?: string | null;
}) {
  try {
    await db.insert(auditLogs).values({
      userId: entry.userId ?? null,
      userName: entry.userName ?? null,
      module: entry.module,
      recordId: entry.recordId ?? null,
      action: entry.action,
      changes: entry.changes ?? [],
      ipAddress: entry.ipAddress ?? null,
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
