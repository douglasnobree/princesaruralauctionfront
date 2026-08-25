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
