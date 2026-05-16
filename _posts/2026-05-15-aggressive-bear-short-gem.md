---
layout: post
title: "Aggressive bear: GEM shorting in downwards markets"
author: Filip Bielejec
comments: true
featured: true
categories: [python, trading, quantitative-finance, GEM, momentum, regression, bear-market, short-selling]
description: "An aggressive short-mode counterpart to the conservative bear specialist: shorting the weakest tokens by negative momentum on Binance USDⓈ-M perps, 2022 bear market POC"
---

# <a name="intro"/> Introduction

In a previous post we looked at [GEM market bear models]({{ site.baseurl }}{% post_url 2026-04-24-gem-bear-market-models %}), who can show a slight win a market in a adverse conditions.
The bear specialist GEM model won with the market by *mostly not playing*.
It sat in cash for six and a half months of 2022, then entered EURUSDT once a clean uptrend emerged -- with a brief rotation through PAXG (tokenized gold) in late December -- finishing the window at +6.40% while BTC was down roughly 65% from its all-time high.

In this post we research a different, more aggressive strategy.
Instead of a safe haven of tokens, we look at a broader spectrum.
We invert the GEM filters, weight by the magnitude of the negative trend, and short the weakest tokens on Binance USDⓈ-M perps.

---

*TL;DR*
On an 11-token mixed bear-market universe, the best aggressive short-mode GEM config (`lin-n1-w15`) returns **+87.2%** over May–Dec 2022 with a **-27.4%** drawdown, for a **Calmar of 5.64** -- beating the long-only bear specialist's Calmar 4.6.
Yet it loses on Calmar to a naive equal-weight short of the same universe (+57.72% returns, -16.41% max drawdown, Calmar 5.92). The single most meaningful drawdown comes from an ADA short squeeze  - something that a model looking just at the daily candles cannot see coming.
The signal is real and clustered on `fit_window=15` regardless of regression model.

---

# <a name="short-mechanics"/> From defense to offense

The bear specialist was long-only and held a single token at a time.
The aggressive variant inherits the GEM ranking core, with the adjustments below.

**Short mechanics on USDⓈ-M perps.**
A position is $(\text{quantity}, \text{entry\_price})$.
PnL on close is $\text{quantity} \times (\text{entry\_price} - \text{exit\_price})$ -- gains when the price falls.
Funding is paid (or received) every 8 hours; in a bear market with crowded shorts, funding is usually slightly negative for shorts, so the position accrues a small penalty each settlement.
Aggregated to daily, mean funding rates over the window ranged from roughly -5% to -30% annualised across tokens.
<!-- -- a real but secondary contribution. -->

**Sign-flipped filters.**
The GEM core rejects positive $a_1$ candidates and requires $\text{momentum} < -\text{momentum\_floor}$.
The exponential model now wants $a_1 < 1$ (compounding decline); the linear model wants a negative normalised slope.
R-squared and ATR play the same roles as in the bull/bear long specialist models.

**Momentum-magnitude weighting.**
The previous specialists weighted by inverse ATR -- resulting in less exposure to the more volatile assets.
For an aggressive short, we want the opposite: the strongest negative trend deserves the largest allocation.
Weights are $|m_i| / \sum_{j} |m_j|$ over the top $N$ picks.

The rest -- fitting window, R-squared threshold, differential rebalancing, cooldown -- is identical to the bear specialist.

# <a name="setup"/> Experiment Setup

**Window**: Same May 1 – December 31, 2022 window as previously: BTC already down ~50% from ATH, Luna collapsed (May 9), 3AC liquidated (June), FTX collapsed (November). Unambiguously bear market.

**Universe**: 11 Binance USDⓈ-M perpetuals, deliberately mixing fallers and outperformers over the period, such that the selector has a discrimination problem to solve.

| Group | Tokens | End-of-window return |
|---|---|---|
| Extreme fallers | SOL, AVAX, ADA, DOT | -69% to -89% |
| Moderate fallers | BTC, ETH, LINK, MATIC | -31% to -58% |
| Outperformers | BNB, TRX, XMR | -23% to -37% |

The outperformers are the controls: a working momentum selector should not waste capital shorting them when fallers are available.

**Data**: daily klines and 8-hour funding history from Binance.
$10,000 starting capital, 0.3% round-trip fee, 10-day rebalance cooldown.

**Sweep**: 32 configurations.

$$
\text{fit\_window} \in \{15, 30, 60, 90\} \quad\times\quad
\text{top\_n} \in \{1, 3, 5, 8\} \quad\times\quad
\text{model} \in \{\text{exp}, \text{lin}\}
$$

