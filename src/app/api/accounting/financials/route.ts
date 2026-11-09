import { NextRequest, NextResponse } from "next/server";
import { requireAccess } from "@/lib/access";
import { computeFinancials } from "@/lib/financials";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAccess("accounting.reports", "view");
    const url = new URL(req.url);
    const data = await computeFinancials(url.searchParams.get("from") ?? "", url.searchParams.get("to") ?? "");
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "No permission" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
