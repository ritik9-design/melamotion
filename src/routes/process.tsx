import { createFileRoute } from "@tanstack/react-router";
import { loadPublicPage, publicHead, PublicPage } from "@/lib/public-page";

export const Route = createFileRoute("/process")({
  loader: loadPublicPage,
  head: ({ loaderData }) => publicHead(loaderData, "process"),
  component: ProcessRoute,
});

function ProcessRoute() {
  return <PublicPage content={Route.useLoaderData()} section="process" />;
}
