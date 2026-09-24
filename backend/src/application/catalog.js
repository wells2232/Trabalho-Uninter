import { requireCondition } from "../domain/errors.js";

export class Catalog {
  constructor(repo, orders) {
    Object.assign(this, { repo, orders });
  }
  saveUnit(input, id, user, requestId) {
    return this.repo.transaction(() => {
      if (id) {
        requireCondition(
          this.repo.find("units", { id }),
          404,
          "UNIDADE_NAO_ENCONTRADA",
          "Unidade não encontrada.",
        );
        this.repo.update(
          "units",
          { id },
          { ...input, ativa: Number(input.ativa) },
        );
      } else
        id = this.repo.insert("units", {
          ...input,
          ativa: Number(input.ativa),
        }).id;
      this.repo.audit(user.id, "UNIDADE_SALVA", id, requestId);
      return this.repo.find("units", { id });
    });
  }
  saveProduct(input, id, user, requestId) {
    return this.repo.transaction(() => {
      if (id) {
        requireCondition(
          this.repo.find("products", { id }),
          404,
          "PRODUTO_NAO_ENCONTRADO",
          "Produto não encontrado.",
        );
        this.repo.update(
          "products",
          { id },
          { ...input, ativo: Number(input.ativo) },
        );
      } else
        id = this.repo.insert("products", {
          ...input,
          ativo: Number(input.ativo),
        }).id;
      this.repo.audit(user.id, "PRODUTO_SALVO", id, requestId);
      return this.repo.find("products", { id });
    });
  }
  menu(unit, query) {
    requireCondition(
      this.repo.find("units", { id: unit, ativa: 1 }),
      404,
      "UNIDADE_NAO_ENCONTRADA",
      "Unidade não encontrada ou inativa.",
    );
    return this.repo.menu(unit, query.page, query.limit);
  }
  stock(input, user, requestId) {
    return this.repo.transaction(() => {
      requireCondition(
        this.repo.find("units", { id: input.unidadeId }),
        404,
        "UNIDADE_NAO_ENCONTRADA",
        "Unidade não encontrada.",
      );
      requireCondition(
        this.repo.find("products", { id: input.produtoId }),
        404,
        "PRODUTO_NAO_ENCONTRADO",
        "Produto não encontrado.",
      );
      const current = this.repo.find("inventory", {
        unidade_id: input.unidadeId,
        produto_id: input.produtoId,
      });
      requireCondition(
        current || input.precoCentavos,
        422,
        "PRECO_OBRIGATORIO",
        "Informe o preço para incluir o produto no cardápio.",
      );
      requireCondition(
        (current?.quantidade || 0) + input.quantidade >= 0,
        409,
        "ESTOQUE_INSUFICIENTE",
        "A saída excede o saldo disponível.",
      );
      this.repo.upsertMenu(
        input.unidadeId,
        input.produtoId,
        input.precoCentavos || current.preco_centavos,
      );
      this.orders.moveStock(
        input.unidadeId,
        input.produtoId,
        input.quantidade,
        null,
        user.id,
        input.motivo,
      );
      this.repo.audit(
        user.id,
        "ESTOQUE_MOVIMENTADO",
        `${input.unidadeId}/${input.produtoId}`,
        requestId,
      );
      return {
        unidadeId: input.unidadeId,
        produtoId: input.produtoId,
        precoCentavos: input.precoCentavos || current.preco_centavos,
        quantidade: (current?.quantidade || 0) + input.quantidade,
      };
    });
  }
}
