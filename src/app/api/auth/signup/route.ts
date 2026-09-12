import { NextRequest, NextResponse } from "next/server";
import { adminCreateConfirmedUser } from "@/lib/auth/cognitoAdmin";

export async function POST(req: NextRequest) {
  const { email, password } = (await req.json()) as { email?: string; password?: string };

  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  }

  try {
    await adminCreateConfirmedUser(email, password);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "UsernameExistsException") {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    if (name === "InvalidPasswordException") {
      return NextResponse.json({ error: "Password does not meet requirements" }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }
}
