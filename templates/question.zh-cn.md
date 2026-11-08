---
id: e1-f00-q1
title: 一次函数
topic: 微积分 · 代入与定积分
points: 10
givens:
  - f(x)=2x
lectures:
  - doc: course-notes
    page: 1
    label: 代入与定积分
parts:
  a:
    points: 4
  b:
    points: 6
---

## Question

设 $f(x)=2x$，其中 $x$ 与 $f(x)$ 均为无量纲量。

## Guide

直接求值时使用题设的函数定义。求定积分时先找原函数，再将上限和下限分别代入相减；负下限要保留括号。

## Part a

求 $f(3)$。

### Solution

使用题设给出的函数定义：

$$
f(x)=2x
$$

已知 $x=3$，求 $f(3)$。把自变量代入定义，得

$$
f(3)=2(3)=\boxed{6}
$$

## Part b

计算 $\displaystyle\int_{-1}^{2}f(x)\,dx$。

### Solution

使用课程笔记中的[微积分基本定理](formula:fundamental-theorem)：

$$
\int_a^b f(x)\,dx=F(b)-F(a),\qquad F'(x)=f(x)
$$

已知 $f(x)=2x$，积分下限为 $-1$、上限为 $2$，求定积分。把函数代入，提出常数后积分：

$$
\begin{aligned}
I&=\int_{-1}^{2}2x\,dx\\
 &=2\int_{-1}^{2}x\,dx\\
 &=2\left[\frac{x^2}{2}\right]_{-1}^{2}
\end{aligned}
$$

把上限和下限分别代入相减，得

$$
\begin{aligned}
I&=2\left(\frac{2^2}{2}-\frac{(-1)^2}{2}\right)\\
 &=4-1=\boxed{3}
\end{aligned}
$$
