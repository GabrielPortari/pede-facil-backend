# Pede Fácil — Backend

Backend em Node.js usando NestJS para o projeto Pede Fácil.

## Descrição

API backend construída com NestJS (TypeScript). Esta base contém os endpoints principais, configuração de testes e uma pasta `src/firebase` com integrações relacionadas ao Firebase.

## Pré-requisitos

- Node.js 18+ instalado
- npm (ou Yarn) instalado
- Acesso às credenciais do Firebase (quando necessário)

## Instalação

- Em desenvolvimento

## Cadastro de empresa

Endpoint:

- `POST /auth/signup/business`
- Resposta de sucesso: `201`

### Payload oficial

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

Campos obrigatorios:

- `name`
- `legalName`
- `cnpj` (14 digitos numericos)
- `contact` (formato telefone BR internacional)
- `email`
- `password`
- `address.address`
- `address.number`
- `address.neighborhood`
- `address.city`
- `address.state` (2 letras)
- `address.zipcode` (CEP)

Campos opcionais:

- `website`
- `logoUrl`
- `address.complement`

Validacoes:

- CNPJ: `^\d{14}$`
- UF: `^[A-Za-z]{2}$`
- CEP: `^\d{5}-?\d{3}$`

Erros de negocio:

- `409` para CNPJ duplicado: `CNPJ ja cadastrado`
- `409` para email duplicado: `Email ja cadastrado`
- `400` para payload invalido (detalhes de validacao)

## Indices e unicidade (Firestore)

Arquivo de indices:

- `firestore.indexes.json`

Observacao:

- O Firestore nao possui constraint unica nativa como bancos relacionais.
- A unicidade de `cnpj` e `email` e garantida em nivel de aplicacao no `AuthService`.

## Migracao de dados legados

Script:

- `scripts/migrate-business-signup-fields.ts`

Comando:

```bash
npm run migrate:business-signup-fields
```

O script tenta preencher `legalName` a partir de `name` e normaliza `cnpj` (somente 14 digitos). Registros sem CNPJ valido sao marcados como `skipped` para tratamento manual antes de reforcar politicas de cadastro.
