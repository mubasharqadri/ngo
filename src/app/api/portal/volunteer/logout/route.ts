import { NextResponse } from "next/server";
import { clearVolunteerCookie } from "@/lib/portalAuth";

export async function POST() {
  await clearVolunteerCookie();
  return NextResponse.json({ ok: true });
}