**Verdict structure**: not a single label. Three stages, each PASS / NO-PASS:

- **Stage 1**: best-config Calmar > naive equal-weight short Calmar
- **Stage 2**: best-config Calmar > long-only bear specialist (Calmar 4.6 from the previous post)
- **Stage 3**: robust across configs ($\geq$ 1/3 positive Calmar AND a dominant `fit_window` in the top 6 models)

# <a name="sweep"/> Sweep Results

Top of the 32-config sweep, sorted by Calmar:

| Config | Return | Max DD | Calmar | Sharpe | Rebalances |
|---|---|---|---|---|---|
| **lin-n1-w15** | **+87.2%** | **-27.4%** | **5.64** | 1.39 | 22 |
| exp-n1-w15 | +84.3% | -27.4% | 5.42 | 1.36 | 22 |
| exp-n8-w15 | +62.5% | -24.6% | 4.31 | 1.23 | 22 |
| lin-n8-w15 | +61.8% | -24.6% | 4.26 | 1.22 | 22 |
| exp-n5-w15 | +58.9% | -24.9% | 3.99 | 1.15 | 22 |
| lin-n5-w15 | +57.7% | -24.9% | 3.90 | 1.14 | 22 |
| lin-n3-w30 | +50.4% | -25.6% | 3.27 | 1.01 | 21 |
| lin-n3-w15 | +51.0% | -27.0% | 3.14 | 1.02 | 22 |

Three observations, mirroring the bear-long specialist's findings:

**1. `fit_window=15` dominates the top quartile.**
All top six configs share `w=15`.
Tight windows track the bear's punctuated drawdowns; wider windows (60, 90) catch the intermittent relief rallies and the max drawdown blows out to ~50% (data not included, we refer to the [notebook](https://github.com/fbielejec/fbielejec.github.io/blob/master/notebooks/gem_bear_short.org#10-in-progress-sweep)).
Similar finding as in the [previous post]({{ site.baseurl }}{% post_url 2026-04-24-gem-bear-market-models %}): the bear-long specialist preferred `w=30`.

**2. Concentration outperforms diversification on this universe.**
`top_n=1` produces the highest return (+87%) and Calmar (5.64).
`top_n=8` reduces both return (+62%) and DD (-24.6%), but the Calmar drops to 4.31.
With only 7 real fallers in the universe, diluting into 5 or 8 names forces the selector to short weaker signals alongside the strongest, and that costs more in return than it saves in drawdown.
The token universe is however probably too small to draw any larger conclusions from this fact.
The naive model winning on overall Calmar is due to the risk diversification.

**3. The choice of regression model is, again, irrelevant.**
`lin-n1-w15` and `exp-n1-w15` are within 0.2 Calmar of each other.
Same pattern as the previous post: the fitting window dominates the model family.

# <a name="best"/> What the winner does

The best config holds a single token at a time, rebalances every 10 days when momentum changes hands, and goes to cash when no token clears the entry threshold.

Twenty-two rebalances over 245 days.
The equity story splits into two phases:

| Phase | Days | Equity move |
|---|---|---|
| Capture | 10 → 60 (May 11 – Jun 30) | $10,000 → $17,338  (+73%) |
| Survive | 60 → 242 | $17,338 → $19,291 (+11%) |

Most of the gains happen in the first seven weeks.
The model catches SOL → AVAX → SOL → BNB → ETH in the May–June crash, rides each for 10 days, and exits to cash on June 30 when the momentum-cross trigger fires.
It then sits in cash for sixty days through July and August -- the bear-market relief rally that wiped out anyone holding shorts through the chop -- and re-engages in late August.

The strategy is "catch the trend, then survive the chop."
About 30% of the window is spent in cash.
<!-- Not a malfunction: the design. -->

The most-shorted name was SOL at 17.6% of the window, followed by ETH, ADA, and BNB at ~8% each.

# <a name="ada"/> The short squeeze problem

The single meaningful drawdown comes from an ADA short squeeze.

On October 8 the model shorted ADA which at that time had a clean, 15-day downtrend.
On October 18 the trend was even cleaner; momentum-magnitude weighting kept ADA at 100% of the book.
On October 28 ADA was up roughly 15% from the Oct-18 reentry.
The peak equity at Oct 18 was $18,817; by Oct 28 it was $16,622.
~12% drawdown in ten days, on one position.

<!-- Looking at the ADA chart,  -->
But than what happened is a textbook short squeeze: a token already down 70% from its highs, heavily shorted (funding rates flipped to "shorts pay longs" in the days before), price ricocheting back from $0.30s to $0.40 as overcrowded shorts got liquidated, forcing even more buying.

