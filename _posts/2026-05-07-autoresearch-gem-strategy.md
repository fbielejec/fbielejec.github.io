---
layout: post
title: "Scoring under tension: Karpathy-style autoresearch loop on a GEM stack"
author: Filip Bielejec
comments: true
featured: true
categories: [python, rust, trading, quantitative-finance, GEM, momentum, autoresearch, LLM]
description: "Applying the Karpathy-style autoresearch loop to an HMM + per-regime GEM specialist + meta-allocator trading stack. Headline result from a 215-config / 18-hour run on 437 Binance + DefiLlama tokens, plus a scaled-down Python version over a 4-token bear-portfolio subset."
---

# <a name="intro"/> Introduction

In the [previous post]({{ site.baseurl }}{% post_url 2026-04-24-gem-bear-market-models %}) I compared exponential vs. linear regression GEM models on a hand-curated 4-token bear portfolio.
The main finding from that experiment: the choice of regression model was almost irrelevant; the **fitting window** dominated the returns.

That experiment had two limitations:
- The universe was tiny -- four hand-picked safe-haven tokens.
- The manual parameter sweep -- I picked window sizes, ran the sweep code, verified the results, iterated again.

This post is about replacing the human-in-the-loop with an LLM agent following a written experimental research recipe.
The agent iterates on: pick a hypotheses, edit the allowed parts of the codebase, run the experiment, score the results, keep or revert. Repeat.
Human goes to sleep and wakes up to read the overnight results.

---

*TL;DR*
On the full Binance + DefiLlama universe (437 tokens, 5 years), an LLM-driven autoresearch loop ran 215 configurations across 18 hours, lifted the ensemble score from `-inf` (every config failing under realistic fees) to **1175.2**, and beat a BTC+ETH buy-and-hold baseline by a factor of **142**.

---

Three structural findings emerged: two were genuinely new, one was a confirmation of an earlier 4-token result, but this time at scale.

# <a name="autoresearch"/> The Autoresearch Loop

The pattern is borrowed from Andrej Karpathy's [autoresearch](https://github.com/karpathy/autoresearch) experiment.
The structure is a two-file one:

- A **read-only file** `harness.py` -- data loader, evaluation metric, and any constants the agent is not allowed to touch.
- A **modifiable** `sweep.py` file -- the actual model and the training loop, fair-game for the agent to rewrite.

A `program.md` tells the agent what is the metric (the scoring function computed from the backtest output) to iterate and improve on, which files it can touch and which are off-limits.
Human starts the agent and walks away.

# <a name="score"/> Keeping The Loop Honest

The experiments metric is a single scalar:

$$\text{score} = \text{annualized_return} \cdot \text{drawdown_dampener} \cdot \text{diversification_bonus}$$

where:

- $$\text{drawdown_dampener} = \frac{1}{(1 + \max(0, \text{dd} - 0.15))^{2}}$$ (15% drawdown free zone, then quadratic decay)

and

$$\text{diversification_bonus} = 1 + 0.1 \cdot (1 - \text{HHI})$$ (up to +10% bonus for a non-concentrated portfolio, where HHI is the Herfindahl-Hirschman index of position weights).

The terms are multiplied, which puts them in tension against each other and doesn't allow the agent to game the metric.

If you had only the drawdown dampener, the optimal strategy is to sit in cash forever -- zero drawdown.
If you had only the returns term, the agent can chase any tail-risk strategy that produces a high headline number and accept any drawdown it comes with.
If you had only the diversification bonus, equal-weight buy-and-hold trivially wins.

One more loop rule is a hard rejection (`-inf`) on either one of:

- Annualized return below -50%.
- Stress-test Calmar ratio (1.5× fees) is negative.

The hard-rejection gate adds one more tension: a config can't game the dampener by accepting a moderate base-fee drawdown that collapses into a negative-Calmar disaster the moment slippage gets worse.
Both conditions have to hold: positive expected return at the base 30 bps round-trip, *and* survive a fee-and-slippage shock.

# <a name="repro"/> Reproducibility note

