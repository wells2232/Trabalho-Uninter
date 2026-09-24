import { createHash } from "node:crypto";
import { Order } from "../domain/order.js";
import { requireCondition } from "../domain/errors.js";

export class Orders {
  constructor(repo) {
    this.repo = repo;
  }
  get(id, user) {
    const order = this.repo.order(id);
    requireCondition(
      order,
      404,
      "PEDIDO_NAO_ENCONTRADO",
      "Pedido não encontrado.",
    );
    requireCondition(
      user.perfil !== "CLIENTE" || order.clienteId === user.id,
      403,
      "SEM_PERMISSAO",
      "Pedido pertence a outro cliente.",
    );
    return order;
  }
  create(input, user, key, requestId) {
    const hash = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
    return this.repo.transaction(() => {
      const previous = this.repo.find("orders", {
        cliente_id: user.id,
        idempotency_key: key,
      });
      if (previous) {
        requireCondition(
          previous.request_hash === hash,
          409,
          "CHAVE_REUTILIZADA",
          "A chave já foi usada com outros dados.",
        );
        return { order: this.repo.order(previous.id), replay: true };
      }
      requireCondition(
        this.repo.find("units", { id: input.unidadeId, ativa: 1 }),
        404,
        "UNIDADE_NAO_ENCONTRADA",
        "Unidade não encontrada ou inativa.",
      );
      const ids = new Set(input.itens.map((item) => item.produtoId));
      requireCondition(
        ids.size === input.itens.length,
        422,
        "ITENS_DUPLICADOS",
        "Agrupe as quantidades do mesmo produto.",
      );
      const items = input.itens.map((item) => {
        const stock = this.repo.availableStock(input.unidadeId, item.produtoId);
        requireCondition(
          stock,
          404,
          "PRODUTO_NAO_ENCONTRADO",
          "Produto não disponível no cardápio desta unidade.",
        );
        requireCondition(
          stock.quantidade >= item.quantidade,
          409,
          "ESTOQUE_INSUFICIENTE",
          "Não há estoque suficiente para o pedido.",
        );
        return { ...item, precoCentavos: stock.preco_centavos };
      });
      const client = this.repo.find("users", { id: user.id });
      if (input.pontosResgatados) {
        requireCondition(
          client.consentimento,
          409,
          "CONSENTIMENTO_NECESSARIO",
          "Aceite o programa de fidelidade para resgatar pontos.",
        );
        requireCondition(
          client.pontos >= input.pontosResgatados,
          409,
          "PONTOS_INSUFICIENTES",
          "Saldo de pontos insuficiente.",
        );
      }
      const totals = Order.totals(items, input.pontosResgatados);
      const id = this.repo.insert("orders", {
        cliente_id: user.id,
        unidade_id: input.unidadeId,
        canal_pedido: input.canalPedido,
        status: "AGUARDANDO_PAGAMENTO",
        subtotal_centavos: totals.subtotalCentavos,
        desconto_centavos: totals.descontoCentavos,
        total_centavos: totals.totalCentavos,
        pontos_resgatados: input.pontosResgatados,
        idempotency_key: key,
        request_hash: hash,
      }).id;
      for (const item of items) {
        this.repo.insert("order_items", {
          pedido_id: id,
          produto_id: item.produtoId,
          quantidade: item.quantidade,
          preco_centavos: item.precoCentavos,
        });
        this.moveStock(
          input.unidadeId,
          item.produtoId,
          -item.quantidade,
          id,
          user.id,
          "RESERVA_PEDIDO",
        );
      }
      if (input.pontosResgatados)
        this.points(user.id, id, -input.pontosResgatados, "RESGATE");
      this.repo.audit(user.id, "PEDIDO_CRIADO", id, requestId);
      return { order: this.repo.order(id), replay: false };
    });
  }
  moveStock(unit, product, quantity, order, actor, reason) {
    this.repo.increment(
      "inventory",
      { unidade_id: unit, produto_id: product },
      "quantidade",
      quantity,
    );
    this.repo.insert("stock_movements", {
      unidade_id: unit,
      produto_id: product,
      quantidade: quantity,
      pedido_id: order,
      autor_id: actor,
      motivo: reason,
    });
  }
  points(client, order, points, reason) {
    this.repo.increment("users", { id: client }, "pontos", points);
    this.repo.insert("loyalty_entries", {
      cliente_id: client,
      pedido_id: order,
      pontos: points,
      motivo: reason,
    });
  }
  cancel(id, user, requestId) {
    return this.repo.transaction(() => {
      const order = this.get(id, user);
      requireCondition(
        order.status === "AGUARDANDO_PAGAMENTO",
        409,
        "CANCELAMENTO_INVALIDO",
        "Somente pedidos aguardando pagamento podem ser cancelados.",
      );
      requireCondition(
        !this.repo.find("payments", { pedido_id: id, status: "PROCESSANDO" }),
        409,
        "PAGAMENTO_EM_ANDAMENTO",
        "Aguarde o resultado do pagamento.",
      );
      this.release(order, user.id);
      this.repo.audit(user.id, "PEDIDO_CANCELADO", id, requestId);
      return this.repo.order(id);
    });
  }
  release(order, actor) {
    for (const item of order.itens)
      this.moveStock(
        order.unidadeId,
        item.produtoId,
        item.quantidade,
        order.id,
        actor,
        "DEVOLUCAO_PEDIDO",
      );
    if (order.pontosResgatados)
      this.points(order.clienteId, order.id, order.pontosResgatados, "ESTORNO");
    this.repo.update("orders", { id: order.id }, { status: "CANCELADO" });
  }
  updateStatus(id, next, user, requestId) {
    return this.repo.transaction(() => {
      const order = new Order(this.get(id, user));
      requireCondition(
        user.perfil !== "COZINHA" || next === "PRONTO",
        403,
        "SEM_PERMISSAO",
        "A cozinha pode apenas marcar pedidos como prontos.",
      );
      requireCondition(
        user.perfil !== "ATENDENTE" || next === "ENTREGUE",
        403,
        "SEM_PERMISSAO",
        "O atendente pode apenas confirmar a entrega.",
      );
      order.transition(next);
      this.repo.update("orders", { id }, { status: next });
      if (
        next === "ENTREGUE" &&
        this.repo.find("users", { id: order.clienteId }).consentimento
      ) {
        this.points(
          order.clienteId,
          id,
          Math.floor(order.totalCentavos / 100),
          "CREDITO_ENTREGA",
        );
      }
      this.repo.audit(user.id, `PEDIDO_${next}`, id, requestId);
      return this.repo.order(id);
    });
  }
}
