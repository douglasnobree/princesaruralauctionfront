import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const IMAGE_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;

const nextConfig: NextConfig = {
	agentRules: false,
	/* config options here */
	// The local Chrome validation uses 127.0.0.1 while Next starts on localhost.
	// Allow the development HMR and Server Action resources from that same local host.
	allowedDevOrigins: isDev ? ["127.0.0.1"] : undefined,
	experimental: {
		serverActions: {
			// Com upload SEQUENCIAL (uma imagem por vez), não precisamos de limite alto
			// Cada requisição envia no máximo 1 imagem de 5MB + overhead (~30%) = ~6.5MB
			// Configurando 10MB como margem de segurança
			bodySizeLimit: '10mb',
		},
	},
	images: {
		// As imagens dos leilões são dinâmicas e vêm do backend. O navegador
		// acessa essas URLs diretamente, evitando rejeições do /_next/image
		// quando o container é atualizado com uma configuração antiga em cache.
		unoptimized: true,
		formats: ["image/avif", "image/webp"],
		minimumCacheTTL: IMAGE_CACHE_TTL_SECONDS,
		remotePatterns: [
			{
				protocol: "http",
				hostname: "localhost",
				port: "4000",
				pathname: "/uploads/**",
			},
			{
				protocol: "http",
				hostname: "127.0.0.1",
				port: "4000",
				pathname: "/uploads/**",
			},
			{
				protocol: "https",
				hostname: "back.princesarural.com.br",
				pathname: "/uploads/**",
			},
		],
	},
};

export default nextConfig;
