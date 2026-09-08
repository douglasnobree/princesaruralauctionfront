import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PR Leilões",
    short_name: "PR Leilões",
    description:
      "Leilões rurais, lotes e disputas do PR Leilões.",
    start_url: "/leiloes",
    display: "standalone",
    background_color: "#062518",
    theme_color: "#062518",
    lang: "pt-BR",
    icons: [
      {
        src: "/brand/pr-leiloes/favicon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
