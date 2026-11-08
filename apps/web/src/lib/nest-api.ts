import { NextResponse } from "next/server";

export function getNestApiBaseUrl(): URL | null {
  const configuredUrl = process.env.API_INTERNAL_URL;
  if (!configuredUrl) return null;

  try {
    const url = new URL(configuredUrl);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

export function forwardNestSetCookies(source: Headers, destination: Headers) {
  for (const cookie of source.getSetCookie()) {
    destination.append(
      "set-cookie",
      cookie.replace(/;\s*Path=\/auth(?=;|$)/i, "; Path=/"),
    );
  }
}

function unavailableResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 503 });
}

export async function forwardNestRequest(
  request: Request,
  endpoint: string,
  method = request.method,
) {
  const baseUrl = getNestApiBaseUrl();
  if (!baseUrl) {
    return unavailableResponse(
      "Backend NestJS chưa được cấu hình. Hãy thiết lập API_INTERNAL_URL.",
    );
  }

  const target = new URL(endpoint, `${baseUrl.origin}/`);
  const incomingUrl = new URL(request.url);
  target.search = incomingUrl.search;
  const headers = new Headers();
  for (const name of ["authorization", "cookie", "content-type", "origin"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const hasBody = !["GET", "HEAD"].includes(method.toUpperCase());
    const upstream = await fetch(target, {
      method,
      headers,
      ...(hasBody ? { body: await request.arrayBuffer() } : {}),
      cache: "no-store",
      redirect: "manual",
    });
    const responseHeaders = new Headers();
    const contentType = upstream.headers.get("content-type");
    const location = upstream.headers.get("location");
    if (contentType) responseHeaders.set("content-type", contentType);
    if (location) responseHeaders.set("location", location);
    forwardNestSetCookies(upstream.headers, responseHeaders);

    if (upstream.status === 204 || upstream.status === 304) {
      return new NextResponse(null, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    const body = new Uint8Array(await upstream.arrayBuffer());
    if (contentType?.includes("application/json")) {
      try {
        const payload = JSON.parse(new TextDecoder().decode(body)) as {
          error?: string;
          message?: string | string[];
        };
        if (!upstream.ok && !payload.error && payload.message) {
          payload.error = Array.isArray(payload.message)
            ? payload.message.join(" ")
            : payload.message;
          responseHeaders.set("content-type", "application/json");
          return NextResponse.json(payload, {
            status: upstream.status,
            headers: responseHeaders,
          });
        }
      } catch {
        return new NextResponse(body, {
          status: upstream.status,
          headers: responseHeaders,
        });
      }
    }

    return new NextResponse(body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Could not reach the NestJS API.", error);
    return unavailableResponse(
      "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.",
    );
  }
}

export async function startNestGoogleOAuth(request: Request) {
  const baseUrl = getNestApiBaseUrl();
  if (!baseUrl) {
    return unavailableResponse(
      "Backend NestJS chưa được cấu hình. Hãy thiết lập API_INTERNAL_URL.",
    );
  }

  try {
    const upstream = await fetch(new URL("/auth/google", baseUrl), {
      method: "GET",
      headers: request.headers.get("origin")
        ? { origin: request.headers.get("origin") as string }
        : {},
      cache: "no-store",
      redirect: "manual",
    });
    const responseHeaders = new Headers();
    forwardNestSetCookies(upstream.headers, responseHeaders);
    const location = upstream.headers.get("location");
    if (upstream.status >= 400 || !location) {
      const body = await upstream.text();
      return new NextResponse(body, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }
    return NextResponse.json(
      { url: location },
      { status: 200, headers: responseHeaders },
    );
  } catch (error) {
    console.error("Could not start NestJS Google OAuth.", error);
    return unavailableResponse(
      "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.",
    );
  }
}

export async function nestApiIsAuthenticated(cookieHeader: string) {
  const baseUrl = getNestApiBaseUrl();
  if (!baseUrl) return false;

  try {
    const response = await fetch(new URL("/auth/me", baseUrl), {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    return response.ok;
  } catch (error) {
    console.error("Could not verify the NestJS session.", error);
    return false;
  }
}
