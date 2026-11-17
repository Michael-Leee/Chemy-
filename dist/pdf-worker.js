/* Chemy export worker v4 — clip selected questions from the original papers
   as a CONTINUOUS, cross-page stream.

   v3 placed one band per output page (scaling tall bands down to fit) and
   inserted fixed gaps after every band/question, which orphaned paper titles
   and left large blank areas at the foot of each page.  v4 instead:

     * uses ONE uniform scale (fit content width) so spacing matches the source,
     * flows bands back-to-back with NO artificial gaps,
     * splits a band only at a safe cut line (a text-line / figure edge) when it
       runs past the bottom margin — "cut at the line nearest the bottom",
     * lets content cross output-page boundaries naturally.

   Mirror racing is preserved from v3 (a full-body race, not a headers-only
   race, because github.io has fast TTFB). */
importScripts('vendor/pdf-lib.min.js');
const {PDFDocument, PageSizes, StandardFonts, rgb} = PDFLib;

const MIRROR_BASES = [
  'https://ghfast.top/https://raw.githubusercontent.com/Michael-Leee/Chemy-/main/dist',
  'https://gh-proxy.com/https://raw.githubusercontent.com/Michael-Leee/Chemy-/main/dist'
];
const SAME_ORIGIN_DELAY_MS = 4000;
const HARD_TIMEOUT_MS = 20000;

function raceOne(url, delay) {
  const controller = new AbortController();
  let timer = null, delayTimer = null, cancelled = false;
  const promise = new Promise((resolve, reject) => {
    const go = () => {
      if (cancelled) return;
      timer = setTimeout(() => controller.abort(), HARD_TIMEOUT_MS);
      fetch(url, {signal: controller.signal})
        .then(async response => {
          if (!response.ok) { clearTimeout(timer); reject(new Error('HTTP ' + response.status)); return; }
          const body = await response.arrayBuffer();
          clearTimeout(timer);
          resolve(body);
        })
        .catch(err => { clearTimeout(timer); reject(err); });
    };
    if (delay) delayTimer = setTimeout(go, delay); else go();
  });
  return {promise, abort: () => {
    cancelled = true; clearTimeout(delayTimer); clearTimeout(timer); controller.abort();
  }};
}

async function fetchFast(rel) {
  const clean = String(rel).replace(/^\/+/, '');
  const sameOrigin = new URL(clean, self.location.href).href;
  const entries = MIRROR_BASES.map(b => raceOne(b + '/' + encodeURI(clean), 0));
  entries.push(raceOne(sameOrigin, SAME_ORIGIN_DELAY_MS));
  try {
    const winner = await Promise.any(entries.map(e => e.promise));
    entries.forEach(e => e.abort());
    return winner;
  } catch (_err) {
    entries.forEach(e => e.abort());
    const r = await fetch(sameOrigin);
    if (!r.ok) throw new Error('资源无法读取，请检查网络后重试。');
    return await r.arrayBuffer();
  }
}

let cutsData = null;
async function getCuts(version) {
  if (!cutsData) {
    const buf = await fetchFast('source-cuts.json?v=' + encodeURIComponent(version));
    cutsData = JSON.parse(new TextDecoder().decode(buf));
  }
  if (cutsData.version !== version) throw new Error('题库正在更新，请刷新页面后重试。');
  return cutsData;
}

const sourceCache = new Map();
async function getSource(name) {
  if (sourceCache.has(name)) return sourceCache.get(name);
  self.postMessage({status: '正在读取原卷，首次下载可能需要稍候…'});
  const doc = await PDFDocument.load(await fetchFast('downloads/sources/' + name));
  sourceCache.set(name, doc);
  return doc;
}

