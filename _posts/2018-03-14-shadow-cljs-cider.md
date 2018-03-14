---
layout: post
title: shadow-cljs and Emacs/Cider integration
comments: true
categories:
- clojurescript
- tooling
- shadow-cljs
---

# <a name="into"/>Intro

In this post I will cover [shadow-cljs](https://github.com/shadow-cljs/), a ClojureScript compiler with focus on simplicity and ease of use.
Grossly simplifying, you can think of it as a cljsbuild and Figwheel replacement.

The main selling point for me was the npm integration, which works out-of-the-box, but there are also other strong advantages.
You can find other selling points in the introduction to the official [UserGuide](https://shadow-cljs.github.io/docs/UsersGuide.html).

---
**NOTE**

We will assume you are using a GNU/Emacs or a similar editor flavour with Cider installed. If you have not yet you can quickly install it with:

```
M+x package-install
cider
```
We will also assume [yarn](https://yarnpkg.com) is used as npm dependency management tool, but `npm` would work just as fine.

---

# <a name="howto"/> Integrating shadow-cljs and emacs-cider

There are multiple workflows when using shadow-cljs. You could use the [command-line](https://shadow-cljs.github.io/docs/UsersGuide.html#_command_line) tools only, however to get the full interactive development experience use an editor and integrated REPL. This is where [cider](https://github.com/clojure-emacs/cider) enters.
Below we will specify the config files needed to get the Emacs-cider and shadow-cljs working together.

## <a name="shadow-cljs.edn">shadow-cljs.edn

Start by creating a `shadow-cljs.edn`, a config file which specifies build targets. In this example we will have two builds there, an `:app` or *main* build and `:ci` (a test build):

```clojure
{:lein true
 :builds {:app {:target :browser
                :output-dir "public/js"
                :asset-path "/js"
                :modules {:main {:entries [app.core]}}
                :devtools {:http-root "public"
                           :http-port 4040
                           :before-load app.core/stop
                           :after-load app.core/start}}
          :ci {:target :karma
               :output-to "out/ci.js"
               :ns-regexp "-test$"}}}
```

* `:lein true` means the dependencies and sources will be managed by leiningen.

The `:app` build is a build targeting the browser (other option is `:node-script` if we're targeting node):

* compiled JS files will be in *public/js* directory
* the entry point is in the `app.core` namespace.
* Everything that is in the *public* directory is served on local port 4040
* There are two (optional) functions to be run when code is hot-reloaded.

The `:ci` build is for the [karma](karma-runner.github.io) test runner.

* compiled JS files will be in *out/* directory.
* runners wil be created for all source files in the classpath which end with *-test*.

## <a name="project.clj">project.clj

This config file is well known to every CLojure developer.
We need to add all the *dependencies* and specify all the *source-paths* the builds specified in [shadow-cljs.edn](#shadow-cljs.edn):

```clojure
(defproject shadow-cljs-demo "1.0.0-SNAPSHOT"
  :description "demo app"
  :url "http://example.com/FIXME"
  :license {:name "Eclipse Public License"
            :url "http://www.eclipse.org/legal/epl-v10.html"}
  :dependencies [[camel-snake-kebab "0.4.0"]
                 [org.clojure/clojurescript "1.10.145"]]
  :exclusions [[org.clojure/clojurescript]
               [org.clojure/clojure]]
  :source-paths ["src" "test"]
  :clean-targets ^{:protect false} ["target"]
  :profiles {:dev {:source-paths ["dev"]
                   :dependencies [[thheller/shadow-cljs "2.2.8"]
                                  [org.clojure/clojure "1.9.0"]]
                   :plugins [[cider/cider-nrepl "0.16.0"]]
                   :repl-options {:init-ns ^:skip-aot user
                                  :nrepl-middleware [shadow.cljs.devtools.server.nrepl/cljs-load-file
                                                     shadow.cljs.devtools.server.nrepl/cljs-eval
                                                     shadow.cljs.devtools.server.nrepl/cljs-select]}}})
```

## <a name="package.json">package.json

Since in this project we will include packages from npm repository, those dependencies need to be in the package.json.
You can run `yarn init` you will get an interactive prompt to help you specify the config.

---
**NOTE**

I have not tried it, but it's quite possible that the [lein-npm](https://github.com/RyanMcG/lein-npm) Leiningen plugin can be used to specify project's npm dependencies, eliminating the need for maintaining a *package.json* config file.
Which might be nice.

---

This is what we need in the end:

```json
{
  "name": "shadow-cljs-demo",
  "version": "1.0.0-SNAPSHOT",
  "description": "",
  "author": "me",
  "license": "MIT",
  "main": "main.js",
  "scripts": {
    "compile": "shadow-cljs compile dev",
    "release": "shadow-cljs release dev",
    "delete": "rm -r public/js/* out/*",
  },
  "devDependencies": {
    "karma": "^2.0.0",
    "karma-chrome-launcher": "^2.2.0",
    "karma-cljs-test": "^0.1.0",
    "shadow-cljs": "^2.1.21"
  },
  "dependencies": {
    "left-pad": "^1.2.0"
  }
}
```

* The `shadow-cljs` devDependency is needed for running the *scripts* commands.
* `karma` is needed for tests.
* No project is complete withoud a `left-pad` as a dependency.

## <a name="karma">The karma config

This is a typical config file for the karma test runner:

```json
module.exports = function (config) {
  config.set({
    browsers: ['Chrome'],
    // The directory where the output file lives
    basePath: 'out',
    // The file itself
    files: ['ci.js'],
    frameworks: ['cljs-test'],
    plugins: ['karma-cljs-test', 'karma-chrome-launcher'],
    colors: true,
    logLevel: config.LOG_INFO,
    client: {
      args: ["shadow.test.karma.init"],
      singleRun: true
    }
  })
};
```

* We will run the test in the *Chrome* browser.
* Compiled JS files (*ci.js*) for the runner are in the *out* directory.

## <a name="user">The user namespace

We will use this namespace as an utility to start the shadow-cljs server, get the watcher for hot-reloading and finally give us the cljs REPL:

```clojure
(ns user
  (:require [shadow.cljs.devtools.api]
            [shadow.cljs.devtools.server]))

(defn watch-app! []
  (shadow.cljs.devtools.server/start!)
  (shadow.cljs.devtools.api/watch :app)
  (shadow.cljs.devtools.api/nrepl-select :app))
```

## <a name="repl">Give me the REPL!

With all that in place we can have a REPL running in a four simple steps:

1. Install npm dependencies:

```shell
yarn
```

2. Start the clj REPL:

```emacs
M+x cider-jack-in
```

3. Start the server, build watcher and get the cljs REPL:

```clojure
(watch-app!)
```

4. Point your browser to `localhost:4040`

Similarly you can run watch and run the tests as you change the code by:

1. Starting the server and the watcher:

```shell
yarn shadow-cljs watch ci
```

2. Starting the karma runner:

```shell
yarn karma start
```

## <a name="code">Show me the code!

A complete application is availiable as a [GitHub repository](https://github.com/fbielejec/shadow-cljs-demo).
It shows a couple of things not covered in this post, i.e.

* How to include macros in a namespace compiled with shadow-cljs.
* How to include npm dependencies.

Thank you for reading!
