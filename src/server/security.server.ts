import { getRequestHost, getRequestProtocol } from "@tanstack/react-start/server";
import { enquiryMediaType } from "@/lib/enquiry-media";
import { indexablePaths } from "@/lib/site-urls";
import { currentUser } from "@/server/auth.server";
import { readPrivateEnquiryFile } from "@/server/store.server";

function xmlEscape(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function requestOrigin(request: Request) {
  try {
    const protocol = getRequestProtocol({ xForwardedProto: true });
    const host = getRequestHost({ xForwardedHost: true });
    if ((protocol === "https" || protocol === "http") && host && /^[a-zA-Z0-9.:-]+$/.test(host)) {
      return `${protocol}://${host}`;
    }
  } catch {
    // The request URL is enough when the proxy headers are unavailable.
  }
  return new URL(request.url).origin;
}

function textResponse(body: string, status: number, type: string) {
  return new Response(body, {
    status,
    headers: { "content-type": type, "cache-control": "no-store" },
  });
}

function robots(origin: string) {
  return textResponse(
    ["User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /studio/", "Disallow: /uploads/", "", `Sitemap: ${origin}/sitemap.xml`, ""].join("\n"),
    200,
    "text/plain; charset=utf-8",
  );
}

function sitemap(origin: string) {
  const urls = indexablePaths()
    .map((path) => `  <url><loc>${xmlEscape(`${origin}${path}`)}</loc></url>`)
    .join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return textResponse(body, 200, "application/xml; charset=utf-8");
}

function blockedPath(pathname: string) {
  const lower = pathname.toLowerCase();
  if (lower.includes("..") || lower.includes("\\") || lower.includes("\0")) return true;
  const blocked = ["/.env", "/.git", "/data", "/src", "/node_modules", "/server"];
  return blocked.some((prefix) => lower === prefix || lower.startsWith(`${prefix}/`));
}

async function enquiryFile(pathname: string, method: string) {
  const user = await currentUser();
  if (!user) return textResponse("Unauthorized", 401, "text/plain; charset=utf-8");
  const file = await readPrivateEnquiryFile(pathname);
  if (!file) return textResponse("Not found", 404, "text/plain; charset=utf-8");
  const type = enquiryMediaType(file.name, null);
  const inline = type.startsWith("image/") || type.startsWith("video/");
  const downloadName = file.name.replace(/[^a-zA-Z0-9._-]/g, "");
  const headers = {
    "content-type": type,
    "content-disposition": `${inline ? "inline" : "attachment"}; filename="${downloadName}"`,
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
  };
  if (method === "HEAD") return new Response(null, { status: 200, headers });
  return new Response(file.content, { status: 200, headers });
}

/** Handle private files, crawler files, and paths that must never be served. */
export async function guardRequest(request: Request, pathname: string) {
  if (blockedPath(pathname) || pathname.startsWith("/uploads/enquiry-")) {
    return textResponse("Not found", 404, "text/plain; charset=utf-8");
  }

  const read = request.method === "GET" || request.method === "HEAD";
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") {
    if (!read) return textResponse("Method not allowed", 405, "text/plain; charset=utf-8");
    const origin = requestOrigin(request);
    return pathname === "/robots.txt" ? robots(origin) : sitemap(origin);
  }

  if (pathname.startsWith("/studio/files/")) {
    if (!read) return textResponse("Method not allowed", 405, "text/plain; charset=utf-8");
    return enquiryFile(pathname, request.method);
  }

  return null;
}
