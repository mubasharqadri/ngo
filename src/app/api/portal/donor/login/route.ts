import { NextRequest, NextResponse } from "next/server";
import { donorLogin, setDonorCookie } from "@/lib/portalAuth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Email and password required" }, { status: 400 });
    }
    const d = await donorLogin(String(email), String(password));
    if (!d) return NextResponse.json({ ok: false, error: "Invalid credentials or portal not activated" }, { status: 401 });
    await setDonorCookie(d);
    await logAudit({ userId: null, userName: `Donor: ${d.name}`, module: "donor-portal", recordId: d.id, action: "login", changes: [{ field: "session", oldValue: null, newValue: "signed in" }] });
    return NextResponse.json({ ok: true, data: d });
  } catch {
    return NextResponse.json({ ok: false, error: "Login failed" }, { status: 500 });
  }
}
