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
      try {
        window.katex.render(tex, el, {
          displayMode: display,
          throwOnError: false,
          strict: false,
          trust: false,
          output: 'htmlAndMathml'
        });
      } catch (e) {
        el.removeAttribute('data-math-done');
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
