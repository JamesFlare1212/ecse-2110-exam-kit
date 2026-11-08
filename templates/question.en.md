---
id: e1-f00-q1
title: A linear function
topic: Calculus · substitution and definite integrals
points: 10
givens:
  - f(x)=2x
lectures:
  - doc: course-notes
    page: 1
    label: Substitution and definite integrals
parts:
  a:
    points: 4
  b:
    points: 6
---

## Question

Let $f(x)=2x$, where $x$ and $f(x)$ are dimensionless.

## Guide

Use the function definition for direct evaluation. For the definite integral,
find an antiderivative and evaluate it at the upper and lower limits, keeping
the negative lower limit in parentheses.

## Part a

Find $f(3)$.

### Solution

Use the function definition supplied in the question:

$$
f(x)=2x
$$

Given $x=3$, find $f(3)$. Substitute into the definition to obtain

$$
f(3)=2(3)=\boxed{6}
$$

## Part b

Evaluate $\displaystyle\int_{-1}^{2}f(x)\,dx$.

### Solution

Use the course notes' [fundamental theorem of calculus](formula:fundamental-theorem):

$$
\int_a^b f(x)\,dx=F(b)-F(a),\qquad F'(x)=f(x)
$$

Given $f(x)=2x$ and limits $-1$ and $2$, find the definite integral.
Substitute the function, extract the constant and integrate:

$$
\begin{aligned}
I&=\int_{-1}^{2}2x\,dx\\
 &=2\int_{-1}^{2}x\,dx\\
 &=2\left[\frac{x^2}{2}\right]_{-1}^{2}
\end{aligned}
$$

Substitute the upper limit minus the lower limit to obtain

$$
\begin{aligned}
I&=2\left(\frac{2^2}{2}-\frac{(-1)^2}{2}\right)\\
 &=4-1=\boxed{3}
\end{aligned}
$$
