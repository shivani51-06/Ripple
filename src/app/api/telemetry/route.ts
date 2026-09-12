import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { s3, TELEMETRY_BUCKET } from "@/lib/s3";

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

// Raw telemetry collection doesn't require sign-in — training data is
// useful from anonymous play too, and requiring an account here would
// contradict the product rule that the game must work without one.
async function resolveUserId(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return "anonymous";
  try {
    const payload = await getVerifier().verify(token);
    return payload.sub;
  } catch {
    return "anonymous";
  }
}

export async function POST(req: NextRequest) {
  if (!TELEMETRY_BUCKET) {
    return NextResponse.json({ error: "Telemetry storage not configured" }, { status: 503 });
  }

  const userId = await resolveUserId(req);
  const body = await req.json();
  const now = new Date();
  const datePrefix = now.toISOString().slice(0, 10);
  const key = `raw/${datePrefix}/${userId}/${now.getTime()}-${crypto.randomUUID()}.json`;

  await s3.send(
    new PutObjectCommand({
      Bucket: TELEMETRY_BUCKET,
      Key: key,
      Body: JSON.stringify({ userId, recordedAt: now.toISOString(), ...body }),
      ContentType: "application/json",
    }),
  );

  return NextResponse.json({ ok: true });
}
