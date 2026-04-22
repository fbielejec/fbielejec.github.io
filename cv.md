---
layout: page
title: CV
permalink: /cv/
---

## Filip Bielejec

**Engineer-Scientist bridging software engineering, applied cryptography and computational research**

[Email](mailto:filip.bielejec@pm.me) | [Github](https://github.com/fbielejec) | [Blog](https://www.blog.nodrama.io/) | [Google Scholar](https://scholar.google.com/citations?user=5xTmvcYAAAAJ) | [Telegram](https://t.me/FilipBielejec) | Poland (UTC+1)

---

### About Me

Software engineer with over 10 years of professional experience. My background combines rigorous academic research ([Google Scholar](https://scholar.google.com/citations?user=5xTmvcYAAAAJ)) with practical software development, giving me the ability to move seamlessly between abstract problem-solving and concrete system implementation.

I enjoy rapid prototyping, and in the recent years I have specialized in privacy-preserving zero-knowledge cryptography and blockchain infrastructure. I have hands-on experience across multiple blockchain ecosystems---Substrate, Ethereum, and EVM-compatible chains---building cross-chain platform systems, high-throughput async services, and open-source blockchain node contributions. I have a deep understanding of DeFi concepts such as automated market makers (AMMs), tokenomics, and MEV-prevention strategies.

---

### Top Achievements

- **Developed [Spread](https://spreadviz.org/home)**, an open-source platform for visualizing viral spread across time and geography, cited in research and actively used worldwide ([example visualization](https://view.spreadviz.org/?output=6cf3d80f-ed60-4264-bc04-6bfed431a810/f5e9f410-08e9-4ec4-8074-d2dc5d74d087.json&maps=SO,KW,SS,KE,YE,TZ,SY)). Engineering effort included JSON-based data format, animation engine, API, authentication system and storage layer---optimized for minimal costs and fast delivery ([GitHub](https://github.com/phylogeography/spread)).

- **Designed and implemented the relayer component** of the MOST Substrate--EVM Bridge, handling deterministic vs. probabilistic finality, deep reorgs, and building a "circuit breaker" failsafe for guardians ([GitHub](https://github.com/Cardinal-Cryptography/most), [commit](https://github.com/Cardinal-Cryptography/most/commit/15f07f85cba587d38bf8c81087491b3c50f078d7)).

- Built a **streamlined AMM-based decentralized exchange** on Aleph Zero's deterministic L1, showcased in the on-chain game [The Button](https://alephzero.org/the-button) ([code](https://github.com/Cardinal-Cryptography/aleph-node/blob/a3f00540337c6b55f7974f3cedf341898cb33b40/contracts/simple_dex/lib.rs), [blog post](https://www.blog.nodrama.io/how-the-button-is-made/)).

- **Co-developed [Shielder](https://app.common.fi/)**, a Tornado Cash--like mixer with partial de-anonymization, enabling privacy with governance accountability. Implemented in-SNARK ElGamal encryption, Poseidon hash, and optimized Halo2 EC operations ([GitHub](https://github.com/Cardinal-Cryptography/zkOS-circuits), [Poseidon](https://github.com/penumbra-zone/poseidon377), [commit](https://github.com/Cardinal-Cryptography/zkOS-circuits/commit/0ddf37bb6e05b2d644ec19d181a02fd4564a96ca)).

- Active contributor to **zero-knowledge cryptography research**, experimenting with Arkworks, Halo2, Circom, and publishing open notes ([ZK notes](https://github.com/fbielejec/zkSNARKs-notes), [study group](https://github.com/fbielejec/zero_knowledge_proofs/tree/main)).

- **Community engagement**: co-organizer of the Leuven Functional Programming Meetup, technical blogger ([blog.nodrama.io](https://www.blog.nodrama.io)), and instructor for ink! smart contract development at the [Polkadot Blockchain Academy](https://polkadot.network/development/academy/).

---

### Skills

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

---

### Experience

**[Alongside Finance](https://www.alongside.xyz/)** --- Senior Engineer *(2025 - present)*
- Developing AI-powered agentic compliance solutions for blockchain-based financial systems, leveraging LLMs, RAG pipelines, and autonomous agents
- Building DeFi and fintech products at [Universal](https://www.universal.xyz/), a platform for cross-chain digital asset management

**[Cardinal Cryptography](https://cardinalcryptography.com)** --- Senior Blockchain Engineer *(2021 - 2025)*
- Designed and built the relayer for the [MOST bridge](https://mo.st/), handling cross-chain communication between Substrate and Ethereum
- Built [The Button](https://alephzero.org/the-button), an on-chain game demonstrating Aleph Zero's fast finality
- Co-implemented Halo2 circuits for the [Shielder](https://docs.alephzero.org/aleph-zero/protocol-details/shielder) privacy protocol, enabling zk-SNARK-based confidential transactions
- Contributed to the Rust implementation of [Aleph Zero](https://github.com/Cardinal-Cryptography/aleph-node) blockchain node based on the [Substrate](https://polkadot.com/platform/sdk/) framework

**Clash** --- Cofounder Engineer *(2020 - 2021)*
- Designed and developed backend infrastructure for a mobile video-sharing social app
- Researched [architecture solutions](https://www.blog.nodrama.io/cqrs-and-event-sourcing/) and developed [early prototypes](https://www.blog.nodrama.io/rust-websocket/)
- Built devops infrastructure, continuous delivery as well as client and backend services monitoring & alerting
- Designed and implemented an AWS-based serverless S3 data lake and ingestion pipeline
- Built a [recommendation model](https://www.youtube.com/watch?v=RG4g0Wd_elo) using Rust, Spark, and TensorFlow
- Co-developed much of the client code for the mobile application, leveraging ClojureScript compiled to ReactNative ([blog post](https://www.blog.nodrama.io/react-native-xcode-linux/))

**[District0x](https://district0x.io)** --- Senior Clojure Engineer *(2017 - 2020)*
- Helped build [MemeFactory](https://memefactory.io/), a decentralized NFT marketplace powered by [TCL](https://www.gate.com/learn/articles/what-is-token-curated-registry/873) and smart contracts
- Co-developed [NameBazaar](https://github.com/district0x/name-bazaar), a peer-to-peer marketplace for the exchange of names registered via the [Ethereum Name Service](https://ens.domains/)
- Contributed to the [ClojureScript libraries](https://github.com/district0x) and Solidity backend
- Explored novel decentralized architectures leveraging Ethereum and IPFS

**[LambdaWerk](https://www.lambdawerk.com)** --- Functional Software Engineer *(2017)* -- Berlin, Germany
- Developed healthcare software systems for the US market using Clojure/ClojureScript
- Built microservices with RabbitMQ messaging and REST APIs

**[Trimble T&L](https://trimble.com/)** --- Java Developer *(2016 - 2017)* -- Belgium
- Developed logistics apps analyzing truck telemetry (CAN bus, GPS, manual input)
- Implemented geo-awareness features for dispatch center maps
- Migrated authentication and user management to [Keycloak](http://www.keycloak.org/)

**Rega Institute for Medical Research** --- Researcher *(2011 - 2016)* -- Leuven, Belgium
- Co-developed open-source software for viral phylogeography and visualization
- Advanced the high-performance library [Beagle](https://github.com/beagle-dev/beagle-lib) and models in [BEAST](https://github.com/beast-dev/beast-mcmc)
- Created [SpreaD3](https://github.com/phylogeography/SpreaD3) for spatiotemporal visualization; still widely used

---

### Open Source Contributions

- **February 2023** -- Contributed to **Poseidon377**, making the Poseidon hash function [WASM compatible](https://github.com/penumbra-zone/poseidon377/commit/50699746c031a915d5434088a1240f4b568d9ee8) for broader usability in zero-knowledge systems

- **2019** -- Developed a **ClojureScript client library for [Firebase](https://firebase.google.com/)** ([GitHub](https://github.com/fbielejec/cljs-firebase-client), [blog post](https://www.blog.nodrama.io/clojurescript-firebase-library/))

- **2017 - 2019** -- Developed an **IPFS client library for ClojureScript**, enabling decentralized storage access directly in the browser ([GitHub](https://github.com/district0x/cljs-ipfs-http-client))

- **June 2020** -- Built an **OrbitDB client library for ClojureScript**, bringing distributed peer-to-peer databases to web applications ([GitHub](https://github.com/district0x/cljs-orbitdb))

- **2018 - 2019** -- Developed [lein-solc](https://github.com/fbielejec/lein-solc), a Leiningen plugin for compiling Solidity smart contracts, with a macro-preprocessor ([GitHub](https://github.com/fbielejec/lein-solc/commit/43aa24d87a47021810b99249a1a9db3987e13477))

---

### Education

- **2025** -- [Zero Knowledge Proofs](https://rareskills.io/zk-bootcamp) -- Workshop dedicated to the comprehensive understanding of Zero Knowledge protocols, mainly Groth16.

- **2011 - 2015** -- KU Leuven, Rega Institute For Medical Research, Evolutionary and Computational Virology -- *Doctoral Training in Bioinformatics*

- **2009 - 2010** -- Ghent University, Faculty of Sciences, Department of Applied Mathematics and Computer Science -- *Master of Statistical Data Analysis Programme*

- **2005 - 2010** -- Technical University of Lodz, Department of Technical Physics, Computer Science and Applied Mathematics -- *Master in Mathematical Methods In Computer Science*

---

### Selected Publications, Posters & Talks

- **2022** -- *SPREAD 4: online visualisation of pathogen phylogeographic reconstructions* -- K.D. Nahata, F. Bielejec, J. Monetta, S. Dellicour, A. Rambaut, M.A. Suchard, P. Lemey -- [Virus Evolution 8 (2), veac088](https://academic.oup.com/ve/article/8/2/veac088/6717755)

- **2021** -- *Making recommendations with Rust and Tensorflow* -- [Virtual Lunch & Learn](https://www.youtube.com/watch?v=RG4g0Wd_elo&t=1s)

- **2019** -- *How to constrain your function inputs without the overhead of types?* -- Functional Programming Meetup, Leuven, Belgium

- **2013** -- *$\pi$BUSS: a parallel BEAST/BEAGLE utility for sequence simulation under complex evolutionary scenarios* -- Bielejec, F., Lemey, P., Carvalho, L.M., Baele, G., Rambaut, A., Suchard, M.A. -- [BMC Bioinformatics 2014, 15:133](https://bmcbioinformatics.biomedcentral.com/articles/10.1186/1471-2105-15-133)

- **2013** -- *Inferring large-scale heterogeneous evolutionary processes through time* -- Mathematical and Computational Biology, Hameau de l'Etoile, France. Accompanying paper: [Systematic Biology, Volume 63, Issue 4, July 2014, Pages 493-504](https://academic.oup.com/sysbio/article/63/4/493/2848077)

- **2012** -- *Massive parallelization of likelihood computations through graphics processing units* -- Bioinformatics Meeting, Leuven, Belgium.
