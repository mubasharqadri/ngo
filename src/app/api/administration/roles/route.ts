import { makeCrud } from "@/lib/crud";
import { roles } from "@/db/schema";
const crud = makeCrud({
  table: roles as never,
  module: "administration.roles",
  searchFields: [roles.name] as never[],
  orderBy: roles.id as never,
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
