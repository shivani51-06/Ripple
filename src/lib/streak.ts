// Only a round's position in the day's play count decides whether it's
// eligible to count toward the streak — this is the deliberate anti-time-sink
// cap from the product spec, not a difficulty or scoring concept.
export const DAILY_ROUND_CAP = 3;

export interface UserStreakRecord {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate: string | null; // YYYY-MM-DD, UTC
  roundsPlayedToday: number;
}

export interface StreakUpdateResult {
  record: UserStreakRecord;
  countedTowardStreak: boolean;
}

export function todayUtcDateString(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(b) - Date.parse(a)) / msPerDay);
}

/**
 * Server-side streak update, applied on every completed round so it can
 * never be spoofed from the client. A day only ever advances the streak
 * once, on its first round; the daily cap just marks which of the day's
 * rounds are "counted" for display, per the no-time-sink product rule.
 */
export function applyRoundToStreak(
  previous: UserStreakRecord,
  today: string = todayUtcDateString(),
): StreakUpdateResult {
  let { currentStreak, longestStreak, lastPlayedDate, roundsPlayedToday } = previous;

  if (lastPlayedDate !== today) {
    const gap = lastPlayedDate ? daysBetween(lastPlayedDate, today) : null;
    const isConsecutiveDay = gap === 1;
    currentStreak = isConsecutiveDay ? currentStreak : 0;
    roundsPlayedToday = 0;
    lastPlayedDate = today;
  }

  const countedTowardStreak = roundsPlayedToday < DAILY_ROUND_CAP;
  roundsPlayedToday += 1;

  if (countedTowardStreak && roundsPlayedToday === 1) {
    currentStreak += 1;
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  return {
    record: {
      userId: previous.userId,
      currentStreak,
      longestStreak,
      lastPlayedDate,
      roundsPlayedToday,
    },
    countedTowardStreak,
  };
}
