import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { taxSlabs } from "@/db/schema";
import { asc } from "drizzle-orm";
import { requireAccess } from "@/lib/access";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Pakistan salary income-tax slabs (annual amounts) — editable per organization need. */
export async function GET() {
  try {
    await requireAccess("hrm.salaries", "view");
    const rows = await db.select().from(taxSlabs).orderBy(asc(taxSlabs.slabOrder));
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}

/** Replace all slabs (editable tax table from the payroll page). */
export async function PUT(req: NextRequest) {
  try {
    const { session } = await requireAccess("hrm.salaries", "edit");
    const body = await req.json();
    const slabs: { minAmount: number; maxAmount: number | null; fixedTax: number; ratePercent: number }[] = Array.isArray(body.slabs) ? body.slabs : [];
    if (!slabs.length) return NextResponse.json({ ok: false, error: "At least one slab required" }, { status: 400 });

    await db.delete(taxSlabs);
    await db.insert(taxSlabs).values(
      slabs.map((s, i) => ({
        slabOrder: i + 1,
        minAmount: String(s.minAmount),
        maxAmount: s.maxAmount === null || s.maxAmount === undefined ? null : String(s.maxAmount),
        fixedTax: String(s.fixedTax ?? 0),
        ratePercent: String(s.ratePercent),
      }))
    );
    await logAudit({
      userId: session.id, userName: session.name, module: "hrm.salaries", recordId: null, action: "update",
      changes: [{ field: "tax_slabs", oldValue: null, newValue: `${slabs.length} slabs updated` }],
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
