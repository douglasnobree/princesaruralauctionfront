# Princesa Rural — Frontend de Leilões

Frontend Next.js independente para a agenda, os lotes e a participação nos leilões da Princesa Rural.

## Desenvolvimento

```bash
npm install
npm run dev -- --port 3001
```

Configure `.env.local` a partir de `.env.example`. O catálogo, o cadastro, o login e as ações de lance usam a mesma API do frontend principal.

O login sincroniza os dois sites com um ticket SSO curto e de uso único: o site que recebe a senha cria a passagem no backend, o outro site a consome e grava sua própria sessão. Para produção, configure `NEXT_PUBLIC_MARKETPLACE_URL=https://princesarural.com.br` e `NEXT_PUBLIC_AUCTION_APP_URL=https://prleiloes.com` nos dois frontends. Como os domínios são independentes, entrar manualmente em uma URL sem passar pelo handoff não permite que o navegador revele a sessão do outro domínio.
