import { NextRequest, NextResponse } from "next/server";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, USERS_TABLE, SESSIONS_TABLE } from "@/lib/dynamo";
import { applyRoundToStreak, type UserStreakRecord } from "@/lib/streak";

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

interface SessionSummaryPayload {
  focusScore: number;
  goAccuracy: number;
  inhibitionAccuracy: number;
  meanReactionMs: number | null;
  targetHitCount: number;
  missCount: number;
  falseTapCount: number;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  let userId: string;
  try {
    const payload = await getVerifier().verify(token);
    userId = payload.sub;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const summary = (await req.json()) as SessionSummaryPayload;

  const existing = await ddb.send(
    new GetCommand({ TableName: USERS_TABLE, Key: { userId } }),
  );
  const previous: UserStreakRecord = existing.Item
    ? (existing.Item as UserStreakRecord)
    : { userId, currentStreak: 0, longestStreak: 0, lastPlayedDate: null, roundsPlayedToday: 0 };

  const { record, countedTowardStreak } = applyRoundToStreak(previous);

  await ddb.send(
    new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression:
        "SET currentStreak = :currentStreak, longestStreak = :longestStreak, lastPlayedDate = :lastPlayedDate, roundsPlayedToday = :roundsPlayedToday",
      ExpressionAttributeValues: {
        ":currentStreak": record.currentStreak,
        ":longestStreak": record.longestStreak,
        ":lastPlayedDate": record.lastPlayedDate,
        ":roundsPlayedToday": record.roundsPlayedToday,
      },
    }),
  );

  await ddb.send(
    new PutCommand({
      TableName: SESSIONS_TABLE,
      Item: {
        userId,
        sessionId: crypto.randomUUID(),
        completedAt: new Date().toISOString(),
        countedTowardStreak,
        ...summary,
      },
    }),
  );

  return NextResponse.json({
    currentStreak: record.currentStreak,
    longestStreak: record.longestStreak,
    roundsPlayedToday: record.roundsPlayedToday,
    countedTowardStreak,
  });
}
