import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { volunteers } from "@/db/schema";
import { asc } from "drizzle-orm";
import { requireAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

/** ERP-side list of registered volunteers (for mission assignment). */
export async function GET(_req: NextRequest) {
  try {
    await requireAccess("missions", "view");
    const rows = await db.select().from(volunteers).orderBy(asc(volunteers.id)).limit(500);
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
