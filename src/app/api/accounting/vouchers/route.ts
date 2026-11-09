import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vouchers, voucherLines, analyticalDistributions, accounts, users } from "@/db/schema";
import { desc, like, or, eq, sql } from "drizzle-orm";
import { requireAccess } from "@/lib/access";
import { logAudit, snapshotChanges } from "@/lib/audit";
import { createVoucher } from "@/lib/posting";
import { VOUCHER_TYPES, type VoucherType } from "@/lib/options";

export const dynamic = "force-dynamic";
const MODULE = "accounting.vouchers";

function err(e: unknown) {
  const msg = e instanceof Error ? e.message : "Error";
  if (msg === "Unauthorized") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
  if (msg.startsWith("Voucher") || msg.startsWith("Each") || msg.startsWith("Account")) {
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
  console.error(e);
  return NextResponse.json({ ok: false, error: msg }, { status: 500 });
}

type LineIn = { accountCode?: string; accountId?: number; debit: number; credit: number; narration?: string; partnerType?: string; partnerId?: number; distributions?: { costCenterId: number; percent: number }[] };

/** Create one balanced voucher + partner links + analytical distributions. */
async function createOne(type: VoucherType, date: string, narration: string, linesIn: LineIn[], postedBy: number) {
  const v = await createVoucher({ type, date, narration, lines: linesIn, postedBy });

  const lineIds = await db.select({ id: voucherLines.id }).from(voucherLines).where(eq(voucherLines.voucherId, v.voucherId));
  for (let i = 0; i < linesIn.length && i < lineIds.length; i++) {
    const li = linesIn[i];
    if (li?.partnerType && li?.partnerId) {
      await db.update(voucherLines)
        .set({ partnerType: String(li.partnerType), partnerId: Number(li.partnerId) })
        .where(eq(voucherLines.id, lineIds[i].id));
    }
    const dists = Array.isArray(li?.distributions) ? li.distributions : [];
    if (dists.length) {
      const lineTotal = Math.max(Number(li.debit) || 0, Number(li.credit) || 0);
      const vals = dists
        .filter((d) => d?.costCenterId && Number(d.percent) > 0)
        .map((d) => ({
          voucherLineId: lineIds[i].id,
          costCenterId: Number(d.costCenterId),
          percent: String(Number(d.percent)),
          amount: String(Math.round(lineTotal * Number(d.percent)) / 100),
        }));
      if (vals.length) await db.insert(analyticalDistributions).values(vals);
    }
  }
  return v;
}

// LIST with posted-by name
export async function GET(req: NextRequest) {
  try {
    await requireAccess(MODULE, "view");
    const search = new URL(req.url).searchParams.get("search") ?? "";
    let q: any = db
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
      .leftJoin(users, eq(vouchers.postedBy, users.id));
    if (search) {
      q = q.where(
        or(like(vouchers.voucherNo, `%${search}%`), like(vouchers.narration, `%${search}%`), like(vouchers.type, `%${search.toUpperCase()}%`))
      );
    }
    const rows = await q.orderBy(desc(vouchers.id)).limit(500);
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    return err(e);
  }
}

// UPDATE — edit (date/narration) or cancel a posted voucher
export async function PATCH(req: NextRequest) {
  try {
    const { session } = await requireAccess(MODULE, "edit");
    const id = Number(new URL(req.url).searchParams.get("id"));
    const body = await req.json();
    const [old] = await db.select().from(vouchers).where(eq(vouchers.id, id));
    if (!old) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    const allowed: Record<string, unknown> = {};
    for (const k of ["date", "narration", "type", "status"]) {
      if (k in body) allowed[k] = body[k];
    }
    const [u] = await db.update(vouchers).set(allowed).where(eq(vouchers.id, id)).returning();
    await logAudit({
      userId: session.id, userName: session.name, module: MODULE, recordId: id,
      action: body.status === "cancelled" ? "cancel" : "update",
      changes: Object.entries(allowed).map(([f, v]) => ({ field: f, oldValue: (old as Record<string, unknown>)[f] ?? null, newValue: v })),
    });
    return NextResponse.json({ ok: true, data: u });
  } catch (e) {
    return err(e);
  }
}

// CREATE — double entry: { type, date, narration, lines: [{accountCode|accountId, debit, credit, narration, partnerType, partnerId, distributions:[{costCenterId,percent}]}] }
// CSV IMPORT — array of rows: { voucherNo, type, date, narration, accountCode, debit, credit, partnerType, partnerId, costCenterId, distributions: "ccId:pct;ccId:pct" }
//   rows are grouped by (voucherNo|type|date) into balanced vouchers.
export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAccess(MODULE, "create");
    const body = await req.json();

    if (Array.isArray(body)) {
      await requireAccess(MODULE, "import");
      const groups = new Map<string, { type: VoucherType; date: string; narration: string; lines: { accountCode: string; debit: number; credit: number; narration: string; partnerType?: string; partnerId?: number; distributions?: { costCenterId: number; percent: number }[] }[] }>();
      for (const row of body as Record<string, unknown>[]) {
        const key = `${row.voucherNo ?? "IMPORT"}|${row.type ?? "JV"}|${row.date ?? ""}`;
        if (!groups.has(key)) groups.set(key, { type: (row.type as VoucherType) ?? "JV", date: String(row.date ?? new Date().toISOString().slice(0, 10)), narration: String(row.narration ?? "Imported from CSV"), lines: [] });
        const dists = String(row.distributions ?? "")
          .split(";")
          .filter(Boolean)
          .map((s) => {
            const [cc, pct] = s.split(":");
            return { costCenterId: Number(cc), percent: Number(pct) };
          })
          .filter((d) => d.costCenterId && d.percent);
        groups.get(key)!.lines.push({
          accountCode: String(row.accountCode ?? ""),
          debit: Number(row.debit) || 0,
          credit: Number(row.credit) || 0,
          narration: String(row.narration ?? ""),
          partnerType: row.partnerType ? String(row.partnerType) : undefined,
          partnerId: row.partnerId ? Number(row.partnerId) : undefined,
          distributions: dists.length ? dists : undefined,
        });
      }
      let imported = 0;
      const errors: string[] = [];
      for (const [key, g] of groups.entries()) {
        try {
          if (!VOUCHER_TYPES[g.type]) throw new Error(`unknown type ${g.type}`);
          await createOne(g.type, g.date, g.narration, g.lines, session.id);
          imported++;
        } catch (e2) {
          errors.push(`${key}: ${e2 instanceof Error ? e2.message : "failed"}`);
        }
      }
      await logAudit({ userId: session.id, userName: session.name, module: MODULE, recordId: null, action: "import", changes: [{ field: "csv_import", oldValue: null, newValue: `${imported} vouchers imported, ${errors.length} failed` }] });
      return NextResponse.json({ ok: true, data: { imported, errors: errors.slice(0, 20), total: groups.size } });
    }

    const type = String(body.type ?? "") as VoucherType;
    if (!VOUCHER_TYPES[type]) {
      return NextResponse.json({ ok: false, error: "Select a voucher type first" }, { status: 400 });
    }
    const linesIn = Array.isArray(body.lines) ? body.lines : [];
    const v = await createOne(type, String(body.date ?? new Date().toISOString().slice(0, 10)), String(body.narration ?? ""), linesIn, session.id);

    await logAudit({
      userId: session.id, userName: session.name, module: MODULE, recordId: v.voucherId, action: "create",
      changes: [
        { field: "voucherNo", oldValue: null, newValue: v.voucherNo },
        { field: "type", oldValue: null, newValue: `${type} (${VOUCHER_TYPES[type].label})` },
        { field: "totalAmount", oldValue: null, newValue: v.total },
        { field: "narration", oldValue: null, newValue: body.narration ?? "" },
      ],
    });
    return NextResponse.json({ ok: true, data: { id: v.voucherId, voucherNo: v.voucherNo, total: v.total } });
  } catch (e) {
    return err(e);
  }
}

// DELETE (removes lines too via cascade)
export async function DELETE(req: NextRequest) {
  try {
    const { session } = await requireAccess(MODULE, "delete");
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    const [old] = await db.select().from(vouchers).where(eq(vouchers.id, id));
    await db.delete(voucherLines).where(eq(voucherLines.voucherId, id));
    await db.delete(vouchers).where(eq(vouchers.id, id));
    if (old) {
      await logAudit({
        userId: session.id, userName: session.name, module: MODULE, recordId: id, action: "delete",
        changes: snapshotChanges(old as Record<string, unknown>, "delete"),
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return err(e);
  }
}
