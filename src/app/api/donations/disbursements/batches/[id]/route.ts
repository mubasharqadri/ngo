import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { disbursementBatches, disbursements, donees, donors, costCenters, users } from "@/db/schema";
import { eq, sql, asc } from "drizzle-orm";
import { requireAccess } from "@/lib/access";
import { logAudit, diffRows, snapshotChanges } from "@/lib/audit";
import { createVoucher } from "@/lib/posting";
import { VOUCHER_TYPES, type VoucherType } from "@/lib/options";

export const dynamic = "force-dynamic";
const MODULE = "donations.disbursements";

function err(e: unknown) {
  const msg = e instanceof Error ? e.message : "Error";
  if (msg === "Unauthorized") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
  console.error(e);
  return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
}

// DETAIL — batch + enriched lines
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAccess(MODULE, "view");
    const { id } = await params;
    const batchId = Number(id);
    const [batch] = await db
      .select({
        id: disbursementBatches.id,
        batchNo: disbursementBatches.batchNo,
        title: disbursementBatches.title,
        date: disbursementBatches.date,
        fund: disbursementBatches.fund,
        status: disbursementBatches.status,
        notes: disbursementBatches.notes,
        voucherNo: disbursementBatches.voucherNo,
        voucherType: disbursementBatches.voucherType,
        costCenterId: disbursementBatches.costCenterId,
        costCenterName: costCenters.name,
        approvedByName: users.fullName,
        approvedAt: disbursementBatches.approvedAt,
      })
      .from(disbursementBatches)
      .leftJoin(costCenters, eq(disbursementBatches.costCenterId, costCenters.id))
      .leftJoin(users, eq(disbursementBatches.approvedBy, users.id))
      .where(eq(disbursementBatches.id, batchId));
    if (!batch) return NextResponse.json({ ok: false, error: "Batch not found" }, { status: 404 });

    const items = await db
      .select({
        id: disbursements.id,
        donorReceiptNo: disbursements.donorReceiptNo,
        donorSerialNo: disbursements.donorSerialNo,
        donorReceiptDate: disbursements.donorReceiptDate,
        donorId: disbursements.donorId,
        donorName: donors.name,
        doneeId: disbursements.doneeId,
        doneeName: disbursements.doneeName,
        doneeLiveName: donees.name,
        doneeCnic: donees.cnic,
        doneePhone: donees.phone,
        doneeCategoryId: disbursements.doneeCategoryId,
        categoryName: costCenters.name,
        program: disbursements.program,
        instrumentNo: disbursements.instrumentNo,
        instrumentDate: disbursements.instrumentDate,
        paidAmount: disbursements.paidAmount,
        remarks: disbursements.remarks,
        generatedByName: users.fullName,
        generateDate: disbursements.generateDate,
        approvedBy: disbursements.approvedBy,
        approveDate: disbursements.approveDate,
        proceededBy: disbursements.proceededBy,
        proceedDate: disbursements.proceedDate,
      })
      .from(disbursements)
      .leftJoin(donors, eq(disbursements.donorId, donors.id))
      .leftJoin(donees, eq(disbursements.doneeId, donees.id))
      .leftJoin(costCenters, eq(disbursements.doneeCategoryId, costCenters.id))
      .leftJoin(users, eq(disbursements.generatedBy, users.id))
      .where(eq(disbursements.batchId, batchId))
      .orderBy(asc(disbursements.id));

    const [agg] = await db
      .select({
        total: sql<string>`coalesce(sum(${disbursements.paidAmount}::numeric), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(disbursements)
      .where(eq(disbursements.batchId, batchId));

    return NextResponse.json({ ok: true, data: { ...batch, totalAmount: Number(agg.total), count: agg.count, items } });
  } catch (e) {
    return err(e);
  }
}

// ADD LINE
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireAccess(MODULE, "edit");
    const { id } = await params;
    const batchId = Number(id);
    const body = await _req.json();
    const [inserted] = await db
      .insert(disbursements)
      .values({
        batchId,
        donorReceiptNo: body.donorReceiptNo || null,
        donorSerialNo: body.donorSerialNo ? Number(body.donorSerialNo) : null,
        donorReceiptDate: body.donorReceiptDate || null,
        donorId: body.donorId ?? null,
        doneeId: body.doneeId ?? null,
        doneeName: body.doneeName ?? null,
        doneeCategoryId: body.doneeCategoryId ?? null,
        program: body.program || null,
        instrumentNo: body.instrumentNo || null,
        instrumentDate: body.instrumentDate || null,
        paidAmount: String(Number(body.paidAmount) || 0),
        remarks: body.remarks || null,
        generatedBy: session.id,
        generateDate: new Date(),
      })
      .returning();
    await logAudit({
      userId: session.id, userName: session.name, module: MODULE, recordId: batchId, action: "update",
      changes: [{ field: "line_added", oldValue: null, newValue: `${body.doneeName ?? "donee"} — PKR ${body.paidAmount}` }],
    });
    return NextResponse.json({ ok: true, data: inserted });
  } catch (e) {
    return err(e);
  }
}

// WORKFLOW — approve / pay (auto-voucher) / cancel
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const status = String(body?.status ?? "");
    const action = status === "cancelled" ? "cancel" : "edit";
    const { session } = await requireAccess(MODULE, action);
    const batchId = Number(id);

    const [oldRow] = await db.select().from(disbursementBatches).where(eq(disbursementBatches.id, batchId));
    if (!oldRow) return NextResponse.json({ ok: false, error: "Batch not found" }, { status: 404 });

    const patch: Record<string, unknown> = {};
    if (["approved", "paid", "cancelled", "draft"].includes(status)) patch.status = status;
    if (body.voucherType !== undefined) patch.voucherType = body.voucherType || null;
    if (body.notes !== undefined) patch.notes = body.notes;

    let voucherNo = oldRow.voucherNo;

    if (status === "approved") {
      patch.approvedBy = session.id;
      patch.approvedAt = new Date();
      await db.update(disbursements).set({ approvedBy: session.id, approveDate: new Date() }).where(eq(disbursements.batchId, batchId));
    }

    if (status === "paid") {
      patch.approvedBy = oldRow.approvedBy ?? session.id;
      patch.approvedAt = oldRow.approvedAt ?? new Date();
      // auto double-entry payment voucher (CPV/BPV) once, when batch is paid
      if (oldRow.voucherType && VOUCHER_TYPES[oldRow.voucherType as VoucherType] && !oldRow.voucherNo) {
        const [agg] = await db
          .select({ total: sql<string>`coalesce(sum(${disbursements.paidAmount}::numeric), 0)` })
          .from(disbursements)
          .where(eq(disbursements.batchId, batchId));
        const total = Number(agg.total);
        if (total > 0) {
          const meta = VOUCHER_TYPES[oldRow.voucherType as VoucherType];
          const v = await createVoucher({
            type: oldRow.voucherType as VoucherType,
            date: oldRow.date,
            narration: `Disbursement batch ${oldRow.batchNo} — ${oldRow.title}`,
            postedBy: session.id,
            lines: [
              { accountCode: "4000", debit: total, credit: 0, narration: "Welfare disbursement" },
              { accountCode: meta.cashAccount || "1000", debit: 0, credit: total, narration: "Paid out" },
            ],
          });
          voucherNo = v.voucherNo;
          patch.voucherNo = v.voucherNo;
        }
      }
      await db
        .update(disbursements)
        .set({ proceededBy: session.id, proceedDate: new Date(), approvedBy: oldRow.approvedBy ?? session.id, approveDate: oldRow.approvedAt ?? new Date() })
        .where(eq(disbursements.batchId, batchId));
    }

    const [updated] = await db.update(disbursementBatches).set(patch).where(eq(disbursementBatches.id, batchId)).returning();
    const changes = diffRows(oldRow as Record<string, unknown>, patch);
    if (voucherNo && voucherNo !== oldRow.voucherNo) {
      changes.push({ field: "voucherNo", oldValue: null, newValue: voucherNo });
    }
    if (changes.length) {
      await logAudit({
        userId: session.id, userName: session.name, module: MODULE, recordId: batchId,
        action: status === "cancelled" ? "cancel" : "update", changes,
      });
    }
    return NextResponse.json({ ok: true, data: updated });
  } catch (e) {
    return err(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireAccess(MODULE, "delete");
    const { id } = await params;
    const numId = Number(id);
    const [oldRow] = await db.select().from(disbursementBatches).where(eq(disbursementBatches.id, numId));
    await db.delete(disbursementBatches).where(eq(disbursementBatches.id, numId));
    if (oldRow) {
      await logAudit({
        userId: session.id, userName: session.name, module: MODULE, recordId: numId, action: "delete",
        changes: snapshotChanges(oldRow as Record<string, unknown>, "delete"),
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return err(e);
  }
}
