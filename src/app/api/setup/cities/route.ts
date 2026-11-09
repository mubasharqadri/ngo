import { makeCrud } from "@/lib/crud";
import { cities, districts } from "@/db/schema";
import { db } from "@/db";
import { eq, like, or, asc, sql } from "drizzle-orm";

const crud = makeCrud({
  table: cities as never,
  module: "setup.cities",
  searchFields: [cities.name] as never[],
  orderBy: cities.name as never,
  defaultOrder: "asc",
  // cascade support: ?districtId=X (direct) or ?provinceId=Y (via districts)
  listQuery: async ({ search, params }) => {
    const districtId = params.get("districtId");
    const provinceId = params.get("provinceId");
    let q: any = db.select().from(cities);
    if (districtId) {
      q = q.where(eq(cities.districtId, Number(districtId)));
    } else if (provinceId) {
      q = db
        .select({
          id: cities.id,
          name: cities.name,
          districtId: cities.districtId,
        })
        .from(cities)
        .innerJoin(districts, eq(cities.districtId, districts.id))
        .where(eq(districts.provinceId, Number(provinceId)));
    }
    if (search) {
      q = provinceId && !districtId ? q : q.where(like(cities.name, `%${search}%`));
    }
    return q.orderBy(asc(cities.name)).limit(500);
  },
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
