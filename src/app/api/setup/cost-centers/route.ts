import { makeCrud } from "@/lib/crud";
import { costCenters } from "@/db/schema";
const crud = makeCrud({
  table: costCenters as never,
  module: "setup.costcenters",
  searchFields: [costCenters.name, costCenters.code, costCenters.description] as never[],
  orderBy: costCenters.id as never,
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
