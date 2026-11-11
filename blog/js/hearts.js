/* tian hearts — 点击首页头像点亮爱心
 * - 点击 .header-avatar（或爱心小药丸）不再切换深浅色（导航栏还有专门的切换按钮），
 *   改为：大爱心弹出 + 小爱心上飘动画，并在 Waline 后端记一颗心。
 * - 计数与文章点赞同一套 Waline article 接口（type=reaction0，按页面路径区分），
 *   每位访客记一颗，再点一次取消；状态存 localStorage，与 Waline 官方行为一致。
 */
(function () {
    'use strict';

    var server = (window.__WALINE_SERVER__ || '').replace(/\/+$/, '');
    if (!server) return;

    var path = window.location.pathname;
    var storeKey = 'tianHearts:' + path;
    var cacheKey = 'tianHeartsCount:' + path;
    var apiBase = server + '/api/article';
    var busy = false;
    var countLoading = false;

    /* 上次成功拿到的计数先存在本地：慢网络时药丸先显示这个数，不再干等 */
    function getCachedCount() {
        try {
            var v = window.localStorage.getItem(cacheKey);
            if (v === null) return null;
            var n = parseInt(v, 10);
            return isNaN(n) ? null : n;
        } catch (e) { return null; }
    }

    function setCachedCount(n) {
        try { window.localStorage.setItem(cacheKey, String(n)); } catch (e) { /* 记不住就算了 */ }
    }

    function hasVoted() {
        try { return window.localStorage.getItem(storeKey) === '1'; }
        catch (e) { return false; }
    }

    function setVoted(v) {
        try {
            if (v) window.localStorage.setItem(storeKey, '1');
            else window.localStorage.removeItem(storeKey);
        } catch (e) { /* 隐私模式下记不住状态，计数仍以服务端为准 */ }
    }

    /* 超时用 Promise.race 实现：不用 AbortController——小米自带浏览器等老内核没有这个 API，
       一旦抛错会把同一回调里后面的点击监听注册也带崩（2026-11-04 实测回归） */
    function fetchWithTimeout(url, options, ms) {
        var timeout = new Promise(function (resolve, reject) {
            setTimeout(function () { reject(new Error('timeout')); }, ms);
        });
        return Promise.race([fetch(url, options || {}), timeout]);
    }

    function fetchCount() {
        return fetchWithTimeout(apiBase + '?path=' + encodeURIComponent(path) + '&type=reaction0', null, 10000)
            .then(function (r) { return r.json(); })
            .then(function (j) {
                if (j && j.errno === 0 && j.data && j.data[0]) return j.data[0].reaction0 || 0;
                throw new Error('bad response');
            });
    }

    /* 药丸元素在 DOMContentLoaded 里创建后挂到这两个外层变量上，
       render 必须定义在外层：loadCount 也在外层调用它（曾因作用域写错导致计数永远加载不出来） */
    var pillEl = null;
    var countEl = null;

    function render(count) {
        setCachedCount(count);
        if (!countEl) return;
        countEl.textContent = String(count);
        if (pillEl) pillEl.classList.toggle('voted', hasVoted());
    }

    /* 慢网络下失败很常见（机主实测：挂 VPN 时只有几 KB/s，计数接口屡屡超时）：
       放宽单次超时到 10s，再按 2s / 5s / 10s 间隔耐心重试，共 4 次；
       全部失败就保留上次缓存或占位符，绝不显示假的 0 */
    function loadCount() {
        if (countLoading) return;
        countLoading = true;
        var delays = [2000, 5000, 10000];
        var attempt = function (i) {
            fetchCount().then(function (count) {
                countLoading = false;
                render(count);
            }).catch(function () {
                if (i < delays.length) {
                    setTimeout(function () { attempt(i + 1); }, delays[i]);
                } else {
                    countLoading = false; /* 保持现状，等下次页面可见时再试 */
                }
            });
        };
        attempt(0);
    }

    function vote(action) {
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

    document.addEventListener('DOMContentLoaded', function () {
        var avatar = document.querySelector('.header-avatar');
        var info = document.querySelector('.header-info');
        var header = document.querySelector('.moments-header');
        if (!avatar || !info || !header) return;

        /* 动画层 */
        var layer = document.createElement('div');
        layer.className = 'heart-layer';
        header.appendChild(layer);

        /* 计数小药丸，挂在名字下方 */
        var pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'heart-pill';
        pill.setAttribute('aria-label', '给博主点一颗爱心');
        pill.innerHTML = '<span class="heart-pill-icon">❤️</span>' +
                         '<span class="heart-pill-count">–</span>';
        info.appendChild(pill);
        pillEl = pill;
        countEl = pill.querySelector('.heart-pill-count');

        /* 先把上次缓存的计数摆出来，再在后台刷新 */
        var cached = getCachedCount();
        if (cached !== null) render(cached);

        function avatarCenter() {
            var hr = header.getBoundingClientRect();
            var ar = avatar.getBoundingClientRect();
            return {
                x: ar.left - hr.left + ar.width / 2,
                y: ar.top - hr.top + ar.height / 2
            };
        }

        function spawn(el, x, y) {
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            layer.appendChild(el);
            el.addEventListener('animationend', function () { el.remove(); });
        }

        function celebrate() {
            var c = avatarCenter();
            var big = document.createElement('span');
            big.className = 'heart-big';
            big.textContent = '❤️';
            spawn(big, c.x, c.y);
            for (var i = 0; i < 6; i++) {
                var mini = document.createElement('span');
                mini.className = 'heart-mini';
                mini.textContent = '❤️';
                var size = 11 + Math.random() * 10;
                mini.style.fontSize = size.toFixed(0) + 'px';
                mini.style.setProperty('--dx', (Math.random() * 56 - 28).toFixed(0) + 'px');
                mini.style.setProperty('--rot', (Math.random() * 56 - 28).toFixed(0) + 'deg');
                mini.style.animationDelay = (Math.random() * 0.18).toFixed(2) + 's';
                spawn(mini, c.x + (Math.random() * 30 - 15), c.y + (Math.random() * 16 - 8));
            }
        }

        function farewell() {
            var c = avatarCenter();
            var big = document.createElement('span');
            big.className = 'heart-big bye';
            big.textContent = '❤️';
            spawn(big, c.x, c.y);
        }

        function pulse() {
            countEl.classList.remove('pulse');
            void countEl.offsetWidth;
            countEl.classList.add('pulse');
        }

        function onHeartClick(e) {
            e.preventDefault();
            e.stopPropagation();
            if (busy) return;
            busy = true;
            var voted = hasVoted();
            var prev = parseInt(countEl.textContent, 10);
            if (isNaN(prev)) prev = 0;
            /* 先给动画和乐观计数，请求失败再回滚 */
            if (voted) { farewell(); render(Math.max(prev - 1, 0)); }
            else { celebrate(); render(prev + 1); }
            pulse();
            vote(voted ? 'desc' : 'inc').then(function (serverCount) {
                setVoted(!voted);
                render(serverCount);
            }).catch(function () {
                render(prev);
            }).then(function () { busy = false; });
        }

        /* 头像图片禁止拖拽，减少某些手机浏览器（小米 XWeb 等）对图片的接管菜单 */
        var avatarImg = avatar.querySelector('img');
        if (avatarImg) avatarImg.setAttribute('draggable', 'false');

        /* 捕获阶段拦截：赶在主题「点头像切深浅色」的监听之前接管这次点击。
           触摸设备先在 touchend 接管并 preventDefault（压掉后续合成 click），
           再用时间戳守卫防止 click 重复触发导致一次点按被处理两遍。 */
        var lastTouchHandled = 0;
        document.addEventListener('touchend', function (e) {
            if (e.target.closest('.header-avatar') || e.target.closest('.heart-pill')) {
                e.preventDefault();
                lastTouchHandled = Date.now();
                onHeartClick(e);
            }
        }, { capture: true, passive: false });
        document.addEventListener('click', function (e) {
            if (Date.now() - lastTouchHandled < 700) return;
            if (e.target.closest('.header-avatar') || e.target.closest('.heart-pill')) {
                onHeartClick(e);
            }
        }, true);

        /* 计数加载放最后：就算它出任何差错，也不能影响上面的点击接管 */
        try { loadCount(); } catch (err) { /* 保持占位符 */ }

        /* 切后台又切回来时如果计数还没拿到，再补试一轮 */
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden && countEl && countEl.textContent === '–') loadCount();
        });
    });
})();
