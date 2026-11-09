import { makeCrud } from "@/lib/crud";
import { users, roles } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { db } from "@/db";
import { like, or, desc, eq } from "drizzle-orm";

const crud = makeCrud({
  table: users as never,
  module: "administration.users",
  searchFields: [users.fullName, users.email] as never[],
  orderBy: users.id as never,
  // Never expose passwordHash; join role name for display
  listQuery: async ({ search }) => {
    let q: any = db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        roleId: users.roleId,
        roleName: roles.name,
        isActive: users.isActive,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id));
    if (search) {
      q = q.where(or(like(users.fullName, `%${search}%`), like(users.email, `%${search}%`)));
    }
    q = q.orderBy(desc(users.id)).limit(500);
    return q;
  },
  beforeInsert: async (data) => {
    const pw = String(data.password || "changeme123");
    const { password: _p, passwordHash: _h, ...rest } = data as Record<string, unknown>;
    return { ...rest, passwordHash: hashPassword(pw), email: String(data.email ?? "").toLowerCase() };
  },
  beforeUpdate: async (data) => {
    const d = { ...(data as Record<string, unknown>) };
    const newPw = String(d.password || "");
    delete d.password;
    delete d.passwordHash; // never accept raw hashes from the client
    delete d.lastLogin;
    if (newPw) d.passwordHash = hashPassword(newPw);
    return d;
  },
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
