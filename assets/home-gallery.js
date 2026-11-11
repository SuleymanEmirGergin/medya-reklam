// Moved out of index.html so the CSP can forbid inline scripts.
  /* Ana sayfa "Tamamladigimiz isler" bolumunu admin/Supabase galerisinden doldur.
 Boylece admin panelde yapilan degisiklikler burada da gorunur.
 Supabase yoksa/erisilemezse HTML'deki statik kartlar yedek kalir. */
  (function () {
'use strict';
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
var HREF = { isikli:'urun-isikli-kutu-harf.html', arac:'urun-arac-giydirme.html', cephe:'urun-cephe.html', baski:'urun-lightbox.html' };
function renderFeatured(items){
  var g = document.getElementById('featGrid');
  if(!g || !items || !items.length) return;
  g.innerHTML = items.map(function(it, i){
    var href = HREF[it.category] || 'portfoy.html';
    var num = ('0' + (i + 1)).slice(-2);
    var img = it.image || '';
    var pic = /\.jpe?g$/i.test(img)
      ? '<picture><source srcset="' + esc(img.replace(/\.jpe?g$/i, '.webp')) + '" type="image/webp" /><img src="' + esc(img) + '" alt="' + esc(it.title) + '" loading="lazy" /></picture>'
      : '<img src="' + esc(img) + '" alt="' + esc(it.title) + '" loading="lazy" />';
    return '<a class="featcard reveal in" href="' + href + '">' +
      '<div class="featcard__img">' + pic + '</div>' +
      '<div class="featcard__body">' +
        '<h3>' + esc(it.title) + '</h3>' +
        '<p>' + esc(it.subtitle || '') + '</p>' +
        '<div class="featcard__meta">' +
          '<div class="featcard__num">' + num + '</div>' +
          '<div class="featcard__details">Detaylar <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></div>' +
        '</div>' +
      '</div>' +
    '</a>';
  }).join('');
}
function renderStatsBand(stats){
  var g=document.getElementById('statsBand'); if(!g||!stats||!stats.length) return;
  g.innerHTML = stats.map(function(s){
    var raw=String(s.number==null?'':s.number), digits=raw.replace(/[^0-9]/g,'');
    var num=(digits && /^[0-9][0-9.\s]*$/.test(raw.trim()))
      ? '<span class="scroll-counter stats-reveal-text" data-target="'+digits+'">'+esc(raw)+'</span>'
      : '<span class="stats-reveal-text">'+esc(raw)+'</span>';
    return '<div><div class="n">'+num+(s.em?'<em class="stats-reveal-text">'+esc(s.em)+'</em>':'')+'</div><div class="l stats-reveal-text">'+esc(s.label||'')+'</div></div>';
  }).join('');
}
function renderHome(h){
  if(!h) return;
  try {
    Array.prototype.forEach.call(document.querySelectorAll('[data-cms], [data-cms-link]'), function(el){
      var key = el.getAttribute('data-cms');
      if(key && h[key] != null && h[key] !== '') el.textContent = h[key];
      var lk = el.getAttribute('data-cms-link');
      if(lk && h[lk]) el.setAttribute('href', h[lk]);
    });
    if(Array.isArray(h.marquee) && h.marquee.length){
      var track = document.getElementById('ledTrack');
      if(track){
        var logo = 'assets/img/mr-logo-spinner.png?v=2';
        var one = h.marquee.map(function(p){
          return '<img class="ledmarquee__logo" src="'+logo+'" alt="" /><span class="ledmarquee__item">'+esc(p)+'</span>';
        }).join('');
        track.innerHTML = one + one;
      }
    }
  } catch(e){}
}
function boot(){
  if(!window.Store || !Store.getContent) return; /* statik yedek kalir */
  Store.getContent().then(function(c){
    if(c && c.home) renderHome(c.home);
    if(c && c.stats) renderStatsBand(c.stats);
    if(c && c.gallery && c.gallery.length) renderFeatured(c.gallery);
  }).catch(function(){});
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
  })();