self.onmessage = async ({data}) => {
  try {
    const kind = data.kind === 'answers' ? 'answers' : 'questions';
    const key = kind === 'answers' ? 'a' : 'q';
    if (!Array.isArray(data.items) || !data.items.length) throw new Error('请先选择题目。');
    const cuts = await getCuts(data.version);
    const out = await PDFDocument.create();
    out.setTitle(data.title); out.setAuthor('Chemy 化学奥林匹克团队');
    out.setCreator('Chemy 专题题库 · 原卷直裁'); out.setLanguage('zh-CN');
    const [W, H] = PageSizes.A4;
    const margin = 48, bottomMargin = 55;
    const font = await out.embedFont(StandardFonts.TimesRoman);
    const copiedCache = new Map();
    let page = null, cursor = 0, pageCount = 0;
    const placements = [];

    function newPage() {
      page = out.addPage([W, H]); cursor = H - margin; pageCount++;
      page.drawText(String(pageCount), {x: W - 68, y: 30, size: 9, font,
        color: rgb(.3, .3, .3)});
    }
    async function copiedPage(name, pageIdx) {
      const ck = name + ':' + pageIdx;
      if (!copiedCache.has(ck)) {
        const src = await getSource(name);
        if (pageIdx < 0 || pageIdx >= src.getPageCount()) {
          throw new Error('原卷页码越界，请刷新后重试。');
        }
        const [pg] = await out.copyPages(src, [pageIdx]);
        copiedCache.set(ck, pg);
      }
      return copiedCache.get(ck);
    }

    // Draw one horizontal slice [top, bottom] (source coords measured from the
    // TOP of the page) of a source page at the current output cursor.
    async function drawSlice(src, top, bottom, scale) {
      const sh = src.getHeight(), sw = src.getWidth();
      const clipTop = Math.min(sh, sh - top);
      const clipBottom = Math.max(0, sh - bottom);
      const nh = clipTop - clipBottom;
      if (nh < 2) return 0;
      const embedded = await out.embedPage(src, {
        left: 0, right: sw, top: clipTop, bottom: clipBottom});
      const dh = nh * scale, dw = sw * scale;
      page.drawPage(embedded, {x: (W - dw) / 2, y: cursor - dh,
        xScale: scale, yScale: scale});
      placements.push({sourceTop: top, sourceBottom: bottom, scale, page: pageCount,
        top: H - cursor, height: dh});
      cursor -= dh;
      return dh;
    }

    // Flow a source band [top, bottom] onto the output, splitting at safe cut
    // lines so each page fills down to the bottom margin.
    async function flowBand(book, pageIdx, top, bottom) {
      const src = await copiedPage(book, pageIdx);
      const scale = Math.min(1, (W - 2 * margin) / src.getWidth());
      const lines = (cutsData.cutlines && cutsData.cutlines[book] &&
                     cutsData.cutlines[book][String(pageIdx)]) || [];
      let cur = top;
      while (bottom - cur > 1) {
        const fitSrc = (cursor - bottomMargin) / scale;
        if (bottom - cur <= fitSrc + 0.5) {
          await drawSlice(src, cur, bottom, scale);
          break;
        }
        // Largest safe cut line that still fits above the bottom margin.
        let split = null;
        for (const y of lines) {
          if (y <= cur + 0.5) continue;
          if (y >= bottom - 0.5) break;
          if (y - cur > fitSrc + 0.5) break;
          split = y;
        }
        if (split == null) { newPage(); continue; }
        await drawSlice(src, cur, split, scale);
        cur = split;
      }
    }

    newPage();
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const rec = cuts.cuts[item.id];
      const bands = rec && rec[key];
      if (!bands || !bands.length) {
        throw new Error('这道题的原卷裁切坐标缺失，请刷新后重试：' + item.id);
      }
      const m = /^chemy(\d+)-/.exec(item.id);
      const book = m && cuts.books[m[1]] && cuts.books[m[1]][key];
      if (!book) throw new Error('这道题的原卷未登记：' + item.id);
      for (const b of bands) {
        await flowBand(book, b.page, b.top, b.bottom);
      }
      self.postMessage({status: `正在排版第 ${i + 1} / ${data.items.length} 道题…`});
    }
    const bytes = await out.save();
    self.postMessage({bytes: bytes.buffer, placements}, [bytes.buffer]);
  } catch (error) {
    self.postMessage({error: error instanceof TypeError
      ? '下载中断，请检查网络后重试。' : (error.message || 'PDF 生成失败，请重试。')});
  }
};
