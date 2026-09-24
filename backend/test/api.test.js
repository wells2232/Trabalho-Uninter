import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { openDatabase, migrate } from "../src/infrastructure/database.js";
import { Repository } from "../src/infrastructure/repository.js";
import { seed } from "../src/infrastructure/seed.js";
import { PaymentGateway } from "../src/infrastructure/payment-gateway.js";
import { createMockGateway } from "../src/infrastructure/payment-server.js";
import { bootstrap } from "../src/bootstrap.js";

const password = "Demo@123456";
const secret = "test-secret-with-at-least-thirty-two-characters";
const input = (extra = {}) => ({
  unidadeId: 1,
  canalPedido: "WEB",
  itens: [{ produtoId: 1, quantidade: 1 }],
  ...extra,
});

async function setup(t, gateway) {
  const dir = mkdtempSync(join(tmpdir(), "raizes-test-"));
  const db = openDatabase(join(dir, "test.sqlite"));
  migrate(db);
  seed(db, password);
  const server = createMockGateway().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const app = bootstrap(
    db,
    gateway ||
      new PaymentGateway(`http://127.0.0.1:${server.address().port}`, 100),
    secret,
  );
  const tokens = {};
  for (const role of ["cliente", "admin", "cozinha", "atendente"]) {
    const response = await request(app)
      .post("/auth/login")
      .send({ email: `${role}@raizes.local`, senha: password })
      .expect(200);
    tokens[role] = response.body.accessToken;
  }
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const call = (method, path, role = "cliente") =>
    request(app)[method](path).set("Authorization", `Bearer ${tokens[role]}`);
  const create = (body = input(), key = randomUUID()) =>
    call("post", "/pedidos").set("Idempotency-Key", key).send(body);
  const pay = (id, cenario = "APROVADO", key = randomUUID()) =>
    call("post", "/pagamentos")
      .set("Idempotency-Key", key)
      .send({ pedidoId: id, cenario });
  return { app, db, repo: new Repository(db), call, create, pay, tokens, dir };
}

