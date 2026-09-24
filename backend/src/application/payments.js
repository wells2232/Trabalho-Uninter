import { AppError, requireCondition } from "../domain/errors.js";

export class Payments {
  constructor(repo, orders, gateway) {
    Object.assign(this, { repo, orders, gateway });
  }
  async pay(input, user, key, requestId) {
    const attempt = this.repo.transaction(() => {
      const order = this.orders.get(input.pedidoId, user);
      const previous = this.repo.find("payments", { idempotency_key: key });
      if (previous) {
        requireCondition(
          previous.pedido_id === order.id && previous.cenario === input.cenario,
          409,
          "CHAVE_REUTILIZADA",
          "Chave já utilizada em outro pagamento.",
        );
        requireCondition(
          previous.status !== "PROCESSANDO",
          409,
          "PAGAMENTO_EM_ANDAMENTO",
          "Pagamento em processamento.",
        );
        return { id: previous.id, replay: true };
      }
      requireCondition(
        order.status === "AGUARDANDO_PAGAMENTO",
        409,
        "PEDIDO_NAO_PAGAVEL",
        "Pedido não está aguardando pagamento.",
      );
      requireCondition(
        !this.repo.find("payments", {
          pedido_id: order.id,
          status: "PROCESSANDO",
        }),
        409,
        "PAGAMENTO_EM_ANDAMENTO",
        "Pagamento em processamento.",
      );
      const id = this.repo.insert("payments", {
        pedido_id: order.id,
        idempotency_key: key,
        status: "PROCESSANDO",
        cenario: input.cenario,
        valor_centavos: order.totalCentavos,
      }).id;
      return { id, order, replay: false };
    });
    if (!attempt.replay) {
      let payload;
      try {
        payload = await this.gateway.charge(
          {
            pedidoId: input.pedidoId,
            valorCentavos: attempt.order.totalCentavos,
            cenario: input.cenario,
          },
          key,
        );
      } catch {
        this.repo.transaction(() => {
          this.repo.update(
            "payments",
            { id: attempt.id },
            {
              status: "ERRO",
              payload: JSON.stringify({
                message:
                  "Gateway mock indisponível. Tente novamente com uma nova chave.",
              }),
            },
          );
          this.repo.audit(user.id, "PAGAMENTO_ERRO", attempt.id, requestId);
        });
        throw new AppError(
          503,
          "GATEWAY_INDISPONIVEL",
          "Pagamento não confirmado. Tente novamente com uma nova chave.",
        );
      }
      this.repo.transaction(() => {
        this.repo.update(
          "payments",
          { id: attempt.id },
          { status: payload.status, payload: JSON.stringify(payload) },
        );
        if (payload.status === "APROVADO")
          this.repo.update(
            "orders",
            { id: input.pedidoId },
            { status: "EM_PREPARO" },
          );
        else this.orders.release(attempt.order, user.id);
        this.repo.audit(
          user.id,
          `PAGAMENTO_${payload.status}`,
          attempt.id,
          requestId,
        );
      });
    }
    const payment = this.repo.payment(attempt.id);
    if (payment.status === "ERRO")
      throw new AppError(
        503,
        "GATEWAY_INDISPONIVEL",
        "Pagamento não confirmado. Tente novamente com uma nova chave.",
      );
    return { pagamento: payment, pedido: this.repo.order(input.pedidoId) };
  }
}
