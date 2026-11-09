import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { missions, missionAssignments, missionResults, volunteers, media, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAccess } from "@/lib/access";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
const MODULE = "missions";

function err(e: unknown) {
  const msg = e instanceof Error ? e.message : "Error";
  if (msg === "Unauthorized") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
  return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
}

// DETAIL with assignments + results + media
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);
    const url = new URL(req.url);
    const isPublic = url.searchParams.get("public") === "1";
    if (!isPublic) await requireAccess(MODULE, "view");

    const [m] = await db.select().from(missions).where(eq(missions.id, numId));
    if (!m) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    if (isPublic && !m.shareOnWebsite) return NextResponse.json({ ok: false, error: "Not shared" }, { status: 404 });

    const assignments = await db
      .select({
        id: missionAssignments.id,
        volunteerId: missionAssignments.volunteerId,
        volunteerName: volunteers.name,
        volunteerPhone: volunteers.phone,
        volunteerType: volunteers.volunteerType,
        note: missionAssignments.note,
        assignedAt: missionAssignments.assignedAt,
      })
      .from(missionAssignments)
      .leftJoin(volunteers, eq(missionAssignments.volunteerId, volunteers.id))
      .where(eq(missionAssignments.missionId, numId));

    let results = await db
      .select({
        id: missionResults.id,
        volunteerId: missionResults.volunteerId,
        volunteerName: volunteers.name,
        feedback: missionResults.feedback,
        outcome: missionResults.outcome,
        location: missionResults.location,
        sharePublicly: missionResults.sharePublicly,
        submittedAt: missionResults.submittedAt,
      })
      .from(missionResults)
      .leftJoin(volunteers, eq(missionResults.volunteerId, volunteers.id))
      .where(eq(missionResults.missionId, numId))
      .orderBy(desc(missionResults.submittedAt));
    if (isPublic) results = results.filter((r) => r.sharePublicly);

    let mediaRows = await db.select().from(media).where(eq(media.linkId, numId)).orderBy(desc(media.id));
    mediaRows = mediaRows.filter((x) => x.linkType === "mission");
    if (isPublic) {
      const publicResultIds = new Set(results.map((r) => r.id));
      // media attached at mission level is public only when mission is shared (already checked)
      void publicResultIds;
    }

    return NextResponse.json({ ok: true, data: { ...m, assignments, results, media: mediaRows } });
  } catch (e) {
    return err(e);
  }
}

// ASSIGN volunteers — body: { volunteerIds: number[], note }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireAccess(MODULE, "edit");
    const { id } = await params;
    const numId = Number(id);
    const body = await req.json();
    const ids: number[] = Array.isArray(body.volunteerIds) ? body.volunteerIds.map(Number).filter(Boolean) : [];
    if (!ids.length) return NextResponse.json({ ok: false, error: "Select at least one volunteer" }, { status: 400 });

    for (const vid of ids) {
      await db.insert(missionAssignments).values({ missionId: numId, volunteerId: vid, note: body.note ?? null });
    }
    await db.update(missions).set({ status: "assigned" }).where(eq(missions.id, numId));
    await logAudit({
      userId: session.id, userName: session.name, module: MODULE, recordId: numId, action: "update",
      changes: [{ field: "assigned_volunteers", oldValue: null, newValue: ids.join(", ") }],
    });
    return NextResponse.json({ ok: true, data: { assigned: ids.length } });
  } catch (e) {
    return err(e);
  }
}
