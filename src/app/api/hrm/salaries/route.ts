import { makeCrud } from "@/lib/crud";
import { salaries } from "@/db/schema";
const crud = makeCrud({
  table: salaries as never,
  module: "hrm.salaries",
  searchFields: [salaries.month, salaries.status] as never[],
  orderBy: salaries.id as never,
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