The scaled-down Python version at [trader-research](https://github.com/fbielejec/trader-research) shows the methodology used -- the contract surface, the modifiable interior, the program.md spec the agent operates under -- on a 4-token, bear-specialist-only, 2022-only subset.
It is a small runnable example with the same scoring and loop structure -- perfect to clone and run on a laptop in minutes.
The full Loop 3 run was executed against a Rust implementation over a much larger token universe -- not something you can clone and run on a laptop without the Rust codebase and ~18 hours of compute.

# <a name="phases"/> Phased Sweeping

The full ensemble has three GEM specialists (bull / bear / ranging) gated by a 3-state HMM regime detector, plus a meta-allocator model that blends specialist portfolios when the HMM outcome is uncertain (< 90%).
That is roughly 15 sweepable parameters.

A grid over all 15 is combinatorially prohibitive, which is why the autoresearch loop instead sweeps in phases:

1. **Phase 1 -- HMM hyperparameters** (refit interval, hard-switch threshold, min observations). Specialists held at defaults.
2. **Phase 2 -- per-specialist GemParams** (`top_n`, $R^2$ threshold, rebalance cooldown). One specialist at a time, the other two at the Phase 1 winner.
3. **Verification -- combined grid** with the new defaults locked in, varying one specialist at a time off the new baseline to try and spot interactions.

# <a name="loop3"/> Loop 3: 437 Tokens, 18 Hours, 215 Configs

**Universe:** 431 Binance OHLC tokens (2020-01-01 through 2026-04-18) plus 6 DefiLlama price feeds for tokens not on Binance (AERO, DRIFT, FLUID, GRAIL, HYPE, MNDE) -- 437 tokens total, ~508K daily candles.

**Evaluation window:** 2021-01-01 to 2025-12-31 with a 250-day warmup buffer. Causal walk-forward (No peeking past day `t-1` when deciding for day `t`).

**Baseline:** the existing ensemble defaults under the old fee regime, score `-inf` (every config rejected).

## Phase 0: the unblocking

Before any model parameters were swept, the agent diagnosed why every baseline config was scoring `-inf`.
The old fee model was 0.001 base with a 2× stress multiplier -- which sounds aggressive but actually makes the **base** look unrealistically cheap and the **stress** test punitively expensive (effective 0.002 stress).

The loop changed two numbers:

| Constant | Old | New |
|---|---|---|
| `fee_rate` | 0.001 | 0.003 (10 bps exchange + 20 bps slippage) |
| stress multiplier | 2.0× | 1.5× |

That single calibration fix, a realistic fee with a realistic stress test, unblocked 160+ viable configs.

## Phase 1: HMM hyperparameters

48 configs, sweeping `hmm_refit_interval × hard_switch_threshold × hmm_min_observations`.

| Parameter | Tested | Winner | Old default |
|---|---|---|---|
| `hmm_refit_interval` | 3, 7, 14 | **7** | 7 |
| `hard_switch_threshold` | 0.60, 0.70, 0.80, 0.90 | **0.90** | 0.80 |
| `hmm_min_observations` | 30, 60, 90, 120 | **90** | 90 |

The threshold finding is the interesting one.
At `hard_switch_threshold=0.90` the ensemble almost never hard-switches to a single regime; instead it soft-blends the three specialist portfolios most of the time.
That scored 305.7 vs 244.8 at the previous default of 0.80 -- a 25% lift from doing **less** of what the architecture was designed to do.

The HMM's regime classification is informative but not confident enough for a binary regime decision.
Soft blending hedges against misclassification.
<!-- That's a real architectural finding, not a parameter tweak. -->

## Phase 2: per-specialist GemParams

Three sweeps, 36 configs each, for `top_n × r2_threshold × rebalance_cooldown` per specialist.

**Bull (best 5 of 36):**

| Config | Score |
|---|---|
| `top_n=15 r2=0.2 cd=5` | **156.9** |
| `top_n=10 r2=0.2 cd=5` | 133.8 |
| `top_n=25 r2=0.2 cd=3` | 126.9 |
| `top_n=25 r2=0.2 cd=5` | 124.9 |
| `top_n=20 r2=0.2 cd=5` | 123.0 |

**Bear (best 5 of 36):**

| Config | Score |
|---|---|
| `top_n=1 r2=0.5 cd=10` | **440.6** |
| `top_n=3 r2=0.5 cd=10` | 420.5 |
| `top_n=5 r2=0.5 cd=10` | 419.8 |
| `top_n=8 r2=0.5 cd=10` | 416.7 |
| `top_n=3 r2=0.5 cd=14` | 269.7 |

**Ranging (best 5 of 36):**

| Config | Score |
|---|---|
| `top_n=8 r2=0.3 cd=5` | **1174.5** |
| `top_n=12 r2=0.3 cd=5` | 1023.6 |
| `top_n=15 r2=0.3 cd=5` | 990.0 |
| `top_n=12 r2=0.5 cd=5` | 631.2 |
| `top_n=15 r2=0.5 cd=5` | 625.3 |

## Verification: the combined defaults

With each specialist's winners locked in, the verification grid hit **score 1175.2** on the combined defaults.
<!-- (1829.9% annualized return, HHI 0.319). -->
The buy-and-hold BTC+ETH baseline scored 8.3.
<!-- (12.9% return). -->

That is a 142× improvement over the buy-and-hold.
<!-- by score, almost entirely from the realized returns. -->


# <a name="findings"/> What the Loop Found

Two new findings, plus one confirmation of an earlier result at scale. Ranked by how surprising they were:

**1. Soft blending beats hard switching.**
Increasing `hard_switch_threshold` from 0.80 to 0.90 is *less* of what the ensemble architecture was designed to do, and it scored +25%.
The HMM is a good signal, but not a confident enough signal to act on as a binary classifier.
The right way to use it is as a probability-weighted blend.

**2. All three specialists prefer lower $R^2$ thresholds than the priors said.**
The pre-loop defaults were 0.3 / 0.7 / 0.5 for bull / bear / ranging.
The winners were 0.2 / 0.5 / 0.3.
The $R^2$ filter was rejecting tokens with weak-but-real momentum signals.
Across three independent sweeps the loop found the same direction of correction.

**3. The bear-portfolio `top_n=1` result holds at scale.**
The previous post's 4-token result -- concentrating on the single best opportunity beats diversification in a bear regime -- survived the jump to 437 tokens.
`top_n=1` won the bear sweep cleanly: in bear regimes there is typically exactly one token with a genuine positive momentum signal (usually PAXG or a stablecoin), and diversifying across 3-8 tokens dilutes the safe-haven effect.
This isn't a new discovery, but it's a non-trivial confirmation -- the loop arrived at the same answer independently, on a universe roughly 100× larger.

The first finding -- soft-blend dominance -- is the kind of result that's worth more than any specific parameter value.
It tells you the ensemble's architecture is over-relying on a part of the system (binary regime calls) that the data doesn't support.

# <a name="limits"/> Limitation

This optimization approach has one strong limitation: **One-at-a-time phased sweeping cannot find between-parameter interactions.**.
For example: If the bull and bear specialists models need *jointly* different parameter values in order to reach a high score, this loop will not find that configuration.
This is a structural limitation, one that drives the motivation for the [next-phase ideas]({{ site.baseurl }}{% post_url 2026-05-07-autoresearch-gem-strategy %}#next).

# <a name="next"/> Next Steps

## Lifting the phased-sweep limitation

The current loop is a one-parameter-at-a-time scan.
The search heuristics -- "sweep `top_n` first, then $R^2$ threshold, then sweep again with the new defaults locked in" -- lives in `program.md` as natural language instructions for the agent.

That's a workaround for the high-dimensional parameter space, yet a different ordering, a different grid resolution, a different fallback when a sweep stalls -- any of these could move the metric meaningfully, and currently there is no no way to discover that.

A potential successor is to replace the loop with a **reinforcement-learning** approach, with a state.

## Improving the regime detector

The current HMM uses Gaussian emissions, which is a known poor fit for stocks (or crypto) data  -- the empirical distributions are fat-tailed and asymmetric, with the kind of tail events the loop's hard-rejection gate exists to defend against.
A single 30%-down day can fool a Gaussian-emission HMM into a regime call that doesn't reflect the underlying dynamics.

Finding #1 -- soft blending dominating hard switching -- is consistent with this: the HMM's regime calls aren't confident not because the regimes don't exist, but because the emission model is too simple to assign them confidently.

Replacements worth trying, ranked by implementation cost:

- **Student's $t$ emissions.** Minimal change to the existing HMM, just heavier tails. Cheap to implement, immediate test of whether soft-blend dominance survives a fatter-tailed emission model.
- **Hidden semi-Markov models** with explicit state-duration distributions, capturing the empirical fact that regimes don't switch every day.
- **Mixture-of-Gaussians or GARCH-style emissions** to model volatility clustering inside a regime rather than across them.
- **Neural sequence models** (LSTM / Transformer) that learn regime structure end-to-end without the Markov assumption -- higher capacity, harder to interpret, and the most aggressive departure from the current contract surface.

## More aggresive bear specialist model

The bear specialist currently sits in cash when no token has a positive trend.
With the use of perpetual funds (such as offered by [Kraken](https://www.kraken.com/features/futures) or [dYdX](https://www.dydx.xyz/))
the defensive (long safe-haven) startegy could flip int an offensive one (short weak-momentum tokens).

The same $R^2 \cdot (a_1 - 1)$ momentum signal becomes a short-entry signal when negated, and the inverse-volatility weighting carries over directly.

Currently `top_n=1` picks PAXG; with futures the specialist can profit from crashes instead of just hiding.

The open questions are funding-rate cost vs. the current 30 bps fee budget, sizing under leverage, and whether the Calmar hard-rejection gate still makes sense once shorting is allowed.
