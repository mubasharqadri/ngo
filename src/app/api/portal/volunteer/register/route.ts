import { NextRequest, NextResponse } from "next/server";
import { volunteerRegister, setVolunteerCookie } from "@/lib/portalAuth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.email || !body.password) {
      return NextResponse.json({ ok: false, error: "Name, email and password are required" }, { status: 400 });
    }
    if (String(body.password).length < 6) {
      return NextResponse.json({ ok: false, error: "Password must be at least 6 characters" }, { status: 400 });
    }
    const v = await volunteerRegister(body);
    await setVolunteerCookie(v);
    return NextResponse.json({ ok: true, data: v });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Registration failed";
    return NextResponse.json({ ok: false, error: msg }, { status: msg.includes("already") ? 409 : 500 });
  }
}
