import { createFileRoute } from "@tanstack/react-router";
import { loadPublicPage, publicHead, PublicPage } from "@/lib/public-page";

export const Route = createFileRoute("/about")({
  loader: loadPublicPage,
  head: ({ loaderData }) => publicHead(loaderData, "about"),
  component: AboutRoute,
});

function AboutRoute() {
  return <PublicPage content={Route.useLoaderData()} section="about" />;
}
