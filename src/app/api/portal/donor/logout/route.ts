import { NextResponse } from "next/server";
import { clearDonorCookie } from "@/lib/portalAuth";

export async function POST() {
  await clearDonorCookie();
  return NextResponse.json({ ok: true });
}