test("fluxo completo, auditoria e fidelidade creditada uma única vez", async (t) => {
  const { call, create, pay } = await setup(t);
  await call("put", "/fidelidade/consentimento")
    .send({ aceito: true })
    .expect(200);
  const order = (await create().expect(201)).body;
  assert.equal(order.totalCentavos, 2490);
  const approved = (await pay(order.id).expect(200)).body;
  assert.equal(approved.pagamento.status, "APROVADO");
  assert.equal(approved.pedido.status, "EM_PREPARO");
  await call("patch", `/pedidos/${order.id}/status`, "cozinha")
    .send({ status: "PRONTO" })
    .expect(200);
  await call("patch", `/pedidos/${order.id}/status`, "atendente")
    .send({ status: "ENTREGUE" })
    .expect(200);
  await call("patch", `/pedidos/${order.id}/status`, "atendente")
    .send({ status: "ENTREGUE" })
    .expect(409);
  const balance = (await call("get", "/fidelidade")).body;
  assert.equal(balance.pontos, 24);
  assert.equal(balance.historico.total, 1);
  const audit = (await call("get", "/auditorias?limit=100", "admin")).body;
  assert.ok(audit.data.some((row) => row.acao === "PEDIDO_ENTREGUE"));
});
test("401, 403, senha inválida e ausência de hash nas respostas", async (t) => {
  const { app, call } = await setup(t);
  const noToken = await request(app).get("/pedidos").expect(401);
  assert.deepEqual(Object.keys(noToken.body).sort(), [
    "details",
    "error",
    "message",
    "path",
    "requestId",
    "timestamp",
  ]);
  await call("post", "/produtos").send({ nome: "Produto" }).expect(403);
  await request(app)
    .post("/auth/login")
    .send({ email: "cliente@raizes.local", senha: "errada" })
    .expect(401);
  const profile = (await call("get", "/usuarios/me")).body;
  assert.equal(profile.password_hash, undefined);
});
test("cadastro valida e-mail, rejeita elevação de perfil e hash não contém a senha", async (t) => {
  const { app, repo } = await setup(t);
  await request(app)
    .post("/auth/cadastro")
    .send({ nome: "Maria", email: "invalido", senha: password })
    .expect(422);
  await request(app)
    .post("/auth/cadastro")
    .send({
      nome: "Maria",
      email: "maria@example.com",
      senha: password,
      perfil: "ADMIN",
    })
    .expect(422);
  await request(app)
    .post("/auth/cadastro")
    .send({ nome: "Maria", email: "maria@example.com", senha: password })
    .expect(201);
  assert.ok(
    !repo
      .find("users", { email: "maria@example.com" })
      .password_hash.includes(password),
  );
  await request(app)
    .post("/auth/cadastro")
    .send({ nome: "Maria", email: "MARIA@example.com", senha: password })
    .expect(409);
});
test("canal obrigatório, canal inválido, tipos e quantidade inválidos", async (t) => {
  const { create } = await setup(t);
  for (const body of [
    input({ canalPedido: undefined }),
    input({ canalPedido: "EMAIL" }),
    input({ itens: [{ produtoId: 1, quantidade: -1 }] }),
    input({ unidadeId: "1" }),
  ])
    await create(body).expect(422);
});
test("404 de produto/unidade e rollback quando um item não possui estoque", async (t) => {
  const { create, repo } = await setup(t);
  await create(input({ unidadeId: 999 })).expect(404);
  await create(input({ itens: [{ produtoId: 999, quantidade: 1 }] })).expect(
    404,
  );
  repo.update("inventory", { unidade_id: 1, produto_id: 2 }, { quantidade: 0 });
  await create(
    input({
      itens: [
        { produtoId: 1, quantidade: 1 },
        { produtoId: 2, quantidade: 1 },
      ],
    }),
  ).expect(409);
  assert.equal(
    repo.find("inventory", { unidade_id: 1, produto_id: 1 }).quantidade,
    1000,
  );
  assert.equal(repo.page("orders", {}, 1, 20).total, 0);
});
test("idempotência de pedido e pagamento, com conflito para outros dados", async (t) => {
  const { create, pay, repo } = await setup(t);
  const key = randomUUID();
  const body = input();
  const order = (await create(body, key).expect(201)).body;
  assert.equal((await create(body, key).expect(200)).body.id, order.id);
  await create(input({ canalPedido: "APP" }), key).expect(409);
  assert.equal(
    repo.find("inventory", { unidade_id: 1, produto_id: 1 }).quantidade,
    999,
  );
  const paymentKey = randomUUID();
  const paid = (await pay(order.id, "APROVADO", paymentKey).expect(200)).body;
  assert.equal(
    (await pay(order.id, "APROVADO", paymentKey).expect(200)).body.pagamento.id,
    paid.pagamento.id,
  );
  await pay(order.id, "RECUSADO", paymentKey).expect(409);
  assert.equal(repo.page("payments", {}, 1, 20).total, 1);
});
test("recusa cancela pedido e devolve estoque e pontos reservados", async (t) => {
  const { create, pay, repo } = await setup(t);
  const client = repo.find("users", { email: "cliente@raizes.local" });
  repo.update("users", { id: client.id }, { consentimento: 1, pontos: 100 });
  const order = (await create(input({ pontosResgatados: 20 })).expect(201))
    .body;
  assert.equal(order.totalCentavos, 2290);
  assert.equal(repo.find("users", { id: client.id }).pontos, 80);
  const response = (await pay(order.id, "RECUSADO").expect(200)).body;
  assert.equal(response.pedido.status, "CANCELADO");
  assert.equal(response.pagamento.status, "RECUSADO");
  assert.equal(
    repo.find("inventory", { unidade_id: 1, produto_id: 1 }).quantidade,
    1000,
  );
  assert.equal(repo.find("users", { id: client.id }).pontos, 100);
});
test("indisponibilidade mantém pedido pendente e permite nova tentativa", async (t) => {
  const { create, pay, call } = await setup(t);
  const order = (await create()).body;
  await pay(order.id, "TIMEOUT").expect(503);
  assert.equal(
    (await call("get", `/pedidos/${order.id}`)).body.status,
    "AGUARDANDO_PAGAMENTO",
  );
  await pay(order.id).expect(200);
  assert.equal(
    (await call("get", `/pedidos/${order.id}/pagamentos`)).body.total,
    2,
  );
});
test("cancelamento idempotente não duplica devolução e não aceita pedido pago", async (t) => {
  const { create, pay, call, repo } = await setup(t);
  const first = (await create()).body;
  await call("post", `/pedidos/${first.id}/cancelamento`).expect(200);
  await call("post", `/pedidos/${first.id}/cancelamento`).expect(409);
  assert.equal(
    repo.find("inventory", { unidade_id: 1, produto_id: 1 }).quantidade,
    1000,
  );
  const second = (await create()).body;
  await pay(second.id);
  await call("post", `/pedidos/${second.id}/cancelamento`).expect(409);
});
test("isolamento entre clientes, filtro de canal e paginação", async (t) => {
  const { app, call, create } = await setup(t);
  const order = (await create(input({ canalPedido: "TOTEM" }))).body;
  await create(input({ canalPedido: "APP" }));
  const listed = (
    await call("get", "/pedidos?canalPedido=TOTEM&limit=1&page=1")
  ).body;
  assert.equal(listed.total, 1);
  assert.equal(listed.data[0].id, order.id);
  await request(app)
    .post("/auth/cadastro")
    .send({
      nome: "Outro cliente",
      email: "outro@example.com",
      senha: password,
    });
  const { body } = await request(app)
    .post("/auth/login")
    .send({ email: "outro@example.com", senha: password });
  await request(app)
    .get(`/pedidos/${order.id}`)
    .set("Authorization", `Bearer ${body.accessToken}`)
    .expect(403);
  const other = await request(app)
    .get("/pedidos")
    .set("Authorization", `Bearer ${body.accessToken}`);
  assert.equal(other.body.total, 0);
  await call("get", "/pedidos?limit=999").expect(422);
});
test("perfis operacionais não podem pular etapas", async (t) => {
  const { call, create, pay } = await setup(t);
  const order = (await create()).body;
  await call("patch", `/pedidos/${order.id}/status`, "admin")
    .send({ status: "ENTREGUE" })
    .expect(409);
  await pay(order.id);
  await call("patch", `/pedidos/${order.id}/status`, "atendente")
    .send({ status: "PRONTO" })
    .expect(403);
  await call("patch", `/pedidos/${order.id}/status`, "cozinha")
    .send({ status: "ENTREGUE" })
    .expect(403);
});
test("consentimento, saldo e teto de resgate são exigidos", async (t) => {
  const { call, create, repo } = await setup(t);
  await create(input({ pontosResgatados: 1 })).expect(409);
  await call("put", "/fidelidade/consentimento").send({ aceito: true });
  await create(input({ pontosResgatados: 1 })).expect(409);
  repo.update("users", { email: "cliente@raizes.local" }, { pontos: 1000 });
  await create(input({ pontosResgatados: 125 })).expect(409);
  await call("put", "/fidelidade/consentimento").send({ aceito: false });
  await create(input({ pontosResgatados: 1 })).expect(409);
});
test("gestão de unidade/produto e estoque independente", async (t) => {
  const { call, create } = await setup(t);
  const unit = (
    await call("post", "/unidades", "admin")
      .send({ nome: "Centro", cidade: "Natal" })
      .expect(201)
  ).body;
  const product = (
    await call("post", "/produtos", "admin")
      .send({ nome: "Bolo de milho" })
      .expect(201)
  ).body;
  await call("post", "/estoques/movimentacoes", "admin")
    .send({
      unidadeId: unit.id,
      produtoId: product.id,
      quantidade: 5,
      precoCentavos: 1200,
      motivo: "Carga inicial",
    })
    .expect(201);
  const menu = (await call("get", `/unidades/${unit.id}/cardapio`)).body;
  assert.equal(menu.data[0].quantidade, 5);
  await create(
    input({ unidadeId: 1, itens: [{ produtoId: product.id, quantidade: 1 }] }),
  ).expect(404);
  await call("post", "/estoques/movimentacoes", "admin")
    .send({
      unidadeId: unit.id,
      produtoId: product.id,
      quantidade: -6,
      motivo: "Saída",
    })
    .expect(409);
  await call("put", `/produtos/${product.id}`, "admin")
    .send({ nome: "Bolo de milho", ativo: false })
    .expect(200);
  assert.equal(
    (await call("get", `/unidades/${unit.id}/cardapio`)).body.total,
    0,
  );
  await call("put", `/unidades/${unit.id}`, "admin")
    .send({ nome: "Centro", cidade: "Natal", ativa: false })
    .expect(200);
  await call("get", `/unidades/${unit.id}/cardapio`).expect(404);
});
test("duas compras disputando a última unidade não deixam estoque negativo", async (t) => {
  const { create, repo } = await setup(t);
  repo.update("inventory", { unidade_id: 1, produto_id: 1 }, { quantidade: 1 });
  const results = await Promise.all([create(), create()]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(
    repo.find("inventory", { unidade_id: 1, produto_id: 1 }).quantidade,
    0,
  );
});
test("cobrança em andamento bloqueia cancelamento e segunda cobrança", async (t) => {
  let release;
  let started;
  const charged = new Promise((resolve) => {
    started = resolve;
  });
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const { create, pay, call } = await setup(t, {
    charge: async () => {
      started();
      await gate;
      return { status: "APROVADO", transacaoId: "test" };
    },
  });
  const order = (await create()).body;
  const pending = pay(order.id).then((response) => response);
  await charged;
  await pay(order.id).expect(409);
  await call("post", `/pedidos/${order.id}/cancelamento`).expect(409);
  release();
  assert.equal((await pending).status, 200);
});
test("anonimização revoga token e impede exclusão durante pedido aberto", async (t) => {
  const { call, create, repo } = await setup(t);
  const order = (await create()).body;
  await call("delete", "/usuarios/me").expect(409);
  await call("post", `/pedidos/${order.id}/cancelamento`);
  await call("delete", "/usuarios/me").expect(204);
  await call("get", "/usuarios/me").expect(401);
  assert.equal(
    repo.find("users", { id: order.clienteId }).nome,
    "Conta anonimizada",
  );
});
test("persistência sobrevive à abertura de uma segunda conexão e migrations são repetíveis", async (t) => {
  const { create, dir } = await setup(t);
  const order = (await create()).body;
  const db2 = openDatabase(join(dir, "test.sqlite"));
  migrate(db2);
  assert.equal(new Repository(db2).order(order.id).totalCentavos, 2490);
  db2.close();
});
test("Swagger reflete rotas, JSON malformado e rota inexistente usam erro padrão", async (t) => {
  const { app } = await setup(t);
  const spec = (await request(app).get("/openapi.json").expect(200)).body;
  assert.ok(
    spec.paths["/pedidos"].post.requestBody.content[
      "application/json"
    ].schema.required.includes("canalPedido"),
  );
  await request(app).get("/docs/").expect(200);
  const bad = await request(app)
    .post("/auth/login")
    .set("Content-Type", "application/json")
    .send("{")
    .expect(400);
  assert.equal(bad.body.error, "JSON_INVALIDO");
  await request(app).get("/inexistente").expect(404);
});
