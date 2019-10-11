---
layout: post
title: Clojurescript library for interacting with Google Firebase
author: Filip Bielejec
comments: true
categories: [clojurescript, firebase]
tags: [clojurescript, shadow-cljs, firebase, library]
summary: "How to develop mobile iOS applications on Linux"
---

# <a name="intro"/> Intro

I have just released [fbielejec/cljs-firebase-client](https://github.com/fbielejec/cljs-firebase-client), a library which wraps the JS client library for interacting with [Google Firebase](https://Firebase.google.com).

This Library is a thin wrapper around the core functionalities of the JS client, allowing the use a kebab-case version of functions and passing of clojure maps as arguments in ClojureScript.
There are also helper functions for turning the results int clojure data structures and a namespace which provides [re-frame](https://github.com/Day8/re-frame) events which call the functions (work in progress).

Library uses [shadow-cljs](http://shadow-cljs.org/) for resolving JS dependencies, so it will probably work only if your project also uses shadow-cljs for compilation.
If you find this library usefull or maybe really need to get it working with Leiningen/cljsbuild please let me know and I'll see what I can do.

For other options check out the plugin's [documentation](https://github.com/fbielejec/cljs-firebase-client).

# <a name="using"/> Using the library

Start by adding the it to your dependencies:

```clojure
:dependencies [[fbielejec/cljs-firebase-client "0.0.9"]]
```

Here's how you can store in a Firestore db for a social app the fact that Tamara started following Billy:

```clojure
(defn follow
  "Tamara follows Billy:
  (follow "Tamara" "Billy")"
  [follower-id followed-id]
  (promise->
   (db/document-set {:collection "followers"
                     :id followed-id
                     :document {follower-id true}}
                    {:merge true})
   (db/document-set {:collection "following"
                     :id follower-id
                     :document {followed-id true}}
                    {:merge true})))
```

We've set created two documents, one under the  "followers/Billy" path with contents {"Tamara" true}, another under the "following/Tamara" path with contents {"Billy" true}.
Due to the NO SQL based nature of Firestore this allows for a quick bi-directional retrieval of documents.

And here's how you could use it to get a paginated Firebase query statement retrieving all Billy's followers:

```clojure
(ns my-app
  (:require [firebase.firestore :as db]))

(let [batch-size 3
      user-id "Billy)
      first-batch (-> (db/coll-ref "following")
                      (db/where ">=" user-id true)
                      (db/order-by user-id)
                      (db/limit batch-size)
                      db/query)]
  (promise-> first-batch
             (fn [snapshot]
               (let [docs->clj #(->> (db/snapshot->clj %)
                                     (map keys)
                                     flatten)
                     docs (.-docs snapshot)
                     last-doc (aget docs (dec (-> docs .-length)))
                     next-batch (-> (db/coll-ref "following")
                                    (db/where ">=" user-id true)
                                    (db/order-by user-id)
                                    (db/start-after (db/get-document-field-value last-doc user-id))
                                    (db/limit batch-size)
                                    db/query)]
                 (promise-> first-batch
                            #(prn (docs->clj %))
                            (promise-> next-batch
                                       #(prn (docs->clj %))))))))
```

The `promise->` macro used here is described in my [previous post](https://www.blog.nodrama.io/clojurescript-chaining-js-promises-previous-value/).
