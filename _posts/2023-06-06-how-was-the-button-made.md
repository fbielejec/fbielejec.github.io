---
layout: post
title: TheButton: A Smart Contracts-Based Game on Aleph Zero Blockchain
author: Filip Bielejec
comments: true
categories: [rust, ink!, smart-contracts, substrate]
summary: "In this bog post we descibe TheButton, a smart-contract based game deployed on the Aleph Zero blockchain."
---



# <a name="intro"/> Introduction

March 2023 has brought an important milestone the AlephZero: the long-awaited launch of smart contracts capabilites.

In this bog post we welcome you to TheButton, a smart-contract based game deployed on the Aleph Zero blockchain.
Inspired by the famous [Reddit game and social experiment](https://en.wikipedia.org/wiki/The_Button_(Reddit)), TheButton utilizes ink! smart contracts and the lightning-fast finality of Aleph Zero to deliver a captivating gaming experience.

At its core, TheButton features a timer countdown that decreases with each finalized block on the Aleph Zero blockchain.
Players' clicks on the button reset the timer, ensuring its survival for 9,000 blocks (around 25 hours).

With three unique buttons, each governed by different rules, players strategically time their engagement to reap the greatest rewards.

Players utilize ticket tokens (PSP22 standard) to enter TheButton's games and earn reward tokens.
These tokens open the doors to TheButton's Marketplace, where players can partake in a Dutch auction for ticket sales, taking advantage of fluctuating prices.

Additionally, the game introduces the SimpleDex, a Decentralized Exchange that enables seamless swapping between reward tokens and the wAzero token - a PSP22-wrapped native token of Aleph Zero, ensuring liquidity and flexibility.

The integration of the Marketplace and Decentralized Exchange empowers players to devise winning strategies to optimize their rewards, taking advantage of the market conditions.
Aleph Zero's rapid block finality, with blocks produced and finalized every second on average, adds a time-sensitive dimension to gameplay, further fueling strategic thinking.

In the following sections, we will describe the key components that comprise TheButton.
This introductory overview serves as a starting point for our series of technical deep-dives, where we will delve into each component

# <a name="button"/> The Button Contract: Governing Gameplay, Tracking Rewards, and Minting Tokens

At the heart of TheButton lies the Button contract, a pivotal smart contract that governs the game's rules, records player interactions, and mints the rewards.
Let's dive into the inner workings of this crucial component, which forms the backbone of the game's mechanics.

When players enter the game, their interaction with the contract begins by granting permission to the Button contract to spend one ticket token on their behalf.
<!-- This ticket token serves as the entry fee, granting players access to the thrilling gameplay that awaits them.  -->
Upon receiving the ticket, the Button contract records the player's score and initiates the payout of rewards based on the game's specific rules.

The rewards themselves are a PSP22 token, distinct from the ticket tokens used for entry.
The Button contract possesses a special role that grants it the authority to mint these rewards directly into the players' accounts.

As players engage with the game, the Button contract diligently tracks all rewards disbursed throughout the lifespan of the button.
This collection of rewards constitutes the coveted pool for ThePressiah - the individual fortunate enough to make the final click on the button before its demise.
As the game progresses, the Button contract keeps a meticulous record of the rewards paid out, setting the stage for the climax as the countdown timer nears its end.

Once the button's life cycle concludes, and before the next round commences, the designated Pressiah account is bestowed with 50% of the total rewards minted during the preceding round.

To initiate a fresh round, the game can be reset by invoking a specific contract message.
This crucial action serves multiple purposes:
* Firstly, it rewards the Pressiah, acknowledging their achievement.
* Secondly, it transfers all the tickets held by the Button contract to the Marketplace, ensuring their availability for the upcoming round.
* And finally, it resets the state of the contract, effectively wiping the slate clean and paving the way for a new round to begin, brimming with exciting opportunities and heralding the potential rise of a new ThePressiah.

As we journey deeper into TheButton's architecture, we will now unravel additional components that contribute to the gameplay.

# <a name="marketplace"/> The Marketplace Contract: Facilitating Ticket Sales and Dynamic Pricing

The Marketplace contract plays a pivotal role in TheButton's ecosystem by facilitating the sale of tickets to eager players through a dutch auction mechanism.
Let's explore the inner workings of this contract, which ensures a fair and dynamic pricing model for ticket acquisition.

The primary function of the Marketplace contract is to sell tickets to players using a dutch auction approach.
The pricing structure follows a linear decrease from a starting price with each block that is finalized on the blockchain.
This downward trajectory continues until the auction has spanned a specific number of blocks, at which point the price reaches its minimum threshold.
Once the minimum price is reached, tickets remain available for purchase at this fixed rate.

Additionally, the Marketplace contract tracks the average price of all tickets sold.
With each new auction, the contract sets the starting price based on the average price of tickets sold up to that point.
This mechanism ensures that pricing remains responsive to market demand and reflects the collective value perceived by players.

By implementing a dutch auction model and leveraging the average price as a starting point, the Marketplace contract establishes a fair and dynamic system for ticket sales.
This approach allows players to engage in the game at various stages and obtain tickets at a price that aligns with market trends and player participation.

The Marketplace contract serves as a cornerstone of TheButton's ecosystem, enabling players to enter the game and embark on their quest for rewards. Through its innovative auction mechanism and adaptive pricing strategy, the Marketplace ensures an equitable and engaging experience for all participants.

As we continue our exploration, we will uncover additional components that contribute to the vibrant and dynamic nature of TheButton's gameplay.

# <a name="dex"/> The SimpleDex Contract: Empowering Decentralized Token Swaps

The SimpleDex contract within TheButton's ecosystem introduces a decentralized exchange functionality, allowing players to seamlessly swap between the reward tokens.
SimpleDex utilizes a simplified version of the Uniswap v1 pricing mechanism.

Uniswap revolutionized decentralized exchanges by implementing an automated market maker (AMM) model.
This model eliminates the need for traditional order books, and instead relies on a constant product formula to determine token prices.
It ensures that trades occur based on the ratio of token reserves in a liquidity pool.

The SimpleDex contract maintains a single multi-token pool where all reward tokens for each game coexist alongside wAzero (wrapped Azero).
wAzero acts as a representation of the native A0 token within the ecosystem, consistently exchangeable at a 1:1 ratio.

However, a deliberate design choice was made to restrict swaps only from tokens to wAzero, not the other way around.
This limitation was driven by legal considerations, as the possibility of purchasing ticket tokens directly with the native token could potentially classify the game as gambling according to Swiss laws.
To mitigate this risk, ticket tokens are pre-minted and airdropped to actively staking accounts on the Aleph Zero blockchain, ensuring fair participation.

It's worth noting that on an anonymous blockchain, anyone can write and deploy additional contracts, such as an escrow contract, to enable trustless exchanges between Azero and ticket tokens.
As long as these contracts are developed by the community members and not directly associated with the Aleph Zero Foundation, it aligns with our core principles of decentralization and community-driven innovation.

Given the straightforward design of the game, there is no need for external liquidity providers within the SimpleDex contract.
Liquidity for wAzero is periodically topped up by the Foundation itself, while liquidity for reward tokens is sourced from the swaps executed by players themselves.

The pricing mechanism employed by the SimpleDex holds a strategic value within the game.
Players can leverage this mechanism to devise strategies that optimize their token swaps, providing them with a competitive edge in navigating TheButton's gameplay dynamics.

# <a name="outro"/> **Conclusion: Unveiling TheButton's Core Components**

With this, we conclude our exploration of the core components that drive TheButton, a captivating smart contract-based game deployed on the Aleph Zero blockchain.
We have delved into the Button contract, which governs gameplay and rewards, the Marketplace contract that facilitates ticket sales, and the SimpleDex contract, empowering decentralized token swaps.

But our journey is far from over: in the upcoming series of blog posts, we will venture deeper into TheButton's design and uncover additional components that make it possible.
We will discuss design choices we made, and unveil some innovative features, diving into a more technical intricacies.

Stay tuned!
