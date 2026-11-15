(function () {
  var video = document.getElementById('player');
  if (!video) return;
  var url = video.getAttribute('data-src');
  if (!url) return;
  if (/\.m3u8($|\?)/i.test(url) && window.Hls && Hls.isSupported()) {
    var hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(video);
  } else {
    video.src = url;
  }
})();
