import { createFileRoute } from "@tanstack/react-router";
import { Stage } from "@/components/Stage";
import restaurant from "@/assets/dakkai-restaurant-4k.glb.asset.json";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "DAKKAI Sushi × Zoord — Cardápio 3D" },
      { name: "description", content: "Conheça Zoord, o maître do Dakkai Sushi: cardápio com preços, atendimento por voz e rádios por gênero." },
      { property: "og:title", content: "DAKKAI Sushi × Zoord — Cardápio 3D" },
      { property: "og:description", content: "Conheça Zoord, o maître do Dakkai Sushi: cardápio com preços, atendimento por voz e rádios por gênero." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Stage,
});
