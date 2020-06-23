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

The algorithm described in the paper, which I will colloquially refer to as Timm-Barth aims at finding a centre of a circular object.
It does so by optimizing (finding  maximum) of an objective function, which is a (weighted) sum of dot products of two vectors:
- the normalized gradient vector $$\mathbf{g}_{i}$$ at pixel position $$\matbf{x}_{i},\:i \in \{1,\dots, N\}$$ such that $$\forall i:\:\left \| \mathbf{g}_{i} \right \|=\mathbf{1}$$ and
- the displacement vector $$\mathbf{d}_{i}=\frac{\mathbf{x}_{i}-\mathbf{c}}{\left \| \mathbf{x}_{i}-\mathbf{c} \right \|_2 }$$
where $$\mathbf{c}$$ is a possible center.

Formally:

$$c^{*}= \underset{c}{\textup{arg max}} \left \{ \frac{1}{N} \sum_{i=1}^{N}w_{c}\left ( \mathbf{d}_{i}^T\mathbf{g}_{i} \right )^2 \right \}$$

The weights $$\mathbf{w}_c$$ are a way of incorporating prior knowledge: since the pupil is darker than the sclera or facial skin, darker pixels are more likely to be the centers.
If we consider that $I^*$ is the (smoothed and greyscale, as per paper's suggestion) input frame, than at pixel with coordinates $$(c_x, c_y)$$ we have that: $$\mathbf{w}_c=I^*\left ( 255-c_x,255-c_y \right )$$.

# <a name="gradients"/> Computing image gradients



<!-- We derive a simple objective function, which only consists of dot products. The maximum -->
<!-- of this function corresponds to the location where most gradient vectors intersect and thus to the eye’s centre. -->
<!-- Although simple, our method is invariant to changes in scale, pose, contrast and variations in illumination. -->
