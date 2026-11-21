/* برنامج المقذوفات — وحدة JS واحدة (HTML + CSS + منطق) تعمل عند المدرس والطالب
   window.MCPlugins.projectile.mount(host, {editable, onChange, onScale, onDragStart})
   الحالة: {th,v0,y0,g, gh:[مسارات سابقة], add:0/1, ans:0/1, pt:{x,y,t}} */
(function () {
    'use strict';
    window.MCPlugins = window.MCPlugins || {};
    const W = 390, PH = 200, H = 360;
    const CSS = `
.pj{position:absolute;left:0;top:0;width:${W}px;height:272px;transform-origin:0 0;pointer-events:none;font-family:'Segoe UI',Tahoma,sans-serif;color:#e2e8f0;direction:ltr;user-select:none;border:1.5px dashed rgba(253,230,138,.55);border-radius:10px}
.pj *{box-sizing:border-box}
.pj .pj-edge{position:absolute;pointer-events:auto;cursor:move;z-index:2}
.pj.ro .pj-edge,.pj.ro .pj-h,.pj.ro .pj-rot{display:none}
.pj .pj-h{position:absolute;width:10px;height:10px;background:#fde68a;border:1px solid #92400e;border-radius:2px;pointer-events:auto;z-index:3}
.pj .pj-h[data-c=nw]{left:-6px;top:-6px;cursor:nwse-resize}.pj .pj-h[data-c=se]{right:-6px;bottom:-6px;cursor:nwse-resize}
.pj .pj-h[data-c=ne]{right:-6px;top:-6px;cursor:nesw-resize}.pj .pj-h[data-c=sw]{left:-6px;bottom:-6px;cursor:nesw-resize}
.pj .pj-rot{position:absolute;left:50%;top:-26px;margin-left:-6px;width:12px;height:12px;border-radius:50%;background:#38bdf8;border:1px solid #0c4a6e;pointer-events:auto;cursor:grab;z-index:3}
.pj .pj-rot:before{content:'';position:absolute;left:50%;top:12px;width:1px;height:14px;background:#38bdf8}
.pj .pj-e1{left:-6px;right:-6px;top:-6px;height:12px}.pj .pj-e2{left:-6px;right:-6px;bottom:-6px;height:12px}
.pj .pj-e3{top:-6px;bottom:-6px;left:-6px;width:12px}.pj .pj-e4{top:-6px;bottom:-6px;right:-6px;width:12px}
.pj .pj-low{position:absolute;left:0;right:0;top:${PH + 4}px;pointer-events:auto;padding:0 6px;cursor:move}
.pj.ro .pj-low{pointer-events:none;cursor:default}
.pj .pj-row{display:flex;gap:6px;align-items:center;margin-bottom:5px;flex-wrap:nowrap}
.pj label{display:flex;align-items:center;gap:3px;font-size:13px;font-style:italic;color:#fde68a;cursor:default}
.pj label span{font-size:10px;font-style:normal;color:#94a3b8}
.pj input[type=text]{width:50px;height:22px;background:rgba(15,23,42,.35);border:1px solid rgba(253,230,138,.5);border-radius:5px;color:#fff;text-align:center;font-size:12px;outline:none;cursor:text}
.pj input[type=text]:focus{border-color:#f97316}
.pj .out input{border-color:rgba(134,239,172,.6);color:#86efac}
.pj .out label{color:#86efac}
.pj .pt input{border-color:rgba(56,189,248,.6);color:#7dd3fc}.pj .pt label{color:#7dd3fc}
.pj.ro input{pointer-events:none}
.pj button{height:22px;padding:0 10px;border:1px solid #c2410c;border-radius:6px;background:linear-gradient(180deg,#9a3412,#431407);color:#fde68a;font-size:12px;cursor:pointer}
.pj button.on{background:linear-gradient(180deg,#15803d,#052e16);border-color:#16a34a;color:#bbf7d0}
.pj .addl{color:#fde68a;font-style:normal;font-size:12px;cursor:pointer}
.pj .addl input{width:14px;height:14px;margin:0;cursor:pointer}
.pj.ro .teach{display:none}
.pj .ansbox{display:none}.pj.showans .ansbox{display:block}.pj.showans{height:340px}
.pj canvas{position:absolute;left:0;top:0;width:${W}px;height:${PH}px;pointer-events:auto}.pj.ro canvas{pointer-events:none}
`;
    function injectCss() { if (document.getElementById('pjCss')) return; const s = document.createElement('style'); s.id = 'pjCss'; s.textContent = CSS; document.head.appendChild(s); }
    const K = ['th', 'v0', 'y0', 'g'], DEF = { th: 45, v0: 20, y0: 0, g: 9.8 };
    const COLS = ['#fde047', '#38bdf8', '#f472b6', '#a3e635', '#fb923c'];
    function calc(p) {
        const th = p.th * Math.PI / 180, vx = p.v0 * Math.cos(th), vy = p.v0 * Math.sin(th), g = Math.max(0.01, p.g), y0 = Math.max(0, p.y0);
        const T = (vy + Math.sqrt(vy * vy + 2 * g * y0)) / g, R = vx * T, Hm = y0 + (vy > 0 ? vy * vy / (2 * g) : 0);
        return { vx, vy, g, y0, T, R, Hm };
    }
    const fx = v => (isFinite(v) ? String(+v.toFixed(2)) : '—');
    function mount(host, opts) {
        injectCss(); opts = opts || {};
        const ed = !!opts.editable;
        const el = document.createElement('div'); el.className = 'pj' + (ed ? '' : ' ro');
        const inp = (k, sym, u, ro) => '<label>' + sym + '<input type="text" data-k="' + k + '"' + (ro ? ' readonly' : '') + '><span>' + u + '</span></label>';
        el.innerHTML = '<i class="pj-h pj-hn" data-c="nw"></i><i class="pj-h pj-hn" data-c="ne"></i><i class="pj-h pj-hs" data-c="sw"></i><i class="pj-h pj-hs" data-c="se"></i><i class="pj-rot"></i><i class="pj-edge pj-e1"></i><i class="pj-edge pj-e2"></i><i class="pj-edge pj-e3"></i><i class="pj-edge pj-e4"></i><canvas></canvas>' +
            '<div class="pj-low">' +
            '<div class="pj-row teach"><button data-a="run">تشغيل ▶</button><button data-a="reset">إعادة ↺</button><button data-a="ans">الإجابات</button><label class="addl"><input type="checkbox" data-a="add"> Add</label></div>' +
            '<div class="pj-row">' + inp('th', 'θ', '°') + inp('v0', 'v₀', 'm/s') + inp('y0', 'y₀', 'm') + inp('g', 'g', 'm/s²') + '</div>' +
            '<div class="ansbox"><div class="pj-row out">' + inp('T', 'T', 's', 1) + inp('R', 'R', 'm', 1) + inp('H', 'H', 'm', 1) + '</div>' +
            '<div class="pj-row pt">' + inp('x', 'x', 'm') + inp('y', 'y', 'm') + inp('t', 't', 's') + '</div></div></div>';
        host.appendChild(el);
        const cv = el.querySelector('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = W * dpr; cv.height = PH * dpr;
        const cx = cv.getContext('2d');
        const st = Object.assign({ gh: [], add: 0, ans: 0, pt: null, lr: null }, DEF);
        const inputs = {}; el.querySelectorAll('input[type=text]').forEach(i => { inputs[i.dataset.k] = i; });
        const addCb = el.querySelector('[data-a=add]'), ansBtn = el.querySelector('[data-a=ans]');
        let raf = 0, t0 = 0, simT = null, arrow = null;
        const par = () => ({ th: st.th, v0: st.v0, y0: st.y0, g: st.g });
        function paintInputs() {
            K.forEach(k => { if (document.activeElement !== inputs[k]) inputs[k].value = st[k]; });
            const c = calc(st); inputs.T.value = fx(c.T); inputs.R.value = fx(c.R); inputs.H.value = fx(c.Hm);
            ['x', 'y', 't'].forEach(k => { if (document.activeElement !== inputs[k]) inputs[k].value = st.pt && st.pt[k] !== undefined && st.pt[k] !== null ? st.pt[k] : ''; });
            el.classList.toggle('showans', !!st.ans); if (ansBtn) ansBtn.classList.toggle('on', !!st.ans);
            if (addCb) addCb.checked = !!st.add;
        }
        function draw() {
            const c = calc(st), L = 34, B = 18, Tp = 8, Rt = 10; let gh = (st.gh || []).filter(Boolean);
            const r = st.lr ? calc(st.lr) : null;      /* المسار المنقط للتشغيل الأخير فقط، لا يتغير لحظيًا */
            const all = [c].concat(r ? [r] : [], gh.map(calc));
            cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, PH);
            const xr = Math.max(1, ...all.map(a => Math.abs(a.R))), yr = Math.max(1, ...all.map(a => a.Hm));
            const s = Math.min((W - L - Rt) / xr, (PH - B - Tp) / yr);
            const X = x => L + x * s, Y = y => PH - B - y * s;
            cx.lineWidth = 1.5; cx.strokeStyle = 'rgba(226,232,240,.8)'; cx.fillStyle = '#e2e8f0'; cx.font = 'italic 12px Segoe UI';
            cx.beginPath(); cx.moveTo(L, Tp - 2); cx.lineTo(L, PH - B); cx.lineTo(W - 4, PH - B); cx.stroke();
            cx.fillText('y', L - 12, Tp + 6); cx.fillText('x', W - 12, PH - B + 14);
            const N = 80;
            const path = (a, col, dash, upTo) => {
                cx.setLineDash(dash ? [5, 4] : []); cx.strokeStyle = col; cx.lineWidth = dash ? 1.6 : 2.5; cx.beginPath();
                const n = upTo === undefined ? N : Math.max(2, Math.round(N * upTo / a.T)), tm = upTo === undefined ? a.T : upTo;
                for (let i = 0; i <= n; i++) { const t = tm * i / n, x = a.vx * t, y = Math.max(0, a.y0 + a.vy * t - .5 * a.g * t * t); i ? cx.lineTo(X(x), Y(y)) : cx.moveTo(X(x), Y(y)); }
                cx.stroke(); cx.setLineDash([]);
            };
            gh.forEach((p, i) => path(calc(p), COLS[(i + 1) % COLS.length], false));
            if (r) { path(r, COLS[0], true); if (simT !== null) path(r, COLS[0], false, simT); }
            const bc = (r && simT !== null) ? r : c, t = (r && simT !== null) ? simT : 0, bx = bc.vx * t, by = Math.max(0, bc.y0 + bc.vy * t - .5 * bc.g * t * t);
            cx.fillStyle = '#fb923c'; cx.strokeStyle = '#fff'; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(X(bx), Y(by), 6, 0, 7); cx.fill(); cx.stroke();
            const ax = X(0), ay = Y(c.y0), th = st.th * Math.PI / 180, len = 54;
            cx.strokeStyle = '#38bdf8'; cx.fillStyle = '#38bdf8'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(ax, ay); const ex = ax + len * Math.cos(th), ey = ay - len * Math.sin(th); cx.lineTo(ex, ey); cx.stroke();
            cx.beginPath(); cx.moveTo(ex, ey); cx.lineTo(ex - 7 * Math.cos(th - .45), ey + 7 * Math.sin(th - .45)); cx.lineTo(ex - 7 * Math.cos(th + .45), ey + 7 * Math.sin(th + .45)); cx.fill();
            arrow = { ax, ay, ex, ey }; cx.save(); cx.strokeStyle = '#fff'; cx.lineWidth = 1.2; cx.beginPath(); cx.arc(ex, ey, 5.5, 0, 7); cx.stroke(); cx.restore();
            cx.font = 'italic 12px Segoe UI'; cx.fillText('v₀', ex + 8, ey - 4);
            cx.lineWidth = 1; cx.beginPath(); cx.arc(ax, ay, 18, -th, 0); cx.stroke(); cx.fillText('θ', ax + 22, ay - 4);
            if (c.y0 > 0) { cx.fillStyle = '#e2e8f0'; cx.fillText('y₀', L + 4, (ay + PH - B) / 2); }
            if (st.ans && st.pt && isFinite(st.pt.x) && isFinite(st.pt.y) && st.pt.x !== null && st.pt.y !== null) {
                const px = X(+st.pt.x), py = Y(+st.pt.y);
                cx.strokeStyle = '#7dd3fc'; cx.lineWidth = 1; cx.setLineDash([3, 3]); cx.beginPath(); cx.moveTo(px, py); cx.lineTo(px, PH - B); cx.moveTo(px, py); cx.lineTo(L, py); cx.stroke(); cx.setLineDash([]);
                cx.fillStyle = '#7dd3fc'; cx.beginPath(); cx.arc(px, py, 4.5, 0, 7); cx.fill();
            }
        }
        function stop() { cancelAnimationFrame(raf); raf = 0; }
        function refresh() { paintInputs(); draw(); }
        function reset() { stop(); simT = null; refresh(); }
        function run() {
            stop(); const c = calc(st); const dur = Math.min(8, Math.max(2, c.T)) * 1000; t0 = performance.now();
            const loop = now => { const f = Math.min(1, (now - t0) / dur); simT = c.T * f; draw(); if (f < 1) raf = requestAnimationFrame(loop); else raf = 0; };
            raf = requestAnimationFrame(loop);
        }
        const emit = (runTs) => opts.onChange && opts.onChange({ st: JSON.parse(JSON.stringify(st)), run: runTs || 0 });
        function readParams() { K.forEach(k => { const v = parseFloat(inputs[k].value); st[k] = isFinite(v) ? v : DEF[k]; }); }
        /* x,y,t : أدخل أحدها واستنتج الباقي */
        function deduce(src) {
            const c = calc(st), v = parseFloat(inputs[src].value);
            if (!isFinite(v)) { st.pt = null; refresh(); return; }
            let t = NaN;
            if (src === 't') t = v;
            else if (src === 'x') t = c.vx ? v / c.vx : NaN;
            else { const d = c.vy * c.vy - 2 * c.g * (v - c.y0); if (d >= 0) { const r1 = (c.vy - Math.sqrt(d)) / c.g, r2 = (c.vy + Math.sqrt(d)) / c.g; t = r1 >= 0 ? r1 : r2; } }
            if (!isFinite(t) || t < 0 || t > c.T + 1e-9) { st.pt = { x: null, y: null, t: null }; ['x', 'y', 't'].forEach(k => { if (k !== src) inputs[k].value = '—'; }); draw(); emit(); return; }
            const x = c.vx * t, y = c.y0 + c.vy * t - .5 * c.g * t * t, o = { x: +x.toFixed(2), y: +Math.max(0, y).toFixed(2), t: +t.toFixed(2) };
            o[src] = v; st.pt = o; ['x', 'y', 't'].forEach(k => { if (k !== src) inputs[k].value = o[k]; }); draw(); emit();
        }
        if (ed) {
            ['mousedown', 'pointerdown', 'touchstart', 'click', 'dblclick'].forEach(ev => el.addEventListener(ev, e => e.stopPropagation()));
            el.querySelectorAll('.pj-h').forEach(h => h.addEventListener('mousedown', e => { e.preventDefault(); opts.onResizeStart && opts.onResizeStart(e); }));
            el.querySelector('.pj-rot').addEventListener('mousedown', e => { e.preventDefault(); opts.onRotateStart && opts.onRotateStart(e); });
            let tmr = 0, rotD = false;
            const nearTip = (x, y) => arrow && Math.hypot(x - arrow.ex, y - arrow.ey) < 14;
            cv.addEventListener('pointerdown', e => { if (!nearTip(e.offsetX, e.offsetY)) return; e.preventDefault(); e.stopPropagation(); cv.setPointerCapture(e.pointerId); rotD = true; });
            cv.addEventListener('pointermove', e => {
                if (!rotD) { cv.style.cursor = nearTip(e.offsetX, e.offsetY) ? 'grab' : ''; return; }
                if (!arrow) return; let a = Math.atan2(arrow.ay - e.offsetY, e.offsetX - arrow.ax) * 180 / Math.PI; a = Math.max(0, Math.min(90, Math.round(a)));
                st.th = a; st.pt = null; paintInputs(); draw(); clearTimeout(tmr); tmr = setTimeout(() => emit(), 120);
            });
            const rotEnd = () => { rotD = false; }; cv.addEventListener('pointerup', rotEnd); cv.addEventListener('pointercancel', rotEnd);
            el.querySelectorAll('input[type=text]').forEach(i => {
                i.addEventListener('focus', () => { setTimeout(() => i.select(), 0); }); i.addEventListener('mouseup', e => e.preventDefault());
                i.addEventListener('keydown', e => e.stopPropagation()); i.addEventListener('keyup', e => e.stopPropagation());
                if (K.indexOf(i.dataset.k) >= 0) i.addEventListener('input', () => { readParams(); st.pt = null; reset(); clearTimeout(tmr); tmr = setTimeout(() => emit(), 250); });
                else if (['x', 'y', 't'].indexOf(i.dataset.k) >= 0) i.addEventListener('input', () => deduce(i.dataset.k));
            });
            el.querySelector('[data-a=run]').onclick = () => {
                readParams();
                if (st.add) { const cur = par(), same = o => o && K.every(k => o[k] === cur[k]); if (st.lr && !same(st.lr) && !(st.gh || []).some(o => K.every(k => o[k] === st.lr[k]))) st.gh = (st.gh || []).concat([st.lr]).slice(-4); }
                else st.gh = [];
                st.lr = par(); run(); paintInputs(); emit(Date.now());
            };
            el.querySelector('[data-a=reset]').onclick = () => { st.gh = []; st.pt = null; st.lr = null; reset(); emit(); };
            ansBtn.onclick = () => { st.ans = st.ans ? 0 : 1; refresh(); emit(); };
            addCb.onchange = () => { st.add = addCb.checked ? 1 : 0; if (!st.add) st.gh = []; refresh(); emit(); };
            el.addEventListener('mousedown', e => { if (e.target.closest('input,button,label')) return; if (e.target.closest('.pj-edge,.pj-low')) { e.preventDefault(); opts.onDragStart && opts.onDragStart(e); } });
            el.addEventListener('wheel', e => { if (e.target.closest('.pj-edge,.pj-low')) { e.preventDefault(); opts.onScale && opts.onScale(e.deltaY < 0 ? 0.1 : -0.1); } }, { passive: false });
        }
        refresh();
        return {
            el, W, H,
            getState: () => JSON.parse(JSON.stringify(st)),
            setState: s => { if (!s) return; K.forEach(k => { if (s[k] !== undefined && s[k] !== null) st[k] = +s[k]; }); st.gh = Array.isArray(s.gh) ? s.gh.filter(Boolean) : (s.gh ? Object.values(s.gh) : []); st.add = s.add ? 1 : 0; st.ans = s.ans ? 1 : 0; st.pt = s.pt || null; st.lr = s.lr || null; reset(); },
            run: () => { run(); },
            reset, destroy: () => { stop(); el.remove(); }
        };
    }
    window.MCPlugins.projectile = { mount, W, H };
})();
