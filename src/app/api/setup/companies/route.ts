import { makeCrud } from "@/lib/crud";
import { companies } from "@/db/schema";
const crud = makeCrud({
  table: companies as never,
  module: "setup.companies",
  searchFields: [companies.name, companies.email, companies.phone] as never[],
  orderBy: companies.id as never,
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
