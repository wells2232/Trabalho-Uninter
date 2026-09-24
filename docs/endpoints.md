# Contratos da API

Base: http://localhost:3000. Valores em centavos inteiros. Os corpos vazios abaixo significam ausência de body, não uma exigência de enviar JSON vazio.

Erro padrão:

```json
{
  "error": "DADOS_INVALIDOS",
  "message": "Confira os campos enviados.",
  "details": [
    {
      "field": "canalPedido",
      "issue": "Valor obrigatório ou inválido"
    }
  ],
  "timestamp": "2026-09-24T12:00:00Z",
  "path": "/pedidos",
  "requestId": "uuid"
}
```

## POST /auth/cadastro

Cadastrar cliente.

Permissão: público. 

Request:

```json
{
  "nome": "Maria Silva",
  "email": "maria@example.com",
  "senha": "Senha@123456"
}
```

Resposta 201:

```json
{
  "id": 6,
  "nome": "Maria Silva",
  "perfil": "CLIENTE"
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.

## POST /auth/login

Autenticar usuário.

Permissão: público. 

Request:

```json
{
  "email": "cliente@raizes.local",
  "senha": "Demo@123456"
}
```

Resposta 200:

```json
{
  "accessToken": "eyJ...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "user": {
    "id": 5,
    "nome": "CLIENTE",
    "perfil": "CLIENTE"
  }
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.

## GET /usuarios/me

Consultar os próprios dados.

Permissão: usuário autenticado. 

Request:

```json
{}
```

Resposta 200:

```json
{
  "id": 5,
  "nome": "CLIENTE",
  "email": "cliente@raizes.local",
  "perfil": "CLIENTE",
  "consentimento": 0,
  "pontos": 0
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.

## DELETE /usuarios/me

Anonimizar a própria conta e revogar o acesso.

Permissão: CLIENTE. 

Request:

```json
{}
```

Resposta 204:

```json
// Sem corpo
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.

## GET /unidades

Listar unidades ativas.

Permissão: público. 

Query: page, limit. page = 1; limit = 20 (máximo 100).

Request:

```json
{}
```

Resposta 200:

