import { createFileRoute } from "@tanstack/react-router";
import { loadPublicPage, publicHead, PublicPage } from "@/lib/public-page";

export const Route = createFileRoute("/")({
  loader: loadPublicPage,
  head: ({ loaderData }) => publicHead(loaderData, "home"),
  component: HomePage,
});

function HomePage() {
  return <PublicPage content={Route.useLoaderData()} section="home" />;
}
