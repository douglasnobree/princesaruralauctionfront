# Princesa Rural — Frontend de Leilões

Frontend Next.js independente para a agenda, os lotes e a participação nos leilões da Princesa Rural.

## Desenvolvimento

```bash
npm install
npm run dev -- --port 3001
```

Configure `.env.local` a partir de `.env.example`. O catálogo, o cadastro, o login e as ações de lance usam a mesma API do frontend principal.

O login sincroniza os dois sites com um ticket SSO curto e de uso único: o site que recebe a senha cria a passagem no backend, o outro site a consome e grava sua própria sessão. Para produção, configure `NEXT_PUBLIC_MARKETPLACE_URL=https://princesarural.com.br` e `NEXT_PUBLIC_AUCTION_APP_URL=https://prleiloes.com` nos dois frontends. Como os domínios são independentes, entrar manualmente em uma URL sem passar pelo handoff não permite que o navegador revele a sessão do outro domínio.

## Deploy com Docker

O arquivo `docker-compose.production.yml` cria o serviço `frontleiloes` na rede externa `apps_app-network`, permitindo que o Nginx use `proxy_pass http://frontleiloes:3000`.

No servidor, copie este projeto para `/apps/frontleiloes`, crie o `.env` de produção e execute:

```bash
cd /apps/frontleiloes
docker compose -f docker-compose.production.yml up -d --build
```

O Nginx e o frontend precisam estar na mesma rede Docker. O `env_file` carrega o `.env` em runtime; execute com `--env-file` para garantir que o Compose use o arquivo deste projeto:

```bash
docker compose --env-file .env -f docker-compose.production.yml up -d --build frontleiloes
```

Confira com:

```bash
docker network inspect apps_app-network
docker compose -f docker-compose.production.yml ps
```
