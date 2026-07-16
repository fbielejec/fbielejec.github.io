---
layout: post
title: "A tunnel home"
author: Filip Bielejec
comments: true
featured: true
categories: [llm, local-inference, self-hosting, self-sovereign, wireguard, networking, vpn, ssh]
description: "Reaching the household model from outside the house without giving up the loopback-only posture -- a WireGuard front door, an SSH tunnel behind it, and dynamic DNS to survive a sticky IP."
---

# <a name="intro"/> Intro

I want to sit in a cafe, open the laptop, point `OPENAI_BASE_URL` at the box at home, and have the coding agent work exactly as it does at my desk. Nothing about the model, the harness, or the evals should notice it moved.

That's the whole goal. The reason it isn't trivial is the promise the rest of the setup rests on -- *nothing leaves the local network* (see the [first post]({{ site.baseurl }}{% post_url 2026-07-07-local-coding-harness %}), wher eI put a coding agent on a spare box and the [second]({{ site.baseurl }}{% post_url 2026-07-12-household-chat-and-rag-mcp %}) where I gave the household a chat UI).

The honest version of the goal now isn't "nothing leaves the LAN".
On a cafe wifi my prompts *must* cross the public internet.
What I still control is **who is in the path**. So the property to preserve is narrower and more defensible: end-to-end encryption between two machines I own, with no third party able to read it, hold it, or replay it.
Self sovereignty basically.

<!-- That sounds like a small networking chore. It turned out to be a chore wrapped around a stack of wrong assumptions -- starting with mine about my own ISP. -->

# <a name="measure"/> What the network is doing

Before choosing anything, I ran two commands:

```bash
curl -4 -s ifconfig.me     # -> a real, public IPv4
whois <that address>
```

The address is nowhere near carrier-NAT space (`100.64.0.0/10`) -- my ISP doesn't CGNAT residential lines. So port forwarding works and I don't need NAT traversal at all, which is what makes everything downstream cheap: a hosted mesh service earns its keep by punching through carrier NAT, and I don't have any.

The RIPE record lists the range as dynamic xDSL. Like anyone who isn't paying their ISP for a static address, I don't have one -- what I have is a **sticky** address: unchanged for months at a time, contractually dynamic, free to move on any modem reboot or line resync.

There's also native IPv6 on the line, a whole `/64`. Tempting -- no NAT at all. But cafe wifi is frequently IPv4-only, and an endpoint you can't reach from the network you're actually sitting on is worthless. IPv6 goes in the drawer for now.

# <a name="lockout"/> The failure mode that makes DDNS non-optional

Sticky-not-static sounds like a footnote. It's the one genuinely bad failure in the design: while abroad, the line resyncs, the home IP changes, client config hardcodes the old endpoint, and fixing it requires knowing the new IP -- which requires access to the hone LAN.
Chicken and egg. And because the IP is sticky, this happens rarely enough that you'll more than likely have completely forgotten it's possible by the time it bites you.

