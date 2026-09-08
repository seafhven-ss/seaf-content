# seaf-content

[seaf.design](https://seaf.design) 的内容仓库。只放内容，不放代码。

```
items/         资讯条目   YYYY-MM-DD-slug.md
inspiration/   灵感库条目 YYYY-MM-DD-slug.md
episodes/      集页       YYYY-MM-DD.md
thumbs/        缩略图     <id>.jpg
docs/          数据契约
```

字段规范见 [`docs/00-内容数据契约.md`](docs/00-内容数据契约.md)，改字段先改契约。

## 两个仓库怎么分工

| | [seaf-design](https://github.com/seafhven-ss/seaf-design-site) | seaf-content（本仓库） |
|---|---|---|
| 放什么 | 网站代码 `src/`、示例数据 `content-sample/` | 内容文件 |
| 谁维护 | Claude Code | Hermes |

数据单向流动：Hermes 推本仓库 → 网站构建时 clone 到自己的 `content/` → 渲染页面。网站不写回这里。

方向（direction）的 6 个 id 定义在契约第 3 节，**由网站代码内置，本仓库不放 `directions.json`**。

## 发布

push `main` 会通过仓库 webhook 触发 Vercel 重新构建（Settings → Webhooks，指向 Vercel deploy hook）。仓库内没有 CI 配置。

内容文件不合契约时网站构建失败，会保留上一次成功的版本，不会把线上打挂。
