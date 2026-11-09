import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { eq, desc, like, and, gte, lte, sql, SQL } from "drizzle-orm";
import { requireAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAccess("administration.audit", "view");
    const url = new URL(req.url);
    const module = url.searchParams.get("module") ?? "";
    const action = url.searchParams.get("action") ?? "";
    const user = url.searchParams.get("user") ?? "";
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    const recordId = url.searchParams.get("recordId") ?? "";
    const limit = Math.min(500, Number(url.searchParams.get("limit") ?? 200));

    const where: SQL[] = [];
    if (module) where.push(eq(auditLogs.module, module));
    if (action) where.push(eq(auditLogs.action, action));
    if (recordId) where.push(eq(auditLogs.recordId, Number(recordId)));
    if (user) where.push(like(auditLogs.userName, `%${user}%`));
    if (from) where.push(gte(auditLogs.createdAt, new Date(from)));
    if (to) where.push(lte(auditLogs.createdAt, new Date(to + "T23:59:59")));

    let q: any = db.select().from(auditLogs);
    if (where.length) q = q.where(and(...where));
    q = q.orderBy(desc(auditLogs.createdAt)).limit(limit);
    const rows = await q;
    const [{ c: total }] = (await db
      .select({ c: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(where.length ? and(...where) : undefined)) as { c: number }[];

    return NextResponse.json({ ok: true, data: rows, meta: { total } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
