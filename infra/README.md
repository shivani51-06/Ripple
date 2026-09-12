# Ripple infrastructure

AWS CDK (TypeScript) stack for Ripple's backend resources. See the main
project README for the full architecture writeup; this covers just the
commands.

## What this provisions

- A Cognito User Pool + client (Lite feature plan, free indefinitely)
- Two DynamoDB tables, `ripple-users` and `ripple-sessions` (provisioned
  capacity, 5 RCU/5 WCU each, well under AWS's permanent free tier)
- An S3 bucket for raw telemetry, with a 90 day expiry lifecycle rule
- A scoped IAM user (`ripple-api`) with read/write access to just those
  three resources, for the Next.js app's server-side API routes

## Commands

```bash
npm install          # one-time
npx cdk synth         # preview the generated CloudFormation, no AWS calls
npx cdk bootstrap      # one-time per AWS account/region
npx cdk deploy --require-approval never
npx cdk diff           # compare deployed stack with current code
```

After deploying, the stack prints the values needed for the app's
`.env.local` (see `.env.example` at the repo root) as CloudFormation
outputs. The one value CDK cannot produce is the `ripple-api` user's
access key: create it manually in the IAM console (Users, ripple-api,
Security credentials, Create access key).
