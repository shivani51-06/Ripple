import "server-only";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { NextRequest } from "next/server";

// Built lazily (not at module load) so a missing env var only fails a real
// request, not the production build itself.
let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;
function getVerifier() {
  if (!verifier) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID!,
      tokenUse: "id",
      clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
    });
  }
  return verifier;
}

/** Returns the caller's user id (Cognito `sub`), or null if unauthenticated. */
export async function getUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const payload = await getVerifier().verify(token);
    return payload.sub;
  } catch {
    return null;
  }
}
