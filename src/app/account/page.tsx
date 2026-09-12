"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { THEME } from "@/lib/theme";

type Mode = "sign-in" | "sign-up" | "confirm";

export default function AccountPage() {
  const { signIn, signUp, confirmSignUp, idToken, signOut } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "sign-in") {
        await signIn(email, password);
        router.push("/");
      } else if (mode === "sign-up") {
        await signUp(email, password);
        setMode("confirm");
      } else {
        await confirmSignUp(email, code);
        setMode("sign-in");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (idToken) {
    return (
      <Shell>
        <p style={{ color: THEME.inkMuted }}>You&apos;re signed in.</p>
        <button
          className="btn-primary"
          onClick={() => {
            signOut();
          }}
        >
          Sign out
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex gap-4 text-sm" style={{ color: THEME.inkMuted }}>
        <button
          onClick={() => setMode("sign-in")}
          style={{ fontWeight: mode === "sign-in" ? 600 : 400 }}
        >
          Sign in
        </button>
        <button
          onClick={() => setMode("sign-up")}
          style={{ fontWeight: mode === "sign-up" ? 600 : 400 }}
        >
          Create account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
        {mode !== "confirm" && (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: THEME.inkFaint }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: THEME.inkFaint }}
            />
          </>
        )}
        {mode === "confirm" && (
          <>
            <p className="text-sm" style={{ color: THEME.inkMuted }}>
              Enter the code emailed to {email}.
            </p>
            <input
              type="text"
              placeholder="Confirmation code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: THEME.inkFaint }}
            />
          </>
        )}

        {error && (
          <p className="text-sm" style={{ color: THEME.danger }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary">
          {mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : "Confirm"}
        </button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <h1 className="text-2xl font-semibold tracking-tight" style={{ color: THEME.ink }}>
        Ripple account
      </h1>
      {children}
    </div>
  );
}
