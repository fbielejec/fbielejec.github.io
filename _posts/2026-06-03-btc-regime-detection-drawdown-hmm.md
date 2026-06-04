---
layout: post
title: "Bitcoin regime detection with HMMs"
author: Filip Bielejec
comments: true
featured: true
categories: [python, bitcoin, quantitative-finance, hmm, regime-detection, time-series, statistics]
description: "A 3-state Gaussian Hidden Markov Model identifies bear / ranging / bull regimes in BTC from a single causal feature -- drawdown from the running all-time high -- with median bear-posterior of 1.00 across calendar 2022 and exactly one Viterbi flip. Why drawdown beats log-return and log-price as the HMM observation."
---

# <a name="intro"/> Introduction

Perhaps a truism but markets behave differently in different regimes: a momentum strategy that prints in 2021 stops working in mid-2022.
<!-- A short basis trade that's safe through a chop blows up at the first 30% week. -->
If you want a principled label for "what kind of market is this, right now" evaluated systematically then the obvious tool is a [Hidden Markov Model](https://en.wikipedia.org/wiki/Hidden_Markov_model).
<!-- The hard part isn't the HMM. -->
<!-- EM for HMMs has been textbook since [Rabiner (1989)](https://www.cs.ubc.ca/~murphyk/Bayes/rabiner.pdf), and  -->
Textbook since Hamilton applied Markov-switching to the US GNP ([Hamilton, 1989](https://www.jstor.org/stable/1912559)).
The hard part is *what data to feed it*.

In this post I argue that for cycle-aware crypto regime detection on daily BTC candles, the right observation is **drawdown from the running all-time high**:

$$d_t = \log(p_t) - \max_{s \leq t} \log(p_s)$$

It's strictly causal, bounded above by zero, mean-reverts to zero on new highs, and -- importantly -- it encodes *where in the cycle you are* without breaking the stationarity assumption.
We fit a vanilla 3-state Gaussian HMM to this single number and the latent states line up with what a trader would call a bear, a chop, and a bull, with no hand-labelling and no look-ahead.

The model lives at [/regimes/]({{ site.baseurl }}/regimes/) as a live dashboard, updated daily.

---

*TL;DR*
On BTCUSDT daily, 2021-06 → 2023-06, a 3-state Gaussian HMM on **drawdown from rolling max** produces a median bear-state posterior of **1.00** over all of calendar 2022 and exactly **one Viterbi flip** that year.
The bull leg (2021-06 → 2021-10) classifies 100% bull; calendar 2022 is 55% bear / 45% ranging / 0% bull; the 2023-H1 recovery is 59% ranging / 41% bear / 0% bull.
Every window matches historical consensus labels.
Student's-t emissions collapse to Gaussian at this feature scale ($\nu$ saturates at the upper bound), so the shipped model is the simpler one.

---

# <a name="lit"/> A short tour of HMM regime models

HMMs in finance have a fairly settled toolkit.
EM for HMMs has been used since [Rabiner (1989)](https://www.cs.ubc.ca/~murphyk/Bayes/rabiner.pdf), and the interesting axis of variation are *the observation* and *the transition structure*, not the inference machinery itself.

[**Hamilton (1989)**](https://www.jstor.org/stable/1912559) introduced the Markov-switching autoregression for U.S. GNP growth: a $K=2$ model where the observation is the growth rate and the latent states are labelled "expansion" and "recession".
The subsequent literature varies different observations, different K, sometimes time non-homogenous transitions.

For crypto specifically, four papers map the space:

- **[Koki, Leonardos, Piliouras (2020)](https://arxiv.org/abs/2011.03741)** fit a Bayesian $K=4$ NH-HMM to the daily percentage log-returns of BTC / ETH / XRP (2014--2019), with Pólya-Gamma augmentation on the multinomial-logit transition probabilities.
  They report **VIX as the dominant transition predictor** (posterior inclusion probability 1.00 across all three coins), and that $K=4$ beats $K \in \{2, 3, 5\}$ on out-of-sample CRPS.
  The structural finding is the interesting part: the bull regime splits into **two sub-states that share an almost identical mean and differ only in volatility** -- a "bull-high-vol" and a "bull-low-vol" -- plus a low-occupancy "calm" auxiliary state.
  With $K=3$ on log-returns you cannot distinguish bull-vol from bull-quiet; EM either collapses them into one over-flipping bull or lets a heavy-tail emission absorb both via a uniformly fat tail.
- **Shih, Huang, Hsu (2024)** apply MS-AR(q) to **weekly** BTC (2018--2022) with $K=2$ and Gaussian shocks. VIX and the USD index enter the **mean equation** (not the transitions matrix). The high-$\sigma$ "bear" state has $\sigma \approx 0.053$ vs $\sigma \approx 0.007$ for the bull -- a $7.5\times$ ratio -- and weekly aggregation does most of the work that a heavier emission family would have to do at the daily scale.
- **Pakštaitė et al. (2025)** do full Bayesian MCMC on daily BTC with a $K=2$ NH-HMM, but the observation is **log-transformed scaled price** (a price level, not a return). They use a Pólya-Gamma logistic transition with MCMC covariate selection over 16 macro / on-chain predictors, fit on a 100-day rolling window chosen explicitly to match a typical regime duration of 30--60 days.
- **Malekinezhad & Rafati (2026)** push to **4-hour** BTC (2024--2026) with a **multivariate observation vector** $(r_t, \sigma_t^{\mathrm{RV}}, v_t)$ -- log-return, rolling realised volatility, normalised volume -- and $K=3$ NH-HMM with locally-varying transitions.

Two patterns stand out:

1. The **default observation is log-return** (or a growth rate, going back to Hamilton on US GNP) -- stationary, well-studied, and what most off-the-shelf finance HMM pipelines feed in. A smaller strand of the literature instead models a *level* -- log-price, optionally scaled or detrended ([Pakštaitė et al., 2025](#refs)).
<!-- to dodge the secular drift problem ([Pakštaitė et al., 2025](#refs)). -->
2. The interesting extensions go in **two orthogonal directions**: enrich the observation (Pakštaitė: log-price level; Malekinezhad: multivariate channels), or enrich the transitions (Koki: covariate-driven NH-HMM, VIX dominant).

The standard observation has a known structural problem on crypto: it conflates "going down" with "high volatility", and $K=3$ isn't enough to encode the bull-vol vs bull-quiet split.
The natural responses are Koki's $K=4$ (more states) or Malekinezhad's multivariate emission (more channels per state).

In this post we take another approach: keep $K=3$ (for operational reasons), keep the homogeneous transition matrix, keep univariate Gaussian emissions -- and change the *observation* to something that carries cumulative cycle information without secular drift.

# <a name="stationarity"/> The stationarity problem

<!-- The HMM's emission model assumes that, conditional on the hidden state, observations are drawn _iid_ from the state's emission distribution. -->
<!-- That distribution is fixed once fit. -->
<!-- If the underlying observable drifts secularly, the fitted emission parameters drift with it and "regime" devolves into "early window vs late window". -->
<!-- This is a known and reasonable concern; it's why almost every finance HMM in the literature feeds the model log-returns rather than log-prices. -->

The log-return as the observation, although established in the literature, has its own failure mode: namely **a return is local.**
What we mean by that is that a single -3% day in a bull market and a single -3% day in a bear market are indistinguishable to the emission.

Discrimination has to come from *volatility* -- bear regimes are detected because their conditional return variance is higher.
This works (it's why the literature settled here) but it conflates "the market is going down" with "the market is volatile", which is only sometimes the same thing.
A long, slow grind down at low volatility -- which is what late 2022 looked like once the FTX shock cleared -- doesn't separate well from a sideways chop on log-returns.

Concretely: In an early experimen fitting a 3-state Student's-t HMM to BTC daily log-returns over 2021-06 → 2023-06 placed 100% of 2022 into a single "ranging" state, with $\hat\nu$ collapsing to the lower bound of $3$ in *every* state.
The model was correctly reporting that daily 2022 returns look like a fat-tailed walk near zero -- statistically indistinguishable from any other post-2021 window.
<!-- The feature is the problem, not the model. -->

The diagnosis pointed to two structural fixes:

1. **More states** -- Koki's $K=4$, which gives EM somewhere to send the calm days and lets the bull split into vol vs quiet.
2. **A more informative observation** -- something the latent state can anchor to cumulatively, not just per-day.

Pakštaitė et al. reached for the 2-nd and used the level: scaled log-price.
Their approach validates a broader claim that "regime structure lives at the cumulative-price level, not at the per-day return level".

But log-price is non-stationary -- BTC's log-price has a positive secular drift *and* a multi-year cycle on top of it.
An HMM fit on raw log-price tends to detect "year 1 vs year 2 vs year 3" as the latent state; "bear" becomes "early in the window".

So the candidate observations split:

| Observation | Stationary? | Cycle-aware? |
|---|:---:|:---:|
| log-return $r_t = \log(p_t) - \log(p_{t-1})$ | yes | no -- local only |
| log-price $\log(p_t)$ | no | yes -- but trend-dominated |
| drawdown $d_t = \log(p_t) - \max_{s \leq t} \log(p_s)$ | bounded, mean-reverting | yes |

Log-return is stationary but cycle-blind. Log-price is cycle-aware but breaks the HMM's stationarity assumption.

Using drawdownp threads both: it's bounded above by zero, it reverts to zero whenever a new running ATH is made, and it sits deeply negative throughout sustained drawdowns.
It carries cycle information *without* secular drift.

It's not strictly stationary in the textbook sense -- consecutive $d_t$ values are serially correlated through the running max, which only ever moves up -- but it satisfies the property the HMM actually cares about: the marginal distribution of $d_t$ in a long bear looks the same regardless of which bear.

# <a name="fit"/> The fit

The recipe:

1. Compute $d_t = \log(p_t) - \mathrm{cummax}(\log(p_t))$ on BTCUSDT daily closes.
2. Fit a $K$-state HMM with Gaussian (and, separately, Student's-t) emissions via Baum-Welch.
3. K-means warm start, 5 random restarts, keep the best log-likelihood.
4. Decode with Viterbi for the hard label; keep the forward-backward posterior for the soft one.
5. Sort states by ascending $\hat\mu$ and name them bear $\to$ ranging $\to$ bull ($K=3$) or bear $\to$ bull ($K=2$).

<!-- Self-contained NumPy implementation, no external HMM dependency. -->
Window: 2021-06-01 → 2023-06-30 (covers the 2021 bull leg, the 2022 bear, and the early 2023 recovery -- three regimes you'd want a regime detector to definitely find).

We fit four models: Gaussian and Student's-t at $K \in \{2, 3\}$.
The pass criterion was stated upfront, before looking at any fit:

- Median bear-state posterior over calendar 2022 $\geq 0.6$.
- Viterbi flip count over calendar 2022 $\leq 6$.
- For Student-t vs Gaussian: median-bear-posterior gap $\geq 0.15$ *or* flip-count reduction $\geq 30\%$.

# <a name="results"/> Does it match what a trader would label?

All four models pass criteria 1 and 2 trivially.
The $K=3$ Gaussian fit is the cleanest.

**Fitted emission parameters** ($K=3$ Gaussian, 2021-06 → 2023-06):

| Regime  | $\hat\mu$ | $\hat\sigma$ | Interpretation |
|---------|---------:|------------:|----------------|
| bear    | −1.21    | 0.12        | ~70% off running ATH, tight cluster |
| ranging | −0.69    | 0.20        | ~50% off ATH, wider -- local rallies / declines |
| bull    | −0.13    | 0.11        | ~12% off ATH, tight -- at or near running highs |

The means form a near-evenly-spaced grid on the drawdown axis with comparable $\sigma$ across states.
EM doesn't have to fight a single dominant distribution for variance share -- which is what you see in $K=3$ fits on log-return, where the "high-vol" state usually swallows all the interesting structure.

**Calendar-2022 metrics** (the pass-criterion window):

| Metric | Gaussian $K=2$ | Student-t $K=2$ | Gaussian $K=3$ | Student-t $K=3$ |
|---|---:|---:|---:|---:|
| Median bear-state posterior | 1.00 | 1.00 | 1.00 | 1.00 |
| Viterbi flips in 2022 | 1 | 1 | 1 | 1 |
| Fraction of 2022 in bear | 65% | 65% | 55% | 55% |
| Fraction of 2022 in ranging ($K=3$) | -- | -- | 45% | 45% |
| Fraction of 2022 in bull | 35% | 35% | 0% | 0% |

Median bear posterior of 1.00 means: on the typical day in 2022, the model is essentially certain we're in the bear state.
One Viterbi flip across the entire year means it doesn't oscillate.
The $K=2$ versions absorb the recovery rallies into "bull" because there's nowhere else to put them; $K=3$ correctly classifies the rallies as ranging and reserves "bull" for actual proximity to ATH.

**Per-window Viterbi composition** ($K=3$ Gaussian):

| Window | bear | ranging | bull |
|---|---:|---:|---:|
| 2021-06 → 2021-10 (bull leg) | 0% | 0% | 100% |
| 2021-11 → 2022-12 (full bear) | 47% | 39% | 13% |
| 2022 (calendar year) | 55% | 45% | 0% |
| 2023-01 → 2023-06 (recovery) | 41% | 59% | 0% |

Three windows, three textbook labels, and the model -- which never sees those labels -- reconstructs each one:

- The 2021 bull leg is **100% bull**. Price is making new ATHs continuously; $d_t$ around zero.
- The 2022 calendar year is **100% non-bull** (55% bear, 45% ranging), with the ranging mass concentrated in the late-summer recovery rally before the FTX collapse pulled it back to bear.
- The 2023 recovery is **59% ranging, 41% bear, 0% bull**. The bear mass is January-February (still near the cycle bottom); the ranging mass is March onward (rising off the low but still ~60% below the cycle ATH).

A level-anchored feature would get the 2023 recovery wrong: full-window z-scored log-price would label rising-but-below-mean days as "bear", because "bull" for that observation just means "above the window mean".
Drawdown puts the threshold where a trader puts it -- at the running ATH.

One unexpected result: **Student-t collapses to Gaussian.**
The fitted $\hat\nu$ saturates at the upper search bound ($30$) in every state, in every $K$.
At this feature scale -- $\sigma \approx 0.1$--$0.2$ log-units, observations bounded above by zero -- there are no outliers far enough from any state's $\mu$ to warrant heavy tails.
<!-- Gaussian is sufficient and Student-t buys nothing. -->
<!-- We ship the simpler one. -->

# <a name="caveats"/> What the model still misses

1. **The Gaussian violates the hard upper bound $d_t \leq 0$.**
   For the bull state ($\hat\mu = -0.13$, $\hat\sigma = 0.11$), the fitted Gaussian assigns ~12% probability mass above zero, where the true density is exactly zero.
   No observations actually fall above zero, so the likelihood is unaffected -- but a window dominated by frequent new ATHs would push the model to inflate the bull-state $\sigma$ to absorb mass piled at the boundary.
   A principled fix is a truncated Gaussian or a Beta on $-d_t$.
   <!-- Not necessary at this window. -->

2. **Serial correlation through the running max.**
   $\mathrm{cummax}$ is monotone non-decreasing, so consecutive $d_t$ values are correlated through the max.
   This violates the HMM's conditional-independence assumption.
   It's the standard approximation in regime-detection on cumulative features (every implementation of MaxDD-based regime detection makes the same compromise) so we are not too worried here, but what it means is that the log-likelihood should be read as a relative goodness-of-fit signal rather than a calibrated probability.

3. **Slow exits from bear.**
   The bear state ends when $d_t$ climbs back toward zero -- which requires the price to approach the running ATH from below.
   A multi-year recovery that ends in a *new* ATH gets correctly classified as ranging → bull.
   A V-shaped recovery that *doesn't* re-make the ATH stays in ranging indefinitely, which is technically correct but conservative.

4. **Pure depth signal.**
   No volume, no funding, no on-chain signals.
   The model is making strong calls from one number, which is the appeal -- but it also means it has no view on, e.g., the difference between a low-volume drift down and a high-volume capitulation flush.

# <a name="dashboard"/> The live dashboard

The same recipe, re-fit over the full 2017-08 → today window, drives the public dashboard at [/regimes/]({{ site.baseurl }}/regimes/).
<!-- It renders from a single `feed.json` produced by the notebook -- the page is model-agnostic, so swapping in a different K or a different observation is a feed regeneration, not a frontend change. -->

<!-- On the longer window the fitted parameters shift a little (the bear state's $\mu$ becomes less deep at $-1.09$ because the 2017-18 cycle bottom was less severe than 2022; its $\sigma$ widens to $0.25$ because the bear state now spans two different bears with somewhat different depths) but the structural conclusion is the same: three near-evenly-spaced states, $\approx 0.99$ diagonals in the transition matrix, and Viterbi-decoded regime spans that line up with the named episodes. -->

The dashboard surfaces:

- Today's posterior $P(\mathrm{bear})$, $P(\mathrm{ranging})$, $P(\mathrm{bull})$ as bars.
- The one-step-ahead distribution $\pi_t \cdot A$.
- The full posterior tape over price history.
- Zoomed-in panels for four named episodes (2018 bear, COVID Q1 2020, 2020-21 bull, 2022 bear) with brief context on each.
- The fitted emission parameters and transition matrix.

It's not a trading signal -- it's a regime tape, to build trading signals on top of.

# <a name="next"/> What's next

The lit-review-aligned roadmap is the **trinity emission + VIX-in-transitions** assembled model, built in stages.
The governing principle is a clean split:

> Emission channels are things the regime *produces*. Transition covariates are things the regime *responds to*.

Daily returns, realised volatility, and drawdown are all *produced* by the underlying regime -- they belong in the emission.
VIX, the USD index, and Treasury yields are macro stress signals that *drive* regime crossings -- they belong in the transition.
Paper 1 puts VIX in the mean equation; paper 3 puts it in transitions and gets a posterior inclusion probability of 1.00 across three coins.
<!-- The principle reconciles them: VIX is a driver of regime change, not a manifestation. -->

Ranked by expected information gain per effort:

1. **$K=4$ on drawdown alone.**
   Koki et al. report BTC daily-return regime structure resolves to four states. On drawdown, $K=4$ might split the bear into "deep capitulation" vs "approaching ATH from below", or split the ranging. Cheapest sanity check.

2. **Bivariate $(d_t, r_t)$ then trivariate $(d_t, r_t, \sigma_t^{\mathrm{RV}})$.**
   Brings the per-day signal back as a second channel and the realised-volatility signal as a third. The state binds to "where in the cycle" (drawdown), "what happened today" (return), and "how violently" (realised $\sigma$). This is the lit-review's recommended setup. Realised volatility can be upgraded from a noisy 5-day return-std estimator to intra-day-aggregated realised variance (Andersen-Bollerslev-Diebold-Labys (2001)) at the cost of one Binance klines call, with no change to the HMM frequency.

3. **NH-HMM with VIX in transitions.**
   The literature-aligned top of the stack (papers 2, 3, 4 all agree). Softmax-parameterised transition matrix $\log A_{ij}(t) = \mathrm{softmax}_j(\beta_{ij} \cdot x_t)$ with $x_t = (1, \mathrm{VIX}_t)$. M-step is a per-iteration logistic regression.

4. **Fixed-lookback rolling max for $d_t$.**
   The current fit uses an expanding `cummax` over the full window, so $d_t$ never forgets the 2021 ATH and the bear state implicitly anchors to a specific historical peak. Swap to a true rolling max with lookback $L$ (e.g. $L = 200$ days, matched to the bear-regime duration we're trying to detect): bounded memory, strictly stationary, and the model stops binding state identity to "how far we are from *the* ATH" and starts binding it to "how far we are from the recent ATH". Cheap to implement; the trade-off is shorter $L$ is more responsive but loses the deep multi-quarter bear signal, longer $L$ preserves it but slows edge response. $L$ is a natural candidate for a parameter sweep -- e.g. $L \in \{60, 100, 200, 365, \infty\}$ scored by the existing pass criteria (median bear-posterior in 2022, Viterbi flip count) -- which would replace the current judgement call with a principled out-of-sample choice.

<!-- (1) is next -- it's the smallest change from the current passing recipe and directly tests Koki et al.'s $K=4$ claim on the drawdown observation rather than the standard log-return one. -->

# <a name="glossary"/> Glossary

- **VIX** -- CBOE Volatility Index. The implied 30-day volatility of S&P 500 options, in annualised percentage points. Widely used as a "fear gauge"; spikes during equity stress (2008, March 2020) and tends to lead or coincide with risk-off regimes across asset classes, including crypto.
- **HMM (Hidden Markov Model)** -- A model where observations $y_t$ are drawn from a state-dependent distribution conditional on a latent discrete state $z_t \in \{1, \ldots, K\}$ that evolves as a first-order Markov chain. The states are not observed directly; they are inferred from the observations.
<!-- - **K** -- Number of hidden states in the HMM. Hyperparameter; pick by out-of-sample score or by domain reasoning (bear / ranging / bull $\to K=3$). -->
- **Emission distribution** -- The conditional distribution $p(y_t \mid z_t = k)$. In this post each state's emission is a Gaussian (or Student's-t) over the drawdown observation.
- **Transition matrix $A$** -- The $K \times K$ matrix with $A_{ij} = P(z_{t+1} = j \mid z_t = i)$. Diagonal-heavy in regime models -- once you're in a bear, you tend to stay in a bear.
<!-- - **Baum-Welch / EM** -- The Expectation-Maximisation algorithm specialised to HMMs. Iteratively re-estimates emission and transition parameters by alternating posterior computation (E-step) with parameter updates (M-step). Local optimum; needs random restarts. -->
- **Viterbi algorithm** -- Dynamic-programming decoder that returns the single most likely state sequence $\hat z_{1:T}$ given the observations and fitted parameters. Hard label per timestep.
<!-- - **Forward-backward posterior** -- The smoothed marginal $P(z_t = k \mid y_{1:T})$ at each timestep. Soft label -- a probability over states rather than a single choice. -->
- **Viterbi flip** -- A timestep at which the Viterbi-decoded state changes from one regime to another. Low flip counts indicate a stable, non-oscillating fit.
- **Drawdown** -- $d_t = \log(p_t) - \max_{s \leq t} \log(p_s)$. The log-distance from the current price to the running all-time high; always $\leq 0$, equals zero exactly when a new ATH is made.
- **Log-return** -- $r_t = \log(p_t) - \log(p_{t-1})$. The standard finance observation: stationary, local, but cycle-blind.
- **Stationarity** -- A time series is (weakly) stationary if its mean, variance, and autocovariance don't depend on $t$. HMMs assume emissions are stationary conditional on the state. Log-prices fail this; log-returns satisfy it, which is why for log prices are "stationarized" to e.g. sliding window maximum drawdown.
- **Secular drift** -- A slow, persistent trend in a time series that operates on a much longer timescale than the cyclical dynamics of interest (think decade-scale vs month-scale). BTC's log-price has a positive secular drift from long-run adoption growth; an HMM fit directly on it tends to identify "early in the window" vs "late in the window" as the latent state rather than bear vs bull. "Secular" here is the economics sense (long-term, non-cyclical), not the religious one.
- **Realised volatility ($\sigma^{\mathrm{RV}}$)** -- Sample volatility computed from realised returns over a rolling window (or, at higher frequency, from intraday squared returns). An ex-post estimate, in contrast to VIX which is ex-ante and implied.
- **Shocks (innovations)** -- The random error term $\varepsilon_t$ in a time-series model, e.g. $r_t = \mu + \phi r_{t-1} + \varepsilon_t$ in an AR(1). The "new information" each period that isn't predicted by the past. "Gaussian shocks" means $\varepsilon_t \sim \mathcal{N}(0, \sigma^2)$; "Student's-t shocks" allow fat tails.
- **Student's-t emissions** -- Emission family with an extra degrees-of-freedom parameter $\nu$ that controls tail heaviness. As $\nu \to \infty$ it becomes Gaussian; as $\nu \to 3$ tails get very fat. Used when the data has occasional extreme values a Gaussian would underweight.
- **Emission channels** -- The components of the observation vector $y_t$ that the HMM models conditional on the state. In a univariate setup there's one channel (e.g. drawdown); in a multivariate setup there are several (e.g. $(r_t, \sigma_t^{\mathrm{RV}}, d_t)$ = return, realised vol, drawdown). Heuristic: emission channels are quantities the regime *produces* -- things you'd expect to look different in a bear than in a bull, by definition of "regime".
- **Transition covariates** -- External, time-varying inputs $x_t$ that drive the transition probabilities in an NH-HMM (e.g. $A_{ij}(t) = \mathrm{softmax}_j(\beta_{ij} \cdot x_t)$). Heuristic: transition covariates are quantities the regime *responds to* -- things that don't themselves describe the regime but help predict when it will flip (VIX, USD index, 10Y yield). Putting a variable in the emission says "this is part of what the regime *is*"; putting it in the transition says "this is what makes the regime *change*".
- **NH-HMM (non-homogeneous HMM)** -- An HMM where the transition matrix $A_t$ depends on time-varying covariates (e.g. $A_{ij}(t) = \mathrm{softmax}_j(\beta_{ij} \cdot x_t)$ with $x_t$ including VIX). Lets external drivers modulate regime crossings.
- **MS-AR (Markov-switching autoregression)** -- Hamilton's original specification: an AR(q) process whose coefficients (and/or variance) switch with a hidden Markov state. The HMM with an autoregressive observation equation.
- **MAE (Mean Absolute Error)** -- $\frac{1}{N} \sum_i |y_i - \hat y_i|$. Average absolute deviation between a point forecast $\hat y$ and the realised value $y$. Same units as the target; lower is better. Robust to outliers compared to MSE (which squares errors), and the natural baseline for evaluating a single-number forecast.
- **CRPS (Continuous Ranked Probability Score)** -- Proper scoring rule for probabilistic forecasts. Generalises MAE to distributions: instead of comparing a point forecast to the realisation, it compares the *full predictive CDF* $F$ to a point mass at the realisation $y$, integrating $(F(z) - \mathbf{1}\{z \geq y\})^2$ over $z$. Reduces to MAE when $F$ is a point mass. Lower is better; used to compare HMMs with different $K$ out-of-sample.
- **Pólya-Gamma augmentation** -- A latent-variable trick (Polson, Scott, Windle 2013) that makes logistic / multinomial-logit likelihoods conjugate to Gaussian priors. Lets you Gibbs-sample over Bayesian logistic regressions; used here for the NH-HMM's softmax transition parameters.
<!-- - **PIP (posterior inclusion probability)** -- In Bayesian variable selection (e.g. spike-and-slab priors), the posterior probability that a given covariate has non-zero coefficient. PIP $\approx 1.00$ means the data strongly favours including the covariate. -->

# <a name="refs"/> References

- Hamilton, J. D. (1989). [*A new approach to the economic analysis of nonstationary time series and the business cycle.*](https://www.jstor.org/stable/1912559) Econometrica 57(2), 357--384.
- Rabiner, L. R. (1989). [*A tutorial on hidden Markov models and selected applications in speech recognition.*](https://www.cs.ubc.ca/~murphyk/Bayes/rabiner.pdf) Proceedings of the IEEE 77(2), 257--286.
- Andersen, T. G., Bollerslev, T., Diebold, F. X., Labys, P. (2001). *The distribution of realized exchange rate volatility.* Journal of the American Statistical Association 96, 42--55.
- Koki, C., Leonardos, S., Piliouras, G. (2020). [*Exploring the predictability of cryptocurrencies via Bayesian hidden Markov models.*](https://arxiv.org/abs/2011.03741) Daily percentage log-returns on BTC/ETH/XRP (2014--2019), $K=4$ NH-HMM, Bayesian MCMC with Pólya-Gamma augmentation. VIX (PIP 1.00) and 10Y Treasury yield (PIP 0.90) are the dominant transition predictors; the bull regime splits into bull-vol and bull-quiet sub-states.
- Shih, K.-S., Huang, P.-S., Hsu, C.-Y. (2024). *Bitcoin cycle through Markov regime-switching model.* Weekly BTC (2018--2022), MS-AR(q), $K=2$, Gaussian shocks. VIX and USD index as mean-equation covariates (not transitions). High-$\sigma$ state $\sigma \approx 0.053$ vs low-$\sigma$ state $\sigma \approx 0.007$.
- Pakštaitė, V. et al. (2025). *Bayesian MCMC HMM and NH-HMM for BTC with macro covariates.* Daily BTC (2016--2024), $K=2$, observation is log-transformed scaled price (a level, not a return). Pólya-Gamma logistic transitions, MCMC covariate selection over 16 macro / on-chain predictors on a 100-day rolling window.
- Malekinezhad, M., Rafati, P. (2026). *NH-HMM on 4-hour BTC with multivariate observation.* 4-hour BTC/USDT (2024--2026), $K=3$ NH-HMM with locally-varying transitions. Observation vector $(r_t, \sigma_t^{\mathrm{RV}}, v_t)$ = (log-return, rolling realised volatility, normalised volume).

Notebook with the full fit, plots, and the `feed.json` exporter: [nodrama-labs/research/notebooks/regime_student_t_drawdown_2022.org](https://github.com/nodrama-labs/research/blob/main/notebooks/regime_student_t_drawdown_2022.org).
Live dashboard: [/regimes/]({{ site.baseurl }}/regimes/).
Nothinh here is a financial advice.
