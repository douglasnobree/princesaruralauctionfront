---
name: PR Leilões
description: Identidade rural profissional para catálogo, participação e organização de leilões.
colors:
  pr-forest: "#062518"
  pr-leaf: "#28834c"
  pr-gold: "#fbaa34"
typography:
  seller-display:
    fontFamily: "Geist, sans-serif"
    fontSize: "clamp(2.8rem, 3.8vw, 3.75rem)"
    fontWeight: 650
    lineHeight: 1.06
    letterSpacing: "-0.035em"
  seller-headline:
    fontFamily: "Geist, sans-serif"
    fontSize: "clamp(2rem, 3.5vw, 3rem)"
    fontWeight: 650
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  catalog-headline:
    fontFamily: "Geist, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
  body:
    fontFamily: "Geist, sans-serif"
    fontSize: "1rem"
  seller-body:
    fontFamily: "Geist, sans-serif"
    fontSize: "14px"
    lineHeight: 1.7
  label:
    fontFamily: "Geist, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  seller-control: "6px"
  seller-surface: "8px"
spacing:
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
components:
  button-primary:
    backgroundColor: "{colors.pr-gold}"
    textColor: "{colors.pr-forest}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.pr-leaf}"
    textColor: "oklch(1 0 0)"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-outline:
    backgroundColor: "oklch(1 0 0)"
    textColor: "oklch(0.2 0 0)"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  seller-button:
    backgroundColor: "{colors.pr-gold}"
    textColor: "{colors.pr-forest}"
    rounded: "{rounded.seller-control}"
    padding: "14px 22px"
  input:
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  auction-card:
    backgroundColor: "oklch(1 0 0)"
    textColor: "oklch(0.2 0 0)"
    rounded: "{rounded.xl}"
  lot-count:
    backgroundColor: "oklch(0.97 0 0)"
    textColor: "oklch(0.2 0 0)"
    padding: "4px 10px"
---

# Design System: PR Leilões

## Overview

**Creative North Star: "Identidade atual da PR Leilões"**

A referência é a marca existente, com seus verdes, ouro e arquivos oficiais em `public/brand/pr-leiloes`. O caráter é moderno, profissional e rural, com texto direto em português brasileiro. Esta documentação registra o sistema implementado; não cria uma nova metáfora ou identidade.

O catálogo e os controles de participação usam densidade compacta e informação funcional. As superfícies comerciais acrescentam respiro, fotografia rural e seções editoriais variadas. Essa diferença de densidade pertence ao contexto de uso; a composição da landing não é uma regra para todas as páginas.

**Key Characteristics:**

- Marca oficial e relação visual com Princesa Rural.
- Floresta como estrutura, folha como apoio e ouro como ação.
- Geist, títulos claros e controles compactos.
- Cantos moderados, divisão por tom e bordas discretas.
- Movimento visível com controles operacionais estáveis.

## Colors

O verde estrutura a interface; o ouro destaca ações e pontos de orientação.

### Primary

- **Ouro PR** (`pr-gold`): ações principais, destaques e foco; texto em floresta nos botões preenchidos.

### Secondary

- **Floresta PR** (`pr-forest`): cabeçalho, painéis comerciais escuros e texto sobre ouro.
- **Folha PR** (`pr-leaf`): ações secundárias, ícones, filtros selecionados e apoio visual.

### Neutral

- **Fundo** e **texto** (`background`, `foreground`): superfícies claras e leitura.
- **Suave** e **texto secundário** (`muted`, `muted-foreground`): apoio no catálogo e controles.
- **Borda** e **campo** (`border`, `input`): separação de superfícies e controles.
- **Papel comercial**, **texto comercial secundário** e **texto suave sobre floresta** (`seller-paper`, `seller-muted`, `seller-soft-text`): usados nas superfícies de captação; não substituem os tokens globais.

O token `destructive` representa erro e ação destrutiva, fora da hierarquia de marca. O tema escuro já possui valores próprios em `app/globals.css`; Os valores desta tabela representam a aparência clara declarada no layout.

**The Brand Continuity Rule.** Preserve floresta, folha, ouro e os arquivos oficiais da PR Leilões ao estender a interface.

## Typography

**Display Font:** Geist, sans-serif.  
**Body Font:** Geist, sans-serif.  
**Mono Font:** Geist Mono está carregada para contextos que pedem monoespaçamento; não é a voz principal dos títulos.

**Character:** Uma família simples sustenta tanto a leitura compacta do catálogo quanto a hierarquia comercial mais ampla. Títulos comerciais usam peso intermediário e espaçamento apertado; títulos do catálogo usam negrito.

### Hierarchy

- **Display comercial:** token `seller-display`; título principal, com largura observada de até 16ch. A landing ajusta para 48px até 1100px e para `clamp(2.6rem, 7.5vw, 3.7rem)` até 760px.
- **Headline comercial:** token `seller-headline`; títulos de seções. O bloco de contato tem uma escala específica maior, sem transformá-la em padrão global.
- **Headline de catálogo:** token `catalog-headline`; título da agenda.
- **Title de cartão:** 16px no móvel e 20px a partir de 640px, peso 700, entrelinha 24px.
- **Body:** 16px como base; parágrafos comerciais variam entre 14px e 16px, com entrelinha generosa. As larguras variam conforme contexto, normalmente entre 35ch e 58ch.
- **Label:** token `label` em controles compartilhados; etiquetas de formulário comercial usam 13px e peso 600.

## Layout

O cabeçalho usa um contêiner de 1280px com margens responsivas. A agenda e as seções comerciais usam largura máxima de 1152px. No catálogo, margens laterais começam em 16px e a grade passa a duas colunas em 768px. Cartões mantêm imagem lateral e informação em uma coluna flexível.

