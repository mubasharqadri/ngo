import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { disbursements, disbursementBatches, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Simple audit log - tracks who approved/paid batches (inferred from approvedBy/approvedAt)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const batchId = Number(id);
    const [batch] = await db
      .select()
      .from(disbursementBatches)
      .where(eq(disbursementBatches.id, batchId));
    if (!batch) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const approver = batch.approvedBy
      ? (await db.select().from(users).where(eq(users.id, batch.approvedBy)))[0]
      : null;

    const entries = [
      {
        at: batch.createdAt,
        action: "Batch created",
        by: "System",
      },
      batch.approvedAt && {
        at: batch.approvedAt,
        action: `Batch ${batch.status}`,
        by: approver?.fullName ?? "Unknown",
      },
    ].filter(Boolean) as { at: Date; action: string; by: string }[];

    return NextResponse.json({ ok: true, data: entries.sort((a, b) => (a.at > b.at ? -1 : 1)) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
