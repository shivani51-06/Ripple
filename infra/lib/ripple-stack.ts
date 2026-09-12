import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";

export class RippleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userPool = new cognito.UserPool(this, "RippleUserPool", {
      userPoolName: "ripple-users",
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

    // Streak + profile state, one row per user. On-demand billing since
    // traffic is small and bursty (portfolio project, not production scale).
    const usersTable = new dynamodb.Table(this, "RippleUsersTable", {
      tableName: "ripple-users",
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // One row per completed round, keyed by user + session id, for history
    // display and later ML retraining reference (raw telemetry lives in S3,
    // added in the next build step — this is the summarized record).
    const sessionsTable = new dynamodb.Table(this, "RippleSessionsTable", {
      tableName: "ripple-sessions",
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sessionId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
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

    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, "UsersTableName", { value: usersTable.tableName });
    new cdk.CfnOutput(this, "SessionsTableName", { value: sessionsTable.tableName });
    new cdk.CfnOutput(this, "ApiUserName", { value: apiUser.userName });
  }
}
