import { makeCrud } from "@/lib/crud";
import { posts } from "@/db/schema";

const crud = makeCrud({
  table: posts as never,
  module: "posts",
  searchFields: [posts.title, posts.excerpt, posts.body, posts.category] as never[],
  orderBy: posts.id as never,
  beforeInsert: async (data) => {
    const title = String(data.title ?? "").trim();
    const slug =
      String(data.slug ?? "").trim() ||
      title.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 200) ||
      `post-${Date.now()}`;
    return { ...data, slug };
  },
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
