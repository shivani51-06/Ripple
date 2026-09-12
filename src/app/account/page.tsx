"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { THEME } from "@/lib/theme";

type Mode = "sign-in" | "sign-up";

export default function AccountPage() {
  const { signIn, idToken, signOut } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "sign-up") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Could not create account");
        }
      }
      // Signing up confirms the account server-side immediately, so
      // signing in right after works whether this was sign-in or sign-up.
      await signIn(email, password);
      router.push("/");
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
        <Link href="/stats" className="text-sm underline" style={{ color: THEME.accent }}>
          View your stats
        </Link>
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

        {error && (
          <p className="text-sm" style={{ color: THEME.danger }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary">
          {mode === "sign-in" ? "Sign in" : "Create account"}
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
