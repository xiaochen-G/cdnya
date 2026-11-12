(function () {
  var pw = document.querySelector('.pwrap');
  var btn = document.getElementById('webFullBtn');
  if (!pw || !btn) return;
  function cssFull() {
    pw.classList.add('webfull');
    document.body.style.overflow = 'hidden';
    btn.textContent = '退出全屏';
  }
  btn.addEventListener('click', function () {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    if (pw.classList.contains('webfull')) {
      pw.classList.remove('webfull');
      document.body.style.overflow = '';
      btn.textContent = '网页全屏';
      return;
    }
    var used = false;
    if (pw.requestFullscreen) {
      try {
        var pr = pw.requestFullscreen();
        used = true;
        if (pr && pr.catch) pr.catch(function () { cssFull(); });
      } catch (e) { used = false; }
    }
    if (!used) cssFull();
  });
  document.addEventListener('fullscreenchange', function () {
    btn.textContent = document.fullscreenElement ? '退出全屏' : '网页全屏';
  });
})();
(function () {
  var Q = new URLSearchParams(location.search);
  var roomId = Q.get('room');
  if (!roomId) return;
  var video = document.getElementById('player');
  var myVid = Q.get('id'), myS = parseInt(Q.get('s') || '0', 10), myE = parseInt(Q.get('e') || '0', 10);
  var cmts = document.getElementById('cmtsSec');
  if (cmts) cmts.style.display = 'none';
  var flex = document.getElementById('playFlex');
  flex.className = 'playflex room-on';
  var panel = document.getElementById('roomPanel');
  panel.style.display = 'block';
  var dmLayer = document.getElementById('dmLayer');
  dmLayer.style.display = 'block';
  var dmStrip = document.getElementById('dmStrip');
  var dmToggleBtn = document.getElementById('rmDmToggle');
  var dmMode = 'strip';
  try { dmMode = localStorage.getItem('vsdm2') || 'strip'; } catch (e) {}
  if (dmMode !== 'overlay' && dmMode !== 'strip' && dmMode !== 'off') dmMode = 'overlay';
  function applyDmMode() {
    if (dmToggleBtn) dmToggleBtn.textContent = dmMode === 'overlay' ? '弹幕：画面' : (dmMode === 'strip' ? '弹幕：下条' : '弹幕：关');
    if (dmStrip) dmStrip.style.display = dmMode === 'strip' ? 'block' : 'none';
    if (dmMode !== 'overlay') dmLayer.innerHTML = '';
    if (dmMode !== 'strip' && dmStrip) dmStrip.innerHTML = '';
    try { localStorage.setItem('vsdm2', dmMode); } catch (e) {}
  }
  var eps = document.querySelectorAll('.eps a');
  for (var i = 0; i < eps.length; i++) { eps[i].href += '&room=' + encodeURIComponent(roomId); }

  var ws = null, role = 'member', myNick = '', leftFlag = false, retryN = 0, navAway = false;
  var statusEl = document.getElementById('rmStatus');
  var countEl = document.getElementById('rmCount');
  var chatList = document.getElementById('chatList');
  var tokenKey = 'vsrt:' + roomId;
  // Navigating away from the page: close the socket for good (no
  // reconnect dance during unload). The seat itself stays reserved
  // server-side for 10 minutes, so returning via the room link
  // still reattaches.
  window.addEventListener('pagehide', function () {
    navAway = true;
    try { if (ws) ws.close(); } catch (e) {}
  });

  function token() { try { return sessionStorage.getItem(tokenKey) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { sessionStorage.setItem(tokenKey, t); } catch (e) {} }
  var goneBox = document.getElementById('rjGone');
  document.getElementById('rjGoneBtn').href = '/detail?id=' + myVid;
  function showGone() {
    try { sessionStorage.removeItem(tokenKey); } catch (e) {}
    showJoin();
    document.getElementById('rjNick').style.display = 'none';
    document.getElementById('rjPass').style.display = 'none';
    document.getElementById('rjGo').style.display = 'none';
    document.getElementById('rjErr').textContent = '';
    goneBox.style.display = 'block';
  }
  function roomAlive(cb) {
    fetch('/room/status?room=' + encodeURIComponent(roomId)).then(function (r) { return r.json(); }).then(function (st) { cb(!!(st && st.exists)); }).catch(function () { cb(true); });
  }
  function setStatus(txt, on) { statusEl.textContent = txt; statusEl.className = 'rm-status' + (on ? ' on' : ''); }

  function addLine(nick, text, self) {
    var d = document.createElement('div');
    d.className = 'cl-item' + (self ? ' self' : '');
    var b = document.createElement('b'); b.textContent = nick;
    var sp = document.createElement('span'); sp.textContent = text;
    d.appendChild(b); d.appendChild(sp);
    chatList.appendChild(d);
    while (chatList.children.length > 200) chatList.removeChild(chatList.firstChild);
    chatList.scrollTop = chatList.scrollHeight;
  }
  function addSys(text) {
    var d = document.createElement('div');
    d.className = 'cl-sys'; d.textContent = text;
    chatList.appendChild(d);
    chatList.scrollTop = chatList.scrollHeight;
  }

  // ---- danmaku engine ----
  var tracks = [], activeDm = 0;
  function dmTracks() {
    var n = Math.max(3, Math.floor(dmLayer.clientHeight / 40));
    while (tracks.length < n) tracks.push(0);
    return n;
  }
  var stripBusyUntil = 0, activeStrip = 0;
  function spawnStrip(text, self) {
    if (!dmStrip || !dmStrip.clientWidth || activeStrip >= 6) return;
    var now = Date.now();
    if (now < stripBusyUntil) return; // single lane: wait for a gap
    var el = document.createElement('span');
    el.className = 'dm' + (self ? ' dm-self' : '');
    el.textContent = text;
    el.style.fontSize = '14px';
    el.style.top = '7px';
    el.style.left = dmStrip.clientWidth + 'px';
    dmStrip.appendChild(el);
    var w = el.offsetWidth || (text.length * 14);
    var total = dmStrip.clientWidth + w + 30;
    var dur = Math.max(3500, Math.round(total / 0.11));
    stripBusyUntil = now + (w + 60) / (total / dur);
    activeStrip++;
    el.style.transition = 'transform ' + dur + 'ms linear';
    el.style.transform = 'translateX(0px)';
    void el.offsetWidth;
    el.style.transform = 'translateX(-' + total + 'px)';
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); activeStrip--; }, dur + 300);
  }
  function spawnDm(text, self) {
    if (dmMode === 'off') return;
    if (dmMode === 'strip') { spawnStrip(text, self); return; }
    if (activeDm >= 24 || !dmLayer.clientWidth) return;
    var n = dmTracks(), now = Date.now(), ti = -1;
    for (var i = 0; i < n; i++) { if (tracks[i] <= now) { ti = i; break; } }
    if (ti < 0) ti = Math.floor(Math.random() * n);
    var el = document.createElement('span');
    el.className = 'dm' + (self ? ' dm-self' : '');
    el.textContent = text;
    var fs = dmLayer.clientWidth < 560 ? 15 : 19;
    el.style.fontSize = fs + 'px';
    el.style.top = (ti * 40 + 8) + 'px';
    el.style.left = dmLayer.clientWidth + 'px';
    dmLayer.appendChild(el);
    var w = el.offsetWidth || (text.length * fs);
    var total = dmLayer.clientWidth + w + 30;
    var dur = 8000;
    tracks[ti] = now + (w + 50) / (total / dur);
    activeDm++;
    el.style.transition = 'transform ' + dur + 'ms linear';
    el.style.transform = 'translateX(0px)';
    void el.offsetWidth;
    el.style.transform = 'translateX(-' + total + 'px)';
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); activeDm--; }, dur + 300);
  }

  // ---- playback state ----
  var pendingState = null;
  function applyState(st) {
    var ts = (typeof st.s === 'number') ? st.s : myS;
    var te = (typeof st.e === 'number') ? st.e : myE;
    if (ts !== myS || te !== myE) {
      var nk = 'vsnav:' + roomId, tgt = ts + ',' + te;
      try {
        if (sessionStorage.getItem(nk) === tgt) return; // already tried this target; never loop
        sessionStorage.setItem(nk, tgt);
      } catch (e) {}
      location.replace('/play?id=' + myVid + '&s=' + ts + '&e=' + te + '&room=' + encodeURIComponent(roomId));
      return;
    }
    try { sessionStorage.removeItem('vsnav:' + roomId); } catch (e) {}
    if (video.readyState === 0) { pendingState = st; return; }
    if (Math.abs(video.currentTime - st.pos) > 2.5) { try { video.currentTime = st.pos; } catch (e) {} }
    if (st.playing) {
      var p = video.play();
      if (p && p.catch) p.catch(function () {
        var b = document.getElementById('syncPlayBtn');
        b.style.display = 'block';
        b.onclick = function () { video.play(); b.style.display = 'none'; };
      });
    } else { video.pause(); }
  }
  video.addEventListener('loadedmetadata', function () {
    if (pendingState) { var st = pendingState; pendingState = null; applyState(st); }
  });

  function sendSync() {
    if (!ws || ws.readyState !== 1 || role !== 'host') return;
    ws.send(JSON.stringify({ type: 'sync', playing: !video.paused && !video.ended, pos: video.currentTime, s: myS, e: myE }));
  }
  ['play', 'pause', 'seeked'].forEach(function (ev) { video.addEventListener(ev, sendSync); });
  setInterval(sendSync, 5000);
  setInterval(function () { if (ws && ws.readyState === 1) ws.send('{"type":"ping"}'); }, 25000);

  // ---- websocket ----
  function connect() {
    var t = token();
    if (!t) { showJoin(); return; }
    setStatus('连接中…', false);
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/room/ws?room=' + encodeURIComponent(roomId) + '&token=' + encodeURIComponent(t));
    ws.onmessage = function (ev) {
      var m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.type === 'welcome') {
        retryN = 0;
        role = m.role; myNick = m.nick || myNick;
        showMain();
        setStatus('已连接 · 你是' + (role === 'host' ? '房主' : '成员'), true);
        countEl.textContent = (m.count || 1) + ' 人在房里';
        if (m.history && m.history.length) {
          chatList.innerHTML = '';
          for (var hi = 0; hi < m.history.length; hi++) addLine(m.history[hi].nick, m.history[hi].text, m.history[hi].nick === myNick);
          addSys('以上是之前的聊天记录');
        }
        addSys('已进入房间，正在和房主同步进度');
        if (role === 'host') { setTimeout(sendSync, 800); }
        else { applyState(m); }
      } else if (m.type === 'members') {
        countEl.textContent = (m.count || 0) + ' 人在房里' + (m.members ? '：' + m.members.join('、') : '');
      } else if (m.type === 'system') {
        addSys(m.text);
      } else if (m.type === 'chat') {
        var self = (m.nick === myNick);
        addLine(m.nick, m.text, self);
        spawnDm(self ? '我：' + m.text : (m.nick + '：' + m.text), self);
      } else if (m.type === 'sync' || m.type === 'episode') {
        if (role !== 'host') applyState(m);
      } else if (m.type === 'host') {
        if (m.nick === myNick) { role = 'host'; setStatus('已连接 · 你是房主', true); addSys('房主离开了，你已成为新房主'); sendSync(); }
        else addSys(m.nick + ' 成为了房主');
      }
    };
    ws.onclose = function (ev) {
      if (leftFlag || navAway) return;
      if (ev && ev.code === 4000) {
        leftFlag = true;
        setStatus('房间已在另一个页面打开，已停止重连（关掉多余的页面即可）', false);
        return;
      }
      retryN++;
      if (retryN <= 5) { setStatus('连接断开，重连中…', false); setTimeout(connect, 3000); }
      else {
        roomAlive(function (alive) {
          if (!alive) { showGone(); return; }
          try { sessionStorage.removeItem(tokenKey); } catch (e) {}
          showJoin();
          document.getElementById('rjErr').textContent = '连接已断开，重新输入密码即可回到房间';
        });
      }
    };
    ws.onerror = function () { try { ws.close(); } catch (e) {} };
  }

  // ---- join / main panels ----
  var joinBox = document.getElementById('roomJoin');
  var mainBox = document.getElementById('roomMain');
  function showJoin() {
    joinBox.style.display = 'block'; mainBox.style.display = 'none';
    fetch('/room/status?room=' + encodeURIComponent(roomId)).then(function (r) { return r.json(); }).then(function (st) {
      var p = document.getElementById('rjPass');
      if (p) p.style.display = (st && st.exists && st.nopass) ? 'none' : '';
    }).catch(function () {});
  }
  function showMain() { joinBox.style.display = 'none'; mainBox.style.display = 'block'; }
  var jNick = document.getElementById('rjNick');
  try { jNick.value = localStorage.getItem('vsnick') || ''; } catch (e) {}
  document.getElementById('rjGo').onclick = function () {
    var err = document.getElementById('rjErr');
    err.textContent = '';
    myNick = jNick.value;
    var body = new URLSearchParams();
    body.set('room', roomId);
    body.set('nick', myNick);
    body.set('password', document.getElementById('rjPass').value);
    fetch('/room/join', { method: 'POST', body: body }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, j: j }; });
    }).then(function (res) {
      if (!res.ok) { err.textContent = res.j.error || '进入失败'; return; }
      try { localStorage.setItem('vsnick', myNick); } catch (e) {}
      setToken(res.j.token);
      if (String(res.j.video_id) !== String(myVid) || res.j.s !== myS || res.j.e !== myE) {
        location.replace('/play?id=' + res.j.video_id + '&s=' + res.j.s + '&e=' + res.j.e + '&room=' + encodeURIComponent(roomId));
        return;
      }
      connect();
    }).catch(function () { err.textContent = '网络错误，请重试'; });
  };

  // ---- chat send + tools ----
  var input = document.getElementById('chatInput');
  function sendChat() {
    var text = input.value.replace(/^\s+|\s+$/g, '');
    if (!text || !ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify({ type: 'chat', text: text, vpos: video.currentTime }));
    input.value = '';
  }
  document.getElementById('chatSend').onclick = sendChat;
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendChat(); });
  document.getElementById('rmLeave').onclick = function () {
    leftFlag = true;
    try { if (ws && ws.readyState === 1) ws.send('{"type":"leave"}'); } catch (e) {}
    try { ws && ws.close(); } catch (e) {}
    try { sessionStorage.removeItem(tokenKey); } catch (e) {}
    location.href = '/play?id=' + myVid + '&s=' + myS + '&e=' + myE;
  };
  dmToggleBtn.onclick = function () {
    dmMode = dmMode === 'overlay' ? 'strip' : (dmMode === 'strip' ? 'off' : 'overlay');
    applyDmMode();
  };
  applyDmMode();
  document.getElementById('rmCopy').onclick = function () {
    var url = location.href, btn = this;
    function done() { btn.textContent = '已复制 ✓'; setTimeout(function () { btn.textContent = '复制房间链接'; }, 1600); }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(done, function () { fallback(); }); }
    else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { btn.textContent = '复制失败，请长按地址栏复制'; }
      document.body.removeChild(ta);
    }
  };

  roomAlive(function (alive) {
    if (!alive) { showGone(); return; }
    if (token()) { showMain(); connect(); } else { showJoin(); }
  });
})();
(function () {
  var vid = new URLSearchParams(location.search).get('id');
  var btn = document.getElementById('rmCreateBtn');
  var form = document.getElementById('rmForm');
  var nick = document.getElementById('rmNick');
  var pass = document.getElementById('rmPass');
  var err = document.getElementById('rmErr');
  if (!btn || !form || !nick || !pass || !err || !vid) return;
  var modeFree = document.getElementById('rmModeFree');
  var modePass = document.getElementById('rmModePass');
  var passWrap = document.getElementById('rmPassWrap');
  var passMode = false;
  if (modeFree && modePass && passWrap) {
    modeFree.onclick = function () { passMode = false; modeFree.className = 'rm-mode on'; modePass.className = 'rm-mode'; passWrap.style.display = 'none'; };
    modePass.onclick = function () { passMode = true; modePass.className = 'rm-mode on'; modeFree.className = 'rm-mode'; passWrap.style.display = 'block'; try { pass.focus(); } catch (e) {} };
  }
  try { nick.value = localStorage.getItem('vsnick') || ''; } catch (e) {}
  btn.onclick = function () { form.style.display = 'block'; btn.style.display = 'none'; };
  document.getElementById('rmGo').onclick = function () {
    err.textContent = '';
    var body = new URLSearchParams();
    body.set('video_id', vid);
    body.set('nick', nick.value);
    body.set('password', passMode ? pass.value : '');
    fetch('/room/create', { method: 'POST', body: body }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, j: j }; });
    }).then(function (res) {
      if (!res.ok) { err.textContent = res.j.error || '创建失败'; return; }
      try {
        localStorage.setItem('vsnick', nick.value);
        sessionStorage.setItem('vsrt:' + res.j.room, res.j.token);
      } catch (e) {}
      location.href = '/play?id=' + vid + '&s=0&e=0&room=' + res.j.room;
    }).catch(function () { err.textContent = '网络错误，请重试'; });
  };
})();

