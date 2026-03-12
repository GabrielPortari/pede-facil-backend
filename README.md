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
      "quantity": 2,
      "options": {
        "size": "Grande",
        "observations": "sem gelo"
      }
    }
  ],
  "paymentMethod": "card",
  "clientNotes": "Retirar no balcao",
  "clientOrderId": "client-order-0001"
}
```

Regras de negocio durante criacao:

- operacao executada em transacao no Firestore
- valida existencia do produto
- valida estoque normal e promocional
- decrementa estoques na mesma transacao
- define status inicial do pedido como `payment_pending`

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
- O modulo de pedidos atualmente expoe criacao de pedido; atualizacoes/listagens de status ainda podem ser evoluidas
