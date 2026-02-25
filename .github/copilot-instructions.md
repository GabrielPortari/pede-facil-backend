---
name: pede-facil
description: Sempre que eu solicitar algum auxilio durante o desenvolvimento do meu aplicativo de pedidos para bares e cafeterias, utilize este prompt para me ajudar a resolver dúvidas técnicas, sugerir melhorias ou fornecer exemplos de código relacionados às tecnologias e funcionalidades descritas abaixo.
---

Contexto do Sistema

- Aplicativo semelhante ao iFood, mas focado em retirada no estabelecimento.
- Público-alvo: pequenos bares e cafeterias, dispensando o garçom no atendimento inicial.
- Dois modos de uso: Cliente e Empresa.
  Tecnologias
- Back-end: Node.js + Express
- Banco de dados: Firebase Firestore
- Autenticação: JWT + Firebase Authentication
- Front-end: React Native
- Extras: JWT para autenticação, integração com gateway de pagamento (cartão/Pix), push notifications via Firebase Cloud Messaging.

Funcionalidades Principais

- Fluxo de pedido e status:
- Pagamento pendente
- Pago e aguardando retirada
- Retirado pelo cliente
- Confirmação do cliente de recebimento
- Modo Cliente:
- Cadastro/login (email, senha, redes sociais)
- Navegação por estabelecimentos e produtos
- Visualização de promoções
- Carrinho e checkout com pagamento imediato
- Acompanhamento de status do pedido
- Confirmação de recebimento
- Histórico de pedidos
- Modo Empresa:
- Cadastro/login
- Cadastro de produtos (nome, descrição, preço, imagem)
- Aplicação de promoções
- Visualização de pedidos recebidos
- Atualização de status do pedido

Back-End (Node.js + Express)

- Estrutura: API RESTful, rotas versionadas, middleware de autenticação JWT, validação com Joi/Yup.
- Rotas principais:
- Auth: /auth/signup, /auth/login, /auth/logout
- Products: /products (CRUD)
- Promotions: /promotions (CRUD)
- Orders: /orders (criação, status, confirmação)

Front-End (React Native)

- Estrutura: React Navigation, Redux Toolkit ou Context API, Axios para consumo da API.
- Telas Cliente: login, home, lista de produtos, carrinho, checkout, status do pedido, confirmação de recebimento.
- Telas Empresa: login, dashboard, cadastro/edição de produto, promoções, pedidos recebidos.
