---
date: 2026-09-24
title: 蚂蚁开源两个图像模型，能把压平的成品图拆回透明图层
title_en: "Ant's open image models can split a flattened design back into layers"
direction: tooling
original: "Ming-Image-0.1-Design is a 6B text-to-image model for UI, infographics, posters, and other text-rich visual designs. Ming-Image-0.1-Design-Layer decomposes a flattened design image into a requested number of RGBA layers using an image and a layer plan."
summary: 蚂蚁集团开源实验室九月二十二日在 Hugging Face 放出两个六十亿参数、MIT 许可的图像模型：一个专做界面、信息图、海报这类文字密集的设计，另一个按分层计划把压平的成品图拆回透明图层。
summary_en: "Ant's inclusionAI lab published two 6B, MIT-licensed image models on Sept 22: one for text-rich designs such as UI screens, infographics and posters, the other decomposing a flattened design into transparent layers from a layer plan."
so_what: 被改掉的是「甲方要挪标题、只能整张重生成」这道重复活，可改哪一层、层数够不够表达结构还是你定。做平面和视觉的人拿一版本周交过的海报跑图层版，看它把哪几层并错。
so_what_en: "What goes away is regenerating the whole artwork to move a headline; which layers matter is still your call. Run last week's poster through the layer model and note which layers it merges wrongly."
source_name: Hugging Face (inclusionAI)
source_url: https://huggingface.co/inclusionAI/Ming-Image-0.1-Design-Layer
source_date: 2026-09-22
source_type: official
sku: Ming-Image-0.1-Design-Layer
status: draft
episode: 2026-09-24
thumb: /thumbs/2026-09-24-ming-image-layer.jpg
figure: "6"
figure_unit: 十亿参数
figure_unit_en: "billion parameters"
---
