import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { advances, employees, attendance, hrPolicies, users } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAccess } from "@/lib/access";
import { logAudit } from "@/lib/audit";
import { createVoucher } from "@/lib/posting";

export const dynamic = "force-dynamic";
const MODULE = "hrm.advances";

function err(e: unknown) {
  const msg = e instanceof Error ? e.message : "Error";
  if (msg === "Unauthorized") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
  if (msg.startsWith("POLICY:")) return NextResponse.json({ ok: false, error: msg.slice(7) }, { status: 400 });
  console.error(e);
  return NextResponse.json({ ok: false, error: msg }, { status: 500 });
}

async function getPolicy(key: string, fallback: number) {
  const [p] = await db.select().from(hrPolicies).where(eq(hrPolicies.key, key));
  return p ? Number(p.value) : fallback;
}

// LIST (with employee names + approval info + policies)
export async function GET(_req: NextRequest) {
  try {
    await requireAccess(MODULE, "view");
    const rows = await db
      .select({
        id: advances.id,
        employeeId: advances.employeeId,
        employeeName: employees.fullName,
        employeeSalary: employees.salary,
        amount: advances.amount,
        purpose: advances.purpose,
        date: advances.date,
        status: advances.status,
        advanceType: advances.advanceType,
        approvedByName: users.fullName,
        approvedAt: advances.approvedAt,
        voucherId: advances.voucherId,
        voucherNo: advances.voucherNo,
      })
      .from(advances)
      .leftJoin(employees, eq(advances.employeeId, employees.id))
      .leftJoin(users, eq(advances.approvedBy, users.id))
      .orderBy(desc(advances.id))
      .limit(500);
    const midMonthPct = await getPolicy("advanceMidMonthPct", 50);
    return NextResponse.json({ ok: true, data: rows, meta: { policies: { advanceMidMonthPct: midMonthPct } } });
  } catch (e) {
    return err(e);
  }
}

// CREATE with policy validation:
//  • advance ≤ monthly salary; after 15th of month ≤ 50% of salary
//  • during probation: only pro-rata of attended days (and nothing beyond that)
export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAccess(MODULE, "create");
    const body = await req.json();
    const empId = Number(body.employeeId);
    const amount = Number(body.amount) || 0;
    if (!empId || amount <= 0) return NextResponse.json({ ok: false, error: "Employee and a positive amount are required" }, { status: 400 });

    const [emp] = await db.select().from(employees).where(eq(employees.id, empId));
    if (!emp) return NextResponse.json({ ok: false, error: "Employee not found" }, { status: 404 });
    const salary = Number(emp.salary || 0);

    // probation check
    const joining = emp.dateOfJoining ? new Date(emp.dateOfJoining + "T00:00:00") : null;
    const probationMonths = emp.probationMonths ?? 3;
    const now = new Date();
    let onProbation = false;
    if (joining) {
      const probationEnd = new Date(joining.getFullYear(), joining.getMonth() + probationMonths, joining.getDate());
      onProbation = now < probationEnd;
    }

    if (onProbation) {
      // allowed = (attended days / working days elapsed) × salary
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const [att] = await db
        .select({
          present: sql<number>`count(*) FILTER (WHERE ${attendance.status} = 'present')::int`,
          working: sql<number>`count(*)::int`,
        })
        .from(attendance)
        .where(and(eq(attendance.employeeId, empId), sql`${attendance.date} >= ${monthStart.toISOString().slice(0, 10)}`));
      const workingDays = Math.max(att?.working ?? 0, 1);
      const attended = att?.present ?? 0;
      const cap = Math.floor((salary * attended) / workingDays);
      if (amount > cap) {
        throw new Error(`POLICY:Employee is on probation (${probationMonths} months). Advance is limited to pro-rata attended days: attended ${attended}/${workingDays} days → maximum PKR ${cap.toLocaleString()}.`);
      }
    } else {
      const midMonthPct = await getPolicy("advanceMidMonthPct", 50);
      const dayOfMonth = now.getDate();
      const cap = dayOfMonth > 15 ? (salary * midMonthPct) / 100 : salary;
      // total outstanding advances this month + new must not exceed cap
      const [sum] = await db
        .select({ total: sql<string>`coalesce(sum(${advances.amount}::numeric), 0)` })
        .from(advances)
        .where(and(eq(advances.employeeId, empId), sql`to_char(${advances.date}::date, 'YYYY-MM') = ${monthKeyOf(now)}`, sql`${advances.status} != 'settled'`));
      const outstanding = Number(sum.total);
      if (outstanding + amount > cap) {
        throw new Error(
          `POLICY:Advance limit exceeded. Salary PKR ${salary.toLocaleString()}${dayOfMonth > 15 ? ` — after the 15th only ${midMonthPct}% (PKR ${cap.toLocaleString()}) is allowed` : ""}. Already outstanding this month: PKR ${outstanding.toLocaleString()}. Maximum new advance: PKR ${Math.max(cap - outstanding, 0).toLocaleString()}.`
        );
      }
    }

    const [a] = await db
      .insert(advances)
      .values({
        employeeId: empId,
        amount: String(amount),
        purpose: body.purpose ?? null,
        date: body.date ?? new Date().toISOString().slice(0, 10),
        advanceType: body.advanceType ?? "for-month",
        status: "pending",
      })
      .returning();
    await logAudit({ userId: session.id, userName: session.name, module: MODULE, recordId: a.id, action: "create", changes: [{ field: "amount", oldValue: null, newValue: amount }, { field: "advanceType", oldValue: null, newValue: a.advanceType }] });
    return NextResponse.json({ ok: true, data: a });
  } catch (e) {
    return err(e);
  }
}

function monthKeyOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// UPDATE — approval (HR / admin authority only, per rights) posts the payment voucher automatically
export async function PATCH(req: NextRequest) {
  try {
    const { session } = await requireAccess(MODULE, "edit");
    const id = Number(new URL(req.url).searchParams.get("id"));
    const body = await req.json();

    const [existing] = await db.select().from(advances).where(eq(advances.id, id));
    if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const patch: Record<string, unknown> = { ...body };

    if (body.status === "approved" && existing.status === "pending") {
      patch.approvedBy = session.id;
      patch.approvedAt = new Date();
      // post double-entry voucher: Dr Staff Advances (1200) / Cr Cash in Hand (1000)
      if (!existing.voucherNo) {
        const [emp] = await db.select({ fullName: employees.fullName }).from(employees).where(eq(employees.id, existing.employeeId));
        const v = await createVoucher({
          type: "CPV",
          date: existing.date,
          narration: `Salary advance paid to ${emp?.fullName ?? `employee #${existing.employeeId}`} — ${existing.advanceType}`,
          postedBy: session.id,
          lines: [
            { accountCode: "1200", debit: Number(existing.amount), credit: 0, narration: "Advance receivable" },
            { accountCode: "1000", debit: 0, credit: Number(existing.amount), narration: "Cash paid" },
          ],
        });
        patch.voucherId = v.voucherId;
        patch.voucherNo = v.voucherNo;
      }
    }

    const [u] = await db.update(advances).set(patch).where(eq(advances.id, id)).returning();
    await logAudit({
      userId: session.id, userName: session.name, module: MODULE, recordId: id,
      action: body.status === "approved" ? "update" : "update",
      changes: Object.entries(patch).map(([f, v]) => ({ field: f, oldValue: (existing as Record<string, unknown>)[f] ?? null, newValue: v })),
    });
    return NextResponse.json({ ok: true, data: u });
  } catch (e) {
    return err(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { session } = await requireAccess(MODULE, "delete");
    const id = Number(new URL(req.url).searchParams.get("id"));
    await db.delete(advances).where(eq(advances.id, id));
    await logAudit({ userId: session.id, userName: session.name, module: MODULE, recordId: id, action: "delete", changes: [] });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return err(e);
  }
}
