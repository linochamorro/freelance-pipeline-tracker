import { auth } from "@/auth";
import { authConfig } from "@/auth.config";

export { auth as middleware } from "@/auth";

export const config = {
  matcher: authConfig.pages?.signIn
    ? ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"]
    : [],
};
