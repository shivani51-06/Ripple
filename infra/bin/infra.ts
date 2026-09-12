#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { RippleStack } from "../lib/ripple-stack";

const app = new cdk.App();
new RippleStack(app, "RippleStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
});
