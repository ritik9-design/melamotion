import { createFileRoute } from "@tanstack/react-router";
import { loadPublicPage, publicHead, PublicPage } from "@/lib/public-page";

export const Route = createFileRoute("/contact")({
  loader: loadPublicPage,
  head: ({ loaderData }) => publicHead(loaderData, "contact"),
  component: ContactRoute,
});

function ContactRoute() {
  return <PublicPage content={Route.useLoaderData()} section="contact" />;
}
