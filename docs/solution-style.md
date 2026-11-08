# 解题风格规范

本文是所有科目共用的**唯一解题写作规范**。`AGENTS.md`、内容结构文档和设计文档引用这里，不各自维护另一套写法。更换课程、试卷或作者时，保留本规范；修改规范时同步检查示例与模板。

完整、可解析的中英文文章见 [templates/](../templates/README.md)。本文片段中的题目是写作示例，不代表新增原卷；公式来源必须按实际课程核实，不能因为示例使用了某个链接就照抄来源。

## 1. 不可变的约定

1. **原题与解答分离。** `Question` 和小问题干保留原卷措辞，另一语言忠实翻译（当前 ECSE 示例的原卷为英文）；不为方便计算而改条件。疑似错误写入 `Source correction`，不要静默修正。
2. **一篇文章一种语言。** 英文与中文各自有完整题干、导读、推导与纠错说明，按稳定 ID 配对，不按段落数或公式数配对。
3. **短的是引导语，不是计算。** 写成初学者可照着算的 worked example，而不是答案速记，也不是长篇教材讲解。
4. **一个最终计算。** 最后一个展示公式给出最终结果，使用 `\boxed{}` 强调一次；不要另外建立 Answer 栏、答案卡片、frontmatter 答案或运行时答案副本。一个问题要求多个量时，在同一最终计算组内一起给出，勿提前重复框出。
5. **按题目要求作答。** 作图题给出正确图示，列式题给出积分或方程设置，概念题给出条件与推论；不要为了凑固定结构增加不需要的积分或数值计算。

## 2. 固定的写作顺序，不是四个 UI 区块

**有据可查的主公式 → 已知与所求 → 实际代入与计算 → 得到结果。**

| 意图 | 中文引导语 | English lead-in |
|------|------------|-----------------|
| 引入公式 | 使用公式表中的[公式名称](formula:formula-id)： | Use the formula sheet's [formula name](formula:formula-id): |
| 说明条件 | 已知……，求……。 | Given …, find … . |
| 具体操作 | 把……代入……；对……积分： | Substitute … into …; integrate with respect to …: |
| 收束结果 | 代入上下限，得 / 整理得 | Evaluate the endpoints to obtain / This gives |

引导语放在其公式**前面**，点名具体变量、数值、方向或积分变量；相邻意图可以自然合并，不强制四段，也不添加 `Step 1`、`Explanation`、`Equation`、`Answer` 标题。

每个解答先展示控制关系或主公式，再代入。若来源不是公式表，要如实写“题设给出的定义”“由前问求得”“使用课程笔记中的……”，不能一律叫作 crib sheet 公式。新推导关系要通过计算建立，不能冒充已有公式。

公式名用普通段落内的 Markdown 链接，如 `[高斯定律](formula:gauss)`；引用原公式和真实来源页。链接继承段落字形，使用已有 Hover Card 预览与 PDF 定位，不在公式旁追加标签或图标。`formula:` ID 必须存在于该课程的 `content/formulas.json`。

## 3. Guide 只负责起步

`## Guide` 用简短自然段说明考点、题目实际给定的条件、目标和起步思路，并在文章元数据 `lectures` 中附上核实过的课程资料页。界面会渲染这些页链接。

- 不重复整道题，也不提前展示最后答案。
- 不把计算结果包装成“已知”。
- 不强制四个子标题；也不把完整推导搬进导读。

例如：

> 本题比较负载与传输线的阻抗。先写反射系数，再代入题设的两阻抗；分子是否为零决定负载是否反射。

> Compare the load and line impedances. Start with the reflection coefficient, then substitute the two given impedances; a zero numerator means no load reflection.

## 4. 代数、积分与排版细则

### 代数

- 中间化简放在 `aligned` 中，连续计算对齐等号。
- 能在正常阅读字号下放在一行的和、差不拆开；按有意义的计算阶段换行，不把每个操作数拆成一行。
- 保留边界条件、常数、复数相位、矢量方向、坐标与正负号约定。
- 单位使用正体，如 `\mathrm{m/s}`、`\Omega`；变量不能因换语言而改变。
- 长公式仅在公式区域滚动，不靠缩小整页或数学字号“适配”手机。

