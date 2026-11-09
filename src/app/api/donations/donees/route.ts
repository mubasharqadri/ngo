import { makeCrud } from "@/lib/crud";
import { donees } from "@/db/schema";
const crud = makeCrud({
  table: donees as never,
  module: "donations.donees",
  searchFields: [donees.name, donees.cnic, donees.phone, donees.city] as never[],
  orderBy: donees.id as never,
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
