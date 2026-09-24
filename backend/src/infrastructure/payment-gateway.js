export class PaymentGateway {
  constructor(url, timeout = 1500) {
    Object.assign(this, { url, timeout });
  }
  async charge(input, key) {
    const response = await fetch(`${this.url}/cobrancas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": key },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(this.timeout),
    });
    if (!response.ok) throw new Error("Gateway indisponível");
    const payload = await response.json();
    if (
      !["APROVADO", "RECUSADO"].includes(payload.status) ||
      typeof payload.transacaoId !== "string"
    )
      throw new Error("Retorno inválido");
    return payload;
  }
}
