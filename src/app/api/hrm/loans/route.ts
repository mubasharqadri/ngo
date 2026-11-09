import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { loans, employees, hrPolicies } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAccess } from "@/lib/access";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
const MODULE = "hrm.loans";

function err(e: unknown) {
  const msg = e instanceof Error ? e.message : "Error";
  if (msg === "Unauthorized") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
  if (msg.startsWith("POLICY:")) return NextResponse.json({ ok: false, error: msg.slice(7) }, { status: 400 });
  console.error(e);
  return NextResponse.json({ ok: false, error: msg }, { status: 500 });
}

async function getPolicies() {
  const rows = await db.select().from(hrPolicies);
  const map: Record<string, number> = {};
  for (const r of rows) map[r.key] = Number(r.value);
  return {
    loanMaxMonths: map.loanMaxMonths ?? 3, // management-approved cap: 1, 2 or 3 months' salary
    maxActiveLoans: map.maxActiveLoans ?? 2,
    maxInstallments: map.maxInstallments ?? 12, // never more than 1 year
  };
}

export async function GET(_req: NextRequest) {
  try {
    await requireAccess(MODULE, "view");
    const rows = await db
      .select({
        id: loans.id,
        employeeId: loans.employeeId,
        employeeName: employees.fullName,
        employeeSalary: employees.salary,
        amount: loans.amount,
        installments: loans.installments,
        monthlyDeduction: loans.monthlyDeduction,
        startDate: loans.startDate,
        status: loans.status,
      })
      .from(loans)
      .leftJoin(employees, eq(loans.employeeId, employees.id))
      .orderBy(desc(loans.id))
      .limit(500);
    const policies = await getPolicies();
    return NextResponse.json({ ok: true, data: rows, meta: { policies } });
  } catch (e) {
    return err(e);
  }
}

// CREATE with policy validation:
//  • no loan during probation
//  • max 2 active loans; total outstanding ≤ loanMaxMonths × salary
//  • installments ≤ 12 (1 year)
export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAccess(MODULE, "create");
    const body = await req.json();
    const empId = Number(body.employeeId);
    const amount = Number(body.amount) || 0;
    const installments = Number(body.installments) || 0;
    if (!empId || amount <= 0 || installments <= 0) {
      return NextResponse.json({ ok: false, error: "Employee, amount and installments are required" }, { status: 400 });
    }

    const pol = await getPolicies();
    const [emp] = await db.select().from(employees).where(eq(employees.id, empId));
    if (!emp) return NextResponse.json({ ok: false, error: "Employee not found" }, { status: 404 });
    const salary = Number(emp.salary || 0);

    // probation
    const joining = emp.dateOfJoining ? new Date(emp.dateOfJoining + "T00:00:00") : null;
    if (joining) {
      const probationEnd = new Date(joining.getFullYear(), joining.getMonth() + (emp.probationMonths ?? 3), joining.getDate());
      if (new Date() < probationEnd) {
        throw new Error("POLICY:No loan can be provided during the probation period.");
      }
    }

    if (installments > pol.maxInstallments) {
      throw new Error(`POLICY:Installments cannot exceed ${pol.maxInstallments} months (1 year).`);
    }

    const active = await db.select().from(loans).where(and(eq(loans.employeeId, empId), eq(loans.status, "active")));
    if (active.length >= pol.maxActiveLoans) {
      throw new Error(`POLICY:Maximum ${pol.maxActiveLoans} active loans allowed per employee. Settle an existing loan first.`);
    }
    const outstanding = active.reduce((s, l) => s + Number(l.amount), 0);
    const cap = salary * pol.loanMaxMonths;
    if (outstanding + amount > cap) {
      throw new Error(
        `POLICY:Loan limit is ${pol.loanMaxMonths} month(s) of salary (management approval) = PKR ${cap.toLocaleString()}. Outstanding: PKR ${outstanding.toLocaleString()}. Maximum new loan: PKR ${Math.max(cap - outstanding, 0).toLocaleString()}.`
      );
    }

    const monthly = Math.round((amount / installments) * 100) / 100;
    const [l] = await db
      .insert(loans)
      .values({
        employeeId: empId,
        amount: String(amount),
        installments,
        monthlyDeduction: String(monthly),
        startDate: body.startDate ?? new Date().toISOString().slice(0, 10),
        status: "active",
      })
      .returning();
    await logAudit({ userId: session.id, userName: session.name, module: MODULE, recordId: l.id, action: "create", changes: [{ field: "amount", oldValue: null, newValue: amount }, { field: "installments", oldValue: null, newValue: installments }] });
    return NextResponse.json({ ok: true, data: l });
  } catch (e) {
    return err(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { session } = await requireAccess(MODULE, "edit");
    const id = Number(new URL(req.url).searchParams.get("id"));
    const body = await req.json();
    const [u] = await db.update(loans).set(body).where(eq(loans.id, id)).returning();
    await logAudit({ userId: session.id, userName: session.name, module: MODULE, recordId: id, action: "update", changes: Object.entries(body).map(([f, v]) => ({ field: f, oldValue: null, newValue: v })) });
    return NextResponse.json({ ok: true, data: u });
  } catch (e) {
    return err(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { session } = await requireAccess(MODULE, "delete");
    const id = Number(new URL(req.url).searchParams.get("id"));
    await db.delete(loans).where(eq(loans.id, id));
    await logAudit({ userId: session.id, userName: session.name, module: MODULE, recordId: id, action: "delete", changes: [] });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return err(e);
  }
}
