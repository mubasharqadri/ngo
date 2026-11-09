import { makeCrud } from "@/lib/crud";
import { vendors } from "@/db/schema";

const crud = makeCrud({
  table: vendors as never,
  module: "vendors",
  searchFields: [vendors.name, vendors.phone, vendors.email, vendors.ntnNo, vendors.cnic] as never[],
  orderBy: vendors.id as never,
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