```json
{
  "data": [
    {
      "id": 1,
      "nome": "Boa Viagem",
      "cidade": "Recife",
      "ativa": 1
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.

## POST /unidades

Cadastrar unidade.

Permissão: GERENTE, ADMIN. 

Request:

```json
{
  "nome": "Centro",
  "cidade": "Recife",
  "ativa": true
}
```

Resposta 201:

```json
{
  "id": 3,
  "nome": "Centro",
  "cidade": "Recife",
  "ativa": 1
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.

## PUT /unidades/{id}

Atualizar ou desativar unidade.

Permissão: GERENTE, ADMIN. 

Path: id, inteiro positivo.

Request:

```json
{
  "nome": "Centro",
  "cidade": "Recife",
  "ativa": false
}
```

Resposta 200:

```json
{
  "id": 3,
  "nome": "Centro",
  "cidade": "Recife",
  "ativa": 0
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.

## GET /unidades/{id}/cardapio

Consultar preços e disponibilidade por unidade.

Permissão: público. 

Path: id, inteiro positivo.

Query: page, limit. page = 1; limit = 20 (máximo 100).

Request:

```json
{}
```

Resposta 200:

```json
{
  "data": [
    {
      "id": 1,
      "nome": "Tapioca da casa",
      "descricao": "Carne de sol",
      "precoCentavos": 2490,
      "quantidade": 1000
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.

## GET /produtos

Listar produtos do catálogo.

Permissão: público. 

Query: page, limit. page = 1; limit = 20 (máximo 100).

Request:

```json
{}
```

Resposta 200:

```json
{
  "data": [
    {
      "id": 1,
      "nome": "Tapioca da casa",
      "descricao": "Carne de sol",
      "ativo": 1
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.

## POST /produtos

Cadastrar produto.

Permissão: GERENTE, ADMIN. 

Request:

```json
{
  "nome": "Bolo de milho",
  "descricao": "Fatia",
  "ativo": true
}
```

Resposta 201:

```json
{
  "id": 4,
  "nome": "Bolo de milho",
  "descricao": "Fatia",
  "ativo": 1
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.

## PUT /produtos/{id}

Atualizar ou desativar produto.

Permissão: GERENTE, ADMIN. 

Path: id, inteiro positivo.

Request:

```json
{
  "nome": "Bolo de milho",
  "descricao": "Fatia",
  "ativo": false
}
```

Resposta 200:

```json
{
  "id": 4,
  "nome": "Bolo de milho",
  "descricao": "Fatia",
  "ativo": 0
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.

## GET /estoques

Consultar estoque por unidade.

Permissão: ATENDENTE, COZINHA, GERENTE, ADMIN. 

Query: page, limit, unidadeId. page = 1; limit = 20 (máximo 100).

Request:

```json
{}
```

Resposta 200:

```json
{
  "data": [
    {
      "unidadeId": 1,
      "produtoId": 1,
      "precoCentavos": 2490,
      "quantidade": 1000
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.

## POST /estoques/movimentacoes

Registrar entrada ou saída e preço no cardápio.

Permissão: GERENTE, ADMIN. 

Request:

```json
{
  "unidadeId": 1,
  "produtoId": 1,
  "quantidade": 10,
  "precoCentavos": 2490,
  "motivo": "Reposição"
}
```

Resposta 201:

```json
{
  "unidadeId": 1,
  "produtoId": 1,
  "precoCentavos": 2490,
  "quantidade": 1010
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.

## POST /pedidos

Criar pedido e reservar estoque.

Permissão: CLIENTE, ATENDENTE, GERENTE, ADMIN. Header Idempotency-Key obrigatório; 8 a 100 caracteres alfanuméricos, hífen ou sublinhado.

Request:

```json
{
  "unidadeId": 1,
  "canalPedido": "WEB",
  "itens": [
    {
      "produtoId": 1,
      "quantidade": 1
    }
  ],
  "pontosResgatados": 0
}
```

Resposta 201:

```json
{
  "id": 1,
  "clienteId": 5,
  "unidadeId": 1,
  "canalPedido": "WEB",
  "status": "AGUARDANDO_PAGAMENTO",
  "subtotalCentavos": 2490,
  "descontoCentavos": 0,
  "totalCentavos": 2490,
  "pontosResgatados": 0,
  "createdAt": "2026-09-24T12:00:00Z",
  "itens": [
    {
      "produtoId": 1,
      "quantidade": 1,
      "precoCentavos": 2490
    }
  ]
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno. Uma repetição idempotente retorna 200, com o pedido já criado.

## GET /pedidos

Listar pedidos e filtrar por canal ou status.

Permissão: usuário autenticado. 

Query: page, limit, canalPedido, status. page = 1; limit = 20 (máximo 100).

Request:

```json
{}
```

Resposta 200:

```json
{
  "data": [
    {
      "id": 1,
      "clienteId": 5,
      "unidadeId": 1,
      "canalPedido": "WEB",
      "status": "AGUARDANDO_PAGAMENTO",
      "subtotalCentavos": 2490,
      "descontoCentavos": 0,
      "totalCentavos": 2490,
      "pontosResgatados": 0,
      "createdAt": "2026-09-24T12:00:00Z",
      "itens": [
        {
          "produtoId": 1,
          "quantidade": 1,
          "precoCentavos": 2490
        }
      ]
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.

## GET /pedidos/{id}

Consultar pedido com itens.

Permissão: usuário autenticado. 

Path: id, inteiro positivo.

Request:

```json
{}
```

Resposta 200:

```json
{
  "id": 1,
  "clienteId": 5,
  "unidadeId": 1,
  "canalPedido": "WEB",
  "status": "AGUARDANDO_PAGAMENTO",
  "subtotalCentavos": 2490,
  "descontoCentavos": 0,
  "totalCentavos": 2490,
  "pontosResgatados": 0,
  "createdAt": "2026-09-24T12:00:00Z",
  "itens": [
    {
      "produtoId": 1,
      "quantidade": 1,
      "precoCentavos": 2490
    }
  ]
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.

## POST /pedidos/{id}/cancelamento

Cancelar pedido ainda não pago e devolver a reserva.

Permissão: CLIENTE, ATENDENTE, GERENTE, ADMIN. 

Path: id, inteiro positivo.

Request:

```json
{}
```

Resposta 200:

```json
{
  "id": 1,
  "clienteId": 5,
  "unidadeId": 1,
  "canalPedido": "WEB",
  "status": "CANCELADO",
  "subtotalCentavos": 2490,
  "descontoCentavos": 0,
  "totalCentavos": 2490,
  "pontosResgatados": 0,
  "createdAt": "2026-09-24T12:00:00Z",
  "itens": [
    {
      "produtoId": 1,
      "quantidade": 1,
      "precoCentavos": 2490
    }
  ]
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.

## PATCH /pedidos/{id}/status

Atualizar preparo ou entrega.

Permissão: ATENDENTE, COZINHA, GERENTE, ADMIN. 

Path: id, inteiro positivo.

Request:

```json
{
  "status": "PRONTO"
}
```

Resposta 200:

```json
{
  "id": 1,
  "clienteId": 5,
  "unidadeId": 1,
  "canalPedido": "WEB",
  "status": "PRONTO",
  "subtotalCentavos": 2490,
  "descontoCentavos": 0,
  "totalCentavos": 2490,
  "pontosResgatados": 0,
  "createdAt": "2026-09-24T12:00:00Z",
  "itens": [
    {
      "produtoId": 1,
      "quantidade": 1,
      "precoCentavos": 2490
    }
  ]
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.

## POST /pagamentos

Solicitar cobrança ao gateway mock.

Permissão: CLIENTE, ATENDENTE, GERENTE, ADMIN. Header Idempotency-Key obrigatório; 8 a 100 caracteres alfanuméricos, hífen ou sublinhado.

Request:

```json
{
  "pedidoId": 1,
  "cenario": "APROVADO"
}
```

Resposta 200:

```json
{
  "pagamento": {
    "id": 1,
    "pedidoId": 1,
    "status": "APROVADO",
    "valorCentavos": 2490,
    "payload": {
      "transacaoId": "abc123",
      "status": "APROVADO",
      "valorCentavos": 2490,
      "message": "Pagamento mock aprovado."
    },
    "createdAt": "2026-09-24T12:00:00Z"
  },
  "pedido": {
    "id": 1,
    "clienteId": 5,
    "unidadeId": 1,
    "canalPedido": "WEB",
    "status": "EM_PREPARO",
    "subtotalCentavos": 2490,
    "descontoCentavos": 0,
    "totalCentavos": 2490,
    "pontosResgatados": 0,
    "createdAt": "2026-09-24T12:00:00Z",
    "itens": [
      {
        "produtoId": 1,
        "quantidade": 1,
        "precoCentavos": 2490
      }
    ]
  }
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno. 503 gateway indisponível.

## GET /pedidos/{id}/pagamentos

Consultar tentativas de pagamento de um pedido.

Permissão: usuário autenticado. 

Path: id, inteiro positivo.

Query: page, limit. page = 1; limit = 20 (máximo 100).

Request:

```json
{}
```

Resposta 200:

```json
{
  "data": [
    {
      "id": 1,
      "pedidoId": 1,
      "status": "APROVADO",
      "valorCentavos": 2490,
      "payload": {
        "status": "APROVADO"
      },
      "createdAt": "2026-09-24T12:00:00Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.

## PUT /fidelidade/consentimento

Aceitar ou revogar participação na fidelidade.

Permissão: usuário autenticado. 

Request:

```json
{
  "aceito": true
}
```

Resposta 200:

```json
{
  "consentimento": true,
  "versao": "1.0"
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.

## GET /fidelidade

Consultar saldo e histórico de pontos.

Permissão: usuário autenticado. 

Query: page, limit. page = 1; limit = 20 (máximo 100).

Request:

```json
{}
```

Resposta 200:

```json
{
  "pontos": 24,
  "consentimento": 1,
  "historico": {
    "data": [
      {
        "id": 1,
        "pedidoId": 1,
        "pontos": 24,
        "motivo": "CREDITO_ENTREGA",
        "createdAt": "2026-09-24T12:00:00Z"
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.

## GET /auditorias

Consultar rastreabilidade das ações sensíveis.

Permissão: GERENTE, ADMIN. 

Query: page, limit. page = 1; limit = 20 (máximo 100).

Request:

```json
{}
```

Resposta 200:

```json
{
  "data": [
    {
      "id": 1,
      "autorId": 5,
      "acao": "PEDIDO_CRIADO",
      "recurso": "1",
      "requestId": "uuid",
      "createdAt": "2026-09-24T12:00:00Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

Erros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.
