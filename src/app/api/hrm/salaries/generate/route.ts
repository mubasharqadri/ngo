import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { salaries, employees } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAccess } from "@/lib/access";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type GenRow = {
  employeeId: number;
  basic: number;
  allowances: number;
  deductions: number;
  otherDeductions: { description: string; amount: string }[];
  net: number;
};

/** Generate salary rows for a month (current/next) with custom deductions + descriptions. */
export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAccess("hrm.salaries", "create");
    const body = await req.json();
    const month = String(body.month ?? ""); // YYYY-MM
    const rows: GenRow[] = Array.isArray(body.rows) ? body.rows : [];
    if (!month || !rows.length) return NextResponse.json({ ok: false, error: "Month and rows required" }, { status: 400 });

    let created = 0;
    let skipped = 0;
    for (const r of rows) {
      const [existing] = await db.select({ id: salaries.id }).from(salaries).where(and(eq(salaries.employeeId, r.employeeId), eq(salaries.month, month)));
      if (existing) { skipped++; continue; }
      const otherTotal = (r.otherDeductions ?? []).reduce((s, o) => s + (Number(o.amount) || 0), 0);
      const net = Math.round((r.basic + r.allowances - r.deductions - otherTotal) * 100) / 100;
      await db.insert(salaries).values({
        employeeId: r.employeeId,
        month,
        basic: String(r.basic),
        allowances: String(r.allowances),
        deductions: String(Math.round((r.deductions + otherTotal) * 100) / 100),
        net: String(net),
        status: "draft",
        otherDeductions: r.otherDeductions ?? [],
      });
      created++;
    }
    await logAudit({
      userId: session.id, userName: session.name, module: "hrm.salaries", recordId: null, action: "create",
      changes: [{ field: "payroll_generated", oldValue: null, newValue: `${month}: ${created} rows created, ${skipped} skipped (existing)` }],
    });
    return NextResponse.json({ ok: true, data: { created, skipped, month } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}

/** Preview: active employees with computed payroll for the month */
export async function GET(req: NextRequest) {
  try {
    await requireAccess("hrm.salaries", "view");
    const month = new URL(req.url).searchParams.get("month") ?? "";
    const emps = await db.select().from(employees).where(eq(employees.status, "active"));
    const existing = month
      ? await db.select({ employeeId: salaries.employeeId }).from(salaries).where(eq(salaries.month, month))
      : [];
    const existingSet = new Set(existing.map((e) => e.employeeId));
    const rows = emps.map((e) => {
      const basic = Number(e.salary || 0);
      const allowances = Math.round(basic * 0.2);
      const deductions = Math.round(basic * 0.08);
      return {
        employeeId: e.id,
        employeeName: e.fullName,
        designation: e.designation,
        department: e.department,
        basic,
        allowances,
        deductions,
        net: basic + allowances - deductions,
        alreadyGenerated: existingSet.has(e.id),
      };
    });
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
