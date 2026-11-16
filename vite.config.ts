import path from "node:path";
import { defineConfig, type PluginOption } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

function blockSensitiveFiles(): PluginOption {
  const stop = (url: string | undefined) => {
    const path = url?.split("?")[0] ?? "";
    return path.startsWith("/uploads/enquiry-") || path === "/.env" || path.startsWith("/.git") || path.startsWith("/data/");
  };
  return {
    name: "block-sensitive-files",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (stop(req.url)) {
          res.statusCode = 404;
          res.setHeader("content-type", "text/plain; charset=utf-8");
          res.end("Not found");
          return;
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (stop(req.url)) {
          res.statusCode = 404;
          res.setHeader("content-type", "text/plain; charset=utf-8");
          res.end("Not found");
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ command }) => {
  const plugins: PluginOption[] = [
    blockSensitiveFiles(),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
    viteReact(),
  ];

  if (command === "build") {
    plugins.push(nitro({ defaultPreset: "cloudflare-module" }));
  }

  return {
    server: {
      host: true,
      port: 8080,
      strictPort: true,
    },
    resolve: {
      tsconfigPaths: true,
      alias: { "@": path.resolve(process.cwd(), "src") },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    plugins,
  };
});
