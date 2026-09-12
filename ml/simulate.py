"""
Synthetic session-data generator for Ripple's adaptive difficulty engine.

Bootstraps training data by simulating many virtual players (varying skill
and consistency) through many rounds, rather than requiring real human
play up front. Reaction-time and error-rate ranges are loosely grounded in
published Go/No-Go task findings (e.g. mean Go-trial RT ~585ms +/- ~97ms,
within-subject RT SD ~160-180ms in healthy adults), scaled for Ripple's
slower, more deliberate pacing rather than a rapid-fire lab CPT — these are
realistic ballparks, not a literal reproduction of any single study.

Mirrors the constants in src/lib/game/difficulty.ts, engine.ts, and
scoring.ts so the synthetic data reflects the actual game mechanics.
"""

import numpy as np
import pandas as pd

RNG = np.random.default_rng(42)

ROUND_DURATION_MS = 75_000
TARGET_SPAWN_PROBABILITY = 0.32
N_SWITCHES_PER_ROUND = 2

SPAWN_INTERVAL_MS = (1400, 650)  # (t=0, t=1)


def lerp(a, b, t):
    return a + (b - a) * np.clip(t, 0, 1)


def simulate_player():
    """One virtual player's stable traits."""
    skill = RNG.beta(2, 2)  # 0..1, centered around 0.5, covers the range
    base_reaction_ms = RNG.normal(360, 70)
    base_reaction_ms = float(np.clip(base_reaction_ms, 200, 650))
    attention_noise = float(np.clip(RNG.normal(110, 40) * (1.4 - skill), 40, 320))
    impulsivity = float(np.clip(RNG.normal(0.05, 0.03), 0.0, 0.2))
    return {
        "skill": skill,
        "baseReactionMs": base_reaction_ms,
        "attentionNoise": attention_noise,
        "impulsivity": impulsivity,
    }


def simulate_round(player, t0):
    """One round for a player, starting the difficulty ramp at t0 (0..1)."""
    t_avg = (t0 + 1) / 2
    spawn_interval_avg = lerp(*SPAWN_INTERVAL_MS, t_avg)
    n_pulses = max(8, int(ROUND_DURATION_MS / spawn_interval_avg))
    n_targets = max(1, int(round(n_pulses * TARGET_SPAWN_PROBABILITY)))
    n_decoys = max(1, n_pulses - n_targets)

    skill = player["skill"]
    difficulty_penalty = t_avg * (1 - skill) * 0.6

    hit_prob = np.clip(skill * (1 - difficulty_penalty) + 0.15, 0.05, 0.99)
    hits = RNG.binomial(n_targets, hit_prob)
    misses = n_targets - hits

    reaction_times = RNG.normal(
        player["baseReactionMs"] * (1 + 0.3 * t_avg),
        player["attentionNoise"],
        size=max(hits, 1),
    )
    reaction_times = np.clip(reaction_times, 150, 1400)[:hits] if hits > 0 else np.array([])

    false_tap_prob = np.clip(t_avg * (1 - skill) * 0.5 + player["impulsivity"], 0.0, 0.9)
    false_taps = RNG.binomial(n_decoys, false_tap_prob)

    switch_correct_prob = np.clip(skill - t_avg * 0.3 + RNG.normal(0, 0.05), 0.05, 0.99)
    switch_correct = RNG.binomial(N_SWITCHES_PER_ROUND, switch_correct_prob)

    reaction_mean = float(np.mean(reaction_times)) if len(reaction_times) else 700.0
    reaction_std = float(np.std(reaction_times)) if len(reaction_times) > 1 else 150.0
    false_tap_rate = false_taps / n_decoys
    miss_rate = misses / n_targets
    switch_accuracy = switch_correct / N_SWITCHES_PER_ROUND

    go_accuracy = hits / n_targets
    inhibition_accuracy = 1 - false_tap_rate
    speed_score = np.clip(1 - (reaction_mean - 250) / (1200 - 250), 0, 1)
    consistency_score = np.clip(1 - reaction_std / 600, 0, 1)
    focus_score = round(
        100
        * (
            0.35 * go_accuracy
            + 0.35 * inhibition_accuracy
            + 0.2 * speed_score
            + 0.1 * consistency_score
        )
    )

    # Oracle rule for "ideal" next-round difficulty: nudge up when the
    # player is clearly doing well, down when clearly struggling, otherwise
    # drift only slightly. This is the bootstrap label Model B learns from
    # until real telemetry can replace it.
    if focus_score > 75:
        next_t0 = np.clip(t0 + 0.15 + RNG.normal(0, 0.02), 0, 1)
    elif focus_score < 45:
        next_t0 = np.clip(t0 - 0.15 + RNG.normal(0, 0.02), 0, 1)
    else:
        next_t0 = np.clip(t0 + RNG.normal(0, 0.04), 0, 1)

    return {
        "startProgress": t0,
        "reactionTimeMeanMs": reaction_mean,
        "reactionTimeStdMs": reaction_std,
        "falseTapRate": false_tap_rate,
        "missRate": miss_rate,
        "targetSwitchAccuracy": switch_accuracy,
        "focusScore": focus_score,
        "nextStartProgress": float(next_t0),
    }


def generate(n_players=400, rounds_per_player=8):
    rows = []
    for _ in range(n_players):
        player = simulate_player()
        for _ in range(rounds_per_player):
            t0 = RNG.uniform(0, 1)  # sample across the input space, not just chains
            rows.append(simulate_round(player, t0))
    return pd.DataFrame(rows)


if __name__ == "__main__":
    df = generate()
    df.to_csv("data/synthetic_sessions.csv", index=False)
    print(f"Wrote {len(df)} synthetic session rows to data/synthetic_sessions.csv")
    print(df.describe())
