import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Routes that require an authenticated session. Customer-protected routes and
 * the admin area are gated here (defense-in-depth — server actions re-check
 * roles per ADR 0001). The sign-in route + admin RBAC role check are wired in
 * Phase 1B; in Phase 1A only the public placeholder route exists.
 */
const isProtectedRoute = createRouteMatcher([
  "/account(.*)",
  "/cart(.*)",
  "/checkout(.*)",
  "/orders(.*)",
  "/wishlist(.*)",
  "/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|gif|png|svg|ico|webp|woff2?|ttf|map)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
