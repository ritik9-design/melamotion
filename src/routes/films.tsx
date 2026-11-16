import { createFileRoute } from "@tanstack/react-router";
import { loadPublicPage, publicHead, PublicPage } from "@/lib/public-page";

export const Route = createFileRoute("/films")({
  loader: loadPublicPage,
  head: ({ loaderData }) => publicHead(loaderData, "films"),
  component: FilmsRoute,
});

function FilmsRoute() {
  return <PublicPage content={Route.useLoaderData()} section="films" />;
}
