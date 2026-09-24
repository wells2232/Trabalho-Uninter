import { z } from "zod";
import { channels, statuses } from "../domain/order.js";

const id = z.number().int().positive().max(2147483647);
const text = z.string().trim().min(2).max(120);
export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const schemas = {
  register: z
    .object({
      nome: text,
      email: z
        .email()
        .max(200)
        .transform((v) => v.toLowerCase()),
      senha: z.string().min(10).max(128),
    })
    .strict(),
  login: z
    .object({
      email: z
        .email()
        .max(200)
        .transform((v) => v.toLowerCase()),
      senha: z.string().min(1).max(128),
    })
    .strict(),
  unit: z
    .object({ nome: text, cidade: text, ativa: z.boolean().default(true) })
    .strict(),
  product: z
    .object({
      nome: text,
      descricao: z.string().trim().max(500).default(""),
      ativo: z.boolean().default(true),
    })
    .strict(),
  stock: z
    .object({
      unidadeId: id,
      produtoId: id,
      quantidade: z
        .number()
        .int()
        .min(-100000)
        .max(100000)
        .refine((v) => v !== 0),
      precoCentavos: z.number().int().min(1).max(1000000).optional(),
      motivo: text,
    })
    .strict(),
  order: z
    .object({
      unidadeId: id,
      canalPedido: z.enum(channels),
      itens: z
        .array(
          z
            .object({
              produtoId: id,
              quantidade: z.number().int().min(1).max(100),
            })
            .strict(),
        )
        .min(1)
        .max(30),
      pontosResgatados: z.number().int().min(0).max(1000000).default(0),
    })
    .strict(),
  status: z.object({ status: z.enum(["PRONTO", "ENTREGUE"]) }).strict(),
  payment: z
    .object({
      pedidoId: id,
      cenario: z.enum(["APROVADO", "RECUSADO", "TIMEOUT"]),
    })
    .strict(),
  consent: z.object({ aceito: z.boolean() }).strict(),
  ordersQuery: pagination
    .extend({
      canalPedido: z.enum(channels).optional(),
      status: z.enum(statuses).optional(),
    })
    .strict(),
  stockQuery: pagination
    .extend({ unidadeId: z.coerce.number().int().positive().optional() })
    .strict(),
};
export const parseId = (value) =>
  z.coerce.number().int().positive().max(2147483647).parse(value);
export const parseKey = (value) =>
  z
    .string()
    .min(8)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .parse(value);
