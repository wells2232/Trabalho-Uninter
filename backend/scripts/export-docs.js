import { mkdirSync, writeFileSync } from "node:fs";
import { contracts, openapi } from "../src/api/contracts.js";

mkdirSync("docs", { recursive: true });
const write = (path, value) =>
  writeFileSync(
    path,
    typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n",
  );
write("docs/openapi.json", openapi());
const sections = contracts.map(
  (c) =>
    `## ${c.method.toUpperCase()} ${c.path.replace(":id", "{id}")}\n\n${c.summary}.\n\nPermissão: ${c.public ? "público" : c.roles?.join(", ") || "usuário autenticado"}. ${c.key ? "Header Idempotency-Key obrigatório; 8 a 100 caracteres alfanuméricos, hífen ou sublinhado." : ""}\n\n${c.path.includes(":id") ? "Path: id, inteiro positivo.\n\n" : ""}${c.query ? "Query: " + Object.keys(c.query.shape).join(", ") + ". page = 1; limit = 20 (máximo 100).\n\n" : ""}Request:\n\n\`\`\`json\n${c.example ? JSON.stringify(c.example, null, 2) : "{}"}\n\`\`\`\n\nResposta ${c.code || 200}:\n\n\`\`\`json\n${c.code === 204 ? "// Sem corpo" : JSON.stringify(c.response, null, 2)}\n\`\`\`\n\nErros: 400 JSON inválido; 401 sem autenticação; 403 sem permissão; 404 recurso ausente; 409 conflito; 413 corpo maior que 32 KB; 422 validação; 429 limite de requisições; 500 erro interno.${c.name === "pay" ? " 503 gateway indisponível." : ""}${c.name === "createOrder" ? " Uma repetição idempotente retorna 200, com o pedido já criado." : ""}\n`,
);
write(
  "docs/endpoints.md",
  "# Contratos da API\n\nBase: http://localhost:3000. Valores em centavos inteiros. Os corpos vazios abaixo significam ausência de body, não uma exigência de enviar JSON vazio.\n\nErro padrão:\n\n```json\n" +
    JSON.stringify(
      {
        error: "DADOS_INVALIDOS",
        message: "Confira os campos enviados.",
        details: [
          { field: "canalPedido", issue: "Valor obrigatório ou inválido" },
        ],
        timestamp: "2026-09-24T12:00:00Z",
        path: "/pedidos",
        requestId: "uuid",
      },
      null,
      2,
    ) +
    "\n```\n\n" +
    sections.join("\n"),
);

