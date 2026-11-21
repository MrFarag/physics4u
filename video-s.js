/* عرض الفيديو القصير عند الطالب: بلا أزرار، متزامن مع المدرس */
(function () {
    'use strict';
    const PW = 794; let box = null, vid = null, cur = null, dataId = '', src = null, off = 0;
    try { firebase.database().ref('.info/serverTimeOffset').on('value', s => { off = s.val() || 0; }); } catch (e) { }
    function place() { if (!box || !cur) return; const sb = document.getElementById('slideBox'); if (!sb) return; const k = (sb.clientWidth || PW) / PW; box.style.left = (cur.x || 0) * k + 'px'; box.style.top = (cur.y || 0) * k + 'px'; box.style.width = (cur.w || 400) * k + 'px'; }
    function kill() { if (box) box.remove(); box = vid = null; }
    function ensure() {
        if (box || !src) return; const sb = document.getElementById('slideBox'); if (!sb) return;
        box = document.createElement('div'); box.style.cssText = 'position:absolute;z-index:6;pointer-events:none;background:transparent';
        vid = document.createElement('video'); vid.src = src; vid.playsInline = true; vid.style.cssText = 'display:block;width:100%;height:auto;background:transparent;pointer-events:none';
        box.appendChild(vid); sb.appendChild(box); if (window.ResizeObserver) new ResizeObserver(place).observe(sb);
    }
    function apply() {
        if (!cur || !cur.on || !src || dataId !== cur.id) { if (!cur || !cur.on) kill(); return; }
        ensure(); if (!vid) return; place();
        vid.loop = !!cur.loop; vid.muted = !!cur.muted;
        const tgt = (cur.t || 0) + (cur.playing ? Math.max(0, (Date.now() + off - (cur.ts || 0)) / 1000) : 0);
        if (isFinite(tgt) && vid.readyState > 0 && Math.abs(vid.currentTime - tgt) > 0.6) { try { vid.currentTime = Math.min(tgt, vid.duration || tgt); } catch (e) { } }
        if (cur.playing) { if (vid.paused) { const p = vid.play(); if (p && p.catch) p.catch(() => { vid.muted = true; vid.play().catch(() => { }); }); } } else if (!vid.paused) vid.pause();
    }
    window.MCVideoState = v => { cur = v; if (!v || !v.on) { kill(); return; } apply(); };
    window.MCVideoData = d => { if (!d || !d.data) { src = null; dataId = ''; kill(); return; } if (d.id === dataId) return; dataId = d.id; src = d.data; kill(); apply(); };
})();
