import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { donationReceipts, receiptLines, receiptDistributions, donors, donees, costCenters, users } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAccess } from "@/lib/access";
import { logAudit, diffRows, snapshotChanges } from "@/lib/audit";

export const dynamic = "force-dynamic";
const MODULE = "donations.receipts";

function err(e: unknown) {
  const msg = e instanceof Error ? e.message : "Error";
  if (msg === "Unauthorized") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
  return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
}

// DETAIL — master + donor + detail lines + monthly distribution
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAccess(MODULE, "view");
    const { id } = await params;
    const numId = Number(id);
    const [r] = await db
      .select({
        id: donationReceipts.id,
        receiptNo: donationReceipts.receiptNo,
        receiptDate: donationReceipts.receiptDate,
        donationDate: donationReceipts.donationDate,
        donorId: donationReceipts.donorId,
        totalAmount: donationReceipts.totalAmount,
        restrictUseInFund: donationReceipts.restrictUseInFund,
        instrumentNo: donationReceipts.instrumentNo,
        instrumentDate: donationReceipts.instrumentDate,
        voucherNo: donationReceipts.voucherNo,
        voucherType: donationReceipts.voucherType,
        remarks: donationReceipts.remarks,
        createdAt: donationReceipts.createdAt,
        donorName: donors.name,
        donorCnic: donors.cnic,
        donorPhone: donors.phone,
        donorMobile: donors.mobileNo,
        donorEmail: donors.email,
        donorMembershipNo: donors.membershipNo,
        donorAddress: donors.address,
        donorCity: donors.city,
        issuedByName: users.fullName,
      })
      .from(donationReceipts)
      .leftJoin(donors, eq(donationReceipts.donorId, donors.id))
      .leftJoin(users, eq(donationReceipts.issuedBy, users.id))
      .where(eq(donationReceipts.id, numId));
    if (!r) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const lines = await db
      .select({
        id: receiptLines.id,
        serialNo: receiptLines.serialNo,
        doneeId: receiptLines.doneeId,
        doneeName: donees.name,
        categoryId: receiptLines.categoryId,
        categoryName: costCenters.name,
        amount: receiptLines.amount,
        remarks: receiptLines.remarks,
        fromDate: receiptLines.fromDate,
        toDate: receiptLines.toDate,
      })
      .from(receiptLines)
      .leftJoin(donees, eq(receiptLines.doneeId, donees.id))
      .leftJoin(costCenters, eq(receiptLines.categoryId, costCenters.id))
      .where(eq(receiptLines.receiptId, numId))
      .orderBy(asc(receiptLines.serialNo));

    const distribution = await db
      .select({
        id: receiptDistributions.id,
        serialNo: receiptDistributions.serialNo,
        month: receiptDistributions.month,
        doneeId: receiptDistributions.doneeId,
        doneeName: donees.name,
        categoryName: costCenters.name,
        amount: receiptDistributions.amount,
        remarks: receiptDistributions.remarks,
        fromDate: receiptDistributions.fromDate,
        toDate: receiptDistributions.toDate,
      })
      .from(receiptDistributions)
      .leftJoin(donees, eq(receiptDistributions.doneeId, donees.id))
      .leftJoin(costCenters, eq(receiptDistributions.categoryId, costCenters.id))
      .where(eq(receiptDistributions.receiptId, numId))
      .orderBy(asc(receiptDistributions.serialNo), asc(receiptDistributions.fromDate));

    return NextResponse.json({ ok: true, data: { ...r, lines, distribution } });
  } catch (e) {
    return err(e);
  }
}

// UPDATE master fields (with change log)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireAccess(MODULE, "edit");
    const { id } = await params;
    const numId = Number(id);
    const body = await req.json();
    const allowed: Record<string, unknown> = {};
    for (const k of ["receiptDate", "donationDate", "donorId", "restrictUseInFund", "instrumentNo", "instrumentDate", "voucherType", "remarks", "status"]) {
      if (k in body) allowed[k] = body[k];
    }
    const [oldRow] = await db.select().from(donationReceipts).where(eq(donationReceipts.id, numId));
    const [updated] = await db.update(donationReceipts).set(allowed).where(eq(donationReceipts.id, numId)).returning();
    const changes = diffRows((oldRow as Record<string, unknown>) ?? null, allowed);
    if (changes.length) {
      await logAudit({
        userId: session.id, userName: session.name, module: MODULE, recordId: numId,
        action: body.status === "cancelled" ? "cancel" : "update", changes,
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
    const [oldRow] = await db.select().from(donationReceipts).where(eq(donationReceipts.id, numId));
    await db.delete(donationReceipts).where(eq(donationReceipts.id, numId));
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
