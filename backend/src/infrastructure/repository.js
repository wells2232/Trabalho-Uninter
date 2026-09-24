import {
  and,
  eq,
  sql,
  desc,
  count,
  notInArray,
  getTableColumns,
} from "drizzle-orm";
import * as tables from "./schema.js";

function where(table, filters) {
  return and(
    ...Object.entries(filters)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => eq(table[key], value)),
  );
}
const camel = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
      value,
    ]),
  );

export class Repository {
  constructor(db) {
    this.db = db;
  }
  transaction(work) {
    return this.db.transaction(() => work(), { behavior: "immediate" });
  }
  find(name, filters) {
    const table = tables[name];
    return this.db.select().from(table).where(where(table, filters)).get();
  }
  insert(name, values) {
    return this.db.insert(tables[name]).values(values).returning().get();
  }
  update(name, filters, values) {
    const table = tables[name];
    return this.db.update(table).set(values).where(where(table, filters)).run();
  }
  increment(name, filters, field, amount) {
    const table = tables[name];
    return this.db
      .update(table)
      .set({ [field]: sql`${table[field]} + ${amount}` })
      .where(where(table, filters))
      .run();
  }
  audit(actor, action, resource, requestId) {
    this.insert("audit_logs", {
      autor_id: actor,
      acao: action,
      recurso: String(resource),
      request_id: requestId,
    });
  }
  openOrder(client) {
    return this.db
      .select()
      .from(tables.orders)
      .where(
        and(
          eq(tables.orders.cliente_id, client),
          notInArray(tables.orders.status, ["ENTREGUE", "CANCELADO"]),
        ),
      )
      .get();
  }
  profile(id) {
    const user = this.find("users", { id });
    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
      consentimento: user.consentimento,
      pontos: user.pontos,
    };
  }
  order(id) {
    const row = this.find("orders", { id });
    if (!row) return null;
    const { idempotency_key, request_hash, ...publicRow } = row;
    return {
      ...camel(publicRow),
      itens: this.db
        .select({
          produtoId: tables.order_items.produto_id,
          quantidade: tables.order_items.quantidade,
          precoCentavos: tables.order_items.preco_centavos,
        })
        .from(tables.order_items)
        .where(eq(tables.order_items.pedido_id, id))
        .all(),
    };
  }
  payment(id) {
    const row = this.find("payments", { id });
    if (!row) return null;
    const { idempotency_key, cenario, ...publicRow } = row;
    return { ...camel(publicRow), payload: JSON.parse(row.payload) };
  }
  page(name, filters, page, limit) {
    const table = tables[name];
    const condition = where(table, filters);
    const total = this.db
      .select({ total: count() })
      .from(table)
      .where(condition)
      .get().total;
    const orderBy = table.id ? desc(table.id) : table.produto_id;
    const rows = this.db
      .select()
      .from(table)
      .where(condition)
      .orderBy(orderBy)
      .limit(limit)
      .offset((page - 1) * limit)
      .all();
    const data = rows.map((row) =>
      name === "orders"
        ? this.order(row.id)
        : name === "payments"
          ? this.payment(row.id)
          : camel(row),
    );
    return { data, page, limit, total };
  }
  menu(unit, page, limit) {
    const { inventory: i, products: p } = tables;
    const condition = and(eq(i.unidade_id, unit), eq(p.ativo, 1));
    const total = this.db
      .select({ total: count() })
      .from(i)
      .innerJoin(p, eq(p.id, i.produto_id))
      .where(condition)
      .get().total;
    const data = this.db
      .select({
        id: p.id,
        nome: p.nome,
        descricao: p.descricao,
        precoCentavos: i.preco_centavos,
        quantidade: i.quantidade,
      })
      .from(i)
      .innerJoin(p, eq(p.id, i.produto_id))
      .where(condition)
      .orderBy(p.id)
      .limit(limit)
      .offset((page - 1) * limit)
      .all();
    return { data, page, limit, total };
  }
  availableStock(unit, product) {
    const { inventory: i, products: p } = tables;
    return this.db
      .select(getTableColumns(i))
      .from(i)
      .innerJoin(p, eq(p.id, i.produto_id))
      .where(
        and(eq(i.unidade_id, unit), eq(i.produto_id, product), eq(p.ativo, 1)),
      )
      .get();
  }
  upsertMenu(unit, product, price) {
    const table = tables.inventory;
    this.db
      .insert(table)
      .values({
        unidade_id: unit,
        produto_id: product,
        preco_centavos: price,
        quantidade: 0,
      })
      .onConflictDoUpdate({
        target: [table.unidade_id, table.produto_id],
        set: { preco_centavos: price },
      })
      .run();
  }
}
