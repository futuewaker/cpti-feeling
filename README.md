# CPTI · 关系塑

> 18 道题，找到你的关系类型；两个动物配对，看你和 ta 的关系走向。
> 比 MBTI 多一个人的测试。

一个中文关系配对测试网站 · 纯静态，单页 SPA · PETTI 的兄弟项目。

## 核心机制

- **Solo 单人测试**：18 道题，6 大关系类型投票（追求者 / 点火者 / 定锚人 / 编织者 / 回避者 / 风暴眼）
- **Match 双人配对**：从 24 动物中选「我」和「ta」，基于双方的 `primary_type` 配对,输出配对报告
- **6 种关系类型**：PURS · KIND · ANCH · WEAV · AVOI · CHAO
- 输出：类型图 + 速评 + 配对动力 · 甜点 · 坎 · 修补

## 技术栈

- 原生 HTML + CSS + JavaScript，零依赖
- Google Fonts 加载 Press Start 2P / VT323
- Mobile-first 响应式（max-width 480px 居中）
- 可部署到任意静态托管（Cloudflare Pages / GitHub Pages / Vercel）

## 本地运行

```bash
python3 -m http.server 8765
# 访问 http://localhost:8765
```

## 文件结构

```
cpti/
├── index.html           # 结构 · 四个 view (intro / quiz / match / result / couple-result)
├── styles.css           # 粉色 neobrutalism 样式
├── app.js               # 双入口逻辑 + 6 类型计算 + 配对匹配
├── data/
│   ├── questions.json   # 18 道题
│   ├── couples.json     # 6 类型档案 + 配对 pair table
│   └── animals.json     # 24 动物 → primary_type 映射
├── images/              # 24 张动物图片 + qr
└── docs/                # 设计文档
```

## 修改内容

- **问题**：编辑 `data/questions.json`
- **6 类型档案 / 配对**：编辑 `data/couples.json`
- **动物-类型映射**：编辑 `data/animals.json`
- **配色**：`styles.css` 顶部 `:root` CSS 变量（当前樱桃粉 `#FB7185`）
