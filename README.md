# Fieldnotes · ECSE 2110

**Electrical Energy Systems / 电能系统** 双语学习工作台，基于 [ecse-2100-exam-kit](https://github.com/JamesFlare1212/ecse-2100-exam-kit)（模板快照 `b75e950`）。保留模板的暖纸色、三栏阅读界面、完整 worked examples、公式溯源和本地进度；在纸上练习，不增加答题框、笔记模式或答案卡片。

## 内容

- 4 套考试与 2 套练习，共 **39 道题、90 个小问**，中英文分别拥有完整原题、导读、逐问解答、纠错和图片。练习不编造分数。
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

`.github/workflows/ci.yml` 在推送 `master`／`main`、PR 和手动触发时运行。前端执行类型检查、完整题库／元数据校验、测试、静态构建及桌面／手机浏览器回归；Python 3.12／3.14 任务仅安装 `scripts/requirements-figures.txt` 做图形和嵌入字体检查。

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

中英切换、深浅主题、搜索、逐问展开、收藏和掌握标记沿用模板。`Ctrl/Cmd+K` 搜索，`Ctrl/Cmd+B` 切换导航。进度存于当前浏览器的 `ecse2110-fieldnotes-v1`，不覆盖 ECSE 2100 记录，不跨设备同步。每页只包含当前题的完整解答及不含解答的导航索引；禁用 JavaScript 仍可读题。

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
```

ECSE 2110 数值和内容测试保持启用；上游 ECSE 2100 专属回归按课程 ID 跳过。自动检查不替代科学推导、原文、翻译和最终图示的人工核对。
