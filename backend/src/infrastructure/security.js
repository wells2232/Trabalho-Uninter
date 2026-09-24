import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password, hash) {
  const [salt, expected] = hash.split(":");
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}

export function tokenService(secret) {
  if (!secret || secret.length < 32)
    throw new Error(
      "JWT_SECRET deve ter pelo menos 32 caracteres. Configure o .env.",
    );
  return {
    sign: (user) =>
      jwt.sign({}, secret, {
        subject: String(user.id),
        expiresIn: "1h",
        issuer: "raizes-api",
        audience: "raizes-client",
      }),
    verify: (token) =>
      jwt.verify(token, secret, {
        algorithms: ["HS256"],
        issuer: "raizes-api",
        audience: "raizes-client",
      }),
  };
}
