---
layout: post
title: Optimize contract code
comments: true
categories:
- Clojure
- leiningen
- Solidity
- solc
- blockchain
- ethereum
- optimizations
---

# <a name="intro"/> Intro
Recently when working on a set of smart contracts I ran into an issue, where several of them could not be deployed because the overflow the block gas limit.

---
**What are the costs of deploying a contract?**

As per the [Yellow Paper](https://github.com/ethereum/yellowpaper) there is a `21000` gas **Gtransaction** fee paid on all transaction on the Ethereum network.
To this we need to add `32000` **Gcreate** fee for a contract creation transaction.
Finaly we pay for the transaction data size, that is for the bytecode size of the compiled contract binary, which is respectively:
* **Gtxdatazero** costs of `4` gas per zero byte
* **Gtxdatanonzero** costs of `68` gas per non-zero byte

---

This prompted me to add the support for to the optimizer to the [lein-solc]({% post_url 2018-05-21-lein-solc %}) plugin to ensure that they can be deployed free and clear.

# <a name="using"/> Using the optimizer

Optimizer is suported since version `1.0.2` of the plugin:

```clojure
:plugins [[lein-solc "1.0.2"]]
```

To activate the optimizer for the contracts that rely on it you pass a map with contract filenames as keys and the parameters as values, for example:

```clojure
:solc {:src-path "resources/contracts/src"
       :build-path "resources/contracts/build/"
       :contracts :all
       :solc-err-only true
       :wc true
       :optimize-runs {"MyContract.sol" 1}}
```

# <a name="value"/> Choosing the parameter value

`solc` optimizer works with a linear trade-off between the size of the code (which in turn increases the deployment costs) and the runtime costs (costs of transacting with the contract).
The parameter `n` can take any positive integer value between `0` and +infinity that represents this tradeoff.
Simplifyng a bit we can say it represents how many times the contract will be run after it is deployed.

For example if the contract is to be invoked only once and then subsequently destroyed, a good value would be `1`.
But if the contract is going to get executed hundreds of times than increasing that parameter from its default value of `200` to refelect that is a good idea.
