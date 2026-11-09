import { makeCrud } from "@/lib/crud";
import { districts } from "@/db/schema";
const crud = makeCrud({
  table: districts as never,
  module: "setup.districts",
  searchFields: [districts.name] as never[],
  orderBy: districts.id as never,
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
