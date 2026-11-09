# 将 Fieldnotes 迁移到另一门课或另一场考试

Fieldnotes 的可复用单位是 **工作台 + 课程配置 + Markdown 试卷包**。上游仓库保留完整的 ECSE 2100 示例；本仓库是独立的 ECSE 2110 迁移副本，不携带旧课程题库或共享 PDF。同一课程新增考试只需添加一对试卷目录。

这是中英双语、带数学详解与资料溯源的静态学习工作台，不是多课程后台或任意 LMS。现有 URL、稳定 ID、内容分离、单一解答视图及旧学习记录兼容性保持不变。

## 1. 三个边界

| 层 | 文件/目录 | 迁移时做什么 |
|----|-----------|--------------|
| 通用工作台 | `src/`、`astro.config.ts`、`scripts/` 中的内容/资源管线 | 通常不修改页面组件，不重新发明控件 |
| 课程身份与资源目录 | `content/course.json` | 改课程名称、默认题目、存储命名空间、讲义目录与公式表文档 |
| 课程内容 | `content/formulas.json`、`content/documents.json`、`content/{en,zh-cn}/exam*/`、共享来源资源 | 换成新课程的真实材料、文章、图示和来源记录 |
| 写作契约 | [solution-style.md](solution-style.md)、[content/README.md](../content/README.md) | 保持风格和结构，不改成另外一套步骤协议 |
| 课程特例 | [courses/ecse-2100.md](courses/ecse-2100.md)、对应科学回归用例与纸张绘图器 | 参考后替换为新课自己的约定和测试，不能直接当作通用定律 |

[templates/](../templates/README.md) 提供配置与中英文完整 worked example。
它们不在 `content/en/` 或 `content/zh-cn/`，不会混入真实题库。

## 2. 同一课程新增考试

