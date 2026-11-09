# Q4(a) 彩色测量与持续电流：正式接入

用户批准 v6 小样后，接入现有 Q4(a) 原生 Svelte 增强；不是挂载小样 HTML。其它图不迁移，原题、解答、静态图和物理模型不变。

## 行为与实现

- `SemiConverter.svelte` 保留懒加载、四段 RadioGroup、连续 0°–360° Slider、全部五个标记、边界跳转、不中断的全周期播放和明确重启。正式页仍从 0° 开始，而不是使用审阅小样的 240° 起始截图。
- 九行原生 shadcn Button 直接切换对应测量。关闭保留灰色曲线、游标、当前点与读数，只隐藏该量的电路叠加层；全部关闭仍有九行。没有额外过滤面板、独占高亮、hover/focus 重定位或回退焦点。稳定 key 与逐量状态保留原 DOM。
- `ConductionCircuit.svelte` 使用每种语言自己的现有明暗外部 SVG 片段，保持全部中性原导线、符号与标签。测量配色表示物理量身份，不表示节点电位或导通；后续按批注增加的粗细／对比强调由 `data-conducting` 驱动，详见下节。
- `conduction-measurements.ts` 将已批准小样的等比坐标映射和测量位置转为类型化配置。S₁ 电压正端仍为下端阳极 A；负读数不换端。彩色电流箭头随符号反向，零电流无箭头，成对器件用下标和实／虚线区分。
- 四个中性方向箭头沿现有三条闭合路线，以固定 SVG 路程速率移动。单个 rAF 调度器独立推进角度与路程：默认只流动、不播放角度；角度暂停、拖动和 360° 左极限处仍循环示意当前冻结状态的方向，不构造第二套真实时间模型。标题旁可独立暂停流动。
- 减少动态、离屏、折叠、帮助／静态图／其它原生 Dialog、页面隐藏及导航停止运动。恢复时只恢复允许的流动，绝不自动恢复角度播放；保留手动暂停选择，不新增 localStorage 字段。销毁时取消 rAF、请求和观察器。
- 正式主题使用全局 `--measurement-*` 语义色，不借用原有灰度 chart 色板。vₛ₁ 保留 2.4 px 粗线、1.5 px / 0.7 透明度参考线和 `8 2 2 2` 长短虚线。九行保持 34 px、曲线 30 px；窄屏箭头有最小可辨尺寸。中间宽度限制交互电路的空白增长，不缩小文字或修改科学路径。
- 完整静态图、共享 Figure 放大弹窗、无 JS 与资源错误后备不变。静态图打开不增加正文高度，保留 Esc 与焦点返回。

## 验证

- `bun run check`：0 errors / 0 warnings。
- `bun test`：165 pass / 44 既有 skip / 0 fail，209 tests / 34 files。
- `bun run build`：41 个静态页面；39 道题、90 个小问仍按 authored Markdown 校验。
- `browser-conduction-qa.mjs`：21 组通过，覆盖双语、明暗、320/390/820/1440 px、连续播放／拖动／触摸、末点继续流动、生命周期、资源重试、无 JS 可见性和旧学习记录。
- `browser-conduction-compact-qa.mjs`：35 组通过；四段高度稳定、说明浮层边界／底部可达和原生静态图弹窗通过。英文 card：1440 px 视口约 646.1 px 高；390 px 约 955.1 px；820 px 的窄阅读列约 948.3 px，均在原紧凑预算内。
- 新 `browser-conduction-colors-qa.mjs`：9 组通过，验证无操作也流动、正确原路线、只改目标行／探针、全部关闭仍实时、无 hover/focus 重定位、键盘／触摸、独立暂停、Dialog 与动态偏好中断／恢复。所有测量标签在正式主题下至少 4.5:1，vₛ₁ 参考段至少 3:1；这不是全站无障碍认证。脚本已加入 CI。
- 另做 Q4 的 4 组字体挂起检查：问题和增强交互仍可阅读／操作；字体含内嵌部分共 203,584 bytes，低于 200 KiB，无 CJK 运行时字体请求。
- `scripts/check_figures.py` 通过：76 主图／主题、356 圆形符号、22 份中文字体 SVG。此轮不重生成静态图。原有 harmless 的粗体字库 fallback 提示仍存在。
- 针对性独立只读复核未发现阻塞问题；其范围为源码、与小样对照及 9 项单元检查，不替代真实浏览器与科学人工复核。最终中英明暗、桌面和手机图形已目视核对。

额外全站 `browser-startup-qa.mjs` 未全部通过：它调用的 `browser-study-ux-qa.mjs:52` 仍等待现已移除的 `[data-figure-source]` 控件而超时。该测试与并发 Figure/source 修改不属于本轮接入，未顺带改写，也不宣称整套 startup 验收通过。上面的字体专项是独立 Q4 检查，不是该全站套件的替代通过记录。

首次接入时，相关生产 SVG、JSON 和两份 Q4 Markdown 共 12 个文件的前后 SHA-256 一致，物理模型文件无差异；下面的后续修订单独记录辅助 SVG 的展示声明变化。未提交代码，未停止他人 4173／5173 服务器；只关闭本轮自有的 4175 校验服务。

## 后续批注：导通线路必须明显

按页面批注，保持测量配色不变，用独立的中性粗细和明暗强调真正导通的支路：导通为 2.8 px / 完整前景对比；未导通为 1.8 px / 0.55 透明度的 muted 线条。所有文字标签始终保持完整前景色。强调仅由现有四段模型驱动，不受波形筛选或流动暂停影响；全部测量关闭时，S₂/D₁ 等实际回路仍明显可辨。

没有以直线重描电流路线、穿过 R/L/电源或增加节点。四份独立辅助 SVG 只将固定 `stroke-width: 1.8` 改为 `var(--conduction-stroke-width, 1.8)`，使外部 `<use>` 可控制真实原片段的线宽；non-scaling-stroke、所有路径、元件、文字、片段归属和坐标不变。将该声明归一化回旧值后，四份文件与修订前逐字一致；两份 JSON、规范静态波形、Q4 文章与物理模型的 SHA-256 均保持不变。两个 manifest 只更新辅助导出脚本的来源散列。

检查／构建、165 项 Bun 测试、7 项精灵导出测试及图形检查通过。生产浏览器 21 + 35 + 9 组通过；额外在批注对应的 5173 开发页重复 9 组联动检查。回归检查四个区间的粗细／对比、全关闭时强调不变、双语明暗和手机／桌面；已目视检查深色与浅色的全关闭电路，及启用探针后的叠加效果。证据包括 `all-off-conduction-*.png`。旧的全站 startup 选择器问题仍按上文记录，不属于本批注修复。

证据位于忽略目录 `artifacts/conduction-linked/`、`artifacts/conduction-design-compact/` 和既有 `artifacts/conduction-integration/`；中文截图注入本地 QA 字体，不改变发布字体。样例历史见 [v3–v6 记录](conduction-color-sample.md)。

```bash
bun run check
bun test
bun run build
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs QA_URL=http://127.0.0.1:4173 \
  bun scripts/browser-conduction-qa.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs QA_URL=http://127.0.0.1:4173 \
  bun scripts/browser-conduction-compact-qa.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs QA_URL=http://127.0.0.1:4173 \
  bun scripts/browser-conduction-colors-qa.mjs
```
