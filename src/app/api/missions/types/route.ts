import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customMissionTypes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAccess } from "@/lib/access";
import { getVolunteerSession } from "@/lib/portalAuth";
import { MISSION_TYPES } from "@/lib/options";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** All mission types: built-in + approved custom (+ pending for admins) */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const includePending = url.searchParams.get("includePending") === "1";
    let custom: { id: number; label: string; proposedBy: string | null; approved: boolean | null }[] = [];
    if (includePending) {
      await requireAccess("missions", "view");
      custom = await db.select().from(customMissionTypes).orderBy(desc(customMissionTypes.id)).limit(200);
    } else {
      custom = await db.select().from(customMissionTypes).where(eq(customMissionTypes.approved, true)).limit(200);
    }
    return NextResponse.json({
      ok: true,
      data: {
        builtin: MISSION_TYPES,
        custom: custom.map((c) => ({ id: c.id, label: c.label, proposedBy: c.proposedBy, approved: c.approved })),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}

/** Propose a new mission type (from ERP user or volunteer) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const label = String(body.label ?? "").trim();
    if (!label) return NextResponse.json({ ok: false, error: "Label required" }, { status: 400 });
    let proposedBy = "ERP user";
    try {
      const { session } = await requireAccess("missions", "create");
      proposedBy = session.name;
    } catch {
      const vol = await getVolunteerSession();
      proposedBy = vol ? `Volunteer: ${vol.name}` : "Anonymous";
    }
    const [existing] = await db.select().from(customMissionTypes).where(eq(customMissionTypes.label, label));
    if (existing) return NextResponse.json({ ok: true, data: existing });
    const [c] = await db.insert(customMissionTypes).values({ label, proposedBy, approved: false }).returning();
    return NextResponse.json({ ok: true, data: c });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}

/** Admin approves/rejects a proposed type */
export async function PATCH(req: NextRequest) {
  try {
    const { session } = await requireAccess("missions", "edit");
    const id = Number(new URL(req.url).searchParams.get("id"));
    const body = await req.json();
    const [u] = await db.update(customMissionTypes).set({ approved: Boolean(body.approved) }).where(eq(customMissionTypes.id, id)).returning();
    await logAudit({
      userId: session.id, userName: session.name, module: "missions", recordId: id, action: "update",
      changes: [{ field: "custom_type", oldValue: null, newValue: `${u.label} → ${u.approved ? "approved" : "rejected"}` }],
    });
    return NextResponse.json({ ok: true, data: u });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
