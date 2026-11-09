import { getSession, issueTokens, setSessionCookies } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const [u] = await db
    .select({ id: users.id, email: users.email, fullName: users.fullName, roleId: users.roleId })
    .from(users)
    .where(eq(users.id, session.id));
  if (!u) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 401 });
  }
  const { session: token, refresh } = await issueTokens({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    roleId: u.roleId,
  });
  await setSessionCookies(token, refresh);
  return NextResponse.json({ ok: true });
}
