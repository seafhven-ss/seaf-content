# 抖音内容流水线改造说明 v1（给 Hermes）

> 先读 `docs/00-内容数据契约.md`，你写出的每个文件都要过它的 schema，否则网站构建会失败。
> 本文只讲流程改什么、为什么、怎么改。改动尽量少，能用现有脚本的不新写。
> 日期：2026-09-07

## 1. 为什么改（三句话）

1. 现在的 15 条台账是奇点社的物理 AI 简报，设计+AI 只有 1 条；视频用正确的标准在筛一个方向错误的池子。
2. 两次事实错误都发生在「台账 → 口语稿」的压缩步，六道闸全是形式检查，没有一道看语义。
3. 网站要的资讯、灵感、集页三类内容，现在的流程要么不生产，要么生产完就扔（数据核对清单）。

改完之后：每天一次扫描同时喂网站和视频；书面版是正本，口播稿是派生物；独立核验在一个不知道稿子的上下文里做；所有产物落在 `~/seaf-design/content/`，21:00 出片后一起推上线。

## 2. 五条原则

1. **分流不弃用。** 扫到的东西按去向分：工具和动态进 items，项目进 inspiration，两边都可以成为视频选题。「纯项目摄影凑数」这条弃用规则对灵感库正好相反。
2. **门槛不配额。** 三问全过才收，没有条数要求。有的天 2 条，有的天 6 条。
3. **集页正本，口播派生。** 先写 item 和 episode，再从 item 的 `original` / `summary` / `so_what` 派生口播稿。口播稿里每个数字必须能在对应 item 的 `original` 里找到，找不到删句。
4. **独立核验。** 核验在一个只拿到口播稿和原文链接、没见过台账和 item 的新上下文里做。
5. **不动的东西不动。** 奇点社 06:30 简报、TTS、ASR、素材三层闸、`make_video3` 后期链、催审——全部照旧。

## 3. 仓库接入

- `git clone <seaf-design 仓库> ~/seaf-design`。
- 每个任务开工先 `cd ~/seaf-design && git pull --rebase`，写完 `git add content public/thumbs && git commit`。**只有 21:00 任务 push。**
- 只写 `content/` 和 `public/thumbs/`。`src/` 是 Claude Code 的。
- 落盘前用契约第 4–6 节的字段表自检一遍，尤其：`direction` 只能是 6 个 id 之一；`source_url` 必须是完整 URL；`status` 只有 `draft` / `published`。

## 4. 新任务 A：设计师资讯扫描（每日 07:00，新建 cron）

和奇点社简报并行，不替换它。奇点社简报只作为本任务的候选来源之一。

### 信源

**设计媒体**：Dezeen（全站，不只 AI 标签）、ArchDaily、Designboom、Architizer、Frame、Wallpaper*、Archinect（行业和事务所动态）、Building Design、The Architect's Newspaper。
**工具方**：Autodesk（Forma / Revit / Fusion 博客）、Chaos、Enscape、D5 Render、Vizcom、Krea、Midjourney、Runway、Rhino / McNeel、SketchUp / Trimble、Figma、Adobe（仅设计相关发布）。
**行业与经营**：AIA、RIBA Journal、Fast Company Design、Core77、It's Nice That、Dezeen 的事务所动态版块。
**空间新需求**：Data Center Dynamics（数据中心建筑）、The Robot Report 中涉及厂房和工位改造的条目、Hospitality Design、Senior Housing News。
**候选**：`~/.hermes/cron/brief/<今天>/sources.md`（奇点社简报），只提升过了三问的条目。
**社媒**：X 上设计工具官方账号和知名设计事务所账号；作为发现层，进正文前必须回到官方或一线媒体拿原文。

**不收**：纯大模型发版、纯金融、纯芯片、人形机器人走秀、国内自媒体二手转述、无 AI 且无新方向的常规项目报道。

### 三问（全过才收）

1. **一手**：能拿到官方博客、一线媒体或原帖的链接。拿不到不收，不编。
2. **方向**：能落到 6 个方向之一，并且能用 1–2 句说清"对哪类设计师、哪道工序意味着什么"。写不出 `so_what` 就是没过。
3. **信息差**：国内设计圈还没大范围传播。已经刷屏的不收，除非原文有国内转述丢掉的关键限定条件——这种情况反而优先收，`so_what` 里点明。

### cron prompt（新建，全文）

