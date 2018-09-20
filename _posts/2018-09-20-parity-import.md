---
layout: post
title: How to import raw private keys into Parity?
comments: true
categories:
- blockchain
- ethereum
- parity
- geth
- metamask
---

# <a name="intro"> Intro </a>

In this post we will go over importing an existing ethereum account into Parity.
Unfortunately there is no standard for exporting and importing ethereum accounts between MetaMask, Geth and Parity, table below summarizes what is currently supported by the software:

|               |                 | Metamask  | go-ethereum | parity |
|---------------|-----------------|:---------:|:-----------:|:------:|
| private key   | import / export |+/+        |+/-          |-/-     |
| keystore file | import / export |+/-        |+/+          |+/      |

---
**What is a keystore file?**

An Ethereum keystore file is a file in JSON format which is an encrypted version of your unique Ethereum private key. 
Basically together with a passphrase this file forms the private key. 
For that exact reason it is safer to access your funds with a keystore file and a passphrase, rather than directly with an unencrypted private key.

---

# <a name="prerequisites"> Prerequisites </a>

You will need a browser with a [MetaMask](https://metamask.io/) extension, and an ethereum account created.
We will assume this account belongs to the ethereum [Ropsten](https://ropsten.etherscan.io/) testnet, but exactly the same steps can be followed for a mainnet account.

You will also need [geth](https://github.com/ethereum/go-ethereum) ethereum implementation, which you can install with:

```bash
sudo add-apt-repository -y ppa:ethereum/ethereum
sudo apt-get update
sudo apt-get install ethereum
```

Finally you need [Parity](https://github.com/paritytech/parity-ethereum/releases) software insatlled and on you `PATH`.

# <a name="export"> Exporting MetaMask private key </a>

From MetaMask select **Export private key**:

![_config.yml]({{ site.baseurl }}/images/2018-09-20-parity-import/2018-09-20-1537453850_screenshot_1920x1080.jpg)

Copy the private key and paste it into a file called `pass.txt`

# <a name="geth-import"> Import the private key to geth </a>

Import the acount private key into geth:

```bash
geth --testnet account import ~/pass.txt
```

Geth will prompt (twice) for a passphrase to encypt the keystore file.
Choose, or better yet generate, and store it offline with a password manager.

Geth will create a keystore file in `~/.ethereum/testnet/keystore/`

# <a name="parity-import"> Import the keystore file into parity </a>

You can now use the `import` command to import the keystore file into parity, which expects a path to the directory containing the file(s):

```bash
parity --chain=ropsten account import ~/.ethereum/testnet/keystore/
```

If you see:

``` bash
1 account(s) imported
```
then everything went fine.
Parity stores the keystore files in:
`/home/filip/.local/share/io.parity.ethereum/keys/test`

Go ahead and start syncing the chain.
To unlock the account you will need to paste the passphrase into a separate tet file `pass.txt` and give parity the path to it:

```bash
parity --chain=ropsten --unlock 0x76136f7a41e4cec95f1dffe5a8cf4a73bcd5727b --password ~/pass.txt
```

---
**NOTE**

You can feed you account with some fake ETH using the testnet faucet here:
https://faucet.ropsten.be/
---
