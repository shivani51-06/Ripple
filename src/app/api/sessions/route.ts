import { NextRequest, NextResponse } from "next/server";
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, USERS_TABLE, SESSIONS_TABLE } from "@/lib/dynamo";
import { getUserId } from "@/lib/auth/verifyToken";
import type { UserStreakRecord } from "@/lib/streak";

// The sort key is a random session id, not time-ordered, so results are
// sorted by completedAt here rather than relying on DynamoDB's key order.
// Fine at this scale (one Query per user, capped) without adding a GSI.
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Missing or invalid bearer token" }, { status: 401 });
  }

  const [sessionsResult, userResult] = await Promise.all([
    ddb.send(
      new QueryCommand({
        TableName: SESSIONS_TABLE,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: { ":userId": userId },
      }),
    ),
    ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: { userId } })),
  ]);

  const sessions = (sessionsResult.Items ?? [])
    .sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))
    .slice(0, 60)
    .reverse()
    .map((item) => ({
      sessionId: item.sessionId,
      completedAt: item.completedAt,
      focusScore: item.focusScore,
      goAccuracy: item.goAccuracy,
      inhibitionAccuracy: item.inhibitionAccuracy,
      meanReactionMs: item.meanReactionMs,
      countedTowardStreak: item.countedTowardStreak,
    }));

  const user = userResult.Item as UserStreakRecord | undefined;

  return NextResponse.json({
    sessions,
    currentStreak: user?.currentStreak ?? 0,
    longestStreak: user?.longestStreak ?? 0,
  });
}
