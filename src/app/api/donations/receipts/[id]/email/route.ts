import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { donationReceipts, donors, emailOutbox } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAccess } from "@/lib/access";
import { logAudit } from "@/lib/audit";
import { amountInWords } from "@/lib/exports";

export const dynamic = "force-dynamic";

/** Sent emails for a receipt */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAccess("donations.receipts", "view");
    const { id } = await params;
    const rows = await db
      .select()
      .from(emailOutbox)
      .where(eq(emailOutbox.recordId, Number(id)))
      .orderBy(desc(emailOutbox.sentAt))
      .limit(50);
    const filtered = rows.filter((r) => r.recordType === "receipt");
    return NextResponse.json({ ok: true, data: filtered });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}

/**
 * Email the receipt to the donor with a PDF attachment.
 * (SMTP is simulated — the email is recorded in the outbox; in production this
 * would hand off to an SMTP/transactional-email service with the generated PDF.)
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireAccess("donations.receipts", "edit");
    const { id } = await params;
    const numId = Number(id);

    const [r] = await db
      .select({
        id: donationReceipts.id,
        receiptNo: donationReceipts.receiptNo,
        receiptDate: donationReceipts.receiptDate,
        donationDate: donationReceipts.donationDate,
        totalAmount: donationReceipts.totalAmount,
        instrumentNo: donationReceipts.instrumentNo,
        voucherNo: donationReceipts.voucherNo,
        donorEmail: donors.email,
        donorName: donors.name,
      })
      .from(donationReceipts)
      .leftJoin(donors, eq(donationReceipts.donorId, donors.id))
      .where(eq(donationReceipts.id, numId));
    if (!r) return NextResponse.json({ ok: false, error: "Receipt not found" }, { status: 404 });

    const body0 = await req.json().catch(() => ({}));
    const toEmail = String(body0.toEmail ?? r.donorEmail ?? "");
    if (!toEmail) return NextResponse.json({ ok: false, error: "Donor has no email address" }, { status: 400 });

    const subject = String(body0.subject ?? `Donation Receipt ${r.receiptNo} — Shauoor Welfare Society`);
    const bodyText = String(
      body0.body ??
        `Dear ${r.donorName ?? "Donor"},\n\nJazakAllah Khair for your generous donation.\n\nReceipt No: ${r.receiptNo}\nReceipt Date: ${r.receiptDate}\nDonation Date: ${r.donationDate}\nAmount: PKR ${Number(r.totalAmount).toLocaleString()} (${amountInWords(Number(r.totalAmount))})\n${r.instrumentNo ? `Instrument: ${r.instrumentNo}\n` : ""}${r.voucherNo ? `Voucher Ref: ${r.voucherNo}\n` : ""}\nYour receipt PDF is attached.\n\nWith gratitude,\nShauoor Welfare Society`
    );
    const attachmentName = String(body0.attachmentName ?? `Receipt-${r.receiptNo}.pdf`);

    const [out] = await db
      .insert(emailOutbox)
      .values({
        toEmail,
        toName: r.donorName,
        subject,
        body: bodyText,
        attachmentName,
        recordType: "receipt",
        recordId: numId,
        status: "sent",
      })
      .returning();

    await logAudit({
      userId: session.id, userName: session.name, module: "donations.receipts", recordId: numId, action: "update",
      changes: [{ field: "email_sent", oldValue: null, newValue: `${toEmail} (${attachmentName})` }],
    });

    return NextResponse.json({ ok: true, data: out });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
