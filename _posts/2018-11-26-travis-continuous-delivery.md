---
layout: post
title: Setting up a Continuous Delivery pipeline
comments: true
categories:
- automation
- DevOps
- CI
- Continuous Integration
- CD
- Continuous Delivery
- Continuous Deployment
- Travis
- git
- Github
- Leiningen
---

# <a name="intro">Intro</a>

In this post we will go over the steps neccessary to setup a complete Continuous Delivery (CD) pipeline using Travis, Github and Leiningen, which will deploy our project to the Clojars repository.

The work involved in deploying a release version of your plugin/library can be tedious and difficult to perform consistently from one release to another, as it involves a lot of repeatable steps.
Fortunately it is also ripe for automation, so let us go over the steps neccessary to achieve this.

# <a name="requirements">Requirements</a>

For this tutorial we will assume a git/Github combo is used for version control of your project, with [Travis](https://travis-ci.org) enabled as a Continuous Integration tool and [Leiningen](https://leiningen.org/) as a Clojure build tool.

Ideally you would also be using some form of [git-flow](https://danielkummer.github.io/git-flow-cheatsheet/), or other similar branch-based model for developing new features.

# <a name="release">Setting up lein-release to work with Clojars</a>

Start by creating a separate profile on [Clojars](https://Clojars.org/).
Deploying and to Clojars repository needs authentication credentials, in the typical form of a username/password.
We will specify to have these credentials looked up in the environment by using a namespaced keyword.

Add the following `:deploy-repositories` specification to your `project.clj`:

```clojure
:deploy-repositories [["snapshots" {:url "https://clojars.org/repo"
                                    :username :env/clojars_username
                                    :password :env/clojars_password
                                    :sign-releases false}]
                      ["releases"  {:url "https://clojars.org/repo"
                                    :username :env/clojars_username
                                    :password :env/clojars_password
                                    :sign-releases false}]]
```

With this setup, if the project's current version has a `SNAPSHOT` qualifier, it will default to deploying to the `"snapshots"` repository; otherwise it will default to the `"releases"` repository.
The `:sign-releases` key set to false is there to make sure that the process doesn't hang while prompting for a GPG passphrase.

Once we have the repositories and the user credentials for them configured, we can specify the steps for actually deploying the release version.
Include the following `:release-tasks` key in your `project.clj`:

```clojure
:release-tasks [["vcs" "assert-committed"]
                ["change" "version" "leiningen.release/bump-version" "release"]
                ["shell" "git" "commit" "-am" "Version ${:version} [ci skip]"]
                ["vcs" "tag" "v" "--no-sign"]
                ["deploy"]
                ["change" "version" "leiningen.release/bump-version"]
                ["shell" "git" "commit" "-am" "Version ${:version} [ci skip]"]
                ["vcs" "push"]]
```

This specification results in the following tasks when deploying:

* First a `vcs` task checks if there are any uncommited changes (process bails if that's true).
* Second a `change` task removes whatever qualifier is on the version in the project.clj (e.g. `SNAPSHOT`).
* Next `shell` and `vcs` tasks are run, respectively, to commit this change and then to tag the repository with the release version number.
* Then a `deploy` task pushes the artifact to the "releases" repository.
* The `change` task is run once more to "bump" the version number in project.clj. Which version level is decided by the argument passed to `lein release`, (e.g. `:major`, `:minor`, `:patch`).
* Finally, `shell` and `vcs` tasks are run once more to commit the version change and then push these two new commits to the default remote repository.

---
**Note**

For the `shell` task you need to add the folowing plugin to your `project.clj`:

```clojure
:plugins [lein-shell "0.5.0"]
```

---

At this point we can test if the release works as expected by releasing a test version locally.
Specify the credentails and issue the following command in the terminal:

```bash
env CLOJARS_USERNAME=<username> CLOJARS_PASSWORD=<password> lein release :patch
```

# <a name="travis">Setting up Travis</a>

Travis build process is configured by adding a `.travis.yml` file inside your repository, e.g.:

```yaml
sudo: required
dist: trusty
language: clojure
script: lein test
```

This very basic file contains i.e. information on the language of the repository and the test command.

Travis supports storing encrypted values in this file, such as environment variables, only readable by Travis CI, meaning the repository owner does not need to keep any private keys.
We will use this to store the credentials to access Clojars during CI/CD build.

Start by installing the travis-cli and its dependencies:

```bash
sudo apt-get install ruby-dev
gem install travis
```

Now in the root of your repository, where the `.travis.yml` file resides, run these commands, substituting placeholders with the real credentials:

```bash
travis encrypt CLOJARS_USERNAME=<username> --add
travis encrypt CLOJARS_PASSWORD=<password> --add
```

This will add the encrypted environment variables to the `.travis.yml` file.

---
**Note**

Travis documentation spefices that all the special characters need to be escaped when econding:
https://docs.travis-ci.com/user/encryption-keys/#note-on-escaping-certain-symbols

---

Travis readily supports deploymments to various [providers](https://docs.travis-ci.com/user/deployment/), but not to Clojars.
Not a problem, becasue  we can awlays use a general-purpose *script* provider.

Specify the deploy step in the `.travis.yml` file:

```yaml
deploy:
  - provider: script
    skip_cleanup: true
    script: lein release :patch
    on:
      branch: master
```

Travis will execute `lein release :patch` on the master branch of your repository if the CI build was successful.
If the deploy command returns a non-zero status, deployment is considered a failure, and the build is marked as `errored`.

## <a name="travis-github">Authenticating with Github from Travis</a>

There is one more problem which needs addressing.
As you recall when specifying the [tasks](#release-tasks), we push two commits, and a tagged release to the repository.
This doesn not pose a problem when done locally, but in the CI/CD environment we will push from an unauthenticated Travis server.

This is where Github's [access tokens](https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/) come in handy.
You can generate one from [here](https://github.com/settings/tokens), selecting `public_repo` as the token permissons.

Next, similar to storing the clojars credentials, we will encrypt and add the token as an environment variable to the `.travis.yml` file:

```bash
travis encrypt GH_TOKEN=<your_token_here> --add
```
We then need to switch to an origin remote which uses the token to authenticate.
I order to do so specify the `after-success` step in the `.travis.yml` file:

```yaml
after_success:
- git config --global user.email "travis@travis-ci.org"
- git config --global user.name "Travis CI"
- git remote rm origin
- git remote add origin https://${GH_TOKEN}@github.com/<organisation>/<repo>.git > /dev/null 2>&1
```

Placeholders need to be replaced with the value corresponding to your project.
**GH_TOKEN** will be substituted inside the build server with the un-encrypted token carrying commit rights, and we pipe the output to the `/dev/null` to avoid leaking the token in the Travis's build logs.

---
**Note**

Alternatively these steps can be done as part of the Travis's [`deploy` step](#deploy-step) script.

---

# <a name="readme badge">Clojars badge</a>

As a final bonus Clojars creates version badges, which always point to the latest version of your library, saving you the need to manually alter projects documentation, you can display one by adding to the project's README:

```
[![Clojars Project](https://img.shields.io/Clojars/v/<organisation>/<project>.svg)](https://clojars.org/<organisation>/project)
```

Thanks for reading!.
