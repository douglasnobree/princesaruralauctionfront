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

## SEO

As páginas públicas têm canonical, títulos e descrições próprios, Open Graph,
Twitter Cards e dados estruturados de organização, site, catálogo, produto e
breadcrumbs. O lance inicial não é publicado como preço de venda nos dados
estruturados, pois a disputa e o valor atual são controlados pelo motor de leilões.

`/sitemap.xml` consulta o catálogo público a cada requisição e inclui a agenda,
`/faca-seu-leilao`, leilões publicados e seus lotes visíveis. Não inclui a raiz
(que redireciona permanentemente para `/leiloes`), filtros, buscas ou áreas
operacionais. Se a API falhar, a rota retorna erro em vez de informar um sitemap
incompleto como válido. Não são inventadas datas de alteração para o catálogo.

`/robots.txt` informa o sitemap e bloqueia o rastreamento de `/api/`. As páginas
de conta, login, gestão, acesso negado e broadcast usam `noindex`. As rotas HTML
continuam rastreáveis para que os buscadores consigam ler essa instrução.
Buscas e filtros da agenda também usam `noindex, follow` e canonical sem parâmetros.

Em produção, configure `AUCTION_APP_URL=https://prleiloes.com` (tem precedência
sobre `NEXT_PUBLIC_AUCTION_APP_URL`). Para verificar a propriedade no Google
Search Console por meta tag, informe `GOOGLE_SITE_VERIFICATION` antes de reiniciar
o serviço. Após o deploy, envie `https://prleiloes.com/sitemap.xml` no Search Console
e inspecione uma página de leilão e uma de lote. A implementação local não confirma
indexação nem posições nos resultados de busca.

Validação automatizada: `npm run test:seo`.

Referências: [metadados do Next.js](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
e [instruções de indexação do Google](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag).
