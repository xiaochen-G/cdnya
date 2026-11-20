document.getElementById('entryForm').addEventListener('submit', function(ev){
  var input = document.getElementById('media');
  if(!input || !input.files || !input.files.length) return;
  var files = Array.prototype.slice.call(input.files);
  var need = false;
  for (var i=0;i<files.length;i++){ if(files[i].type.indexOf('image/')===0 && files[i].size>19000000){ need=true; break; } }
  if(!need) return;
  ev.preventDefault();
  var form = ev.target;
  Promise.all(files.map(compressOne)).then(function(done){
    var fd = new FormData(form);
    fd.delete('media');
    done.forEach(function(f){ fd.append('media', f, f.name || 'photo.jpg'); });
    fetch(form.action, {method:'POST', body: fd}).then(function(r){
      if(r.redirected){ location.href = r.url; return; }
      r.text().then(function(t){ document.open(); document.write(t); document.close(); });
    }).catch(function(){ form.submit(); });
  }).catch(function(){ form.submit(); });
});
function compressOne(f){
  return new Promise(function(resolve){
    if(f.type.indexOf('image/')!==0 || f.size<=19000000){ resolve(f); return; }
    var url = URL.createObjectURL(f);
    var img = new Image();
    img.onload = function(){
      try{
        var scale = Math.min(1, 1920/Math.max(img.width,img.height));
        var c = document.createElement('canvas');
        c.width = Math.max(1,Math.round(img.width*scale)); c.height = Math.max(1,Math.round(img.height*scale));
        c.getContext('2d').drawImage(img,0,0,c.width,c.height);
        c.toBlob(function(b){
          URL.revokeObjectURL(url);
          if(b && b.size < f.size){ b.name = (f.name||'photo').replace(/\.\w+$/,'') + '.jpg'; resolve(b); } else resolve(f);
        }, 'image/jpeg', 0.85);
      }catch(e){ resolve(f); }
    };
    img.onerror = function(){ resolve(f); };
    img.src = url;
  });
}

