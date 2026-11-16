import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

const guardMiddleware = createMiddleware().server(async ({ next, request, pathname }) => {
  const path = typeof pathname === "string" ? pathname : new URL(request.url).pathname;
  const { guardRequest } = await import("./server/security.server");
  const guarded = await guardRequest(request, path);
  if (guarded) return guarded;
  return next();
});

// requestMiddleware runs on every request; functionMiddleware only on server functions, where
// client sendContext is unvalidated input. Append to these arrays, never replace them.
export const startInstance = createStart(() => ({
  functionMiddleware: [],
  requestMiddleware: [guardMiddleware, errorMiddleware, csrfMiddleware],
}));
