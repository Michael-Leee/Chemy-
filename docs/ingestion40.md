# 第40届接入说明（增量隔离）

## 范围

第40届 Chemy 模拟试题 22 套、200 道完整大题。原卷：题目合集 220 页、参考答案合集 375 页，
均为标准 A4、含完整文字层，不做 OCR、不重绘。

## 为什么没有走原有录入流水线

原流程 `scan_library.py` → `import_library.py` → `rebuild_numbering.py` 依赖 `tmp/library*/`
下的原生扫描、图形坐标与编号缓存；这些缓存按项目约定不上传仓库。从干净环境运行
`rebuild_numbering.py` 会要求重建全部 1933 题的展示与 18 册打印册，风险与耗时都很高。
因此第40届采用**独立资源接入**：现有 1933 题、18 册打印册、`export-index/` 与
`numbering.json` 中的 `pdfVersion` 全部保持不变。

## 数据与资源

- `dist/questions.json`：新增 200 条，id 为 `chemy40-<套号>-<原题号>`，`edition: 40`。
  沿用原有 `questionPages` / `answerPages` 显示字符串；另加 `questionPageRange` /
  `answerPageRange` 数值页范围、`book: "chemy40"`。
- `dist/presentation.json`：新增 200 条，正文保留原卷文字流；结构式、反应路线、表格、
  谱图等无法用文字表达的图形，以 `<figure class="source-figure">` 按原始纵坐标插在
  对应段落之间，与旧题的图文混排格式一致（不是整页截图）。
- `dist/assets/e40i/*.webp`：按图形带渲染的独立结构式 / 表格 / 谱图，按「页码 + 带坐标」
  稳定命名。先用 `make_clean40.py` 从页面绘图指令里移除水印图片调用（水印整图及其
  415×17pt 分片），再从无水印副本渲染，因此图里不再有浅灰 CHEMY 水印。
  裁切框从真实键线 / 位图标签取框，链式吸附邻近的键线与 Ph/Me/OH 小标签并四周留白；
  上下边界再吸附到文字行间隙，保证不把中文题干切掉半截、也不把相邻图形带併进来；
  被边缘切断的文字行或标签碎片会在渲染时抹白，该文字仍以正文 HTML 保留。
  只有**完整落在图形内**的文字行才从文字流剔除，避免正文重复或丢失。
  图片 URL 附 `?v=e40-clean-v1`，同时避开 Service Worker 的 CacheFirst 与 Pages CDN 旧副本。
- `dist/numbering.json`：新题接在各专题现有最大编号之后连续编号（共 2133 条）。
- `dist/papers.json`：新增 `40-1` ～ `40-22` 卷首信息。
- `data/import_plan40.json`：22 套的主专题分类计划，供日后走完整流水线复用。
- `sources/`：两份原卷归档（字节未改）。
- `dist/downloads/chemy40-questions.pdf` / `chemy40-answers.pdf`：网页用原卷副本。

## 组卷下载

`app.js` 把 `book` 与页范围传给 `pdf-worker.js`。当题目带 `book: "chemy40"` 时，
Worker 直接从原卷册 `copyPages()` 复制对应 A4 矢量页到输出 PDF，保留原字形、结构式与评分；
其余题目仍走原来的 `export-index` 坐标裁切拼接。两者可混选，第40届页之后强制另起新页。

## 已知差异（相对前 39 届）

1. 网页正文是原卷文字流转成的 HTML，保留了小问编号与大部分上下标；结构式、表格、
   反应式、谱图只在原位置以图片呈现（点击可看大图），正文不重复这些图形里的文字。
   出处行给出「题目合集第 X 页 · 答案合集第 Y 页」可对照原卷。
2. 按页复制会带上原卷页眉与相邻题边界处的少量内容（题目常跨页或同页相邻）。
3. 专题题目册 / 答案册（18 份）不含第40届题目；第40届请通过「下载选题 PDF」或
   `dist/downloads/chemy40-*.pdf` 获取。
4. 主专题由标题关键词自动判定，个别题目可能需要按 `docs/ingestion.md` 的分类原则校准；
   修改 `data/import_plan40.json` 后重新运行 `build40.py` 即可（分类走元数据同步，不重取正文）。

## 回退

第40届的数据、资源与两处前端分支彼此独立。回退时恢复 `dist/questions.json`、
`presentation.json`、`numbering.json`、`papers.json`、`app.js`、`pdf-worker.js`，
并删除 `dist/downloads/chemy40-*.pdf` 与 `dist/assets/e40i/` 即可，不影响原有 1933 题。
若只想撤掉图形、保留纯文字题目，用 `presentation.bak.json` / `questions.bak.json`
恢复两份 JSON 即可（该备份是未插图的纯文字版）。
