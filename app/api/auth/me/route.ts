import { ApiError, ok, withAuth } from "@/lib/api";
import { User } from "@/models/user";

export const GET = withAuth(async (_request, _ctx, { userId }) => {
  const user = await User.findById(userId, { name: 1, email: 1, createdAt: 1 }).lean();
  if (!user) throw new ApiError("UNAUTHORIZED", "Please sign in");
  return ok({ user: { id: user._id.toHexString(), name: user.name, email: user.email, createdAt: user.createdAt } });
});