<img src="{{ site.baseurl }}/images/2026-05-15-aggressive-bear-short-gem/ada_squeeze.png" alt="ADAUSDT daily candles around the Oct 2022 short squeeze, with the model's entry, re-entry and forced-exit dates annotated" style="width: 100%;" />

**Daily OHLCV cannot anticipate this.**
The price trend was clean and negative -- exactly what the model is built to detect.
The information that would have flagged the risk -- funding rate inversion, open interest divergence, liquidation cluster proximity -- is not in the kline feed.

This is the meta-finding the post is about: the model's risk is mostly squeeze risk, and the information lives outside just the price data.

# <a name="baselines"/> Baselines and the Stage Report

The two reference strategies on the same universe:

| Strategy | Return | Max DD | Calmar | Sharpe |
|---|---|---|---|---|
| Buy & Hold (11-token equal weight) | -54.5% | -58.1% | -1.19 | -0.85 |
| Naive equal-weight short, no rebalance | +57.7% | -16.4% | **5.92** | 1.48 |
| **GEM short, lin-n1-w15** | **+87.2%** | **-27.4%** | **5.64** | **1.39** |
| Long-only bear specialist (previous post) | n/a | n/a | **4.60** | 1.59 |

<img src="{{ site.baseurl }}/images/2026-05-15-aggressive-bear-short-gem/equity_curves.png" alt="Equity curves of all 32 sweep configurations (grey) overlaid with Buy & Hold, Naive equal-weight short, and the best Calmar GEM short config" style="width: 100%;" />

Stage Report:

| Stage | Criterion | Result |
|---|---|---|
| **Stage 1** | best Calmar > naive Calmar | **NO-PASS** (5.64 vs 5.92, Δ -0.28) |
| **Stage 2** | best Calmar > long-only bear (4.6) | **PASS** (Δ +1.04) |
| **Stage 3a** | ≥ 1/3 configs positive Calmar | **PASS** (32/32) |
| **Stage 3b** | dominant `fit_window` in top 6 | **PASS** (w15, 6/6) |

The Stage 1 NO-PASS deserves comment, because it would be easy to read it as "the model adds nothing over a dumb baseline."
That is not what is happening.
The naive equal-weight short holds 11 tokens equally, all the way through. Its max drawdown is structurally smaller than any 1-asset short can match -- diversification across 11 names floors the DD at -16.4%.
The GEM short with `top_n=1` is, by construction, exposed to one-token-event risk (exactly what ADA delivered).
The naive short earns less return (+57.7% vs +87.2%) but loses less on its worst day, and Calmar rewards that.

So the GEM short *generates more return* than naive ranking would suggest is possible.
What it cannot do at `top_n=1` is match a 11-asset portfolio's drawdown floor.
This is a portfolio-construction limit, not a signal failure.

Stage 2 confirms the signal is real: the model clears the long-only bear specialist by a full point of Calmar, despite carrying its only meaningful drawdown event.
Stage 3 confirms the signal is clustered, not a single-config artifact: all top 6 configs share the same fit window, and 32 of 32 configurations produce positive Calmar.

# <a name="verdict"/> Verdict: real but marginal

The headline number is good but the universe is too small to know if the strategy generalises.

At `top_n=1` the model is a "find the biggest faller" oracle and concentration risk is the cost of concentration return.
At `top_n=5` and `top_n=8` it dilutes into weaker signals -- but only because there are only seven real fallers in the universe to begin with.
A 25–35 token universe with the same `top_n=5` or `top_n=8` would let diversification do its work without forcing the selector to short noise.

The Stage 1 gap vs naive likely persists on a wider universe, because the structural diversification floor remains.
But two things should change:

- Naive's edge should shrink: 30 tokens diversifies better than 11, but its absolute return depends on average universe drawdown, not number of names.
- The GEM short at `top_n=5` or higher should retain return *and* shrink DD, possibly enough to flip Stage 1.

This is what the next experiment needs to test.

# <a name="squeeze-defenses"/> Defending against squeezes

Daily OHLCV cannot see ADA-style snap-backs coming.
The model needs information from outside the kline feed.
Ranked by signal-per-unit-of-effort:

**1. Per-token concentration cap + trailing stop.**
Cap any single short at 8–10% of NAV. Apply a 15–20% trailing stop from the entry-adjusted peak P&L.
Pure portfolio logic, no new data pipeline. Would have capped the ADA hit at roughly half its actual cost.
Cheapest defense that materially changes the worst-case.

