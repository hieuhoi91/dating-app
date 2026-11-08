import { NextResponse, type NextRequest } from "next/server";
import {
  forwardNestSetCookies,
  getNestApiBaseUrl,
} from "@/lib/nest-api";

function hasCookie(cookieHeader: string, name: string) {
  return cookieHeader.split(";").some((part) => part.trim().startsWith(`${name}=`));
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

function backendUnavailableResponse() {
  return NextResponse.json(
    {
      error:
        'Máy chủ đang tạm thời không khả dụng. Phiên đăng nhập của bạn chưa bị xóa; vui lòng thử tải lại sau.',
    },
    { status: 503 },
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedPage = pathname === "/app" || pathname.startsWith("/app/");
  const isEntryPage =
    pathname === "/" || pathname === "/auth" || pathname === "/auth/login";
  if (!isProtectedPage && !isEntryPage) return NextResponse.next();

  const apiBaseUrl = getNestApiBaseUrl();
  if (!apiBaseUrl) {
    return isProtectedPage
      ? redirectTo(request, "/auth/login?error=backend")
      : NextResponse.next();
  }

  let cookieHeader = request.headers.get("cookie") ?? "";
  let authenticated = false;
  let backendUnavailable = false;
  let refreshedResponse: Response | undefined;

  try {
    const identityResponse = await fetch(new URL("/auth/me", apiBaseUrl), {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    authenticated = identityResponse.ok;
    backendUnavailable = identityResponse.status >= 500;

    const refreshCookieName =
      process.env.AUTH_REFRESH_COOKIE_NAME ?? "dating_refresh";
    if (
      !authenticated &&
      !backendUnavailable &&
      hasCookie(cookieHeader, refreshCookieName)
    ) {
      refreshedResponse = await fetch(new URL("/auth/refresh", apiBaseUrl), {
        method: "POST",
        headers: {
          cookie: cookieHeader,
          origin: process.env.WEB_APP_ORIGIN ?? request.nextUrl.origin,
        },
        cache: "no-store",
      });
      authenticated = refreshedResponse.ok;
      backendUnavailable = refreshedResponse.status >= 500;

      if (authenticated) {
        for (const cookie of refreshedResponse.headers.getSetCookie()) {
          const pair = cookie.split(";", 1)[0];
          const separator = pair.indexOf("=");
          if (separator > 0) {
            request.cookies.set(
              pair.slice(0, separator),
              pair.slice(separator + 1),
            );
          }
        }
        cookieHeader = request.headers.get("cookie") ?? cookieHeader;
      }
    }
  } catch (error) {
    console.error("Could not validate the NestJS session.", error);
    backendUnavailable = true;
  }

  if (isProtectedPage && backendUnavailable) {
    return backendUnavailableResponse();
  }

  if (isProtectedPage && !authenticated) {
    const destination = new URL("/auth/login", request.url);
    destination.searchParams.set(
      "next",
      `${pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(destination);
  }
  if (isEntryPage && authenticated) {
    const response = redirectTo(request, "/app");
    if (refreshedResponse) {
      forwardNestSetCookies(refreshedResponse.headers, response.headers);
    }
    return response;
  }

  const response = NextResponse.next({ request });
  if (refreshedResponse) {
    forwardNestSetCookies(refreshedResponse.headers, response.headers);
  }
  return response;
}

export const config = {
  matcher: ["/", "/auth/:path*", "/app/:path*"],
};
