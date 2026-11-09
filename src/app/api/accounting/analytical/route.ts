import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { analyticalDistributions, voucherLines, vouchers, costCenters, accounts } from "@/db/schema";
import { eq, sql, gte, lte, and } from "drizzle-orm";
import { requireAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

/** ANALYTICAL DISTRIBUTION report — where money actually went, by program/cost center. */
export async function GET(req: NextRequest) {
  try {
    await requireAccess("accounting.reports", "view");
    const url = new URL(req.url);
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";

    const conds = [];
    if (from) conds.push(gte(vouchers.date, from));
    if (to) conds.push(lte(vouchers.date, to));

    // per cost center totals (using the distributed amount on debit-side lines)
    const rows = (await db
      .select({
        costCenterId: costCenters.id,
        costCenter: costCenters.name,
        code: costCenters.code,
        total: sql<string>`coalesce(sum(${analyticalDistributions.amount}::numeric), 0)`,
        lines: sql<number>`count(*)::int`,
      })
      .from(analyticalDistributions)
      .innerJoin(voucherLines, eq(analyticalDistributions.voucherLineId, voucherLines.id))
      .innerJoin(vouchers, eq(voucherLines.voucherId, vouchers.id))
      .innerJoin(costCenters, eq(analyticalDistributions.costCenterId, costCenters.id))
      .where(and(sql`coalesce(${vouchers.status}, 'posted') != 'cancelled'`, ...(conds.length ? conds : [sql`1=1`])))
      .groupBy(costCenters.id, costCenters.name, costCenters.code)) as { costCenterId: number; costCenter: string; code: string; total: string; lines: number }[];

    const byCenter = rows
      .map((r) => ({ ...r, total: Number(r.total) }))
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);
    const grandTotal = byCenter.reduce((s, r) => s + r.total, 0);

    // per account (expense heads) × cost center matrix
    const matrix = (await db
      .select({
        accountCode: accounts.code,
        accountName: accounts.name,
        costCenter: costCenters.name,
        total: sql<string>`coalesce(sum(${analyticalDistributions.amount}::numeric), 0)`,
      })
      .from(analyticalDistributions)
      .innerJoin(voucherLines, eq(analyticalDistributions.voucherLineId, voucherLines.id))
      .innerJoin(vouchers, eq(voucherLines.voucherId, vouchers.id))
      .innerJoin(accounts, eq(voucherLines.accountId, accounts.id))
      .innerJoin(costCenters, eq(analyticalDistributions.costCenterId, costCenters.id))
      .where(and(sql`coalesce(${vouchers.status}, 'posted') != 'cancelled'`, ...(conds.length ? conds : [sql`1=1`])))
      .groupBy(accounts.code, accounts.name, costCenters.name)) as { accountCode: string; accountName: string; costCenter: string; total: string }[];

    return NextResponse.json({
      ok: true,
      data: {
        period: { from: from || "beginning", to: to || "today" },
        byCenter,
        grandTotal: Math.round(grandTotal * 100) / 100,
        matrix: matrix.map((m) => ({ ...m, total: Number(m.total) })),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
