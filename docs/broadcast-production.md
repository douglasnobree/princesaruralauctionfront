# Broadcast do leilão em produção

O overlay usa dois caminhos diferentes:

- Snapshot: `GET /api/broadcast/auctions/:auctionId/state`
- WebSocket: `WSS /broadcast`

O segundo caminho precisa ser encaminhado pelo proxy reverso com suporte a
upgrade de WebSocket. Encaminhar somente `/api` faz o overlay carregar a tela,
mas impede as atualizações ao vivo.

## Variáveis do frontend

Defina antes do build da imagem:

```env
NEXT_PUBLIC_API_BASE_URL=https://back.princesarural.com.br/api
NEXT_PUBLIC_BROADCAST_WS_URL=wss://back.princesarural.com.br/broadcast
```

`NEXT_PUBLIC_BROADCAST_WS_URL` é embutida no build do Next.js. Depois de
alterá-la, é necessário gerar uma nova imagem e recriar o container.

## Exemplo de proxy Nginx

Adapte o upstream ao nome e à porta reais do backend:

```nginx
location /api/ {
    proxy_pass http://backend:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /broadcast {
    proxy_pass http://backend:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
}
```

Não coloque o WebSocket em `:4455` nem exponha Redis ou RabbitMQ. O endpoint
`/broadcast` deve continuar protegido pelo token de leitura do overlay.

## Fonte da transmissão pública

No control room do leilão, em **Operação ao vivo**, selecione o serviço e
informe a URL pública da fonte antes de clicar em **Colocar ao vivo**. A mesma
fonte é usada no placar público e no preview do admin:

- **YouTube Live**: URL da live ou do vídeo (`youtube.com/live/...` ou
  `youtube.com/watch?v=...`).
- **HLS (.m3u8)**: URL HTTPS do playlist HLS. O frontend usa `hls.js` quando o
  navegador não possui suporte nativo.
- **Stream direto**: URL HTTPS compatível com o elemento `<video>` (MP4, WebM
  ou outro formato aceito pelo navegador).
- **Outro serviço**: use a URL pública de reprodução fornecida pelo serviço.

O mock é reservado para ensaios e não desenha uma transmissão falsa no modo
público. Para fontes diretas e HLS, o servidor de mídia precisa permitir CORS
para o domínio do frontend. Em produção, mantenha a fonte em HTTPS para evitar
bloqueio de conteúdo misto.

## Verificação

Abra o overlay em um navegador com `?debug=true` antes de configurar o OBS.

- `WS CONNECTED`: conexão ao vivo estabelecida.
- `WS RECONNECTING` ou `WS OFFLINE`: revisar URL, certificado e upgrade no
  proxy.
- `WS CONNECTED` com `VERSION` parada: revisar o consumidor RabbitMQ e os logs
  `[BroadcastRedis]` do backend.

O overlay também recupera snapshots periodicamente como proteção contra um
proxy que mantém uma conexão WebSocket morta como se estivesse aberta. Isso é
uma contingência; a entrega principal continua sendo pelo WebSocket.
