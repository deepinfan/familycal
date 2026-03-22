import { jwtVerify, SignJWT, type JWTPayload } from "jose";
import type { NextRequest } from "next/server";

export const AUTH_COOKIE_NAME = "homecal_token";

type JwtPayloadBase = {
  roleId: string;
  isAdmin: boolean;
};

export type JwtPayload = JWTPayload & JwtPayloadBase;

function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: JwtPayloadBase, remember: boolean): Promise<string> {
  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt();

  if (remember) {
    jwt.setExpirationTime("30d");
  }

  return jwt.sign(getSecretKey());
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload.roleId || typeof payload.isAdmin !== "boolean") {
      return null;
    }
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

export async function getAuthFromRequest(request: NextRequest): Promise<JwtPayload | null> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function isSecureRequest(request: Request | NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0].trim() === "https";
  }
  return new URL(request.url).protocol === "https:";
}

export function getAuthCookieOptions(remember: boolean, secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "strict" as const,
    path: "/",
    maxAge: remember ? 30 * 24 * 60 * 60 : undefined
  };
}
