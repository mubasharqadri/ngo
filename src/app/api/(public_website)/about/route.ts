import { NextResponse } from "next/server";
import { db } from "@/db";
import { aboutContent, companies } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(aboutContent);
  const [company] = await db.select().from(companies).limit(1);
  const content: Record<string, string> = {};
  for (const r of rows) content[r.key] = r.value;
  return NextResponse.json({ ok: true, data: { content, company } });
}
