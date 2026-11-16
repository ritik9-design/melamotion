import { createFileRoute } from "@tanstack/react-router";
import { loadPublicPage, publicHead, PublicPage } from "@/lib/public-page";

export const Route = createFileRoute("/services")({
  loader: loadPublicPage,
  head: ({ loaderData }) => publicHead(loaderData, "services"),
  component: ServicesRoute,
});

function ServicesRoute() {
  return <PublicPage content={Route.useLoaderData()} section="services" />;
}