const scenarios = [];
function add(group, name, method, path, status, options = {}) {
  scenarios.push({
    id: `T${String(scenarios.length + 1).padStart(2, "0")}`,
    group,
    name,
    method,
    path,
    status,
    ...options,
  });
}
const order = {
  unidadeId: 1,
  canalPedido: "TOTEM",
  itens: [{ produtoId: 1, quantidade: 1 }],
  pontosResgatados: 0,
};
add("Auth", "Cadastrar cliente", "POST", "/auth/cadastro", 201, {
  noauth: true,
  body: {
    nome: "Cliente de teste",
    email: "{{emailTeste}}",
    senha: "{{senha}}",
  },
  check: ["perfil", "CLIENTE"],
});
add("Auth", "Login cliente", "POST", "/auth/login", 200, {
  noauth: true,
  body: { email: "{{emailTeste}}", senha: "{{senha}}" },
  save: ["token", "accessToken"],
  check: ["tokenType", "Bearer"],
});
add("Auth", "Login administrador", "POST", "/auth/login", 200, {
  noauth: true,
  body: { email: "admin@raizes.local", senha: "{{senha}}" },
  save: ["adminToken", "accessToken"],
});
add("Produtos", "Consultar cardápio", "GET", "/unidades/1/cardapio", 200, {
  check: ["data.0.precoCentavos", 2490],
});
add(
  "Fidelidade",
  "Aceitar consentimento",
  "PUT",
  "/fidelidade/consentimento",
  200,
  { body: { aceito: true }, check: ["consentimento", true] },
);
add("Pedidos", "Criar pedido TOTEM", "POST", "/pedidos", 201, {
  body: order,
  key: "{{runId}}-pedido",
  save: ["pedidoId", "id"],
  check: ["totalCentavos", 2490],
});
add("Pedidos", "Repetir pedido com mesma chave", "POST", "/pedidos", 200, {
  body: order,
  key: "{{runId}}-pedido",
  check: ["canalPedido", "TOTEM"],
});
add(
  "Pedidos",
  "Filtrar pedidos por canal",
  "GET",
  "/pedidos?canalPedido=TOTEM&limit=10",
  200,
  { check: ["data.0.canalPedido", "TOTEM"] },
);
add("Pagamento", "Aprovar pagamento mock", "POST", "/pagamentos", 200, {
  body: { pedidoId: "{{pedidoId}}", cenario: "APROVADO" },
  key: "{{runId}}-pagamento",
  check: ["pedido.status", "EM_PREPARO"],
});
add(
  "Pagamento",
  "Repetir pagamento com mesma chave",
  "POST",
  "/pagamentos",
  200,
  {
    body: { pedidoId: "{{pedidoId}}", cenario: "APROVADO" },
    key: "{{runId}}-pagamento",
    check: ["pagamento.status", "APROVADO"],
  },
);
add(
  "Operação",
  "Marcar como pronto",
  "PATCH",
  "/pedidos/{{pedidoId}}/status",
  200,
  { admin: true, body: { status: "PRONTO" }, check: ["status", "PRONTO"] },
);
add(
  "Operação",
  "Confirmar entrega",
  "PATCH",
  "/pedidos/{{pedidoId}}/status",
  200,
  { admin: true, body: { status: "ENTREGUE" }, check: ["status", "ENTREGUE"] },
);
add("Fidelidade", "Consultar pontos creditados", "GET", "/fidelidade", 200, {
  check: ["pontos", 24],
});
add(
  "Auditoria",
  "Verificar registro sensível",
  "GET",
  "/auditorias?limit=100",
  200,
  {
    admin: true,
    script:
      "pm.test('Entrega auditada', () => pm.expect(body.data.some(row => row.acao === 'PEDIDO_ENTREGUE' && row.recurso === String(pm.collectionVariables.get('pedidoId')))).to.eql(true));",
  },
);
add("Erros", "Acesso sem token", "GET", "/pedidos", 401, {
  noauth: true,
  check: ["error", "NAO_AUTENTICADO"],
});
add("Erros", "Cliente sem permissão", "POST", "/produtos", 403, {
  body: { nome: "Produto bloqueado" },
  check: ["error", "SEM_PERMISSAO"],
});
add("Erros", "Canal ausente", "POST", "/pedidos", 422, {
  body: { unidadeId: 1, itens: order.itens },
  key: "{{runId}}-sem-canal",
  check: ["error", "DADOS_INVALIDOS"],
});
add("Erros", "Quantidade negativa", "POST", "/pedidos", 422, {
  body: { ...order, itens: [{ produtoId: 1, quantidade: -1 }] },
  key: "{{runId}}-negativo",
  check: ["error", "DADOS_INVALIDOS"],
});
add("Erros", "Produto inexistente", "POST", "/pedidos", 404, {
  body: { ...order, itens: [{ produtoId: 2147483647, quantidade: 1 }] },
  key: "{{runId}}-inexistente",
  check: ["error", "PRODUTO_NAO_ENCONTRADO"],
});
add(
  "Estoque",
  "Cadastrar produto para teste de saldo",
  "POST",
  "/produtos",
  201,
  {
    admin: true,
    body: { nome: "Produto teste de estoque" },
    save: ["produtoTeste", "id"],
  },
);
add(
  "Estoque",
  "Entrar uma unidade no estoque",
  "POST",
  "/estoques/movimentacoes",
  201,
  {
    admin: true,
    body: {
      unidadeId: 1,
      produtoId: "{{produtoTeste}}",
      quantidade: 1,
      precoCentavos: 1000,
      motivo: "Teste de saldo",
    },
    check: ["quantidade", 1],
  },
);
add("Erros", "Estoque insuficiente", "POST", "/pedidos", 409, {
  body: { ...order, itens: [{ produtoId: "{{produtoTeste}}", quantidade: 2 }] },
  key: "{{runId}}-sem-estoque",
  check: ["error", "ESTOQUE_INSUFICIENTE"],
});
add("Recusa", "Criar pedido com resgate", "POST", "/pedidos", 201, {
  body: { ...order, pontosResgatados: 20 },
  key: "{{runId}}-recusa-pedido",
  save: ["pedidoRecusa", "id"],
  check: ["totalCentavos", 2290],
});
add(
  "Recusa",
  "Recusar pagamento e cancelar pedido",
  "POST",
  "/pagamentos",
  200,
  {
    body: { pedidoId: "{{pedidoRecusa}}", cenario: "RECUSADO" },
    key: "{{runId}}-recusa-pagamento",
    check: ["pedido.status", "CANCELADO"],
  },
);
add("Recusa", "Verificar devolução dos pontos", "GET", "/fidelidade", 200, {
  check: ["pontos", 24],
});
add("Falha do gateway", "Criar pedido para falha", "POST", "/pedidos", 201, {
  body: order,
  key: "{{runId}}-falha-pedido",
  save: ["pedidoFalha", "id"],
});
add(
  "Falha do gateway",
  "Simular indisponibilidade",
  "POST",
  "/pagamentos",
  503,
  {
    body: { pedidoId: "{{pedidoFalha}}", cenario: "TIMEOUT" },
    key: "{{runId}}-falha-pagamento",
    check: ["error", "GATEWAY_INDISPONIVEL"],
  },
);
add(
  "Falha do gateway",
  "Cancelar pedido pendente",
  "POST",
  "/pedidos/{{pedidoFalha}}/cancelamento",
  200,
  { check: ["status", "CANCELADO"] },
);
add(
  "Privacidade",
  "Revogar consentimento",
  "PUT",
  "/fidelidade/consentimento",
  200,
  { body: { aceito: false }, check: ["consentimento", false] },
);
add("Privacidade", "Anonimizar conta de teste", "DELETE", "/usuarios/me", 204);
add(
  "Privacidade",
  "Token da conta excluída é recusado",
  "GET",
  "/usuarios/me",
  401,
  { check: ["error", "NAO_AUTENTICADO"] },
);

