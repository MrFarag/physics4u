/* عرض البرامج التفاعلية عند الطالب (للقراءة فقط) — يُستدعى من student.js عند تغيّر rooms/live/widget */
(function () {
    'use strict';
    let inst = null, name = '', last = 0, cur = null, lastSt = '';
    const PW = 794;
    function place() {
        if (!inst || !cur) return; const box = document.getElementById('slideBox'); if (!box) return;
        const k = (box.clientWidth || PW) / PW, e = inst.el, W = inst.W, sc = cur.sc || 1;
        e.style.left = (((cur.x || 0) + W / 2) * k - W / 2) + 'px'; e.style.top = (((cur.y || 0) + (e.offsetHeight || 272) / 2) * k - (e.offsetHeight || 272) / 2) + 'px';
        e.style.transformOrigin = '50% 50%'; e.style.transform = 'rotate(' + (cur.rot || 0) + 'deg) scale(' + k * sc + ')'; e.style.zIndex = 6;
    }
    function kill() { if (inst) { inst.destroy(); inst = null; name = ''; last = 0; lastSt = ''; } }
    window.MCWidgetStudent = function (v) {
        if (!v || !v.on) { kill(); return; }
        const box = document.getElementById('slideBox'); if (!box || !window.MCPlugins || !MCPlugins[v.name]) return;
        if (!inst || name !== v.name) { kill(); inst = MCPlugins[v.name].mount(box, { editable: false }); name = v.name; if (window.ResizeObserver) new ResizeObserver(place).observe(box); }
        cur = v; place();
        if (v.st) { const j = JSON.stringify(v.st); if (j !== lastSt) { lastSt = j; inst.setState(v.st); } }
        if (v.run && v.run !== last) { last = v.run; inst.run(); }
        if (!v.run) { last = 0; inst.reset(); }
    };
})();
