---
layout: post
title: "A household coding agent"
author: Filip Bielejec
comments: true
categories: [llm, local-inference, self-hosting, llama-cpp, qwen, agentic-coding]
description: "Running an open-weights coding agent entirely on the home LAN -- a spare box serves a Qwen3-Coder MoE over llama.cpp to laptops and phones around the house. Why the harness is Qwen-Code, and how a quantization sweep found the fastest model that still codes."
---

# <a name="intro"/> Introduction

Commercial coding assistants ship your keystrokes to someone else's datacenter.
That is a fine for most people; but if the whole point is *self-sovereignty* -- keeping your code, your prompts, and your family's chatbot traffic on hardware you physically own there are now alternatives.
[Vitalik's *Secure LLMs*](https://vitalik.eth.limo/general/2026/04/02/secure_llms.html) makes the case for a local-first inference, open weights, and sandboxing everything.
[Sebastian Raschka's *Using local coding agents*](https://magazine.sebastianraschka.com/p/using-local-coding-agents) showed it is now quite *practical* -- a small mixture-of-experts model with only a few billion active parameters is enough to drive a real agent loop.

So the goal for this project: an agentic coding assistant, plus a household chat frontend, that never leave the local network.

# <a name="topology"/> One strongish box, many thin clients

I already have a spare desktop -- an i9-10850K with 62 GB of RAM and a modest GTX 1050 Ti codename`weebeastie`.
The idea was to make it the household's inference engine: it holds the model and does the heavy lifting, while laptops, phones, and tablets on the LAN are just thin clients talking to it.

```
laptop / phone / tablet                        weebeastie  192.168.1.22
  coding harness   ──ssh tunnel──▶ localhost:8080 ──▶ llama-server (llama.cpp)
  local git repos                                     Qwen3-Coder-30B-A3B  (GGUF)
```

A couple of hardware realities that shaped everything downstream:

- **The CPU is the real inference engine, not the GPU.** 4 GB of VRAM is by far too little to
  hold a 30B model's experts, so the expert layers live in RAM and run on the 10 cores. The
  GPU earns its keep only by accelerating attention.
  <!-- and holding the KV cache. -->
- **Generation is memory-bandwidth-bound.** With ~45 GB/s of dual-channel DDR4, token
  throughput is essentially set by *how many bytes you read per token*.
  <!-- That single fact turns out to be the whole story of the tuning that follows. -->

`llama-server` from [llama.cpp](https://github.com/ggml-org/llama.cpp) does the serving: selected mainly because it has every CPU/GPU knob you might think of.
It stays bound to loopback address on the remote and is reached over an SSH tunnel -- the inference port is never actually on the LAN.

# <a name="harness"/> Picking the harness: Qwen-Code

The *harness* is the agent loop -- the thing that reads files, calls tools, runs commands, and feeds results back to the model.
It matters as much as the model, harnesses differ very sharply in how they treat tool calls and in turn how many tokens they burn (e.g. Raschka notes Codex is frugal, Claude Code is the most token-hungry).

I went with [Qwen-Code](https://github.com/QwenLM/qwen-code) for two reasons.
Firstly it plays nicely with `llama-server`, talking to it directly with no proxy required.
Second it is tuned for the Qwen model family -- which is exactly the model family the hardware pushed me toward.

# <a name="model"/> Choosing the model family, then sweeping it

The harsh truth is my modest hardware at the moment rules out most of the field.
A 355B-class model or a dense 70B simply will not fit in 62 GB
<!-- , and even if it did, reading that many bytes per token over DDR4 would make it unusably slow.  -->
The one path to a responsive agent on this box is a **small-active-parameter MoE** -- e.g. [Qwen3-Coder-30B-A3B-Instruct](https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct) with 30B total parameters but only ~3B active per token, coder-specialized, and well-supported in GGUF.

So that fixes the *family*. The open question was which quantization and serving config gives the most tokens/second without the model getting measurably worse at coding.
Since generation scales with bytes-read-per-token, a smaller quant should be strictly faster -- as long as it still "codes correctly".

For such tasks, requiring a time-consuming-yet-repetetive sweep over parameters I've enjoyed good experience offloading them to the [autoresearch loops]({{ site.baseurl }}{% post_url 2026-05-07-autoresearch-gem-strategy %}).
So I instructed an agent to do an overnight sweep, benchmarked with `llama-bench` at a realistic 16k context depth, and measured every candidate with a coding quality eval supplied by Raschka's [local-coding-agent-evals](https://github.com/rasbt/local-coding-agent-evals).

Results below:


| Config | gen @ 16k ctx | quality gate | verdict |
|--------|--------------|--------------|---------|
| Q4_K_M (baseline) | 8.38 tok/s | 5/5 agent-pack | reference |
| **IQ4_XS** | **8.80 tok/s** | **5/5 agent-pack** | **winner (+5%)** |
| Q4_0 | 8.77 tok/s | -- | dominated by IQ4_XS |
| KV-cache quant q4_0 | 8.40 tok/s | -- | tie (not the bottleneck) |
| partial expert offload to GPU | ~8.85 tok/s | -- | tie (PCIe ping-pong cancels the gain) |
| more threads (20 vs 10) | 8.82 tok/s | -- | tie (bandwidth-bound, not thread-bound) |
| speculative decoding | 8.76 tok/s | -- | no gain |

This table is almost monotonously consistent with one hypothesis: **the only lever that ever moves the generation speed is the size of the expert weights you read per token.**
Dropping from Q4_K_M to `IQ4_XS` (4.25 bits per weight, 15.25 GiB) buys a clean +5% *and* uses less VRAM -- while scoring identically on the coding eval.
Everything else -- KV-cache quantization, GPU expert offload, more threads, even speculative decoding with a vocab-compatible draft model -- lands within noise.
<!-- The bottleneck is irreducible: bytes over the memory bus. -->
<!-- `IQ4_XS` is the production config now. -->
Note that this finding is for *my* harware, and will more than likely differ, so I just present it as the methodology more than actual open-weighted model recommendation.

# <a name="repo"/> Setup instructions

Setup instructions, eval and code published in the [repository](https://github.com/fbielejec/local-harness).

<!-- # <a name="next"/> Next: opening it to the household -->

<!-- The other half  vision is a -->
<!-- ChatGPT-like web UI so the rest of the household can use the same model from any device -- -->
<!-- [Open WebUI](https://github.com/open-webui/open-webui) in a container, LAN-exposed behind a -->
<!-- login wall, talking to the same loopback-bound `llama-server`. The nice security property: -->
<!-- only the UI (which has accounts) is reachable on the LAN; the raw inference port never is. -->