无需改 `src/` 或导入清单。按照 [新增试卷流程](../content/README.md#adding-a-paper)
建立 `content/en/exam1_f27/` 和 `content/zh-cn/exam1_f27/`，填写元数据、单语言文章、来源与各自的资产，并核对原卷。

- `exam{number}_{f|s}{year}` 和 `e{number}-{f|s}{year}-q{number}` 是当前稳定的技术命名约定，与科目无关。
- `number` 可以表示该课的测验、期中或期末序号；`paper.json` 的 `term` 是各语言独立的显示文字。
- 有明确年份时，同一考试序号/年份使用 `f`、`s` 两个技术槽位，年份后缀为两位。本副本另外支持专用于未知年份的 `u00` 槽位（如 `exam2_u00`、`e2-u00-q3`），此时 `year` 必须是 `null`，不能用它编造年份。TS/Python 发现、Astro 集合、ID 校验和存储解析均覆盖此槽位，测试见 `tests/undated.test.ts`。这不表示支持任意命名、任意学期或多课程同时注册。
- 现有 paper 的稳定 ID 不改名。新旧试卷同时存在时，所有 ID 必须唯一；同一科目的新增试卷沿用该科的存储键。

## 3. 换一门课

### 3.1 在副本中准备新内容

先保留原仓库与学习记录。仅在新课程副本中，将旧课程的两种语言试卷包及其共享课程资料归档到项目外，再补入新内容。不要只删中文或英文的一边。

同时检查共享 `static/sources/`、`static/pages/`、`static/excerpts/` 与
`content/extracted/`；不再引用的旧课程资源不会因更改 JSON 自动从这些共享目录消失，仍可能被静态构建复制。不要把旧课程 PDF 误打包为新课素材。

`static/papers/` 是可再生的暂存目录，由构建自动同步，不在里面编辑内容。
**当前项目的既有资源不因模板化而删除、取消跟踪或重写历史。**

### 3.2 修改课程配置

从 [templates/course.json](../templates/course.json) 开始，把它放到新项目的
`content/course.json`。字段定义见 [content/course.ts](../content/course.ts)。

| 字段 | 含义 |
|------|------|
| `id` | 小写课程 slug；也用于标识课程专用回归测试 |
| `code` | 顶栏、页脚、浏览器标题中的课程标识，例如 `MATH 101` |
| `brand` | 可选的工作台显示名称；本课为 `Flux`，旧配置省略时保留 `Fieldnotes`。只改变显示，不重命名存储键或已有记录 |
| `title.en` / `title.zh` | 两种语言的课程名称；页面描述使用对应语言 |
| `defaultProblemId` | 首页偏好的题目 ID；`null` 或该题暂时缺席时回退到发现的第一题 |
| `storageKey` | 带 `-v1` 等版本后缀的浏览器存储键；不同课程使用不同命名空间 |
| `resources.formulaSheet` | 单一公式表的兼容默认 ID；没有统一表时为 `null` |
| `resources.formulaSheets` | 可选的考试序号到公式表文档 ID 的映射；本课分别使用两份原始 Reference Sheet，不合并或补入讲义 |
| `resources.lectures` | 按显示顺序列出 `{doc, label, title:{en,zh}}`；允许为空 |

`doc` 对应来源登记中的真实 ID，不必叫 `lecture-01`；`label` 可以是 `01`、`A` 等短标签。页面不再从文档名末尾猜编号，也不假定固定有 15 讲或 10 页公式表。引用未列入导航目录的文档时，界面使用来源登记中的文档标题。

**存储兼容：** 当前 ECSE 2100 的 `ecse2100-fieldnotes-v1` 保留不变。换课使用新键，避免两门课碰巧使用相同题号而覆盖记录；这不是把旧记录删除。仅当你明确实现迁移策略时才更改现有课程的键或记录版本。键名的版本后缀只是命名空间；内部记录格式仍为 `version: 1`，更改后缀不会自动实现另一种记录格式。

### 3.3 填入来源、公式与试卷

- `content/documents.json`：共享课程笔记、课件、教材摘录或公式表的来源记录；对应的 PDF、页图在共享静态目录。
- `content/formulas.json`：课程自己的公式与原式来源，可以是空数组。没有公式链接时仍可使用题设定义和已推导关系，不能编造公式表来源。
- 每种语言的 paper：独立 `paper.json`、`questions/`、`documents.json`、`figure-sources.json`、`generate_figures.py`、`assets/`、`extracted/`。用真实 PDF 计算页数、尺寸和 SHA-256，绝不能使用示例测试数据的占位散列。
- `lectures` 是题目相关的课程资料页引用，至少一条；可以指向课程笔记或教材，不要求它一定名为某个 lecture ID。
- 每道题保留真实来源区域。通常只有原题实际印刷的插图才作为题图；普通无图题明确设置 `figure: null`。若题干明确引用某图、但提供的资料确实漏图，可按 [AGENTS.md 的漏图例外](../AGENTS.md#figures-and-provenance) 匹配可信来源中的对应图，或依据题设独立重建，在题目区提供注明来源的补充图；不得添加未知条件、泄露作图答案或冒称找回了原图。采用同款静态图卡和放大控件，无真实原图就不提供原图切换，也不拿题干文字裁图充当原图。补图与真实原图的元数据、校验及渲染必须分开处理，保留各语言独立资源及现有解答交互。其它辅助示意图仍通过小问的 `figure` 放在解答中。
- 每小问仍使用展示公式和最后的带框计算。纯论文式问答、单语言模式、任意语言数量不是此次模板化的支持范围；需要时先扩展结构与回归，而不是塞入占位公式或跨语言 fallback。

原始 PDF 只在离线重建／核验时按规范目录提供，前端构建不要求它们，也不再提供下载。发布目录只包含页图、截图、SVG 等渲染资源，并在两级暂存中排除 PDF。不要新增大型 PDF 提交、远程资源恢复服务或跨语言软链接。

### 3.4 写解答，不复制题库答案

先读 [解题风格规范](solution-style.md)，再使用一篇语言模板建立一篇文章。
保留“主公式 → 已知与所求 → 代入与完整计算 → 结果”的例题写法。
不要整批搜索替换旧题来伪造新题，不要因原卷答案简略而省略积分过程。

文章中的公式链接、课件页、源卷页和答案页都要重新核对；模板中的年份、分值、来源区域只是示例。完整结构和 PDF 登记方法见
[content/README.md](../content/README.md)。

### 3.5 区分通用回归与课程回归

- `tests/template.test.ts`：独立的非 ECSE 课程夹具、双语模板、配置验证与风格示例，完全不需要现有课的试卷包。
- `tests/template-build.test.ts`：在临时目录中为另一科生成微型测试来源并构建真实静态页面，验证课程标识、存储命名空间、非数字资料标签、没有独立公式表和默认题目回退；不改写现有课程资源。
- `tests/content-schema.test.ts`、存储/语言/导航/类型检查测试：对当前内容和通用工作台继续运行。
- `tests/content.test.ts`、`tests/markdown.test.ts`、`tests/papers.test.ts`：保留已交付 ECSE 数据的措辞、物理数值和纸张夹具回归，以 `course.id` 限定；不会强迫新课具有 Smith 图或特定电荷密度。迁移不是删掉这些已验证事实，而是另加新课自己的数值、原文与模型测试。
- CI 使用的 `scripts/browser-startup-qa.mjs` 从课程配置和构建页面发现存储键与测试题目，适用于迁移后的课程；它调用通用 `browser-hover-qa.mjs` 与 `browser-study-ux-qa.mjs`，验证两主题的悬浮/焦点可见度、常态文字对比度、Sheet/资料库/来源之间的焦点返回，以及窄屏来源的可读放大、局部平移和页宽重置。题目来源测试从“试卷原页”标签中的实际页图打开，兼容无图题和漏图补图；原图／复刻切换测试只选择确有真实原图的题目，不依赖已移除的图卡页码按钮。题库浏览器回归会等待已声明的渐进增强图就绪，再按图名检查其余静态图，避免把加载后消失的回退图当作固定序号的 DOM 节点。
- `browser-qa.mjs` 及 reading/interactions/repairs/theme/i18n/content-locales 补充脚本包含当前 ECSE 的特定题目、图示与操作流程，是示例课程的补充回归，不是可直接套给所有课程的通用验收。新课程应按其内容补充对应交互用例。

## 4. 验收顺序

```bash
bun run content:check
bun run check
bun test
bun run build
```

离线源图生成与验证沿用 [重建说明](../content/README.md#drawings-and-source-checks)：
先准备两种语言的 PDF 页图，再按 paper 生成两主题 SVG 和原题裁图；公式原式改变时再生成共享摘录。

在生产构建的预览上运行通用浏览器回归（Playwright 按根 README 单独安装）：

```bash
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
QA_URL=http://127.0.0.1:4173 bun scripts/browser-startup-qa.mjs
```

另外人工检查桌面与手机下的课程标识、资源目录、语言切换、题目链接、完整推导、公式来源、原卷/答案页与静态资源。让新课自己的测试覆盖已知答案和关键模型，而不只是让模板样例通过。

## 5. 内容 PR 检查单

- [ ] 更改只涉及目标课程或试卷，没有改通用控件来迁就一篇文章。
- [ ] 两种语言独立完整，稳定 ID、分值、条件与出处对应。
- [ ] 按 [风格规范的检查清单](solution-style.md#9-作者与审阅者检查清单) 审阅计算与语言。
- [ ] 所有来源页、区域、散列、图名、元数据与实际材料一致。
- [ ] 保留纠错说明、已有学习记录与现有 URL。
- [ ] 没有新增大 PDF 二进制、生成的题库 JSON、远程服务或不属于目标课程的静态素材。
- [ ] 通用检查与课程专用科学/数值回归均完成，并说明人工核验项。