So: dynamic DNS, via [deSEC](https://desec.io/) -- a Berlin-based non-profit, open source, DNSSEC by default.
A third party, but a precisely-bounded one: it learns an IP and a hostname, and **no traffic flows through it**.

Two gotchas, both of which only bite when you can't debug them:

- **`wg-quick` resolves `Endpoint` once, at interface start, and never re-resolves.** DDNS alone changes nothing for a live tunnel.
- **Delete the AAAA record on purpose.** The box has native IPv6, so the updater would happily publish one, and `wg-quick` might then resolve the endpoint to v6 -- which works beautifully at home and fails on IPv4-only cafe wifi. `curl -4` plus an empty `myipv6=` forces v4 and drops the AAAA.

# <a name="choice"/> Why WireGuard

With NAT traversal off the table as a requirement, the field narrows to one obvious answer, and every property I wanted falls out of it:

- **No daemon and no account.** WireGuard is in the kernel, about 4k lines of it. Nothing runs as root on my behalf, nothing phones a control plane, nothing rewrites my iptables behind Docker's back.
- **No third party at all.** Keys are two files I generate. Nobody brokers them and nobody sees the metadata.
- **Invisible to scanners.** An unauthenticated packet draws *no reply* -- not a refusal, nothing. The port may as well not exist unless you hold the key.
- **Split tunnelling for free.** `AllowedIPs = 10.10.0.1/32` routes only the tunnel's own address, so a commercial VPN can stay on alongside it.

<!-- The question I'd been asking -- "is a third-party control plane acceptable?" -- was too abstract to answer honestly. The sharper version: **does a proprietary daemon get root on the box that holds my models, my RAG index, and my spouse's work documents?** Put that way it isn't close. -->

<!-- And the cost of the "hard" option turned out to be two config files, four commands, and a single port-forward rule (`UDP 51820`). -->

# <a name="design"/> The design, and the invariant that makes it cheap

The thing that keeps this small: **`llama-server` doesn't change at all.** It stays bound to `127.0.0.1:8080`, never bound to any network interface, mesh or LAN. WireGuard doesn't expose the model -- it makes `weebeastie`'s *SSH* reachable, and the existing SSH tunnel does the rest.

```
travel laptop (café)                     weebeastie (home)
                                           wg0 10.10.0.1  ◀── UDP 51820 forwarded
  qwen-code                                    │
  OPENAI_BASE_URL=localhost:8080/v1            ▼
        │                                    sshd  ◀── LAN + wg0 only; :22 NOT forwarded
        ▼                                      │
  ssh -fN -L 8080:127.0.0.1:8080  ═══════▶  127.0.0.1:8080  llama-server
```

The tempting shortcut is to bind `llama-server` to the WireGuard interface and skip SSH. That would mean the model needs its own auth -- llama.cpp's `--api-key` is a bearer string in a config file, not a credential system -- and it puts an unauthenticated inference endpoint one firewall mistake away from the LAN. Going through SSH means the auth is a keypair that already exists, the encryption is doubled, and the loopback-only property from the first post survives untouched.

**Port 22 is deliberately not forwarded.** WireGuard is the front door; SSH lives behind it. An unauthenticated WireGuard packet gets *no reply at all* -- the box is invisible to internet-wide scanners.

Most tutorials will also tell you to enable `ip_forward` and add a `MASQUERADE` rule. Don't -- those are for using the box as a *gateway* into your LAN. Here the tunnel's only destination is the box itself, so packets terminate at the interface and the blast radius stays at one host.

# <a name="testing"/> The trap: never test this from your own LAN

The obvious test is: laptop on the LAN, dial your own public IP, see if it works. This fails -- not because your config is wrong, but because most consumer routers don't implement NAT loopback (hairpinning), so packets from inside addressed to the WAN IP just die. **You get a false negative and go hunting a bug that doesn't exist.**

<!-- I know this because I wrote "never test from the LAN" in my own design doc and then, an hour later, told myself to test from the LAN. -->

<!-- The fix is pleasingly ironic. C -->
In order to test it on LAN connect the **laptop** to a commercial VPN, and bring the tunnel up: your packets exit at its node and re-enter your router from the real internet, so the port-forward gets exercised on the real path with no hairpin involved.
<!-- My NordVPN subscription earns its place after all -- not as the transport, which is what I'd assumed I'd bought it for, but as the **test harness**. It also settles the one fact you cannot establish from inside your own house: whether that public IP is really yours or a carrier NAT wearing a public-range costume. A returning handshake disproves it outright. -->

<!-- Two footnotes. NordLynx is itself WireGuard, so you're nesting WireGuard in WireGuard -- if the handshake succeeds but data silently stalls, that's MTU, not auth. And a clean datacenter exit doesn't predict a cafe;  -->
If you want a surefire test use a phone hotspot, since your carrier almost certainly CGNATs you.

# <a name="use"/> Using it

The whole thing collapses into a Makefile target. `away` re-points `REMOTE` at the WireGuard peer using a target-specific variable.
It's deliberately explicit rather than a boot-time service: the endpoint is my home public IP, and since my router doesn't hairpin, a tunnel that came up automatically would be permanently broken at home -- which is where the laptop mostly lives. `make away` pings the peer and tears itself down in 3 seconds if you're not actually away.

```bash
make tunnels      # at home -- straight over the LAN
make away         # outside -- WireGuard up, then the same tunnels over it
make wg-status    # endpoint / handshake / transfer
make away-stop
```

Everything downstream is untouched. Same `OPENAI_BASE_URL`, same env vars, same eval gate, same `qwen -p` *artichoke* smoke test.
From the client's point of view `localhost:8080` is `localhost:8080` -- the harness genuinely cannot tell it isn't home.

# <a name="wrap"/> Where it stands

The box now answers from anywhere, and the model is exactly as private as it was on day one: bound to loopback, never on a network interface, reachable only through a keypair I hold. sshd is key-only, root login off, port 22 not exposed to anything. The front door is a UDP port that doesn't answer strangers.

Configs, the Makefile and the design doc are in the [repository](https://github.com/fbielejec/local-harness).