const folders = [];
for (const s of scenarios) {
  let folder = folders.at(-1);
  if (folder?.name !== s.group) {
    folder = { name: s.group, item: [] };
    folders.push(folder);
  }
  const code = [
    `pm.test('HTTP ${s.status}', () => pm.response.to.have.status(${s.status}));`,
  ];
  if (s.status !== 204) code.push("const body = pm.response.json();");
  if (s.save)
    code.push(`pm.collectionVariables.set('${s.save[0]}', body.${s.save[1]});`);
  if (s.check)
    code.push(
      `pm.test('Contrato ${s.check[0]}', () => pm.expect(${s.check[0].split(".").reduce((v, k) => `${v}[${JSON.stringify(k)}]`, "body")}).to.eql(${JSON.stringify(s.check[1])}));`,
    );
  if (s.script) code.push(s.script);
  if (s.status >= 400)
    code.push(
      "pm.test('Erro padronizado', () => { ['error','message','details','timestamp','path','requestId'].forEach(key => pm.expect(body).to.have.property(key)); });",
    );
  const rawBody = s.body
    ? JSON.stringify(s.body, null, 2).replace(
        /"{{(pedidoId|pedidoRecusa|pedidoFalha|produtoTeste)}}"/g,
        "{{$1}}",
      )
    : undefined;
  folder.item.push({
    name: `${s.id} ${s.name}`,
    event: [
      { listen: "test", script: { type: "text/javascript", exec: code } },
    ],
    request: {
      method: s.method,
      header: [
        { key: "Content-Type", value: "application/json" },
        ...(s.key ? [{ key: "Idempotency-Key", value: s.key }] : []),
      ],
      auth: s.noauth
        ? { type: "noauth" }
        : {
            type: "bearer",
            bearer: [
              {
                key: "token",
                value: s.admin ? "{{adminToken}}" : "{{token}}",
                type: "string",
              },
            ],
          },
      url: "{{baseUrl}}" + s.path,
      ...(rawBody
        ? {
            body: {
              mode: "raw",
              raw: rawBody,
              options: { raw: { language: "json" } },
            },
          }
        : {}),
    },
  });
}
folders[0].item[0].event.unshift({
  listen: "prerequest",
  script: {
    type: "text/javascript",
    exec: [
      "const id = pm.variables.replaceIn('{{$guid}}');",
      "pm.collectionVariables.set('runId', id);",
      "pm.collectionVariables.set('emailTeste', 'teste-' + id + '@example.com');",
    ],
  },
});
write("docs/raizes.postman_collection.json", {
  info: {
    name: "Raízes do Nordeste - fluxo completo",
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    description:
      "Executar a coleção inteira na ordem, após migrations/seed, com API e gateway mock ativos. Cada execução cadastra seu próprio cliente. A conta é anonimizada ao final.",
  },
  variable: [
    { key: "baseUrl", value: "http://localhost:3000" },
    { key: "senha", value: "Demo@123456" },
  ],
  item: folders,
});
write("docs/test-scenarios.json", scenarios);
write(
  "docs/plano-de-testes.md",
  "# Plano de testes\n\nPré-condição geral: migrations e seed aplicados; API na porta 3000; mock na 4001; senha do seed igual à variável senha. Execute a coleção completa na ordem. T01 cria uma conta única, T02 salva seu token e T03 salva o token administrativo. Os IDs são capturados nas respostas.\n\n| ID | Cenário / evidência na coleção | Método e rota | Entrada | Esperado |\n|---|---|---|---|---|\n" +
    scenarios
      .map(
        (s) =>
          `| ${s.id} | ${s.group} / ${s.id} ${s.name} | ${s.method} ${s.path} | ${s.body ? "`" + JSON.stringify(s.body) + "`" : "Sem body"} | ${s.status}${s.check ? "; " + s.check[0] + " = " + JSON.stringify(s.check[1]) : ""} |`,
      )
      .join("\n") +
    "\n\nComplemento automatizado: backend/test/api.test.js usa bancos temporários em arquivo, integração HTTP com o mock, disputa de estoque, exclusão de conta, persistência, papéis operacionais e atomicidade.\n",
);
console.log(
  "OpenAPI, contratos, coleção Postman e plano de testes exportados.",
);
