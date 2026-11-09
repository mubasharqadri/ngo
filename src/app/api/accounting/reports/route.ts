import { NextResponse } from "next/server";
import { db } from "@/db";
import { requireAccess } from "@/lib/access";
import { donationReceipts, receiptLines, disbursements, employees, salaries, vouchers, costCenters } from "@/db/schema";
import { sql, count, sum } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAccess("reports", "view");

    const [totalCollected] = await db.select({ v: sum(donationReceipts.totalAmount) }).from(donationReceipts);
    const [disb] = await db.select({ v: sum(disbursements.paidAmount) }).from(disbursements);
    const [empCount] = await db.select({ v: count() }).from(employees);
    const [salaryPaid] = await db.select({ v: sum(salaries.net) }).from(salaries);
    const [vouCount] = await db.select({ v: count() }).from(vouchers);

    const byFund = await db.execute<{ fund: string; total: string; count: number }>(sql`
      SELECT coalesce(cc.name, 'Unassigned') as fund, coalesce(sum(rl.amount::numeric), 0) as total, count(*)::int as count
      FROM receipt_lines rl
      LEFT JOIN cost_centers cc ON cc.id = rl.category_id
      GROUP BY cc.name ORDER BY total DESC
    `);

    const byMonth = await db.execute<{ m: string; total: string }>(sql`
      SELECT to_char(receipt_date::date, 'YYYY-MM') as m, coalesce(sum(total_amount::numeric), 0) as total
      FROM donation_receipts
      WHERE receipt_date::date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY m ORDER BY m
    `);

    return NextResponse.json({
      ok: true,
      data: {
        totals: {
          collected: Number(totalCollected.v || 0),
          disbursed: Number(disb.v || 0),
          employees: empCount.v,
          salaryPaid: Number(salaryPaid.v || 0),
          vouchers: vouCount.v,
        },
        byFund: byFund.rows,
        byMonth: byMonth.rows,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
