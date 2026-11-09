import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { donors, donees, vendors, accounts, voucherLines, vouchers } from "@/db/schema";
import { eq, sql, asc } from "drizzle-orm";
import { requireAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

/**
 * PARTNER LEDGER (subledger) — Odoo/SAP style.
 * Individual partners (donors/donees/vendors) do NOT clutter the chart of accounts.
 * One CONTROL account per partner class sits in the GL; partner-level transactions live
 * in the subledger and their totals reconcile against the control account balance.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAccess("accounting.reports", "view");
    const url = new URL(req.url);
    const partnerType = url.searchParams.get("partnerType") ?? "donor";

    // ---- control account ----
    const [control] = await db.select().from(accounts).where(eq(accounts.controlFor, partnerType));
    let controlBalance = 0;
    let controlMovements: { date: string; narration: string; debit: number; credit: number }[] = [];
    if (control) {
      const rows = (await db
        .select({
          date: vouchers.date,
          narration: vouchers.narration,
          debit: sql<string>`coalesce(sum(${voucherLines.debit}::numeric), 0)`,
          credit: sql<string>`coalesce(sum(${voucherLines.credit}::numeric), 0)`,
        })
        .from(voucherLines)
        .innerJoin(vouchers, eq(voucherLines.voucherId, vouchers.id))
        .where(eq(voucherLines.accountId, control.id))
        .groupBy(vouchers.date, vouchers.narration)
        .orderBy(asc(vouchers.date))) as { date: string; narration: string; debit: string; credit: string }[];
      controlMovements = rows.map((r) => ({ date: r.date, narration: r.narration ?? "", debit: Number(r.debit), credit: Number(r.credit) }));
      const opening = Number(control.openingBalance || 0);
      const isDebitNature = control.type === "asset" || control.type === "expense";
      const net = controlMovements.reduce((s, m) => s + m.debit - m.credit, 0);
      controlBalance = opening + (isDebitNature ? net : -net);
    }

    // ---- subledger per partner (Odoo/SAP style: partner-linked GL lines on the control account) ----
    const baseRows: { id: number; name: string; detail: string; opening: number }[] =
      partnerType === "donor"
        ? (await db.select({ id: donors.id, name: donors.name, membershipNo: donors.membershipNo }).from(donors).orderBy(asc(donors.id))).map((d) => ({ id: d.id, name: d.name, detail: d.membershipNo ?? "", opening: 0 }))
        : partnerType === "donee"
        ? (await db.select({ id: donees.id, name: donees.name, registeredNo: donees.registeredNo }).from(donees).orderBy(asc(donees.id))).map((d) => ({ id: d.id, name: d.name, detail: d.registeredNo ?? "", opening: 0 }))
        : (await db.select().from(vendors).orderBy(asc(vendors.id))).map((v) => ({ id: v.id, name: v.name, detail: v.ntnNo ?? "", opening: Number(v.openingBalance || 0) }));

    // liability control accounts: credit increases balance; asset: debit increases
    const liabilityNature = control ? !(control.type === "asset" || control.type === "expense") : true;

    const partners: { id: number; name: string; detail: string; transactions: { date: string; ref: string; description: string; amount: number }[]; balance: number }[] = [];
    for (const p of baseRows) {
      const rows = (await db
        .select({ date: vouchers.date, voucherNo: vouchers.voucherNo, narration: vouchers.narration, debit: voucherLines.debit, credit: voucherLines.credit })
        .from(voucherLines)
        .innerJoin(vouchers, eq(voucherLines.voucherId, vouchers.id))
        .where(sql`${voucherLines.partnerType} = ${partnerType} AND ${voucherLines.partnerId} = ${p.id} AND coalesce(${vouchers.status}, 'posted') != 'cancelled'`)
        .orderBy(asc(vouchers.date))) as { date: string; voucherNo: string; narration: string; debit: string; credit: string }[];
      if (!rows.length && !p.opening) continue;
      const signed = (r: { debit: string; credit: string }) =>
        liabilityNature ? Number(r.credit) - Number(r.debit) : Number(r.debit) - Number(r.credit);
      partners.push({
        id: p.id,
        name: p.name,
        detail: p.detail,
        transactions: rows.map((r) => ({ date: r.date, ref: r.voucherNo, description: r.narration ?? "—", amount: signed(r) })),
        balance: p.opening + rows.reduce((s, r) => s + signed(r), 0),
      });
    }

    const subledgerTotal = partners.reduce((s, p) => s + p.balance, 0);

    return NextResponse.json({
      ok: true,
      data: {
        partnerType,
        controlAccount: control ? { code: control.code, name: control.name, type: control.type, balance: Math.round(controlBalance * 100) / 100, movements: controlMovements } : null,
        partners,
        subledgerTotal: Math.round(subledgerTotal * 100) / 100,
        reconciled: control ? Math.abs(controlBalance - subledgerTotal) < 1 : null,
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
