---
layout: post
title: Chaining JS Promises in Clojurescript and the problem of the previous value
comments: true
categories:
- clojurescript
- asynchronous
- async
- promise
- JS
- javascript
- chaining
- previous value
- callback
---

# <a name="intro"> Intro </a>

When writing asynchronous code in ClojureScript, or dealing with JavaScript libraries we often have to work with native JS Promises.
If you'd like to make your code more readable and idiomatic, here's a macro you could use:

``` clojure
(defmacro promise->
  [promise & body]
  `(.catch
    (-> ~promise
        ~@(map (fn [expr] (list '.then expr)) body))
    (fn [error#]
      (prn "Promise rejected " {:error error#}))))
```

Put it in a `previous.macros.clj` Clojure file and then in `previous.macros.cljs`:

```clojure
(ns previous.macros
  (:require-macros [previous.macros]))
```

This allows you to `:require` it like any other cljs namespace:

```clojure
(ns previous.core
  (:require [cljs.nodejs :as nodejs]
            [previous.macros :refer [promise->]]))
```

# <a name="chained"> Chained promises </a>

Here is a basic example of using the macro to chain two promises:

```clojure
(defn slow-promise []
  (js/Promise. (fn [resolve reject]
                 (js/setTimeout #(do
                                   (prn "I like slooow")
                                   (resolve "slooow"))
                               1000))))

(defn fast-promise []
  (js/Promise. (fn [resolve reject]
                (do
                  (prn "I like fast!")
                  (resolve "fast!")))))

(promise-> (slow-promise)
           fast-promise)

```

The output from evaluating the above code:

```
"I like slooow"
"I like fast!"
"fast!"
```

The `fast-promise` had to wait with it's execution for the `slow-promise`, the return value printed is that of the last promise in the chain.
We will revisit this problem and talk about returning the [previous value](#previous) as well.

There is nothing stopping you from using the macro to evaluate nested Promise chains, and writing code that looks like this:

```clojure
(promise-> (promise-> (js/Promise.resolve (prn "a"))
                      (js/Promise.resolve (prn "b")))
           (js/Promise.resolve (prn "c")))
```

# <a name="rejection"> Handling Promise rejection </a>

If one of the promises in the chain encounters an error, the macro handles that in its `catch` block.
Here is an example:

```clojure
(defn rejecting-promise []
  (js/Promise. (fn [resolve reject]
                 (reject ":("))))

(promise-> (slow-promise)
           rejecting-promise
           fast-promise)
```

If you evaluate this code you would get:

```
"I like slooow"
"Promise rejected " {:error ":("}
```

Rejection was gracefully handled, app did not crash.

# <a name="previous"> Chaining Promises with a previous value </a>

What if you need to pass the data between the Promises in the chain?
One example would be a chain of calls to multiple servers, or simply a step-wise calculation.
In the [previous example](#chained) the return value of the `slow-promise` was outside of scope for the `fast-promise`.

One simple solution is to use a map and cumulatively add values to it:

```clojure
(defn promise-1 [previous]
  (js/Promise.resolve (assoc previous :val1 1)))

(defn promise-2 [{:keys [:val1] :as previous}]
  (js/Promise.resolve (assoc previous :val2 (inc val1))))

(promise-> (js/Promise.resolve {})
            #(promise-1 %)
            #(promise-2 %)
            prn)
```

Result:

```
{:val1 1, :val2 2}
```

# <a name="collection"> Collection of Promises </a>

If we need to wait untill all of the promises are resolved we can use the macro in combination with `Promise.all`, passing a collection of Promise objects: 

```clojure
(promise-> (js/Promise.all
              [(js/Promise.resolve "FU")
               (js/Promise.resolve "BAR")])
             prn)
```

Result:

```
["FU" "BAR"]
```

# <a name="callback"> From a callback to a Promise </a>

Finally, what if some asynchronous API works with callbacks, rather that JS Promises?
We can easily convert a callback-style code into a Promise based one:

```clojure
(defn return []
  "result")

(defn i-like-callback [callback]
  (callback (return)))

(defn i-like-promise []
  (js/Promise. (fn [resolve reject]
                 (i-like-callback resolve))))

(promise-> (i-like-promise)
           prn)
```
