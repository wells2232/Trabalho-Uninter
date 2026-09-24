import { hashPassword } from "./security.js";
import { users, units, products, inventory } from "./schema.js";

export function seed(db, password) {
  if (!password || password.length < 10)
    throw new Error("Defina SEED_PASSWORD com pelo menos 10 caracteres.");
  db.transaction(() => {
    for (const perfil of [
      "ADMIN",
      "GERENTE",
      "ATENDENTE",
      "COZINHA",
      "CLIENTE",
    ]) {
      db.insert(users)
        .values({
          nome: perfil,
          email: `${perfil.toLowerCase()}@raizes.local`,
          password_hash: hashPassword(password),
          perfil,
        })
        .onConflictDoNothing()
        .run();
    }
    db.insert(units)
      .values([
        { id: 1, nome: "Boa Viagem", cidade: "Recife" },
        { id: 2, nome: "Meireles", cidade: "Fortaleza" },
      ])
      .onConflictDoNothing()
      .run();
    db.insert(products)
      .values([
        {
          id: 1,
          nome: "Tapioca da casa",
          descricao: "Queijo coalho, carne de sol e manteiga da terra",
        },
        {
          id: 2,
          nome: "Cuscuz nordestino",
          descricao: "Cuscuz de milho com queijo coalho",
        },
        { id: 3, nome: "Suco de cajá", descricao: "Cajá da fruta, 300 ml" },
      ])
      .onConflictDoNothing()
      .run();
    for (const unit of [1, 2])
      for (const [product, price] of [
        [1, 2490],
        [2, 1690],
        [3, 890],
      ]) {
        db.insert(inventory)
          .values({
            unidade_id: unit,
            produto_id: product,
            preco_centavos: price + (unit === 2 ? 100 : 0),
            quantidade: 1000,
          })
          .onConflictDoNothing()
          .run();
      }
  });
}
