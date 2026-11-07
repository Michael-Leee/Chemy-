/* 镜像加速：题库数据（JSON 索引）优先走国内镜像，github.io 直连兜底。
   镜像源指向本仓库 raw（Michael-Leee/Chemy-），数据完全自洽。 */
(function () {
  'use strict';
  const MIRROR_BASES = [
    'https://ghfast.top/https://raw.githubusercontent.com/Michael-Leee/Chemy-/main/dist',
    'https://gh-proxy.com/https://raw.githubusercontent.com/Michael-Leee/Chemy-/main/dist',
  ];
  const TIMEOUT_MS = 30000;
  async function fetchMirror(relPath, options) {
    let lastErr;
    for (const base of MIRROR_BASES) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const response = await fetch(base + '/' + relPath, Object.assign({}, options, { signal: controller.signal }));
        clearTimeout(timer);
        if (response.ok) return response;
        lastErr = new Error('HTTP ' + response.status);
      } catch (err) { lastErr = err; }
    }
    return fetch(relPath, options); // 同源 github.io 兜底，等价原行为
  }
  window.ChemyMirror = { fetch: fetchMirror };
})();
