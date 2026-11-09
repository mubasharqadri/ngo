import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { remoteApprovals, attendance, employees, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAccess } from "@/lib/access";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
const MODULE = "hrm.attendance";

function err(e: unknown) {
  const msg = e instanceof Error ? e.message : "Error";
  if (msg === "Unauthorized") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
  console.error(e);
  return NextResponse.json({ ok: false, error: msg }, { status: 500 });
}

export async function GET() {
  try {
    await requireAccess(MODULE, "view");
    const rows = await db
      .select({
        id: remoteApprovals.id,
        employeeId: remoteApprovals.employeeId,
        employeeName: employees.fullName,
        fromDate: remoteApprovals.fromDate,
        toDate: remoteApprovals.toDate,
        location: remoteApprovals.location,
        reason: remoteApprovals.reason,
        status: remoteApprovals.status,
        approvedByName: users.fullName,
        createdAt: remoteApprovals.createdAt,
      })
      .from(remoteApprovals)
      .leftJoin(employees, eq(remoteApprovals.employeeId, employees.id))
      .leftJoin(users, eq(remoteApprovals.approvedBy, users.id))
      .orderBy(desc(remoteApprovals.id))
      .limit(300);
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    return err(e);
  }
}

// Request remote/field duty
export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAccess(MODULE, "create");
    const body = await req.json();
    if (!body.employeeId || !body.fromDate || !body.toDate) {
      return NextResponse.json({ ok: false, error: "Employee, from and to dates are required" }, { status: 400 });
    }
    const [r] = await db
      .insert(remoteApprovals)
      .values({
        employeeId: Number(body.employeeId),
        fromDate: body.fromDate,
        toDate: body.toDate,
        location: body.location ?? null,
        reason: body.reason ?? null,
        status: "pending",
      })
      .returning();
    await logAudit({ userId: session.id, userName: session.name, module: MODULE, recordId: r.id, action: "create", changes: [{ field: "remote_request", oldValue: null, newValue: `${body.fromDate} → ${body.toDate} (${body.location ?? ""})` }] });
    return NextResponse.json({ ok: true, data: r });
  } catch (e) {
    return err(e);
  }
}

// Approve (auto-creates attendance rows) / reject
export async function PATCH(req: NextRequest) {
  try {
    const { session } = await requireAccess(MODULE, "edit");
    const id = Number(new URL(req.url).searchParams.get("id"));
    const body = await req.json();
    const status = String(body.status ?? "");
    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ ok: false, error: "Status must be approved or rejected" }, { status: 400 });
    }

    const [r] = await db.select().from(remoteApprovals).where(eq(remoteApprovals.id, id));
    if (!r) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    await db.update(remoteApprovals).set({ status, approvedBy: session.id }).where(eq(remoteApprovals.id, id));

    let autoMarked = 0;
    if (status === "approved") {
      // auto attendance for the period (skip weekends), mode = remote
      const start = new Date(r.fromDate + "T00:00:00");
      const end = new Date(r.toDate + "T00:00:00");
      const cur = new Date(start);
      while (cur <= end) {
        const day = cur.getDay();
        if (day !== 0 && day !== 6) {
          const dstr = cur.toISOString().slice(0, 10);
          const [ex] = await db.select({ id: attendance.id }).from(attendance).where(eq(attendance.employeeId, r.employeeId)).limit(1000);
          void ex;
          await db.insert(attendance).values({
            employeeId: r.employeeId,
            date: dstr,
            status: "present",
            checkIn: body.checkIn ?? "09:00",
            checkOut: body.checkOut ?? "17:00",
            notes: `Remote/field duty — ${r.location ?? ""} (auto from approval #${r.id})`,
            mode: "remote",
            remoteApprovalId: r.id,
          });
          autoMarked++;
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    await logAudit({
      userId: session.id, userName: session.name, module: MODULE, recordId: id, action: "update",
      changes: [{ field: "remote_approval", oldValue: r.status, newValue: status }, { field: "auto_attendance", oldValue: null, newValue: `${autoMarked} days marked` }],
    });
    return NextResponse.json({ ok: true, data: { status, autoMarked } });
  } catch (e) {
    return err(e);
  }
}
