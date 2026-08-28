# Design QA — detalhe público do lote

**Fonte visual**

- Mockup do ClickUp: `C:\Users\War\AppData\Local\Temp\clickup-sprint8-wdqp10m9zm-mockup.png`
- Dimensões da fonte: 1052 × 620 px, densidade 1×.

**Implementação**

- Rota: `http://127.0.0.1:3001/leiloes/matrizes-do-futuro/lotes/roi-1022-cidreira-y-da-bx`
- Captura do viewport: `C:\Users\War\AppData\Local\Temp\auction-lot-detail-dedicated-final-viewport-clean.png`
- Captura focal: `C:\Users\War\AppData\Local\Temp\auction-lot-information-dedicated-final.png`
- Comparação normalizada: `C:\Users\War\AppData\Local\Temp\auction-lot-information-comparison-final.png`
- Viewport CSS: 1280 × 720 px, densidade 1×.
- Região focal CSS: 727 × 571 px; captura física sem a barra de rolagem: 718 × 564 px.
- Normalização: a fonte foi redimensionada proporcionalmente para 718 px de largura; a implementação foi recortada em sua largura física equivalente.
- Estado comparado: desktop, tema claro, três seções recolhidas, sem hover e sem foco visível.

**Evidência de tela inteira**

- A página preserva a hierarquia do produto: mídia principal à esquerda, painel do lote à direita e informações abaixo.
- A mídia real do lote carregou com `naturalWidth: 189`, `naturalHeight: 266` e `object-fit: contain`, sem recorte destrutivo.
- O console do navegador não apresentou erros ou avisos durante a validação final.

**Evidência focal**

- A comparação conjunta confirma o botão de genealogia centralizado, divisor, três blocos com borda, contato e CTA verde na mesma ordem e com a mesma hierarquia do mockup.
- Não foi necessário outro recorte focal: toda a tipografia, espaçamento, cores, ícones e cópia relevantes estão legíveis na comparação normalizada.

**Superfícies de fidelidade**

- Tipografia: família do design system preservada; pesos, hierarquia e quebra de linha equivalentes ao mockup.
- Espaçamento: o intervalo entre os três blocos foi ajustado para 28 px; alturas, paddings, raio e ritmo vertical ficaram equivalentes.
- Cores: fundo branco, bordas neutras e verde secundário seguem os tokens existentes do frontend dedicado.
- Imagens e ícones: a genealogia usa o ícone da biblioteca existente; o contato usa o ícone de mensagem mais próximo disponível. A imagem principal real carrega sem recorte.
- Cópia: “Genealogia completa”, “Regulamento”, “Forma de pagamento”, “Frete e entrega”, “Dúvidas?”, texto de apoio e “Entrar em contato” conferem com a fonte.

**Interações verificadas**

- “Forma de pagamento” abre e exibe “Valor do lance x 30 (15 duplas)”.
- O link de genealogia aponta para o PDF público do lote.
- O CTA gera uma URL do WhatsApp com leilão, número e nome do lote.
- A listagem pública não contém “Genealogia” ou “Genealogias”.
- O estado inicial de vídeo foi coberto por contrato automatizado; a base local não possui lote com `youtubeUrl` para uma prova visual ao vivo.

**Histórico de comparação**

1. Primeira passagem: P1 — a imagem herdada do marketplace não carregava no frontend dedicado. Correção: resolução pelo domínio do marketplace e padrões remotos explícitos. Pós-fix: imagem completa e dimensões naturais confirmadas no navegador.
2. Primeira passagem: P2 — espaçamento entre os blocos estava mais compacto que a fonte e o botão de genealogia tinha um ícone externo adicional. Correção: intervalo de 28 px e remoção do ícone excedente. Pós-fix: comparação normalizada sem diferenças P0/P1/P2.

**Achados finais**

- Nenhum P0, P1 ou P2 pendente.
- P3: o mockup usa o glifo oficial do WhatsApp; a implementação usa o ícone de mensagem da biblioteca já adotada para evitar uma dependência visual exclusiva.

**Checklist**

- [x] Fonte e implementação abertas.
- [x] Comparação no mesmo estado.
- [x] Correções P1/P2 aplicadas e recapturadas.
- [x] Interações principais verificadas.
- [x] Console verificado.

final result: passed
