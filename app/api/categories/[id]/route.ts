import { ok, parseBody, withAuth } from "@/lib/api";
import { deleteCategory, updateCategory } from "@/lib/services/categories";
import { updateCategorySchema } from "@/lib/validation/category";

type Ctx = RouteContext<"/api/categories/[id]">;

export const PATCH = withAuth<Ctx>(async (request, ctx, { userId }) => {
  const { id } = await ctx.params;
  const input = await parseBody(request, updateCategorySchema);
  return ok(await updateCategory(userId, id, input));
});

export const DELETE = withAuth<Ctx>(async (_request, ctx, { userId }) => {
  const { id } = await ctx.params;
  return ok(await deleteCategory(userId, id));
});
