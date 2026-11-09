import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vouchers, voucherLines, analyticalDistributions, accounts, users, costCenters } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAccess } from "@/lib/access";
import { VOUCHER_TYPES, type VoucherType } from "@/lib/options";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAccess("accounting.vouchers", "view");
    const { id } = await params;
    const numId = Number(id);
    const [v] = await db
      .select({
        id: vouchers.id,
        voucherNo: vouchers.voucherNo,
        date: vouchers.date,
        type: vouchers.type,
        narration: vouchers.narration,
        totalAmount: vouchers.totalAmount,
        postedByName: users.fullName,
        createdAt: vouchers.createdAt,
      })
      .from(vouchers)
      .leftJoin(users, eq(vouchers.postedBy, users.id))
      .where(eq(vouchers.id, numId));
    if (!v) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const lines = await db
      .select({
        id: voucherLines.id,
        accountCode: accounts.code,
        accountName: accounts.name,
        accountType: accounts.type,
        costCenterName: costCenters.name,
        debit: voucherLines.debit,
        credit: voucherLines.credit,
        narration: voucherLines.narration,
      })
      .from(voucherLines)
      .leftJoin(accounts, eq(voucherLines.accountId, accounts.id))
      .leftJoin(costCenters, eq(voucherLines.costCenterId, costCenters.id))
      .where(eq(voucherLines.voucherId, numId))
      .orderBy(asc(voucherLines.id));

    const meta = VOUCHER_TYPES[v.type as VoucherType];

    const dists = await db
      .select({
        lineId: voucherLines.id,
        costCenterName: costCenters.name,
        percent: analyticalDistributions.percent,
        amount: analyticalDistributions.amount,
      })
      .from(analyticalDistributions)
      .innerJoin(voucherLines, eq(analyticalDistributions.voucherLineId, voucherLines.id))
      .leftJoin(costCenters, eq(analyticalDistributions.costCenterId, costCenters.id))
      .where(eq(voucherLines.voucherId, numId));

    return NextResponse.json({
      ok: true,
      data: { ...v, typeLabel: meta?.label ?? v.type, lines, distributions: dists },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
