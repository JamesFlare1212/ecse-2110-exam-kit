# Flux · ECSE 2110

Flux（磁通）是这门课的习题工作台；Φ 标志与浏览器图标共用本地 SVG。显示名称由 `content/course.json` 的 `brand` 配置，课程副标题跟随语言切换。界面更名不改变原有学习记录的存储键。

**Electrical Energy Systems / 电能系统** 双语学习工作台，基于 [ecse-2100-exam-kit](https://github.com/JamesFlare1212/ecse-2100-exam-kit)（模板快照 `b75e950`）。保留模板的暖纸色、三栏阅读界面、完整 worked examples、公式溯源和本地进度；在纸上练习，不增加答题框、笔记模式或答案卡片。

## 内容

- 4 套考试与 2 套练习，共 **39 道题、90 个小问**，中英文分别拥有完整原题、逐问解答、纠错和图片；阅读页从原题直接进入各小问，不再显示独立导读块。练习不编造分数。
- Fall 2026 Exam 1；两份封面日期为 2025、但页脚年份冲突的历史卷；一份年份未知的 Exam 2 重制卷，不把旧卷冒充 Fall 2026。
- 22 条公式索引**只来自两份原始 `Reference_Sheet`**。Exam／练习组 1、2 分别使用对应表，不合并、不添加讲义公式；完整表通过两页原页图浏览。
- 原题无图就不显示图卡；只复刻实际印刷题图。辅助电路、功角图和波形只在相应解答中显示。
- 12 份主讲义、3 份 Post Lecture 版本、7 份作业及已提供的 6 份答案、课程大纲，保留页图、真实来源散列与定位记录。

原始 `submission_369646790(1).pdf` **不进入站点或 Git**。印刷 Q2–Q5 已独立重制为干净题面，再生成可浏览的页图；去除评分、姓名、学号、手写答案和拍摄背景。无法恢复印刷 Q1，不编造，保留原题号与 95 分总分。[重制记录](docs/exam2-reconstruction.md) 说明来源边界。

Fall 2026 Exam 1 的来源采用官方答案内干净的题面，而非带批注的同卷扫描。原页中含解答时明确提示。历史卷的年份、120/100 分冲突、单位和官方解答错误均保留在各题纠错及[课程说明](docs/courses/ecse-2110.md) 中。

## 启动与构建

使用 Bun（版本见 `package.json`）；完整类型检查需要 Node 24。**网页、测试和构建不需要原始 PDF、Python、资源 ZIP 或下载地址。**

```bash
bun install --frozen-lockfile
bun run dev

bun run check
bun test
bun run build
```

开发地址默认 `http://127.0.0.1:5173`；`build/` 是完整静态站点，`bun run preview` 可预览。技术栈为 Astro 7、Svelte 5、TypeScript 7、Tailwind 4、原生 shadcn-svelte / Bits UI 和 KaTeX，运行时不依赖外部服务。

### 来源浏览，不提供下载

题干与解答来自 Markdown，图示为 SVG，试卷／讲义／公式表通过已保存的 WebP 页图浏览。保留翻页、缩放、缩略图、原图切换和引用区域标记；**没有 PDF 下载或“打开原始 PDF”入口**。

`papers:prepare` 将各语言的图片暂存到 `static/papers/`，再将可发布静态资源同步到 Git 忽略的 `.public-assets/`。两个环节都排除 PDF，Astro 仅发布 `.public-assets/`。即使维护者本地保留原始 PDF，`build/` 也不会包含它们。不要编辑暂存目录。

来源登记中的 PDF 文件名、SHA-256、页数和尺寸作为溯源元数据保留，不表示网站提供 PDF 文件，也不会触发下载。

### Coolify / Railpack

仓库自带全部部署所需的 Markdown、页图、截图、SVG 和本地字体，直接使用：

| 设置 | 值 |
|---|---|
| Site type | Static |
| Base Directory | `/` |
| Install Command | `bun install --frozen-lockfile` |
| Build Command | `bun run build` |
| Publish Directory | `/build` |
| Nginx port | `80` |

**无需上传 PDF 或配置 `COURSE_SOURCES_URL`、`COURSE_SOURCES_FILE` 等变量。** 旧资源下载变量可以删除。原始 PDF、整个 `reference/`、本地 ZIP 和 `artifacts/` 不属于部署输入。

### GitHub CI

`.github/workflows/ci.yml` 在推送 `master`／`main`、PR 和手动触发时运行。`app-checks` 先执行类型检查、完整题库／元数据校验、测试与静态构建；浏览器回归按 `scripts/browser-ci-suites.ts` 分为 startup、reading、conduction、converter-focus、sources、navigation 六个独立并行任务，每组保留 15 分钟时限，避免把所有检查串在同一任务里超时。各组独立构建核心任务记录的同一提交 SHA，失败诊断按组保存；原有 `App checks, tests and build` 检查名作为汇总门禁，仅在核心检查和所有浏览器分组通过后成功，不会因拆分而提前放行；navigation 组另查开发服务器的样式生命周期。Python 3.12／3.14 任务仅安装 `scripts/requirements-figures.txt` 做图形和嵌入字体检查。

CI **无需 PDF、资源包地址或秘密变量**。实际原文件的散列、PDF 对象和源裁图检查属于下面的可选离线维护流程，不伪装成网页构建的依赖。

## 离线来源维护（可选）

只有重新提取原页、重制试卷或重新裁图才需要本地 PDF。各语言的规范原件及 SHA-256 记录保留，既有原件不删除、不改跟踪状态；不把学生导出当作发布素材。

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r scripts/requirements.txt
# 缺少本地原件时，只从自己的授课资料目录按登记散列恢复：
python3 scripts/provision_sources.py --reference-dir reference

python3 scripts/check_sources.py
python3 scripts/check_reconstruction.py
python3 scripts/prepare_sources.py --locale en
python3 scripts/prepare_sources.py --locale zh-cn
python3 scripts/render_excerpts.py
python3 scripts/generate_figures.py
python3 -m unittest discover -s scripts -p 'test_*.py'
python3 scripts/check_figures.py
```

电路图使用固定版本的 Schemdraw 0.23，经 Matplotlib 输出保留文字的 SVG；波形、功角和相量采用 Matplotlib，并保持物理量与比例约定。此依赖只属于离线绘图环境，前端构建不运行 Python。解答图的位置由 Markdown 的 `![说明](figure:图名)` 段落指定，靠近对应的模型或推导，而不是统一放到结尾；图名仍由小问的 `figure` 元数据登记。

图形检查会核验最终显示变换中的圆形电源、端点与节点，防止横纵比例不同把圆画成椭圆；有意绘制的椭圆绕行箭头和三维投影不受此限制。

`requirements.txt` 是完整离线工具；只做图形检查时使用 `requirements-figures.txt`，无需 PyMuPDF 或 ReportLab。两份 Reference Sheet 独立核验，绝不合并。重制流程见 [docs/exam2-reconstruction.md](docs/exam2-reconstruction.md)。

## 学习与维护

中英切换、深浅主题、逐问展开、收藏和掌握标记沿用模板。题目通过侧栏或面包屑目录导航，公式按考试组在资料库中浏览；不提供搜索入口或搜索快捷键。`Ctrl/Cmd+B` 切换导航。进度存于当前浏览器的 `ecse2110-fieldnotes-v1`，不覆盖 ECSE 2100 记录，不跨设备同步。每页只包含当前题的完整解答及不含解答的导航索引；禁用 JavaScript 仍可读题。

| 规范 | 入口 |
|---|---|
| 唯一解题风格与审阅清单 | [docs/solution-style.md](docs/solution-style.md) |
| Markdown、语言配对、资产契约 | [content/README.md](content/README.md) |
| 课程配置 | `content/course.json` |
| 来源冲突与科学约定 | [docs/courses/ecse-2110.md](docs/courses/ecse-2110.md) |
| 迁移与设计规则 | [docs/template-guide.md](docs/template-guide.md)、[设计系统](design-system/fieldnotes/MASTER.md) |

浏览器回归对已启动的生产预览执行，Playwright / Chromium 独立安装：

```bash
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  QA_URL=http://127.0.0.1:4173 bun scripts/browser-startup-qa.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  QA_URL=http://127.0.0.1:4173 bun scripts/browser-course-qa.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  QA_URL=http://127.0.0.1:4173 bun scripts/browser-reader-layout-qa.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  QA_URL=http://127.0.0.1:4173 bun scripts/browser-reader-sections-qa.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  QA_URL=http://127.0.0.1:4173 bun scripts/browser-sidebar-controls-qa.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  QA_URL=http://127.0.0.1:4173 bun scripts/browser-course-citations-qa.mjs
```

阅读区布局回归覆盖 320–2560 px、1180 px 两侧、侧栏开合、中英与深浅主题，检查内容宽度连续变化、手机抽屉及无 JavaScript 的布局。顶栏侧栏按钮回归覆盖居中、按压不位移、左右提示边缘对齐、快捷键与手机抽屉。阅读结构回归确认退役导读及其标题不在 DOM 中，验证全局／逐问展开、完整解答和旧记录兼容；历史 `Guide` 源文不再下发到阅读页。课程引用回归逐页核对中英文解答和纠错说明的原页链接、资源可达性、来源查看器与焦点返回；`content:check` 同时拒绝正文中纯文本的讲义引用。核对范围与记录见 [课程资料引用审查](docs/reviews/course-citation-links.md)。

变流器默认波形由每小问的 `interaction.defaultSignals` 指定，必须对应题干所求，双语一致且符合桥的拓扑；不是全局的四条预设。Q4(a) 默认点亮所求八条，Q3(a) 聚焦 I₀，Q5(b)(iv)／Q6(a) 保留题目要求的四条。灰色参考波仍可手动点亮，选择不写入学习记录。

变流器滑块回归覆盖 Q3–Q6、中英／深浅主题、320–1440 px（含 1.5 倍像素密度），核对五个刻度与圆点／填充的真实角坐标、按钮与轨道中心线、圆点盖住刻度的实际像素，以及拖动、点击、0.1° 键盘输入和触屏操作。

```bash
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  QA_URL=http://127.0.0.1:4173 bun scripts/browser-converter-slider-qa.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  QA_URL=http://127.0.0.1:4173 bun scripts/browser-converter-defaults-qa.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  QA_URL=http://127.0.0.1:4173 bun scripts/browser-converter-waves-qa.mjs
```

波形标尺回归直接比对 SVG 的屏幕坐标与 HTML 标签／刻度中心，覆盖 Q3–Q6 各自真实触发角、59° 游标、曲线裁剪终点、侧栏开合与窄屏标签错层；刻度、虚线和曲线必须共用坐标映射，不能只核对百分比或靠固定边距排版。

变流器切题回归须分别对生产预览和开发服务器运行，覆盖组件缓存、前进后退、语言/主题切换及加载途中导航。只检查首次打开无法发现开发模式的样式生命周期问题，见 [调查记录](docs/reviews/converter-style-lifecycle.md)。

```bash
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  QA_URL=http://127.0.0.1:4173 bun scripts/browser-converter-navigation-qa.mjs
# 对已启动的 bun run dev 再运行一次：
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  QA_URL=http://127.0.0.1:5173 bun scripts/browser-converter-navigation-qa.mjs
```

ECSE 2110 数值和内容测试保持启用；上游 ECSE 2100 专属回归按课程 ID 跳过。自动检查不替代科学推导、原文、翻译和最终图示的人工核对。
