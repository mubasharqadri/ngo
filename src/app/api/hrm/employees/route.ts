import { makeCrud } from "@/lib/crud";
import { employees } from "@/db/schema";
const crud = makeCrud({
  table: employees as never,
  module: "hrm.employees",
  searchFields: [employees.fullName, employees.employeeCode, employees.email, employees.phone, employees.designation] as never[],
  orderBy: employees.id as never,
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
