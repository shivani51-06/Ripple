import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";

export class RippleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userPool = new cognito.UserPool(this, "RippleUserPool", {
      userPoolName: "ripple-users",
      // Lite is free indefinitely (fewer advanced-security features, which
      // this project doesn't use anyway). The default, Essentials, only has
      // a 12-month free trial and then bills per active user.
      featurePlan: cognito.FeaturePlan.LITE,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: false },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: false,
        requireDigits: false,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = new cognito.UserPoolClient(this, "RippleUserPoolClient", {
      userPool,
      userPoolClientName: "ripple-web",
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    // Provisioned (not on-demand) and pinned well under AWS's permanent
    // always-free tier (25 RCU + 25 WCU + 25GB storage per account, forever,
    // shared across both tables below) so this genuinely costs $0 rather
    // than "a fraction of a cent per request" under on-demand billing.
    const FREE_TIER_CAPACITY = { readCapacity: 5, writeCapacity: 5 };

    // Streak + profile state, one row per user.
    const usersTable = new dynamodb.Table(this, "RippleUsersTable", {
      tableName: "ripple-users",
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      ...FREE_TIER_CAPACITY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // One row per completed round, keyed by user + session id, for history
    // display and later ML retraining reference (raw telemetry lives in S3,
    // added in the next build step — this is the summarized record).
    const sessionsTable = new dynamodb.Table(this, "RippleSessionsTable", {
      tableName: "ripple-sessions",
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sessionId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      ...FREE_TIER_CAPACITY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Raw per-round telemetry (per-tap reaction times, switch-response
    // timing) for later offline model training — the summarized record
    // above is what the app displays, this is the training data source.
    // Auto-expires after 90 days as a cost/cleanup safety net, not a
    // retention policy requirement.
    const telemetryBucket = new s3.Bucket(this, "RippleTelemetryBucket", {
      bucketName: `ripple-telemetry-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [{ expiration: cdk.Duration.days(90) }],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Least-privilege credentials for the Vercel serverless API routes to
    // read/write these two tables. Vercel functions run outside AWS with no
    // OIDC federation set up, so a scoped IAM user + access key is the
    // pragmatic option here rather than an assumable role.
    const apiUser = new iam.User(this, "RippleApiUser", {
      userName: "ripple-api",
    });
    usersTable.grantReadWriteData(apiUser);
    sessionsTable.grantReadWriteData(apiUser);
    telemetryBucket.grantWrite(apiUser);

    // Lets the server-side signup route create and confirm accounts
    // directly, skipping email-code confirmation entirely. Cognito's
    // built-in COGNITO_DEFAULT email (the only option without setting up
    // SES) is capped at 50/day and has no delivery guarantees or
    // visibility, which made real signups silently get stuck unconfirmed.
    apiUser.addToPolicy(
      new iam.PolicyStatement({
        actions: ["cognito-idp:AdminCreateUser", "cognito-idp:AdminSetUserPassword"],
        resources: [userPool.userPoolArn],
      }),
    );

    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, "UsersTableName", { value: usersTable.tableName });
    new cdk.CfnOutput(this, "SessionsTableName", { value: sessionsTable.tableName });
    new cdk.CfnOutput(this, "TelemetryBucketName", { value: telemetryBucket.bucketName });
    new cdk.CfnOutput(this, "ApiUserName", { value: apiUser.userName });
  }
}
