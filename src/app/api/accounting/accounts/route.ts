import { makeCrud } from "@/lib/crud";
import { accounts } from "@/db/schema";
const crud = makeCrud({
  table: accounts as never,
  module: "accounting.accounts",
  searchFields: [accounts.name, accounts.code, accounts.type] as never[],
  orderBy: accounts.id as never,
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
