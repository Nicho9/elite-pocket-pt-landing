import { createHmac, timingSafeEqual } from "node:crypto";

export const FREE_WEBINAR_SESSION_COOKIE = "elite_free_webinar_access";
export const FREE_WEBINAR_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type FreeWebinarRegistrationSession = {
  email: string;
  expiresAt: number;
  name: string;
  slug: string;
};

type FreeWebinarSessionPayload = {
  e: string;
  i: number;
  n: string;
  s: string;
  v: 1;
  x: number;
};

function signingKey() {
  const secret = process.env.FREE_WEBINAR_SESSION_SECRET || process.env.WEBSITE_SIGNUP_SECRET;

  if (!secret) {
    return null;
  }

  // Keep this cryptographic purpose separate from any other use of the server secret.
  return createHmac("sha256", secret).update("elite-pocket-pt/free-webinar-registration-session/v1").digest();
}

function sign(encodedPayload: string, key: Buffer) {
  return createHmac("sha256", key).update(encodedPayload).digest("base64url");
}

function hasValidEmailStructure(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseCookieValue(header: string, name: string) {
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");

    if (separator === -1) {
      continue;
    }

    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }

  return "";
}

function isValidPayload(value: unknown): value is FreeWebinarSessionPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    payload.v === 1 &&
    typeof payload.s === "string" &&
    payload.s.length > 0 &&
    typeof payload.e === "string" &&
    hasValidEmailStructure(payload.e) &&
    typeof payload.n === "string" &&
    typeof payload.i === "number" &&
    Number.isInteger(payload.i) &&
    typeof payload.x === "number" &&
    Number.isInteger(payload.x)
  );
}

export function createFreeWebinarRegistrationSession({
  email,
  name,
  slug,
}: {
  email: string;
  name: string;
  slug: string;
}) {
  const key = signingKey();

  if (!key) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: FreeWebinarSessionPayload = {
    e: email.trim().toLowerCase(),
    i: now,
    n: name.trim().slice(0, 160),
    s: slug,
    v: 1,
    x: now + FREE_WEBINAR_SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${encodedPayload}.${sign(encodedPayload, key)}`;
}

export function readFreeWebinarRegistrationSession(request: Request): FreeWebinarRegistrationSession | null {
  const key = signingKey();
  const token = parseCookieValue(request.headers.get("cookie") || "", FREE_WEBINAR_SESSION_COOKIE);

  if (!key || !token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  const expectedSignature = sign(parts[0], key);
  const suppliedSignature = parts[1];

  if (expectedSignature.length !== suppliedSignature.length) {
    return null;
  }

  if (!timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(suppliedSignature))) {
    return null;
  }

  try {
    const payload: unknown = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));

    if (!isValidPayload(payload) || payload.x <= Math.floor(Date.now() / 1000) || payload.x <= payload.i) {
      return null;
    }

    return {
      email: payload.e.trim().toLowerCase(),
      expiresAt: payload.x,
      name: payload.n,
      slug: payload.s,
    };
  } catch {
    return null;
  }
}

export const freeWebinarSessionCookieOptions = {
  httpOnly: true,
  maxAge: FREE_WEBINAR_SESSION_MAX_AGE_SECONDS,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};
