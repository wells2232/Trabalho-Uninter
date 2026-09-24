import {
  sqliteTable,
  integer,
  text,
  primaryKey,
  foreignKey,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const id = () => integer("id").primaryKey({ autoIncrement: true });
const created = () =>
  text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`);
export const users = sqliteTable(
  "users",
  {
    id: id(),
    nome: text().notNull(),
    email: text().notNull().unique(),
    password_hash: text().notNull(),
    perfil: text().notNull(),
    consentimento: integer().notNull().default(0),
    pontos: integer().notNull().default(0),
    ativo: integer().notNull().default(1),
    created_at: created(),
  },
  (t) => [
    check(
      "users_role",
      sql`${t.perfil} IN ('CLIENTE','ATENDENTE','COZINHA','GERENTE','ADMIN')`,
    ),
    check("users_points", sql`${t.pontos} >= 0`),
    check("users_consent", sql`${t.consentimento} IN (0,1)`),
  ],
);
export const units = sqliteTable("units", {
  id: id(),
  nome: text().notNull(),
  cidade: text().notNull(),
  ativa: integer().notNull().default(1),
});
export const products = sqliteTable("products", {
  id: id(),
  nome: text().notNull(),
  descricao: text().notNull().default(""),
  ativo: integer().notNull().default(1),
});
export const inventory = sqliteTable(
  "inventory",
  {
    unidade_id: integer()
      .notNull()
      .references(() => units.id),
    produto_id: integer()
      .notNull()
      .references(() => products.id),
    preco_centavos: integer().notNull(),
    quantidade: integer().notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.unidade_id, t.produto_id] }),
    check("stock_nonnegative", sql`${t.quantidade} >= 0`),
    check("price_positive", sql`${t.preco_centavos} > 0`),
  ],
);
export const orders = sqliteTable(
  "orders",
  {
    id: id(),
    cliente_id: integer()
      .notNull()
      .references(() => users.id),
    unidade_id: integer()
      .notNull()
      .references(() => units.id),
    canal_pedido: text().notNull(),
    status: text().notNull(),
    subtotal_centavos: integer().notNull(),
    desconto_centavos: integer().notNull().default(0),
    total_centavos: integer().notNull(),
    pontos_resgatados: integer().notNull().default(0),
    idempotency_key: text().notNull(),
    request_hash: text().notNull(),
    created_at: created(),
  },
  (t) => [
    uniqueIndex("order_idempotency").on(t.cliente_id, t.idempotency_key),
    index("orders_channel_status").on(t.canal_pedido, t.status, t.id),
    index("orders_client").on(t.cliente_id, t.id),
    check(
      "order_channel",
      sql`${t.canal_pedido} IN ('APP','TOTEM','BALCAO','PICKUP','WEB')`,
    ),
    check(
      "order_status",
      sql`${t.status} IN ('AGUARDANDO_PAGAMENTO','EM_PREPARO','PRONTO','ENTREGUE','CANCELADO')`,
    ),
    check("order_total", sql`${t.total_centavos} > 0`),
  ],
);
export const order_items = sqliteTable(
  "order_items",
  {
    id: id(),
    pedido_id: integer()
      .notNull()
      .references(() => orders.id),
    produto_id: integer()
      .notNull()
      .references(() => products.id),
    quantidade: integer().notNull(),
    preco_centavos: integer().notNull(),
  },
  (t) => [
    uniqueIndex("order_product").on(t.pedido_id, t.produto_id),
    check("item_quantity", sql`${t.quantidade} > 0`),
    check("item_price", sql`${t.preco_centavos} > 0`),
  ],
);
export const payments = sqliteTable(
  "payments",
  {
    id: id(),
    pedido_id: integer()
      .notNull()
      .references(() => orders.id),
    idempotency_key: text().notNull().unique(),
    status: text().notNull(),
    cenario: text().notNull(),
    valor_centavos: integer().notNull(),
    payload: text().notNull().default("{}"),
    created_at: created(),
  },
  (t) => [
    index("payments_order").on(t.pedido_id),
    check(
      "payment_status",
      sql`${t.status} IN ('PROCESSANDO','APROVADO','RECUSADO','ERRO')`,
    ),
  ],
);
export const stock_movements = sqliteTable(
  "stock_movements",
  {
    id: id(),
    unidade_id: integer().notNull(),
    produto_id: integer().notNull(),
    pedido_id: integer().references(() => orders.id),
    autor_id: integer()
      .notNull()
      .references(() => users.id),
    quantidade: integer().notNull(),
    motivo: text().notNull(),
    created_at: created(),
  },
  (t) => [
    foreignKey({
      columns: [t.unidade_id, t.produto_id],
      foreignColumns: [inventory.unidade_id, inventory.produto_id],
    }),
    check("movement_nonzero", sql`${t.quantidade} <> 0`),
  ],
);
export const loyalty_entries = sqliteTable("loyalty_entries", {
  id: id(),
  cliente_id: integer()
    .notNull()
    .references(() => users.id),
  pedido_id: integer().references(() => orders.id),
  pontos: integer().notNull(),
  motivo: text().notNull(),
  created_at: created(),
});
export const consents = sqliteTable("consents", {
  id: id(),
  cliente_id: integer()
    .notNull()
    .references(() => users.id),
  aceito: integer().notNull(),
  versao: text().notNull(),
  finalidade: text().notNull(),
  created_at: created(),
});
export const audit_logs = sqliteTable("audit_logs", {
  id: id(),
  autor_id: integer().references(() => users.id),
  acao: text().notNull(),
  recurso: text().notNull(),
  request_id: text().notNull(),
  created_at: created(),
});
