import { clearAdminCookieResponse } from "@/lib/admin-auth";

export async function POST() {
  return clearAdminCookieResponse();
}
