import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { missions, missionAssignments, missionResults, volunteers } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getVolunteerSession } from "@/lib/portalAuth";

export const dynamic = "force-dynamic";

/** My assigned missions + my submitted results */
export async function GET(_req: NextRequest) {
  try {
    const session = await getVolunteerSession();
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const volId = session.id;

    const [vol] = await db.select().from(volunteers).where(eq(volunteers.id, volId));

    const myMissions = await db
      .select({
        id: missions.id,
        title: missions.title,
        missionType: missions.missionType,
        description: missions.description,
        location: missions.location,
        urgency: missions.urgency,
        status: missions.status,
        thumbnail: missions.thumbnail,
        dueDate: missions.dueDate,
        createdAt: missions.createdAt,
        assignedAt: missionAssignments.assignedAt,
        assignmentNote: missionAssignments.note,
      })
      .from(missionAssignments)
      .innerJoin(missions, eq(missionAssignments.missionId, missions.id))
      .where(eq(missionAssignments.volunteerId, volId))
      .orderBy(desc(missionAssignments.assignedAt));

    const myResults = await db
      .select({
        id: missionResults.id,
        missionId: missionResults.missionId,
        feedback: missionResults.feedback,
        outcome: missionResults.outcome,
        location: missionResults.location,
        sharePublicly: missionResults.sharePublicly,
        submittedAt: missionResults.submittedAt,
      })
      .from(missionResults)
      .where(eq(missionResults.volunteerId, volId))
      .orderBy(desc(missionResults.submittedAt));

    return NextResponse.json({
      ok: true,
      data: {
        volunteer: { id: vol.id, name: vol.name, email: vol.email, type: vol.volunteerType, city: vol.city },
        missions: myMissions,
        results: myResults,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
