import { createFileRoute } from "@tanstack/react-router";
import { Stage } from "@/components/Stage";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Jade Humanoide Atendente — Atendimento 3D" },
      { name: "description", content: "Conheça a Atendente Jade, a anfitriã do Dakkai Sushi: cardápio com preços, atendimento por voz e rádios por gênero." },
      { property: "og:title", content: "Jade Humanoide Atendente — Atendimento 3D" },
      { property: "og:description", content: "Conheça a Atendente Jade, a anfitriã do Dakkai Sushi: cardápio com preços, atendimento por voz e rádios por gênero." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Stage,
});
