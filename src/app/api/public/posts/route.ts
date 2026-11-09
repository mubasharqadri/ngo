import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Published posts for the public website; ?slug= for a single post */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (slug) {
    const rows = await db.select().from(posts).where(and(eq(posts.slug, slug), eq(posts.isPublished, true))).limit(1);
    return NextResponse.json({ ok: true, data: rows[0] ?? null });
  }
  const category = url.searchParams.get("category");
  let q: any = db.select().from(posts).where(eq(posts.isPublished, true));
  void category;
  const rows = await q.orderBy(desc(posts.publishedAt)).limit(100);
  const filtered = category ? rows.filter((r: any) => r.category === category) : rows;
  return NextResponse.json({ ok: true, data: filtered });
}