```
为 seaf.design 做今天的设计师资讯扫描，落盘到 ~/seaf-design/content/。本任务不投递飞书、不 push。

【开工】
cd ~/seaf-design && git pull --rebase
读 content/directions.json。
读近 3 天 content/items/ 和 content/inspiration/ 的文件名和 title，同一主体 + 同一事件不再收。
若存在，读 ~/.hermes/cron/brief/<今天>/sources.md 作为候选来源之一。

【发现】
按 docs/02-流程改造说明-给Hermes.md 第 4 节的信源清单扫描。先发现，再求证：每条进正文前回到官方博客或一线媒体拿原文链接。

【门槛——三问全过才收，没有条数要求】
1. 一手：有原文链接。没有不收。
2. 方向：落到 6 个方向之一，能写出 so_what。写不出不收。
3. 信息差：国内还没大范围传播；或者国内转述丢了关键限定条件。

【分流】
- 工具、行业动态、经营、观点 → content/items/<今天>-<slug>.md
- 具体项目（已建成或方案，建筑/室内/景观/展陈） → content/inspiration/<今天>-<slug>.md
  入库标准一条：近两年，能看出新方向（小体量、旧改、跨界、AI 参与、有可学的手法）。"好看"不是理由。
- 一条可以同时进两边。

【写 item，字段见 docs/00-内容数据契约.md 第 4 节】
- original：从原文复制英文原句，1–2 句，原样，含主语和限定条件。这是整个体系最重要的字段。
- summary：一句中文，只说发生了什么，不加判断。
- so_what：1–2 句，对哪类设计师、哪道工序意味着什么。
- source_type：official / media / vendor_promo / social。Dezeen 等页面带 Promotion 或 Sponsored 标记的一律 vendor_promo；厂商新闻稿也是 vendor_promo。
- sku：产品或型号从原文原样抄。
- status: draft
- slug：2–4 个小写英文词，连字符连接。

【写 inspiration，字段见契约第 5 节】
- why：一句话说为什么入库。
- 下载一张主图，长边压到 800px，jpg ≤150KB，存 public/thumbs/<id>.jpg，thumb 写 /thumbs/<id>.jpg。
- 正文可写 2–5 句评述，可空。

【落盘】
每个文件写完后逐字段对照契约自检。
git add content public/thumbs && git commit -m "content: <今天> scan"
不 push。

【最终回复】
只回一句：收了几条 item、几条 inspiration，各自的方向。零条也正常，照实说。
```

## 5. 改任务 B：写稿（09:30，cron `4f55c4113224`）

保留原 prompt 的硬规则（句长、中文数字、裸问句、英文品牌名、连读歧义）、结构规格（18–22 句、三段式）、落盘路径、`build_daily.py draft` 校验、飞书投递和 @机器人 提示。**替换【第一步：选题】，并在【第二步：写稿】前插入【集页】，在写稿后插入【核验】。** 替换后的段落如下：

```
【第零步：读池子】
cd ~/seaf-design && git pull --rebase
读 content/items/<今天>-*.md 和 content/inspiration/<今天>-*.md。今天没有就读最近一天。
不再读奇点社台账。

【第一步：定集页】
从池子里选 3–4 条，标准不变：不是「AI 热点」，而是「设计师的活会怎么变」。
- 优先：设计 / 建筑 / 空间 / 创意工具被 AI 改了流程或交付方式
- 其次：能类比到设计工作的
- 最后一条留给 boundary 方向——给焦虑的人一个有数据的定心丸
主方向 = 被选条目里出现最多的方向，boundary 不参与计数。

写 content/episodes/<今天>.md，字段见契约第 6 节：
- title：就是抖音标题。≤24 字，有数字或反差，陈述句，不带感叹号。
- direction、items（按口播顺序）
- cta：收尾承诺的那件"今天就能做的事"。必须是一个动作 + 一个对象（去试哪个工具、去跑哪个场景、去看哪个方向页），不是情绪。
- status: draft
给被选中的每个 item 补 episode: <今天>。

【第二步：写稿】
（原有规则全部保留，追加下面三条）
- 口播稿从被选 item 的 original / summary / so_what 派生。每一个数字必须能在对应 item 的 original 里找到出处，找不到删掉那句。
- 数字在口播里修饰的对象，必须和 original 里修饰的对象一致。original 说"JLL Design's 65 global studios"，口播就不能说"全球六十五所事务所"。
- 收尾一句落在 cta 上，用口语说出来。网站上线后再加一句"原文和链接在 seaf.design 首页"。
写完把口播稿原文追加到集页正文 `## 口播稿` 下（和 script.txt 是同一份文本）。

【第三步：独立核验】
见第 6 节。核验结果写入集页 frontmatter 的 checks。

【投递】
飞书消息保留原来的内容，额外附三行：集页 title、cta、核验结果（几项通过 / 几项未过，未过的逐条列出）。
不再单独附「数据核对」清单——核验表已经包含它。

