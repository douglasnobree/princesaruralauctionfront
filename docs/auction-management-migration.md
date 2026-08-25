# Gestão de leilões no frontend dedicado

## Escopo

O gerenciamento operacional saiu da dependência de telas do marketplace e agora está disponível no frontend dedicado de leilões. O marketplace permanece funcionando durante a transição e nenhuma regra de negócio foi duplicada no navegador.

## Rotas

- `/admin/leiloes`: lista, busca e filtros de leilões.
- `/admin/leiloes/novo`: criação de leilão.
- `/admin/leiloes/:id`: workspace com resumo, dados, lotes, participantes, operação e Broadcast/OBS.
- `/admin/leiloes/:id/lotes`: compatibilidade; redireciona para a aba de lotes do workspace.
- `/admin/leiloes/:id/relatorio`: relatório operacional.
- `/admin/leiloes/:id/broadcast`: control room da transmissão, preview e configuração do OBS.
- `/admin/leiloes/sandbox`: ambiente de ensaio do Auction Engine.
- `/broadcast/auction/:auctionId`: overlay público, protegido por `broadcast:read`.
- `/broadcast/auction/:auctionId/control`: compatibilidade; redireciona para a control room protegida.

## Sessão e refresh token

O login usa o fluxo existente do backend (`/auth/login`). O access token e o refresh token permanecem em cookies `httpOnly`, `secure` em produção, `sameSite=lax` e `path=/`. O frontend não coloca tokens em `localStorage`, logs ou links de navegação administrativa.

O proxy do frontend dedicado verifica as páginas `/admin/*`. Quando a sessão está próxima do vencimento, renova o token no backend usando o cookie de refresh e grava a nova sessão na resposta. Server Actions também usam `getFreshSession()` e fazem uma renovação única quando recebem 401. Se a renovação falhar, a tela recebe o fluxo de login com `returnTo` e não perde o destino original.

O domínio compartilhado entre os frontends pode ser configurado com `SESSION_COOKIE_DOMAIN`. Em ambientes locais separados por origem, o handoff SSO existente continua sendo usado.

## Roles e permissões

O guard server-side em `lib/permissions/server/auction-access.ts` exige sessão válida e role reconhecida. O conjunto permitido é alinhado aos controllers administrativos do backend: `ADMIN`, `MODERATOR`, `TIN1` e `TIN2`. `ADMIN` possui o conjunto administrativo completo; as demais roles permitidas precisam de `auctions.enabled` no backend.

As ações de tela são derivadas das permissões existentes:

- `auctions.view`: consulta do workspace.
- `auctions.viewReports`: relatórios.
- `auctions.viewBids`: histórico de lances.
- `auctions.manageBids`: reservado para correção/anulação de lances quando essa ação for exposta no shell.
- `auctions.create`: criação.
- `auctions.edit`: edição dos dados.
- `auctions.delete`: exclusão.
- `auctions.manageStatus`: publicação/cancelamento e comandos do leilão.
- `auctions.manageLots`: criação, edição, ordenação, upload e alteração de lotes.

Os botões são apenas uma camada de orientação. Cada Server Action envia o access token ao backend, e respostas 401/403 são exibidas como sessão expirada ou falta de permissão. O backend continua responsável por role, tenant, versão, estado de lote e autorização final.

## Operação e broadcast

O workspace usa os endpoints existentes de `/auctions/manage` para catálogo e `/auction-engine/manager` para operação. O frontend não calcula lote atual, preço, vencedor ou transição de estado.

O control room usa as actions existentes de Broadcast para exibir snapshot, versão, clientes, delay, tokens read-only e preview do mesmo `BroadcastOverlay` usado pelo OBS. Tokens do overlay têm escopo `broadcast:read`, ficam limitados ao leilão e podem ser revogados. O módulo não possui comandos para criar lance, alterar lote ou alterar o status do Auction Engine.

As operações de manager do Auction Engine — incluindo inscrições, elegibilidade global, lance de piso/telefone e comandos de lote/leilão — exigem `auctions.manageStatus`, conforme os guards do backend. `auctions.manageBids` não é usado para liberar essas ações.

## Configuração local

Variáveis esperadas:

```env
API_BASE_URL=http://localhost:4000/api
AUCTION_APP_URL=http://localhost:3001
MARKETPLACE_URL=http://localhost:3000
SESSION_COOKIE_DOMAIN=
```

Em produção, `AUCTION_APP_URL`, `MARKETPLACE_URL` e `SESSION_COOKIE_DOMAIN` devem apontar para os domínios reais. O OBS continua usando uma URL de overlay criada no control room, com token de leitura e `clientId`; nunca usa a sessão administrativa.

## Validação

Executar no frontend dedicado:

```text
npm run lint
npx tsc --noEmit
npm run build
```

O build não inicia servidor persistente. Antes de operar em produção, validar com uma conta `ADMIN`, uma role com `auctions.enabled` e um usuário sem o módulo, cobrindo 401, 403, refresh, publicação, lote vendido, próximo lote, preview e reconexão do overlay.
