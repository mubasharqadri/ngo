import { makeCrud } from "@/lib/crud";
import { leads } from "@/db/schema";
const crud = makeCrud({
  table: leads as never,
  module: "crm.leads",
  searchFields: [leads.name, leads.phone, leads.email, leads.notes] as never[],
  orderBy: leads.id as never,
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