【落盘】
cd ~/seaf-design && git add content && git commit -m "content: <今天> episode draft"
不 push。
```

## 6. 新步骤 C：独立核验（在写稿任务末尾，用新上下文执行）

用子任务或新会话执行，**输入只给两样**：`script.txt` 全文、被选 item 的 `source_url` 列表。不给台账、不给 item 正文、不给 original 字段——它要自己去原文里找。

```
你拿到一份中文口播稿和几个原文链接。逐句找出口播稿里的每一个数字和每一个具体事实陈述（公司名、数量、时间、比例、金额），对每一项：
1. 打开原文，找到对应的英文原句，原样抄下来。
2. 回答一个问题：口播里这个数字修饰的对象，和原文里修饰的对象是同一个东西吗？
   例：原文 "$600 to collect 10,000 demonstrations"，口播"训练一个机器人要六百美元"→ 不是同一个东西。
   例：原文 "JLL Design's 65 global studios"，口播"全球六十五所设计事务所"→ 不是同一个东西。
3. 口播里的数字在原文找不到 → ok: false，in_source 写"未找到"。
4. 同一个数字在口播里出现多次，说法不一致 → 单独列一项，ok: false。

输出 YAML 列表，每项 { claim, in_script, in_source, ok }，claim 用口播里的中文数字或事实，in_script 抄口播原句，in_source 抄英文原句。
只输出这个列表，不做任何改稿建议。
```

主任务拿到列表后写入集页 `checks`，并在飞书消息里汇报。**任何一项 `ok: false`，飞书消息第一行写「核验未过」。** 是否改稿由 Seaf 决定，任务本身不自动改稿——改稿再核验会回到"自己核自己"的老路。

## 7. 改任务 D：出片（21:00，cron `d2b90de0322a`）

前置检查、出片、自审全部不变。**自审通过并投递飞书之后**追加：

```
【上线】
cd ~/seaf-design && git pull --rebase
把 content/episodes/<今天>.md 和 content/items/<今天>-*.md、content/inspiration/<今天>-*.md 的 status 全部改为 published。
（Seaf 白天在群里说过「撤 <id>」的，保持 draft。）
git add content && git commit -m "content: <今天> publish" && git push
最终回复里加一句：已推送，几条 item、几条 inspiration、集页 <id>。push 失败照实报，不重试超过 1 次。
```

出片失败则不上线，当天内容留在 draft，次日照常。

## 8. 发布后的三个动作（由 Seaf 在飞书触发，Hermes 执行）

| Seaf 说 | Hermes 做 |
|---|---|
| 「发了 <抖音链接>」 | 集页 `douyin_url` 填入；`episodes.jsonl` 补 `douyin_url`、`douyin_title`（=集页 title）、`published_at`；commit + push |
| 「撤 <id>」 | 对应文件 `status: draft`；commit + push |
| 「勘误 <id> ……」 | 改正文（item 的 summary/so_what 或集页文本）；集页 `corrections` **追加**一条 `{date, text}`，不删旧的；commit + push |

## 9. 数据记录

`episodes.jsonl` 新增字段：`douyin_title`、`douyin_url`、`published_at`、`views_7d`、`likes_7d`、`saves_7d`、`site_visits_7d`。前三个在「发了」时填，后四个每周填一次。

每周填法二选一，Seaf 定：
- Hermes 每周日 20:00 在群里列出本周集页 id，Seaf 回数字；
- Seaf 每周把抖音数据页截图丢群里，Hermes 自己读。

`site_visits_7d` 从 Cloudflare Web Analytics 按路径 `/ep/<id>` 取，网站上线后由 Claude Code 给一个取数方式。

## 10. 首批任务（按顺序）

1. 克隆仓库，确认 `content/directions.json` 存在且和契约一致；把 `docs/` 三份文档读一遍。
2. **补录 09-05 和 09-06 两集**：按契约写 items（laiout-jll、playco-greybox、frontiermath、scenix 等，`original` 从原文重新抄，`source_url` 用真实链接，Dezeen laiout 那篇标 `vendor_promo`）、两个 episode（口播稿用已发布版本）。09-05 集页加 corrections：「视频开场说"全球六十五所设计事务所"，原文是 JLL Design 一家公司旗下的 65 个工作室。本页已按原文更正，视频未重发。」这是网站上线时的第一条勘误，也是网站的第一批真实内容。替换掉 Claude Code 放的示例数据。
3. 新建任务 A（07:00）。先手动跑一次，把产物贴群里让 Seaf 看字段对不对。
4. 改任务 B 的 prompt（第 5 节），加入核验步骤（第 6 节）。手动跑一次。
5. 改任务 D（第 7 节）。
6. `RULES.md` 清理：第七节排期改成 07:00 扫描 / 09:30 写稿 / 21:00 出片；第九节删掉日期胶囊。
7. 网站上线后：口播收尾加"原文和链接在 seaf.design 首页"；开始每周数据回填。

## 11. 不改的内容

奇点社 06:30 简报及其五栏配额（它服务另一个受众）、TTS 参数与格式转换、ASR 自检、素材三层闸和 `pace_check` 阈值、`make_video3` 及后期链、催审任务、成片命名、片尾署名（网站 URL 依然不放片尾）。

素材判档 95 分钟的问题本次不碰。网站上线一个月后再评估"用网站录屏做部分画面"是否可行。
