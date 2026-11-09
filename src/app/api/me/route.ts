import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPermissions } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const permissions = await getPermissions(session.roleId);
  return NextResponse.json({
    ok: true,
    data: {
      user: { id: session.id, name: session.name, email: session.email },
      roleName: session.roleName ?? null,
      permissions,
    },
  });
}
