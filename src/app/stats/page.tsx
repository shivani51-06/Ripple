"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useAuth } from "@/lib/auth/AuthContext";
import { THEME } from "@/lib/theme";

interface SessionRow {
  sessionId: string;
  completedAt: string;
  focusScore: number;
  goAccuracy: number;
  inhibitionAccuracy: number;
  meanReactionMs: number | null;
  countedTowardStreak: boolean;
}

interface StatsResponse {
  sessions: SessionRow[];
  currentStreak: number;
  longestStreak: number;
}

export default function StatsPage() {
  const { idToken, isReady } = useAuth();
  const [data, setData] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!idToken) return;
    fetch("/api/sessions", { headers: { Authorization: `Bearer ${idToken}` } })
      .then((res) => {
        if (!res.ok) throw new Error("Could not load stats");
        return res.json();
      })
      .then(setData)
      .catch(() => setError("Could not load your stats right now."));
  }, [idToken]);

  if (isReady && !idToken) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: THEME.inkMuted }}>
          Sign in to see your focus score over time.
        </p>
        <Link href="/account" className="btn-primary">
          Sign in
        </Link>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: THEME.danger }}>
          {error}
        </p>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: THEME.inkMuted }}>
          Loading...
        </p>
      </Shell>
    );
  }

  const chartData = data.sessions.map((s, i) => ({
    index: i + 1,
    date: new Date(s.completedAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    focusScore: s.focusScore,
  }));

  return (
    <Shell>
      <div className="flex gap-8 text-center">
        <Stat label="Current streak" value={`${data.currentStreak} day${data.currentStreak === 1 ? "" : "s"}`} />
        <Stat label="Longest streak" value={`${data.longestStreak} day${data.longestStreak === 1 ? "" : "s"}`} />
        <Stat label="Rounds played" value={String(data.sessions.length)} />
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm" style={{ color: THEME.inkMuted }}>
          Play a few rounds to see your focus score trend here.
        </p>
      ) : (
        <div style={{ width: "min(90vw, 640px)", height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
              <CartesianGrid stroke={`rgba(${THEME.inkRgb}, 0.1)`} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: THEME.inkMuted, fontSize: 12 }}
                axisLine={{ stroke: THEME.inkFaint }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: THEME.inkMuted, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: THEME.surface,
                  border: `1px solid ${THEME.inkFaint}`,
                  borderRadius: 8,
                  color: THEME.ink,
                }}
              />
              <Line
                type="monotone"
                dataKey="focusScore"
                stroke={THEME.accent}
                strokeWidth={2}
                dot={{ fill: THEME.accent, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <Link href="/" className="text-sm underline" style={{ color: THEME.inkMuted }}>
        Back to Ripple
      </Link>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold" style={{ color: THEME.ink }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: THEME.inkMuted }}>
        {label}
      </p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <h1 className="text-2xl font-semibold tracking-tight" style={{ color: THEME.ink }}>
        Your focus over time
      </h1>
      {children}
    </div>
  );
}
