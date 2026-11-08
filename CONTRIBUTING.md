# 贡献指南

先判断改动属于通用工作台、课程配置还是试卷内容，避免为迁移一门课而修改
通用控件。项目边界与迁移流程见 [docs/template-guide.md](docs/template-guide.md)。

## 写题与写解答之前

1. 阅读 [内容结构契约](content/README.md) 和 **[解题风格规范](docs/solution-style.md)**。
2. 以 [templates/](templates/README.md) 的单语言文章为结构参考，而不是把别科题干改几个变量后当新题。
3. 当前课程如有额外科学约定，阅读对应课程说明；现有示例为 [ECSE 2100](docs/courses/ecse-2100.md)。
4. 先核实原卷题干、印刷小问标签、配分、来源页与图，再独立完成中英文 Guide、Solution 和纠错记录。

风格顺序固定为：**主公式 → 已知与所求 → 具体代入和完整计算 → 得到结果**。
短引导语在公式前，最终方框只在最后一组展示计算中出现。不要新增 Step、
Explanation、Equation 或 Answer 包装，不要把原卷简略答案直接当作完整教学解答。
细节与正反例以风格规范为准，本页不是第二份规范。

## 改哪些文件

- 换课程身份或资源目录：`content/course.json`。
- 换公式与课程资料：`content/formulas.json`、`content/documents.json` 及其实际资源。
- 新增试卷：成对添加 `content/en/exam…/`、`content/zh-cn/exam…/`，遵循 [新增试卷说明](content/README.md#adding-a-paper)。
- UI 或管线：保持原生 shadcn-svelte、静态路由、语言资源隔离、浏览器状态兼容和现有 URL。
- 修改写作标准：只更新 `docs/solution-style.md`，同时检查 `templates/` 与风格示例测试，不把规则复制到其他文档。

课程 PDF 可以随站点发布；不要提交新增大型 PDF 二进制到 Git。构建环境仍需
提供真实 PDF。保留已有文件、稳定 ID、散列、源纠错说明以及旧浏览器记录。

## 提交前

```bash
bun run content:check
bun run check
bun test
bun run build
```

按 [风格审阅清单](docs/solution-style.md#9-作者与审阅者检查清单) 逐项检查。
有 UI 或内容排版变化时，在桌面与手机中核对；科学图变更还需离线图形检查，
并目视复核最终中文 SVG。内容 PR 说明核对过的 PDF 页、采用的约定，以及新增
或更新的课程数值回归。

自动检查不会证明科学推导、翻译或引用区域已经正确；测试通过后仍需人工审阅。
