import { withErrorHandler } from "@/lib/api-middleware";
import { clearAdminSessionResponse } from "@/lib/admin-auth";

export const POST = withErrorHandler(async () => {
  return await clearAdminSessionResponse();
});
