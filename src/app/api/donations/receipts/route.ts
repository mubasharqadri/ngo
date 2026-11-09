import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { donationReceipts, receiptLines, receiptDistributions, donors } from "@/db/schema";
import { desc, like, or, sql } from "drizzle-orm";
import { requireAccess } from "@/lib/access";
import { logAudit } from "@/lib/audit";
import { createVoucher, splitByMonth } from "@/lib/posting";
import { VOUCHER_TYPES, type VoucherType } from "@/lib/options";

export const dynamic = "force-dynamic";
const MODULE = "donations.receipts";

function err(e: unknown) {
  const msg = e instanceof Error ? e.message : "Error";
  if (msg === "Unauthorized") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
  console.error(e);
  return NextResponse.json({ ok: false, error: msg }, { status: msg.startsWith("Voucher") || msg.startsWith("Each") ? 400 : 500 });
}

// LIST — with donor name
export async function GET(req: NextRequest) {
  try {
    await requireAccess(MODULE, "view");
    const search = new URL(req.url).searchParams.get("search") ?? "";
    let q: any = db
      .select({
        id: donationReceipts.id,
        receiptNo: donationReceipts.receiptNo,
        receiptDate: donationReceipts.receiptDate,
        donationDate: donationReceipts.donationDate,
        donorId: donationReceipts.donorId,
        donorName: donors.name,
        totalAmount: donationReceipts.totalAmount,
        restrictUseInFund: donationReceipts.restrictUseInFund,
        instrumentNo: donationReceipts.instrumentNo,
        instrumentDate: donationReceipts.instrumentDate,
        voucherNo: donationReceipts.voucherNo,
        voucherType: donationReceipts.voucherType,
        remarks: donationReceipts.remarks,
      })
      .from(donationReceipts)
      .leftJoin(donors, sql`${donationReceipts.donorId} = ${donors.id}`);
    if (search) {
      q = q.where(
        or(
          like(donationReceipts.receiptNo, `%${search}%`),
          like(donationReceipts.instrumentNo, `%${search}%`),
          like(donationReceipts.remarks, `%${search}%`)
        )
      );
    }
    const rows = await q.orderBy(desc(donationReceipts.id)).limit(500);
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    return err(e);
  }
}

type LineIn = { doneeId?: number | null; categoryId?: number | null; amount: number | string; remarks?: string; fromDate?: string | null; toDate?: string | null };

// CREATE — master + detail lines + monthly distribution + optional double-entry voucher
export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAccess(MODULE, "create");
    const body = await req.json();
    const lines: LineIn[] = Array.isArray(body.lines) ? body.lines : [];
    if (!body.receiptNo || !body.receiptDate || !body.donationDate) {
      return NextResponse.json({ ok: false, error: "Receipt #, receipt date and donation date are required" }, { status: 400 });
    }
    if (!lines.length) {
      return NextResponse.json({ ok: false, error: "At least one detail line is required" }, { status: 400 });
    }
    const totalAmount = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
    if (totalAmount <= 0) {
      return NextResponse.json({ ok: false, error: "Total amount must be greater than zero" }, { status: 400 });
    }

    let voucherNo: string | null = null;
    const result = await db.transaction(async (tx) => {
      const [r] = await tx
        .insert(donationReceipts)
        .values({
          receiptNo: String(body.receiptNo),
          receiptDate: body.receiptDate,
          donationDate: body.donationDate,
          donorId: body.donorId ?? null,
          totalAmount: String(totalAmount),
          restrictUseInFund: Boolean(body.restrictUseInFund),
          instrumentNo: body.instrumentNo || null,
          instrumentDate: body.instrumentDate || null,
          voucherType: body.voucherType || null,
          remarks: body.remarks || null,
          issuedBy: session.id,
        })
        .returning();

      // detail lines + month-wise distribution
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const amt = Number(l.amount) || 0;
        await tx.insert(receiptLines).values({
          receiptId: r.id,
          serialNo: i + 1,
          doneeId: l.doneeId ?? null,
          categoryId: l.categoryId ?? null,
          amount: String(amt),
          remarks: l.remarks || null,
          fromDate: l.fromDate || null,
          toDate: l.toDate || null,
        });
        if (l.fromDate && amt > 0) {
          const parts = splitByMonth(l.fromDate, l.toDate || l.fromDate, amt);
          if (parts.length) {
            await tx.insert(receiptDistributions).values(
              parts.map((p) => ({
                receiptId: r.id,
                serialNo: i + 1,
                month: p.month,
                doneeId: l.doneeId ?? null,
                categoryId: l.categoryId ?? null,
                amount: String(p.amount),
                remarks: l.remarks || null,
                fromDate: p.fromDate,
                toDate: p.toDate,
              }))
            );
          }
        }
      }

      // auto double-entry voucher (CRV = cash receipt, BRV = bank receipt)
      if (body.voucherType && VOUCHER_TYPES[body.voucherType as VoucherType]) {
        const meta = VOUCHER_TYPES[body.voucherType as VoucherType];
        const donorName = body.donorName ? String(body.donorName) : "donor";
        const v = await createVoucher({
          type: body.voucherType as VoucherType,
          date: body.donationDate,
          narration: `Donation receipt ${body.receiptNo} received from ${donorName}`,
          postedBy: session.id,
          lines: [
            { accountCode: meta.cashAccount || "1000", debit: totalAmount, credit: 0, narration: "Donation received" },
            { accountCode: "3000", debit: 0, credit: totalAmount, narration: "Donation income" },
          ],
        });
        voucherNo = v.voucherNo;
        await tx.update(donationReceipts).set({ voucherNo: v.voucherNo }).where(sql`${donationReceipts.id} = ${r.id}`);
      }
      return r;
    });

    await logAudit({
      userId: session.id, userName: session.name, module: MODULE, recordId: result.id, action: "create",
      changes: [
        { field: "receiptNo", oldValue: null, newValue: body.receiptNo },
        { field: "totalAmount", oldValue: null, newValue: totalAmount },
        { field: "lines", oldValue: null, newValue: `${lines.length} detail lines` },
        ...(voucherNo ? [{ field: "voucherNo", oldValue: null as unknown, newValue: voucherNo as unknown }] : []),
      ],
    });

    return NextResponse.json({ ok: true, data: { id: result.id, receiptNo: result.receiptNo, voucherNo, totalAmount } });
  } catch (e) {
    return err(e);
  }
}
