# 电路绘图库调研与可复现小样

> 后续状态：用户已批准正式采用，全部现有图的迁移与文案位置改造见 [Schemdraw 正式迁移](schemdraw-migration.md)。下文保留小样评估阶段的范围和实测记录，不代表当前仍停留在原型阶段。

## 本轮范围

用户指出：半控桥图中的正弦形电感与锯齿形电阻太像，希望先调查绘图库并看小样。本轮**只评估与制作样图，不迁移正式题图或解答图**。来源悬浮卡名称过长的 UI 修复独立完成：按 `course.json` 的公式表分组显示 `Exam 2 公式表` / `Exam 2 sheet` 与完整的 `p.1`，原始标题、页码和定位区域均未改。

## 方案比较

| 方案 | 已核实的能力 | 与当前项目的配合 | 本轮判断 |
| --- | --- | --- | --- |
| **Schemdraw 0.23** | Python 元件库；`ResistorIEEE`、半圆弧 `Inductor`、回环线圈 `Inductor2`、`Diode`、`SCR`、端点、连接线与箭头；支持 Matplotlib 及直接 SVG 两种后端；MIT 许可。 | 可以把库绘图放入现有 Matplotlib Axes，再沿用 SVG 原生文本、双主题、字体及几何检查。直接 SVG 后端不需要 TeX；数学排版要求更高时可选 ziamath，非本样图所需。 | **首选。已在隔离环境实际安装、生成并目视检查。** 本轮样图同时使用 Matplotlib 后端验证现有工作流，并使用直接 SVG 后端生成内联展示版本。 |
| **CircuiTikZ** | 基于 TikZ 的专业电路排版宏包，适合 LaTeX 图文和电压／电流约定；主要原生交付为 TeX/PDF，SVG 需要额外转换。 | 需要 TeX/TikZ 工具链；可以做高质量离线图，但会扩大现有 Python 图形维护环境，SVG 文字和转换也需单独验收。 | 文档评估，**本轮未安装或执行**；若以后要统一 TeX 讲义，可再考虑。 |
| **Lcapy** | 从 netlist 加方向提示生成图，另有符号电路分析；其电路绘制使用 CircuiTikZ。 | 若需要 netlist 与符号分析联动很有价值；单为改善电感符号，会引入不必要的分析及 TeX 绘图链。不能把非线性开关图支持误称为已完成 SCR 时变电路分析。 | 文档评估，**本轮未安装或执行**；当前任务不优先。 |

没有人为打分或声称某库能自动验证题目的科学正确性。绘图库提供符号与排版，不会替作者决定电路拓扑、参考极性或导通状态。

## 小样与复现

生成器：`scripts/samples/schemdraw_demo.py`。

输出在被忽略的 `artifacts/circuit-library-sample/`，不进入 `content/`、`static/` 或构建资源：

- `symbols.svg`、`symbols-dark.svg`：锯齿电阻、单侧半圆弧电感、回环线圈电感；另有 PNG。
- `semi-controlled-bridge.svg`、`semi-controlled-bridge-dark.svg`：半控桥示例，电阻保留锯齿，电感使用 `Inductor2` 的完整回环线圈；另有 PNG。
- `native-symbols.svg`、`native-bridge.svg`：同一套库元件的直接 SVG 后端输出，保留可搜索的文本；`sample.html` 将这两份实际输出嵌入，并使用主题变量着色。没有用手绘路径冒充库输出，没有远程字体或图片。
- `report.json`：实际运行版本、元件数、输出大小与圆形检查结果。

隔离安装示例（Matplotlib 环境已有图形依赖）：

```bash
python3 -m venv --system-site-packages /tmp/fieldnotes-schemdraw-sample
/tmp/fieldnotes-schemdraw-sample/bin/python -m pip install --no-deps 'schemdraw==0.23'
/tmp/fieldnotes-schemdraw-sample/bin/python scripts/samples/schemdraw_demo.py
```

不依赖本机临时环境路径即可换成自己的虚拟环境。没有把 Schemdraw 加到前端依赖、默认构建、CI 或正式图形 requirements 中；确认样式后再决定是否纳入离线绘图依赖。

## 本次实测与验收边界

- 已生成深浅两主题的符号组和半控桥图，SVG 保留原生文本，PNG 供离线审视。
- 两个 SCR、两个二极管，全部正向朝上；保留原半控桥的二极管桥臂、R–L 串联负载、交流输入端口、源电流与输出电流方向。没有增加独立续流二极管、磁芯或数值条件。
- 下方交流输入线与 SCR 桥臂交叉处有跨线弧、没有连接点；真正的中点和母线连接有节点。程序检查元件数与 R／L 端点，拓扑和极性仍经目视核对，不能把这些有限断言称为完整 KCL／KVL 自动证明。
- 回环线圈即使不靠颜色也能与锯齿电阻区分；图中的 4 个回环只是符号外观，**不表示题目给定了 4 匝**。`Inductor` 的单侧半圆弧也是备选，未在正式内容中选定一种。
- 给现有 Matplotlib Axes 绘图时，Schemdraw 不自动替宿主设置等比例和隐藏坐标轴。本样图显式调用 `axis('off')` 与现有 `plotting.equal_units(ax)`，并复用圆形最终变换检查，避免再次出现扁圆。
- 试验直接 SVG 后端时，0.23 在没有 ziamath 的环境调用 `svgconfig.precision` 会访问缺失配置。本样图不使用该可选配置；推荐的 Matplotlib 路径不依赖它。`svgconfig.text='text'` 可用，但完整 TeX 支持与 SVG 字体覆盖须按最终选定后端另验收。
- 真正接入前，还要逐题核对器件位置、阳极／阴极、门极、交叉线、原图视角与拓扑；为每种语言独立生成两主题资产，继续保留原图切换。不要把库默认 ground、极性或布局变成未给定条件，也不要将此原型挂成新的原题图。

## 一手资料

- [Schemdraw 电气元件目录](https://schemdraw.readthedocs.io/en/stable/elements/electrical.html)：两种电感、SCR、二极管、电阻及端点。
- [Schemdraw 后端说明](https://schemdraw.readthedocs.io/en/stable/usage/backends.html)：现有 Axes 集成、SVG 原生文本、可选数学排版。
- [Schemdraw 放置规则](https://schemdraw.readthedocs.io/en/stable/usage/placement.html)：端点、方向与连接。
- [Schemdraw 标签](https://schemdraw.readthedocs.io/en/stable/usage/labels.html)：数学标注及定位。
- [Lcapy 原理图文档](https://lcapy.readthedocs.io/en/stable/schematics.html)：netlist、方向提示、CircuiTikZ 后端及非线性元件分析边界。
- [CircuiTikZ 官方仓库](https://github.com/circuitikz/circuitikz)：TeX/TikZ 依赖与 PDF 工作流。
