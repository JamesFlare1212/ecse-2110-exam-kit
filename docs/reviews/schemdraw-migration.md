# Schemdraw 正式迁移与解答图就近排版

## 范围

用户确认绘图库小样后，本轮重制**全部 19 张已挂载矢量图**，分别交付英文／中文、浅色／深色四个版本，共 76 份 SVG。原资料页图、原始裁剪、PDF、SHA-256 登记、题目及小问 ID 不变。没有将旧 renderer 中未挂载的概念分支恢复为题图，也没有把之前审查的 25 道潜在新增图候选冒充本轮已实施内容。

| 纸卷 | 现有图总数 | Schemdraw 电路 | Matplotlib 科学图 | 显式就近放置的解答图 |
| --- | ---: | ---: | ---: | ---: |
| `exam1_f26` | 3 | 2 | 1 相量构造 | 2 |
| `exam1_s25` | 3 | 3 | 0 | 0 |
| `exam2_s25` | 2 | 1 | 1 功角曲线 | 2 |
| `exam2_u00` | 1 | 1 | 0 | 1 |
| `practice1_f26` | 3 | 3 | 0 | 1 |
| `practice2_f26` | 7 | 4 | 3 波形图 | 5 |
| **合计** | **19** | **14** | **5** | **11** |

## 绘图实现

- `scripts/circuit_drawing.py` 是 Schemdraw 0.23 与现有 Matplotlib 坐标的适配层。各语言仍独立持有 paper-local renderer 和完整资产；适配层不决定题目参数、绕组／桥臂拓扑或物理假设。
- 采用库的锯齿电阻、IEC 通用阻抗框、回环电感、电容、电源、二极管／SCR、端点及导线。标准元件按纸卷指定端点定位，明确设置角度，避免电源默认方向破坏斜向支路；回环数只是符号外观，不是新增匝数。
- 元件在 `plotting.prepare_figure` 的字体、碰撞和几何检查前完成绘制，恢复原有坐标范围与等比设置；重复 prepare 不重复绘制、不再次放大字体。电路圆形继续由最终显示变换核验，SVG 中的原生元件组以 `schemdraw-` 标记。
- `scripts/requirements-figures.txt` 固定 `schemdraw==0.23`。该依赖属于离线绘图与图形 CI，不加入 Bun 前端依赖或要求网站构建运行 Python。各纸卷 manifest 记录实际库版本、每图引擎／原生元件类别与数量，以及适配层、requirements、renderer 等输入的 SHA-256。
- 不能用电路库硬画所有类型的图。相量图保留同尺度电压端点、独立电流标尺和压降放大；功角图明确稳定／不稳定支路与 90 度静态模型边界。三张波形图增加与正文相同的器件导通状态带，半控桥注明二极管续流及电源电流为零，纹波图就近注明代表性模型、20 A 均值和 4 A 纹波 RMS，不画成固定振幅包络。
- 所有题图保留原有拓扑、给定量与原始图切换。只有解答图增加对应推导的符号／极性／折算注解。未知年份发电机的下方虚线明确为平衡单相等效参考，双语正文也澄清它不是额外给定的实体中性导线。

## 文案位置

解答图片不再由 `ProblemPart` 无条件追加在推导末尾。每个语言的 Solution 使用一个普通、独立的 Markdown 图片段落：

```markdown
介绍电枢模型、电流方向和反电动势……

![电枢等效电路与 KVL 绕行方向](figure:p2-f26-q1-armature)

基尔霍夫电压定律要求……
```

- `part.figure` 仍是唯一资源登记，`figure:` URI 只确定在文字流中的位置。`SolutionBody` 按 AST 的原顺序渲染已有 Figure 组件、普通段落和计算；没有复制答案、合成额外说明或改变原方程顺序。
- 校验拒绝跨小问／未登记图、重复位置、非法 ID、夹在普通段落中的图、列表／引用中的嵌套位置，以及 Question／Guide／小问题干／全题和小问 Source correction 中的教学图位置。独立复核发现的 Source correction 位置校验缺口已由父修复，并补了拒绝用例。
- 11 张现有解答图都已在两种语言里直接定位一次；例如电枢图紧跟稳态电枢说明，下一段即列 KVL；半控桥波形紧跟导通表；折算电路紧跟支路拓扑说明；功角曲线与同步斜率、稳定性解释相邻。
- Figure 的放大、适应宽度、主题／语言选择与原图切换沿用原组件。解答流中的上下图间距采用 8 px；旧模板没有位置标记时，仅保留兼容性结尾回退，当前课程不依赖该回退。

## 验证

可复现命令：

```bash
python3 -m pip install -r scripts/requirements.txt
python3 -m unittest discover -s scripts -p 'test_*.py'
python3 scripts/generate_figures.py
python3 scripts/check_figures.py
bun run check
bun test
bun run build
# 启动生产预览、使用独立安装的 Playwright 后：
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
  QA_FIGURE_LAYOUT_ARTIFACTS=artifacts/schemdraw-migration \
  bun scripts/browser-figure-layout-qa.mjs
```

本轮实际检查包括：

- 14 张电路／5 张科学图的 manifest、库版本、SVG 原生元件标记和生成输入散列；双语资源独立。
- 8 项离线回归：扁圆检出、旋转后伪方形包围盒、刻意椭圆／多面板、库元件端点和方向、短斜支路、原始坐标与字体准备幂等性、SCR 门极及正向方向。
- 76 个图形／主题／语言组合的阶段标签、圆形几何与最终 SVG 中文字体覆盖／预算；最终本地化交付另做目视检查。
- 16 份原图裁剪在重制前后 SHA-256 逐一比较，全部字节不变。
- 全部含图页面的双语／双主题桌面及手机检查；按每个 Solution 的 AST 逐节点核对段落、计算、图的顺序，确认每图仅一份、KVL 图前后文与 8 px 间距正确，保持局部缩放及图片失败重试、源图切换与高度稳定。

独立实现者与只读复核的代理检查、程序测试和目视渲染都不等同于授课者或双语专业人员的最终学科／翻译验收。来源歧义、模型限制和既有纠错说明继续保留。
