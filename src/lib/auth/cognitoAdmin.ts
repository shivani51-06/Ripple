import "server-only";
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION ?? "us-east-1" });

/**
 * Creates and immediately confirms an account server-side, skipping
 * email-code confirmation entirely. Cognito's built-in email (the only
 * option without setting up SES) is capped at 50/day with no delivery
 * guarantees, which left real signups stuck unconfirmed with no recovery
 * path. Trade-off: email ownership is never verified. Acceptable here
 * since this is a personal focus-tracking app, not anything handling
 * sensitive data.
 */
export async function adminCreateConfirmedUser(email: string, password: string): Promise<void> {
  const userPoolId = process.env.COGNITO_USER_POOL_ID!;

  await client.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
      ],
      MessageAction: "SUPPRESS",
    }),
  );

  // Setting a permanent password also transitions the user out of
  // FORCE_CHANGE_PASSWORD into CONFIRMED.
  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: email,
      Password: password,
      Permanent: true,
    }),
  );
}
