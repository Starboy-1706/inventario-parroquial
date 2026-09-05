import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const SESSION_COOKIE = "parish_session";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;

type SessionPayload = {
  v: 1;
  iat: number;
  exp: number;
  jti: string;
  pv: string;
};

export type AuthConfig = {
  password: string;
  secret: string;
  valid: boolean;
  error: string | null;
};

/**
 * ACCESS_PASSWORD es la variable actual. ADMIN_KEY se acepta temporalmente
 * para no romper despliegues existentes, pero nunca hay clave por defecto.
 */
export function getAuthConfig(): AuthConfig {
  const password = process.env.ACCESS_PASSWORD ?? process.env.ADMIN_KEY ?? "";
  const secret = process.env.SESSION_SECRET ?? "";

  if (password.length < 10) {
    return {
      password,
      secret,
      valid: false,
      error: "ACCESS_PASSWORD debe tener al menos 10 caracteres.",
    };
  }
  if (secret.length < 32) {
    return {
      password,
      secret,
      valid: false,
      error: "SESSION_SECRET debe tener al menos 32 caracteres.",
    };
  }
  return { password, secret, valid: true, error: null };
}

function passwordVersion(password: string) {
  return createHash("sha256").update(`parish-password:${password}`).digest("hex").slice(0, 20);
}

function sign(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function safeEqualText(a: string, b: string): boolean {
  const ah = createHash("sha256").update(a).digest();
  const bh = createHash("sha256").update(b).digest();
  return timingSafeEqual(ah, bh);
}

export function createSessionToken(now = Date.now()): string {
  const config = getAuthConfig();
  if (!config.valid) throw new Error("AUTH_NOT_CONFIGURED");

  const issued = Math.floor(now / 1000);
  const payload: SessionPayload = {
    v: 1,
    iat: issued,
    exp: issued + SESSION_SECONDS,
    jti: randomBytes(18).toString("base64url"),
    pv: passwordVersion(config.password),
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded, config.secret)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): SessionPayload | null {
  if (!token || token.length > 4096) return null;
  const config = getAuthConfig();
  if (!config.valid) return null;

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [encoded, suppliedSignature] = parts;
  const expectedSignature = sign(encoded, config.secret);
  if (!safeEqualText(suppliedSignature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>;
    const nowSeconds = Math.floor(now / 1000);
    if (
      payload.v !== 1 ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      typeof payload.jti !== "string" ||
      typeof payload.pv !== "string" ||
      payload.iat > nowSeconds + 60 ||
      payload.exp <= nowSeconds ||
      payload.exp - payload.iat > SESSION_SECONDS + 60 ||
      payload.pv !== passwordVersion(config.password)
    ) {
      return null;
    }
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
