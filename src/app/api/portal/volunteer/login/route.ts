import { NextRequest, NextResponse } from "next/server";
import { volunteerLogin, setVolunteerCookie } from "@/lib/portalAuth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ ok: false, error: "Email and password required" }, { status: 400 });
    const v = await volunteerLogin(String(email), String(password));
    if (!v) return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    await setVolunteerCookie(v);
    await logAudit({ userId: null, userName: `Volunteer: ${v.name}`, module: "volunteer-portal", recordId: v.id, action: "login", changes: [{ field: "session", oldValue: null, newValue: "signed in" }] });
    return NextResponse.json({ ok: true, data: v });
  } catch {
    return NextResponse.json({ ok: false, error: "Login failed" }, { status: 500 });
  }
}
