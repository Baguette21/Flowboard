import { query } from "./_generated/server";
import { getCurrentUser } from "./helpers/boardAccess";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) {
      return null;
    }

    return {
      _id: currentUser.user._id,
      name: currentUser.user.name ?? null,
      email: currentUser.user.email ?? null,
    };
  },
});
