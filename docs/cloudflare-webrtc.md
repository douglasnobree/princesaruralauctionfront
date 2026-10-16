# Cloudflare Stream WebRTC

A transmissão usa OBS -> WHIP -> Cloudflare Stream -> WHEP -> navegador. O vídeo é entregue pela Cloudflare diretamente ao público; o backend guarda apenas a identidade da entrada e a URL de reprodução no motor do leilão. O endereço privado de publicação é consultado por uma rota autenticada de operação, com `Cache-Control: private, no-store`.

## Configuração do backend

No ambiente do `pfrural-backend`, configure:

```dotenv
CLOUDFLARE_STREAM_ACCOUNT_ID=<account-id-da-cloudflare>
CLOUDFLARE_STREAM_API_TOKEN=<token-da-api-com-permissao-stream-edit>
```

É necessária uma conta com Stream habilitado e um token restrito à conta com permissão de edição do Stream. As chaves do R2 são independentes e não dão acesso a esta API. Mantenha o token apenas no backend; não use variáveis `NEXT_PUBLIC_*` nem envie credenciais pelo chat.

Não há mudança de schema de banco para esta integração. Publique os três serviços atualizados: `pfrural-backend`, `pfrural-auction-engine` e `princesaruralauctionfront`. O motor valida as URLs, aplica a versão esperada da transmissão e publica `stream.changed` com versão e identidade da entrada.

## Preparar o leilão

1. Abra um leilão LIVE já preparado no motor e selecione **Transmissão / OBS**.
2. Expanda **Fonte da transmissão** e selecione **Cloudflare WebRTC**.
3. Selecione **Preparar Cloudflare**. A API cria ou reutiliza a entrada do leilão, preenche a URL de reprodução e mostra os dados privados do OBS. Preparar a entrada não coloca o leilão ou o sinal ao vivo.
4. No OBS 31 ou posterior, selecione o serviço **WHIP**, cole o endereço privado em **Servidor** e deixe o token vazio. Use H.264, áudio Opus, B-frames em 0 e comece com 30 fps. A referência Cloudflare recomenda bitrate de 3.000 a 7.000 Kb/s, ajustado à rede e à qualidade pretendida.
5. Inicie o sinal no OBS e selecione **Colocar ao vivo** no painel. O público recebe vídeo WebRTC com início automático sem som e controles próprios para reprodução, áudio e tela cheia.
6. **Encerrar sinal** encerra a reprodução na plataforma e libera as sessões dos espectadores. Pare também a transmissão no OBS para interromper a publicação na Cloudflare.

Enquanto o publicador estiver ausente ou a rede falhar, o player tenta conectar novamente com intervalo crescente até 15 segundos. Ao sair da página, trocar a fonte ou encerrar o sinal, ele fecha o peer e envia DELETE para o recurso WHEP quando o provedor expõe o cabeçalho `Location` via CORS. Os lances continuam utilizando o canal oficial do motor.

## Entrada configurada manualmente

Mesmo sem o token no backend, é possível criar uma entrada no painel Cloudflare e informar a URL **WebRTC Playback (WHEP)**, terminada em `/webRTC/play`. O ID da entrada é opcional para reprodução. Para recuperar os dados privados via API, associe também o ID real da entrada.

Não cole o endereço WHIP, terminado em `/webRTC/publish`, no campo de reprodução. O motor rejeita esse endereço também quando o serviço selecionado é genérico, impedindo sua publicação no snapshot ou nos eventos.

## Gravação e homologação

A gravação nativa deste fluxo WebRTC não é oferecida pela Cloudflare na documentação consultada em 16/10/2026. Ative a gravação local no OBS se precisar guardar áudio e vídeo para replay. O histórico de lances é separado desse arquivo.

Antes do primeiro leilão, valide com uma entrada real: conexão do OBS, atraso câmera-tela, Android/Chrome, iPhone/Safari, áudio após interação, troca de rede, perda e retomada do publicador, encerramento e 100-500 espectadores. Os testes locais com respostas simuladas verificam o contrato e o ciclo da sessão; não medem a latência da Cloudflare ou a capacidade da conta contratada.

## Verificações locais

- Frontend: `npm run test:stream`, `npm run test:management`, `npm run test:public` e `npm run build`.
- Backend: testes `auction-cloudflare-stream.service.spec.ts` e `auction-cloudflare-stream.controller.spec.ts`; `npm run build`.
- Motor: `npm test` e `npm run build`.

Resultado local em 16/10/2026: os builds de produção dos três serviços passaram, assim como os 25 testes novos da integração, 17 testes de gestão do frontend e 31 testes existentes do backend ligados ao motor. No Chrome, um publicador WebRTC local transmitiu vídeo para o player real: foram verificados reprodução, áudio, pausa, configuração privada do OBS, largura de 390 px, queda e recuperação do publicador e encerramento das sessões. Esse teste controla o endpoint WHEP e não usa uma conta Cloudflare.

As suítes amplas ainda têm duas falhas em arquivos não alterados: uma expectativa antiga de texto na compra Shopping do frontend e um mock desatualizado de reserva Shopping no motor. Os testes de integração do motor que exigem banco externo ficaram sem execução. A checagem TypeScript de todos os specs do backend também encontra erros anteriores em outros módulos; o build de produção passou.

Referências: [WebRTC no Stream](https://developers.cloudflare.com/stream/webrtc-beta/), [ciclo de publicação e reprodução](https://developers.cloudflare.com/stream/examples/browser-based-webrtc/), [API de entradas](https://developers.cloudflare.com/api/resources/stream/subresources/live_inputs/methods/create/).
