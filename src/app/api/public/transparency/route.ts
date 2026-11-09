import { NextRequest, NextResponse } from "next/server";
import { computeFinancials } from "@/lib/financials";
import { db } from "@/db";
import { donationReceipts, disbursements, donors, donees } from "@/db/schema";
import { count, sum } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Public financial transparency — Income & Expenditure + Balance Sheet + key impact numbers. */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const year = url.searchParams.get("year");
    const from = year ? `${year}-01-01` : "";
    const to = year ? `${year}-12-31` : "";

    const fin = await computeFinancials(from, to);

    const [{ value: collected }] = await db.select({ value: sum(donationReceipts.totalAmount) }).from(donationReceipts);
    const [{ value: disbursed }] = await db.select({ value: sum(disbursements.paidAmount) }).from(disbursements);
    const [{ value: donorCount }] = await db.select({ value: count() }).from(donors);
    const [{ value: doneeCount }] = await db.select({ value: count() }).from(donees);

    return NextResponse.json({
      ok: true,
      data: {
        ...fin,
        impact: {
          collected: Number(collected || 0),
          disbursed: Number(disbursed || 0),
          donors: donorCount,
          donees: doneeCount,
        },
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
