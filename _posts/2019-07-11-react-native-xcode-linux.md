---
layout: post
title: Using shadow-cljs to compile React Native for iOS on GNU/Linux
comments: true
author: Filip Bielejec
categories: [clojurescript, cljs, shadow-cljs, react-native, iOS, mobile, linux, xcode, virtualbox ]
tags: [clojurescript, react-native, iOS, linux]
summary: "Using shadow-cljs to compile react-native code and running it on an iOS simulator under GNU/Linux"
---

# <a name="intro">Intro</a>

In the previous [post](https://www.blog.nodrama.io/running-xcode-on-linux/) I described how to set-up and run an iOS simulator on Linux, using a VirtualBox with and MacOS image.
We used [Re-Natal](https://github.com/drapanjanas/re-natal) as a cli tool to bootstrap the application.

In this post we will look into using [shadow-cljs](https://github.com/shadow-cljs/) to compile a clojurescript codebase targeting [React Native](https://facebook.github.io/react-native/).
I find this combo to give a much lighter and snappier workflow, there is also a huge advantage in being closer to the react and npm ecosystem.

Before we begin please make sure you have the following tools set up:

---
**Integration Checkbox**

* on the host platform:
  - node and [yarn](https://yarnpkg.com/lang/en/)
  - VirtualBox with MacOS image
  - samba server sharing the [project folder](#project)
* on the guest platform
  - socat
  - XCode

You can find all the instructions in this [post](https://www.blog.nodrama.io/running-xcode-on-linux/).

---

# <a name="project">Example project</a>

I have created a very basic skeleton app which uses shadow-cljs to compile ClojureScript into JavaScript output, which then React Native turns into a native mobile code.
You can find the full source code [here](https://github.com/fbielejec/shadow-cljs-react-native).

Clone the project and make sure it is [shared with the guest machine](https://www.blog.nodrama.io/running-xcode-on-linux/#sharing-folder).

```bash
git clone git@github.com:fbielejec/shadow-cljs-react-native.git
```

# <a name="host">On the host machine</a>

Lets start by installing all the dependencies:

```bash
yarn deps
```

Next start the shadow-cljs watcher:

```bash
yarn app:watch
```

Once it is done compiling, in a separate terminal window start the react-native packager (Metro):

```bash
yarn app:packager
```

It will occupy port `8081`.

# <a name="guest">On the guest machine</a>

Go to the guest machine running inside a VBox and use socat to start forwarding the port occupied by the Metro Bundler:

```bash
socat tcp-listen:8081,reuseaddr,fork tcp:192.168.1.3:8081
```

Now open the project in XCode and press *Build and Run*.
Once it's running use *special +d* to open developer menu on the simulator and make sure _Live Reloading_ and _Hot Reloading_ are both disabled:

![_config.yml]({{ site.baseurl }}/images/2019-07-11-react-native-xcode-linux/developer_menu.jpg)

If you edit the code on the host the changes are immediately reflected in the simulator running on the guest machine:

![_config.yml]({{ site.baseurl }}/images/2019-07-11-react-native-xcode-linux/hmr.gif)

# <a name="repl">REPL</a>

To connect a repl to the running project you can simply use `M+x cider-connect` in Emacs.
Choose `localhost` and select the port, this will connect you to the clj REPL, from which you can get the cljs REPL with:

```clojure
(shadow.cljs.devtools.api/nrepl-select :app)
```

Thanks for reading!
