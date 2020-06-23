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

I started researching the subject and quickly found that the state-of-the art is described in [Timm and Barth, 2011](https://www.inb.uni-luebeck.de/fileadmin/files/PUBPDFS/TiBa11b.pdf).
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

$$c^{*}= \underset{c}{\text{arg max}} \left \{ \frac{1}{N} \sum_{i=1}^{N}w_{c}\left ( \mathbf{d}_{i}^T\mathbf{g}_{i} \right )^2 \right \}$$

The weights $$\mathbf{w}_c$$ are a way of incorporating prior knowledge: since the pupil is darker than the sclera or facial skin, darker pixels are more likely to be the centers.
If we consider that $I^*$ is the (smoothed and greyscale, as per paper's suggestion) input frame, than at pixel with coordinates $$(c_x, c_y)$$ we have that: $$\mathbf{w}_c=I^*\left ( 255-c_x,255-c_y \right )$$.

# <a name="gradients"/> Computing frame gradients

An image gradient is a directional change in the or color intensity of the image.
At each pixel point of the frame, the gradient is a vector that points in the direction of the largest intensity increase, and the length of this vector corresponds to the rate of the change.

More formally the gradient of a two variable function $$f(x,y):\mathbb{R}^2\rightarrow \mathbb{R}$$ is defined as a vector of partial derivatives of that function in each direction:

$$\nabla f= {\begin{bmatrix}g_{x}\\g_{y}\end{bmatrix}}={\begin{bmatrix}{\frac {\partial f}{\partial x}}\\{\frac {\partial f}{\partial y}}\end{bmatrix}$$

Since the intensity function of a digital image is known only at discrete points, derivatives of this function cannot be defined, unless we assume some known, differentiable function which has been sampled at these points.

This is why typically the derivative of an image is approximated using [finite differences](https://en.wikipedia.org/wiki/Finite_difference)
The [implementation by trishume](https://github.com/trishume/eyeLike) implements a procedure where for inner rows of a given frame $$I$$ which calculates the gradient for inner rows as a central difference.
<!-- For $$\forall (i,j), \: i\neq j$$ the gradient in direction $$x$$ is: -->

$$ \frac{\partial I(i,j))}{\partial x}=\frac{1}{2}\left ( \left ( I(i,j+1) - I(i,j) \right )  + \left ( I(i+1,j) - I(i+1,j+1) \right )\right )$$

and in direction $$y$$:

$$\frac{\partial I(i,j))}{\partial y}=\frac{1}{2}\left ( \left ( I(i+1,j) - I(i,j) \right )  + \left ( I(i+1,j+1) - I(i+1,j+1) \right )\right )$$

For the edge rows the gradient value is the difference between the value and the adjacent position.

# <a name="implementation"/> Implementation

I decided to deviate a bit from the reference implementation.
Similar to what the paper describes I start by detecting the face region using framework descibed by [Viola and Jones, 2004](https://www.researchgate.net/publication/220660094_Robust_Real-Time_Face_Detection).

```
```

<video width="640" height="480" controls="controls">
  <source src="{{ site.baseurl }}/images/2020-07-01-rust-opencv-eye-center-localisation/screencast.mp4" type="video/mp4">
</video>

<!-- {% video {{ site.baseurl }}/images/2020-07-01-rust-opencv-eye-center-localisation/screencast.mp4 640 480 {{ site.baseurl }}/images/2020-07-01-rust-opencv-eye-center-localisation/screenshot.png %} -->
