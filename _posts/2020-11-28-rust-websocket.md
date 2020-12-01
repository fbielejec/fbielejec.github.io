---
layout: post
title: Torturing websocket APIs with Rust
author: Filip Bielejec
comments: true
categories: [rust, websockets, API, gateway, performance, testing, histograms]
summary: "ws-load-test is a high-throughput tool written in Rust for testing websocket APIs"
---

# <a name="repo"/> TL;DR Project repository

- [https://github.com/fbielejec/ws-load-test](https://github.com/fbielejec/ws-load-test)

# <a name="intro"/> Intro

I am currently working on architecting a revision of a backend infrastructure for a social media mobile application. 
Current API uses a WebSocket protocol, with clients maintaining a connection to an [API Gateway](https://aws.amazon.com/api-gateway/) and the business logic is deployed as an [AWS Lambda](https://aws.amazon.com/lambda/). 

This has worked remarkably well, the Lambda self-handles scaling and with automated deployment we could focus on delivering features.
However with the influx of users we are starting to see the limitations of this model:
- API gateway gets [costly](https://aws.amazon.com/api-gateway/pricing/)
- Allthough it is possible to use connection pooling in the context of Lambda, the ephemeral nature of it means [no guarantees](https://forums.aws.amazon.com/thread.jspa?threadID=216000) and constantly opening new connections can strain your database.

Therefore we started to play with different architectural solutions that will address those shortcoming, yet still tick the boxes of load balancing and easy horizontal scalability, while keeping the costs reasonable.

Building different POCs called for a way to benchmark their performance: enter [ws-load-test](https://github.com/fbielejec/ws-load-test).

# <a name="implementation"/> How it works

_ws-load-test_ is a high-throughput tool for testing websocket APIs and written in Rust.
It will open a number of concurrent connections to a websocket endpoint and start flooding it with PING requests, at the same time collecting various statistics on the response times.

These reported statistics are collected across all the client connection tasks using Rust port of [High Dynamic Range Histograms](https://github.com/HdrHistogram/HdrHistogram_rust), a low-latency, high-range histogram implementation.

Concurrent tasks (namely the WS connections) rely on the [async-std](https://github.com/async-rs/async-std) asynchronous runtime, which chooses how to run them, i.e. how many threads to start and how to distribute tasks on them.
_async-std_ is a competition to de-facto standard [Tokio async runtime](https://github.com/tokio-rs/tokio), it has a very simple yet [interesting design philosophy of mirroring the std library with async variants](https://www.reddit.com/r/rust/comments/dngig6/tokio_vs_asyncstd/).

# <a name="usage"/> Using the tool

_ws-load-test_ is not yet released as a crate, as I deemed it too simplistic in it's current form, but after cloning [the repository](https://github.com/fbielejec/ws-load-test) you can build the binary:

```bash
cargo build --release
```

The arguments can be passed on the command line, for example to open 3 concurrent client connections to the [echo](ws://echo.websocket.org) public websocket endpoint: 

```bash
./target/release/ws-load-test -c 3 -g ws://echo.websocket.org
```

And this is the output you should see:

![_config.yml]({{ site.baseurl }}/images/2020-11-28-rust-websocket/screencast.gif)