A landing usa margens laterais de 24px no desktop e 20px até 760px, com respiro principal de 96px reduzido a 60px. Grupos comerciais alternam listas com divisores, fotografias, passos e painéis tonais, sem impor uma grade única às outras superfícies. Abaixo de 760px as principais colunas comerciais empilham; abaixo de 600px campos e passos tornam-se uma coluna.

O espaçamento compartilhado segue as etapas registradas no frontmatter, com distâncias maiores próprias das seções comerciais. Cabeçalho e navegação reordenam no móvel; links compactos de desktop ganham área de toque maior. Campos no móvel mantêm texto de pelo menos 16px para evitar ampliação ao receber foco.

## Elevation & Depth

O sistema combina camadas tonais com sombras discretas. Cabeçalho e cartões se separam do fundo por borda ou sombra; as seções comerciais maiores dependem principalmente de floresta, branco e papel. Não é uma identidade sem sombras.

### Shadow Vocabulary

- **Cabeçalho:** `0 3px 16px rgba(0,0,0,0.12)`, separação da navegação.
- **Cartão em hover:** `0 14px 30px #06251814`, quando há ponteiro fino com hover.
- **Campo em foco:** `0 0 0 4px color-mix(in srgb, var(--pr-leaf) 13%, transparent)`, apoio ao estado de foco com movimento ativo.

## Shapes

Os controles compartilhados usam os cantos derivados do raio base. Cartões de leilão têm 16px; superfícies comerciais costumam usar 8px e seus botões 6px. Etiquetas e filtros podem ser pílulas; isso não transforma painéis ou seções em pílulas. Campos comerciais têm um raio específico de 5px.

Bordas finas organizam cartões, campos e listas. Imagens de lotes preservam a visibilidade do bem; fotografias comerciais usam corte de cobertura. A geometria é moderada e funcional, sem excesso de arredondamento.

## Components

### Buttons

Ações diretas, reconhecíveis e curtas.

- **Compartilhado:** primário ouro com texto floresta; secundário folha com texto claro; outline com borda e hover folha; ghost sem preenchimento em repouso.
- **Dimensão:** padrão de 36px de altura; variações existentes de 32px, 40px e controles de ícone.
- **Comercial:** botão com altura mínima de 52px, texto de 14px e peso 700; hover clareia o ouro e sobe 2px. Um brilho breve atravessa o botão em hover ou foco.
- **Estados:** foco visível com ouro nos componentes compartilhados; foco comercial recebe contorno próprio. Desabilitado não recebe interação.

### Chips

Etiquetas compactas comunicam estado ou quantidade. Contagem de lotes usa fundo suave, texto de 12px e peso 600. Filtros da agenda usam folha quando selecionados e mantêm indicação sem depender de animação.

### Cards / Containers

Cartões de leilão reúnem imagem, estado, quantidade, título, data e ação. Usam superfície clara, borda fina, cantos moderados e padding de 12px ou 20px. O hover levanta o cartão 5px e amplia a imagem a 1.045 quando o dispositivo oferece hover de ponteiro fino.

Painéis comerciais usam áreas mais largas e menor dependência de sombra. Preserve essa diferença de densidade ao reutilizar cada padrão.

### Inputs / Fields

Campos compartilhados mantêm borda, placeholder secundário e foco visível. O formulário comercial usa fundo branco sobre papel, altura mínima de 46px e texto de 16px; erros recebem borda e mensagem. Rótulos ficam fora dos campos.

### Navigation

Cabeçalho floresta, marca branca, busca clara e navegação compacta com ícones SVG. No móvel, a busca ocupa sua própria linha e a navegação pode rolar horizontalmente. Hover e foco revelam um sublinhado ouro; o perfil usa uma entrada breve a partir do topo.

### Motion and feedback

Movimento é aprimoramento progressivo: conteúdo permanece visível e utilizável sem JavaScript. A curva compartilhada é `--pr-motion-ease`; o sidecar registra durações e usos.

Entradas públicas usam deslocamento curto e atraso limitado; painéis administrativos entram rapidamente por opacidade. Não mova um formulário que já contém o foco. Alterações de valores e lances recebem realce temporário, mantendo os controles operacionais no lugar. Observe somente as superfícies externas para evitar acumular movimento em painéis aninhados.

Laços sinalizam estado ao vivo e orientação. Pausam fora da área visível ou quando a aba fica oculta; impressões finalizam animações e removem transições. Observadores e animações são limpos ao trocar de rota. A rota de transmissão preserva sua transparência e seus próprios gráficos.

**The Stable Operations Rule.** Movimento de entrada e feedback não deve atrasar ações nem deslocar alvos operacionais.

**User preference:** O usuário pediu mais animações em toda a PR Leilões e instruiu não acrescentar `prefers-reduced-motion`, `motion-reduce` ou redução automática equivalente sem solicitar uma mudança específica. Isso é uma preferência explícita do usuário, não uma norma geral da skill. A pausa de laços invisíveis e o assentamento para impressão são comportamentos de ciclo de vida existentes.

## Do's and Don'ts

### Do:

- **Do** preserve a marca oficial, floresta, folha e ouro.
- **Do** use Geist e hierarquia adequada à densidade de cada superfície.
- **Do** mantenha rótulos, foco visível e áreas de toque adequadas no móvel.
- **Do** deixe conteúdo visível sem JavaScript e mantenha controles operacionais estáveis.
- **Do** pause laços invisíveis e finalize animações para impressão.

### Don't:

- **Don't** substitua a identidade atual por uma nova direção visual sem solicitação.
- **Don't** exagere em gradientes, arredondamentos ou sombras decorativas.
- **Don't** replique a composição comercial como modelo obrigatório para telas operacionais.
- **Don't** acrescente redução automática de animação sem a mudança específica solicitada pelo usuário.


