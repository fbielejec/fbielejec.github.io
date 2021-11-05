---
layout: post
title: Hosting Your Website on AWS S3
author: Filip Bielejec
comments: true
categories: [AWS, S3, CloudFront, hosting, website, S3, SPA]
summary: "Hosting static content on S3, complete with SSL and caching"
---

# <a name="intro"/> Introduction

For the purposes of this blog post we will assume that we want to serve some static content from `view.spreadviz.org`.
It will come in the form of a so-called Single Page Application (SPA), written in one of the the frameworks such as React or Reagent, and compiled to JS digestible by browsers.

We will host it on S3, set it up with SLL and caching using AWS edge servers (CloudFront).
Finally I will show you how to deploy new versions of the page, while invalidating the cache.

# <a name="buckets"/> Create S3 buckets

We start by creating two S3 buckets, one for the root (sub)domain `view.spreadviz.org` abnd one for the `www` subdomain. 

Navigate to AWS console for the [S3 service](https://s3.console.aws.amazon.com/s3).
Create two buckets:
 - One called `view.spreadviz.org`
 - One called `www<span></span>.view.spreadviz.org`

--

**NOTE**

Bucket names do not need to be the same as your domain names, but it will be easier for you to identify them if you stick to that convention.

--

# <a name="configure"/> Configure buckets for website hosting

Set access control to *PublicRead*.

![_config.yml]({{ site.baseurl }}/images/2021-11-05-s3-website-hosting/screenshot2.jpg)

Go to the Properties tab of the `view.spreadviz.org` bucket and enable "Static website hosting".
Specify "index.html" as both the *index* and the *error* document - reason being that in an SPA we want to serve the same content regardless of the request.

![_config.yml]({{ site.baseurl }}/images/2021-11-05-s3-website-hosting/screenshot1.jpg)

Click on save changed.

Now for the second bucket called `www.view.spreadviz.org` set the access control to *BucketOwnerFullControl* or alternatively (if you intend on logging access to *LogDeliveryWrite*).

![_config.yml]({{ site.baseurl }}/images/2021-11-05-s3-website-hosting/screenshot3.jpg)

In the Properties tab also set up website hosting, but this time set it to redirect to the root domain `view.spreadviz.org`.

![_config.yml]({{ site.baseurl }}/images/2021-11-05-s3-website-hosting/screenshot4.jpg)

Great, now we will create a CloudFront distribution for the content.

# <a name="cloudfront"/> Create a CloudFront distribution

Navigate to the AWS console for the [CloudFront](https://console.aws.amazon.com/cloudfront/v3/home) service.

Set *http://view.spreadviz.org.s3-website.us-east-2.amazonaws.com* (the S3 bucket website endpoint) as the **Origin Domain Name**, (do NOT use the autocomplete to select it!).
In the **Viewer protocol policy** select *Redirect HTTP to HTTPS*.
Under **Alternate domain name (CNAME)** put two names:
- view.spreadviz.org
- www.view.spreadviz.org

As a *Custom SSL certificate* you need to select an ACM certificate created in the us-east-1 region and which is issued for all the domain names you have put there (so both `view.spreadviz.org` and `www.view.spreadviz.org`).
If you don't have a certificate you can request it here.

--

**NOTE**

You can use an asterisk to cover all subdomain names in your SSL certificate : `*.spreadviz.org`.

--

There is one more thing we need to tweak.
Our bucket is configured to always serve *index.html*, even in case of an error.
However when it cannot find a given route, e.g. when someone navigated to a route of your SPA, it will serve it with an error code of 404 - confusing for browser and crawlers.

To prevent that we need to set up a custom rule, that changes the response to a 200 in such cases.
This can be done from the Error pages tab, by setting the Response Page Path to */index.html* with a Response Code of 200.

![_config.yml]({{ site.baseurl }}/images/2021-11-05-s3-website-hosting/screenshot5.jpg)

# <a name="dns"/> Direct your domain to the CloudFront distribution

Perfect, now we can finally set up DNS in [route53](https://console.aws.amazon.com/route53).
We will create two records there, both pointing to the CF distribution we just created

- view.spreadviz.org that is an A alias to a CF distributions domain name.
- www.view.spreadviz.org, which does the same

![_config.yml]({{ site.baseurl }}/images/2021-11-05-s3-website-hosting/screenshot6.jpg)

# <a name="upload"/> Uploading your content to S3

We haven't actually created any content to serve from the bucket.
Assuming the entire compiled output is in *analysis-viewer/* directory you can use aws CLI tool to upload or sync it:

```bash
aws s3 sync analysis-viewer/ s3://view.spreadviz.org --acl public-read
```

# <a name="invalidate"/> Invalidating CloudFront cache

Likely you will want to update your SPA at some point.
To have it reflected in the clients you will need to clear the cache.
You can conveniently do it with an API call that create such an invalidation:

```bash
aws cloudfront create-invalidation --distribution-id <DISTRIBUTION_ID> --paths '/*'
```
Note that here I lazily invalidate all the content
Invalidation's are free up to 1000 paths per month - but you could choose to e.g. invalidate the js/*, or even have your CI server configured to decide what to invalidate, thus keeping the costs down a bit if you make frequent updates.

Once the invalidation request completes you will be able to see the updated version of your page in the browser.

<!-- # <a name="troubleshooting"/> Troubleshooting -->
