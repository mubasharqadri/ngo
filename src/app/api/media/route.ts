import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { media } from "@/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function err(e: unknown) {
  const msg = e instanceof Error ? e.message : "Error";
  if (msg === "Unauthorized") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  console.error(e);
  return NextResponse.json({ ok: false, error: msg }, { status: 500 });
}

// LIST (filter by linkType/linkId)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const linkType = url.searchParams.get("linkType");
    const linkId = url.searchParams.get("linkId");
    const isPublic = url.searchParams.get("public") === "1";
    if (!isPublic) await requireSession();

    const where = [];
    if (linkType) where.push(eq(media.linkType, linkType));
    if (linkId) where.push(eq(media.linkId, Number(linkId)));
    let q: any = db.select().from(media);
    if (where.length) q = q.where(and(...where));
    const rows = await q.orderBy(desc(media.id)).limit(500);
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    return err(e);
  }
}

// UPLOAD — multipart file or JSON {url}
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const ct = req.headers.get("content-type") ?? "";

    let mediaType = "image";
    let url = "";
    let title = "";
    let caption = "";
    let linkType: string | null = null;
    let linkId: number | null = null;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      title = String(form.get("title") ?? "");
      caption = String(form.get("caption") ?? "");
      linkType = (form.get("linkType") as string) || null;
      linkId = form.get("linkId") ? Number(form.get("linkId")) : null;

      if (file && typeof file !== "string") {
        const f = file as File;
        mediaType = f.type.startsWith("video") ? "video" : "image";
        const ext = path.extname(f.name) || (mediaType === "video" ? ".mp4" : ".jpg");
        const dir = path.join(process.cwd(), "public", "uploads");
        await mkdir(dir, { recursive: true });
        const fname = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
        const buf = Buffer.from(await f.arrayBuffer());
        await writeFile(path.join(dir, fname), buf);
        url = `/uploads/${fname}`;
      } else if (form.get("url")) {
        url = String(form.get("url"));
        mediaType = String(form.get("mediaType") ?? "image");
      }
    } else {
      const body = await req.json();
      url = body.url ?? "";
      mediaType = body.mediaType ?? "image";
      title = body.title ?? "";
      caption = body.caption ?? "";
      linkType = body.linkType ?? null;
      linkId = body.linkId ?? null;
    }

    if (!url) return NextResponse.json({ ok: false, error: "No file or URL provided" }, { status: 400 });

    const [m] = await db.insert(media).values({
      title: title || null,
      caption: caption || null,
      mediaType,
      url,
      linkType,
      linkId,
      uploadedBy: session.id,
    }).returning();

    await logAudit({ userId: session.id, userName: session.name, module: "media", recordId: m.id, action: "create", changes: [{ field: "url", oldValue: null, newValue: url }] });
    return NextResponse.json({ ok: true, data: m });
  } catch (e) {
    return err(e);
  }
}
