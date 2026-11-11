/* 每日一言（hitokoto）：主页头像下方的签名条，每次打开/刷新换一句。
   取词失败（断网/超时/接口异常）时不做任何事，保留默认签名「轻阅读，读起来没负担」。
   老内核兼容：不用 AbortController，超时用 Promise.race 实现（与 hearts.js 同一手法）。 */
(function () {
    'use strict';

    function ready(fn) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
        else fn();
    }

    function timeoutPromise(ms) {
        return new Promise(function (_, reject) {
            setTimeout(function () { reject(new Error('timeout')); }, ms);
        });
    }

    ready(function () {
        var el = document.querySelector('.header-signature');
        if (!el) return;
        if (typeof fetch !== 'function') return;
        /* 带时间戳参数防接口边缘缓存，保证每次刷新都是新的一句；
           max_length 限制句子长度，避免胶囊在手机上换行变高 */
        var url = 'https://v1.hitokoto.cn/?max_length=18&t=' + new Date().getTime();
        Promise.race([fetch(url), timeoutPromise(6000)])
            .then(function (res) {
                if (!res || !res.ok) throw new Error('bad response');
                return res.json();
            })
            .then(function (data) {
                if (data && data.hitokoto) el.textContent = data.hitokoto;
            })
            .catch(function () { /* 静默失败，保留默认签名 */ });
    });
})();
