import { NextResponse } from "next/server";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSession();
    const rows = await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(200);
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, subject, message } = body ?? {};
    if (!name || !email || !message) {
      return NextResponse.json({ ok: false, error: "Name, email and message are required" }, { status: 400 });
    }
    const [inserted] = await db.insert(contactMessages).values({
      name: String(name),
      email: String(email),
      phone: phone ? String(phone) : null,
      subject: subject ? String(subject) : null,
      message: String(message),
    }).returning();
    return NextResponse.json({ ok: true, data: inserted });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
