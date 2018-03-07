---
layout: post
title: Install and use rebel-readline terminal editor for Clojure
comments: true
categories:
- Clojure
- tooling
- rebel-readline
- terminal
---

# Intro

This will be a short, yet hopefully usefull entry.

At some point there comes a moment when you want to evaluate a code snippet, quickly check something, or maybe run a fast calculation or simulation in you favourite language<sup>[1](#footnote1)</sup> without having to set up the whole development environment.

What you'd typically do in such a case is fire up a REPL directly in the terminal:

```bash
$ ~> clojure
Clojure 1.9.0
user=>
```
and hack away. But then lets say you want to do some basic code editing:

```bash
user=> (while true
  #_=>   (do :a)^[[D^[[D^[[D
```

No Sir Ree Bob! You don't even have basic syntax navigation capabilities, let alone fancy things like code completion.
That is why I was very happy when [Bruce Hauman](https://github.com/bhauman) (of Figwheel fame) announced he created [rebel-readline](https://github.com/bhauman/rebel-readline).
You can think of it as of a full REPL development experience availiable at one command.

# Install it!

---
**NOTE**

We will assume an arbitrary GNU/Linux distrubution for this example and the presence of basic depndencies - bash, curl, rlwrap, and Java.

---

Assuming you haven't already let's begin by installing Clojure CLI (Clojure + REPL):

```bash
curl -O https://download.clojure.org/install/linux-install-1.9.0.358.sh
chmod +x linux-install-1.9.0.358.sh
sudo ./linux-install-1.9.0.358.sh
```

Now you're ready to install rebel-readline. Perhaps the easieset way is to add it as a dependency alias. Edit (or create) `$HOME/.clojure/deps.end` and paste (or add) there the alias:

```clojure
{:aliases {:rebel {:extra-deps {com.bhauman/rebel-readline {:mvn/version "0.1.1"}}}}}
```

Now you can already start a REPL with rebel powers:

```bash
clojure -R:rebel -m rebel-readline.main
```

... which might be a bit verbose. So let's create a `rebel-readline.sh` script in some directory:

```bash
#!/bin/bash

clojure -R:rebel -m rebel-readline.main
```

Now go ahead and make it executable and make a symlink in a directory which is a part of your `$PATH`:

```bash
sudo chmod a+x rebel-readline.sh
sudo ln -s -f rebel-readline.sh /usr/bin/rebel-readline
```

Now the powerfull and delightfull REPL experience is only a couple of keystrokes away:

```bash
rebel-readline
```
Go play with it!

---
<a name="footnote1">1</a>: Clojure obviously!
