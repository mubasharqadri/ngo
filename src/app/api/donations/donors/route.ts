import { makeCrud } from "@/lib/crud";
import { donors } from "@/db/schema";
const crud = makeCrud({
  table: donors as never,
  module: "donations.donors",
  searchFields: [donors.name, donors.email, donors.phone, donors.cnic] as never[],
  orderBy: donors.id as never,
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
