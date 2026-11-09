import { makeCrud } from "@/lib/crud";
import { disbursements } from "@/db/schema";
const crud = makeCrud({
  table: disbursements as never,
  module: "donations.disbursements",
  searchFields: [disbursements.doneeName, disbursements.donorReceiptNo, disbursements.program, disbursements.instrumentNo, disbursements.remarks] as never[],
  orderBy: disbursements.id as never,
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
