# Princesa Rural — Frontend de Leilões

Frontend Next.js independente para a agenda, os lotes e a participação nos leilões da Princesa Rural.

## Desenvolvimento

```bash
npm install
npm run dev -- --port 3001
```

Configure `.env.local` a partir de `.env.example`. O catálogo e as ações de lance usam a mesma API do frontend principal. Os links de login e cadastro direcionam para o frontend principal, que grava o mesmo cookie de sessão.

Em produção com subdomínios diferentes, defina `SESSION_COOKIE_DOMAIN=.princesarural.com.br` nos dois frontends para compartilhar a sessão.
