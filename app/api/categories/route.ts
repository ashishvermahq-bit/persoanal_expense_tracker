import { ok, parseBody, withAuth } from "@/lib/api";
import { createCategory, listCategories } from "@/lib/services/categories";
import { createCategorySchema } from "@/lib/validation/category";

export const GET = withAuth(async (request, _ctx, { userId }) => {
  const sp = new URL(request.url).searchParams;
  return ok(
    await listCategories(userId, {
      includeArchived: sp.get("includeArchived") === "1",
      kind: sp.get("kind") === "income" ? "income" : sp.get("kind") === "expense" ? "expense" : undefined,
    })
  );
});

export const POST = withAuth(async (request, _ctx, { userId }) => {
  const input = await parseBody(request, createCategorySchema);
  return ok(await createCategory(userId, input), { status: 201 });
});
