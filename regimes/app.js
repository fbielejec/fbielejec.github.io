/* ──────────────────────────────────────────────────────────────────────────
   Drawdown HMM dashboard — render logic.

   This file knows NOTHING about which model produced the feed. It introspects
   feed.model.states[] for names / colours / params and feed.series.posterior
   for the per-state probability tracks. A K=4 model (or a different family, or
   a different observation) renders with zero changes here.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  // ── theme tokens — read from CSS variables (--rg-*) so Plotly stays in sync
  // with regimes.css. Light blog values are the fallbacks.
  let NAVY = "#1a2332", TEXT = "#2d2d2d", INK_DIM = "#6b7280", INK_FAINT = "#9ca3af";
  let LINE = "#e2ded8", LINE_SOFT = "#f0ebe5", ACCENT = "#c45e3e", BEAR = "#c0392b";
  let PANEL = "#ffffff";
  let FONT_MONO = '"JetBrains Mono", "Fira Code", Consolas, monospace';

  function applyTheme() {
    const root = document.querySelector(".regimes-app") || document.documentElement;
    const cs = getComputedStyle(root);
    const v = (name, fallback) => {
      const got = cs.getPropertyValue(name).trim();
      return got || fallback;
    };
    NAVY = v("--rg-navy", NAVY);
    TEXT = v("--rg-text", TEXT);
    INK_DIM = v("--rg-dim", INK_DIM);
    INK_FAINT = v("--rg-faint", INK_FAINT);
    LINE = v("--rg-line", LINE);
    LINE_SOFT = v("--rg-line-soft", LINE_SOFT);
    ACCENT = v("--rg-accent", ACCENT);
    BEAR = v("--rg-bear", BEAR);
    PANEL = v("--rg-panel", PANEL);
    FONT_MONO = v("--rg-mono", FONT_MONO);
  }

  const PLOT_CONFIG = { displayModeBar: false, responsive: true, scrollZoom: false };

  // hex (#rrggbb) -> rgba string with alpha
  function hexA(hex, a) {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16),
          g = parseInt(h.slice(2, 4), 16),
          b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  const pct = (x) => (x * 100).toFixed(0) + "%";
  const pct1 = (x) => (x * 100).toFixed(1) + "%";

  // ── load feed: inline first (build mode), fetch fallback (raw template) ──
  async function loadFeed() {
    const el = document.getElementById("feed");
    const raw = el ? el.textContent.trim() : "";
    if (raw && raw !== "{{FEED_JSON}}") return JSON.parse(raw);
    const resp = await fetch("feed.json");
    if (!resp.ok) throw new Error("feed.json not found and no inline feed");
    return resp.json();
  }

  // ── base Plotly layout shared by every figure ───────────────────────────
  function baseLayout(extra) {
    return Object.assign({
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: FONT_MONO, size: 11, color: INK_DIM },
      margin: { l: 56, r: 18, t: 10, b: 30 },
      hovermode: "x unified",
      hoverlabel: {
        bgcolor: PANEL, bordercolor: LINE,
        font: { family: FONT_MONO, size: 12, color: NAVY },
      },
      showlegend: false,
    }, extra || {});
  }

  function xAxis(extra) {
    return Object.assign({
      gridcolor: LINE_SOFT, zeroline: false,
      linecolor: LINE, tickcolor: LINE,
      showspikes: true, spikecolor: INK_FAINT, spikethickness: 1,
      spikedash: "dot", spikemode: "across",
    }, extra || {});
  }
  function yAxis(extra) {
    return Object.assign({
      gridcolor: LINE_SOFT, zeroline: false,
      linecolor: LINE, tickcolor: LINE,
    }, extra || {});
  }

  // price + posterior stacked traces for a given slice of the series.
  // `i0,i1` is an inclusive index range into the series arrays.
  function regimeTraces(feed, i0, i1, opts) {
    opts = opts || {};
    const S = feed.series;
    const dates = S.dates.slice(i0, i1 + 1);
    const close = S.close.slice(i0, i1 + 1);
    const states = feed.model.states; // ordered bear..bull (ascending mu)

    const price = {
      x: dates, y: close, type: "scattergl", mode: "lines",
      name: "price", line: { color: NAVY, width: 1.4 },
      yaxis: "y", hovertemplate: "$%{y:,.0f}<extra></extra>",
    };

    const stack = states.map((st) => ({
      x: dates,
      y: S.posterior[st.name].slice(i0, i1 + 1),
      type: "scatter", mode: "lines",
      name: st.name,
      stackgroup: "post",
      line: { width: 0.4, color: hexA(st.color, 0.9) },
      fillcolor: hexA(st.color, opts.fillAlpha != null ? opts.fillAlpha : 0.82),
      yaxis: "y2",
      hovertemplate: `${st.name}  %{y:.0%}<extra></extra>`,
    }));

    return [price].concat(stack);
  }

  // ── 1. header ───────────────────────────────────────────────────────────
  function renderHeader(feed) {
    const m = feed.model;
    const states = m.states;

    // current regime from the last Viterbi label
    const lastName = feed.series.viterbi[feed.series.viterbi.length - 1];
    const lastState = states.find((s) => s.name === lastName) || states[0];
    const rn = document.getElementById("regime-now");
    rn.innerHTML =
      `<span class="swatch" style="background:${lastState.color};color:${lastState.color}"></span>` +
      `<span class="rn-label">now</span>` +
      `<span class="rn-value" style="color:${lastState.color}">${lastName.toUpperCase()}</span>`;

    const genDate = (feed.generated_at || "").slice(0, 10);
    const badges = [
      `<span class="badge">${m.label}</span>`,
      `<span class="badge"><b>${feed.asset}</b> · ${feed.frequency}</span>`,
      `<span class="badge">K=<b>${m.K}</b></span>`,
      `<span class="badge">${m.fit_window.start} → ${m.fit_window.end}</span>`,
      `<span class="badge">generated <b>${genDate}</b></span>`,
    ].join("");
    document.getElementById("meta-badges").innerHTML = badges;
  }

  // ── now strip: today's posterior + one-step-ahead (π · A) ────────────────
  function renderNow(feed) {
    const states = feed.model.states;
    const post = feed.series.posterior;
    const n = feed.series.dates.length;

    // today's posterior, in state order
    const today = states.map((s) => (post[s.name] || [])[n - 1] || 0);

    // tomorrow = today · A   (row vector times transition matrix)
    const A = feed.model.transition_matrix;
    const tomorrow = states.map((_, j) =>
      today.reduce((acc, p_i, i) => acc + p_i * (A[i] ? A[i][j] : 0), 0)
    );

    function barsHtml(probs) {
      return states.map((s, i) => {
        const p = probs[i] || 0;
        const w = Math.max(p * 100, 0.4); // floor so 0% still shows a hairline
        return (
          `<div class="nb-row">` +
            `<span class="nb-label" style="color:${s.color}">${s.name}</span>` +
            `<span class="nb-track"><span class="nb-fill" style="width:${w}%;background:${s.color}"></span></span>` +
            `<span class="nb-pct">${pct1(p)}</span>` +
          `</div>`
        );
      }).join("");
    }

    document.getElementById("now-today").innerHTML = barsHtml(today);
    document.getElementById("now-tomorrow").innerHTML = barsHtml(tomorrow);
  }

  // ── legend (data-driven) ─────────────────────────────────────────────────
  function renderLegend(feed) {
    const html = feed.model.states.map((s) =>
      `<span class="item"><span class="sw" style="background:${s.color}"></span><b>${s.name}</b></span>`
    ).join("");
    document.getElementById("legend").innerHTML = html;
  }

  // ── 2. headline figure ───────────────────────────────────────────────────
  function renderHeadline(feed) {
    const n = feed.series.dates.length;
    const traces = regimeTraces(feed, 0, n - 1);
    const layout = baseLayout({
      margin: { l: 60, r: 18, t: 8, b: 18 },
      xaxis: xAxis({
        domain: [0, 1], anchor: "y2",
        rangeslider: { visible: true, thickness: 0.06, bgcolor: LINE_SOFT, bordercolor: LINE },
        type: "date",
      }),
      yaxis: yAxis({
        domain: [0.40, 1.0], type: "log",
        title: { text: `${feed.asset} price`, font: { size: 11, color: INK_FAINT } },
        tickprefix: "$", tickformat: "~s",
      }),
      yaxis2: yAxis({
        domain: [0.0, 0.32], range: [0, 1],
        title: { text: "P(regime)", font: { size: 11, color: INK_FAINT } },
        tickformat: ".0%",
      }),
    });
    Plotly.newPlot("fig-headline", traces, layout, PLOT_CONFIG);
  }

  // ── 3. diagnostic trace ──────────────────────────────────────────────────
  function renderDiagnostic(feed) {
    const S = feed.series;
    const obsLabel = feed.model.observation.label;
    document.getElementById("diag-sub").innerHTML =
      `The only number the HMM sees: <span class="mono">${obsLabel}</span> — how far ` +
      `log-price sits below its running all-time high. Zero at every new peak, more ` +
      `negative the deeper the drawdown. Reference lines mark −0.5 (≈ −39% off the high) ` +
      `and −1.0 (≈ −63%): shallow excursions near zero are where the bull state lives; ` +
      `sustained moves below −0.5 are where the bear takes over.`;

    const trace = {
      x: S.dates, y: S.observation, type: "scattergl", mode: "lines",
      line: { color: NAVY, width: 1 },
      hovertemplate: "%{y:.3f}<extra></extra>",
    };
    const refs = [
      { y: 0.0, color: INK_FAINT, dash: "solid" },
      { y: -0.5, color: ACCENT, dash: "dash" },
      { y: -1.0, color: BEAR, dash: "dash" },
    ].map((r) => ({
      type: "line", xref: "paper", x0: 0, x1: 1, y0: r.y, y1: r.y,
      line: { color: r.color, width: 1, dash: r.dash },
    }));

    const layout = baseLayout({
      shapes: refs,
      xaxis: xAxis({ type: "date" }),
      yaxis: yAxis({
        title: { text: "drawdown  d_t", font: { size: 11, color: INK_FAINT } },
        rangemode: "tozero",
      }),
      annotations: [
        annot("−0.5  (≈ −39%)", -0.5, ACCENT),
        annot("−1.0  (≈ −63%)", -1.0, BEAR),
      ],
    });
    Plotly.newPlot("fig-diagnostic", [trace], layout, PLOT_CONFIG);
  }
  function annot(text, y, color) {
    return {
      xref: "paper", x: 0.004, y: y, xanchor: "left", yanchor: "bottom",
      text: text, showarrow: false,
      font: { family: FONT_MONO, size: 10, color: color },
    };
  }

  // ── index range for a [start,end] date window ────────────────────────────
  function windowRange(feed, start, end) {
    const d = feed.series.dates;
    let i0 = d.findIndex((x) => x >= start);
    if (i0 < 0) i0 = 0;
    let i1 = d.length - 1;
    for (let i = d.length - 1; i >= 0; i--) { if (d[i] <= end) { i1 = i; break; } }
    if (i1 < i0) i1 = i0;
    return [i0, i1];
  }

  // ── 4. zoom panels ───────────────────────────────────────────────────────
  // Brief context for each episode — surfaced as a tooltip on the title.
  const EPISODE_NOTES = {
    "2018 bear":
      "After the December 2017 ATH near $19.7K, BTC unwound the ICO bubble: " +
      "Mt. Gox trustee sales, China's exchange crackdown, and regulatory pressure " +
      "drove price down ~84% to ~$3.2K by year-end.",
    "COVID Q1 2020":
      "The pandemic liquidity shock. On March 12 (\"Black Thursday\") BTC fell ~50% " +
      "in 24 hours as global markets crashed and leveraged crypto positions cascaded, " +
      "before recovering through April.",
    "2020–21 bull":
      "The institutional adoption wave: MicroStrategy began treasury buys (Aug 2020), " +
      "Tesla disclosed a $1.5B position (Feb 2021), Coinbase listed on Nasdaq (Apr 2021). " +
      "BTC ran from ~$10K to its November 2021 ATH near $69K.",
    "2022 bear":
      "By May 2022, BTC was already ~50% below its Nov 2021 ATH. The Luna/UST collapse " +
      "(May 9), 3AC liquidation (June), Celsius freeze, and the FTX collapse (November) " +
      "all fall within this window.",
  };

  function renderZooms(feed) {
    const grid = document.getElementById("zoom-grid");
    grid.innerHTML = "";
    feed.windows.forEach((w, k) => {
      const card = document.createElement("div");
      card.className = "zoom-card";
      const shares = w.metrics.regime_shares;
      const shareHtml = feed.model.states.map((s) =>
        `<span class="s" style="color:${s.color}">${s.name} <b>${pct(shares[s.name] || 0)}</b></span>`
      ).join("");
      const note = EPISODE_NOTES[w.label] || "";
      const titleAttr = note ? ` title="${note.replace(/"/g, "&quot;")}"` : "";
      const titleClass = note ? "zc-title has-note" : "zc-title";
      card.innerHTML =
        `<div class="zc-head">` +
          `<span class="${titleClass}"${titleAttr}>${w.label}</span>` +
          `<span class="zc-dates">${w.start} → ${w.end}</span>` +
        `</div>` +
        `<div class="zc-plot" id="zoom-${k}"></div>` +
        `<div class="zc-shares">${shareHtml}` +
          `<span class="s" style="margin-left:auto">flips <b>${w.metrics.viterbi_flips}</b></span>` +
        `</div>`;
      grid.appendChild(card);

      const [i0, i1] = windowRange(feed, w.start, w.end);
      const traces = regimeTraces(feed, i0, i1, { fillAlpha: 0.85 });
      const layout = baseLayout({
        margin: { l: 44, r: 8, t: 6, b: 18 },
        xaxis: xAxis({ domain: [0, 1], anchor: "y2", type: "date", nticks: 4 }),
        yaxis: yAxis({ domain: [0.46, 1.0], type: "log", tickprefix: "$", tickformat: "~s", nticks: 4 }),
        yaxis2: yAxis({ domain: [0.0, 0.36], range: [0, 1], tickformat: ".0%", nticks: 3 }),
      });
      Plotly.newPlot(`zoom-${k}`, traces, layout, PLOT_CONFIG);
    });
  }

  // ── 5. window summary table ──────────────────────────────────────────────
  function renderWindowTable(feed) {
    const states = feed.model.states;
    const head = `<thead><tr><th>Episode</th>` +
      states.map((s) => `<th>${s.name}</th>`).join("") +
      `<th>flips</th></tr></thead>`;
    const rows = feed.windows.map((w) => {
      const sh = w.metrics.regime_shares;
      const cells = states.map((s) => {
        const v = sh[s.name] || 0;
        return `<td class="bar-cell"><span class="bar" style="width:${(v*100).toFixed(1)}%;background:${s.color}"></span><span>${pct1(v)}</span></td>`;
      }).join("");
      return `<tr><td>${w.label}</td>${cells}<td>${w.metrics.viterbi_flips}</td></tr>`;
    }).join("");
    document.getElementById("window-table").innerHTML = head + `<tbody>${rows}</tbody>`;
  }

  // ── 6. state params + transition matrix ──────────────────────────────────
  function renderStateTable(feed) {
    const states = feed.model.states;
    const hasNu = states.some((s) => s.params.nu != null);
    const head = `<thead><tr><th>state</th><th>μ</th><th>σ</th>` +
      (hasNu ? `<th>ν</th>` : "") + `</tr></thead>`;
    const rows = states.map((s) => {
      const p = s.params;
      return `<tr><td><span class="rname"><span class="sw" style="background:${s.color}"></span>${s.name}</span></td>` +
        `<td>${fmt(p.mu)}</td><td>${fmt(p.sigma)}</td>` +
        (hasNu ? `<td>${p.nu != null ? fmt(p.nu) : "—"}</td>` : "") + `</tr>`;
    }).join("");
    document.getElementById("state-table").innerHTML = head + `<tbody>${rows}</tbody>`;

    // transition matrix
    const A = feed.model.transition_matrix;
    if (A && A.length) {
      const th = `<thead><tr><th>from → to</th>` +
        states.map((s) => `<th style="color:${s.color}">${s.name}</th>`).join("") + `</tr></thead>`;
      const tr = A.map((row, i) => {
        const cells = row.map((v) => `<td>${v.toFixed(2)}</td>`).join("");
        return `<tr><td style="color:${states[i].color}">${states[i].name}</td>${cells}</tr>`;
      }).join("");
      document.getElementById("trans-table").innerHTML = th + `<tbody>${tr}</tbody>`;
    } else {
      document.getElementById("trans-table").closest(".table-wrap").style.display = "none";
    }
  }
  function fmt(x) { return (x >= 0 ? "+" : "") + Number(x).toFixed(x === Math.round(x) ? 0 : 3); }

  // ── 7. footer ─────────────────────────────────────────────────────────────
  function renderFooter(feed) {
    document.getElementById("foot-obs").textContent = feed.model.observation.label;
    const ll = feed.model.log_likelihood;
    document.getElementById("foot-fine").textContent =
      `${feed.asset} · ${feed.frequency} · generated ${(feed.generated_at||"").slice(0,10)}` +
      (ll != null ? ` · log-likelihood ${ll}` : "");
  }

  // ── boot ──────────────────────────────────────────────────────────────────
  loadFeed().then((feed) => {
    applyTheme();
    renderHeader(feed);
    renderNow(feed);
    renderLegend(feed);
    renderHeadline(feed);
    renderDiagnostic(feed);
    renderZooms(feed);
    renderWindowTable(feed);
    renderStateTable(feed);
    renderFooter(feed);
  }).catch((err) => {
    console.error(err);
    const el = document.getElementById("regime-now");
    if (el) el.textContent = "feed load failed — run `make feed`";
  });
})();
