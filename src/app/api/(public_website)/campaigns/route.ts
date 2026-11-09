import { NextResponse } from "next/server";
import { db } from "@/db";
import { publicCampaigns } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (slug) {
    const rows = await db.select().from(publicCampaigns).where(eq(publicCampaigns.slug, slug)).limit(1);
    return NextResponse.json({ ok: true, data: rows[0] ?? null });
  }
  const rows = await db.select().from(publicCampaigns).where(eq(publicCampaigns.isActive, true)).orderBy(desc(publicCampaigns.createdAt));
  return NextResponse.json({ ok: true, data: rows });
}
