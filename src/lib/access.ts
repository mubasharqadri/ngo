import { db } from "@/db";
import { roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";

/** Fetch the permission list for a role id. */
export async function getPermissions(roleId: number | null): Promise<string[]> {
  if (!roleId) return [];
  const [r] = await db.select({ permissions: roles.permissions }).from(roles).where(eq(roles.id, roleId));
  return (r?.permissions as string[] | null) ?? [];
}

/** Server-side enforcement: throws "Unauthorized" or "Forbidden". */
export async function requireAccess(module: string, action: string) {
  const session = await requireSession();
  const perms = await getPermissions(session.roleId);
  if (!can(perms, module, action)) {
    throw new Error("Forbidden");
  }
  return { session, perms };
}
