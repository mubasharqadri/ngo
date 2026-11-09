import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { missionResults, missions, media } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getVolunteerSession } from "@/lib/portalAuth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Volunteer submits result/feedback (optionally with photos/videos) from mobile. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getVolunteerSession();
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const missionId = Number(id);

    const body = await req.json();
    const [result] = await db
      .insert(missionResults)
      .values({
        missionId,
        volunteerId: session.id,
        feedback: body.feedback ?? "",
        outcome: body.outcome ?? "pending",
        location: body.location ?? null,
        sharePublicly: Boolean(body.sharePublicly),
      })
      .returning();

    // attach any media urls submitted with the result
    const items: { url: string; mediaType: string; title?: string }[] = Array.isArray(body.media) ? body.media : [];
    for (const m of items.slice(0, 10)) {
      if (!m.url) continue;
      await db.insert(media).values({
        title: m.title || `Mission #${missionId} — ${session.name}`,
        caption: body.feedback ?? null,
        mediaType: m.mediaType === "video" ? "video" : "image",
        url: m.url,
        linkType: "mission",
        linkId: missionId,
        uploadedBy: null,
      });
    }

    await logAudit({
      userId: null, userName: `Volunteer: ${session.name}`, module: "missions", recordId: missionId, action: "update",
      changes: [{ field: "result_submitted", oldValue: null, newValue: `${body.outcome ?? "pending"} — ${(body.feedback ?? "").slice(0, 80)}` }],
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Failed to submit result" }, { status: 500 });
  }
}
