import { requireCondition } from "../domain/errors.js";

export class Accounts {
  constructor(repo, passwords, tokens) {
    Object.assign(this, { repo, passwords, tokens });
  }
  register(input, requestId) {
    return this.repo.transaction(() => {
      requireCondition(
        !this.repo.find("users", { email: input.email }),
        409,
        "EMAIL_EM_USO",
        "E-mail já cadastrado.",
      );
      const id = this.repo.insert("users", {
        nome: input.nome,
        email: input.email,
        password_hash: this.passwords.hash(input.senha),
        perfil: "CLIENTE",
      }).id;
      this.repo.audit(id, "CADASTRO", id, requestId);
      return { id, nome: input.nome, perfil: "CLIENTE" };
    });
  }
  login(input, requestId) {
    const user = this.repo.find("users", { email: input.email, ativo: 1 });
    requireCondition(
      user && this.passwords.verify(input.senha, user.password_hash),
      401,
      "CREDENCIAIS_INVALIDAS",
      "E-mail ou senha inválidos.",
    );
    this.repo.audit(user.id, "LOGIN", user.id, requestId);
    return {
      accessToken: this.tokens.sign(user),
      tokenType: "Bearer",
      expiresIn: 3600,
      user: { id: user.id, nome: user.nome, perfil: user.perfil },
    };
  }
  profile(user, requestId) {
    this.repo.audit(user.id, "CONSULTA_DADOS_PESSOAIS", user.id, requestId);
    return this.repo.profile(user.id);
  }
  consent(user, accepted, requestId) {
    return this.repo.transaction(() => {
      this.repo.update(
        "users",
        { id: user.id },
        { consentimento: Number(accepted) },
      );
      this.repo.insert("consents", {
        cliente_id: user.id,
        aceito: Number(accepted),
        versao: "1.0",
        finalidade: "Participação opcional no programa de fidelidade",
      });
      this.repo.audit(
        user.id,
        accepted ? "CONSENTIMENTO_ACEITO" : "CONSENTIMENTO_REVOGADO",
        user.id,
        requestId,
      );
      return { consentimento: accepted, versao: "1.0" };
    });
  }
  anonymize(user, requestId) {
    this.repo.transaction(() => {
      requireCondition(
        !this.repo.openOrder(user.id),
        409,
        "PEDIDO_EM_ABERTO",
        "Conclua ou cancele seus pedidos antes de excluir a conta.",
      );
      this.repo.update(
        "users",
        { id: user.id },
        {
          nome: "Conta anonimizada",
          email: `excluido-${user.id}@invalid.local`,
          password_hash: this.passwords.hash(crypto.randomUUID()),
          ativo: 0,
          consentimento: 0,
          pontos: 0,
        },
      );
      this.repo.insert("consents", {
        cliente_id: user.id,
        aceito: 0,
        versao: "1.0",
        finalidade: "Revogação por exclusão de conta",
      });
      this.repo.audit(user.id, "CONTA_ANONIMIZADA", user.id, requestId);
    });
  }
}
