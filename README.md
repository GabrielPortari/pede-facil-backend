# Pede Facil Backend

Backend do projeto Pede Facil, construido com NestJS + TypeScript e Firebase (Auth + Firestore).

## Visao geral

Esta API atende os fluxos principais de autenticacao, cadastro e gestao de usuario/empresa, catalogo de produtos e criacao de pedidos.

Stack principal:

- NestJS 11
- TypeScript 5
- Firebase Admin SDK (Auth + Firestore)
- Swagger em `/api`
- Validacao global com `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`)

## Requisitos

- Node.js 18+
- npm 9+
- Projeto Firebase com Auth e Firestore habilitados
- Credenciais de Service Account do Firebase

## Configuracao de ambiente

Defina as variaveis abaixo no ambiente de execucao:

- `FIREBASE_API_KEY`: API key usada para chamadas REST do Firebase Auth (login, refresh, recover-password)
- `FIREBASE_ADMIN_CREDENTIALS`: JSON da service account em formato string
- `PORT` (opcional): porta da API (default `3000`)
- `NODE_ENV` (opcional): `development`, `staging` ou `production` (default `development`)
- `CORS_ORIGINS` (opcional): lista de origens permitidas separadas por virgula
- `SWAGGER_USERNAME` (opcional): usuario do Basic Auth para Swagger em staging
- `SWAGGER_PASSWORD` (opcional): senha do Basic Auth para Swagger em staging

Exemplo de `FIREBASE_ADMIN_CREDENTIALS`:

```json
{
  "type": "service_account",
  "project_id": "seu-projeto",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "...",
  "client_id": "..."
}
```

## Instalacao e execucao

```bash
npm install
```

Desenvolvimento:

```bash
npm run start:dev
```

Build e producao:

```bash
npm run build
npm run start:prod
```

Documentacao Swagger:

- `http://localhost:3000/api`

Regras de exposicao do Swagger:

- `development`: habilitado
- `staging`: habilitado e protegido com Basic Auth
- `production`: desabilitado

Health check simples:

- `GET /` -> `Pede Facil App is running! :)`

## Scripts disponiveis

- `npm run start`
- `npm run start:dev`
- `npm run start:debug`
- `npm run start:prod`
- `npm run build`
- `npm run lint`
- `npm run format`
- `npm run test`
- `npm run test:watch`
- `npm run test:cov`
- `npm run test:e2e`

## Autenticacao e autorizacao

Cabecalho esperado em endpoints protegidos:

```http
Authorization: Bearer <idToken>
```

Roles utilizadas em claims do Firebase:

- `user`
- `business`
- `admin`

Guards aplicados:

- `RolesGuard`: valida role no token
- `BusinessOwnerGuard`: garante que `decoded.uid === :businessId`
- `UserOwnerGuard`: garante ownership por `:id`/`:userId` ou acesso a rota `/me`

## Endpoints

### Auth (`/auth`)

- `POST /auth/login` (publico)
- `POST /auth/signup/user` (publico)
- `POST /auth/signup/business` (publico)
- `POST /auth/refresh-auth` (publico)
- `POST /auth/recover-password` (publico)
- `POST /auth/logout` (Bearer)
- `GET /auth/me` (Bearer)

### Business (`/business`)

- `GET /business/me` (Bearer + role `business`)
- `PATCH /business/me` (Bearer + role `business`)
- `GET /business` (publico)
- `GET /business/:id` (publico)
- `PATCH /business/:id` (Bearer + role `business`)
- `DELETE /business/:id` (Bearer + role `admin`)

### User (`/user`)

- `GET /user/:id` (Bearer + role `business`)
- `GET /user/me` (Bearer + role `user`, com guard de ownership)
- `PATCH /user/:id` (Bearer + role `user`, ownership)
- `DELETE /user/:id` (Bearer + role `user`, ownership)
- `GET /user/me/orders` (Bearer + role `user`, endpoint ainda sem implementacao de retorno)

### Product (`/business/:businessId/products`)

