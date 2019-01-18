---
layout: post
title: Using lein-solc with truffle
comments: true
categories:
- ethereum
- solidity
- smart contracts
- blockchain
- solc
- compilation
- lein-solc
- workflow
---

# <a name="intro">Intro</a>

[Truffle](https://truffleframework.com/truffle) is a part of a larger smart contract development framework.
Like a sort of swiss-army-knife for smart-contracts development it bring many benefits, but it really shines when it comes to smart contract deployment and migration.

Truffle lets you write simple deployment scripts and will keep track of deployed contracts and their addresses against all of the configured ethereum networks.
For details best consult truffle's comprehensive [documentation](https://truffleframework.com/docs/truffle/getting-started/running-migrations).

There are some downsides though.

- Truffle has no `--no-compile` flag and will start by compiling the contracts before migrating them at the start of the session.
- There is no _watch_ mode for `truffle compile` to autocompile the contracts on source code changes.
- Current stable version of truffle (`4.X` at the time of writing) uses [solc.js](https://www.npmjs.com/package/solc), rather than the native compiler, which is significantly slower. Future versions of Truffle (since `5.X`) should support [setting custom compiler](https://github.com/trufflesuite/truffle/issues/265).

All of these problems can be mitigated by using [lein-solc](https://github.com/fbielejec/lein-solc) plugin for compiling smart-contract code, and relying on truffle just for deploying them.
In this post we will go over setting up a workflow that allows to do just that.

# <a name="requirements">Requirements</a>

We will assume [native solc compiler](https://solidity.readthedocs.io/en/v0.4.24/installing-solidity.html#binary-packages) is installed an availiable on your `PATH`.
You can quickly get the version `0.4.24` of the compiler with these commands:

```bash
sudo wget -P /bin https://github.com/ethereum/solidity/releases/download/v0.4.24/solc-static-linux
sudo chmod a+x /bin/solc-static-linux
sudo ln -s /bin/solc-static-linux /usr/bin/solc
```
We will also assume that [leiningen](https://leiningen.org/) is installed.
Obviously you will also be needing *truffle* and the [ganache](https://github.com/trufflesuite/ganache-cli) testrpc:

```bash
npm install -g truffle
npm install -g ganache-cli
```

# <a name="creating">Creating a project</a>

You can create a bare Truffle project by issuing this command in the root directory :

```bash
truffle init
```

Project directory will now _i.e_. contain these files and directories:

- *contracts/* : Directory for smart contracts
- *migrations/* : scriptable deployment files
- *truffle.js* : truffle config file

Lets create a very basic `TestContract.sol` inside the *contracts/* directory:

```solidity
pragma solidity ^0.4.24;

contract TestContract {

  uint public value;

  constructor(uint _value)
    public {
    value = _value;
  }

}
```

We now need a migration script, which we can call `2_lein_solc_migration.js`, created inside the *migrations/* directory:

```javascript
var TestContract = artifacts.require ('TestContract');

module.exports = function(deployer, network, accounts) {
  const address = accounts [0];
  const opts = {gas: 4e6, from: address};

  deployer.deploy (TestContract, 1, Object.assign(opts, {gas: 500000}));
}
```

Inside the `truffle.js` config file we specify the host and port where the ganache testrpc will be availiable on:

```javascript
module.exports = {
  networks: {
    ganache: {
      host: 'localhost',
      port: 8549,
      network_id: '*'
    }
  }
};
```

# <a name="lein-solc">Compiling smart contracts with lein-solc</a>

To bring lein-solc to the project we need to create `project.clj` file with the plugins config:

```clojure
(defproject lein-solc-truffle "1.0.0"
  :description "Using lein-solc for compiling truffle artifact"
  :plugins [[lein-solc "1.0.11"]]

  :solc {:src-path "contracts"
         :build-path "build/contracts/"
         :abi? false
         :bin? false
         :truffle-artifacts? true
         :contracts :all})
```

Truffle artifacts are supported since version `1.0.11` of the plugin, and that's the version we will usem we also give it the path where contract sources reside, tell it where to output the resulting artifacts and to skip generating separate files with the bytecode and abi.
For the other options and the explanation you can consult the official [documentation](https://github.com/fbielejec/lein-solc#usage).

With that in place we can compile the contracts:

```bash
lein solc
```

To start the plugin in watch mode and autocompile on changes:

```bash
lein solc auto
```

After it finishes the `TestContract.json` artifact is created inside the *`build-path`* directory.
If we examine it, truffle artifacts are just JSON envelopes around the compiled *abi* and *bytecode*, with some additional information truffle uses for book-keeping of the deployed contracts.

# <a name="deploying">Deploying the contracts</a>

We will be deploying the contracts to the development testrpc, that we start on the localhost port `8549`, same as we specified in the `truffle.js` config file:

```bash
ganache-cli -p 8549
```

To run the migration script and deploy the contracts we invoke truffle, specifying the network (by its name from the `truffle.js` config) and using the `--reset` option to run all the migrations from the beginning (effecively redeploying the contracts if they existed on the network before):

```bash
truffle migrate --network ganache --reset
```

Any changes to the contracts will be recompiled by the lein-solc, provided it is running in the watch mode, and we can redeploy them again with truffle, speeding up the development cycle.

# <a name="interacting">Interacting the contracts</a>

To confirm the dpeloyment went fine, and the contracts are availiable on the network we can open the truffle JS console:

```bash
truffle console --network ganache
```

Truffle injects all the deployed contracts, so we can simply call:

```javascript
TestContract.at(TestContract.address).value();
```

and get the `value` set in the contract's constructor as a response.

# <a name="conclusions">Conclusions</a>

Proposed workflow is obviously just one of many, but hopefully you can find it usefull.

I maintain a [repository](https://github.com/fbielejec/lein-solc-truffle/blob/master/project.clj) with an extended version of the example that we just went through.
There are several contracts deployed, and the migration script covers some more advanced deployment steps, like linking contracts via their bytecode and using `delegatecall` in MutableForwarder to create updateable instances of the contracts.

Thanks for reading!
