// Waline comment bootstrap: configuration travels on the #waline element's
// data attributes so this file can be hosted on the static CDN.
(function () {
  var el = document.getElementById('waline');
  if (!el) return;
  if (el.getAttribute('data-roomcheck') && new URLSearchParams(location.search).get('room')) return;
  import(el.getAttribute('data-waline-js')).then(function (m) {
    m.init({
      el: '#waline',
      serverURL: el.getAttribute('data-server'),
      path: el.getAttribute('data-path'),
      turnstileKey: el.getAttribute('data-turnstile'),
      lang: 'zh-CN',
      emoji: false,
      imageUploader: false,
      search: false,
      reaction: false,
      pageview: false,
      commentCounting: false,
      login: 'disable',
      meta: ['nick', 'mail'],
      requiredMeta: []
    });
  });
})();
