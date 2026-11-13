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
- `dist/presentation.json`：新增 200 条，正文与答案由原卷文字层生成，按小问编号分段。
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

1. 网页正文是原卷文字层转成的 HTML，化学式上下标未逐字还原；结构式、表格、
   反应式图形以原卷页为准，出处行给出「题目合集第 X 页 · 答案合集第 Y 页」可对照。
2. 按页复制会带上原卷页眉与相邻题边界处的少量内容（题目常跨页或同页相邻）。
3. 专题题目册 / 答案册（18 份）不含第40届题目；第40届请通过「下载选题 PDF」或
   `dist/downloads/chemy40-*.pdf` 获取。
4. 主专题由标题关键词自动判定，个别题目可能需要按 `docs/ingestion.md` 的分类原则校准；
   修改 `data/import_plan40.json` 后重新运行 `build40.py` 即可（分类走元数据同步，不重取正文）。

## 回退

第40届的数据、资源与两处前端分支彼此独立。回退时恢复 `dist/questions.json`、
`presentation.json`、`numbering.json`、`papers.json`、`app.js`、`pdf-worker.js`，
并删除 `dist/downloads/chemy40-*.pdf` 即可，不影响原有 1933 题。
