import {
  forwardNestRequest,
  startNestGoogleOAuth,
} from "@/lib/nest-api";

async function proxyApiRequest(request: Request) {
  const { pathname } = new URL(request.url);
  let endpoint: string;
  let method = request.method;

  if (pathname === "/api/auth/google" && method === "POST") {
    return startNestGoogleOAuth(request);
  }
  if (pathname === "/api/auth/password") {
    endpoint = "/auth/password-reset/confirm";
    method = "POST";
  } else if (pathname.startsWith("/api/auth/")) {
    endpoint = pathname.slice("/api".length);
  } else if (
    pathname === "/api/couple" ||
    pathname.startsWith("/api/couple/") ||
    pathname.startsWith("/api/profile/photos") ||
    pathname === "/api/notifications" ||
    pathname === "/api/subscriptions" ||
    pathname === "/api/verification" ||
    pathname === "/api/relationship-events"
  ) {
    endpoint = pathname.slice("/api".length);
  } else {
    endpoint = pathname;
  }

  return forwardNestRequest(request, endpoint, method);
}

export const GET = proxyApiRequest;
export const POST = proxyApiRequest;
export const PUT = proxyApiRequest;
export const PATCH = proxyApiRequest;
export const DELETE = proxyApiRequest;
