import "server-only";
import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" });

export const TELEMETRY_BUCKET = process.env.S3_TELEMETRY_BUCKET ?? "";
