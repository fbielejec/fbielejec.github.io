---
layout: post
title: Spread: security incident
author: Filip Bielejec
comments: true
categories: [Clojure, spread, authorization, authentication, security]
summary: "Spread is ready to use and availiable at https://spreadviz.org"
---

---
*TL;DR*

[Spread](https://spreadviz.org/) has had a minor security incident, yet no user data was at any pointcompromised.

---

# <a name="intro"/> Synopsis

When [designing Spread](https://www.blog.nodrama.io/spread/) I took a passwordless approach the authorization and authentication of the users.

We store no credentials nor passwords, instead the users can opt in to use an OAuth 2.0 flow, where their identity is checked by Google and once verified they are issued a token from Spread to authorize the use of certain API endpoints, aka "Login with Google".

Alternatively they can use any other email to authenticate, and in this case Spread sends out an email with the so called "magic link" that contains a short lived token.
Once clicked that link will take them back to Spread, where we will check the token validity and like before issue a longer-lived JWT access token, signed with Spreads' RSA key.

# <a name="what"/> Alert received

On April 26-th I have received an alert from [Sendgrid](https://sendgrid.com/), a service we use for sending out emails, that the monthly email limit is almost exceeded.

As the running costs were one of the first priorities when designing Spread <sup>[1](#footnote1)</sup> Spread is utilizing a very modest plan - which was nonetheless perfectly suitable up to this point given the amount of traffic the service is seeing.
One of the worst things that could have happened was the API key somehow leaking - which has happened to various projects in the unlikely event of e.g. the CI server being compromised.
On the plan we are using the key leaking means the IP would start getting used in e.g. spam campaigns, phishing attempts and various other nefarious purposes, lowering down out carefully build 100% delivery rate as a trusted sender.

# <a name="what"/> Steps taken

I double checked with the project owners whether they are not running anything that could warrant such a spike and at the same time looked at the logs.
An unusually high number of email login attempts was immediately noticeable, with the gems such as this:

```
@ingestionTime 1682497226403
@log           816997647674:/ecs/spread-api-prod
@logStream	   ecs/spread-api/49e70bf861bb48da9c7bc211b80ef170
@message       {"message":"send-login-email","email":"poopthesnoopdogg@gmail.com","redirectUri":"https://spreadviz.org","timestamp":"2023-04-26T08:20:23Z","level":"info","file":"api/mutations.clj","line":26}
@timestamp	   1682497223005
email          poopthesnoopdogg@gmail.com
file           api/mutations.clj
level          info
line           26
message        send-login-email
redirectUri	   https://spreadviz.org
timestamp	   2023-04-26T08:20:23Z
```

This was a rather good thing - a dumb, single machine attempt to wear down the endpoint responsible for sending the login emails, rather than credential leaking or a sophisticated attack.
The dowside was it quickly wore through the sendgrid quotas.

Out of abundance of caution I revoked the Sendgrid API token, which meant that before it is rotated<sup>[1](#footnote2)</sup>, the "magic link" login/sign-on would not work.
Which I deemed acceptable, given the low volume of traffic that the service is usualy operating with.

At this point I still didn't do anything to rectify the actual problem, but it had added the bonus that the attackers script likely crashed when the endpoint started returning an error :joy: .

In an hour or so I whipped out a quick solution for similar attacks - it maintains a set of IP addresses and "jails them" if anyone tries the login endpoint too often in a fixed time frame.
The "jailer" is a decorator than can actually be used to protect any endpoint, not just the login ones.

Since the attack had stopped for now, there was no reaon to rush a solution.
I asked [Juan](https://github.com/jpmonettas?tab=repositories) for a review, and in the next day, based on his input, created an [improved take](https://github.com/phylogeography/spread/blob/5964d016665270d960e94a193b44f5dff75578b1/src/clj/api/server.clj#L62-L79) on the decorator, which works as a state machine and thus is easier to test.

For the curious here's the solution: [server.cljs#L33-L78](https://github.com/phylogeography/spread/blob/5964d016665270d960e94a193b44f5dff75578b1/src/clj/api/server.clj#L33-L78)

# <a name="future"/> Future directions

The jailer state is maintained in an atom - which although thread safe when used with Clojure's immutable data types could hinder performance.
If the need arises I will move it to a more performant data type or even to the RDB used by Spread for persitance.

---
<a name="footnote1">1</a>: sadly academia is notoriously underfinanced.
<a name="footnote2">2</a>: by triggering an automated CI build which takes couple minutes at most