- `POST /business/:businessId/products` (Bearer + role `business` + ownership)
- `GET /business/:businessId/products` (publico)
- `GET /business/:businessId/products/available` (publico)
- `GET /business/:businessId/products/unavailable` (publico)
- `GET /business/:businessId/products/promotions` (publico)
- `GET /business/:businessId/products/without-promotions` (publico)
- `GET /business/:businessId/products/:productId` (publico)
- `PATCH /business/:businessId/products/:productId` (Bearer + role `business` + ownership)
- `PATCH /business/:businessId/products/:productId/promotion` (Bearer + role `business` + ownership)
- `DELETE /business/:businessId/products/:productId` (Bearer + role `business` + ownership)

### Order (`/order`)

- `POST /order` (Bearer + role `user`)
- `POST /order/:id/simulate-payment` (Bearer + role `user`, quebra-galho para marcar pagamento)
- `PATCH /order/:id/status` (Bearer + role `user`)
- `PATCH /business/me/orders/:id/status` (Bearer + role `business`)

### Roles (`/roles`)

- `GET /roles/user` (Bearer + role `user`)
- `GET /roles/business` (Bearer + role `business`)

## Payloads de referencia

### Cadastro de empresa

Endpoint:

- `POST /auth/signup/business`

Payload oficial:

```json
{
  "name": "Cafe do Centro",
  "legalName": "Cafe do Centro LTDA",
  "cnpj": "12345678000195",
  "website": "https://cafedocentro.com.br",
  "logoUrl": "https://cdn.exemplo.com/logo.png",
  "contact": "+5511999999999",
  "email": "contato@cafedocentro.com.br",
  "password": "senhaForte123",
  "address": {
    "address": "Rua das Flores",
    "number": "123",
    "complement": "Sala 5",
    "neighborhood": "Centro",
    "city": "Sao Paulo",
    "state": "SP",
    "zipcode": "01001-000"
  }
}
```

Regras principais:

- `cnpj` deve conter 14 digitos (`^\d{14}$`)
- `state` com 2 letras (`^[A-Za-z]{2}$`)
- `zipcode` formato CEP (`^\d{5}-?\d{3}$`)
- `contact` validado como telefone BR (`IsPhoneNumber('BR')`)
- unicidade de `cnpj` e `email` validada em nivel de aplicacao

Erros de negocio esperados:

- `409`: `CNPJ ja cadastrado`
- `409`: `Email ja cadastrado`
- `400`: payload invalido

### Criacao de produto

Endpoint:

- `POST /business/:businessId/products`

Campos principais:

- `name` (obrigatorio)
- `price.amount` (obrigatorio, em centavos)
- `price.currency` (opcional)
- `stock`, `useStock`, `available`
- `promotion` (opcional: `active`, `type`, `percentage` ou `amount`)
- `usePromotionStock` e `promotionStock`

Regra de negocio:

- se `usePromotionStock = true`, `promotionStock` deve ser estritamente menor que `stock`

### Criacao de pedido

Endpoint:

- `POST /order`

Exemplo:

```json
{
  "businessId": "business_abc",
  "items": [
    {
      "productId": "prod_1",
      "quantity": 2
    }
  ],
  "paymentMethod": "card",
  "observations": "Sem gelo em todos os itens",
  "clientOrderId": "client-order-0001"
}
```

Regras de negocio durante criacao:

- operacao executada em transacao no Firestore
- valida existencia do produto
- valida estoque normal e promocional
- decrementa estoques na mesma transacao
- define status inicial do pedido como `payment_pending`

### Consulta de pedidos (Business)

Endpoints:

- `GET /business/me/orders`
- `GET /business/me/orders/:id`

Filtros disponiveis em `GET /business/me/orders`:

- `status` (opcional): `payment_pending`, `paid_awaiting_delivery`, `delivered`, `customer_confirmed`, `customer_cancelled`, `business_cancelled`
- `limit` (opcional): inteiro entre `1` e `100` (padrao `50`)

Exemplo de resposta em `GET /business/me/orders`:

