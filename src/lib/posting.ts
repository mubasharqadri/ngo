import { db } from "@/db";
import { vouchers, voucherLines, accounts } from "@/db/schema";
import { eq, sql, count } from "drizzle-orm";
import { VOUCHER_TYPES, type VoucherType } from "@/lib/options";

export type VoucherLineInput = {
  accountCode?: string;
  accountId?: number;
  debit: number;
  credit: number;
  narration?: string;
  costCenterId?: number | null;
};

/**
 * Create a balanced double-entry voucher. Every line needs an account (by code or id).
 * Throws if total debits ≠ total credits or total is zero.
 */
export async function createVoucher(opts: {
  type: VoucherType;
  date: string; // YYYY-MM-DD
  narration: string;
  lines: VoucherLineInput[];
  postedBy?: number | null;
}): Promise<{ voucherNo: string; voucherId: number; total: number }> {
  const meta = VOUCHER_TYPES[opts.type];
  if (!meta) throw new Error(`Unknown voucher type: ${opts.type}`);

  const totalDr = opts.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCr = opts.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  if (totalDr <= 0) throw new Error("Voucher total must be greater than zero");
  if (Math.abs(totalDr - totalCr) > 0.009) {
    throw new Error(`Voucher is not balanced — debits ${totalDr} ≠ credits ${totalCr}`);
  }

  // resolve account ids
  const resolved: { accountId: number; debit: number; credit: number; narration: string; costCenterId: number | null }[] = [];
  for (const l of opts.lines) {
    let accountId = l.accountId ?? 0;
    if (!accountId && l.accountCode) {
      const [a] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.code, l.accountCode));
      if (!a) throw new Error(`Account code not found: ${l.accountCode}`);
      accountId = a.id;
    }
    if (!accountId) throw new Error("Each voucher line needs an account");
    resolved.push({
      accountId,
      debit: String(Number(l.debit) || 0),
      credit: String(Number(l.credit) || 0),
      narration: l.narration ?? "",
      costCenterId: l.costCenterId ?? null,
    } as never);
  }

  // voucher number: TYPE-YEAR-0001
  const year = opts.date.slice(0, 4);
  const [{ c }] = await db.select({ c: count() }).from(vouchers).where(sql`${vouchers.voucherNo} LIKE ${`${opts.type}-${year}-%`}`);
  const voucherNo = `${opts.type}-${year}-${String(c + 1).padStart(4, "0")}`;

  const [v] = await db
    .insert(vouchers)
    .values({
      voucherNo,
      date: opts.date,
      type: opts.type,
      narration: opts.narration,
      totalAmount: String(totalDr),
      postedBy: opts.postedBy ?? null,
    })
    .returning({ id: vouchers.id });

  await db.insert(voucherLines).values(
    resolved.map((r) => ({
      voucherId: v.id,
      accountId: r.accountId,
      costCenterId: r.costCenterId,
      debit: String(r.debit),
      credit: String(r.credit),
      narration: r.narration,
    })) as never
  );

  return { voucherNo, voucherId: v.id, total: totalDr };
}

/** Split an amount evenly across each calendar month between from/to (inclusive). */
export function splitByMonth(
  from: string,
  to: string,
  amount: number
): { month: string; fromDate: string; toDate: string; amount: number }[] {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const start = new Date(from + "T00:00:00");
  const end = new Date((to && to >= from ? to : from) + "T00:00:00");
  const segments: { month: string; fromDate: string; toDate: string }[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    const segStart = cur < start ? new Date(start) : new Date(cur);
    const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    const segEnd = monthEnd < end ? monthEnd : end;
    segments.push({
      month: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`,
      fromDate: iso(segStart),
      toDate: iso(segEnd),
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  const n = segments.length || 1;
  const share = Math.floor((amount / n) * 100) / 100;
  return segments.map((s, i) => ({
    ...s,
    amount: i === n - 1 ? Math.round((amount - share * (n - 1)) * 100) / 100 : share,
  }));
}
