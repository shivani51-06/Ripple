import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const REGION = process.env.NEXT_PUBLIC_AWS_REGION ?? "us-east-1";
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";

// Runs entirely in the browser: Cognito's public sign-up/sign-in API calls
// only need the pool's client ID, never AWS credentials, so no secrets ship
// to the client here.
const client = new CognitoIdentityProviderClient({ region: REGION });

export interface AuthTokens {
  idToken: string;
  accessToken: string;
}

export async function signUp(email: string, password: string): Promise<void> {
  await client.send(
    new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [{ Name: "email", Value: email }],
    }),
  );
}

export async function confirmSignUp(email: string, code: string): Promise<void> {
  await client.send(
    new ConfirmSignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
    }),
  );
}

export async function signIn(email: string, password: string): Promise<AuthTokens> {
  const result = await client.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }),
  );
  const auth = result.AuthenticationResult;
  if (!auth?.IdToken || !auth.AccessToken) {
    throw new Error("Sign-in did not return tokens");
  }
  return { idToken: auth.IdToken, accessToken: auth.AccessToken };
}
