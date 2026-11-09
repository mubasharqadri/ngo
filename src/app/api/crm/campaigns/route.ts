import { makeCrud } from "@/lib/crud";
import { campaigns } from "@/db/schema";
const crud = makeCrud({
  table: campaigns as never,
  module: "crm.campaigns",
  searchFields: [campaigns.name, campaigns.type, campaigns.description] as never[],
  orderBy: campaigns.id as never,
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
