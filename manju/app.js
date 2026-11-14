function hgLoad(k){try{var s=localStorage.getItem(k);return s?JSON.parse(s):[];}catch(e){return[];}}
function hgSave(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function hgFavs(){return hgLoad('hg_favs');}
function hgFavHas(id){var a=hgFavs();for(var i=0;i<a.length;i++){if(String(a[i].id)===String(id))return true;}return false;}
function hgFavToggle(it){var a=hgFavs(),out=[],found=false;for(var i=0;i<a.length;i++){if(String(a[i].id)===String(it.id)){found=true;}else{out.push(a[i]);}}if(!found){out.unshift(it);}hgSave('hg_favs',out);return !found;}
function hgHistGet(id){var a=hgLoad('hg_hist');for(var i=0;i<a.length;i++){if(String(a[i].id)===String(id))return a[i];}return null;}
function hgHistPut(it){it.t=Date.now();var a=hgLoad('hg_hist'),out=[it];for(var i=0;i<a.length;i++){if(String(a[i].id)!==String(it.id)){out.push(a[i]);}}if(out.length>100){out.length=100;}hgSave('hg_hist',out);}
function hgImg(pic){return pic||'';}
function hgWireFav(b){
  if(!b)return;
  var id=b.getAttribute('data-id');
  function item(){return {id:id,name:b.getAttribute('data-name'),pic:b.getAttribute('data-pic'),remarks:b.getAttribute('data-remarks'),eps:b.getAttribute('data-eps')};}
  function paint(){var f=hgFavHas(id);b.textContent=f?'★ 已收藏':'☆ 收藏';if(f){b.classList.add('on');}else{b.classList.remove('on');}}
  function syncLocal(on){var has=hgFavHas(id);if(on&&!has){hgFavToggle(item());}if(!on&&has){hgFavToggle({id:id});}paint();}
  b.addEventListener('click',function(){
    hgMeP.then(function(me){
      if(me&&me.logged){
        fetch('/api/fav',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:parseInt(id,10)})})
          .then(function(r){return r.json();}).then(function(d){syncLocal(!!d.on);}).catch(function(){hgFavToggle(item());paint();});
      }else{hgFavToggle(item());paint();}
    });
  });
  paint();
  hgMeP.then(function(me){
    if(me&&me.logged){
      fetch('/api/favstate?id='+encodeURIComponent(id)).then(function(r){return r.json();}).then(function(d){syncLocal(!!d.on);}).catch(function(){});
    }
  });
}
// --- user session (pages stay anonymous/cacheable; identity comes from /api/me) ---
var hgMe=null;
var hgMeP=fetch('/api/me').then(function(r){return r.json();}).then(function(m){hgMe=m;hgPaintUser();hgMaybeMerge();return m;}).catch(function(){return {logged:false};});
function hgPaintUser(){
  var box=document.getElementById('userBox');
  if(!box||!hgMe)return;
  box.innerHTML='';
  if(hgMe.logged){
    var s=document.createElement('span');s.textContent='👤 '+hgMe.name;box.appendChild(s);
    var a=document.createElement('a');a.href='/logout';a.textContent='退出';box.appendChild(a);
  }else{
    var l=document.createElement('a');l.href='/login';l.textContent='登录';box.appendChild(l);
    var g=document.createElement('a');g.href='/register';g.textContent='注册';box.appendChild(g);
  }
}
function hgMaybeMerge(){
  if(!hgMe||!hgMe.logged)return;
  var key='hg_merged_'+hgMe.name;
  try{if(localStorage.getItem(key))return;}catch(e){return;}
  var favs=hgFavs(),hist=hgLoad('hg_hist');
  var done=function(){try{localStorage.setItem(key,'1');}catch(e){}};
  if(!favs.length&&!hist.length){done();return;}
  fetch('/api/merge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({favs:favs,hist:hist})}).then(done).catch(function(){});
}
</script>
`

const detailJS = `<script>
(function(){
  hgWireFav(document.getElementById('favBtn'));
  var w=document.getElementById('watchBtn');
  if(w){
    var h=hgHistGet(w.getAttribute('data-id'));
    if(h){w.setAttribute('href','/play?id='+h.id+'&ep='+h.ep);w.textContent='▶ 继续播放 · '+h.epName;}
    hgMeP.then(function(me){
      if(me&&me.logged){
        fetch('/api/hist').then(function(r){return r.json();}).then(function(list){
          for(var i=0;i<(list||[]).length;i++){
            if(String(list[i].id)===String(w.getAttribute('data-id'))){
              w.setAttribute('href','/play?id='+list[i].id+'&ep='+list[i].ep);
              w.textContent='▶ 继续播放 · '+(list[i].epName||'');
              break;
            }
          }
        }).catch(function(){});
      }
    });
  }
})();
</script>
`

const playJS = `<script>
(function(){
  var v=document.getElementById('v');
  if(v){
    hgHistPut({id:v.getAttribute('data-vid'),name:v.getAttribute('data-name'),pic:v.getAttribute('data-pic'),ep:parseInt(v.getAttribute('data-ep'),10)||0,epName:v.getAttribute('data-epname')});
    hgMeP.then(function(me){
      if(me&&me.logged){
        fetch('/api/hist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:parseInt(v.getAttribute('data-vid'),10),ep:parseInt(v.getAttribute('data-ep'),10)||0})}).catch(function(){});
      }
    });
  }
  hgWireFav(document.getElementById('favBtn'));
})();
</script>
`

const favJS = `<script>
(function(){
  var root=document.getElementById('favRoot'),mode=root.getAttribute('data-mode');
  function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
  function render(a){
    root.innerHTML='';
    if(mode==='fav'){
      if(!a.length){root.appendChild(el('div','empty','暂无收藏，去首页逛逛吧'));return;}
      var g=el('div','grid');
      a.forEach(function(it){
        var card=el('a','card');card.href='/detail?id='+it.id;
        var p=el('div','poster');
        var img=document.createElement('img');img.loading='lazy';img.src=hgImg(it.pic);img.alt=it.name||'';
        p.appendChild(img);
        if(it.remarks){p.appendChild(el('div','badge',it.remarks));}
        card.appendChild(p);
        card.appendChild(el('h3',null,it.name||''));
        card.appendChild(el('div','sub','共 '+(it.eps||0)+' 集'));
        g.appendChild(card);
      });
      root.appendChild(g);
    }else{
      if(!a.length){root.appendChild(el('div','empty','暂无观看历史'));return;}
      a.forEach(function(it){
        var row=el('div','hrow');
        var img=document.createElement('img');img.loading='lazy';img.src=hgImg(it.pic);img.alt=it.name||'';
        row.appendChild(img);
        var hi=el('div','hi');
        hi.appendChild(el('h3',null,it.name||''));
        var when='';
        if(it.t){var d=new Date(it.t);when=' · '+(d.getMonth()+1)+'月'+d.getDate()+'日 '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);}
        hi.appendChild(el('div','hs','看到 '+(it.epName||'')+when));
        row.appendChild(hi);
        var go=el('a','go','继续播放');go.href='/play?id='+it.id+'&ep='+(it.ep||0);
        row.appendChild(go);
        root.appendChild(row);
      });
    }
  }
  function localData(){return mode==='fav'?hgFavs():hgLoad('hg_hist');}
  var serverMode=false;
  hgMeP.then(function(me){
    if(me&&me.logged){
      serverMode=true;
      fetch(mode==='fav'?'/api/favs':'/api/hist').then(function(r){return r.json();})
        .then(function(a){render(a||[]);}).catch(function(){render(localData());});
    }else{
      render(localData());
    }
  });
  var cb=document.getElementById('clearBtn');
  if(cb){cb.addEventListener('click',function(){
    hgSave('hg_hist',[]);
    if(serverMode){fetch('/api/histclear',{method:'POST'}).then(function(){render([]);}).catch(function(){render([]);});}
    else{render([]);}
  });}
})();
</script>
`

const favHTML = pageHead + `
<div class="toprow"><div class="meta-line">{{.Heading}}</div>{{if eq .Mode "hist"}}<button class="clearbtn" id="clearBtn">清空历史</button>{{end}}</div>
<div id="favRoot" data-mode="{{.Mode}}"></div>
` + hgScript + favJS + pageFoot

const indexHTML = pageHead + `
{{if .Q}}<div class="meta-line">搜索「{{.Q}}」共 {{.Total}} 部</div>{{else}}<div class="meta-line">最新更新 · 共 {{.Total}} 部 AI 短剧</div>{{end}}
{{if .Videos}}
<div class="grid">
{{range .Videos}}
<a class="card" href="/detail?id={{.ID}}">
  <div class="poster"><img loading="lazy" src="{{.Pic}}" alt="{{.Name}}">{{if .Remarks}}<div class="badge">{{.Remarks}}</div>{{end}}</div>
  <h3>{{.Name}}</h3>
  <div class="sub">共 {{.EpCount}} 集{{if .Year}} · {{.Year}}{{end}}</div>
</a>
{{end}}
</div>
{{template "pager" .}}
{{else}}
<div class="empty">暂无内容</div>
{{end}}
` + hgScript + pageFoot + `
{{define "pager"}}{{if gt .Pages 1}}<div class="pager">
{{if gt .Page 1}}<a href="{{.Base}}pg={{sub .Page 1}}">上一页</a>{{end}}
<span class="cur">{{.Page}} / {{.Pages}}</span>
{{if lt .Page .Pages}}<a href="{{.Base}}pg={{add .Page 1}}">下一页</a>{{end}}
</div>{{end}}{{end}}`

const detailHTML = pageHead + `
<div class="dwrap">
  <div class="dposter"><img src="{{.Video.Pic}}" alt="{{.Video.Name}}"></div>
  <div class="dinfo">
    <h1>{{.Video.Name}}</h1>
    <div class="tags">
      {{if .Video.Remarks}}<div>状态：<b>{{.Video.Remarks}}</b></div>{{end}}
      <div>集数：<b>共 {{.Video.EpCount}} 集</b>{{if .Video.Year}} · 年份：<b>{{.Video.Year}}</b>{{end}}{{if .Video.Area}} · 地区：<b>{{.Video.Area}}</b>{{end}}</div>
    </div>
    {{if .Video.Content}}<p class="desc">{{.Video.Content}}</p>{{end}}
    {{if .Video.Episodes}}<a class="watch" id="watchBtn" data-id="{{.Video.ID}}" href="/play?id={{.Video.ID}}&ep=0">▶ 开始播放</a>{{end}}<button id="favBtn" class="favbtn" data-id="{{.Video.ID}}" data-name="{{.Video.Name}}" data-pic="{{.Video.Pic}}" data-remarks="{{.Video.Remarks}}" data-eps="{{.Video.EpCount}}">☆ 收藏</button>
  </div>
</div>
<h2 class="sec">选集</h2>
<div class="eps">
{{range $i, $e := .Video.Episodes}}<a href="/play?id={{$.Video.ID}}&ep={{$i}}">{{$e.N}}</a>{{end}}
</div>
` + hgScript + detailJS + pageFoot

const playHTML = pageHead + `
<div class="ptitle">{{.Video.Name}} <span>{{.EpName}}</span></div>
<div class="vbox"><video id="v" controls playsinline webkit-playsinline x5-video-player-type="h5" preload="auto" data-src="{{.EpURL}}" data-next="{{.NextURL}}" data-vid="{{.Video.ID}}" data-name="{{.Video.Name}}" data-pic="{{.Video.Pic}}" data-ep="{{.EpIdx}}" data-epname="{{.EpName}}" poster="{{.Video.Pic}}"></video></div>
<div class="pnav">
{{if .PrevURL}}<a href="{{.PrevURL}}">← 上一集</a>{{else}}<a class="off">← 上一集</a>{{end}}
<button id="favBtn" data-id="{{.Video.ID}}" data-name="{{.Video.Name}}" data-pic="{{.Video.Pic}}" data-remarks="{{.Video.Remarks}}" data-eps="{{.Video.EpCount}}">☆ 收藏</button>
<a href="/detail?id={{.Video.ID}}">选集</a>
{{if .NextURL}}<a href="{{.NextURL}}">下一集 →</a>{{else}}<a class="off">下一集 →</a>{{end}}
</div>
<h2 class="sec">选集</h2>
<div class="eps">
{{range $i, $e := .Video.Episodes}}<a href="/play?id={{$.Video.ID}}&ep={{$i}}"{{if eq $i $.EpIdx}} class="on"{{end}}>{{$e.N}}</a>{{end}}
</div>
` + hgScript + playJS + `<script src="https://cdn.jsdmirror.cn/npm/hls.js@1/dist/hls.min.js"></script>
<script>
(function(){
  var v=document.getElementById('v'),src=v.getAttribute('data-src'),next=v.getAttribute('data-next');
  if(window.Hls&&Hls.isSupported()){
    var h=new Hls({maxBufferLength:30});
    h.loadSource(src);h.attachMedia(v);
    h.on(Hls.Events.MANIFEST_PARSED,function(){v.play().catch(function(){});});
  }else if(v.canPlayType('application/vnd.apple.mpegurl')){
    v.src=src;v.play().catch(function(){});
  }else{
    v.src=src;
  }
  v.addEventListener('ended',function(){if(next){location.href=next;}});
})();