**2. Funding rate signal.**
Binance, Bybit, OKX all publish funding-rate history via free REST endpoints (we are already using Binance's for the per-position cost accrual).
Rule: if 8-hour funding crosses above +0.05% (annualised ~55%) for three consecutive prints on a name we are short, halve the position. If it crosses +0.1%, exit.
A crowded-short detector. One afternoon of pipeline work.

**3. Open interest deltas.**
The same exchange APIs publish OI.
The discriminating signal is OI rising while price drifts sideways or down -- building shorts.
Combine with funding into a composite "crowded short" score: $z(\text{funding}) + z(\Delta\text{OI} / \Delta\text{price})$.
Together these cover most of what a paid liquidation-heatmap subscription would tell you.

**4. Intraday volume-spike + reversal exit.**
Breaks the daily-close discipline but worth it as a same-day stop: if a shorted name prints >3σ volume on a green candle that reclaims the prior day's high, exit at next bar.
Requires 1h or 15m kline ingestion.

Paid liquidation heatmaps (CoinGlass, Hyblock) approximate the same signal as 2+3 at higher cost and rate-limit pain.
Skip them unless 2–4 underperform expectations.

# <a name="composition"/> Composition with the bear-long specialist

This experiment produces a third specialist alongside the bull and bear-long that already exist.
The orchestration question: how do these compose when the regime detector reports probabilities over `{bull, bear, chop}`?

**Two specialists, not one combined model.**
A single regression could in principle rank by $|\text{momentum}|$ and use the sign to pick direction.
That collapses three things worth keeping separate: asymmetric risk parameters (shorts want tighter stops, smaller per-position caps, squeeze filters that do not apply long-side), independent fitting windows (the bear-long specialist prefers `w=30`, the aggressive short prefers `w=15`), and debuggability -- when the combined book bleeds, the source side is not recoverable from a single PnL line.
The shared GEM regression core can be a library; the specialists differ only in selection, sizing, and risk overlays.

**Three specialists, regime-weighted gross exposure.**
Let $G_{\max}$ be target gross (e.g. 1.0 of NAV). Given HMM-output probabilities $P_{\text{bull}}, P_{\text{bear}}, P_{\text{chop}}$:

$$
\begin{aligned}
w_{\text{bull}}        &= P_{\text{bull}} \\
w_{\text{bear-long}}   &= P_{\text{bear}} \cdot (1 - \alpha) \\
w_{\text{bear-short}}  &= P_{\text{bear}} \cdot \alpha \\
\text{gross}_{\text{long}}  &= G_{\max} \cdot (w_{\text{bull}} + w_{\text{bear-long}}) \\
\text{gross}_{\text{short}} &= G_{\max} \cdot w_{\text{bear-short}}
\end{aligned}
$$

$\alpha \in [0.4, 0.6]$ controls bear-mode aggressiveness -- start at $0.5$ and tune on Calmar.
The bear allocation splits between the conservative long-only specialist (capital preservation) and the aggressive short (offensive return), proportional to confidence in the bear regime.

The alternative -- blend long/short direction first via $P_{\text{bull}} - P_{\text{bear}}$ and then run a single direction-aware specialist -- throws away the bear-long specialist's stablecoin-allocation logic, which is exactly the capital-preservation property that earned the bear specialist its Calmar 4.6 in the first place.

**$P(\text{chop}) \rightarrow$ cash.**
Momentum ranking degrades in both directions during chop.
Forcing trades there is where Calmar dies.
Default: hold $P_{\text{chop}} \cdot \text{NAV}$ in USDT. Whipsaw squeezes -- the regime where ADA-style events are most likely -- live in chop, so the short specialist must not run there.

# <a name="next"/> Next Steps

The headline result is real but the universe is the binding constraint.

1. **Wider universe**: 25–35 Binance USDⓈ-M majors that existed in May 2022, filtered by listing date.
   This is the experiment that decides whether the GEM short is a concentration oracle or a portfolio strategy.
   Re-derive the long-only bear Calmar on the new universe before comparing Stage 2 -- the 4.6 number is universe-specific.

2. **Squeeze defenses**: add the funding+OI composite score and a 15% trailing stop.
   Rerun the same sweep with the defenses on. If the ADA-shaped drawdown shrinks meaningfully without killing return, the defenses earn their place.

3. **Regime-weighted composition**: connect the three specialists (bull, bear-long, bear-short) to the HMM regime probabilities using the three-specialist blend above.
   Tune `α` on the bear specialist's own historical regime exposure.

Capital preservation as a strategy works -- the previous post showed that.
Aggressive shorting works too, with caveats -- this post showed that.
The interesting result is what happens when the regime detector decides how much of each to deploy, and that is what the next experiment in the series is for.
