import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { nadraRecords } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

/**
 * CNIC verification against the (simulated) NADRA database.
 * Returns the identity record when found, 404 otherwise — the form then
 * simply lets the officer continue to the next column.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAccess("hrm.employees", "view");
    const cnic = (new URL(req.url).searchParams.get("cnic") ?? "").trim();
    if (!cnic) return NextResponse.json({ ok: false, error: "CNIC required" }, { status: 400 });

    const normalized = cnic.replace(/[\s-]/g, "");
    const [rec] = await db
      .select()
      .from(nadraRecords)
      .where(eq(nadraRecords.cnic, normalized));

    if (!rec) {
      // also try the formatted variant 35201-1234567-8
      const fmt =
        normalized.length === 13
          ? `${normalized.slice(0, 5)}-${normalized.slice(5, 12)}-${normalized.slice(12)}`
          : normalized;
      const [rec2] = await db.select().from(nadraRecords).where(eq(nadraRecords.cnic, fmt));
      if (!rec2) return NextResponse.json({ ok: false, error: "CNIC not found in NADRA database" }, { status: 404 });
      return NextResponse.json({ ok: true, data: rec2 });
    }
    return NextResponse.json({ ok: true, data: rec });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
