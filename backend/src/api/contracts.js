import { z } from "zod";
import { schemas, pagination } from "./schemas.js";

const manager = ["GERENTE", "ADMIN"];
const staff = ["ATENDENTE", "COZINHA", ...manager];
const buyers = ["CLIENTE", "ATENDENTE", ...manager];
const order = {
  id: 1,
  clienteId: 5,
  unidadeId: 1,
  canalPedido: "WEB",
  status: "AGUARDANDO_PAGAMENTO",
  subtotalCentavos: 2490,
  descontoCentavos: 0,
  totalCentavos: 2490,
  pontosResgatados: 0,
  createdAt: "2026-09-24T12:00:00Z",
  itens: [{ produtoId: 1, quantidade: 1, precoCentavos: 2490 }],
};
const page = (data) => ({ data, page: 1, limit: 20, total: data.length });
export const contracts = [
  {
    name: "register",
    method: "post",
    path: "/auth/cadastro",
    summary: "Cadastrar cliente",
    public: true,
    body: schemas.register,
    code: 201,
    example: {
      nome: "Maria Silva",
      email: "maria@example.com",
      senha: "Senha@123456",
    },
    response: { id: 6, nome: "Maria Silva", perfil: "CLIENTE" },
  },
  {
    name: "login",
    method: "post",
    path: "/auth/login",
    summary: "Autenticar usuário",
    public: true,
    body: schemas.login,
    example: { email: "cliente@raizes.local", senha: "Demo@123456" },
    response: {
      accessToken: "eyJ...",
      tokenType: "Bearer",
      expiresIn: 3600,
      user: { id: 5, nome: "CLIENTE", perfil: "CLIENTE" },
    },
  },
  {
    name: "profile",
    method: "get",
    path: "/usuarios/me",
    summary: "Consultar os próprios dados",
    response: {
      id: 5,
      nome: "CLIENTE",
      email: "cliente@raizes.local",
      perfil: "CLIENTE",
      consentimento: 0,
      pontos: 0,
    },
  },
  {
    name: "anonymize",
    method: "delete",
    path: "/usuarios/me",
    summary: "Anonimizar a própria conta e revogar o acesso",
    roles: ["CLIENTE"],
    code: 204,
  },
  {
    name: "units",
    method: "get",
    path: "/unidades",
    summary: "Listar unidades ativas",
    public: true,
    query: pagination,
    response: page([{ id: 1, nome: "Boa Viagem", cidade: "Recife", ativa: 1 }]),
  },
  {
    name: "createUnit",
    method: "post",
    path: "/unidades",
    summary: "Cadastrar unidade",
    roles: manager,
    body: schemas.unit,
    code: 201,
    example: { nome: "Centro", cidade: "Recife", ativa: true },
    response: { id: 3, nome: "Centro", cidade: "Recife", ativa: 1 },
  },
  {
    name: "updateUnit",
    method: "put",
    path: "/unidades/:id",
    summary: "Atualizar ou desativar unidade",
    roles: manager,
    body: schemas.unit,
    example: { nome: "Centro", cidade: "Recife", ativa: false },
    response: { id: 3, nome: "Centro", cidade: "Recife", ativa: 0 },
  },
  {
    name: "menu",
    method: "get",
    path: "/unidades/:id/cardapio",
    summary: "Consultar preços e disponibilidade por unidade",
    public: true,
    query: pagination,
    response: page([
      {
        id: 1,
        nome: "Tapioca da casa",
        descricao: "Carne de sol",
        precoCentavos: 2490,
        quantidade: 1000,
      },
    ]),
  },
  {
    name: "products",
    method: "get",
    path: "/produtos",
    summary: "Listar produtos do catálogo",
    public: true,
    query: pagination,
    response: page([
      { id: 1, nome: "Tapioca da casa", descricao: "Carne de sol", ativo: 1 },
    ]),
  },
  {
    name: "createProduct",
    method: "post",
    path: "/produtos",
    summary: "Cadastrar produto",
    roles: manager,
    body: schemas.product,
    code: 201,
    example: { nome: "Bolo de milho", descricao: "Fatia", ativo: true },
    response: { id: 4, nome: "Bolo de milho", descricao: "Fatia", ativo: 1 },
  },
  {
    name: "updateProduct",
    method: "put",
    path: "/produtos/:id",
    summary: "Atualizar ou desativar produto",
    roles: manager,
    body: schemas.product,
    example: { nome: "Bolo de milho", descricao: "Fatia", ativo: false },
    response: { id: 4, nome: "Bolo de milho", descricao: "Fatia", ativo: 0 },
  },
  {
    name: "stock",
    method: "get",
    path: "/estoques",
    summary: "Consultar estoque por unidade",
    roles: staff,
    query: schemas.stockQuery,
    response: page([
      { unidadeId: 1, produtoId: 1, precoCentavos: 2490, quantidade: 1000 },
    ]),
  },
  {
    name: "moveStock",
    method: "post",
    path: "/estoques/movimentacoes",
    summary: "Registrar entrada ou saída e preço no cardápio",
    roles: manager,
    body: schemas.stock,
    code: 201,
    example: {
      unidadeId: 1,
      produtoId: 1,
      quantidade: 10,
      precoCentavos: 2490,
      motivo: "Reposição",
    },
    response: {
      unidadeId: 1,
      produtoId: 1,
      precoCentavos: 2490,
      quantidade: 1010,
    },
  },
  {
    name: "createOrder",
    method: "post",
    path: "/pedidos",
    summary: "Criar pedido e reservar estoque",
    roles: buyers,
    body: schemas.order,
    key: true,
    code: 201,
    example: {
      unidadeId: 1,
      canalPedido: "WEB",
      itens: [{ produtoId: 1, quantidade: 1 }],
      pontosResgatados: 0,
    },
    response: order,
  },
  {
    name: "orders",
    method: "get",
    path: "/pedidos",
    summary: "Listar pedidos e filtrar por canal ou status",
    query: schemas.ordersQuery,
    response: page([order]),
  },
  {
    name: "order",
    method: "get",
    path: "/pedidos/:id",
    summary: "Consultar pedido com itens",
    response: order,
  },
  {
    name: "cancel",
    method: "post",
    path: "/pedidos/:id/cancelamento",
    summary: "Cancelar pedido ainda não pago e devolver a reserva",
    roles: buyers,
    response: { ...order, status: "CANCELADO" },
  },
  {
    name: "status",
    method: "patch",
    path: "/pedidos/:id/status",
    summary: "Atualizar preparo ou entrega",
    roles: staff,
    body: schemas.status,
    example: { status: "PRONTO" },
    response: { ...order, status: "PRONTO" },
  },
  {
    name: "pay",
    method: "post",
    path: "/pagamentos",
    summary: "Solicitar cobrança ao gateway mock",
    roles: buyers,
    body: schemas.payment,
    key: true,
    example: { pedidoId: 1, cenario: "APROVADO" },
    response: {
      pagamento: {
        id: 1,
        pedidoId: 1,
        status: "APROVADO",
        valorCentavos: 2490,
        payload: {
          transacaoId: "abc123",
          status: "APROVADO",
          valorCentavos: 2490,
          message: "Pagamento mock aprovado.",
        },
        createdAt: order.createdAt,
      },
      pedido: { ...order, status: "EM_PREPARO" },
    },
  },
  {
    name: "payments",
    method: "get",
    path: "/pedidos/:id/pagamentos",
    summary: "Consultar tentativas de pagamento de um pedido",
    query: pagination,
    response: page([
      {
        id: 1,
        pedidoId: 1,
        status: "APROVADO",
        valorCentavos: 2490,
        payload: { status: "APROVADO" },
        createdAt: order.createdAt,
      },
    ]),
  },
  {
    name: "consent",
    method: "put",
    path: "/fidelidade/consentimento",
    summary: "Aceitar ou revogar participação na fidelidade",
    body: schemas.consent,
    example: { aceito: true },
    response: { consentimento: true, versao: "1.0" },
  },
  {
    name: "loyalty",
    method: "get",
    path: "/fidelidade",
    summary: "Consultar saldo e histórico de pontos",
    query: pagination,
    response: {
      pontos: 24,
      consentimento: 1,
      historico: page([
        {
          id: 1,
          pedidoId: 1,
          pontos: 24,
          motivo: "CREDITO_ENTREGA",
          createdAt: order.createdAt,
        },
      ]),
    },
  },
  {
    name: "audit",
    method: "get",
    path: "/auditorias",
    summary: "Consultar rastreabilidade das ações sensíveis",
    roles: manager,
    query: pagination,
    response: page([
      {
        id: 1,
        autorId: 5,
        acao: "PEDIDO_CRIADO",
        recurso: "1",
        requestId: "uuid",
        createdAt: order.createdAt,
      },
    ]),
  },
];