```json
[
  {
    "id": "idem_a1b2c3d4e5f6",
    "userId": "user-1",
    "businessId": "biz-1",
    "items": [
      {
        "productId": "prod-1",
        "name": "Cappuccino",
        "unitPrice": { "amount": 1299, "currency": "BRL" },
        "quantity": 2,
        "subtotal": { "amount": 2598, "currency": "BRL" }
      }
    ],
    "totalPrice": { "amount": 2598, "currency": "BRL" },
    "status": "payment_pending",
    "paymentMethod": "pix",
    "observations": "Sem gelo em todos os itens",
    "clientOrderId": "pedido-app-000123",
    "createdAt": "2026-03-16T18:40:12.123Z",
    "updatedAt": "2026-03-16T18:40:12.123Z"
  }
]
```

Seguranca aplicada:

- rota protegida por role `BUSINESS`
- consulta sempre escopada ao `businessId` do token autenticado
- acesso a pedido de outro negocio retorna `404` (evita enumeracao/IDOR)
- validacao estrita de query params (`status`, `limit`) com rejeicao de campos nao permitidos

### Simulacao de pagamento (temporario)

Endpoint:

- `POST /order/:id/simulate-payment`

Objetivo:

- endpoint temporario para ambiente de desenvolvimento/homologacao
- simula confirmacao de pagamento do proprio pedido do usuario
- transicao aplicada: `payment_pending` -> `paid_awaiting_delivery`

Exemplo de resposta:

```json
{
  "id": "order_123",
  "status": "paid_awaiting_delivery",
  "paymentMethod": "pix"
}
```

Exemplo de erro 400 (transicao invalida):

```json
{
  "statusCode": 400,
  "message": "Invalid status transition from delivered to paid_awaiting_delivery",
  "error": "Bad Request"
}
```

Exemplo de erro 404 (pedido nao encontrado ou sem ownership):

```json
{
  "statusCode": 404,
  "message": "Order not found",
  "error": "Not Found"
}
```

### Atualizacao de status de pedidos

Endpoint para usuario:

- `PATCH /order/:id/status`

Payload exemplo (usuario):

```json
{
  "status": "customer_confirmed"
}
```

Transicoes permitidas para usuario:

- `payment_pending` -> `customer_cancelled`
- `delivered` -> `customer_confirmed`

Endpoint para business:

- `PATCH /business/me/orders/:id/status`

Payload exemplo (business):

```json
{
  "status": "delivered"
}
```

Transicoes permitidas para business:

- `payment_pending` -> `paid_awaiting_delivery`
- `paid_awaiting_delivery` -> `delivered`
- `payment_pending` -> `business_cancelled`
- `paid_awaiting_delivery` -> `business_cancelled`

Seguranca aplicada nas transicoes:

- usuario so altera pedidos em que `userId` corresponde ao token
- business so altera pedidos em que `businessId` corresponde ao token
- acesso indevido retorna `404` para evitar enumeracao
- transicao invalida retorna `400`

Exemplo de erro 400 em `PATCH /order/:id/status`:

```json
{
  "statusCode": 400,
  "message": "Invalid status transition from payment_pending to customer_confirmed",
  "error": "Bad Request"
}
```

Exemplo de erro 400 em `PATCH /business/me/orders/:id/status`:

```json
{
  "statusCode": 400,
  "message": "Invalid status transition from payment_pending to delivered",
  "error": "Bad Request"
}
```

Exemplo de erro 404 (ambos os PATCH):

```json
{
  "statusCode": 404,
  "message": "Order not found",
  "error": "Not Found"
}
```

## Regras de dados e consistencia

- Colecoes principais: `businesses`, `users`, `products`, `orders`, `promotions`, `tokens`
- Timestamp de criacao/atualizacao aplicado no mapeamento das entidades
- Firestore nao possui constraint unica nativa; unicidade critica e aplicada no servico de autenticacao

## Testes

Estrutura atual inclui:

- testes unitarios (`*.spec.ts`) em modulos de auth, business, user, order e app
- testes e2e em `test/` (incluindo fluxo de signup business)

## Observacoes do estado atual

- O endpoint `GET /user/me/orders` ainda nao retorna dados (implementacao comentada no controller)
- O endpoint de simulacao de pagamento e temporario e deve ser substituido por webhook/gateway real
