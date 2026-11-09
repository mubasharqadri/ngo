import { makeCrud } from "@/lib/crud";
import { leaves } from "@/db/schema";
const crud = makeCrud({
  table: leaves as never,
  module: "hrm.leaves",
  searchFields: [leaves.leaveType, leaves.reason, leaves.status] as never[],
  orderBy: leaves.id as never,
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
