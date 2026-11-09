import { makeCrud } from "@/lib/crud";
import { countries } from "@/db/schema";
const crud = makeCrud({
  table: countries as never,
  module: "setup.countries",
  searchFields: [countries.name, countries.code] as never[],
  orderBy: countries.id as never,
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
