import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = process.env.JWT_SIGNING_KEY || 'your-secret-key';
const secret = new TextEncoder().encode(JWT_SECRET);

export interface TokenPayload {
  sub: string; // userId
  tenantId: string;
  role: string;
  email: string;
  iat?: number;
  exp?: number;
}

export async function signAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 15 * 60; // 15 minutes in seconds

  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresIn)
    .sign(secret);

  return token;
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  try {
    const verified = await jwtVerify(token, secret);
    return verified.payload as unknown as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

export async function decodeAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const verified = await jwtVerify(token, secret);
    return verified.payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}