### 每个需要求值的积分

按以下链条展开，不能直接跳到面积、体积因子或最终数值：

1. 代入实际的场、密度或函数，以及微分元。
2. 对通量/内积，先把方向点乘算出来。
3. 指出相对于**当前积分变量**不变的因子，并提出积分号。
4. 给出原函数。
5. 明确写上限值减下限值，再化简；负下限要保留为减去括号内的负数。
6. 重积分逐个变量求值，再进入下一层。

首次使用陌生的微分元时就近解释其来源。例如圆柱侧面微元是弧长 `R dφ` 乘高度 `dz`，相应数学写成 $dS=R\,d\phi\,dz$。固定边界半径与哑积分变量分开；不要让积分变量与正在求场的观测点混用。

前问已经完整求出的量可以引用并复用，注明具体前问与结果，不为重复展示而重新积分。仅要求列式或证明时，不强加上述求值过程。

### 条件与推论

`\because`、`\therefore` 只连接真实条件与结论，不是每行公式的装饰。使用时放在自己的右对齐列，等号继续对齐。短并列条件能同排时保持同排。

## 5. 示例 A：数值代入，带单位与真实公式引用

这是当前示例课程中的反射公式；迁移到别科时使用那门课实际核实的公式。

### 中文

```markdown
### Solution

使用 crib sheet 的[负载反射系数](formula:reflection)：

$$
\Gamma_L=\frac{Z_L-Z_0}{Z_L+Z_0}
$$

已知 $Z_L=150\,\Omega$、$Z_0=50\,\Omega$，求负载反射系数。把两阻抗代入：

$$
\begin{aligned}
\Gamma_L&=\frac{150\,\Omega-50\,\Omega}{150\,\Omega+50\,\Omega}\\
&=\frac{100\,\Omega}{200\,\Omega}
\end{aligned}
$$

化简，得

$$
\Gamma_L=\boxed{0.5}
$$
```

### English

```markdown
### Solution

Use the crib sheet's [load-reflection formula](formula:reflection):

$$
\Gamma_L=\frac{Z_L-Z_0}{Z_L+Z_0}
$$

Given $Z_L=150\,\Omega$ and $Z_0=50\,\Omega$, find the load reflection coefficient.
Substitute the two impedances:

$$
\begin{aligned}
\Gamma_L&=\frac{150\,\Omega-50\,\Omega}{150\,\Omega+50\,\Omega}\\
&=\frac{100\,\Omega}{200\,\Omega}
\end{aligned}
$$

Simplifying gives

$$
\Gamma_L=\boxed{0.5}
$$
```

## 6. 示例 B：逐变量求重积分，展开负下限

设题目定义无量纲累计量 $M=\iint_D f(x,y)\,dA$，给出 $f(x,y)=2x+3$，矩形区域 $0\le x\le2$、$-1\le y\le1$。这是**题设定义**，不伪称为某张公式表的原式。

### 中文

```markdown
### Solution

使用题设的累计量定义；矩形面积微元由两边长度相乘，故 $dA=dy\,dx$：

$$
M=\iint_D f(x,y)\,dA
$$

已知 $f(x,y)=2x+3$，求给定矩形上的累计量。代入函数与范围，先对 $y$ 积分；此时 $2x+3$ 为常数：

$$
\begin{aligned}
M&=\int_0^2\left[\int_{-1}^1(2x+3)\,dy\right]dx\\
&=\int_0^2(2x+3)[y]_{-1}^1\,dx\\
&=\int_0^2(2x+3)\bigl[1-(-1)\bigr]\,dx\\
&=\int_0^2(4x+6)\,dx
\end{aligned}
$$

再对 $x$ 积分，代入上下限，得

$$
\begin{aligned}
M&=[2x^2+6x]_0^2\\
&=(2\cdot2^2+6\cdot2)-(2\cdot0^2+6\cdot0)\\
&=\boxed{20}
\end{aligned}
$$
```

### English

