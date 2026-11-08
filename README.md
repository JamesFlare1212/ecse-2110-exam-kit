# Fieldnotes · ECSE 2110

**Electrical Energy Systems / 电能系统** 的双语考试学习工作台，基于 [JamesFlare1212/ecse-2100-exam-kit](https://github.com/JamesFlare1212/ecse-2100-exam-kit)（模板快照 `b75e950`）。保留模板的理念、样式与交互：原题与导读分离，完整 worked examples，单一解答视图，公式与讲义溯源；在纸上练习，不增加答题框、笔记模式或答案卡片。

## 内容

- 4 套考试卷与 2 套练习题，共 39 道题、90 个小问，均作为独立双语试卷包维护完整题干、导读、逐问推导、纠错与资源；练习不编造考试分值。
- Fall 2026 Exam 1；两份封面日期为 2025、但标题/页脚年份冲突的历史考试；一份**年份未注明的 Exam 2 重制卷**。不把旧卷冒充 Fall 2026。
- 22 条公式索引**只来自两份原始 `Reference_Sheet`**，不混入讲义。Exam／练习组 1 使用第一份，组 2 使用第二份；各自保留完整的两页 PDF、原式截图和页内定位，不拼接成一张表。
- 原题没有插图就不显示题图。只复刻实际印刷题图；辅助电路、功角图和波形图只在相应解答展开后显示。中英与深浅主题各自维护静态 SVG。
- 12 份主讲义、3 份 Post Lecture 版本、7 份作业及已提供的 6 份答案、课程大纲；保留真实散列、页尺寸和来源定位。

**Gradescope 原始下载不进入站点。** `submission_369646790(1).pdf` 仅作本地核对；可辨认的印刷 Q2–Q5 重新排成干净的文本/矢量试卷，去除评分页、姓名、学号、手写答案和照片。Q1 对应私人手写资料，没有可恢复的印刷试题，因此不编造；保留原题号，可恢复总分为 95。重制方法与边界见 [重制记录](docs/exam2-reconstruction.md)。

Fall 2026 Exam 1 的来源选用官方答案内干净的题面；不再使用带手写批注的同卷扫描。该 PDF 含解答，查看来源页时会明确提示。历史 Exam 1 的印刷分数合计 120，与封面 100 不符；保留原分值，不静默改题。日期、单位、绕组模型、相量符号和官方答案问题见 [ECSE 2110 课程说明](docs/courses/ecse-2110.md) 及各题纠错。

## 启动

前端使用 Astro 7、Svelte 5、TypeScript 7、Tailwind 4、原生 shadcn-svelte / Bits UI、KaTeX。界面、字体、PDF 和图片均本地提供，运行时不依赖外部服务。

环境：Bun（版本见 `package.json`），完整检查使用 Node 24。构建前的 PDF 恢复只使用 Bun；PDF 重制、离线绘图与深度来源核验才需要 Python。

```bash
bun install --frozen-lockfile
bun run dev
```

`dev` 和 `build` 都先运行 `sources:prepare`：已齐备的 PDF 逐一核验后离线构建，缺少时从本地 `reference/` 或配置的资源 ZIP 恢复，然后才暂存、校验和构建。开发地址以终端输出为准。`bun run build` 输出可静态托管的 `build/`；`bun run preview` 预览构建。

### 从新克隆恢复原始 PDF

沿用模板的大文件规则：**不提交新增大型原始 PDF，但站点可以发布这些 PDF。** 页图、SVG、Markdown、来源散列和干净重制卷随项目维护；大型原卷、课件等放在 Git 忽略的规范目录中。不要直接将整个 `reference/` 复制到 `static/`。

将授课资料放回本地 `reference/`（目录与本次提供的资料一致），然后：

```bash
bun run sources:prepare
# 资料位于其它目录时：
COURSE_REFERENCE_DIR=/absolute/path/to/reference bun run sources:prepare
```

这一步不需要 Python。原来的 `python3 scripts/provision_sources.py --reference-dir reference` 仍可用于维护；需要离线绘图时再安装 `scripts/requirements.txt`。

恢复工具只读取已登记且 SHA-256 匹配的文件，不改写来源记录，不导入学生导出。两张公式表分别逐字节恢复，绝不合并。干净重制卷若需要更新，按 [重制记录](docs/exam2-reconstruction.md) 使用其独立生成脚本，不重新引入扫描件。

首次重新登记共享课程资料才使用 `python3 scripts/import_course_sources.py`；常规恢复不要运行它来接受散列变化。

### CI / 部署资源

**从 Git 克隆并不包含被忽略的大型 PDF。** 如果部署日志出现 `Missing paper resource: .../assets/sources/*.pdf`，不能靠重新提交代码、跳过检查或只配置运行时变量解决，必须在构建期供给原始资源。

在已齐备、已核验的本地工作目录创建部署 ZIP：

```bash
bun run sources:bundle
# 默认输出：artifacts/deployment/ecse2110-sources.zip（Git 忽略）
# 也可指定项目外的输出路径：
bun run sources:bundle /outside/repo/ecse2110-sources.zip
```

然后任选一种供给方式，构建命令仍是 `bun run build`：

| 构建变量 | 用法 |
|---|---|
| `COURSE_SOURCES_URL` | 设置为该 ZIP 的可下载 HTTPS 地址；Nixpacks / Coolify 等平台必须设为**构建期可用**，不能只设运行时环境变量 |
| `COURSE_SOURCES_FILE` | ZIP 已被复制或挂载到构建容器时，设置为容器内可读路径（宿主机路径不会自动进入 Docker 构建） |
| `COURSE_REFERENCE_DIR` | 构建环境已提供原始授课目录时，设置为该目录；默认也会检查项目下的 `reference/` |

```bash
# 无 Python 的本地/容器构建示例（ZIP 必须在该环境中真实存在）：
COURSE_SOURCES_FILE=/run/course-sources.zip bun run build
```

ZIP 只包含来源登记中的规范 PDF，不含本地原始 Gradescope 导出；没有上传到新远程服务，也不会被提交到 Git。工具仅恢复预期路径，逐一校验 SHA-256，保持中英独立文件，不改写来源记录。既有文件散列错误会失败，不静默覆盖。资源 URL 只在构建时使用，不进入浏览器代码或构建日志；若是签名链接，请使用平台的私密构建变量，而不是 `PUBLIC_*` 变量。

GitHub Actions 的 `COURSE_SOURCES_URL` repository variable 与部署平台的变量相互独立，需分别配置；Actions 也支持手动输入 `sources_url`。Bun 与原 Python 工具生成的 ZIP 格式兼容。缺少资源、资源包不全或散列不匹配时均明确失败，不跳过内容/来源检查。

## 学习界面

沿用模板的暖纸色、墨色正文、克制橙色操作与青色引用，桌面三栏、手机抽屉；中英切换、深浅主题、题目/公式搜索、逐问展开、收藏和掌握标记。`Ctrl/Cmd+K` 搜索，`Ctrl/Cmd+B` 切换左侧导航。独立题目链接如 `/problems/e1-f26-q6/`；禁用 JavaScript 仍可读题。

进度保存在当前浏览器的 `ecse2110-fieldnotes-v1`，不会覆盖 ECSE 2100 的记录，不跨设备同步。每页只携带当前题的完整解答与不含解答的导航索引。

## 维护与校验

| 内容 | 入口 |
|---|---|
| 唯一解题写作规范 | [docs/solution-style.md](docs/solution-style.md) |
| Markdown、语言配对与资产契约 | [content/README.md](content/README.md) |
| 课程配置 | `content/course.json` |
| 课程事实与来源冲突 | [docs/courses/ecse-2110.md](docs/courses/ecse-2110.md) |
| 迁移说明 | [docs/template-guide.md](docs/template-guide.md) |
| 设计规则 | [design-system/fieldnotes/MASTER.md](design-system/fieldnotes/MASTER.md) |

```bash
bun run content:check
bun run check
bun test
bun run build
python3 scripts/check_sources.py
python3 scripts/check_reconstruction.py
python3 scripts/check_figures.py
```

重新生成离线资源：

```bash
python3 scripts/prepare_sources.py --locale en
python3 scripts/prepare_sources.py --locale zh-cn
python3 scripts/render_excerpts.py
python3 scripts/generate_figures.py
```

浏览器回归使用独立安装的 Playwright / Chromium，对已启动的生产预览执行：

```bash
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  QA_URL=http://127.0.0.1:4173 bun scripts/browser-startup-qa.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  QA_URL=http://127.0.0.1:4173 bun scripts/browser-course-qa.mjs
```

通用回归和 ECSE 2110 数值/内容测试保持启用；模板自带的 ECSE 2100 特定电磁学回归按课程 ID 跳过，不充作本课程验收。结构、公式排版、资源和数值检查不能替代原文、翻译与科学图示的人工核对。
