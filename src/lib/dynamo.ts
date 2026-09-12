import "server-only";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? "us-east-1" });

export const ddb = DynamoDBDocumentClient.from(client);

export const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE ?? "ripple-users";
export const SESSIONS_TABLE = process.env.DYNAMODB_SESSIONS_TABLE ?? "ripple-sessions";
