import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { AppError, requireCondition } from "../domain/errors.js";
import { contracts, openapi } from "./contracts.js";
import { parseId, parseKey } from "./schemas.js";

export function createApp({
  repo,
  accounts,
  orders,
  payments,
  catalog,
  tokens,
}) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    next();
  });
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: "32kb" }));
  const limitError = (req, res, next) =>
    next(
      new AppError(
        429,
        "LIMITE_EXCEDIDO",
        "Muitas requisições. Tente novamente mais tarde.",
      ),
    );
  app.use(rateLimit({ windowMs: 60000, limit: 300, handler: limitError }));
  app.use(
    "/auth",
    rateLimit({ windowMs: 60000, limit: 30, handler: limitError }),
  );
  app.get("/health", (req, res) => res.json({ status: "ok" }));
  app.get("/openapi.json", (req, res) => res.json(openapi()));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi()));
  const handlers = {
    register: (req) => accounts.register(req.input, req.requestId),
    login: (req) => accounts.login(req.input, req.requestId),
    profile: (req) => accounts.profile(req.user, req.requestId),
    anonymize: (req) => accounts.anonymize(req.user, req.requestId),
    units: (req) =>
      repo.page("units", { ativa: 1 }, req.filters.page, req.filters.limit),
    createUnit: (req) =>
      catalog.saveUnit(req.input, null, req.user, req.requestId),
    updateUnit: (req) =>
      catalog.saveUnit(req.input, req.resourceId, req.user, req.requestId),
    menu: (req) => catalog.menu(req.resourceId, req.filters),
    products: (req) =>
      repo.page("products", { ativo: 1 }, req.filters.page, req.filters.limit),
    createProduct: (req) =>
      catalog.saveProduct(req.input, null, req.user, req.requestId),
    updateProduct: (req) =>
      catalog.saveProduct(req.input, req.resourceId, req.user, req.requestId),
    stock: (req) =>
      repo.page(
        "inventory",
        { unidade_id: req.filters.unidadeId },
        req.filters.page,
        req.filters.limit,
      ),
    moveStock: (req) => catalog.stock(req.input, req.user, req.requestId),
    createOrder: (req, res) => {
      const result = orders.create(req.input, req.user, req.key, req.requestId);
      res.status(result.replay ? 200 : 201);
      return result.order;
    },
    orders: (req) => {
      const { canalPedido, status, page, limit } = req.filters;
      return repo.page(
        "orders",
        {
          cliente_id: req.user.perfil === "CLIENTE" ? req.user.id : undefined,
          canal_pedido: canalPedido,
          status,
        },
        page,
        limit,
      );
    },
    order: (req) => orders.get(req.resourceId, req.user),
    cancel: (req) => orders.cancel(req.resourceId, req.user, req.requestId),
    status: (req) =>
      orders.updateStatus(
        req.resourceId,
        req.input.status,
        req.user,
        req.requestId,
      ),
    pay: (req) => payments.pay(req.input, req.user, req.key, req.requestId),
    payments: (req) => {
      orders.get(req.resourceId, req.user);
      return repo.page(
        "payments",
        { pedido_id: req.resourceId },
        req.filters.page,
        req.filters.limit,
      );
    },
    consent: (req) =>
      accounts.consent(req.user, req.input.aceito, req.requestId),
    loyalty: (req) => {
      repo.audit(
        req.user.id,
        "CONSULTA_FIDELIDADE",
        req.user.id,
        req.requestId,
      );
      return {
        ...(({ pontos, consentimento }) => ({ pontos, consentimento }))(
          repo.find("users", { id: req.user.id }),
        ),
        historico: repo.page(
          "loyalty_entries",
          { cliente_id: req.user.id },
          req.filters.page,
          req.filters.limit,
        ),
      };
    },
    audit: (req) => {
      repo.audit(
        req.user.id,
        "CONSULTA_AUDITORIA",
        "audit_logs",
        req.requestId,
      );
      return repo.page("audit_logs", {}, req.filters.page, req.filters.limit);
    },
  };
  for (const c of contracts) {
    app[c.method](c.path, async (req, res) => {
      if (!c.public) {
        try {
          const header = req.get("Authorization") || "";
          if (!header.startsWith("Bearer ")) throw new Error("Token ausente");
          const claims = tokens.verify(header.slice(7));
          req.user = repo.find("users", { id: Number(claims.sub), ativo: 1 });
          if (!req.user) throw new Error("Conta inativa");
        } catch {
          throw new AppError(
            401,
            "NAO_AUTENTICADO",
            "Informe um token válido.",
          );
        }
        requireCondition(
          !c.roles || c.roles.includes(req.user.perfil),
          403,
          "SEM_PERMISSAO",
          "Perfil sem permissão para esta operação.",
        );
      }
      if (c.body) req.input = c.body.parse(req.body);
      if (c.query) req.filters = c.query.parse(req.query);
      if (req.params.id) req.resourceId = parseId(req.params.id);
      if (c.key) req.key = parseKey(req.get("Idempotency-Key"));
      res.status(c.code || 200);
      const result = await handlers[c.name](req, res);
      if (c.code === 204) res.end();
      else res.json(result);
    });
  }
  app.use((req, res, next) =>
    next(new AppError(404, "ROTA_NAO_ENCONTRADA", "Rota não encontrada.")),
  );
  app.use((error, req, res, next) => {
    let failure = error;
    if (error instanceof ZodError)
      failure = new AppError(
        422,
        "DADOS_INVALIDOS",
        "Confira os campos enviados.",
        error.issues.map((issue) => ({
          field: issue.path.join("."),
          issue: issue.message,
        })),
      );
    if (error.type === "entity.parse.failed")
      failure = new AppError(400, "JSON_INVALIDO", "Envie um JSON válido.");
    if (error.type === "entity.too.large")
      failure = new AppError(
        413,
        "CORPO_MUITO_GRANDE",
        "Limite de 32 KB excedido.",
      );
    const expected = failure instanceof AppError;
    if (!expected)
      console.error(
        JSON.stringify({ requestId: req.requestId, error: "INTERNAL_ERROR" }),
      );
    res
      .status(expected ? failure.status : 500)
      .json({
        error: expected ? failure.code : "ERRO_INTERNO",
        message: expected ? failure.message : "Erro interno do servidor.",
        details: expected ? failure.details : [],
        timestamp: new Date().toISOString(),
        path: req.path,
        requestId: req.requestId,
      });
  });
  return app;
}
