import { requireCondition } from "./errors.js";

export const channels = ["APP", "TOTEM", "BALCAO", "PICKUP", "WEB"];
export const roles = ["CLIENTE", "ATENDENTE", "COZINHA", "GERENTE", "ADMIN"];
export const statuses = [
  "AGUARDANDO_PAGAMENTO",
  "EM_PREPARO",
  "PRONTO",
  "ENTREGUE",
  "CANCELADO",
];

export class Order {
  constructor(data) {
    Object.assign(this, data);
  }

  transition(next) {
    const allowed = { EM_PREPARO: ["PRONTO"], PRONTO: ["ENTREGUE"] };
    requireCondition(
      allowed[this.status]?.includes(next),
      409,
      "STATUS_INVALIDO",
      "Transição de status não permitida.",
    );
    this.status = next;
  }

  static totals(items, points = 0) {
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantidade * item.precoCentavos,
      0,
    );
    const descontoCentavos = points * 10;
    requireCondition(
      descontoCentavos <= Math.floor(subtotal / 2),
      409,
      "RESGATE_INVALIDO",
      "O resgate pode cobrir até 50% do pedido.",
    );
    return {
      subtotalCentavos: subtotal,
      descontoCentavos,
      totalCentavos: subtotal - descontoCentavos,
    };
  }
}
