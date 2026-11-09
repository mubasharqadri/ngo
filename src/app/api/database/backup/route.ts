import { NextResponse } from "next/server";
import { db } from "@/db";
import { requireAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAccess("database.backup", "view");
    const result = await db.execute<{ table: string; rows: number }>(`
      SELECT relname as table, n_live_tup::int as rows
      FROM pg_stat_user_tables
      WHERE relname NOT LIKE 'pg_%'
      ORDER BY n_live_tup DESC
    ` as never);
    return NextResponse.json({ ok: true, data: result.rows });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
