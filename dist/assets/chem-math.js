/* Render Chemy LaTeX emitted by the MinerU pipeline. Runs on load and on any
   DOM insertion, because app.js swaps question cards via innerHTML. */
(function () {
  if (!window.katex) return;
  function render(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.chem-math:not([data-math-done])').forEach(function (el) {
      el.setAttribute('data-math-done', '1');
      var tex = el.getAttribute('data-tex') || el.textContent || '';
      var display = el.classList.contains('chem-math--display');
      var opts = {
        displayMode: display,
        throwOnError: true,
        strict: false,
        trust: false,
        output: 'htmlAndMathml'
      };
      function readable(t) {
        return t.replace(/\\[a-zA-Z]+\s*\{([^{}]*)\}/g, '$1')
                .replace(/\\[a-zA-Z]+/g, ' ')
                .replace(/[{}^_$]/g, '')
                .replace(/\s+/g, ' ').trim();
      }
      try {
        window.katex.render(tex, el, opts);
      } catch (e) {
        // MinerU occasionally emits unbalanced braces / \tag in inline math.
        // A second chance with the offending commands removed, then a plain
        // text fallback -- never a red KaTeX error box.
        var cleaned = tex.replace(/\\tag\s*\{[^{}]*\}/g, '')
                         .replace(/\\left|\\right/g, '');
        try {
          window.katex.render(cleaned, el, opts);
        } catch (e2) {
          el.classList.add('chem-math-fallback');
          el.textContent = readable(tex) || tex;
        }
      }
    });
  }
  render(document);
  if (typeof MutationObserver !== 'undefined' && document.body) {
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        if (records[i].addedNodes.length) render(records[i].target);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  document.addEventListener('DOMContentLoaded', function () { render(document); });
  document.addEventListener('chemy:rendered', function () { render(document); });
})();
