---
name: pede-facil
description: Diretrizes para assistência técnica durante o desenvolvimento do Pede Fácil — cobertura conjunta do front-end e back-end para os modos Cliente e Empresa. Use este prompt para dúvidas, melhorias, snippets e exemplos práticos.
---

---

Contexto do Sistema

- Objetivo: aplicativo de pedidos com foco em retirada no balcão (pickup), simplificando o fluxo para pequenos bares e cafeterias.
- Modos: Cliente (app mobile) e Empresa (web/tablet para gestão do negócio).

Tecnologias recomendadas

- Back-end: NestJS + TypeScript, Firebase Admin SDK (Firestore + Storage), Swagger.
- Banco: Firebase Firestore (document store), uso de transações para consistência de estoque.
- Autenticação: Firebase Authentication (ID tokens) + JWT/middleware quando necessário.
- Front-end Cliente: React Native (Expo ou bare) com React Navigation, Axios/React Query, TypeScript.
- Front-end Empresa: React (web) com TypeScript, Redux Toolkit / React Query, components responsivos para tablets.
- Extras: Firebase Storage (upload de imagens), gateway de pagamento (Stripe/Pagar.me/Cielo para cartão + Pix), FCM para notificações push.

Funcionalidades principais (ambos os lados)

- Fluxo de pedido: `payment_pending` -> `paid_awaiting_pickup` -> `picked_up` -> `customer_confirmed`.
- Autenticação e roles: `USER` e `BUSINESS` (e `ADMIN`). Endpoints protegidos por guards; verificação de ownership para operações por id.
- Produtos: CRUD, imagem via Storage, controle de estoque e promoções com estoque promocional opcional.
- Promoções: ativar/desativar, preço com desconto e estoque promocional.
- Pedidos: criação (cliente), listagem/filtragem por business (empresa), atualizações de status, histórico.
- Pagamentos: integração com gateway (captura/autorizar), webhooks para confirmar pagamentos e atualizar status.
- Notificações: FCM para notificar cliente e estabelecimento sobre mudanças de status.

Back-end — diretrizes e endpoints (exemplos)

- Autenticação: `/auth/signup`, `/auth/login`, `/auth/logout`, `/auth/refresh`.
- Business: `GET /business/me`, `PATCH /business/me`, `GET /business/:id`, `PATCH /business/:id`, `DELETE /business/:id`.
- Products: `POST /business/:businessId/products` (aceitar multipart/form-data para imagem), `GET /business/:businessId/products`, `PATCH /business/:businessId/products/:productId`, `DELETE /business/:businessId/products/:productId`.
- Promotions: `POST /business/:businessId/promotions`, `PATCH /...`, `GET /business/:id/promotions`.
- Orders: `POST /orders`, `GET /orders?businessId=...`, `PATCH /orders/:id/status`.

Boas práticas back-end

- Validar e sanitizar todos os DTOs (class-validator/class-transformer). Use DTOs claros para requests/responses.
- Usar transações do Firestore para operações de pedido/estoque.
- Guardas: `RolesGuard`, `BusinessOwnerGuard` para garantir ownership quando necessário.
- Storage: salvar imagens em Firebase Storage e persistir `imageUrl` no Firestore; gerar URLs assinadas quando necessário.
- Testes: unitários com Jest e e2e com Supertest; adicionar exemplos de fixtures para Firestore (emulação/local) quando possível.

Front-end — diretrizes (Cliente e Empresa)

- Cliente (React Native): telas centrais — descoberta/loja, cardápio, carrinho, checkout (pagamento), status do pedido (com listeners/refresh), histórico.
- Empresa (React web/tablet): dashboard de pedidos em tempo real, CRUD de produtos com upload de imagem, gerenciamento de promoções, perfil do negócio.
- Comunicação: usar `Authorization: Bearer <idToken>` em cabeçalhos; para uploads usar `multipart/form-data` com `FormData`.
- Realtime: usar listeners do Firestore para atualizações em tempo real ou WebSocket para o fluxo de pedidos.

Integração de imagens

- Fluxo recomendado: front envia `multipart/form-data` para endpoint de produto; back recebe arquivo, envia para Firebase Storage (pasta `businesses/{businessId}/products/{uuid}.jpg`), obtém `imageUrl` pública ou assinada e salva no documento do produto.

Pagamentos e webhooks

- Implementar endpoints para webhooks do gateway (ex: `/webhook/payments`) que validem assinatura e atualizem `Order.status` com segurança.

Devops / CI

- Scripts úteis: `npm run start:dev`, `npm run build`, `npm test`, `npm run lint`, `npm run format`.
- Recomendo CI com GitHub Actions para lint, build e testes; deploy automatizado para staging/production (Cloud Run, Vercel/Netlify para front-end, Firebase Hosting + Cloud Functions se relevante).

Contribuição e estilo

- Padronizar com Prettier/ESLint; usar `class-validator` nos DTOs; adicionar exemplos de chamadas (cURL/Axios) na documentação do README.

Notas finais

- Este documento deve servir como referência para ambos os projetos (frontend e backend). Quando pedir exemplos ou snippets, especifique o modo (`client` ou `business`) e a stack alvo (`react-native`, `react-web`, `nestjs`).
