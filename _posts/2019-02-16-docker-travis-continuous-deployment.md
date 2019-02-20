---
layout: post
title: Setting up a Continuous Deployment pipeline with Docker and Travis
comments: true
categories:
- Continuous Deployment
- Docker
- Travis
- Watchtower
- automation
- DevOps
- CI
- CD
- CI/CD
- git
- Github
---

# <a name="intro">Intro</a>

In the previous [post](https://www.blog.nodrama.io/travis-continuous-delivery/) we looked at a strategy for automating the deployment of single libraries/components.

In this entry I will describe how to setup a pipeline for a Continuous Deliver (CD) of an entire project, where every code commit which passes the CI test phase is automatically deployed into an environment, with changes that are immediately visible to the users.

This concept is a powerfull one, commiting your changes and seeing it built and deployed without any manual input is a huge time saver.

---
**NOTE**

We will assume [Travis CI](https://travis-ci.org) is used for CI, [Github](https://github.com/) for version control and [Dockerhub](https://hub.docker.com/) as the Docker image repository.
Obviously you will also need a Docker installation.
Yuu should be able to adopt these steps for different settings/repositoreis used.

---

# <a name="dockerfile">Writing a Dockerfile</a>

Let's assume our project is shipped as a jar file, and needs a JRE environment to run.
In that case all we need is a following `Dockerfile`:

```
FROM adoptopenjdk/openjdk8:latest
MAINTAINER "Filip Bielejec" <nodrama.io>

COPY target/app.jar .

CMD ["java", "-jar", "app.jar"]
```

We start from an exisiting image that provides OpenJDK environment and copy the "app.jar" file, which is then executed in the CMD.
We can test this build locally:

```bash
docker build -t nodrama/app -f docker-builds/Dockerfile .
```

## <a name="versioning">Versioning Docker images</a>

Risking sounding opinionated I believe that Docker is to DevOps what GitHub is to development, which is why the *right way* to version Docker images is with the hashes corresponding to commits on the master branch.

If you follow the healthy practices of working with feature branches, squashing commits before merging them and never reverting commits on the master branch, you can immediately see the gains.
You can track back running containers to the merged features, immediately roll-back containers in your environments to a known point (should something break), finally if they pass the QA phase you can deploy them to the production and be sure that no unknown bugs are shipped.

So how exactly do we tag the Docker images with commit hashes?
We can get the hash of the last commit like this:

```bash
git log -1
=> commit 7eba7eda97513e01f5421d05059cebcb861fd805
```

And we can build the image versioned with that hash like that:

```bash
docker build -t nodrama/app:7eba7eda97513e01f5421d05059cebcb861fd805 -f docker-builds/Dockerfile .
```

<!-- Now let's look at the Docker image tags. -->

## <a name="tag">The *latest* tag</a>

To automate the deployment we will always deploy the application image tagged as the *latest*.
However we need to keep one thing in mind - Docker's *latest* tag is just a meta-tag, not a semantic version, and means:

* either the last build ran without a specific version specified
* or the build that was tagged as such

Therefore the best practice is to explicitely tag the last built with the *latest* tag:

```bash
docker tag nodrama/app:7eba7eda97513e01f5421d05059cebcb861fd805 nodrama/app:latest
```

If we follow this practice, there should be no suprises, as the image tagged as the latest will always correspond to the last known build.

# <a name="travis">Pushing to Dockerhub from Travis CI</a>

Travis readily supports building Docker images and pushing them to the Docker repositories.
To build and deploy an image of your app to Dockerhub add the following settings to the `.travis.yml` file in the root of your projects repository:

```yaml
services:
- docker
deploy:
  provider: script
  script: bash docker-push.sh
  on:
    branch: master
```

It simply says that every passing build on the `master` branch run a deploy step using docker service and a custom deploy [script](#script).

To be able to authenticate against Dockerhub we need to add credentials to the Travis build environment.

---
** NOTE***

If you don't have the `travis-cli` installed you can follow the instructions [here](https://www.blog.nodrama.io/travis-continuous-delivery/#travis) to do so.
For some basic container orchestration you might also be interested in installing [Docker Compose](https://docs.docker.com/compose/install/).

---

Following command encrypts these credentials with the public key attached to your repository, and adds them to the `travis.yml` file.

```bash
travis encrypt DOCKER_USERNAME=<dockerhub-username> --add
travis encrypt DOCKER_PASSWORD=<dockerhub-password> --add
```

Now let's look at the deploy script which builds and deploys the application image.

## <a name="script">Docker push script</a>

The `docker-push.sh` script from the [deploy step](#travis) described above is a file in your repository with the following content:

```bash
NAME=nodrama/app
TAG=$(git log -1 --pretty=%h)
IMG=$NAME:$TAG

# build jar
mvn clean package -DskipTests

# build and tag as latest
docker build -t $IMG -f docker-builds/Dockerfile .
docker tag $IMG $NAME:latest

# dockerhub login
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

# push to dockerhub
docker push $NAME
```

This file builds the project (using Maven) and then automates the [versioning](#versioning) and [tag](#tag) steps we have talked about earlier.

# <a name="watchtower">Automatically update running containers with Watchtower</a>

We have went through the steps to build and deploy our containerized applications image to the Docker repository.
Now its time to automate updating of the running version of the app.

[Watchtower](https://github.com/v2tec/watchtower) is a service which automatically checks for, downloads and updates running containers.
The best part is that Watchtower itself is a Docker container.

---
**NOTE**

Unless you are **really** sure about your processes, CI, tests and coverage the "nightly builds" should rather be reserved for DEV or QA environments and not production.
But the great thing about this process is that a vetted image (versioned with a commit tag) can be easily and quickly deployed to production.

---

Lets run a Docker container with our project:

```bash
docker run -d --name app nodrama/app:latest
```

Then we can start Watchtower:

```bash
docker run -d --name watchtower -v /var/run/docker.sock:/var/run/docker.sock v2tec/watchtower:latest --cleanup --interval 300
```

Watchtower needs to interact with the Docker API in order to monitor the running containers, which is why we mount host volume `/var/run/docker.sock` into the Watchtower container.
Cleanup means it will remove old images after updating.
We have also specified an interval of 300 seconds for checking for new image versions.
By default Watchtower will watch for and try to update all running containers.
For other configuration options you can consult the [official documentation](https://github.com/v2tec/watchtower#watchtower).

# <a name="slack">Slack notifications</a>

When it comes to the automated notifications I'm a big proponent of ChatOps.
Chat messages, unlike emails, are consumable by the whole team and especially in the case of alerts there is simply a bigger chance of someone noticing and reacting on them.

Watchtower can send notifications through a [Slack webhook](https://api.slack.com/incoming-webhooks) when containers are updated.
You simply need to pass two environment variables to it:

* WATCHTOWER_NOTIFICATIONS=slack
* WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL="https://hooks.slack.com/services/x/y/z"

Here is a complete [`docker-compose.yml`](https://docs.docker.com/compose/compose-file/) file, which runs the app container and the Watchtower service:

```yaml
  app:
    image: nodrama/app:latest
    container_name: app

  watchtower:
    image: v2tec/watchtower:latest
    container_name: watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_NOTIFICATIONS=slack
      - WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL=https://hooks.slack.com/services/x/y/z
    command: --cleanup --interval 300
```

Thank you for reading!
