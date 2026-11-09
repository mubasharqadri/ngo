import { db } from "@/db";
import { accounts, voucherLines, vouchers } from "@/db/schema";
import { asc, eq, and, gte, lte, lt, sql } from "drizzle-orm";

type Acc = { id: number; code: string; name: string; type: string; openingBalance: string };
type Agg = { accountId: number; debit: number; credit: number };

const debitNature = (t: string) => t === "asset" || t === "expense";

/** Compute all five financial statements for a period. Shared by ERP + public transparency. */
export async function computeFinancials(from: string, to: string) {
  const accs = (await db.select().from(accounts).orderBy(asc(accounts.code))) as Acc[];
  const byId = new Map(accs.map((a) => [a.id, a]));

  async function aggregate(op: "period" | "before"): Promise<Map<number, Agg>> {
    if (op === "before" && !from) return new Map();
    const c = [sql`coalesce(${vouchers.status}, 'posted') != 'cancelled'`];
    if (op === "period") {
      if (from) c.push(gte(vouchers.date, from));
      if (to) c.push(lte(vouchers.date, to));
    } else if (from) {
      c.push(lt(vouchers.date, from));
    }
    let q: any = db
      .select({
        accountId: voucherLines.accountId,
        debit: sql<string>`coalesce(sum(${voucherLines.debit}::numeric), 0)`,
        credit: sql<string>`coalesce(sum(${voucherLines.credit}::numeric), 0)`,
      })
      .from(voucherLines)
      .innerJoin(vouchers, eq(voucherLines.voucherId, vouchers.id));
    q = q.where(and(...c));
    q = q.groupBy(voucherLines.accountId);
    const rows = (await q) as { accountId: number; debit: string; credit: string }[];
    const m = new Map<number, Agg>();
    for (const r of rows) m.set(r.accountId, { accountId: r.accountId, debit: Number(r.debit), credit: Number(r.credit) });
    return m;
  }

  const [period, before] = await Promise.all([aggregate("period"), aggregate("before")]);

  const closingSigned = (a: Acc): number => {
    const open = Number(a.openingBalance || 0) * (debitNature(a.type) ? 1 : -1);
    const b = before.get(a.id) ?? { accountId: a.id, debit: 0, credit: 0 };
    const p = period.get(a.id) ?? { accountId: a.id, debit: 0, credit: 0 };
    return open + (b.debit - b.credit) + (p.debit - p.credit);
  };
  const openingSignedAtFrom = (a: Acc): number => {
    const open = Number(a.openingBalance || 0) * (debitNature(a.type) ? 1 : -1);
    const b = before.get(a.id) ?? { accountId: a.id, debit: 0, credit: 0 };
    return open + (b.debit - b.credit);
  };

  // 1. Trial Balance
  const trialBalance = accs
    .map((a) => {
      const p = period.get(a.id) ?? { accountId: a.id, debit: 0, credit: 0 };
      const open = openingSignedAtFrom(a);
      const closing = open + (p.debit - p.credit);
      return {
        code: a.code, name: a.name, type: a.type,
        openingDebit: Math.round((debitNature(a.type) ? Math.max(open, 0) : 0) * 100) / 100,
        openingCredit: Math.round((!debitNature(a.type) ? Math.max(-open, 0) : 0) * 100) / 100,
        debit: Math.round(p.debit * 100) / 100,
        credit: Math.round(p.credit * 100) / 100,
        closingDebit: Math.round(Math.max(closing, 0) * 100) / 100,
        closingCredit: Math.round(Math.max(-closing, 0) * 100) / 100,
      };
    })
    .filter((r) => r.openingDebit || r.openingCredit || r.debit || r.credit || r.closingDebit || r.closingCredit);

  // 2. Income & Expenditure
  const netOf = (a: Acc) => {
    const p = period.get(a.id) ?? { accountId: a.id, debit: 0, credit: 0 };
    return p.credit - p.debit;
  };
  const income = accs.filter((a) => a.type === "income").map((a) => ({ code: a.code, name: a.name, amount: Math.round(netOf(a) * 100) / 100 })).filter((r) => r.amount !== 0);
  const expenses = accs.filter((a) => a.type === "expense").map((a) => ({ code: a.code, name: a.name, amount: Math.round(-netOf(a) * 100) / 100 })).filter((r) => r.amount !== 0);
  const totalIncome = income.reduce((s, r) => s + r.amount, 0);
  const totalExpense = expenses.reduce((s, r) => s + r.amount, 0);

  // 3. Balance Sheet
  const retainedSurplusAllTime = accs
    .filter((a) => a.type === "income" || a.type === "expense")
    .reduce((s, a) => s - closingSigned(a), 0);
  const bsGroup = (t: string) =>
    accs.filter((a) => a.type === t)
      .map((a) => ({ code: a.code, name: a.name, amount: Math.round(closingSigned(a) * (debitNature(t) ? 1 : -1) * 100) / 100 }))
      .filter((r) => r.amount !== 0);
  const assets = bsGroup("asset");
  const liabilities = bsGroup("liability");
  const equity = bsGroup("equity");

  // 4. Cash Flow
  const cashIds = new Set(accs.filter((a) => a.type === "asset" && /^(1000|1010)$/.test(a.code)).map((a) => a.id));
  const cCond = [sql`coalesce(${vouchers.status}, 'posted') != 'cancelled'`];
  if (from) cCond.push(gte(vouchers.date, from));
  if (to) cCond.push(lte(vouchers.date, to));
  let lq: any = db
    .select({ voucherId: vouchers.id, accountId: voucherLines.accountId, debit: voucherLines.debit, credit: voucherLines.credit })
    .from(voucherLines)
    .innerJoin(vouchers, eq(voucherLines.voucherId, vouchers.id));
  lq = lq.where(and(...cCond));
  const allLines = (await lq) as { voucherId: number; accountId: number; debit: string; credit: string }[];
  const byVoucher = new Map<number, typeof allLines>();
  for (const l of allLines) {
    if (!byVoucher.has(l.voucherId)) byVoucher.set(l.voucherId, []);
    byVoucher.get(l.voucherId)!.push(l);
  }
  const flow = { operatingIn: 0, operatingOut: 0, investingIn: 0, investingOut: 0, financingIn: 0, financingOut: 0 };
  for (const lines of byVoucher.values()) {
    const cashDelta = lines.filter((l) => cashIds.has(l.accountId)).reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
    if (!cashDelta) continue;
    const otherTypes = new Set(lines.filter((l) => !cashIds.has(l.accountId)).map((l) => byId.get(l.accountId)?.type ?? ""));
    let cat: "operating" | "investing" | "financing" = "operating";
    if (otherTypes.has("asset")) cat = "investing";
    else if (otherTypes.has("liability") || otherTypes.has("equity")) cat = "financing";
    if (cashDelta > 0) flow[`${cat}In` as keyof typeof flow] += cashDelta;
    else flow[`${cat}Out` as keyof typeof flow] += -cashDelta;
  }
  const openingCash = accs.filter((a) => cashIds.has(a.id)).reduce((s, a) => s + openingSignedAtFrom(a), 0);
  const closingCash = accs.filter((a) => cashIds.has(a.id)).reduce((s, a) => s + closingSigned(a), 0);

  // 5. Changes in Financial Position
  const changes = accs
    .map((a) => {
      const op = openingSignedAtFrom(a) * (debitNature(a.type) ? 1 : -1);
      const cl = closingSigned(a) * (debitNature(a.type) ? 1 : -1);
      return { code: a.code, name: a.name, type: a.type, opening: Math.round(op * 100) / 100, closing: Math.round(cl * 100) / 100, change: Math.round((cl - op) * 100) / 100 };
    })
    .filter((r) => r.opening !== 0 || r.closing !== 0);

  return {
    period: { from: from || "beginning", to: to || "today" },
    trialBalance,
    incomeExpenditure: { income, expenses, totalIncome, totalExpense, surplus: Math.round((totalIncome - totalExpense) * 100) / 100 },
    balanceSheet: {
      assets, liabilities, equity,
      retainedSurplus: Math.round(retainedSurplusAllTime * 100) / 100,
      totalAssets: Math.round(assets.reduce((s, r) => s + r.amount, 0) * 100) / 100,
      totalLiabilitiesEquity: Math.round((liabilities.reduce((s, r) => s + r.amount, 0) + equity.reduce((s, r) => s + r.amount, 0) + retainedSurplusAllTime) * 100) / 100,
    },
    cashFlow: { ...Object.fromEntries(Object.entries(flow).map(([k, v]) => [k, Math.round(v * 100) / 100])), openingCash: Math.round(openingCash * 100) / 100, closingCash: Math.round(closingCash * 100) / 100, netChange: Math.round((closingCash - openingCash) * 100) / 100 },
    changesInFinancialPosition: changes,
  };
}
