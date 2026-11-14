/* ES5 bootstrap. Independent of application syntax and storage availability. */
(function (w, d) {
  'use strict';
  var completed = false, failed = false, failure = '', timer;
  function nativeReport(message) {
    try { if (w.GoAndroid && w.GoAndroid.reportError) w.GoAndroid.reportError(message); } catch (ignore) {}
  }
  function render() {
    if (!failed || !d.body) return;
    var box = d.getElementById('startupNotice');
    if (!box) {
      box = d.createElement('div'); box.id = 'startupNotice';
      box.setAttribute('role', 'alert');
      box.style.cssText = 'position:fixed;z-index:99999;left:16px;right:16px;top:16px;padding:18px;background:#fff8e7;color:#203c34;border:2px solid #c79335;border-radius:12px;font:16px/1.5 sans-serif;max-height:85vh;overflow:auto';
      d.body.appendChild(box);
    }
    while (box.firstChild) box.removeChild(box.firstChild);
    var title = d.createElement('strong'); title.appendChild(d.createTextNode('棋盘暂未打开 · v2.7.0')); box.appendChild(title);
    var detail = d.createElement('p'); detail.appendChild(d.createTextNode(failure)); box.appendChild(detail);
    var note = d.createElement('p'); note.appendChild(d.createTextNode('请截图保存此信息。不要卸载应用或清除数据，原有练习记录仍保留。')); box.appendChild(note);
    var retry = d.createElement('button'); retry.type = 'button'; retry.style.cssText = 'padding:12px 20px;font-size:16px'; retry.appendChild(d.createTextNode('重新打开'));
    retry.onclick = function () { w.location.reload(); }; box.appendChild(retry);
  }
  function fail(message) {
    if (completed) return;
    if (!failed) { failed = true; failure = String(message || '页面初始化未完成').slice(0, 1600); }
    clearTimeout(timer); nativeReport(failure); render();
  }
  w.AppBoot = {
    ready: function () {
      if (failed) return;
      completed = true; clearTimeout(timer);
      var box = d.getElementById('startupNotice'); if (box && box.parentNode) box.parentNode.removeChild(box);
      try { if (w.GoAndroid && w.GoAndroid.ready) w.GoAndroid.ready(); } catch (ignore) {}
    },
    fail: fail,
    state: function () { return {ready: completed, failed: failed, message: failure}; }
  };
  w.addEventListener('error', function (event) {
    if (completed) return;
    var target = event.target || event.srcElement;
    if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
      fail('本地资源未能读取：' + (target.src || target.href || target.tagName).split('/').pop());
    } else {
      fail('脚本启动错误：' + String(event.message || '未知错误') + '（' + String(event.filename || '').split('/').pop() + ':' + (event.lineno || 0) + '）');
    }
  }, true);
  w.addEventListener('unhandledrejection', function (event) {
    if (!completed) fail('启动任务失败：' + String(event.reason && event.reason.message || event.reason || '未知错误'));
  });
  d.addEventListener('DOMContentLoaded', render);
  timer = setTimeout(function () { if (!completed) fail('页面启动超时。请尝试原生启动页的“兼容显示”，或导出诊断信息。'); }, 12000);
})(window, document);
