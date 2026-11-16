/* 首页卡片点赞 — 每个 ··· 左边的独立点赞按钮
 * 与文章页点赞同一套 Waline article 接口（type=reaction0，按文章路径区分计数），
 * 状态存 localStorage（feedLike:<path>），与 hearts.js 的实现方式一致。
 * 老内核兼容：不用 AbortController，超时用 Promise.race。 */
(function () {
    'use strict';

    var server = (window.__WALINE_SERVER__ || '').replace(/\/+$/, '');
    if (!server) return;
    var apiBase = server + '/api/article';

    function fetchWithTimeout(url, options, ms) {
        var timeout = new Promise(function (resolve, reject) {
            setTimeout(function () { reject(new Error('timeout')); }, ms);
        });
        return Promise.race([fetch(url, options || {}), timeout]);
    }

    function getCount(path) {
        return fetchWithTimeout(apiBase + '?path=' + encodeURIComponent(path) + '&type=reaction0', null, 10000)
            .then(function (r) { return r.json(); })
            .then(function (j) {
                if (j && j.errno === 0 && j.data && j.data[0]) return j.data[0].reaction0 || 0;
                return 0;
            });
    }

    function vote(path, action) {
        return fetchWithTimeout(apiBase, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: path, type: 'reaction0', action: action })
        }, 10000).then(function (r) { return r.json(); })
          .then(function (j) {
              if (!j || j.errno !== 0) throw new Error('vote failed');
              return (j.data && j.data[0] && j.data[0].reaction0) || 0;
          });
    }

    function hasVoted(path) {
        try { return window.localStorage.getItem('feedLike:' + path) === '1'; }
        catch (e) { return false; }
    }

    function setVoted(path, v) {
        try {
            if (v) window.localStorage.setItem('feedLike:' + path, '1');
            else window.localStorage.removeItem('feedLike:' + path);
        } catch (e) { /* 记不住就算了，计数以服务端为准 */ }
    }

    function init(btn) {
        var path = btn.getAttribute('data-path');
        if (!path) return;
        var icon = btn.querySelector('i');
        var countEl = btn.querySelector('.feed-like-count');
        var busy = false;

        function render(n) {
            var v = hasVoted(path);
            btn.classList.toggle('liked', v);
            if (icon) icon.className = v ? 'ri-heart-3-fill' : 'ri-heart-line';
            if (countEl) countEl.textContent = n > 0 ? String(n) : '';
        }

        getCount(path).then(render).catch(function () { /* 拿不到计数就只显示爱心 */ });

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (busy) return;
            busy = true;
            var wasVoted = hasVoted(path);
            vote(path, wasVoted ? 'down' : 'up').then(function (n) {
                setVoted(path, !wasVoted);
                busy = false;
                render(n);
            }).catch(function () { busy = false; });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var btns = document.querySelectorAll('.feed-like');
        for (var i = 0; i < btns.length; i++) init(btns[i]);
    });
})();
