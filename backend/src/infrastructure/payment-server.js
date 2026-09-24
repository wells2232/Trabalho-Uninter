import express from "express";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export function createMockGateway() {
  const app = express();
  app.use(express.json({ limit: "16kb" }));
  app.post("/cobrancas", (req, res) => {
    const { pedidoId, valorCentavos, cenario } = req.body;
    if (
      !Number.isSafeInteger(pedidoId) ||
      !Number.isSafeInteger(valorCentavos) ||
      valorCentavos <= 0 ||
      !["APROVADO", "RECUSADO", "TIMEOUT"].includes(cenario) ||
      !req.get("Idempotency-Key")
    )
      return res.status(422).json({ message: "Cobrança inválida" });
    if (cenario === "TIMEOUT")
      return res
        .status(503)
        .json({
          message: "Indisponibilidade simulada; nenhuma cobrança realizada.",
        });
    res.json({
      transacaoId: createHash("sha256")
        .update(req.get("Idempotency-Key"))
        .digest("hex")
        .slice(0, 24),
      status: cenario,
      valorCentavos,
      message:
        cenario === "APROVADO"
          ? "Pagamento mock aprovado."
          : "Pagamento mock recusado.",
    });
  });
  return app;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  createMockGateway().listen(
    Number(process.env.PAYMENT_PORT || 4001),
    "127.0.0.1",
    () => console.log("Gateway mock disponível."),
  );
}
