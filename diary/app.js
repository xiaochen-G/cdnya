(function(){
  var btn = document.getElementById('themeBtn');
  function syncIcon(){ var d = document.documentElement.getAttribute('data-theme') === 'dark'; if(btn) btn.textContent = d ? '☀️' : '🌙'; }
  if(btn){ btn.addEventListener('click', function(){
    var d = document.documentElement.getAttribute('data-theme') === 'dark';
    if(d){ document.documentElement.removeAttribute('data-theme'); try{ localStorage.setItem('diary_theme', 'light'); }catch(e){} }
    else { document.documentElement.setAttribute('data-theme', 'dark'); try{ localStorage.setItem('diary_theme', 'dark'); }catch(e){} }
    syncIcon();
  }); syncIcon(); }
  var overlay = document.getElementById('searchOverlay'), sBtn = document.getElementById('searchBtn'),
      sClose = document.getElementById('searchClose'), sInput = document.getElementById('searchInput'),
      sRes = document.getElementById('searchResults'), index = null;
  function openSearch(){ overlay.hidden = false; document.body.style.overflow = 'hidden'; setTimeout(function(){ sInput.focus(); }, 30); loadIndex(); }
  function closeSearch(){ overlay.hidden = true; document.body.style.overflow = ''; }
  function loadIndex(){
    if(index){ render(sInput.value || ''); return; }
    fetch('/search-index').then(function(r){ return r.json(); }).then(function(d){ index = d || []; render(sInput.value || ''); }).catch(function(){ sRes.innerHTML = '<p class="muted center">搜索加载失败</p>'; });
  }
  function render(q){
    q = (q || '').replace(/^s+|s+$/g, '').toLowerCase();
    var list = (index || []).filter(function(e){ return !q || e.title.toLowerCase().indexOf(q) >= 0 || (e.tags || []).join(' ').toLowerCase().indexOf(q) >= 0; }).slice(0, 30);
    if(!list.length){ sRes.innerHTML = '<p class="muted center">' + (q ? '没有找到相关的日记' : '暂无日记') + '</p>'; return; }
    sRes.innerHTML = list.map(function(){
      return '<a class="srow" href="#"><div class="si"><h3></h3><div class="ss"></div></div></a>';
    }).join('');
    var rows = sRes.querySelectorAll('.srow');
    for(var i = 0; i < rows.length; i++){
      rows[i].setAttribute('href', '/post/' + list[i].id);
      rows[i].querySelector('h3').textContent = list[i].title;
      rows[i].querySelector('.ss').textContent = list[i].date + (list[i].mood ? ' · ' + list[i].mood : '') + ((list[i].tags && list[i].tags.length) ? ' · ' + list[i].tags.join('、') : '');
    }
  }
  if(sBtn && overlay){
    sBtn.addEventListener('click', openSearch);
    sClose.addEventListener('click', closeSearch);
    overlay.addEventListener('click', function(ev){ if(ev.target === overlay) closeSearch(); });
    sInput.addEventListener('input', function(){ render(sInput.value); });
    document.addEventListener('keydown', function(ev){ if(ev.key === 'Escape' && !overlay.hidden) closeSearch(); });
  }
  var share = document.getElementById('shareBtn');
  if(share){ share.addEventListener('click', function(){
    var url = location.href;
    if(navigator.share){ navigator.share({ title: document.title, url: url }).catch(function(){}); return; }
    function done(){ var old = share.textContent; share.textContent = '链接已复制'; setTimeout(function(){ share.textContent = old; }, 1600); }
    function fallback(){ var ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); done(); }catch(e){} document.body.removeChild(ta); }
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(url).then(done).catch(fallback); } else fallback();
  }); }
})();

(function(){
  var s = document.getElementById('admSearch');
  if(!s) return;
  s.addEventListener('input', function(){ var q = this.value.toLowerCase(); var rows = document.querySelectorAll('tr[data-title]'); for (var i=0;i<rows.length;i++){ rows[i].style.display = rows[i].getAttribute('data-title').toLowerCase().indexOf(q) >= 0 ? '' : 'none'; } });
})();
