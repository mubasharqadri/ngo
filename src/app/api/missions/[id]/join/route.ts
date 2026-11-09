import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { missions, missionAssignments } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { getVolunteerSession } from "@/lib/portalAuth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Volunteer / Philanthropist / Social Worker self-joins a mission from the public page. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const vol = await getVolunteerSession();
    if (!vol) return NextResponse.json({ ok: false, error: "Please sign in as a volunteer to join a mission" }, { status: 401 });
    const { id } = await params;
    const missionId = Number(id);

    const [m] = await db.select().from(missions).where(eq(missions.id, missionId));
    if (!m) return NextResponse.json({ ok: false, error: "Mission not found" }, { status: 404 });
    if (!m.shareOnWebsite) return NextResponse.json({ ok: false, error: "This mission is not open for joining" }, { status: 400 });

    // capacity check
    const [cnt] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(missionAssignments)
      .where(eq(missionAssignments.missionId, missionId));
    if (m.maxHelpers && cnt.c >= m.maxHelpers) {
      return NextResponse.json({ ok: false, error: `Mission team is full (${m.maxHelpers} max). Contact the Shauoor team to join the waiting list.` }, { status: 400 });
    }

    const [existing] = await db
      .select({ id: missionAssignments.id })
      .from(missionAssignments)
      .where(and(eq(missionAssignments.missionId, missionId), eq(missionAssignments.volunteerId, vol.id)));
    if (existing) return NextResponse.json({ ok: false, error: "You have already joined this mission" }, { status: 409 });

    const body = await req.json().catch(() => ({}));
    const [a] = await db
      .insert(missionAssignments)
      .values({ missionId, volunteerId: vol.id, note: String(body.note ?? "Joined from website") })
      .returning();

    // move open → assigned
    if (m.status === "open") await db.update(missions).set({ status: "assigned" }).where(eq(missions.id, missionId));

    await logAudit({
      userId: null, userName: `Volunteer: ${vol.name}`, module: "missions", recordId: missionId, action: "update",
      changes: [{ field: "self_joined", oldValue: `${cnt.c} helpers`, newValue: `${cnt.c + 1} helpers` }],
    });
    return NextResponse.json({ ok: true, data: a });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Failed to join" }, { status: 500 });
  }
}
