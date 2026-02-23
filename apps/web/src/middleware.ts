// CSRF posture: Clerk middleware validates session JWTs on every request, which
// provides implicit CSRF protection — tokens are stored in httpOnly cookies with
// SameSite=Lax (Clerk default). Supabase calls use per-request JWTs from
// getToken(), not cookies, so they are inherently CSRF-safe. No additional CSRF
// token mechanism is required for this auth architecture.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/share/validate",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return;
  }

  // Allow share-link access to boards without auth
  const url = new URL(request.url);
  if (url.pathname.startsWith("/board/") && url.searchParams.has("share")) {
    return;
  }

  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