(function(){
  var ta = document.getElementById('bodyBox');
  if(!ta) return;
  function lineStart(pos){ return ta.value.lastIndexOf('\n', pos-1) + 1; }
  function prefixLines(prefix){
    var s = ta.selectionStart, start = lineStart(s);
    ta.setRangeText(prefix, start, start, 'end');
    ta.focus(); ta.selectionStart = ta.selectionEnd = s + prefix.length;
  }
  function wrap(before, after, placeholder){
    var s = ta.selectionStart, e = ta.selectionEnd;
    var sel = ta.value.substring(s, e) || placeholder;
    ta.setRangeText(before + sel + after, s, e, 'end');
    ta.focus(); ta.selectionStart = s + before.length; ta.selectionEnd = s + before.length + sel.length;
  }
  function insert(text){
    var s = ta.selectionStart;
    ta.setRangeText(text, s, ta.selectionEnd, 'end');
    ta.focus(); ta.selectionStart = ta.selectionEnd = s + text.length;
  }
  var acts = {
    h2: function(){ prefixLines('## '); },
    h3: function(){ prefixLines('### '); },
    bold: function(){ wrap('**', '**', '加粗文字'); },
    italic: function(){ wrap('*', '*', '斜体文字'); },
    code: function(){ wrap('`', '`', '代码'); },
    ul: function(){ prefixLines('- '); },
    ol: function(){ prefixLines('1. '); },
    quote: function(){ prefixLines('> '); },
    hr: function(){ insert('\n\n---\n\n'); },
    link: function(){
      var s = ta.selectionStart, e = ta.selectionEnd;
      var sel = ta.value.substring(s, e) || '链接文字';
      ta.setRangeText('[' + sel + '](https://)', s, e, 'end');
      ta.focus(); ta.selectionStart = s + sel.length + 3; ta.selectionEnd = s + sel.length + 11;
    }
  };
  var btns = document.querySelectorAll('[data-md]');
  for (var i=0;i<btns.length;i++){
    btns[i].addEventListener('click', function(){ var a = this.getAttribute('data-md'); if(acts[a]) acts[a](); });
  }
  var pv = document.getElementById('mdPreview'), pvBtn = document.getElementById('mdPreviewBtn');
  pvBtn.addEventListener('click', function(){
    if(pv.style.display === 'none'){ pv.innerHTML = mdRender(ta.value); pv.style.display = 'block'; pvBtn.className = 'on'; pvBtn.textContent = '收起预览'; }
    else { pv.style.display = 'none'; pvBtn.className = ''; pvBtn.textContent = '预览'; }
  });
  function mdEsc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function mdInline(s){
    var codes = [];
    s = s.replace(/`([^`]+)`/g, function(m, c){ codes.push(c); return '\u0001' + (codes.length-1) + '\u0002'; });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/~~([^~]+)~~/g, '<s>$1</s>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\u0001(\d+)\u0002/g, function(m, i){ return '<code>' + codes[+i] + '</code>'; });
    return s;
  }
  function mdRender(text){
    var lines = mdEsc(text).split('\n'), out = '', inUl = false, inOl = false;
    function closeLists(){ if(inUl){ out += '</ul>'; inUl = false; } if(inOl){ out += '</ol>'; inOl = false; } }
    for (var i=0;i<lines.length;i++){
      var s = lines[i].replace(/^\s+|\s+$/g, '');
      if(!s){ closeLists(); continue; }
      if(s === '---'){ closeLists(); out += '<hr>'; }
      else if(s.indexOf('### ') === 0){ closeLists(); out += '<h3>' + mdInline(s.slice(4)) + '</h3>'; }
      else if(s.indexOf('## ') === 0){ closeLists(); out += '<h2>' + mdInline(s.slice(3)) + '</h2>'; }
      else if(s.indexOf('# ') === 0){ closeLists(); out += '<h1>' + mdInline(s.slice(2)) + '</h1>'; }
      else if(s.indexOf('- ') === 0 || s.indexOf('* ') === 0){ if(inOl){ out += '</ol>'; inOl = false; } if(!inUl){ out += '<ul>'; inUl = true; } out += '<li>' + mdInline(s.slice(2)) + '</li>'; }
      else if(/^\d+\.\s/.test(s)){ if(inUl){ out += '</ul>'; inUl = false; } if(!inOl){ out += '<ol>'; inOl = true; } out += '<li>' + mdInline(s.replace(/^\d+\.\s/, '')) + '</li>'; }
      else if(s.indexOf('> ') === 0){ closeLists(); out += '<blockquote>' + mdInline(s.slice(2)) + '</blockquote>'; }
      else { closeLists(); out += '<p>' + mdInline(s) + '</p>'; }
    }
    closeLists();
    return out || '<p class="muted">（空）</p>';
  }
})();

(function(){
  var w = document.getElementById('weatherBox'), d = document.getElementById('dateBox');
  if(!w || !d) return;
  var manual = false;
  w.addEventListener('input', function(){ manual = true; });
  var ICONS = [["雷阵雨","⛈️"],["雷雨","⛈️"],["冰雹","⛈️"],["暴雪","❄️"],["大雪","❄️"],["小雪","🌨️"],["阵雪","🌨️"],["雪","🌨️"],["冻雨","🌧️"],["暴雨","🌧️"],["大雨","🌧️"],["中雨","🌧️"],["阵雨","🌦️"],["小雨","🌧️"],["毛毛雨","🌦️"],["雨","🌧️"],["雾","🌫️"],["霾","🌫️"],["晴间多云","🌤️"],["多云","⛅"],["阴","☁️"],["晴","☀️"],["云","⛅"]];
  function addIcon(v){
    v = (v || '').trim();
    if(!v) return v;
    if(/[☀-⛿🌀-🙏🚀-🛿🤀-🧿]/u.test(v)) return v;
    for(var i = 0; i < ICONS.length; i++){ if(v.indexOf(ICONS[i][0]) >= 0) return ICONS[i][1] + ' ' + v; }
    return v;
  }
  w.addEventListener('blur', function(){ w.value = addIcon(w.value); });
  var loc = document.getElementById('locBox');
  function refetch(){
    if(manual || !d.value) return;
    var q = '/weather?date=' + encodeURIComponent(d.value);
    if(loc && loc.value) q += '&city=' + encodeURIComponent(loc.value);
    fetch(q).then(function(r){ return r.json(); }).then(function(j){
      if(!manual && j && j.text) w.value = j.text;
    }).catch(function(){});
  }
  d.addEventListener('change', refetch);
  if(loc) loc.addEventListener('change', refetch);
})();
