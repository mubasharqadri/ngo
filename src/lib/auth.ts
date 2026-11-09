import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";

const SESSION_COOKIE = "sws_session";
const REFRESH_COOKIE = "sws_refresh";

function getSecret() {
  const s = process.env.SESSION_SECRET ?? "shauoor-dev-secret-please-change-in-prod";
  return new TextEncoder().encode(s);
}

export function hashPassword(pw: string) {
  return createHash("sha256").update(`sws::${pw}::salt`).digest("hex");
}

export async function issueTokens(user: { id: number; email: string; fullName: string; roleId: number | null }) {
  const session = await new SignJWT({
    sub: String(user.id),
    email: user.email,
    name: user.fullName,
    roleId: user.roleId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(getSecret());

  const refresh = randomBytes(32).toString("hex");
  return { session, refresh };
}

export async function setSessionCookies(session: string, refresh: string) {
  const c = await cookies();
  c.set(SESSION_COOKIE, session, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60, // 1h
  });
  c.set(REFRESH_COOKIE, refresh, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7d
  });
}

export async function clearSessionCookies() {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
  c.delete(REFRESH_COOKIE);
}

export async function getSession(): Promise<null | {
  id: number;
  email: string;
  name: string;
  roleId: number | null;
  roleName?: string;
}> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const roleId = (payload.roleId as number | null) ?? null;
    let roleName: string | undefined;
    if (roleId) {
      const [r] = await db.select({ name: roles.name }).from(roles).where(eq(roles.id, roleId));
      roleName = r?.name;
    }
    return {
      id: Number(payload.sub),
      email: payload.email as string,
      name: payload.name as string,
      roleId,
      roleName,
    };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const s = await getSession();
  if (!s) {
    throw new Error("Unauthorized");
  }
  return s;
}

export async function authenticate(email: string, password: string) {
  const hash = hashPassword(password);
  const [u] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      passwordHash: users.passwordHash,
      roleId: users.roleId,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.email, email.toLowerCase()));
  if (!u || u.passwordHash !== hash || !u.isActive) {
    return null;
  }
  return { id: u.id, email: u.email, fullName: u.fullName, roleId: u.roleId };
}
