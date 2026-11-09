import { makeCrud } from "@/lib/crud";
import { disbursementBatches } from "@/db/schema";
const crud = makeCrud({
  table: disbursementBatches as never,
  module: "donations.disbursements",
  searchFields: [disbursementBatches.batchNo, disbursementBatches.title, disbursementBatches.notes] as never[],
  orderBy: disbursementBatches.id as never,
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
