---
layout: post
title: "Self-hosted ChatGPT"
author: Filip Bielejec
comments: true
categories: [llm, local-inference, self-hosting, self-sovereign, rag, mcp, qdrant, open-webui, qwen]
description: "I deployed Open WebUI "ChatGPT-style" chat UI for every device on the LAN, and a shared RAG-over-MCP retrieval server that both the chat and the coding agent can attach to."
---

# <a name="intro"/> Intro

In [the previous post]({{ site.baseurl }}{% post_url 2026-07-07-local-coding-harness %}) I described how I deployed a coding agent running entirely on the home LAN -- a spare box, codenamed `weebeastie`, serving mid-range `Qwen3-Coder-30B-A3B` model over `llama-server`, reached from a laptop by [Qwen-Code](https://github.com/QwenLM/qwen-code) through an SSH tunnel.

I wanted to make the same model usable by e.g. spouse, hence these two additions, both guaranteeing the same self-sovereign posture (loopback-bound, nothing leaves my LAN):

1. **A chat UI for everyone.** [Open WebUI](https://github.com/open-webui/open-webui) in a container, so any phone, tablet or laptop browser on the LAN gets a ChatGPT-style window onto the local Qwen -- with per-user accounts and per-user memory.
2. **A grounded document assistant.** A retrieval-augmented-generation (RAG) server over European Parliament committee documents, built primarily for my spouse's work.

The interesting design decision is that the RAG isn't bolted onto the chat, even though Open WebUI comes with some RAG capabilities.
Instead it is a **shared RAG server spoken to over [MCP](https://modelcontextprotocol.io/)**, so the *same* server can be used both by the household chat *and* my coding agent.
That is because eventually more collections will be hosted in the RAG db - e.g. my notes, household documents, TODO list, vacay plans ...

# <a name="chat"/> The chat

The whole security story from last time was that the inference port never touches the LAN -- `llama-server` binds `127.0.0.1:8080` and is *only* reachable over an SSH tunnel. Adding a web UI must not break that.

Open WebUI runs in Docker with `network_mode: host`. That is the load-bearing choice: a normal bridged container cannot reach a *loopback* service on the host, but a host-networked one can use `localhost:8080` directly **and** expose its own port `3000` to the LAN. So the container reaches the model over loopback, and only the UI -- which has accounts -- is visible on `192.168.1.22:3000`. The raw model port stays as private as it was.

![The chat in front of the loopback-bound model]({{ site.baseurl }}/images/2026-07-12-household-chat-and-rag-mcp/chat.svg)

![Open WebUI answering from the local Qwen, with the llama-server journal alongside]({{ site.baseurl }}/images/2026-07-12-household-chat-and-rag-mcp/answer.png)

On the left, the chat at `192.168.1.22:3000` answering from `Qwen3-Coder-30B-A3B-Instruct-IQ4_XS`; on the right, logs on `weebeastie` showing that exact request stream through the model's slots -- ~100 tokens/s of prompt eval, ~19 tokens/s generated -- with nothing leaving the box.

A few decisions worth calling out:

- **Reboot survival for free.** Just a docker container with `restart: unless-stopped` means the chat auto-returns.
- **Fixed accounts, signup locked.** Three accounts (me as admin, spouse, a shared `guest`), `ENABLE_SIGNUP=false`. Separate accounts give separate, per-user memories automatically.
- **Sandbox gap.** The model only turns tokens into tokens; any code it emits runs in the *viewer's* browser (WASM/`pyodide`), not on `weebeastie`; the container isolates filesystem and processes. The deliberate hole is that host networking removes network isolation, so I keep the dangerous switches (server-side code execution, admin-installed tools) *off* and apply the cheap hardening (`no-new-privileges`, `cap_drop: ALL`).
- **Only one thing leaves the LAN, and only on consent.** Web search via [Exa](https://exa.ai/) is on, behind an explicit per-query confirmation. Version checks, telemetry and community sharing are all *off*.

# <a name="rag"/> The RAG MCP server

The document assistant is a Rust pipeline: fetch EP committee PDFs from the [Open Data Portal](https://data.europarl.europa.eu/), parse, chunk, embed and upsert into a [Qdrant](https://qdrant.tech/) vector database.
Each query is then embedded under the *identical* recipe as at the insert time, top-k passages are pulled, and the local Qwen is asked to answer **using only those passages, citing each one, or saying "I don't know."**

<!-- One hard constraint that shapes everything: the index was built under a pinned embedding contract (model, the query-only instruction prefix, CLS pooling, L2-norm). Retrieval is only valid if the query is embedded under the *same* contract. So the server embeds queries **itself** and asserts *live-contract == stored-contract* on boot. If a well-meaning frontend embeds the query with its own model, you get garbage. -->
<!-- -- the classic RAG failure.  -->
<!-- This is exactly why Open WebUI is **never** the retriever. -->

The first design made the RAG an OpenAI-compatible *model* -- a second entry in the chat's model dropdown that owned the whole loop (embed → Qdrant → ground → call the generator → cited answer). It worked, but it **welded retrieval to one specific generator** and made retrieval un-reusable: an OpenAI `/v1` endpoint is not something my coding agent can call mid-task.

So it got re-cast as a **shared MCP retrieval server**, `ep-rag-mcp`, attached to the *host* (the thing running the agent loop), not to the model server.

`llama-server` is just a text generator with no MCP client. The decide-to-call → dispatch → feed-back cycle lives *above* the model, in the host.
So the two hosts -- Open WebUI and Qwen-Code -- each hold their own MCP client, both point at the **same** retrieval server, and both independently use `llama-server` as their generator.
<!-- The MCP server and `llama-server` are **siblings, not stacked**.  -->
The win is loose coupling: retrieval is implemented once and reused; the generator stays a swappable dropdown in the chat.

![One shared RAG-over-MCP server, two hosts, one generator]({{ site.baseurl }}/images/2026-07-12-household-chat-and-rag-mcp/topology.svg)

Only `:3000` faces the LAN. `:8082` (MCP), `:6334` (Qdrant) and `:8080` (the model) all stay loopback. `ep-rag-mcp` is deployed exactly like `llama-server` -- a loopback systemd unit, `Restart=always`, enabled at boot.

# <a name="routing"/> Tool cal routing: native tool-calling vs. classify-then-answer

The household model needs a way to decide whether a message even needs the RAG.
<!-- Retrieving on a question the model already knows is not free -- the grounding prompt then forces "I don't know" onto an answerable question. So the routing decision matters. -->

Both paths start from the same artefact: a small **decision tree expressed as JSON**, versioned and auditable, whose node questions are natural language the model evaluates ("Is the user asking a substantive question about the content or positions of EMPL/REGI/IMCO committee documents?").
Two ways to consume it are:

- **Mode A -- native tool-calling.** Hand the model the tree as policy plus a `search_ep_committee_docs` tool, and let it emit a `tool_call` when it decides to ground. One turn.
- **Mode B -- walk the tree, emit a JSON decision.** Ask the model to *walk* the tree and return a compact `{"reached": …, "tool": …, "reason": …}` object. The *code* then reads that JSON and decides. A separate classify turn *before* generation.

I was not sure if a smaller model like Qwen-30B will be able to reliably answer in Mode B (although prefferable, given one less model turn).

So I just ran both against the same 10 labelled queries -- 4 in-domain EP questions, 4 clearly off-topic (including a carbonara recipe), and 2 deliberately hard "generic-EU-fact" borderline cases ("Who is the current President of the Commission?") that look on-topic but should *not* hit the document index:

| Mode | Routing correct | Format | Note |
|------|-----------------|--------|------|
| **B -- walk tree → JSON decision** | **10/10** | 10/10 valid JSON | correct on *both* hard borderline cases; ~2.5 s per classify (warm) |
| A -- native tool-calling | 8/10 | 10/10 valid tool args | 0 missed EP questions; the 2 errors were **over-firing** on borderline generic-EU questions |

The read: Qwen can obey the tree *flawlessly* when asked to reason through it explicitly (B). Native tool-choice (A) short-circuits that reasoning -- it pattern-matches "EU institution → call the EU tool" and skips the walk, over-firing on exactly the borderline questions where restraint matters.
This tracks, as the Open WebUI's own docs warn that small local models are unreliable at native tool-calling, and Qwen-30B sits right at the border of a small and a medium model.

So the household path pays a **~2.5-second classify turn** to buy a **10/10 vs 8/10** routing score, and does it deterministically -- the model never emits a tool_call in the chat; the *code* decides from parsed JSON, so the routing is as reliable as the classifier and all the grounding logic lives in one place in Rust ("code is law").
For a spouse asking policy questions, correct-and-a-bit-slower beats fast-and-occasionally-wrong.

<!-- My coding agent takes the other branch: Qwen-Code attaches to the *same* MCP server and uses native tool-calling, because a coding agent has a human in the loop and the occasional over-fire is cheap to shrug off. Same tree, same retrieval server, two evaluators -- the tree is the structure, the evaluator is pluggable. -->

# <a name="wrap"/> Where it stands

The box that used to just autocomplete my code now has a face the whole household can talk to from any device, a per-user memory, and a grounded, cited answer path over real EP committee documents -- all still behind a single LAN-facing port, with the model itself as private as the day it was set up. Setup, the Rust RAG crates, and the routing spike are in the [repository](https://github.com/fbielejec/local-harness).
