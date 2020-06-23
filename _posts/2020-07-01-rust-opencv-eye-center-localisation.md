---
layout: post
title: Tracking eye centers location with Rust & OpenCV
author: Filip Bielejec
comments: true
categories: [Rust, opencv]
summary: ""
---

# <a name="intro"/> Intro

Ever since finding [OpenCV Rust bindings](https://github.com/twistedfall/opencv-rust/) I've been looking for a good project to try it out.
Than a [friend](https://github.com/jpmonettas/) sparked my curiosity when talking about gesture recognition project he was implementing.

This inspired me to create a tool which can track your eye movements and translate it to mouse cursor movements.
I reckoned Rust would be a perfect choice for writing performant, numerical code.
First step would be to implement an algorithm responsible for tracking the location of eye center in a frame (the pupil), and this blog post is describing one possible approach.

I started researching the subject and quickly found that the state-of-the art is described in [Timm and Barth](https://www.inb.uni-luebeck.de/fileadmin/files/PUBPDFS/TiBa11b.pdf).
I highly recommend reading the paper.
A bit more searching revealed that [trishume](https://github.com/trishume/eyeLike) did all the hard work of implementing their algorithm in C++ using OpenCV.
Armed with this reference implementation and the original paper I could easily implement it in Rust.

# <a name="details"/> Details of the algorithm

The algorithm described in the paper, which I will colloquially refer to as Timm-Barth, works by optimizing (finding a maximum) of an objective function, which is a (weighted) sum of dot products of two vectors: the gradient vector $$g_{i}$$

<!-- We derive a simple objective function, which only consists of dot products. The maximum -->
<!-- of this function corresponds to the location where most gradient vectors intersect and thus to the eye’s centre. -->
<!-- Although simple, our method is invariant to changes in scale, pose, contrast and variations in illumination. -->
