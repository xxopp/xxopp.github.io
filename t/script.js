/* ============================================================
   note-1 / script.js
   .copy 一键复制文案 + 轻提示
   规则：
   - 带 data-copy 的 .copy  → 复制该文案（兑换码、页面地址）
   - .copy-icon 按钮        → 复制紧邻 <a> 的 href（完整网址/注册地址）
   - 其它 .copy 元素        → 复制自身文本
   链接本身始终保留原生跳转、中键 / Cmd+Click 行为不变
   ============================================================ */
(function () {
  'use strict';

  var TOAST_MS = 1500;
  var STATE_MS = 1200;
  var toastEl = null;
  var toastTimer = null;
  var resetTimers = new WeakMap();

  function ensureToast() {
    if (toastEl) return toastEl;
    toastEl = document.createElement('div');
    toastEl.className = 'copy-toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
    return toastEl;
  }

  function showToast(message) {
    var el = ensureToast();
    el.textContent = message;
    el.classList.add('is-visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('is-visible');
    }, TOAST_MS);
  }

  function resolveText(el) {
    if (el.dataset.copy) return el.dataset.copy;
    if (el.classList.contains('copy-icon')) {
      var link = el.previousElementSibling;
      if (link && link.tagName === 'A') {
        return link.getAttribute('href') || link.textContent.trim();
      }
    }
    return el.textContent.trim();
  }

  /* Clipboard API 不可用（http / file 协议、旧浏览器）时的降级方案 */
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (err) {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  function flash(el, ok) {
    el.classList.remove('is-copied', 'is-failed');
    el.classList.add(ok ? 'is-copied' : 'is-failed');
    var prev = resetTimers.get(el);
    if (prev) clearTimeout(prev);
    resetTimers.set(el, setTimeout(function () {
      el.classList.remove('is-copied', 'is-failed');
    }, STATE_MS));
  }

  function copyFrom(el) {
    var text = resolveText(el);
    if (!text) {
      showToast('没有可复制的内容');
      return;
    }
    var done = function (ok) {
      flash(el, ok);
      showToast(ok ? '已复制' : '复制失败，请手动选中文本后按 Ctrl+C');
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(
        function () { done(true); },
        function () { done(fallbackCopy(text)); }
      );
    } else {
      done(fallbackCopy(text));
    }
  }

  /* 事件委托：后续新增 .copy 元素无需重新绑定 */
  document.addEventListener('click', function (event) {
    if (!(event.target instanceof Element)) return;
    var el = event.target.closest('.copy');
    if (!el) return;
    if (el.tagName === 'BUTTON') event.preventDefault();
    copyFrom(el);
  });

  /* span[role="button"] 的键盘支持；原生 button 已支持 Enter / Space */
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (!(event.target instanceof Element)) return;
    var el = event.target.closest('.copy');
    if (!el || el.tagName === 'BUTTON') return;
    event.preventDefault();
    copyFrom(el);
  });

  /* 标签页隐藏时暂停 toast 计时，回来后再给一次完整提示 */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
      if (toastEl) toastEl.classList.remove('is-visible');
    }
  });
})();
