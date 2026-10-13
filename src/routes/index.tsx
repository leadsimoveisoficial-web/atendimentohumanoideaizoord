import { createFileRoute } from "@tanstack/react-router";
import { Stage } from "@/components/Stage";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "DAKKAI Sushi × Zoord — Cardápio 3D" },
      { name: "description", content: "Palco 3D do DAKKAI Sushi com o robô Zoord e o cardápio completo voando, com preços." },
      { property: "og:title", content: "DAKKAI Sushi × Zoord — Cardápio 3D" },
      { property: "og:description", content: "Palco 3D do DAKKAI Sushi com o robô Zoord e o cardápio completo voando, com preços." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Stage,
});