export function openapi() {
  const doc = {
    openapi: "3.1.0",
    info: {
      title: "Raízes do Nordeste",
      version: "1.0.0",
      description:
        "Valores monetários em centavos. JWT válido por uma hora. Clientes acessam apenas seus pedidos. Funcionários atuam na rede inteira neste MVP. Pagamento recusado cancela o pedido e devolve estoque/pontos. TIMEOUT simula indisponibilidade sem cobrança real.",
    },
    servers: [{ url: "http://localhost:3000" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    paths: {},
  };
  const error = {
    error: "REGRA_DE_NEGOCIO",
    message: "Descrição legível do problema.",
    details: [],
    timestamp: "2026-09-24T12:00:00Z",
    path: "/pedidos",
    requestId: "uuid",
  };
  for (const c of contracts) {
    const path = c.path.replace(/:([a-zA-Z]+)/g, "{$1}");
    const operation = {
      operationId: c.name,
      summary: c.summary,
      tags: [c.path.split("/")[1]],
      description: `Permissões: ${c.public ? "público" : c.roles?.join(", ") || "qualquer usuário autenticado"}.${c.key ? " Idempotency-Key obrigatório (8–100 letras, números, hífen ou sublinhado). Repetição com dados diferentes retorna 409." : ""}`,
      security: c.public ? [] : [{ bearerAuth: [] }],
      parameters: [],
      responses: {},
    };
    if (c.path.includes(":id"))
      operation.parameters.push({
        name: "id",
        in: "path",
        required: true,
        schema: { type: "integer", minimum: 1 },
      });
    if (c.query) {
      const json = z.toJSONSchema(c.query, {
        io: "input",
        unrepresentable: "any",
      });
      for (const [name, schema] of Object.entries(json.properties))
        operation.parameters.push({ name, in: "query", schema });
    }
    if (c.key)
      operation.parameters.push({
        name: "Idempotency-Key",
        in: "header",
        required: true,
        schema: { type: "string", minLength: 8, maxLength: 100 },
        example: "pedido-demo-001",
      });
    if (c.body)
      operation.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: z.toJSONSchema(c.body, {
              io: "input",
              unrepresentable: "any",
            }),
            example: c.example,
          },
        },
      };
    operation.responses[c.code || 200] = {
      description: "Sucesso",
      ...(c.code === 204
        ? {}
        : { content: { "application/json": { example: c.response } } }),
    };
    if (c.name === "createOrder")
      operation.responses[200] = {
        description: "Repetição idempotente",
        content: { "application/json": { example: c.response } },
      };
    for (const [status, description] of Object.entries({
      400: "JSON inválido",
      401: "Token ausente/inválido ou credenciais inválidas",
      403: "Perfil sem permissão ou pedido de outro cliente",
      404: "Recurso não encontrado",
      409: "Conflito de negócio",
      413: "Corpo excede 32 KB",
      422: "Dados inválidos",
      429: "Limite de requisições excedido",
      500: "Erro interno",
    }))
      operation.responses[status] = {
        description,
        content: { "application/json": { example: error } },
      };
    if (c.name === "pay")
      operation.responses[503] = {
        description: "Gateway indisponível",
        content: {
          "application/json": {
            example: { ...error, error: "GATEWAY_INDISPONIVEL" },
          },
        },
      };
    (doc.paths[path] ||= {})[c.method] = operation;
  }
  return doc;
}