```markdown
### Solution

Use the accumulated-quantity definition in the question. A rectangular area element is the product of its side lengths, so $dA=dy\,dx$:

$$
M=\iint_D f(x,y)\,dA
$$

Given $f(x,y)=2x+3$, find the accumulated quantity over the rectangle.
Substitute the function and bounds. Integrate in $y$ first, treating $2x+3$ as constant:

$$
\begin{aligned}
M&=\int_0^2\left[\int_{-1}^1(2x+3)\,dy\right]dx\\
&=\int_0^2(2x+3)[y]_{-1}^1\,dx\\
&=\int_0^2(2x+3)\bigl[1-(-1)\bigr]\,dx\\
&=\int_0^2(4x+6)\,dx
\end{aligned}
$$

Integrate in $x$ and evaluate the endpoints to obtain

$$
\begin{aligned}
M&=[2x^2+6x]_0^2\\
&=(2\cdot2^2+6\cdot2)-(2\cdot0^2+6\cdot0)\\
&=\boxed{20}
\end{aligned}
$$
```

## 7. 概念、作图、前问与纠错怎么写

- **概念证明：** 先写控制关系，列出条件，再用关系推出结论；最后一组展示公式框出需要的结论。不要凭空填数值，也不要为了“代入”一词重复题干。
- **作图：** 主关系解释图中标注的来源，解答 SVG 放在该小问的解答区域。最终计算可以框出积分设置、区间或图中关键条件，不再求题目没要求的量。
- **复用：** “由 (a) 已求得……，代入本问的……”。英文为 “Using … from part (a), substitute into … .” 不把前问结果叫作题设或 crib 公式。
- **纠错：** 保留题面，在 `### Source correction`（小问）或 `## Source correction`（全题）说明原文/官方解答写法、冲突依据和本解采用的约定。若只是近似或模型假设，要说明适用范围，不把近似说成精确。

下面是纠错说明的**写法示意**，并非要求替换任何实际来源记录：

> 原卷题面保留上述符号。本解采用 $\mathbf E=-\nabla V$ 的约定；与题面符号的差异已在推导中明确指出，不影响使用场强平方计算的能量。

> The printed sign is retained in the question. This solution uses $\mathbf E=-\nabla V$ and identifies the sign discrepancy explicitly; energy computed from the squared field magnitude is unaffected.

## 8. 避免这些反例

| 反例 | 应改为 |
|------|--------|
| “根据公式可得”后直接放最终数值 | 展示具体公式、给定量、代入与必要中间计算 |
| “代入上式”但不指出代入什么 | 点名数值、函数、微分元或边界条件 |
| 重积分一步变成面积乘常数 | 每个变量依次展示原函数与上下限代入 |
| 把每个加数拆到单独一行 | 同一和差尽量同行，按计算阶段分行 |
| 每行都写“因此”或 `\therefore` | 只在真实推论处使用 |
| 中英共用一份不完整推导或按公式行数强配对 | 两种语言独立完整，科学结果一致 |
| 解答后再复制一遍“最终答案” | 只保留最后一组带框计算 |
| 将官方答案省略步骤当成允许跳步 | 补足初学者需要的计算，不改原始题目 |

## 9. 作者与审阅者检查清单

- [ ] 原题措辞、数据、分值与图示对过原卷；手写信息必要时看页图。
- [ ] 每种语言都完整；稳定 ID、条件、分值、来源页一致。
- [ ] 导读只给起步思路，不泄露计算结果。
- [ ] 第一组展示公式是控制关系，来源措辞准确，引用页与区域已核实。
- [ ] 短引导语在公式前；没有通用步骤标题、机械套话或大段代数叙述。
- [ ] 需要求值的积分包含微分元、点乘、常数提出、原函数与上下限。
- [ ] 单位、方向、边界常数、负号、近似和模型假设没有丢失。
- [ ] 最终结果只在最后一组计算中强调，无重复答案字段。
- [ ] 原始纠错记录保留；新纠错有可核对的依据。
- [ ] 运行 `bun run content:check`、`bun run check`、`bun test`、`bun run build`；在手机和桌面检查换行、滚动、公式引用和解答图。

自动校验能检查结构、TeX、配对、引用与资源是否完整；它**不能代替**科学推导、翻译忠实度、来源区域和教学风格的人工审阅。请将此清单用于每次内容 PR，而不是把测试通过等同于解答已经正确。
