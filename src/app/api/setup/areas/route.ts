import { makeCrud } from "@/lib/crud";
import { areas } from "@/db/schema";

// supports ?cityId=X filter via the generic column filter in makeCrud
const crud = makeCrud({
  table: areas as never,
  module: "setup.cities",
  searchFields: [areas.name] as never[],
  orderBy: areas.name as never,
  defaultOrder: "asc",
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
