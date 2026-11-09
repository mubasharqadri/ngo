import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { missions, missionAssignments, volunteers, missionResults, users } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { requireAccess } from "@/lib/access";
import { logAudit, snapshotChanges } from "@/lib/audit";

export const dynamic = "force-dynamic";
const MODULE = "missions";

function err(e: unknown) {
  const msg = e instanceof Error ? e.message : "Error";
  if (msg === "Unauthorized") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
  console.error(e);
  return NextResponse.json({ ok: false, error: msg }, { status: 500 });
}

// LIST — ?public=1 returns only website-shared missions (no auth)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const isPublic = url.searchParams.get("public") === "1";
    if (!isPublic) await requireAccess(MODULE, "view");

    let q: any = db
      .select({
        id: missions.id,
        title: missions.title,
        missionType: missions.missionType,
        description: missions.description,
        location: missions.location,
        urgency: missions.urgency,
        status: missions.status,
        shareOnWebsite: missions.shareOnWebsite,
        thumbnail: missions.thumbnail,
        dueDate: missions.dueDate,
        createdAt: missions.createdAt,
        assignedCount: sql<number>`(SELECT count(*) FROM mission_assignments ma WHERE ma.mission_id = ${missions.id})::int`,
        resultsCount: sql<number>`(SELECT count(*) FROM mission_results mr WHERE mr.mission_id = ${missions.id})::int`,
      })
      .from(missions);
    if (isPublic) q = q.where(eq(missions.shareOnWebsite, true));
    const rows = await q.orderBy(desc(missions.id)).limit(300);
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    return err(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAccess(MODULE, "create");
    const body = await req.json();
    const [m] = await db
      .insert(missions)
      .values({
        title: body.title,
        missionType: body.missionType ?? "child-rescue",
        description: body.description ?? null,
        location: body.location ?? null,
        urgency: body.urgency ?? "medium",
        status: "open",
        shareOnWebsite: Boolean(body.shareOnWebsite),
        thumbnail: body.thumbnail ?? null,
        assignedBy: session.id,
        dueDate: body.dueDate ?? null,
        countryId: body.countryId ?? null,
        provinceId: body.provinceId ?? null,
        districtId: body.districtId ?? null,
        cityId: body.cityId ?? null,
        area: body.area ?? null,
        maxHelpers: body.maxHelpers ? Number(body.maxHelpers) : null,
        otherTypeLabel: body.otherTypeLabel ?? null,
      })
      .returning();
    await logAudit({ userId: session.id, userName: session.name, module: MODULE, recordId: m.id, action: "create", changes: snapshotChanges({ title: m.title, missionType: m.missionType, urgency: m.urgency }, "create") });
    return NextResponse.json({ ok: true, data: m });
  } catch (e) {
    return err(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { session } = await requireAccess(MODULE, "edit");
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    const body = await req.json();
    const allowed: Record<string, unknown> = {};
    for (const k of ["title", "missionType", "description", "location", "urgency", "status", "shareOnWebsite", "thumbnail", "dueDate"]) {
      if (k in body) allowed[k] = body[k];
    }
    const [updated] = await db.update(missions).set(allowed).where(eq(missions.id, id)).returning();
    await logAudit({ userId: session.id, userName: session.name, module: MODULE, recordId: id, action: "update", changes: Object.entries(allowed).map(([f, v]) => ({ field: f, oldValue: null, newValue: v })) });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e) {
    return err(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { session } = await requireAccess(MODULE, "delete");
    const id = Number(new URL(req.url).searchParams.get("id"));
    await db.delete(missions).where(eq(missions.id, id));
    await logAudit({ userId: session.id, userName: session.name, module: MODULE, recordId: id, action: "delete", changes: [] });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return err(e);
  }
}
