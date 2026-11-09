import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/db";
import { donors, volunteers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";

export const DONOR_COOKIE = "sws_donor";
export const VOL_COOKIE = "sws_volunteer";

function secret() {
  return new TextEncoder().encode(process.env.SESSION_SECRET ?? "shauoor-dev-secret-please-change-in-prod");
}

async function sign(payload: Record<string, unknown>, hours: number) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${hours}h`).sign(secret());
}

async function verify(token: string | undefined): Promise<Record<string, unknown> | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ---------- DONOR PORTAL ----------
export async function donorLogin(email: string, password: string) {
  const [d] = await db.select().from(donors).where(eq(donors.portalEmail, email.toLowerCase()));
  if (!d || !d.passwordHash || !d.portalActive) return null;
  if (d.passwordHash !== hashPassword(password)) return null;
  await db.update(donors).set({ lastPortalLogin: new Date() }).where(eq(donors.id, d.id));
  return { id: d.id, name: d.name, email: String(d.portalEmail ?? d.email ?? "") };
}

export async function setDonorCookie(d: { id: number; name: string; email: string }) {
  const c = await cookies();
  c.set(DONOR_COOKIE, await sign({ sub: String(d.id), name: d.name, email: d.email, kind: "donor" }, 24 * 7), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getDonorSession(): Promise<{ id: number; name: string; email: string } | null> {
  const c = await cookies();
  const p = await verify(c.get(DONOR_COOKIE)?.value);
  if (!p || p.kind !== "donor") return null;
  return { id: Number(p.sub), name: String(p.name), email: String(p.email) };
}

export async function clearDonorCookie() {
  (await cookies()).delete(DONOR_COOKIE);
}

// ---------- VOLUNTEER PORTAL ----------
export async function volunteerLogin(email: string, password: string) {
  const [v] = await db.select().from(volunteers).where(eq(volunteers.email, email.toLowerCase()));
  if (!v || !v.isActive) return null;
  if (v.passwordHash !== hashPassword(password)) return null;
  await db.update(volunteers).set({ lastLogin: new Date() }).where(eq(volunteers.id, v.id));
  return { id: v.id, name: v.name, email: v.email };
}

export async function volunteerRegister(data: { name: string; email: string; password: string; phone?: string; city?: string; volunteerType?: string; skills?: string }) {
  const email = data.email.toLowerCase();
  const [existing] = await db.select({ id: volunteers.id }).from(volunteers).where(eq(volunteers.email, email));
  if (existing) throw new Error("An account with this email already exists");
  const [v] = await db.insert(volunteers).values({
    name: data.name,
    email,
    passwordHash: hashPassword(data.password),
    phone: data.phone || null,
    city: data.city || null,
    volunteerType: data.volunteerType || "citizen",
    skills: data.skills || null,
  }).returning();
  return { id: v.id, name: v.name, email };
}

export async function setVolunteerCookie(v: { id: number; name: string; email: string }) {
  const c = await cookies();
  c.set(VOL_COOKIE, await sign({ sub: String(v.id), name: v.name, email: v.email, kind: "volunteer" }, 24 * 7), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getVolunteerSession(): Promise<{ id: number; name: string; email: string } | null> {
  const c = await cookies();
  const p = await verify(c.get(VOL_COOKIE)?.value);
  if (!p || p.kind !== "volunteer") return null;
  return { id: Number(p.sub), name: String(p.name), email: String(p.email) };
}

export async function clearVolunteerCookie() {
  (await cookies()).delete(VOL_COOKIE);
}
