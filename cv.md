---
layout: page
title: CV
permalink: /cv/
---

# Filip Bielejec

**Engineer-Scientist** -- bridging software engineering, applied cryptography and computational research

[Email](mailto:filip.bielejec@pm.me) | [Github](https://github.com/fbielejec) | [Blog](https://www.blog.nodrama.io/) | [Google Scholar](https://scholar.google.com/citations?user=5xTmvcYAAAAJ) | [Telegram](https://t.me/FilipBielejec) | Poland (UTC+1)

---

## About Me

Software engineer with over 10 years of professional experience. My background combines rigorous academic research ([Google Scholar](https://scholar.google.com/citations?user=5xTmvcYAAAAJ)) with practical software development, giving me the ability to move seamlessly between abstract problem-solving and concrete system implementation.

I enjoy rapid prototyping, and in the recent years I have specialized in privacy-preserving zero-knowledge cryptography and blockchain infrastructure. I have hands-on experience across multiple blockchain ecosystems -- Substrate, Ethereum, and EVM-compatible chains -- building cross-chain platform systems, high-throughput async services, and open-source blockchain node contributions. I have a deep understanding of DeFi concepts such as automated market makers (AMMs), tokenomics, and MEV-prevention strategies.

## Top Achievements

- **Developed [Spread](https://spreadviz.org/home)**, an open-source platform for visualizing viral spread across time and geography, cited in research and actively used worldwide ([example visualization](https://view.spreadviz.org/?output=6cf3d80f-ed60-4264-bc04-6bfed431a810/f5e9f410-08e9-4ec4-8074-d2dc5d74d087.json&maps=SO,KW,SS,KE,YE,TZ,SY)). Engineering effort included JSON-based data format, animation engine, API, authentication system and storage layer -- optimized for minimal costs and fast delivery ([GitHub](https://github.com/phylogeography/spread)).

- **Designed and implemented the relayer component** of the MOST Substrate--EVM Bridge, handling deterministic vs. probabilistic finality, deep reorgs, and building a "circuit breaker" failsafe for guardians ([GitHub](https://github.com/Cardinal-Cryptography/most), [commit](https://github.com/Cardinal-Cryptography/most/commit/15f07f85cba587d38bf8c81087491b3c50f078d7)).

- Built a **streamlined AMM-based decentralized exchange** on Aleph Zero's deterministic L1, showcased in the on-chain game [The Button](https://alephzero.org/the-button) ([code](https://github.com/Cardinal-Cryptography/aleph-node/blob/a3f00540337c6b55f7974f3cedf341898cb33b40/contracts/simple_dex/lib.rs), [blog post](https://www.blog.nodrama.io/how-the-button-is-made/)).

- **Co-developed [Shielder](https://app.common.fi/)**, a Tornado Cash--like mixer with partial de-anonymization, enabling privacy with governance accountability. Implemented in-SNARK ElGamal encryption, Poseidon hash, and optimized Halo2 EC operations ([GitHub](https://github.com/Cardinal-Cryptography/zkOS-circuits), [Poseidon](https://github.com/penumbra-zone/poseidon377), [commit](https://github.com/Cardinal-Cryptography/zkOS-circuits/commit/0ddf37bb6e05b2d644ec19d181a02fd4564a96ca)).

- Active contributor to **zero-knowledge cryptography research**, experimenting with Arkworks, Halo2, Circom, and publishing open notes ([ZK notes](https://github.com/fbielejec/zkSNARKs-notes), [study group](https://github.com/fbielejec/zero_knowledge_proofs/tree/main)).

- **Community engagement**: co-organizer of the Leuven Functional Programming Meetup, technical blogger ([blog.nodrama.io](https://www.blog.nodrama.io)), and instructor for ink! smart contract development at the [Polkadot Blockchain Academy](https://polkadot.network/development/academy/).

## Skills

| | |
|---|---|
| **Languages** | Rust (4 years), Clojure & ClojureScript (5 years), Python (2 years), Solidity (5 years), Java (2 years), R (3 years) |
| **Blockchain** | Substrate, Ethereum/EVM, Aleph Zero, cross-chain bridges, smart contracts (ink!, Solidity) |
| **DevOps** | AWS (CloudFront, EC2, Lambda, S3, CloudWatch), Docker, Kubernetes, GitHub Actions |
| **Databases** | PostgreSQL, Firebase, Redis, Cassandra, ElasticSearch |
| **Messaging** | Kafka, RabbitMQ, SQS |
| **APIs** | REST, gRPC, GraphQL |
| **Frameworks & Libraries** | REVM, Foundry, Halo2, Arkworks, Tokio, Substrate, ethers, Nvidia CUDA |
| **Other** | CAS: Sage, Maxima. Typesetting: LaTeX. Literate programming: org-mode. Statistics & ML: R |

## Experience

### [Alongside Finance](https://www.alongside.xyz/) / [Universal](https://www.universal.xyz/) -- Senior Engineer (2025 - present)

- Developing AI-powered agentic compliance solutions for blockchain-based financial systems, leveraging LLMs, RAG pipelines, and autonomous agents
- Building DeFi and fintech products at [Universal](https://www.universal.xyz/), a platform for cross-chain digital asset management

### [Cardinal Cryptography](https://cardinalcryptography.com) -- Senior Blockchain Engineer (2021 - 2025)

- Designed and built the relayer for the [MOST bridge](https://mo.st/), handling cross-chain communication between Substrate and Ethereum
- Built [The Button](https://alephzero.org/the-button), an on-chain game demonstrating Aleph Zero's fast finality
- Co-implemented Halo2 circuits for the [Shielder](https://docs.alephzero.org/aleph-zero/protocol-details/shielder) privacy protocol, enabling zk-SNARK-based confidential transactions
- Contributed to the Rust implementation of [Aleph Zero](https://github.com/Cardinal-Cryptography/aleph-node) blockchain node based on the [Substrate](https://polkadot.com/platform/sdk/) framework

### Clash -- Cofounder Engineer (2020 - 2021)

- Designed and developed backend infrastructure for a mobile video-sharing social app
- Researched [architecture solutions](https://www.blog.nodrama.io/cqrs-and-event-sourcing/) and developed [early prototypes](https://www.blog.nodrama.io/rust-websocket/)
- Built devops infrastructure, continuous delivery as well as client and backend services monitoring & alerting
- Designed and implemented an AWS-based serverless S3 data lake and ingestion pipeline
- Built a [recommendation model](https://www.youtube.com/watch?v=RG4g0Wd_elo) using Rust, Spark, and TensorFlow
- Co-developed much of the client code for the mobile application, leveraging ClojureScript compiled to ReactNative ([blog post](https://www.blog.nodrama.io/react-native-xcode-linux/))

### [District0x](https://district0x.io) -- Senior Clojure Engineer (2017 - 2020)

- Built decentralized marketplaces ([MemeFactory](https://memefactory.io/), [NameBazaar](https://github.com/district0x/name-bazaar)) with on-chain data models and event-driven architectures on Ethereum
- Developed shared libraries and tooling for the [district0x platform](https://github.com/district0x)

### [LambdaWerk](https://www.lambdawerk.com) -- Functional Software Engineer (2017)

- Built healthcare data processing microservices with RabbitMQ messaging and REST APIs

### [Trimble T&L](https://trimble.com/) -- Java Developer (2016 - 2017)

- Developed logistics apps analyzing real-time truck telemetry data (CAN bus, GPS)
- Migrated authentication and user management to [Keycloak](http://www.keycloak.org/)

### KU Leuven, Rega Institute for Medical Research -- Researcher (2011 - 2016)

- Co-developed the [BEAGLE](https://github.com/beagle-dev/beagle-lib) high-performance computing library: massively parallel GPU-accelerated (NVIDIA CUDA) likelihood computations over large-scale genomic datasets
- Built multi-dimensional statistical models for inferring heterogeneous evolutionary processes -- published in [Systematic Biology](https://academic.oup.com/sysbio/article/63/4/493/2848077)
- Created [SpreaD3](https://github.com/phylogeography/SpreaD3), a spatiotemporal data visualization platform; still widely cited and used worldwide

## Open Source Contributions

| Year | Project | Description |
|------|---------|-------------|
| 2026 | [**backoff**](https://github.com/ihrwein/backoff) | Contributed to popular Rust exponential backoff crate ([PR](https://github.com/ihrwein/backoff/pull/76)) |
| 2025 | [**datadog-tracing**](https://github.com/will-bank/datadog-tracing) | Upgraded Rust OpenTelemetry + Datadog integration to OpenTelemetry v0.31.x ([PR](https://github.com/will-bank/datadog-tracing/pull/7)) |
| 2024 - 2025 | [**MoonMath Manual**](https://github.com/LeastAuthority/moonmath-manual) | Contributed fixes to open educational resource for understanding zk-SNARKs |
| 2023 - 2024 | [**Polkadot Blockchain Academy**](https://polkadot.network/development/academy/) | Authored ink! smart contract lecture materials and hands-on exercises ([content](https://github.com/Polkadot-Blockchain-Academy/pba-content), [exercises](https://github.com/Polkadot-Blockchain-Academy/Ink_hands-on)) |
| 2023 | [**Poseidon377**](https://github.com/penumbra-zone/poseidon377) | Made Poseidon hash function WASM compatible for zero-knowledge systems ([PR](https://github.com/penumbra-zone/poseidon377/pull/35)) |
| 2022 | [**cargo-contract**](https://github.com/use-ink/cargo-contract) | Refactoring PR to official ink! WASM smart contract tooling ([PR](https://github.com/use-ink/cargo-contract/pull/597)) |
| 2021 | [**load-test**](https://github.com/fbielejec/load-test) | High-throughput Rust tool for API load testing |
| 2020 | [**rust-opencv**](https://github.com/fbielejec/rust-opencv) | OpenCV bindings and examples in Rust (14 stars) |
| 2020 | [**rust-tensorflow**](https://github.com/fbielejec/rust-tensorflow) | Running TensorFlow models from Rust for the recommendation engine [talk](https://www.youtube.com/watch?v=RG4g0Wd_elo) |
| 2019 | [**cljs-firebase-client**](https://github.com/fbielejec/cljs-firebase-client) | ClojureScript client library for Firebase (22 stars, [blog post](https://www.blog.nodrama.io/clojurescript-firebase-library/)) |
| 2017 - 2020 | [**district0x**](https://github.com/district0x) | IPFS client ([GitHub](https://github.com/district0x/cljs-ipfs-http-client)), OrbitDB client ([GitHub](https://github.com/district0x/cljs-orbitdb)), Ethlance, MemeFactory, and core libraries |
| 2018 - 2019 | [**lein-solc**](https://github.com/fbielejec/lein-solc) | Leiningen plugin for compiling Solidity smart contracts, with macro-preprocessor |
| 2011 - 2016 | [**BEAST**](https://github.com/beast-dev/beast-mcmc) / [**Beagle**](https://github.com/beagle-dev/beagle-lib) | Widely-used Bayesian evolutionary analysis framework; co-developed the high-performance computing library |

## Education

- **2025** -- [Zero Knowledge Proofs](https://rareskills.io/zk-bootcamp) -- Workshop on Zero Knowledge protocols, mainly Groth16
- **2011 - 2015** -- KU Leuven, Rega Institute for Medical Research -- *Doctoral Training in Bioinformatics*
- **2009 - 2010** -- Ghent University -- *Master of Statistical Data Analysis Programme*
- **2005 - 2010** -- Technical University of Lodz -- *Master in Mathematical Methods In Computer Science*

## Selected Publications & Talks

- **2022** -- *SPREAD 4: online visualisation of pathogen phylogeographic reconstructions* -- [Virus Evolution 8 (2)](https://academic.oup.com/ve/article/8/2/veac088/6717755)
- **2021** -- *Making recommendations with Rust and Tensorflow* -- [Virtual Lunch & Learn](https://www.youtube.com/watch?v=RG4g0Wd_elo&t=1s)
- **2019** -- *How to constrain your function inputs without the overhead of types?* -- Functional Programming Meetup, Leuven
- **2013** -- *piBUSS: a parallel BEAST/BEAGLE utility for sequence simulation* -- [BMC Bioinformatics 2014, 15:133](https://bmcbioinformatics.biomedcentral.com/articles/10.1186/1471-2105-15-133)
- **2013** -- *Inferring large-scale heterogeneous evolutionary processes through time* -- [Systematic Biology, Volume 63, Issue 4](https://academic.oup.com/sysbio/article/63/4/493/2848077)
- **2012** -- *Massive parallelization of likelihood computations through graphics processing units* -- Bioinformatics Meeting, Leuven
