# Revisão da gestão de leilões — 22/09/2026

Correções feitas no `princesaruralauctionfront`, preservando as regras e permissões do backend.

## Organização e operação

- Habilitações globais agora possuem rota própria: `/admin/habilitacoes`, acessível pelo menu, com busca por nome, e-mail ou documento.
- A lista de inscritos explica que habilitar ou bloquear um usuário tem efeito global. Confirmação de bloqueio informa esse alcance.
- Leilões abertos entram diretamente na operação a partir do catálogo.
- Operação concentrada no lote selecionado, com controle de estado, anúncio, retirada, encerramento e destaque na transmissão.
- Histórico de lances com correção/anulação mediante justificativa, respeitando permissões, capacidades retornadas pela API e versão do lote.
- Participantes, pendências de habilitação, comunicação e controles de OBS disponíveis dentro da operação.
- A aprovação manual antiga permanece desativada, conforme o contrato atual do backend. A fila ativa é a de lances aguardando habilitação.

## Desempenho e resposta visual

- Abas atualizam a URL pelo histórico do navegador sem recarregar dados do servidor.
- Formulários e painéis de abas carregam sob demanda. Dados de broadcast não fazem parte das consultas iniciais do leilão.
- Permissões são deduplicadas por renderização entre layout e página.
- Consultas de atualização usam GET, evitando a fila de ações de servidor. Polling aguarda a consulta anterior, pausa com a página oculta e cancela requisições ao desmontar.
- Pendências consultadas por leilão, substituindo uma consulta por lote na aba de lances.
- Estado anterior preservado em falhas de atualização, com aviso e possibilidade de recuperação. Consultas têm limite de espera.
- Animação curta entre abas, destaque de mudanças no preço, indicadores de comandos e esqueletos de carregamento.
- Menu móvel utiliza diálogo com foco controlado e fechamento por Escape.

## Bugs adicionais corrigidos

- Valores como `1234.56` não viram mais `123456,00` em lances assistidos; entradas inválidas e valores não seguros são rejeitados.
- Nome selecionado vem do participante, não do termo incompleto usado na pesquisa.
- Lote indisponível não permanece selecionado no formulário de lance assistido.
- Atualização de transmissão não sobrescreve campos em edição, e é possível atualizar uma fonte já ao vivo.
- Resposta parcial da habilitação global preserva o tipo do participante e seus controles.
- Inscrições possuem carregamento, erro e continuação por cursor.
- Falha de upload da capa após criar um leilão não provoca uma segunda criação ao tentar salvar novamente.
- Salvamento de formulário e exclusão no catálogo não recarregam o documento inteiro.
- Numeração sugerida de novo lote considera o maior número existente, evitando colisões quando há lacunas.
- Sequência de eventos do motor não é mais apresentada como quantidade de lances.
- Logo utiliza o nome real `Logo.svg`, corrigindo falha de carregamento por capitalização.
- Navegação do ambiente de teste não marca duas entradas simultaneamente.

## Validação executada

- `npm run build`: passou.
- `npm run lint` e lint dos arquivos alterados: passaram.
- `npm run test:management`: passou.
- `npm run test:auth`: 17 testes passaram.
- `npm run test:public`: 6 testes passaram.
- `node --test tests/management-input.test.mjs tests/auction-acquisition.test.mjs`: 3 testes passaram.
- `git diff --check`: passou.
- Detector mecânico de interface: sem achados nos cinco painéis verificados.
- Navegador Edge automatizado, com build de produção local e API simulada: 11 verificações passaram, sem erros de execução no navegador. Incluem troca de abas sem novas consultas centrais, transmissão sob demanda, envio de lance e feedback, edição justificada, preservação de campos durante polling, falha/recuperação de conexão, habilitação global, menu móvel e acesso anônimo redirecionado ao login.
- Interface conferida em 1440px e 390px; ausência de transbordamento horizontal também verificada em 320px. Transição de aba observada em execução.
- Evidências locais: `.codex/qa/results.json`, `.codex/qa/run.mjs`, `operation-desktop.png`, `operation-mobile.png`, `eligibility-desktop.png`, `eligibility-mobile.png` e `tab-transition.png` na mesma pasta.

## Limites da validação

A validação de interface usa dados fictícios e uma API local simulada. Os serviços locais reais não estavam em execução. Nenhum lance, habilitação ou mensagem real foi enviado. Não houve publicação nem medição de latência do backend em produção. Transações reais, entrega de WhatsApp, conexão com OBS e concorrência entre operadores ainda dependem de validação com o backend integrado. A revisão concentrou-se na gestão e operação; os testes públicos existentes passaram, mas isso não equivale a uma auditoria visual completa de todas as páginas públicas.
