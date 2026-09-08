# Templates sociais PR Leilões

Os templates abaixo usam a aplicação oficial do PR Leilões: verde floresta (`#062518`), verde folha (`#28834C`), amarelo ouro (`#FBAA34`) e o logo horizontal branco.

## Componentes reutilizáveis

`components/Brand/PrLeiloesSocialTemplate.tsx` expõe quatro formatos:

- `landscape`: proporção 1200×630, para compartilhamento, WhatsApp e Open Graph.
- `square`: proporção 1080×1080, para feed e avatar quando o conteúdo pedir texto.
- `portrait`: proporção 1080×1350, para feed vertical.
- `story`: proporção 1080×1920, para Stories e Status.

Exemplo:

```tsx
<PrLeiloesSocialTemplate
  variant="portrait"
  eyebrow="Leilão em destaque"
  title="Genética que movimenta o campo"
  subtitle="Consulte os lotes e participe pelo PR Leilões."
/>
```

## Assets prontos

- `public/brand/pr-leiloes/share-preview.png`: preview horizontal 1200×630 para compartilhamento.
- `public/brand/pr-leiloes/profile-1920.png`: avatar quadrado 1920×1920 para perfis.
- `public/brand/pr-leiloes/logo-horizontal-white.svg`: aplicação sobre fundo verde ou fotografia.
- `public/brand/pr-leiloes/logo-horizontal-color.svg`: aplicação sobre fundo branco.
- `public/brand/pr-leiloes/logo-vertical-white.svg`: aplicação vertical em peças estreitas.

O conteúdo variável deve ficar curto: uma chamada principal, uma informação de contexto e, quando necessário, uma única ação. A exportação final para postagem ainda deve ser ligada ao fluxo de criação/publicação de conteúdo, para não duplicar a lógica dentro do frontend público.
