import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, TELEMETRY_BUCKET } from "@/lib/s3";
import { getUserId } from "@/lib/auth/verifyToken";

export async function POST(req: NextRequest) {
  if (!TELEMETRY_BUCKET) {
    return NextResponse.json({ error: "Telemetry storage not configured" }, { status: 503 });
  }

  // Raw telemetry collection doesn't require sign-in: training data is
  // useful from anonymous play too, and requiring an account here would
  // contradict the product rule that the game must work without one.
  const userId = (await getUserId(req)) ?? "anonymous";
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
