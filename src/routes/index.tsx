import { createFileRoute } from "@tanstack/react-router";
import { Stage } from "@/components/Stage";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Zoord — AI Humanoid Presentation Stage" },
      { name: "description", content: "Meet Zoord, an advanced humanoid AI, on a premium futuristic 3D stage." },
      { property: "og:title", content: "Zoord — AI Humanoid Presentation Stage" },
      { property: "og:description", content: "Meet Zoord, an advanced humanoid AI, on a premium futuristic 3D stage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Stage,
});
