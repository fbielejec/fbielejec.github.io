---
layout: post
title: Spread security incident
author: Filip Bielejec
comments: true
categories: [Clojure, spread, authorization, authentication, security]
summary: "In this blog post I describe a minor security incident"
---

---
**TL;DR**

[Spread](https://spreadviz.org/) recently experienced a minor security incident related to increased email login attempts.
However, no user data was compromised during the incident.

---

# <a name="intro"/> Introduction

In this blog post, I'll discuss a recent security incident at Spread and the steps taken to address it.
I'll provide an overview of our authentication approach, explain the incident details, outline the actions I took, and discuss the future directions.

# <a name="auth"/> Authentication Approach

When [designing Spread](https://www.blog.nodrama.io/spread/), I adopted a passwordless approach for user authorization and authentication.
Spread doesn't store any credentials or passwords.
Instead, users can choose to authenticate using OAuth 2.0 with Google or any other email.
In the latter case, Spread sends an email containing a "magic link" with a short-lived token.
Upon clicking the link, the token is validated, and a longer-lived JWT access token is issued, signed with Spread's RSA key.

# <a name="details"/> Incident Details

On April 26th, I received an alert from Sendgrid, our email service provider, notifying us that our monthly quotas were almost exceeded.
Given our focus on cost-effectiveness<sup>[1](#footnote1)</sup>, I had chosen a very modest plan that had been sufficient until now.
My concern was that a potential leak of our API key could result in an unauthorized usage, affecting our reputation as a trusted sender.

# <a name="steps"/> Steps taken

To investigate the situation, I reviewed the logs and noticed a significant increase in email login attempts.
While this was not ideal, it indicated an attempt to overload the endpoint responsible for sending login emails, rather than credentials leak or a sophisticated attack.

To mitigate the issue, I took the following steps:

* Revoked the Sendgrid API token to prevent further unauthorized usage.
* Temporarily disabled the "magic link" login/sign-on functionality until the API token was rotated.
* Developed a solution to handle similar attacks by implementing an IP-based "jailer" decorator that limits the number of login attempts within a specific timeframe.
* Collaborated with [Juan](https://github.com/jpmonettas?tab=repositories) to improve the decorator implementation, resulting in a more efficient and testable state machine-based approach.
* The solution can be found in the following [code](https://github.com/phylogeography/spread/blob/5964d016665270d960e94a193b44f5dff75578b1/src/clj/api/server.clj#L33-L78).

---
<a name="footnote1">1</a>: sadly the academia is notoriously underfunded.
