---
layout: post
title: Progress update on Spread
author: Filip Bielejec
comments: true
categories: [spread, viruses, phylogeography, data vizualization]
summary: "Quick progress update on where the project is right now"
---

# <a name="update"/> Update

<video width="640" height="480" controls="controls" poster="{{ site.baseurl }}/images/2021-11-26-spread-progress-update/usa.png">
  <source src="{{ site.baseurl }}/images/2021-11-26-spread-progress-update/usa.mp4" type="video/mp4">
    Your browser does not support the video tag.
</video>

In [December last year](https://www.blog.nodrama.io/spread/) I announced I will be working on a next version of popular [Spread](https://rega.kuleuven.be/cev/ecv/software/SpreaD3) package, for vizualizing how viruses and other pathogens are spreading in time and space.
I was able to recruit [jpmonettas](https://github.com/jpmonettas) to help with large parts of it, who did an amazing work writing an entire ultra-performant SVG plotting engine from scratch and my very [talented brother](https://boxless.studio/) designed a comprehensive [UI/UX](https://app.zeplin.io/project/6075ecb45aa2eb47e1384d0b) for it.
Initial high-level design document for it can be viewed [here](https://github.com/fbielejec/spread/blob/master/docs/hldd.org).

I am happy to announce that we have finished all major milestones, and are down to polishing and bug fixing.
As a next step we will release an early version for testing by the members of the [Evolutionary and Computational Virology](https://rega.kuleuven.be/cev/ecv) and then subsequently open it up to the public.

# <a name="milestones"/> Milestones achieved

Here is a rough overview of the major milestones achieved:

- I have refactored the old parsers code (written in Java) as a [libspread](https://github.com/fbielejec/spread/blob/master/pom.xml) library.
- I have written a Clojure wrapper around it, which acts as a fleet of worker threads that act on messages published to the queue from the API, and are responsible for all the heavy lifting of parsing the [BEAST](https://beast.community/index.html) input data.
- I have written a GraphQL API that publishes jobs for the workers to consume, facilitate subscribing to the status of those job, handles user authentication and authorization as well as answers to queries.
- I have written a ClojureScript UI that implements the bulk of wireframes and handles a passwordless JWT token based auth-flow, with Google as the identity provider.
- Juan has implemented the SVG plotting engine as well as various amazing performance improvements. Overall it is able to pull 50 fps in a modern browser, an he can potentially push it even further. Every vizualization is share-able via URLs.
- Juan handles the styling and made sure the UI is pixel-perfect.
- I have created am automated CI/CD pipeline that build docker images, runs integration tests as well as deploys the artifacts
 - workers and the API are deployed as services in the [AWS ECR](https://aws.amazon.com/ecr/)
 - UI and the viewer components are served as static content from S3 buckets [S3](https://aws.amazon.com/s3/)

# <a name="future"/> Future goals

There are two major other features we would like to add.
I realize that relying on Google for OAuth2 can be quite limiting.
Some countries are actively blocking Google services, and we would not want this to be an obstacle for using the service.
Therefore one of the big features in the roadmap is the implementation of another authorization flow, that uses *any* email as identity provider, and delivers one-time JWT tokens, the so-called "magic links".

The way we see the service being used is that it will remain under a relatively low load for most of the time, with occasional spikes of activity.
It needs to be able to readily handel those spikes, as well as keep the costs down in between them.

Therefore another big goal is an implementation of a set of scaling rules, that provision additional resources in respons eto these spikes in load.
There are some metrics we can use to guide these rules, such as number of un-acked messages in worker queues, network requests to the API etc.

Another goal is not a technical one, albeit equally important.
We want the service to remain open and free to use for everyone in the phylogenetics, data vizualization, statistics, epidemiology and other interested communities.
However the upkeep is a non-negligible one, various AWS services it comprises off generate costs on monthly basis.
For the moment we are able to cover those costs thanks to a grant received by the ECR laboratory, however eventually a more long-term solution is needed.
With that in mind I would like to set up a Github sponsorship with the goal of funding the server and upkeep costs - if you are a researcher, you have used and found the software usefull please consider donating.
