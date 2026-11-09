import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { donors, donationReceipts, receiptLines, receiptDistributions, donees, costCenters, media } from "@/db/schema";
import { eq, desc, sql, asc } from "drizzle-orm";
import { getDonorSession } from "@/lib/portalAuth";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const session = await getDonorSession();
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const donorId = session.id;

    const [donor] = await db.select().from(donors).where(eq(donors.id, donorId));
    if (!donor) return NextResponse.json({ ok: false, error: "Donor not found" }, { status: 404 });

    // My receipts
    const receipts = await db
      .select({
        id: donationReceipts.id,
        receiptNo: donationReceipts.receiptNo,
        receiptDate: donationReceipts.receiptDate,
        donationDate: donationReceipts.donationDate,
        totalAmount: donationReceipts.totalAmount,
        instrumentNo: donationReceipts.instrumentNo,
        voucherNo: donationReceipts.voucherNo,
        restrictUseInFund: donationReceipts.restrictUseInFund,
      })
      .from(donationReceipts)
      .where(sql`${donationReceipts.donorId} = ${donorId} AND coalesce(${donationReceipts.status}, 'active') != 'cancelled'`)
      .orderBy(desc(donationReceipts.receiptDate));

    // Detail lines → which donees this donor helped
    const helped = await db
      .select({
        doneeId: receiptLines.doneeId,
        doneeName: donees.name,
        doneeCity: donees.city,
        problemType: donees.problemType,
        categoryName: costCenters.name,
        totalGiven: sql<string>`coalesce(sum(${receiptLines.amount}::numeric), 0)`,
        receiptCount: sql<number>`count(distinct ${receiptLines.receiptId})::int`,
      })
      .from(receiptLines)
      .leftJoin(donees, eq(receiptLines.doneeId, donees.id))
      .leftJoin(costCenters, eq(receiptLines.categoryId, costCenters.id))
      .leftJoin(donationReceipts, eq(receiptLines.receiptId, donationReceipts.id))
      .where(eq(donationReceipts.donorId, donorId))
      .groupBy(receiptLines.doneeId, donees.name, donees.city, donees.problemType, costCenters.name)
      .orderBy(desc(sql`sum(${receiptLines.amount}::numeric)`));

    // Impact media for the donees this donor helped (photos/videos of transformation)
    const helpedIds = helped.map((h) => h.doneeId).filter(Boolean) as number[];
    let impactMedia: { id: number; title: string | null; caption: string | null; mediaType: string; url: string; linkId: number | null; doneeName: string | null; createdAt: Date }[] = [];
    if (helpedIds.length) {
      const rows = await db
        .select({
          id: media.id,
          title: media.title,
          caption: media.caption,
          mediaType: media.mediaType,
          url: media.url,
          linkId: media.linkId,
          doneeName: donees.name,
          createdAt: media.createdAt,
        })
        .from(media)
        .leftJoin(donees, eq(media.linkId, donees.id))
        .where(sql`${media.linkType} = 'donee' AND ${media.linkId} IN (${sql.join(helpedIds.map((i) => sql`${i}`), sql`, `)})`)
        .orderBy(desc(media.id))
        .limit(60);
      impactMedia = rows;
    }

    // Monthly distribution of my giving (scheduled support periods)
    const schedule = await db
      .select({
        month: receiptDistributions.month,
        doneeName: donees.name,
        categoryName: costCenters.name,
        amount: receiptDistributions.amount,
      })
      .from(receiptDistributions)
      .leftJoin(donees, eq(receiptDistributions.doneeId, donees.id))
      .leftJoin(costCenters, eq(receiptDistributions.categoryId, costCenters.id))
      .leftJoin(donationReceipts, eq(receiptDistributions.receiptId, donationReceipts.id))
      .where(eq(donationReceipts.donorId, donorId))
      .orderBy(asc(receiptDistributions.month))
      .limit(200);

    const totalGiven = receipts.reduce((s, r) => s + Number(r.totalAmount), 0);

    return NextResponse.json({
      ok: true,
      data: {
        donor: { id: donor.id, name: donor.name, membershipNo: donor.membershipNo, since: donor.membershipDate, email: donor.portalEmail, supportType: donor.supportType },
        totalGiven,
        receiptCount: receipts.length,
        helpedCount: helped.length,
        receipts,
        helped,
        impactMedia,
        schedule,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
