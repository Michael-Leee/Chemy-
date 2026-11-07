/* 镜像加速 v2：多源并行竞速，避免单个镜像抽风时串行等待超时。
   数据指向本仓库 raw（Michael-Leee/Chemy-），与线上 dist 完全自洽。
   谁先「完整下载完」谁生效；同源 github.io 延迟 4 秒后才加入兜底。 */
(function () {
  'use strict';
  const MIRROR_BASES = [
    'https://ghfast.top/https://raw.githubusercontent.com/Michael-Leee/Chemy-/main/dist',
    'https://gh-proxy.com/https://raw.githubusercontent.com/Michael-Leee/Chemy-/main/dist'
  ];
  const SAME_ORIGIN_DELAY_MS = 4000; // 镜像 4 秒还没结果才启用同源兜底
  const HARD_TIMEOUT_MS = 20000;     // 单个源硬超时

  function raceOne(url, options, delay) {
    const controller = new AbortController();
    let timer = null, delayTimer = null, cancelled = false;
    const promise = new Promise((resolve, reject) => {
      const go = () => {
        if (cancelled) return;
        timer = setTimeout(() => controller.abort(), HARD_TIMEOUT_MS);
        fetch(url, Object.assign({}, options, { signal: controller.signal }))
          .then(async response => {
            if (!response.ok) { clearTimeout(timer); reject(new Error('HTTP ' + response.status)); return; }
            // 比「完整下载完成」而不是只比响应头：github.io 首字节快但下载极慢，
            // 只看响应头会误选它，反而更慢。
            const body = await response.arrayBuffer();
            clearTimeout(timer);
            resolve({ body, headers: response.headers });
          })
          .catch(err => { clearTimeout(timer); reject(err); });
      };
      if (delay) delayTimer = setTimeout(go, delay); else go();
    });
    return {
      promise,
      abort: () => { cancelled = true; clearTimeout(delayTimer); clearTimeout(timer); controller.abort(); }
    };
  }

  async function fetchMirror(relPath, options) {
    const rel = String(relPath || '').replace(/^\/+/, '');
    const entries = MIRROR_BASES.map(base => raceOne(base + '/' + rel, options, 0));
    entries.push(raceOne(rel, options, SAME_ORIGIN_DELAY_MS)); // 同源 github.io 兜底
    try {
      const winner = await Promise.any(entries.map(e => e.promise));
      entries.forEach(e => e.abort());
      // body 已被 fetch 自动解压，不能把原响应的 content-encoding / content-length 带过去
      const headers = new Headers();
      headers.set('Content-Type', winner.headers.get('Content-Type') || 'application/json');
      return new Response(winner.body, { status: 200, headers });
    } catch (err) {
      entries.forEach(e => e.abort());
      return fetch(rel, options); // 全部失败：退回原始行为
    }
  }

  window.ChemyMirror = { fetch: fetchMirror };
})();
