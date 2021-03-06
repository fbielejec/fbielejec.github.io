---
layout: post
title: Compile time spec checking with Clojure
author: Filip Bielejec
comments: true
categories:
- Clojure
- spec
- macros
---

# Intro

Many things have been said on typed vs untyped languages, so I'm not going to repeat them here.
Clojure is an inherently a dynamic language, yet to have some sort of safety especially at the system's boundaries it's answer was the introduction of the [clojure.spec](https://clojure.org/guides/spec) library.

Spec allows one to specify the structure of data (and functions), parse and validate the data as well as generate test data from a given specification.
Spec in that sense serves as documentation of your program, can give better error messages and better error handling in general, facilitate testing and increase the extensibility of programs.

There are same similarities and differences between spec and types, and I tried to sum them up here:

#### Similarities

* types provide semantic information from the compiler
* types enforce strictness
* types force the system design
* types provide stronger guarantees (even spec generators can't guarantee a whole spectrum of possible values)
* types are checked at compile time

#### Differences

* spec is optional: when and how to verify inputs is up to you
* specs favour being expressive: expressivity > proofs
* specs are less efficient performance wise
* specs are checked at runtime

In this post I wanted to focus on the last point - even though spec are checked at the program runtime, clojure macros are availiable at compile-time, and we can use this fact to achieve something like a type safety in clojure, should you ever need it.
Some people are apparently worried about types :grin:

# Compile time checks

In this blog post we will spec and define a *divide* function which, well... divides two integers. Then we will try to make it type safe.

Spec has a special function `clojure.spec/fdef` for defining the input and output specifications of functions. Function can be fully specified with three specs:

1. One for it's arguments.
2. One for the return value.
3. One (optional) for the relationship between the inputs and output.

Let's go ahead and write a function spec for the *divide* function. We want the input to be integers, but not 0, the output a floating precision number, and the relationship between them is multiplication.

{% highlight clojure %}
(use '[clojure.spec.alpha :as s])

(s/fdef divide
        :args (s/and (s/cat :x integer? :y integer?)
                     (fn [{:keys [:x :y]}]
                       (not (contains? #{0} y))))
        :ret number?
        :fn (fn [{ {x :x y :y} :args z :ret}]
              (= x (* z y))))
{% endhighlight %}

Once we have the spec we can write the function itself:

{% highlight clojure %}
(defn divide [x y] (/ x y))
{% endhighlight %}

To turn on validation of the arguments, i.e. runtime checks that the function is being called correctly we call `clojure.spec.test/instrument`:

{% highlight clojure %}
(use '[clojure.spec.test.alpha :as st])

(st/instrument `divide)

(divide 6 3)

(divide 6 :foo)
{% endhighlight %}

So far so good. But what if somewhere in the code we have this lurking:

{% highlight clojure %}
(defn divide-by-foo []
  (divide 6 :foo))
{% endhighlight %}

we won't know of the problem right until the function `divide-by-foo` is called. Solution? Wrap the function inside a macro (macros are always checked during macro expansion time):

{% highlight clojure %}
(defmacro typed-divide [arg1 arg2]
  (divide arg1 arg2))
{% endhighlight %}

Now try to compile the function below in your REPL session:

{% highlight clojure %}
(defn typed-divide-by-foo []
  (typed-divide 6 :foo))
{% endhighlight %}

You should see a nice spec'd error message like the one below:

![_config.yml]({{ site.baseurl }}/images/2018-1-20-clojure-compiletime-spec-checks/emacs_screenshot.png)

You can find the code for this post found here <https://t.co/D4EqC5pSTb>. Thank you for reading!
