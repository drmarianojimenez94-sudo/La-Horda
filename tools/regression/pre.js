(function(){
  var q = new URLSearchParams(location.search);
  var DET = q.get('det') === '1';
  window.__DET = DET;
  window.__perfNow = performance.now.bind(performance); // real clock, even in deterministic mode
  var seed = (+(q.get('seed') || 12345)) >>> 0;
  function mulberry32(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  window.__rng = { reseed: function(s){ seed = s >>> 0; }, calls: 0 };
  if (DET || q.get('seed')) { Math.random = function(){ window.__rng.calls++; return mulberry32(); }; }
  window.__errors = [];
  window.addEventListener('error', function(e){
    var t = e.target;
    if (t && t !== window && (t.src || t.href)) window.__errors.push('resource: ' + (t.src || t.href));
    else window.__errors.push('error: ' + (e.message || e.type) + ' @' + (e.filename || '') + ':' + (e.lineno || ''));
  }, true);
  window.addEventListener('unhandledrejection', function(e){ window.__errors.push('rejection: ' + String(e.reason)); });
  var origConsoleError = console.error;
  console.error = function(){ try { window.__errors.push('console.error: ' + Array.prototype.map.call(arguments, String).join(' ')); } catch(_){} return origConsoleError.apply(console, arguments); };
  // image tracking (same wrapper in every build under test)
  var NativeImage = window.Image, imgs = [];
  function TrackedImage(w, h){ var im = (w === undefined ? new NativeImage() : new NativeImage(w, h)); imgs.push(im); return im; }
  TrackedImage.prototype = NativeImage.prototype;
  window.Image = TrackedImage;
  window.__imgs = imgs;
  window.__imgState = function(){
    var done = 0, broken = [];
    for (var i = 0; i < imgs.length; i++) { var im = imgs[i]; if (im.complete) { done++; if (!im.naturalWidth && im.getAttribute('src')) broken.push(String(im.getAttribute('src')).slice(0, 80)); } }
    return { total: imgs.length, done: done, broken: broken };
  };
  if (DET) {
    var vt = 0, raf = [], rafId = 1, timers = [], tid = 1;
    performance.now = function(){ return vt; };
    Date.now = function(){ return 1700000000000 + Math.floor(vt); };
    window.requestAnimationFrame = function(cb){ var id = rafId++; raf.push({ id: id, cb: cb }); return id; };
    window.cancelAnimationFrame = function(id){ for (var i = 0; i < raf.length; i++) if (raf[i].id === id) { raf.splice(i, 1); return; } };
    window.setTimeout = function(cb, ms){ var args = Array.prototype.slice.call(arguments, 2); var id = tid++; timers.push({ id: id, due: vt + Math.max(0, +ms || 0), cb: cb, args: args }); return id; };
    window.clearTimeout = function(id){ for (var i = 0; i < timers.length; i++) if (timers[i].id === id) { timers.splice(i, 1); return; } };
    window.__step = function(n, dt){
      dt = dt || (1000 / 60);
      for (var k = 0; k < n; k++) {
        vt += dt;
        for (;;) {
          var best = -1;
          for (var i = 0; i < timers.length; i++) if (timers[i].due <= vt && (best < 0 || timers[i].due < timers[best].due || (timers[i].due === timers[best].due && timers[i].id < timers[best].id))) best = i;
          if (best < 0) break;
          var t = timers.splice(best, 1)[0];
          try { if (typeof t.cb === 'function') t.cb.apply(null, t.args); } catch (e) { window.__errors.push('timer: ' + e); }
        }
        var qq = raf.splice(0);
        for (var j = 0; j < qq.length; j++) { try { qq[j].cb(vt); } catch (e) { window.__errors.push('raf: ' + e); } }
      }
      return vt;
    };
    window.__vt = function(){ return vt; };
  }
})();
