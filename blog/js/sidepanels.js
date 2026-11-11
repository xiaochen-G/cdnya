/* tian side panels — 宽屏（≥1440px）时在内容列两侧空白处放玻璃小面板：
 * 左栏上：博主小名片（头像 / 名字 / 简介 / 文章数 / 建站天数）
 * 左栏下：欢迎卡片（访客自己的位置 / IP / 设备，数据来自访客浏览器，多源兜底）
 * 右栏：顺手入口（图床 / 临时邮箱 / 探针 / RSS）+ 今日日期
 * 主页（有 .moments-feed）和文章页（有 .article-text）都注入；
 * 显隐与定位全部由 wide.css 的媒体查询控制（文章页的列宽不同，定位走 .on-article），
 * 平板与手机端不会出现，页面 DOM 也只多这两列 aside。 */
(function () {
    'use strict';

    /* 主页的 feed 是 .moments-feed；文章页是 .moments-feed.single-view，必须排除，
       否则文章页会被误判成主页（卡片插入与 .on-article 定位都会错） */
    var isHome = !!document.querySelector('.moments-feed:not(.single-view)');
    if (!isHome && !document.querySelector('.article-text')) return;
    if (document.querySelector('.side-stack')) return;

    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
    }

    /* ---------- 左栏上：博主小名片 ---------- */
    var left = el('aside', 'side-panel');

    var avatarSrc = '/images/avatar-xiaotian.jpg';
    var headerAvatar = document.querySelector('.header-avatar img');
    if (headerAvatar && headerAvatar.getAttribute('src')) avatarSrc = headerAvatar.getAttribute('src');
    var avatar = el('img', 'sp-avatar');
    avatar.src = avatarSrc;
    avatar.alt = '';
    left.appendChild(avatar);

    var nameEl = document.querySelector('.header-name');
    left.appendChild(el('div', 'sp-name', nameEl ? nameEl.textContent.trim() : 'Dario'));

    var sigEl = document.querySelector('.header-signature');
    if (sigEl && sigEl.textContent.trim()) {
        left.appendChild(el('div', 'sp-desc', sigEl.textContent.trim()));
    }

    var stats = el('div', 'sp-stats');
    /* 主页数朋友圈卡片；文章页没有卡片可数，用 baseof 注入的全站文章数 */
    var postCount = document.querySelectorAll('.moment-card').length || window.__POST_COUNT__ || 0;
    var start = new Date(2026, 10, 3); /* 建站日 2026-11-03 */
    var today = new Date();
    var days = Math.max(1, Math.floor((today - new Date(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000) + 1);
    [[postCount, '篇文章'], [days, '运行天数']].forEach(function (pair) {
        var cell = el('div');
        cell.appendChild(el('b', null, String(pair[0])));
        cell.appendChild(el('span', null, pair[1]));
        stats.appendChild(cell);
    });
    left.appendChild(stats);

    /* ---------- 左栏下：欢迎卡片（访客位置 / IP / 设备） ---------- */
    var welcome = el('aside', 'side-panel');
    welcome.appendChild(el('div', 'sp-whello', '👋 欢迎你'));
    var wLoc = wRow(welcome, '位置', '定位中…');
    var wIp = wRow(welcome, 'IP', '查询中…');
    wRow(welcome, '设备', deviceText());

    function wRow(parent, k, v) {
        var row = el('div', 'sp-wrow');
        row.appendChild(el('span', 'sp-wk', k));
        var val = el('span', 'sp-wv', v);
        row.appendChild(val);
        parent.appendChild(row);
        return val;
    }

    function deviceText() {
        var ua = navigator.userAgent || '';
        var os = '未知系统';
        if (/iPhone/.test(ua)) os = 'iPhone';
        else if (/iPad/.test(ua)) os = 'iPad';
        else if (/Android/.test(ua)) os = 'Android';
        else if (/Windows NT/.test(ua)) os = 'Windows';
        else if (/Mac OS X|Macintosh/.test(ua)) os = 'macOS';
        else if (/Linux/.test(ua)) os = 'Linux';
        var br = '';
        if (/MicroMessenger/.test(ua)) br = '微信';
        else if (/QQ\//.test(ua)) br = 'QQ';
        else if (/Edg\//.test(ua)) br = 'Edge';
        else if (/Firefox\//.test(ua)) br = 'Firefox';
        else if (/Chrome\//.test(ua)) br = 'Chrome';
        else if (/Safari\//.test(ua)) br = 'Safari';
        var kind = /Mobile|iPhone|Android.*Mobile/.test(ua) ? '手机' : (/iPad|Tablet/.test(ua) ? '平板' : '电脑');
        return kind + ' · ' + os + (br ? ' · ' + br : '');
    }

    function countryZh(code, fallback) {
        try {
            if (code) {
                var name = new Intl.DisplayNames(['zh-CN'], { type: 'region' }).of(code.toUpperCase());
                if (name) return name;
            }
        } catch (e) { /* 老浏览器没有 Intl.DisplayNames 就用接口给的英文名 */ }
        return fallback || '';
    }

    function setGeo(ip, code, country, region, city) {
        var parts = [];
        var c = countryZh(code, country);
        if (c) parts.push(c);
        if (region && region !== c) parts.push(region);
        if (city && city !== region) parts.push(city);
        wLoc.textContent = parts.length ? parts.join(' · ') : '来自远方的朋友';
        if (ip) wIp.textContent = ip;
    }

    function fetchJson(url, ms) {
        var ctrl = new AbortController();
        var t = setTimeout(function () { ctrl.abort(); }, ms);
        return fetch(url, { signal: ctrl.signal }).then(function (r) {
            clearTimeout(t);
            if (!r.ok) throw new Error('bad status');
            return r.json();
        });
    }

    /* 多源兜底：均为 HTTPS 且允许跨域，国内与海外访客都能直连；
       哪个先成功用哪个，全失败就只显示设备信息。
       只在宽屏（≥1440px，面板真正会显示）时才请求定位，
       免得手机/平板上白白发出两次外部请求。 */
    var wideEnough = window.matchMedia ? window.matchMedia('(min-width: 1440px)').matches : window.innerWidth >= 1440;
    if (wideEnough) {
        fetchJson('https://ipwho.is/', 3500).then(function (d) {
            if (!d || d.success === false || !d.ip) throw new Error('empty');
            setGeo(d.ip, d.country_code, d.country, d.region, d.city);
        }).catch(function () {
            return fetchJson('https://api.ip.sb/geoip', 3500).then(function (d) {
                if (!d || !d.ip) throw new Error('empty');
                setGeo(d.ip, d.country_code, d.country, d.region, d.city);
            });
        }).catch(function () {
            wLoc.textContent = '来自远方的朋友';
            wIp.textContent = '未获取到';
        });
    } else {
        wLoc.textContent = '来自远方的朋友';
        wIp.textContent = '未获取到';
    }

    /* ---------- 右栏：顺手入口 ---------- */
    var right = el('aside', 'side-panel');
    right.appendChild(el('div', 'sp-title', '顺手入口'));

    /* 链接表：[图标, 名称, 一句话（移动卡片用）, 地址]——宽屏面板与移动卡片共用 */
    var links = [
        ['ri-image-line', '轻图床', '存图的地方', 'https://img.owo.name'],
        ['ri-mail-line', '临时邮箱', '临时收信', 'https://mail.akali.cc.cd'],
        ['ri-video-download-line', '轻解析', '视频去水印', 'https://parse.kcdn.us.ci'],
        ['ri-chat-3-line', '弹幕接口', '播放器弹幕', 'https://danmu.cdnapi.us.ci'],
        ['ri-radar-line', '探针', '服务器监控', 'https://itz.us.ci'],
        ['ri-rss-line', 'RSS 订阅', '订阅本站', '/index.xml']
    ];
    links.forEach(function (item) {
        var a = el('a', 'sp-link');
        a.href = item[3];
        if (item[3].indexOf('http') === 0) { a.target = '_blank'; a.rel = 'noopener'; }
        var icon = el('i');
        icon.className = item[0];
        a.appendChild(icon);
        a.appendChild(el('span', null, item[1]));
        right.appendChild(a);
    });

    var weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    var dateText = today.getFullYear() + ' 年 ' + (today.getMonth() + 1) + ' 月 ' + today.getDate() + ' 日 · 星期' + weekdays[today.getDay()];
    right.appendChild(el('div', 'sp-date', dateText));

    /* ---------- 组装两列 ---------- */
    var stackL = el('div', 'side-stack side-stack-left');
    stackL.appendChild(left);
    stackL.appendChild(welcome);
    var stackR = el('div', 'side-stack side-stack-right');
    stackR.appendChild(right);
    if (!isHome) {
        /* 文章页内容列只有 680px，定位偏移与主页不同，交给 wide.css 的 .on-article 规则 */
        stackL.className += ' on-article';
        stackR.className += ' on-article';
    }
    document.body.appendChild(stackL);
    document.body.appendChild(stackR);

})();
