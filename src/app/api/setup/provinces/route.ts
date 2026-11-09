import { makeCrud } from "@/lib/crud";
import { provinces } from "@/db/schema";
const crud = makeCrud({
  table: provinces as never,
  module: "setup.provinces",
  searchFields: [provinces.name] as never[],
  orderBy: provinces.id as never,
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
