#!/usr/bin/env node
/**
 * 内容校验：按 docs/00-内容数据契约.md 检查 items / inspiration / episodes 的 frontmatter。
 * 与 src/content.config.ts 的 schema 保持一致，但不依赖 Astro，可以在任何有 Node 的地方跑：
 *
 *   node scripts/validate-content.mjs [内容目录]      默认 content/，没有则 content-sample/
 *
 * 退出码 0 = 全部通过；1 = 有违规（逐条列出文件、字段、原因）。构建前跑一遍，比 Vercel 报错早发现。
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import YAML from 'yaml';

const DIRECTIONS = ['tooling', 'new-space', 'industry', 'global', 'product', 'boundary'];
const SOURCE_TYPES = ['official', 'media', 'vendor_promo', 'social'];
const STATUS = ['draft', 'published'];

const arg = process.argv[2];
const ROOT = resolve(new URL('..', import.meta.url).pathname);
// 目录优先级：命令行参数 > 当前目录本身就是内容仓库 > seaf-design 的 content/ > content-sample/
const dir = arg
  ? resolve(arg)
  : existsSync(resolve(process.cwd(), 'items'))
    ? process.cwd()
    : existsSync(resolve(ROOT, 'content/items'))
      ? resolve(ROOT, 'content')
      : resolve(ROOT, 'content-sample');

const problems = [];
const fail = (file, field, msg) => problems.push({ file, field, msg });

const isDate = (v) => v instanceof Date || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v));
const len = (v) => String(v).length; // 与 zod .max() 一致（UTF-16 长度）

function str(file, data, field, { required = false, max = Infinity, startsWith, url, enumOf } = {}) {
  const v = data[field];
  if (v === undefined || v === null || v === '') {
    if (required) fail(file, field, '必填，缺失');
    return;
  }
  const s = typeof v === 'number' ? String(v) : v;
  if (typeof s !== 'string') return fail(file, field, `应为字符串，得到 ${typeof v}`);
  if (len(s) > max) fail(file, field, `超长：${len(s)} 字符 > 上限 ${max}`);
  if (startsWith && !s.startsWith(startsWith)) fail(file, field, `应以 ${startsWith} 开头`);
  if (url) {
    try {
      new URL(s);
    } catch {
      fail(file, field, `不是合法 URL：${s}`);
    }
  }
  if (enumOf && !enumOf.includes(s)) fail(file, field, `非法值「${s}」，只能是 ${enumOf.join(' | ')}`);
}

function frontmatter(path) {
  const text = readFileSync(path, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  try {
    return YAML.parse(m[1]) ?? {};
  } catch (e) {
    fail(basename(path), 'frontmatter', `YAML 解析失败：${e.message.split('\n')[0]}`);
    return null;
  }
}

function each(sub, check) {
  const p = resolve(dir, sub);
  if (!existsSync(p)) return 0;
  const files = readdirSync(p).filter((f) => f.endsWith('.md'));
  for (const f of files) {
    const data = frontmatter(resolve(p, f));
    if (!data) {
      if (!problems.some((x) => x.file === f)) fail(f, 'frontmatter', '缺少 frontmatter');
      continue;
    }
    const file = `${sub}/${f}`;
    if (!isDate(data.date)) fail(file, 'date', '必填，格式 YYYY-MM-DD');
    str(file, data, 'direction', { required: true, enumOf: DIRECTIONS });
    str(file, data, 'status', { required: true, enumOf: STATUS });
    check(file, data);
  }
  return files.length;
}

const itemIds = new Set();
const n1 = each('items', (file, d) => {
  itemIds.add(basename(file, '.md'));
  str(file, d, 'title', { required: true, max: 60 });
  str(file, d, 'original', { required: true, max: 400 });
  str(file, d, 'summary', { required: true, max: 120 });
  str(file, d, 'so_what', { required: true, max: 200 });
  str(file, d, 'source_name', { required: true });
  str(file, d, 'source_url', { required: true, url: true });
  if (d.source_date !== undefined && !isDate(d.source_date)) fail(file, 'source_date', '格式 YYYY-MM-DD');
  str(file, d, 'source_type', { required: true, enumOf: SOURCE_TYPES });
  str(file, d, 'thumb', { startsWith: '/thumbs/' });
  str(file, d, 'figure', { max: 6 });
  str(file, d, 'figure_unit', { max: 8 });
  str(file, d, 'title_en', { max: 120 });
  str(file, d, 'summary_en', { max: 300 });
  str(file, d, 'so_what_en', { max: 400 });
  str(file, d, 'figure_unit_en', { max: 24 });
});

const n2 = each('inspiration', (file, d) => {
  str(file, d, 'title', { required: true, max: 60 });
  str(file, d, 'why', { required: true, max: 120 });
  str(file, d, 'source_name', { required: true });
  str(file, d, 'source_url', { required: true, url: true });
  str(file, d, 'thumb', { required: true, startsWith: '/thumbs/' });
  if (d.year !== undefined && !Number.isInteger(d.year)) fail(file, 'year', '应为整数年份');
  str(file, d, 'title_en', { max: 120 });
  str(file, d, 'location_en', { max: 60 });
  str(file, d, 'why_en', { max: 300 });
});

const n3 = each('episodes', (file, d) => {
  str(file, d, 'title', { required: true, max: 24 });
  str(file, d, 'cta', { required: true, max: 120 });
  if (!Array.isArray(d.items) || d.items.length < 1) fail(file, 'items', '必填，至少 1 个资讯 id');
  else for (const id of d.items) if (!itemIds.has(String(id))) fail(file, 'items', `引用的资讯「${id}」不存在（网站会跳过，不致失败）`);
  for (const [i, c] of (d.checks ?? []).entries()) {
    for (const k of ['claim', 'in_script', 'in_source']) if (typeof c?.[k] !== 'string') fail(file, `checks[${i}].${k}`, '必填字符串');
    if (typeof c?.ok !== 'boolean') fail(file, `checks[${i}].ok`, '必须是 true / false');
  }
  for (const [i, c] of (d.corrections ?? []).entries()) {
    if (!isDate(c?.date)) fail(file, `corrections[${i}].date`, '格式 YYYY-MM-DD');
    if (typeof c?.text !== 'string') fail(file, `corrections[${i}].text`, '必填字符串');
  }
  str(file, d, 'title_en', { max: 80 });
  str(file, d, 'cta_en', { max: 300 });
});

const rel = dir.replace(process.env.HOME ?? '', '~');
if (problems.length === 0) {
  console.log(`✓ ${rel}：items ${n1} / inspiration ${n2} / episodes ${n3}，全部符合契约`);
  process.exit(0);
}
console.error(`✗ ${rel}：${problems.length} 处违规，网站构建会失败\n`);
for (const p of problems) console.error(`  ${p.file}\n    ${p.field}: ${p.msg}`);
process.exit(1);
