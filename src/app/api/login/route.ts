import { authenticate, issueTokens, setSessionCookies } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Email and password are required" }, { status: 400 });
    }
    const u = await authenticate(email, password);
    if (!u) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }
    const { session, refresh } = await issueTokens(u);
    await setSessionCookies(session, refresh);
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, u.id));
    await logAudit({
      userId: u.id,
      userName: u.fullName,
      module: "auth",
      recordId: u.id,
      action: "login",
      changes: [{ field: "session", oldValue: null, newValue: "signed in" }],
      ipAddress: req.headers.get("x-forwarded-for"),
    });
    return NextResponse.json({ ok: true, user: { id: u.id, email: u.email, name: u.fullName } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Login failed" }, { status: 500 });
  }
}
