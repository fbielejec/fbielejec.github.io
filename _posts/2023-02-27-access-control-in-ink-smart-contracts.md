---
layout: post
title: Implementing access control for smart contracts written in ink!
author: Filip Bielejec
comments: true
categories: [rust, ink!, smart-contracts, substrate]
summary: "We discuss implementing access-control - a fine grained mechanism for controlling who and under what circumstances can perform particular actions that alter the state of your contracts."
---

---

**TLDR**

*Here we discuss implementing access-control - a fine grained mechanism for controlling who and under what circumstances can perform particular actions that alter the state of your contracts.*

---

# <a name="prerequisites"/> Prerequisites

This post assumes a basic understanding of smart contracts development.
Specifically one should be aware of what a smart contract (SC) is, what are the limitations and a how does a general model of SC execution look like.

Since [Ethereum Virtual Machine](https://ethereum.github.io/yellowpaper/paper.pdf) is likely the most ubiquitous smart contracts virtual machine (VM), with Solidity being a de-facto standard programming language for SC development, many of the lessons learned there will apply to [ink!](https://docs.substrate.io/tutorials/smart-contracts/) directly.
If you have ever written even a few lines of Solidity code you will feel right at home, or perhaps even better, with ink!.

However emerging platforms for SC development improve upon Solidity and EVM in many places.
In this blog post we will highlight any differences and explain why and how these drive the design choices that we made.

# <a name="intro"/> Introduction

WebAssembly (WASM) is a binary instruction format, that was designed in order to bring high-performance capabilities to the web clients (such as the browsers).
It is an open standard that is already supported by a great many programming languages.

Despite it's initial design goals, WASM makes no assumptions about the execution environment, meaning there is nothing web or even operating-system specific about it.
WASM is /just/ a binary instruction format for a stack-based virtual machine.

What this means is it's utility goes way beyond the web.

One of the applications where WASM quickly made it's way into is the smart contracts development.
There are several advantages over languages like Solidity:
- They can execute much faster, which in environments such as the distributed ledger leads to a lower gas fees.
- They can be written in almost any language that has WASM as a compilation target, and in principle deployed to any chain with support for the WASM execution.
- They can enjoy access to a vast collection of libraries, as well as reuse existing tooling, that does not necessarily have to come from the community of smart contract developers.
- Other goodies: 64 bit integer support, deterministic execution guarantees, LLVM compatible intermediate representation

# <a name="substrate"/> Substrate

Now in the light of all the [points mentioned above](#intro) one might wonder why do we even bother writing smart contracts in Solidity.
Well, it's not that simple.
First of all there is a large, valuable EVM ecosystem created over the years, with contracts processing hundreds if not billions of dollars daily.
There is immense tooling, libraries. frameworks and know-how along with battled developers that have been creating EVM contracts for many years now.

![_config.yml]({{ site.baseurl }}/images/2023-02-27-access-control-in-ink-smart-contracts/meme1.jpg)

Finally, like in the meme, one cannot simply deploy a WASM contract to an EVM chain such as Ethereum that does not support WASM execution.
I will say more, even the platforms that do support WASM are not necessarily fully compatible, in the sense that taking a smart contract written for say [Solana](https://solana.com/) and deploying it to for example [NEAR](https://near.org/) is not going to work out-of-the-box - we might get there someday though.

Instead even WASM compatible chains usually employ some sort of a domain-specific language (DSL) for smart contracts that is eventually compiled to a WASM binary.
That is because smart contract code needs to be instrumented, often needs to call into a specific logic or runtime of the chain it will be deployed on or interact with it in some other proprietary way.

One such DSL is the [ink!](https://github.com/paritytech/ink), a Rust-based language for smart contracts intended to be deployed on Substrate chains.

# <a name="problem"/> Problem statement

<!-- When it comes to smart contracts there are certain mechanism that incentivize reducing the occupied storage space. -->

On-chain storage is expensive, and the Substrate-based chains are no exception.
That is why Substrate's SC pallet has a separation between the SC code and it's instance.

Think of Ethereum and just how many instances of a basic ERC20 contract are there - thousands if not tens of thousands.
Huge waste of a valuable on-chain real estate!

In the Substrate model there can be multiple instances of a given contract created from the code that is uploaded to the chain just once - think of a variable and having multiple reference's to it's value.
You are incentivized, by getting your storage deposits back, to eventually be removing both if they ar enot needed - with the caveat that only if the reference counter goes to 0 can you remove the actual SC code from the chains storage.

Now let's take a look at the following code snippet of an ink! code:

```rust
#[ink(message)]
pub fn terminate(&mut self) -> Result<()> {
  let caller = self.env().caller();
  self.env().terminate_contract(caller)
}
```

This function is a callable message that can be invoked by a human or by another contract.
Third line gets the callers address and fourth passes it to the `terminate_contract` that removes that contract's instance along with it's occupied storage and returns the deposit to the caller.

What is the problem here?
Well, anyone can call into this function, meaning anyone can wipe our precious contract and claim the deposit.
Not good, we need a way of controlling who can call `terminate`.

## <a name="ugly"/> The ugly solution

One possible solution is to simply hard-code an address that can call the method and check against it during the execution.
Here is the body of the method where we check whether the caller is `Alice` and revert if she is not:

```rust
let caller = self.env().caller();
if !caller.eq(&AccountId::from([
  0xd4, 0x35, 0x93, 0xc7, 0x15, 0xfd, 0xd3, 0x1c, 0x61, 0x14, 0x1a, 0xbd, 0x04, 0xa9,
  0x9f, 0xd6, 0x82, 0x2c, 0x85, 0x58, 0x85, 0x4c, 0xcd, 0xe3, 0x9a, 0x56, 0x84, 0xe7,
  0xa5, 0x6d, 0xa2, 0x7d,
])) {
  return Err(PlaygroundError::NotSudo);
}
self.env().terminate_contract(caller)
```

If the caller's address is different from the whitelisted addres the transaction will fail.
This solution is not great but it will get the job done.

## <a name="instantiate"/> Controlling who can instantiate the contract

When stating the original [problem](#problem) we mentioned how the storage deposit for the contract code (remember how in Substrate multiple instances can be created from one on-chain storage of the contract code) can be redeemed only when the reference counter f contract's created as it's instances goes to zero.

Anyone can create an instance, and unless he is so kind to terminate it you might never be able to redeem the deposit.

We need a way of limiting who can create instances of the contract uploaded by us.

## <a name="bad"/> The bad solution

You might be tempted to do this:

```rust
#[ink(constructor)]
pub fn new(sudo: [u8; 32]) -> Self {
  let caller = Self::env().caller();
  if !caller.eq(&AccountId::from(sudo)) {
    panic!("attack");
  }

  Self {}
}
```

But if you allow for passing a controller account in the constructor this is no better than allowing anyone to create their own instance from your code in the first place.
We need a different approach.

## <a name="hard"/> The hard solution

If you control the underlying chain you can add a [chain extension](https://use.ink/macros-attributes/chain-extension) that will return the owner of a particular code hash stored on-chain, make it available to your contract and check if the caller is indeed the owner.
You won't always have that luxury, not to mention that creating, testing and pushing chain updates is a very delicate and time-consuming operation.

Therefore we won't discuss this approach here, instead we will focus on what can be implemented with a smart contract based solution.

## <a name="good"/> The good solution

What if we go back to our first [ugly](#ugly) solution and just re-use it here?
This might just work!

Let's start by storing the 32 bits of the controlling account address as a constant:

```rust
const SUDO: [u8; 32] = [
  0xd4, 0x35, 0x93, 0xc7, 0x15, 0xfd, 0xd3, 0x1c, 0x61, 0x14, 0x1a, 0xbd, 0x04, 0xa9, 0x9f,
  0xd6, 0x82, 0x2c, 0x85, 0x58, 0x85, 0x4c, 0xcd, 0xe3, 0x9a, 0x56, 0x84, 0xe7, 0xa5, 0x6d,
  0xa2, 0x7d,
];
```

The constructor now becomes:

```rust
pub fn new() -> Self {
  let caller = Self::env().caller();
  if !caller.eq(&AccountId::from(SUDO)) {
      panic!("attack");
  }
  Self {}
}
```

So now we control creating and terminating instances of our contract, which is nice.

But what if during the contract's lifetime:
- You want to change the controlling account?
- You want to have multiple controlling accounts.
- You might want different accounts to control the instantiating and a different one to control the process of terminating contract instances.
<!-- - or maybe you have a flipper contract that can be instantiated, can have it's bit flipped and can be terminated, all with different semantics for who controls what action. -->
- You have a complex suite of multiple contracts and want a coherent way of granting, revoking and checking roles?

## <a name="complete"/> The complete solution

At this point it is becoming clear that to address all these points we need a more general solution, especially if you intend to re-use to across different distributed applications (dapps).
[This repository](https://github.com/Cardinal-Cryptography/access-control) contains an example of how you might approach this, so let's walk though the code, starting with the [Flipper](https://github.com/Cardinal-Cryptography/access-control/blob/master/access_control/lib.rs#L0) contract, which is a /hello-world/ of smart contract development.

The storage struct looks as could be expected, with a Boolean field for flipping a bit in contract's storage.
It contains just one extra field with an address that will point to a contract holding information about the access privileges:

```rust
#[ink(storage)]
pub struct Flipper {
  /// bit for flipping
  bit: bool,
  /// access control contract address
  access_control: AccountId,
}
```

Let's now take a look at the body of this contracts constructor:

```rust
let caller = Self::env().caller();

let code_hash = Self::env()
    .own_code_hash()
    .expect("Called new on a contract with no code hash");

let required_role = Role::Initializer(code_hash);
let access_control = AccountId::from(ACCESS_CONTROL_PUBKEY);

match Self::check_role(access_control, caller, required_role) {
    Ok(_) => Self {
        bit: false,
        access_control: AccountId::from(ACCESS_CONTROL_PUBKEY),
    },
    Err(_) => panic!("Missing role"),
}
```

What is going on here?

First we obtain the caller's on-chain address.
Then we read the hash of the contract's code - if you remember how we [talked about](#problem) how contract instances are created multiple times from just one code - this hash is exactly the address in the storage where the contract code resides.

In the next couple of lines we call the Access Control (AC) contract and ask whether the caller has the `Initializer` role assigned to him, for this particular code hash.
If not the constructor will panic and the whole transaction reverts.

There are two other callable methods on this contract: `terminate` and `flip`.

Similarly to the constructor `terminate` will check whether the caller's account is and Admin of this contract's instance - note that at this point the contract is already created, therefore we talk about an instance and instances have addresses - therefore the *Admin* `Role` is an enum over `AccountId`.

The `flip` method checks a `Custom` `Role` - as there can be myriad of options they can be encoded in an application specific way using an enum variant with 4 bytes, giving you plenty of options to encode some access semantics that work for your application.
Here the hex number *0x666C6970* simply encodes the word *flip* in ASCII.

Let's now take a look at the actual [Access Control](https://github.com/Cardinal-Cryptography/access-control/blob/master/access_control/lib.rs#L0) contract.

There are some top level constant it defines.
First one is the placeholder for the address of the AccessControl contract itself.
It is not used in the contract, but it's exported to be used as a dependency.
Contract that use AC can replace this address in their bytecode once the AC on-chain address is known.
Consult the [deployment script](https://github.com/Cardinal-Cryptography/access-control/blob/master/deploy.sh#L15) to see how this happens in practice.

Another constant is the selector for the `has_role`, a method that other contracts call to check if the caller has a given role that allows him or her to execute a given transaction.

Entire contract revolves around this data structure:

```rust
pub privileges: Mapping<(AccountId, Role), ()>,
```

It is a record of unique address and role tuples, to which we can add or remove accounts.
Notice how the constructor gives the caller and `Admin` role over itself:

```rust
privileges.insert((caller, Role::Admin(this)), &());
```

Another snippet pf code worth looking at is perhaps the `Role` enum:

```rust
pub enum Role {
    /// Indicates a superuser of a contract.
    Admin(AccountId),
    /// Indicates account that can initialize a contract from a given code hash.
    Initializer(Hash),
    /// Indicates a custom role with a 4 byte identifier that can have application-specific semantics
    Custom(AccountId, [u8; 4]),
}
```

It has three variants:
- `Initializer` of code_hash - an account that can spawn an instance of a contract
- `Admin` of an instance, typically a superuser with some potentially destructive privileges, like halting SC actions, or even terminating it.
- Finally a `Custom` role is meant as an open-ended means to create your own roles, with their own semantics that make sense in the context of whatever dapp you are creating.

There's really not much more to it, but it already gives you a flexible and convenient way of managing access.

# <a name="summary"/> Summary

We started from a very basic [problem](#problem) - how can one limit the access to some methods of a contract to just some authorized accounts.

We have shown a quick and simple method to achieve that, in fact [Openbrush](https://docs.openbrush.io/smart-contracts/access-control/) has created a set of convenient attribute macro modifiers that allow you to crate a very similar functionality with as little boilerplate as possible.

Then we talked about how one can control the access to the actual constructor of a contract.
This lead us to the conclusion that centralizing access control in one contract and making other contracts call it is a very convenient way to design such a feature.

Finally we walked through one possible [implementation](https://github.com/Cardinal-Cryptography/access-control) of such a design.
