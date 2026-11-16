export function contentSecurityPolicy(production: boolean) {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' https: data: blob:",
    "media-src 'self' https: blob:",
    "frame-src https://www.youtube-nocookie.com",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
  ];
  if (production) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function securityHeaders(options: { pathname: string; production: boolean }) {
  const { pathname, production } = options;
  const headers: Record<string, string> = {
    "Content-Security-Policy": contentSecurityPolicy(production),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "X-DNS-Prefetch-Control": "off",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
  if (production) headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  if (pathname === "/admin" || pathname.startsWith("/studio/")) {
    headers["Cache-Control"] = "private, no-store";
    headers["X-Robots-Tag"] = "noindex, nofollow";
    headers["Referrer-Policy"] = "no-referrer";
  } else if (pathname.startsWith("/uploads/")) {
    headers["X-Robots-Tag"] = "noindex, nofollow";
  }
  return headers;
}

export function applySecurityHeaders(response: Response, options: { pathname: string; production: boolean }) {
  const headers = new Headers();
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    headers.set(key, value);
  });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  if (!cookies.length) {
    const single = response.headers.get("set-cookie");
    if (single && !headers.has("set-cookie")) headers.append("set-cookie", single);
  }
  for (const [key, value] of Object.entries(securityHeaders(options))) {
    if (key.toLowerCase() === "cache-control" && headers.has("cache-control")) continue;
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