// ---- leave-page player teardown ----
// After long playback, tapping an in-site link felt stuck: the
// browser had to dismantle a live decoder, an MSE pipeline and
// ongoing segment downloads before it could render the next page.
// Tear the player down the moment a navigation link is tapped
// (and again on pagehide, for back-gesture exits), so leaving is
// instant. Teardown never blocks the navigation itself.
(function () {
  var torn = false;
  function teardown() {
    if (torn) return;
    torn = true;
    if (window.__hlsAp) { try { window.__hlsAp.destroy(); } catch (e) {} window.__hlsAp = null; }
    if (window.__art) { try { window.__art.destroy(); } catch (e) {} window.__art = null; }
    var video = document.getElementById('player');
    if (!video) return;
    try { video.pause(); } catch (e) {}
    try {
      var src = video.currentSrc || video.src || '';
      if (src.indexOf('blob:') === 0 && window.URL && URL.revokeObjectURL) {
        URL.revokeObjectURL(src);
      }
    } catch (e) {}
    try { video.removeAttribute('src'); video.load(); } catch (e) {}
  }
  function findAnchor(el) {
    while (el && el !== document) {
      if (el.tagName === 'A' && el.getAttribute('href')) return el;
      el = el.parentNode;
    }
    return null;
  }
  document.addEventListener('click', function (ev) {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    var a = findAnchor(ev.target);
    if (!a) return;
    if (a.target && a.target !== '_self') return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#') return;
    var origin = location.protocol + '//' + location.host;
    if (href.indexOf('http') === 0 && href.indexOf(origin) !== 0) return;
    teardown();
  }, true);
  window.addEventListener('pagehide', teardown);
})();
