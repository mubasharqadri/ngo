import { db } from "@/db";
import { ok, fail } from "@/lib/db";
import { requireAccess } from "@/lib/access";
import {
  donors, donees, donationReceipts, receiptLines, disbursementBatches, disbursements,
  employees, vouchers, campaigns, leads, costCenters,
} from "@/db/schema";
import { count, sum, desc, gte, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAccess("dashboard", "view");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const d30 = thirtyDaysAgo.toISOString().slice(0, 10);

    const [
      [{ value: totalDonors }],
      [{ value: totalDonees }],
      [{ value: totalReceipts }],
      [{ value: activeEmployees }],
      [{ value: openLeads }],
      [{ value: activeCampaigns }],
    ] = await Promise.all([
      db.select({ value: count() }).from(donors),
      db.select({ value: count() }).from(donees),
      db.select({ value: count() }).from(donationReceipts),
      db.select({ value: count() }).from(employees),
      db.select({ value: count() }).from(leads),
      db.select({ value: count() }).from(campaigns),
    ]);

    const [totalCollected] = await db.select({ value: sum(donationReceipts.totalAmount) }).from(donationReceipts);
    const [last30dCollected] = await db
      .select({ value: sum(donationReceipts.totalAmount) })
      .from(donationReceipts)
      .where(gte(donationReceipts.receiptDate, d30));

    const [totalDisbursed] = await db.select({ value: sum(disbursements.paidAmount) }).from(disbursements);

    const recentReceipts = await db
      .select({
        id: donationReceipts.id,
        receiptNo: donationReceipts.receiptNo,
        receiptDate: donationReceipts.receiptDate,
        totalAmount: donationReceipts.totalAmount,
        voucherNo: donationReceipts.voucherNo,
        donorName: donors.name,
      })
      .from(donationReceipts)
      .leftJoin(donors, sql`${donationReceipts.donorId} = ${donors.id}`)
      .orderBy(desc(donationReceipts.id))
      .limit(5);

    const recentBatches = await db.select().from(disbursementBatches).orderBy(desc(disbursementBatches.date)).limit(5);

    const topDonors = await db.execute<{ name: string; total: string }>(sql`
      SELECT coalesce(d.name, 'Anonymous') as name, coalesce(sum(dr.total_amount::numeric), 0) as total
      FROM donation_receipts dr
      LEFT JOIN donors d ON d.id = dr.donor_id
      WHERE coalesce(d.is_anonymous, false) = false
      GROUP BY d.id, d.name
      ORDER BY total desc
      LIMIT 5
    `);

    const monthly = await db.execute<{ month: string; total: string }>(sql`
      SELECT to_char(receipt_date::date, 'YYYY-MM') as month, coalesce(sum(total_amount::numeric), 0) as total
      FROM donation_receipts
      WHERE receipt_date::date >= (CURRENT_DATE - INTERVAL '6 months')
      GROUP BY month ORDER BY month
    `);

    const fundBreakdown = await db.execute<{ fund: string; total: string }>(sql`
      SELECT coalesce(cc.name, 'Unassigned') as fund, coalesce(sum(rl.amount::numeric), 0) as total
      FROM receipt_lines rl
      LEFT JOIN cost_centers cc ON cc.id = rl.category_id
      GROUP BY cc.name ORDER BY total desc
    `);

    const [{ value: voucherCount }] = await db.select({ value: count() }).from(vouchers);

    return ok({
      stats: {
        totalDonors,
        totalDonees,
        totalReceipts,
        activeEmployees,
        openLeads,
        activeCampaigns,
        totalCollected: Number(totalCollected.value || 0),
        last30dCollected: Number(last30dCollected.value || 0),
        totalDisbursed: Number(totalDisbursed.value || 0),
        voucherCount,
      },
      recentReceipts,
      recentBatches,
      topDonors: topDonors.rows,
      monthly: monthly.rows,
      fundBreakdown: fundBreakdown.rows,
    });
  } catch (e) {
    console.error(e);
    return fail("Failed to load dashboard", 500);
  }
}
