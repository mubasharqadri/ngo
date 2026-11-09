import { makeCrud } from "@/lib/crud";
import { attendance, employees } from "@/db/schema";
import { db } from "@/db";
import { eq, desc } from "drizzle-orm";

const crud = makeCrud({
  table: attendance as never,
  module: "hrm.attendance",
  searchFields: [attendance.status, attendance.notes] as never[],
  orderBy: attendance.date as never,
  defaultOrder: "desc",
  // join employee so the UI can compute "late" against each employee's own time-in
  listQuery: async ({ params }) => {
    const limit = Math.min(500, Number(params.get("limit") ?? 200));
    return db
      .select({
        id: attendance.id,
        employeeId: attendance.employeeId,
        employeeName: employees.fullName,
        empTimeIn: employees.timeIn,
        empTimeOut: employees.timeOut,
        date: attendance.date,
        status: attendance.status,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        notes: attendance.notes,
        mode: attendance.mode,
      })
      .from(attendance)
      .leftJoin(employees, eq(attendance.employeeId, employees.id))
      .orderBy(desc(attendance.date), desc(attendance.id))
      .limit(limit);
  },
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
