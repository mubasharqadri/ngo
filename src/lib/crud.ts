import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eq, desc, sql, like, or, and, SQL } from "drizzle-orm";
import { requireAccess } from "@/lib/access";
import { logAudit, diffRows, snapshotChanges } from "@/lib/audit";

type AnyTable = Record<string, unknown>;

export type CrudConfig = {
  table: AnyTable;
  /** Permission module key, e.g. "donations.donors" */
  module: string;
  searchFields?: unknown[];
  orderBy?: unknown;
  defaultOrder?: "asc" | "desc";
  beforeInsert?: (data: Record<string, unknown>, ctx: { userId: number }) => Record<string, unknown> | Promise<Record<string, unknown>>;
  beforeUpdate?: (data: Record<string, unknown>, ctx: { userId: number }) => Record<string, unknown> | Promise<Record<string, unknown>>;
  listQuery?: (q: { search?: string; params: URLSearchParams }) => Promise<unknown[]>;
};

function mapError(e: unknown) {
  const msg = e instanceof Error ? e.message : "Error";
  if (msg === "Unauthorized") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "You do not have permission for this action" }, { status: 403 });
  console.error("API error", e);
  return NextResponse.json({ ok: false, error: msg }, { status: 500 });
}

export function makeCrud(config: CrudConfig) {
  const t = config.table as unknown as { id: unknown };
  const idCol = t.id as never;
  const columns = Object.keys(config.table);

  const cleanPayload = (payload: Record<string, unknown>) => {
    const clean: Record<string, unknown> = {};
    for (const k of columns) {
      if (k in payload) clean[k] = (payload as Record<string, unknown>)[k];
    }
    delete clean.id;
    delete clean.createdAt;
    return clean;
  };

  return {
    async GET(req: NextRequest) {
      try {
        await requireAccess(config.module, "view");
        const url = new URL(req.url);
        const search = url.searchParams.get("search") ?? "";
        const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
        const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? 200)));

        if (config.listQuery) {
          const rows = await config.listQuery({ search, params: url.searchParams });
          return NextResponse.json({ ok: true, data: rows });
        }

        const where: SQL[] = [];
        if (search && config.searchFields?.length) {
          where.push(or(...(config.searchFields as never[]).map((f) => like(f as never, `%${search}%`))) as SQL);
        }
        // generic exact-match filters: ?countryId=5&status=active (column names only)
        const RESERVED = new Set(["search", "page", "limit"]);
        for (const [k, v] of url.searchParams.entries()) {
          if (RESERVED.has(k)) continue;
          const col = (config.table as Record<string, unknown>)[k];
          if (col) where.push(eq(col as never, v));
        }

        const orderCol = (config.orderBy ?? idCol) as never;
        const orderDir = config.defaultOrder ?? "desc";

        let q: any = db.select().from(config.table as never);
        if (where.length) q = q.where(and(...where));
        if (orderDir === "desc") q = q.orderBy(desc(orderCol));
        else q = q.orderBy(orderCol);
        q = q.limit(limit).offset((page - 1) * limit);
        const rows = (await q) as unknown[];

        let countQ: any = db.select({ c: sql<number>`count(*)::int` }).from(config.table as never);
        if (where.length) countQ = countQ.where(and(...where));
        const countRows = (await countQ) as { c: number }[];
        return NextResponse.json({ ok: true, data: rows, meta: { total: countRows[0]?.c ?? 0, page, limit } });
      } catch (e) {
        return mapError(e);
      }
    },

    async POST(req: NextRequest) {
      try {
        const { session } = await requireAccess(config.module, "create");
        const body = await req.json();

        // ---------- BULK IMPORT (array payload) ----------
        if (Array.isArray(body)) {
          await requireAccess(config.module, "import");
          let imported = 0;
          const errors: string[] = [];
          for (let i = 0; i < body.length; i++) {
            try {
              const payload = config.beforeInsert ? await config.beforeInsert(body[i] ?? {}, { userId: session.id }) : body[i];
              const clean = cleanPayload(payload ?? {});
              if (!Object.keys(clean).length) { errors.push(`Row ${i + 1}: empty`); continue; }
              const [inserted] = (await db.insert(config.table as never).values(clean as never).returning()) as { id: number }[];
              await logAudit({
                userId: session.id, userName: session.name, module: config.module,
                recordId: inserted.id, action: "import", changes: snapshotChanges(clean, "create"),
                ipAddress: req.headers.get("x-forwarded-for"),
              });
              imported++;
            } catch (err) {
              errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message.slice(0, 120) : "failed"}`);
            }
          }
          return NextResponse.json({ ok: true, data: { imported, errors: errors.slice(0, 20), total: body.length } });
        }

        // ---------- SINGLE CREATE ----------
        const payload = config.beforeInsert ? await config.beforeInsert(body, { userId: session.id }) : body;
        const clean = cleanPayload(payload);
        const [inserted] = (await db.insert(config.table as never).values(clean as never).returning()) as Record<string, unknown>[];
        await logAudit({
          userId: session.id, userName: session.name, module: config.module,
          recordId: Number((inserted as { id?: number }).id ?? 0), action: "create",
          changes: snapshotChanges(clean, "create"), ipAddress: req.headers.get("x-forwarded-for"),
        });
        return NextResponse.json({ ok: true, data: inserted });
      } catch (e) {
        return mapError(e);
      }
    },

    async PATCH(req: NextRequest) {
      try {
        const { session } = await requireAccess(config.module, "edit");
        const url = new URL(req.url);
        const id = Number(url.searchParams.get("id"));
        if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
        const body = (await req.json()) as Record<string, unknown>;

        // fetch old row for change log
        const oldRows = (await db.select().from(config.table as never).where(eq(idCol as never, id))) as Record<string, unknown>[];
        const oldRow = oldRows[0] ?? null;

        const payload = config.beforeUpdate ? await config.beforeUpdate(body, { userId: session.id }) : body;
        const clean = cleanPayload(payload);
        const [updated] = (await db.update(config.table as never).set(clean as never).where(eq(idCol as never, id)).returning()) as Record<string, unknown>[];

        const changes = diffRows(oldRow as Record<string, unknown> | null, clean);
        if (changes.length) {
          await logAudit({
            userId: session.id, userName: session.name, module: config.module,
            recordId: id, action: "update", changes, ipAddress: req.headers.get("x-forwarded-for"),
          });
        }
        return NextResponse.json({ ok: true, data: updated });
      } catch (e) {
        return mapError(e);
      }
    },

    async DELETE(req: NextRequest) {
      try {
        const { session } = await requireAccess(config.module, "delete");
        const url = new URL(req.url);
        const id = Number(url.searchParams.get("id"));
        if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

        const oldRows = (await db.select().from(config.table as never).where(eq(idCol as never, id))) as Record<string, unknown>[];
        await db.delete(config.table as never).where(eq(idCol as never, id));
        if (oldRows[0]) {
          await logAudit({
            userId: session.id, userName: session.name, module: config.module,
            recordId: id, action: "delete", changes: snapshotChanges(oldRows[0], "delete"),
            ipAddress: req.headers.get("x-forwarded-for"),
          });
        }
        return NextResponse.json({ ok: true });
      } catch (e) {
        return mapError(e);
      }
    },
  };
}
