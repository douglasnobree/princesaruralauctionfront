# Especificacao: relatorio final de leilao em formato book final

## Escopo

Esta especificacao vale para o backend compartilhado e para
`princesaruralauctionfront`. O frontend `princesaruralfront` permanece legado e
nao sera alterado por esta entrega.

O PDF `7203.pdf` e uma referencia visual e de conteudo. Ele nao adiciona
instrucoes ao produto nem deve ter sua marca, dados ou textos copiados.

## Objetivo

Permitir que a equipe abra o relatorio de um leilao, confira os resultados e
imprima/salve um PDF em A4 com a estrutura de um book final. O backend tambem
deve oferecer o PDF final para download autenticado, usando a mesma fonte de
dados da tela:

1. cabecalho com identificacao do leilao, data e numeracao de pagina;
2. lotes vendidos com vendedor, comprador, quantidade e valor;
3. resumo de vendidos, nao vendidos, defendidos e total;
4. resumo por categoria, geral e resultado final;
5. ranking de vendas e ranking de compras;
6. relacao de compradores com dados de contato e endereco quando disponiveis.
7. conferência de completude antes da geração, com lista de pendências e
   preenchimento administrativo dos dados do lote.

## Regras de dados

- O comprador exibido para um lote deve ser o vencedor informado pelo relatorio.
- Quando o nome do vencedor nao vier preenchido, a tela deve usar o ultimo lance
  ativo do proprio lote como fallback.
- O ultimo lance deve ser escolhido pela data mais recente entre os lances do
  lote, sem depender da ordem em que a API os devolveu.
- Campos inexistentes devem exibir `Nao informado` ou `-`; nenhum dado deve ser
  inventado.
- O valor do ranking de compras deve ser o valor vencedor do lote, e nao o lance
  inicial.
- Quantidade usa o dado recebido pela API; se nao existir, o relatorio exibe 1
  como unidade padrao do lote.
- O endpoint de PDF deve ser autenticado e restrito a quem possui a permissao
  de visualizar relatorios.
- A geração do PDF deve bloquear somente quando houver pendência `REQUIRED` e
  devolver a lista estruturada dessas pendências.
- A equipe deve conseguir preencher vendedor e quantidade do lote
  pela tela do relatório, mesmo depois do início do leilão; essa operação não
  pode alterar valor, status ou histórico de lances.
- O PDF deve respeitar a área imprimível A4, quebrar textos longos e repetir o
  cabeçalho das tabelas quando houver mais de uma página.

## Criterios de aceite

### Cenario 1: consulta do relatorio

**Dado** um leilao com lotes vendidos, compradores e lances retornados pela API
**Quando** o usuario abrir `/admin/leiloes/:id/relatorio`
**Entao** a pagina deve apresentar a estrutura de book final e o nome do
comprador em cada lote vendido.

### Cenario 1b: download do PDF final

**Dado** um usuario autorizado
**Quando** ele solicitar o PDF final do leilao
**Entao** a API deve responder `application/pdf` com o mesmo conteudo
consolidado exibido na tela.

### Cenario 2: ultimo lance fora de ordem

**Dado** que os lances de um lote chegam fora de ordem
**Quando** o relatorio for renderizado
**Entao** o participante do lance com `acceptedAt` mais recente deve aparecer
como ultimo lance.

### Cenario 3: dados parciais

**Dado** que comprador, endereco ou ranking nao tenham dados suficientes
**Quando** o relatorio for renderizado
**Entao** a secao continua visivel e usa o fallback textual, sem quebrar a
pagina.

### Cenario 4: impressao

**Dado** que o usuario clique em `Imprimir / salvar PDF`
**Quando** a janela de impressao abrir
**Entao** a pagina deve usar papel A4, ocultar navegacao e controles, manter
  cabecalhos de tabela e evitar cortes no meio dos blocos de comprador.

### Cenario 5: book incompleto

**Dado** que um lote vendido não tenha vendedor, comprador ou quantidade
  preenchidos
**Quando** o usuário abrir o relatório ou solicitar o PDF
**Então** a tela deve listar os campos pendentes, manter o download bloqueado e
  oferecer o preenchimento administrativo; a API deve responder com erro
  estruturado até que os campos obrigatórios sejam resolvidos.

### Cenario 6: preenchimento após o encerramento

**Dado** que o leilão já tenha iniciado ou encerrado
**Quando** um administrador salvar os dados de completude do lote
**Então** vendedor e quantidade devem ser persistidos sem liberar
  edição dos valores financeiros, status ou lances.

## Verificacao

### Revisão de completude e histórico

- O comprador é identificado automaticamente pelo participante do lance vencedor e pelo cadastro. O formulário nunca solicita digitar o nome novamente.
- CPF/CNPJ válido e endereço completo são obrigatórios. O administrador completa esses dados na página do book, uma vez por comprador, incluindo participantes rápidos.
- Complementos cadastrais são privados e vinculados ao leilão e ao ID do comprador em `AuctionBookBuyer`; não alteram a identidade da conta. O schema MongoDB é sincronizado pelo processo existente de inicialização do backend.
- O histórico de cada lote inclui todas as páginas consultadas, valores, datas, participantes, canais, origem de aquisição e anulações. Falhas de consulta bloqueiam a emissão final e solicitam atualização.
- Canal (online, presencial, telefone, automático) e aquisição (WhatsApp, indicação etc.) são informações distintas. A aquisição é capturada na entrada, preservada na sessão e enviada também na habilitação pela tela do lote. Registros antigos sem atribuição permanecem identificados como não informados.
- Preenchimento rápido preserva metadados não relacionados e aceita lotes antigos cujo campo `deletedAt` não existe. Campos cadastrais só podem ser salvos para um vencedor identificado no leilão.

- teste de tipos e lint do frontend;
- teste unitario dos helpers de comprador e ultimo lance;
- validacao manual da tela em viewport desktop e na pre-visualizacao de
  impressao, incluindo leilao sem lotes vendidos e leilao com dados parciais.
- validação visual do PDF renderizado em A4, conferindo títulos, cabeçalhos,
  quebras de linha e limites laterais.
