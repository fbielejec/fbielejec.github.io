---
layout: post
title: Writing Substrate runtime migrations
author: Filip Bielejec
comments: true
categories: [Rust, Substrate, runtime, migrations, blockchain, polkadot, dot]
summary: "writing storage migrations for substrate based chains"
---

# <a name="intro"/> Introduction

One of the defining features of [Substrate](https://docs.substrate.io/) based blockchains is the ability to perform forkless updates to it's own runtime.
This is made possible by the fact that the runtime, i.e. the state transition function, is the part of overall blockchain state.

The upgrade itself is pushed (as a transaction) to the nodes participating in the consensus, and they can agree on it as part of the normal chain operation.
Thus at some block, the definition of the state transition function changes, as depicted below:

![_config.yml]({{ site.baseurl }}/images/2021-12-01-substrate-runtime-storage-migrations/runtime_updates.png)
<sup>[1](#footnote1)</sup>

<!-- TODO : image description -->

There is a couple of important differences between performing regular transactions and runtime updating ones, however for the purpose of this document one of the most important is the fact that they are not additive, they can bring consensus breaking logic, thus it is important to version them accordingly.

---
**NOTE**

In order for the node to be able to select the appropriate runtime execution environment, Substarte uses a special [RuntimeVersion](https://docs.substrate.io/rustdocs/latest/sp_version/struct.RuntimeVersion.html) struct.
After the runtime is upgraded it's Wasm binary is stored as part of the blockchain state (i.e. under a known storage key) and the runtime [executor](https://docs.substrate.io/v3/advanced/executor/) chooses between the native and wasm compiled runtime based on a set of [rules](https://docs.substrate.io/v3/advanced/executor/#execution-strategy).
It is therefore paramount to increase the version of the runtime when introducing any changes, as it is the only mechanism at the executors disposal to be able to choose the updated one, else it will fall back to using the native runtime.

---

# <a name="whatare"/> What are storage migrations and when do you need to write them?

<!-- Another important difference between lies in the fact that  -->
The runtime logic changes can implicitly change the schema of the blockchain state.
You can think of it as of schema changes in a regular, centralized storage, like a database - if the state does not conform to the logic, it will inevitably break.
One example would be an update that expects a different type for a storage value: say *i32* (signed integer) to *u32* (an unsigned int).

This is when you will need to include a storage migration that transforms the state from the previous one, into the one that the updated logic expects.
In another words storage migrations are a special kind of one-time functions that allow to normalize the existing storage schema into an updated one.

# <a name="order"/> Ordering of migrations

Substrate [defines](https://github.com/paritytech/substrate/blob/d766e229466d63afadd19097e277d85146fee3c9/frame/executive/src/lib.rs#L231-L257) a strict order in which storage migrations are applied. <sup>[2](#footnote2)</sup> FRAME storage migrations will run in the following order (since [this](https://github.com/paritytech/substrate/commit/bd8c1cae434dd6050833555e14967e3cd936e004) commit):

- Custom `on_runtime_upgrade`
- `frame_system::on_runtime_upgrade`
- All `on_runtime_upgrade` functions defined in all included pallets, in the reverse order of their declaration (as defined in the `construct_runtime!` macro)

Next in the execution order are these functions: 

- `frame_system::initialize`
- `frame_system::on_initialize`
- All pallet `on_initializes` in the reverse order of their declaration (as defined in the `construct_runtime!` macro)

As a runtime developer you will likely mostly deal with the FRAME (aka pallet) storage migrations.
These are implemented via the [Hooks](https://docs.substrate.io/rustdocs/latest/frame_support/pallet_prelude/trait.Hooks.html) traits `on_runtime_upgrade` function, for example:

```rust
#[pallet::hooks]
impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
    fn on_runtime_upgrade() -> frame_support::weights::Weight {
        do_migrate::<T, Self>()
    }
}
```

---
*NOTE*

Substrate documentation mentions [OnRuntimeUpgrade](https://docs.substrate.io/rustdocs/latest/frame_support/traits/trait.OnRuntimeUpgrade.html)
as the go to trait for implementing migrations hooks [here](https://docs.substrate.io/v3/runtime/upgrades/#storage-migrations-with-frame), however none of the pallets actually uses it, so this information is likely outdated.

---

Couple notes here:

Because of the [ordering](#ordering) this function will be called before `on_initialize` initializes the runtime.
This means that many of the runtime state information will not be available to it, such as the currently block number or block local data. 
The function returns the weight consumed by performing the runtime upgrade.

A natural question to ask is whether you can override the default migrations order, which might be needed in some complex scenarios. The answer is yes you can, via the so-called Custom `on_runtime_upgrade` which runs before any pallet specific migrations are run.

An example custom runtime upgrade that executes the balances pallet migration before the accounts migration:

```rust
mod custom_migration {
	use super::*;

	use frame_support::{traits::OnRuntimeUpgrade, weights::Weight};
	use pallet_balances::migration::on_runtime_upgrade as balances_upgrade;
	use frame_system::migration::migrate_accounts as accounts_upgrade;

	pub struct Upgrade;
	impl OnRuntimeUpgrade for Upgrade {
		fn on_runtime_upgrade() -> Weight {
			let mut weight = 0;
			weight += balances_upgrade::<Runtime, pallet_balances::DefaultInstance>();
			weight += accounts_upgrade::<Runtime>();
			weight
		}
	}
}

/// Executive: handles dispatch to the various modules.
pub type Executive = frame_executive::Executive<Runtime, Block, frame_system::ChainContext<Runtime>, Runtime, AllModules, custom_migration::Upgrade>;
```

# <a name="writing"/> Writing migrations

## <a name="versioning"/> Versioning

One crucial thing you need to have in mind when writing migrations in Substrate is that they have no rollback, thus you want to make sure the are correct and applied correctly.

First thing to do is to include storage version checks, that assure you are migration from the correct version and that the migration will execute only once.
[StorageVersion](https://docs.substrate.io/rustdocs/latest/frame_support/traits/struct.StorageVersion.html) is used to store a single *u16* that defines the current on-chain version of the pallet.
Frame has a attribute macro for defining it, that creates a storage value under a `:__STORAGE_VERSION__:` key with the prefix being the pallet name:

```rust
#[pallet::pallet]
#[pallet::storage_version(STORAGE_VERSION)]
pub struct Pallet<T>(sp_std::marker::PhantomData<T>);
```

If your pallet does not define it, it's version will default to *0u16*
It has some other utility functions defined, notably it differentiates between the on-chain storage version and the current pallets version.
You can use that fact to write "guards" that assert when to apply a given migration, e.g.:

```rust
let on_chain_storage_version = <P as GetStorageVersion>::on_chain_storage_version();
let current_storage_version = <P as GetStorageVersion>::current_storage_version();

if on_chain_storage_version == 1 && current_storage_version == 2 {
  /// migration logic 

 // update version
 StorageVersion::new(2).put::<P>();
}
```

Notice how you, the pallet migration author are responsible for setting the correct storage version *after* the migration runs.

---
*NOTE*

Older Substrate versions (before [this commit](https://github.com/paritytech/substrate/pull/7208)) used a different versioning scheme, based on a macro that pulled a semver from the pallets `Cargo.toml` file.
This is now deprecated, and if needed, you can apply the following one-time custom migration that migrates from `PalletVersion` to the `StorageVersion`.

```rust
pub struct MigratePalletVersionToStorageVersion;

impl OnRuntimeUpgrade for MigratePalletVersionToStorageVersion {
	fn on_runtime_upgrade() -> frame_support::weights::Weight {
		frame_support::migrations::migrate_from_pallet_version_to_storage_version::<AllPalletsWithSystem>(
				&RocksDbWeight::get()
		)
	}
}

pub type Executive = frame_executive::Executive<
    Runtime,
    Block,
    frame_system::ChainContext<Runtime>,
    Runtime,
    AllPallets,
    MigratePalletVersionToStorageVersion
>;
```

---

Migrations mean transforming the data from the *old* to the *new* runtime perspective.
That means you might have to include deprecated types as part of it.
[generate_storage_alias!](https://docs.substrate.io/rustdocs/latest/frame_support/macro.generate_storage_alias.html) macro is of great use here.

When it comes to all kinds of available data manipulations take a look at the [StorageValue](https://docs.substrate.io/rustdocs/latest/frame_support/pallet_prelude/struct.StorageValue.html) trait.

Including ample logging, that will help you find any problems as well as assert that the migration was applied successfully.

# <a name="testing"/> Testing migrations

You can and in fact you should test your migrations thoroughly as you do not want to end up with a bad storage.
You should assert them both in a unit-test scenario as well as on a live data.

## <a name="unit"/> Unit tests

Unit tests could be as simple as:

- Populate the storage of a `new_test_ext` environment (see [frame_support::migration::put_storage_value](https://crates.parity.io/frame_support/storage/migration/fn.put_storage_value.html)).
- Run the migration function.
- Assert the correct shape of the new data.

## <a name="live"/> Manual tests

Finally you can perform manual test on a live chain using a tool like [fork-off-substrate](https://github.com/maxsam4/fork-off-substrate) to get a snapshot of a chain state and apply the upgrade extrinsic on it.

# <a name="howto"/> Executing migrations

Any migrations will be executed, in the order defined [here](#ordering), as part of a [runtime upgrade procedure](https://docs.substrate.io/tutorials/v3/forkless-upgrades/).

Rough steps are:

1. Compile the updated wasm runtime binary

```bash
cargo build --release -p aleph-runtime
```

2. execute the `setCode` extrinsic (signed by the sudo account):

![_config.yml]({{ site.baseurl }}/images/2021-12-01-substrate-runtime-storage-migrations/set_code.png)

# <a name="removal"/> Removing migrations

Substrate [recommends](https://hackmd.io/BQt-gvEdT66Kbw0j5ySlWw#6-Removal) removing the migrations from the `on_runtime_upgrade` hook in time for the next runtime upgrade, but leaving them along the pallet code for reference and documentation.
They also started using a [E1-runtimemigration label](https://github.com/paritytech/substrate/issues?q=label%3AE1-runtimemigration) to mark past PRs that contain runtime migrations.

# <a name="substrate"/> Substrate version updates and FRAME migrations

If you are not a pallet author and are running migrations already included in the FRAME pallets you are still responsible for taking some care in applying them.
There will *always* be some manual work necessary for any one of these cases. 

At the very minimum you are responsible for checking the [changelog](https://github.com/paritytech/substrate/releases) for past migrations and applying them in the correct order.

# <a name="reading"/> Further reading

- https://github.com/apopiak/substrate-migrations
- Migrations Guide https://hackmd.io/BQt-gvEdT66Kbw0j5ySlWw
- https://docs.substrate.io/v3/runtime/upgrades/
- https://docs.substrate.io/how-to-guides/v3/storage-migrations/basics/
- Improve Migration Support: https://github.com/paritytech/substrate/issues/6482
- Migration examples from Substrate repository https://github.com/paritytech/substrate/issues?q=label%3AE1-runtimemigration

---
<a name="footnote1">1</a>: Image courtesy of [DamianStraszak](https://github.com/DamianStraszak)
<a name="footnote2">2</a>: Taken from https://hackmd.io/BQt-gvEdT66Kbw0j5ySlWw
