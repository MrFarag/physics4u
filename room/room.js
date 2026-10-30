// ============================================================
// Physics4U | room.js — النسخة النهائية الكاملة
// مبنية على index.js الأصلي:
//   - محذوف: #file-viewer، #pv-bar، savePartA/B، #top، #splitter
//   - مضاف: بث Firebase، قائمة الطلبة، خطة الدرس التفاعلية
//   - محتفظ: كل أزرار التسجيل/المايك/السماعة/اللقطة/الحفظ
// ============================================================

import { auth, database } from "../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {
  ref as dbRef, set, push, onValue, onDisconnect, remove, get
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

// ============================================================
// ===== [1] — الثوابت الأولية =====
// ============================================================
const DEFAULT_PEN_COLOR = '#15803d';
const MOVE_CURSOR = (() => {
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24'><path d='M12 2l2.9 6.6 7.1.7-5.3 4.8 1.5 7-6.2-3.6-6.2 3.6 1.5-7L2 9.3l7.1-.7z' fill='#fbbf24' stroke='#111827' stroke-width='1.4' stroke-linejoin='round'/></svg>";
    return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '") 14 14, move';
})();

const SHAPE_ACCENTS = {
    hl: '#f97316', arrow: '#ef4444', line: '#fbbf24', cr: '#22c55e',
    rc: '#3b82f6', sq: '#a855f7', el: '#06b6d4',
    resistor: '#f59e0b', battery: '#10b981', lamp: '#eab308',
    capacitor: '#6366f1', inductor: '#ec4899'
};

const isFreeStroke = s => !!s && ['free', 'fh', 'dot', 'fh-dot'].includes(s.type) && Array.isArray(s.points) && s.points.length > 0;

function rawBBox(pts) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach(p => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
    return { x0, y0, x1, y1 };
}

const TILT_MAX = 85;
const clampTilt = v => Math.max(-TILT_MAX, Math.min(TILT_MAX, isNaN(v) ? 0 : v));

function tiltScale(s) {
    if (!s || s.type !== 'shape' || isLineShape(s)) return { sx: 1, sy: 1 };
    return { sx: Math.cos(clampTilt(s.tiltY || 0) * Math.PI / 180), sy: Math.cos(clampTilt(s.tiltX || 0) * Math.PI / 180) };
}

function shapeToScreen(s, pt, c) {
    const r = rotatePoint(pt.x, pt.y, c.x, c.y, s.rotation || 0), t = tiltScale(s);
    return { x: c.x + (r.x - c.x) * t.sx, y: c.y + (r.y - c.y) * t.sy };
}

function screenToLocal(s, pt, c) {
    const t = tiltScale(s);
    return rotatePoint(c.x + (pt.x - c.x) / t.sx, c.y + (pt.y - c.y) / t.sy, c.x, c.y, -(s.rotation || 0));
}

function setTilt(sh, tx, ty, hd) {
    tx = clampTilt(tx); ty = clampTilt(ty);
    if (isFreeStroke(sh)) {
        const base = hd ? hd.origPoints : sh.points;
        const oTx = hd ? hd.origTx : (sh.tiltX || 0), oTy = hd ? hd.origTy : (sh.tiltY || 0);
        const r = rawBBox(base), c = { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 };
        const k = (n, o) => Math.cos(n * Math.PI / 180) / Math.cos(o * Math.PI / 180);
        const kx = k(ty, oTy), ky = k(tx, oTx);
        sh.points = base.map(p => ({ x: c.x + (p.x - c.x) * kx, y: c.y + (p.y - c.y) * ky }));
        sh.tiltX = tx; sh.tiltY = ty;
    } else if (sh.type === 'shape' && !isLineShape(sh)) { sh.tiltX = tx; sh.tiltY = ty; }
}

let imgAttach = null;

function strokeCenter(s) {
    if (s.points && s.points.length) { const r = rawBBox(s.points); return { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }; }
    if (s.x !== undefined) return { x: s.x, y: s.y };
    return null;
}

function startImgAttach(img) {
    const list = [];
    getStrokes().forEach((s, i) => {
        const c = strokeCenter(s); if (!c) return;
        if (c.x >= img.x && c.x <= img.x + img.w && c.y >= img.y && c.y <= img.y + img.h)
            list.push({ i, pts: s.points ? JSON.parse(JSON.stringify(s.points)) : null, x: s.x, y: s.y });
    });
    imgAttach = { list, ox: img.x, oy: img.y, ow: img.w, oh: img.h };
}

function applyImgAttach(img, mode) {
    if (!imgAttach || !imgAttach.list.length) return;
    const a = imgAttach, arr = getStrokes();
    const fx = img.w / a.ow, fy = img.h / a.oh, dx = img.x - a.ox, dy = img.y - a.oy;
    const T = mode === 'scale' ? (x, y) => ({ x: a.ox + (x - a.ox) * fx, y: a.oy + (y - a.oy) * fy }) : (x, y) => ({ x: x + dx, y: y + dy });
    a.list.forEach(it => {
        const s = arr[it.i]; if (!s) return;
        if (it.pts) s.points = it.pts.map(p => T(p.x, p.y));
        if (it.x !== undefined) { const q = T(it.x, it.y); s.x = q.x; s.y = q.y; }
    });
}

let hlAlphaDefault = 0.4;
const TEXT_LH = 1.35;

function textLines(s) {
    const c = cx; if (!c) return [String(s.text || '')];
    c.save(); c.font = 'bold ' + (s.sz || 16) + 'px Cairo';
    const maxW = Math.max(20, textBaseW(s) - 12), out = [];
    String(s.text || '').split('\n').forEach(par => {
        let line = '';
        par.split(' ').forEach(w => {
            const t = line ? line + ' ' + w : w;
            if (!line || c.measureText(t).width <= maxW) line = t; else { out.push(line); line = w; }
        });
        out.push(line);
    });
    c.restore(); return out;
}

function textBaseW(s) { return s.w || Math.max(80, String(s.text || '').length * (s.sz || 16) * 0.65 + 16); }

function textBox(s) {
    const need = textLines(s).length * (s.sz || 16) * TEXT_LH + 10;
    return { w: textBaseW(s), h: Math.max(s.h || 0, need) };
}

// ============================================================
// ===== [2] — المتغيرات العامة =====
// ============================================================
let handlesOn = true;
const isLineShape = s => !!s && s.type === 'shape' && ['line', 'arrow', 'double-arrow'].includes(s.shape);

let tool='pen', shp=null, col=DEFAULT_PEN_COLOR, fillEnabled=false;
let colB = DEFAULT_PEN_COLOR, colF = DEFAULT_PEN_COLOR, pickerRegion = 'board';
let sz=4, fhSzB=18, fhSzF=18, fhOpacityB=0.1, fhOpacityF=0.1, lineStyle='solid', opacity=1;
let drw=false, currentTarget='board';
let lastErasePt=null, gridOn=true;
let zoom=1, isResizing=false, currentPage=0;
let pages=[{ strokes: [], images: [], bg: '#0a101d', title: '' }];
let und=[], red=[];
let selImageIdx=-1, selStrokeIdx=-1;
let isDraggingImg=false, isResizingImg=false, imgDragOffsetX=0, imgDragOffsetY=0;
let imageCache={}, shapeStartPoint=null, currentShapePreview=null, handleDrag=null;
let cv, cx, board, boardWrapper, boardClr='#0a101d';
let micStream=null, micActive=false, audioContext=null, analyser=null, micAnimFrame=null;
let speakerActive=false;

let dirty = false;
let isAreaMode=false, areaSelection=null;
let _clipboard = null;
const CLIP_MARK = 'sabbora-board-item';

// Firebase
let unsubStudents = null;

// ============================================================
// ===== [3] — المساعدات العامة =====
// ============================================================
const $ = id => document.getElementById(id);

let stTimer = null;
function st(m, ms) {
    const el = $('status');
    if (el) {
        el.textContent = m;
        clearTimeout(stTimer);
        stTimer = setTimeout(() => { if (el) el.textContent = 'جاهزة'; }, ms || 2500);
    }
    console.log('[status]', m);
}

let confirmKey = null, confirmTimer = null;
function confirmTwice(key, msg) {
    if (confirmKey === key) { clearTimeout(confirmTimer); confirmKey = null; return true; }
    confirmKey = key;
    st('⚠️ ' + msg + ' — اضغط مرة أخرى للتأكيد', 3500);
    clearTimeout(confirmTimer); confirmTimer = setTimeout(() => { confirmKey = null; }, 3500);
    return false;
}

function getPage() { return pages[currentPage]; }
function getStrokes() { return getPage().strokes; }
function getImages() { return getPage().images; }

function rotatePoint(px, py, cx0, cy0, angle) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const dx = px - cx0, dy = py - cy0;
    return { x: cx0 + dx * cos - dy * sin, y: cy0 + dx * sin + dy * cos };
}

// ============================================================
// ===== [4] — إحداثيات وإعادة الحجم =====
// ============================================================
function gpBoard(e) {
    const r = board.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (x - r.left) / zoom, y: (y - r.top) / zoom };
}

function gp(e) { return gpBoard(e); }

function resizeCanvas() {
    if (!cv) return;
    const body = document.querySelector('.a4-body');
    const host = body || boardWrapper;
    if (!host) return;
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w < 10 || h < 10) return;
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
    rdr();
}

// ============================================================
// ===== [5] — لوحة الأبعاد =====
// ============================================================
const DIM_IDS = ['dim-width', 'dim-height', 'dim-theta', 'dim-r', 'dim-x', 'dim-y', 'dim-tilt-h', 'dim-tilt-v', 'dim-alpha'];
const DIM_BOX = ['dim-width', 'dim-height', 'dim-theta', 'dim-tilt-h', 'dim-tilt-v'];
const DIM_SETS = { text: ['dim-width', 'dim-height', 'dim-theta'], none: [], vec: ['dim-theta', 'dim-r', 'dim-x', 'dim-y'], box: DIM_BOX, hl: DIM_BOX.concat(['dim-alpha']) };

function setDimMode(kind) {
    if (kind === true) kind = 'vec'; else if (kind === false) kind = 'box';
    const on = new Set(DIM_SETS[kind] || []);
    DIM_IDS.forEach(id => {
        const el = $(id); if (!el) return;
        const dis = !on.has(id);
        el.disabled = dis;
        if (dis && document.activeElement !== el) el.value = '';
        if (el.parentElement) el.parentElement.classList.toggle('off', dis);
    });
}

function showDimensions() {
    const p = $('shape-dimensions'); if (!p) return;
    p.classList.remove('idle');
    p.style.display = 'flex';
}

function hideDimensions() {
    const p = $('shape-dimensions'); if (!p) return;
    p.classList.add('idle');
    setDimMode('none');
    DIM_IDS.forEach(id => { const el = $(id); if (el) el.value = ''; });
    p.style.display = 'none';
}

function setTiltFields(s) {
    const th = $('dim-tilt-h'), tv = $('dim-tilt-v');
    if (th && document.activeElement !== th) th.value = Math.round(s.tiltY || 0);
    if (tv && document.activeElement !== tv) tv.value = Math.round(s.tiltX || 0);
}

function readTiltFields(s) {
    const th = $('dim-tilt-h'), tv = $('dim-tilt-v');
    return { ty: th ? (parseFloat(th.value) || 0) : (s.tiltY || 0), tx: tv ? (parseFloat(tv.value) || 0) : (s.tiltX || 0) };
}

function r1(v) { return Math.round(v * 10) / 10; }

function updatePageNumDisplay() {
    const total = $('a4PageTotal');
    const inp = $('a4PageInput');
    if (total) total.textContent = pages.length;
    if (inp && document.activeElement !== inp) inp.value = currentPage + 1;
}

function syncPageTitleInput() {
    const input = $('pageTitleInput');
    if (!input || document.activeElement === input) return;
    const pg = pages[currentPage];
    if (pg) input.value = pg.title || '';
}

function _saveTitleNow() {
    const ti = $('pageTitleInput');
    if (ti && pages[currentPage]) pages[currentPage].title = ti.value || '';
}

function updateDimensions(shape) {
    if (shape && shape.type === 'text') {
        setDimMode('text');
        const b = textBox(shape);
        let ang = Math.round(-(shape.rotation || 0) * 180 / Math.PI);
        while (ang > 180) ang -= 360;
        while (ang < -180) ang += 360;
        const vals = { 'dim-width': Math.round(b.w), 'dim-height': Math.round(b.h), 'dim-theta': ang };
        for (const id in vals) { const el = $(id); if (el && document.activeElement !== el) el.value = vals[id]; }
        return;
    }
    if (isFreeStroke(shape)) {
        setDimMode(false);
        const r = rawBBox(shape.points);
        let ang = Math.round(-(shape.vrot || 0) * 180 / Math.PI);
        while (ang > 180) ang -= 360;
        while (ang < -180) ang += 360;
        const dw = $('dim-width'), dh = $('dim-height'), da = $('dim-theta');
        setTiltFields(shape);
        if (dw && document.activeElement !== dw) dw.value = Math.round(r.x1 - r.x0);
        if (dh && document.activeElement !== dh) dh.value = Math.round(r.y1 - r.y0);
        if (da && document.activeElement !== da) da.value = ang;
        return;
    }
    if (!shape || !shape.points || shape.points.length < 2) return;
    const s = shape.points[0], e = shape.points[1];

    if (isLineShape(shape)) {
        setDimMode(true);
        const dx = e.x - s.x, dy = -(e.y - s.y);
        const vals = { 'dim-theta': r1(Math.atan2(dy, dx) * 180 / Math.PI), 'dim-r': r1(Math.hypot(dx, dy)), 'dim-x': r1(dx), 'dim-y': r1(dy) };
        for (const id in vals) { const el = $(id); if (el && document.activeElement !== el) el.value = vals[id]; }
        return;
    }
    setDimMode(false);
    if (shape.shape === 'hl') {
        setDimMode('hl');
        const al = $('dim-alpha');
        if (al && document.activeElement !== al) al.value = Math.round((1 - (shape.hlAlpha !== undefined ? shape.hlAlpha : hlAlphaDefault)) * 100);
    }
    const w = Math.round(Math.abs(e.x - s.x));
    const h = Math.round(Math.abs(e.y - s.y));
    let angle = Math.round(-(shape.rotation || 0) * 180 / Math.PI);
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;

    const dw = $('dim-width'), dh = $('dim-height'), da = $('dim-theta');
    setTiltFields(shape);
    if (dw && document.activeElement !== dw) dw.value = w;
    if (dh && document.activeElement !== dh) dh.value = h;
    if (da && document.activeElement !== da) da.value = angle;
}

function applyVectorFromPanel(which) {
    if (selStrokeIdx === -1) return;
    const s = getStrokes()[selStrokeIdx];
    if (!isLineShape(s) || !s.points || s.points.length < 2) return;
    const val = id => { const v = parseFloat($(id).value); return isNaN(v) ? 0 : v; };
    const a = s.points[0], b = s.points[1];
    const dx0 = b.x - a.x, dy0 = -(b.y - a.y);
    const th0 = Math.atan2(dy0, dx0), r0 = Math.hypot(dx0, dy0);
    let dx = dx0, dy = dy0;
    if (which === 'r') { const r = Math.max(val('dim-r'), 1); dx = r * Math.cos(th0); dy = r * Math.sin(th0); }
    else if (which === 'theta') { const th = val('dim-theta') * Math.PI / 180; dx = r0 * Math.cos(th); dy = r0 * Math.sin(th); }
    else if (which === 'x') { dx = val('dim-x'); }
    else if (which === 'y') { dy = val('dim-y'); }
    if (Math.hypot(dx, dy) < 1) { dx = 1; dy = 0; }
    su();
    s.points[1] = { x: a.x + dx, y: a.y - dy };
    ['dim-theta', 'dim-r', 'dim-x', 'dim-y'].forEach(id => { const el = $(id); if (el) el.blur(); });
    rdr();
    broadcastBoardState();
}

function applyFreeDims(s) {
    const g = id => { const v = parseFloat($(id).value); return isNaN(v) ? 0 : v; };
    const newW = Math.max(g('dim-width'), 1), newH = Math.max(g('dim-height'), 1), target = -g('dim-theta') * Math.PI / 180;
    const r = rawBBox(s.points), c = { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 };
    const ow = r.x1 - r.x0, oh = r.y1 - r.y0;
    const sx = (ow > 0 && Math.abs(newW - ow) >= 0.51) ? newW / ow : 1;
    const sy = (oh > 0 && Math.abs(newH - oh) >= 0.51) ? newH / oh : 1;
    const d = target - (s.vrot || 0);
    const tl = readTiltFields(s);
    const kx = Math.cos(clampTilt(tl.ty) * Math.PI / 180) / Math.cos(clampTilt(s.tiltY || 0) * Math.PI / 180);
    const ky = Math.cos(clampTilt(tl.tx) * Math.PI / 180) / Math.cos(clampTilt(s.tiltX || 0) * Math.PI / 180);
    su();
    s.tiltX = clampTilt(tl.tx); s.tiltY = clampTilt(tl.ty);
    s.points = s.points.map(p => {
        let q = { x: c.x + (p.x - c.x) * sx * kx, y: c.y + (p.y - c.y) * sy * ky };
        if (Math.abs(d) > 1e-6) q = rotatePoint(q.x, q.y, c.x, c.y, d);
        return q;
    });
    s.vrot = target;
    ['dim-width', 'dim-height', 'dim-theta', 'dim-tilt-h', 'dim-tilt-v'].forEach(id => { const el = $(id); if (el) el.blur(); });
    rdr();
    broadcastBoardState();
}

function applyDimensionsFromPanel() {
    if (selStrokeIdx === -1) return;
    const arr = getStrokes();
    const s = arr[selStrokeIdx];
    if (s && s.type === 'text') {
        const g = id => { const v = parseFloat($(id).value); return isNaN(v) ? 0 : v; };
        su();
        s.w = Math.max(40, g('dim-width')); s.h = Math.max((s.sz || 16) * 1.5, g('dim-height')); s.rotation = -g('dim-theta') * Math.PI / 180;
        ['dim-width', 'dim-height', 'dim-theta'].forEach(id => { const el = $(id); if (el) el.blur(); });
        rdr();
        broadcastBoardState();
        return;
    }
    if (isFreeStroke(s)) { applyFreeDims(s); return; }
    if (!s || !s.points || s.points.length < 2) return;

    const dw = $('dim-width'), dh = $('dim-height'), da = $('dim-theta');
    const newW = parseFloat(dw.value) || 1;
    const newH = parseFloat(dh.value) || 1;
    const displayAngle = parseFloat(da.value) || 0;

    const center = getShapeCenter(s);
    if (!center) return;

    let nW = newW, nH = newH;
    if (s.shape === 'sq') {
        const curW = Math.abs(s.points[1].x - s.points[0].x);
        const side = Math.abs(newW - curW) > 0.5 ? newW : newH;
        nW = nH = Math.max(side, 1);
    }
    s.points[0] = { x: center.x - nW / 2, y: center.y - nH / 2 };
    s.points[1] = { x: center.x + nW / 2, y: center.y + nH / 2 };
    s.rotation = -displayAngle * Math.PI / 180;
    const tl = readTiltFields(s); setTilt(s, tl.tx, tl.ty);
    rdr();
    broadcastBoardState();
}

// ============================================================
// ===== [6] — الأشكال والرسم =====
// ============================================================
function constrainSquare(a, p) {
    const dx = p.x - a.x, dy = p.y - a.y, side = Math.min(Math.abs(dx), Math.abs(dy));
    return { x: a.x + (dx < 0 ? -side : side), y: a.y + (dy < 0 ? -side : side) };
}

function getBounds(s) {
    if (!s) return null;
    if (s.type === 'text') { const b = textBox(s); return { x: s.x - b.w / 2, y: s.y - b.h / 2, w: b.w, h: b.h }; }
    if (isFreeStroke(s)) {
        const r = rawBBox(s.points), pad = Math.max(8, (s.sz || sz) / 2 + 6);
        return { x: r.x0 - pad, y: r.y0 - pad, w: (r.x1 - r.x0) + 2 * pad, h: (r.y1 - r.y0) + 2 * pad };
    }
    if (s.type === 'shape' && s.shape === 'cr' && s.points && s.points.length >= 2) {
        const r = Math.hypot(s.points[1].x - s.points[0].x, s.points[1].y - s.points[0].y) || 1;
        return { x: s.points[0].x - r, y: s.points[0].y - r, w: r * 2, h: r * 2 };
    }
    if (s.type === 'shape' && s.points && s.points.length >= 2) {
        const p1 = s.points[0], p2 = s.points[1];
        return { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y), w: Math.abs(p2.x - p1.x) || 1, h: Math.abs(p2.y - p1.y) || 1 };
    }
    if (s.points && s.points.length > 0) {
        let mX = Infinity, mY = Infinity, mx = -Infinity, my = -Infinity;
        s.points.forEach(p => { mX = Math.min(mX, p.x); mY = Math.min(mY, p.y); mx = Math.max(mx, p.x); my = Math.max(my, p.y); });
        return { x: mX, y: mY, w: Math.abs(mx - mX) || 1, h: Math.abs(my - mY) || 1 };
    }
    return null;
}

function getShapeCenter(s) {
    if (!s) return null;
    if (isFreeStroke(s)) { const r = rawBBox(s.points); return { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }; }
    if (s.type === 'shape' && s.shape === 'cr' && s.points && s.points.length >= 2) return { x: s.points[0].x, y: s.points[0].y };
    if (s.type === 'shape' && s.points && s.points.length >= 2) return { x: (s.points[0].x + s.points[1].x) / 2, y: (s.points[0].y + s.points[1].y) / 2 };
    if (s.x !== undefined) return { x: s.x, y: s.y };
    return null;
}

function getShapeHandles(shape) {
    const b = getBounds(shape);
    if (!b) return null;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;

    if (shape.shape === 'arrow' || shape.shape === 'double-arrow' || shape.shape === 'line') {
        const s = shape.points[0], e = shape.points[1];
        return [
            { x: s.x, y: s.y, anchorType: 'start' },
            { x: e.x, y: e.y, anchorType: 'end' }
        ];
    }

    const local = [
        { x: b.x, y: b.y }, { x: cx, y: b.y }, { x: b.x + b.w, y: b.y }, { x: b.x + b.w, y: cy },
        { x: b.x + b.w, y: b.y + b.h }, { x: cx, y: b.y + b.h }, { x: b.x, y: b.y + b.h }, { x: b.x, y: cy }
    ];
    const cc = { x: cx, y: cy };
    const rotated = local.map(h => shapeToScreen(shape, h, cc));
    rotated.push({ ...shapeToScreen(shape, { x: cx, y: b.y - 35 }, cc), isRotation: true });
    return rotated;
}

function drawArrowHead(tCtx, tip, from, shape) {
    const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
    const headLen = Math.max(12, 8 + (shape.sz || sz) * 2.5);
    const headAngle = Math.PI / 9;
    tCtx.beginPath();
    tCtx.moveTo(tip.x - headLen * Math.cos(angle - headAngle), tip.y - headLen * Math.sin(angle - headAngle));
    tCtx.lineTo(tip.x, tip.y);
    tCtx.lineTo(tip.x - headLen * Math.cos(angle + headAngle), tip.y - headLen * Math.sin(angle + headAngle));
    tCtx.stroke();
}

function drawShape(tCtx, shape) {
    if (!shape.points || shape.points.length < 2) return;
    const s = shape.points[0], e = shape.points[1];
    const x1 = Math.min(s.x, e.x), y1 = Math.min(s.y, e.y), x2 = Math.max(s.x, e.x), y2 = Math.max(s.y, e.y);
    const w = x2 - x1, h = y2 - y1, cx = (s.x + e.x) / 2, cy = (s.y + e.y) / 2;

    tCtx.save();
    const baseM = tCtx.getTransform();
    const rot = shape.rotation || 0, ts = tiltScale(shape);
    const ccx = shape.shape === 'cr' ? s.x : cx, ccy = shape.shape === 'cr' ? s.y : cy;
    if (!['arrow', 'double-arrow', 'line'].includes(shape.shape) && (rot !== 0 || ts.sx !== 1 || ts.sy !== 1)) {
        tCtx.translate(ccx, ccy); tCtx.scale(ts.sx, ts.sy); tCtx.rotate(rot); tCtx.translate(-ccx, -ccy);
    }
    tCtx.strokeStyle = shape.color || col;
    tCtx.lineWidth = shape.sz || sz;
    tCtx.globalAlpha = shape.opacity !== undefined ? shape.opacity : opacity;
    tCtx.lineCap = 'round'; tCtx.lineJoin = 'round';
    if (shape.lineStyle === 'dashed') tCtx.setLineDash([6, 3]);
    else if (shape.lineStyle === 'dotted') tCtx.setLineDash([2, 2]);
    if (shape.fill) tCtx.fillStyle = shape.fill;
    tCtx.beginPath();

    const isSym = ['resistor', 'capacitor', 'inductor', 'battery', 'lamp'].includes(shape.shape);
    const A = isSym ? { x: s.x, y: cy } : s, B = isSym ? { x: e.x, y: cy } : e;
    const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
    const ux = len > 0 ? dx / len : 1, uy = len > 0 ? dy / len : 0;
    const px = -uy, py = ux;
    const amp = isSym ? Math.max(6, Math.min(h / 2, len * 0.25)) : 14;

    switch (shape.shape) {
        case 'rc': case 'hl': tCtx.rect(x1, y1, w, h); break;
        case 'sq': { const side = Math.min(w, h); tCtx.rect(s.x < e.x ? s.x : s.x - side, s.y < e.y ? s.y : s.y - side, side, side); break; }
        case 'cr': { const r = Math.max(Math.hypot(e.x - s.x, e.y - s.y), 1); tCtx.arc(s.x, s.y, r, 0, Math.PI * 2); break; }
        case 'el': tCtx.ellipse(cx, cy, Math.max(w / 2, 1), Math.max(h / 2, 1), 0, 0, Math.PI * 2); break;
        case 'line': tCtx.moveTo(s.x, s.y); tCtx.lineTo(e.x, e.y); break;
        case 'arrow': tCtx.moveTo(s.x, s.y); tCtx.lineTo(e.x, e.y); tCtx.stroke(); drawArrowHead(tCtx, e, s, shape); tCtx.restore(); return;
        case 'double-arrow': tCtx.moveTo(s.x, s.y); tCtx.lineTo(e.x, e.y); tCtx.stroke(); drawArrowHead(tCtx, e, s, shape); drawArrowHead(tCtx, s, e, shape); tCtx.restore(); return;
        case 'resistor':
            tCtx.moveTo(A.x, A.y); tCtx.lineTo(A.x + ux * len * 0.2, A.y + uy * len * 0.2);
            tCtx.lineTo(A.x + ux * len * 0.3 + px * amp, A.y + uy * len * 0.3 + py * amp);
            tCtx.lineTo(A.x + ux * len * 0.4 - px * amp, A.y + uy * len * 0.4 - py * amp);
            tCtx.lineTo(A.x + ux * len * 0.5 + px * amp, A.y + uy * len * 0.5 + py * amp);
            tCtx.lineTo(A.x + ux * len * 0.6 - px * amp, A.y + uy * len * 0.6 - py * amp);
            tCtx.lineTo(A.x + ux * len * 0.7 + px * amp, A.y + uy * len * 0.7 + py * amp);
            tCtx.lineTo(A.x + ux * len * 0.8, A.y + uy * len * 0.8); tCtx.lineTo(B.x, B.y); break;
        case 'capacitor': {
            const gap = 7, half = 14;
            tCtx.moveTo(A.x, A.y); tCtx.lineTo(cx - ux * gap, cy - uy * gap);
            tCtx.moveTo(cx - ux * gap + px * half, cy - uy * gap + py * half); tCtx.lineTo(cx - ux * gap - px * half, cy - uy * gap - py * half);
            tCtx.moveTo(cx + ux * gap + px * half, cy + uy * gap + py * half); tCtx.lineTo(cx + ux * gap - px * half, cy + uy * gap - py * half);
            tCtx.moveTo(cx + ux * gap, cy + uy * gap); tCtx.lineTo(B.x, B.y); break;
        }
        case 'inductor': {
            const N = 6, pitch = 11, ch = 13, a = pitch / (2 * Math.PI), bw = pitch * 0.5;
            const xs = t => a * t - bw * Math.sin(t);
            const t0 = Math.PI / 2, t1 = 2 * Math.PI * N + 1.5 * Math.PI;
            const x0 = xs(t0), W = xs(t1) - x0, sg = ux < 0 ? -1 : 1;
            const P = (u, v) => ({ x: cx + ux * u + px * v * sg, y: cy + uy * u + py * v * sg });
            tCtx.moveTo(A.x, A.y);
            const steps = N * 40;
            for (let i = 0; i <= steps; i++) {
                const t = t0 + (t1 - t0) * i / steps;
                const q = P(xs(t) - x0 - W / 2, ch * Math.cos(t));
                tCtx.lineTo(q.x, q.y);
            }
            tCtx.lineTo(B.x, B.y); break;
        }
        case 'battery': {
            const gap = 8, longHalf = 18, shortHalf = 9;
            tCtx.moveTo(A.x, A.y); tCtx.lineTo(cx - ux * gap, cy - uy * gap);
            tCtx.moveTo(cx - ux * gap + px * longHalf, cy - uy * gap + py * longHalf); tCtx.lineTo(cx - ux * gap - px * longHalf, cy - uy * gap - py * longHalf);
            tCtx.moveTo(cx + ux * gap + px * shortHalf, cy + uy * gap + py * shortHalf); tCtx.lineTo(cx + ux * gap - px * shortHalf, cy + uy * gap - py * shortHalf);
            tCtx.moveTo(cx + ux * gap, cy + uy * gap); tCtx.lineTo(B.x, B.y); break;
        }
        case 'lamp': {
            const lampR = Math.max(8, Math.min(20, h / 2, len * 0.3));
            tCtx.moveTo(A.x, A.y); tCtx.lineTo(cx - ux * lampR, cy - uy * lampR);
            tCtx.arc(cx, cy, lampR, 0, Math.PI * 2);
            tCtx.moveTo(cx + ux * lampR, cy + uy * lampR); tCtx.lineTo(B.x, B.y); break;
        }
        default: tCtx.rect(x1, y1, w, h);
    }
    tCtx.setTransform(baseM);
    if (shape.shape === 'hl') {
        tCtx.globalAlpha = shape.hlAlpha !== undefined ? shape.hlAlpha : hlAlphaDefault;
        tCtx.fillStyle = shape.color || col; tCtx.shadowBlur = 14; tCtx.shadowColor = shape.color || col;
        tCtx.fill(); tCtx.restore(); return;
    }
    if (shape.fill && !['line', 'arrow', 'double-arrow', 'resistor', 'capacitor', 'inductor', 'battery', 'lamp'].includes(shape.shape)) tCtx.fill();
    tCtx.stroke();
    tCtx.restore();
}

function drawStrokesOnCtx(tCtx, arr) {
    arr.forEach(s => {
        tCtx.save();
        tCtx.lineCap = 'round'; tCtx.lineJoin = 'round';
        if (s.type === 'shape') drawShape(tCtx, s);
        else if (s.type === 'fh' || s.type === 'fh-dot') {
            tCtx.shadowBlur = 15; tCtx.shadowColor = s.color || col;
            tCtx.globalAlpha = s.fhOpacity !== undefined ? s.fhOpacity : fhOpacityB;
            tCtx.lineWidth = s.sz || fhSzB; tCtx.strokeStyle = s.color || col;
            tCtx.fillStyle = s.color || col;
            if (s.points && s.points.length > 1) {
                tCtx.beginPath(); tCtx.moveTo(s.points[0].x, s.points[0].y);
                s.points.forEach((p, j) => { if (j) tCtx.lineTo(p.x, p.y); });
                tCtx.stroke();
            } else if (s.points && s.points.length === 1) {
                tCtx.beginPath(); tCtx.arc(s.points[0].x, s.points[0].y, (s.sz || fhSzB) / 2, 0, Math.PI * 2); tCtx.fill();
            }
        } else if (s.type === 'dot') {
            tCtx.fillStyle = s.color || col;
            tCtx.beginPath(); tCtx.arc(s.points[0].x, s.points[0].y, Math.max(1, (s.sz || sz) / 2), 0, Math.PI * 2); tCtx.fill();
        } else if (s.type === 'text') {
            if (!s.editing) {
                const lines = textLines(s), lh = (s.sz || 16) * TEXT_LH;
                tCtx.translate(s.x, s.y); if (s.rotation) tCtx.rotate(s.rotation);
                if (!String(s.text || '').trim()) {
                    const b = textBox(s);
                    tCtx.save();
                    tCtx.strokeStyle = 'rgba(234,88,12,0.9)'; tCtx.lineWidth = 1; tCtx.setLineDash([5, 4]);
                    tCtx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
                    tCtx.restore();
                }
                tCtx.fillStyle = s.color || col; tCtx.font = `bold ${s.sz || 16}px Cairo`;
                tCtx.textAlign = 'center'; tCtx.textBaseline = 'middle';
                const top = -lines.length * lh / 2 + lh / 2;
                lines.forEach((ln, i) => tCtx.fillText(ln, 0, top + i * lh));
            }
        } else {
            tCtx.strokeStyle = s.color || col; tCtx.lineWidth = s.sz || sz;
            tCtx.globalAlpha = s.opacity !== undefined ? s.opacity : opacity;
            if (s.lineStyle === 'dashed') tCtx.setLineDash([6, 3]);
            else if (s.lineStyle === 'dotted') tCtx.setLineDash([2, 2]);
            if (s.points && s.points.length > 1) {
                tCtx.beginPath(); tCtx.moveTo(s.points[0].x, s.points[0].y);
                s.points.forEach((p, j) => { if (j) tCtx.lineTo(p.x, p.y); });
                tCtx.stroke();
            }
        }
        tCtx.restore();
    });
}

function drawSelectionHandles(tCtx, shape) {
    const handles = getShapeHandles(shape);
    if (!handles) return;
    const dot = (h, r, fill) => {
        tCtx.save();
        tCtx.fillStyle = fill; tCtx.strokeStyle = 'rgba(56,189,248,0.85)'; tCtx.lineWidth = 1.6;
        tCtx.setLineDash([2, 2.2]);
        tCtx.beginPath(); tCtx.arc(h.x, h.y, r, 0, Math.PI * 2); tCtx.fill(); tCtx.stroke();
        tCtx.restore();
    };
    if (shape.shape === 'arrow' || shape.shape === 'double-arrow' || shape.shape === 'line') {
        handles.forEach(h => dot(h, 5, 'rgba(255,255,255,0.05)'));
        return;
    }
    const b = getBounds(shape), center = getShapeCenter(shape);
    if (!b || !center) return;
    const corners = [{ x: b.x, y: b.y }, { x: b.x + b.w, y: b.y }, { x: b.x + b.w, y: b.y + b.h }, { x: b.x, y: b.y + b.h }]
        .map(p => shapeToScreen(shape, p, center));
    tCtx.save();
    tCtx.strokeStyle = 'rgba(56,189,248,0.4)'; tCtx.lineWidth = 1; tCtx.setLineDash([2, 4]);
    tCtx.beginPath(); corners.forEach((p, i) => i ? tCtx.lineTo(p.x, p.y) : tCtx.moveTo(p.x, p.y)); tCtx.closePath(); tCtx.stroke();
    tCtx.restore();
    handles.forEach(h => dot(h, h.isRotation ? 5.5 : 5, h.isRotation ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.05)'));
}

// ============================================================
// ===== [7] — رسم الصور والكانفس =====
// ============================================================
function drawImagesOnCtx(tCtx, imagesArr) {
    imagesArr.forEach((imgObj, index) => {
        if (!imageCache[imgObj.src]) {
            const img = new Image();
            img.src = imgObj.src;
            img.onload = () => { rdr(); };
            imageCache[imgObj.src] = img;
        }
        const imgEl = imageCache[imgObj.src];
        if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
            tCtx.save(); tCtx.translate(imgObj.x + imgObj.w / 2, imgObj.y + imgObj.h / 2);
            tCtx.rotate((imgObj.rotation || 0) * Math.PI / 180);
            tCtx.drawImage(imgEl, -imgObj.w / 2, -imgObj.h / 2, imgObj.w, imgObj.h);
            if (selImageIdx === index && tool === 'select') {
                tCtx.strokeStyle = '#38bdf8'; tCtx.lineWidth = 2; tCtx.setLineDash([5, 5]);
                tCtx.strokeRect(-imgObj.w / 2, -imgObj.h / 2, imgObj.w, imgObj.h);
            }
            tCtx.restore();
        }
    });
}

function rdr() {
    if (!cx) return;
    cx.clearRect(0, 0, cv.width, cv.height);
    drawImagesOnCtx(cx, getImages());
    drawStrokesOnCtx(cx, getStrokes());
    if (currentShapePreview) {
        drawShape(cx, currentShapePreview);
        updateDimensions(currentShapePreview);
    }
    if (isAreaMode && areaSelection) {
        const x1 = Math.min(areaSelection.x1, areaSelection.x2), y1 = Math.min(areaSelection.y1, areaSelection.y2);
        const w = Math.abs(areaSelection.x2 - areaSelection.x1), h = Math.abs(areaSelection.y2 - areaSelection.y1);
        cx.save(); cx.strokeStyle = '#38bdf8'; cx.lineWidth = 2; cx.setLineDash([6, 4]);
        cx.fillStyle = 'rgba(56,189,248,0.15)'; cx.fillRect(x1, y1, w, h); cx.strokeRect(x1, y1, w, h); cx.restore();
    }
    if (selStrokeIdx !== -1 && (tool === 'select' || (tool === 'shape' && handlesOn)) && !currentShapePreview) {
        const s = getStrokes()[selStrokeIdx];
        if (s && isFreeStroke(s) && tool === 'select') {
            if (!drw) drawSelectionHandles(cx, s); showDimensions(); updateDimensions(s);
        } else if (s && (s.type === 'shape' || s.type === 'text') && (tool === 'select' || s.type === 'shape')) {
            if (!drw) drawSelectionHandles(cx, s);
            showDimensions();
            updateDimensions(s);
        }
    }
    updatePageNumDisplay();
}

// ============================================================
// ===== [8] — اختبار النقر =====
// ============================================================
function hitTestImage(x, y) {
    const imgs = getImages();
    for (let i = imgs.length - 1; i >= 0; i--) {
        const img = imgs[i];
        if (x >= img.x && x <= img.x + img.w && y >= img.y && y <= img.y + img.h) return i;
    }
    return -1;
}

function hitTestStroke(x, y) {
    const strokes = getStrokes();
    for (let i = strokes.length - 1; i >= 0; i--) {
        const s = strokes[i];
        if (s.type === 'text') {
            const tb = textBox(s), c = { x: s.x, y: s.y }, lp = rotatePoint(x, y, c.x, c.y, -(s.rotation || 0));
            if (Math.abs(lp.x - c.x) <= tb.w / 2 + 6 && Math.abs(lp.y - c.y) <= tb.h / 2 + 6) return i;
        } else if (isLineShape(s) && s.points && s.points.length >= 2) {
            if (distToSegment(x, y, s.points[0], s.points[1]) <= Math.max(10, (s.sz || sz) / 2 + 8)) return i;
        } else if (s.type === 'shape' && s.points && s.points.length >= 2) {
            const c = getShapeCenter(s); if (!c) continue;
            const lp = screenToLocal(s, { x, y }, c), b = getBounds(s);
            if (b) { const m = (s.sz || sz) + 15; if (lp.x >= b.x - m && lp.x <= b.x + b.w + m && lp.y >= b.y - m && lp.y <= b.y + b.h + m) return i; }
        } else if (s.points && s.points.length > 0) {
            const r = (s.type === 'dot' || s.type === 'fh-dot') ? (s.sz || sz) / 2 + 5 : Math.max(8, (s.sz || sz) / 2 + 6);
            if (s.points.length === 1) { if (Math.hypot(s.points[0].x - x, s.points[0].y - y) < r) return i; }
            else for (let k = 1; k < s.points.length; k++) { if (distToSegment(x, y, s.points[k - 1], s.points[k]) < r) return i; }
        }
    }
    return -1;
}

function distToSegment(px, py, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - a.x) * dx + (py - a.y) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

function hitShapeNear(x, y, s) {
    if (!s || s.type !== 'shape' || !s.points || s.points.length < 2) return false;
    const tol = Math.max(10, (s.sz || sz) / 2 + 8);
    if (isLineShape(s)) return distToSegment(x, y, s.points[0], s.points[1]) <= tol;
    const c = getShapeCenter(s), b = getBounds(s); if (!c || !b) return false;
    const lp = screenToLocal(s, { x, y }, c);
    if (s.shape === 'cr') return Math.abs(Math.hypot(lp.x - c.x, lp.y - c.y) - b.w / 2) <= tol;
    if (s.shape === 'el') {
        const a = b.w / 2 || 1, bb = b.h / 2 || 1;
        const d = Math.hypot((lp.x - c.x) / a, (lp.y - c.y) / bb);
        return Math.abs(d - 1) * Math.min(a, bb) <= tol;
    }
    const inside = lp.x >= b.x - tol && lp.x <= b.x + b.w + tol && lp.y >= b.y - tol && lp.y <= b.y + b.h + tol;
    if (s.shape === 'rc' || s.shape === 'sq' || s.shape === 'hl') {
        const deep = lp.x > b.x + tol && lp.x < b.x + b.w - tol && lp.y > b.y + tol && lp.y < b.y + b.h - tol;
        return inside && !deep;
    }
    return inside;
}

function hitShapeBody(x, y, s) {
    if (!s || s.type !== 'shape' || !s.points || s.points.length < 2) return false;
    if (isLineShape(s)) return hitShapeNear(x, y, s);
    const c = getShapeCenter(s), b = getBounds(s); if (!c || !b) return false;
    const lp = screenToLocal(s, { x, y }, c);
    return lp.x >= b.x && lp.x <= b.x + b.w && lp.y >= b.y && lp.y <= b.y + b.h;
}

function hitTestHandle(x, y, shape) {
    const handles = getShapeHandles(shape); if (!handles) return -1;
    for (let i = 0; i < handles.length; i++) {
        if (Math.hypot(x - handles[i].x, y - handles[i].y) < (handles[i].isRotation ? 9 : 8)) return i;
    }
    return -1;
}

// ============================================================
// ===== [9] — الممحاة =====
// ============================================================
function eraseAlong(x, y, isFine) {
    const step = (isFine ? 10 : 20) * 0.6;
    if (lastErasePt) {
        const dx = x - lastErasePt.x, dy = y - lastErasePt.y;
        const dist = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.ceil(dist / step));
        for (let i = 1; i <= steps; i++) eraseAt(lastErasePt.x + dx * i / steps, lastErasePt.y + dy * i / steps, isFine);
    } else eraseAt(x, y, isFine);
    lastErasePt = { x, y };
}

function eraseAt(x, y, isFine) {
    const half = isFine ? 10 : 20;
    const inSq = (px, py) => px >= x - half && px <= x + half && py >= y - half && py <= y + half;
    const arr = getStrokes();
    for (let i = arr.length - 1; i >= 0; i--) {
        const s = arr[i];
        if (s.type === 'text' || s.type === 'shape') {
            const b = getBounds(s), c = getShapeCenter(s);
            if (b && c) {
                const lp = screenToLocal(s, { x, y }, c);
                if (!(lp.x + half < b.x || lp.x - half > b.x + b.w || lp.y + half < b.y || lp.y - half > b.y + b.h)) { arr.splice(i, 1); return true; }
            }
        } else if (s.points) {
            let segs = [], removed = false, cur = [];
            for (let j = 0; j < s.points.length; j++) {
                const pt = s.points[j];
                if (inSq(pt.x, pt.y)) { removed = true; if (cur.length > 0) { segs.push(cur); cur = []; } }
                else cur.push(pt);
            }
            if (cur.length > 0) segs.push(cur);
            if (removed) {
                arr.splice(i, 1);
                segs.forEach(sg => { if (sg.length > 1) arr.push({ ...s, points: sg }); else if (sg.length === 1) arr.push({ ...s, type: s.type === 'fh' ? 'fh-dot' : 'dot', points: sg }); });
                return true;
            }
        }
    }
    return false;
}

// ============================================================
// ===== [10] — التراجع والإعادة =====
// ============================================================
function clonePagesLight(src) {
    return src.map(p => ({
        ...p,
        strokes: JSON.parse(JSON.stringify(p.strokes || [])),
        images: (p.images || []).map(im => ({ ...im })),
        title: p.title || ''
    }));
}

function boardSnap() { return { pages: clonePagesLight(pages), currentPage }; }

function su() {
    dirty = true;
    und.push(boardSnap()); if (und.length > 50) und.shift(); red = [];
}

function un() {
    if (!und.length) return;
    red.push(boardSnap());
    applyState(und.pop());
    broadcastBoardState();
}

function re() {
    if (!red.length) return;
    und.push(boardSnap());
    applyState(red.pop());
    broadcastBoardState();
}

function stripEditingFlags(list) {
    (list || []).forEach(s => { if (s && s.editing) delete s.editing; });
}

function applyState(state) {
    endTextEdit();
    if (state.pages) {
        pages = state.pages;
        if (state.currentPage !== undefined && state.currentPage < pages.length) currentPage = state.currentPage;
        boardClr = getPage().bg || '#0a101d';
        if (board) board.style.background = boardClr;
        pages.forEach(p => stripEditingFlags(p.strokes));
    }
    selStrokeIdx = -1; selImageIdx = -1;
    hideDimensions();
    rdr();
    updatePageNumDisplay();
}

// ============================================================
// ===== [11] — التنقل بين الصفحات =====
// ============================================================
function updatePageNav() { updatePageNumDisplay(); }

window.goPrevPage = function () { if (pages.length > 0) { _saveTitleNow(); currentPage = (currentPage - 1 + pages.length) % pages.length; applyPageChange(); } };
window.goNextPage = function () {
    if (pages.length === 0) return;
    _saveTitleNow();
    if (currentPage >= pages.length - 1) {
        const inheritTitle = (pages[currentPage] && pages[currentPage].title) || '';
        pages.push({ strokes: [], images: [], bg: '#0a101d', title: inheritTitle });
        currentPage = pages.length - 1;
    } else { currentPage = currentPage + 1; }
    applyPageChange();
};
window.goInsertPage = function () {
    _saveTitleNow();
    const inheritTitle = (pages[currentPage] && pages[currentPage].title) || '';
    pages.splice(currentPage, 0, { strokes: [], images: [], bg: '#0a101d', title: inheritTitle });
    applyPageChange();
};
window.goDeletePage = function () {
    if (pages.length <= 1) { st('⚠️ لا يمكن حذف الصفحة الأخيرة', 3000); return; }
    if (!confirm('حذف الصفحة الحالية؟')) return;
    pages.splice(currentPage, 1);
    if (currentPage >= pages.length) currentPage = pages.length - 1;
    applyPageChange();
};
window.jumpA4Page = function () {
    const i = $('a4PageInput'); if (!i) return;
    let v = parseInt(i.value); if (isNaN(v) || v < 1) v = 1; if (v > pages.length) v = pages.length;
    if (v !== currentPage + 1) { _saveTitleNow(); currentPage = v - 1; applyPageChange(); }
    i.value = currentPage + 1;
};

function applyPageChange() {
    boardClr = getPage().bg || '#0a101d';
    if (board) board.style.background = boardClr;
    selStrokeIdx = -1; selImageIdx = -1;
    hideDimensions();
    rdr();
    updatePageNumDisplay();
    broadcastBoardState();
}

// ============================================================
// ===== [12] — محرر النص =====
// ============================================================
let textEdit = null;

function positionTextEditor() {
    if (!textEdit) return;
    const s = getStrokes()[textEdit.idx], ed = $('text-editor');
    if (!s || !ed) { endTextEdit(); return; }
    const r = cv.getBoundingClientRect(), k = r.width / cv.width;
    const b = textBox(s), lh = (s.sz || 16) * TEXT_LH * k, lines = textLines(s).length;
    const w = b.w * k, h = b.h * k, cxs = r.left + s.x * k, cys = r.top + s.y * k;
    ed.style.width = w + 'px'; ed.style.height = h + 'px';
    ed.style.left = (cxs - w / 2) + 'px'; ed.style.top = (cys - h / 2) + 'px';
    ed.style.fontSize = (s.sz || 16) * k + 'px'; ed.style.lineHeight = lh + 'px';
    ed.style.color = s.color || col;
    ed.style.paddingTop = Math.max(0, (h - lines * lh) / 2) + 'px';
    ed.style.transform = 'rotate(' + (s.rotation || 0) + 'rad)';
}

function startTextEdit(idx, isNew) {
    endTextEdit();
    const arr = getStrokes(), s = arr[idx], ed = $('text-editor');
    if (!s || s.type !== 'text' || !ed) return;
    if (!isNew) su();
    selStrokeIdx = idx;
    if (isNew && !s.text) s.text = ' ';
    if (!s.w) { const b = textBox(s); s.w = b.w; s.h = b.h; }
    s.editing = true;
    textEdit = { idx, orig: s.text };
    ed.value = s.text || '';
    ed.style.display = 'block';
    positionTextEditor();
    rdr();
    ed.focus();
    if (ed.value === ' ') ed.setSelectionRange(0, ed.value.length);
    else ed.setSelectionRange(ed.value.length, ed.value.length);
}

function endTextEdit() {
    if (!textEdit) return;
    const te = textEdit, ed = $('text-editor');
    textEdit = null;
    if (ed) ed.style.display = 'none';
    const arr = getStrokes(), s = arr[te.idx];
    if (!s) return;
    delete s.editing;
    if (!String(s.text || '')) { arr.splice(te.idx, 1); if (selStrokeIdx === te.idx) selStrokeIdx = -1; hideDimensions(); }
    rdr();
    broadcastBoardState();
}

function setupTextEditor() {
    const ed = $('text-editor'); if (!ed) return;
    ed.addEventListener('input', () => {
        if (!textEdit) return;
        const s = getStrokes()[textEdit.idx]; if (!s) return;
        if (s.text === ' ' && ed.value.length > 1) ed.value = ed.value.replace(/^ /, '');
        if (ed.value === '') ed.value = ' ';
        s.text = ed.value;
        const need = textLines(s).length * (s.sz || 16) * TEXT_LH + 10;
        if (need > (s.h || 0)) s.h = need;
        positionTextEditor(); rdr();
    });
    ed.addEventListener('blur', endTextEdit);
    ed.addEventListener('keydown', ev => {
        ev.stopPropagation();
        if (ev.key === 'Escape' || (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey))) { ev.preventDefault(); endTextEdit(); }
    });
    document.addEventListener('mousedown', e => {
        if (textEdit && e.target.closest && e.target.closest('.quick-color-btn, .palette-big, .fh-ball-btn, .cp-swatch, #lb-paste')) e.preventDefault();
    }, true);
    window.addEventListener('resize', positionTextEditor);
    if (boardWrapper) boardWrapper.addEventListener('scroll', positionTextEditor, { passive: true });
    document.addEventListener('dblclick', e => {
        if (e.target.closest('#bottom, #right-bar, #left-bar, #info-strip, .dropdown-menu, #pv-bar') || e.target === ed) return;
        const p = gp(e), hi = hitTestStroke(p.x, p.y), arr = getStrokes();
        if (hi !== -1 && arr[hi].type === 'text') startTextEdit(hi, false);
    });
    document.addEventListener('keydown', e => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.key !== 'Enter' || selStrokeIdx === -1) return;
        const s = getStrokes()[selStrokeIdx];
        if (s && s.type === 'text') { e.preventDefault(); startTextEdit(selStrokeIdx, false); }
    });
}

// ============================================================
// ===== [13] — الأدوات والألوان =====
// ============================================================
function setTool(t) {
    tool = t; shp = null;
    if (cv) cv.style.cursor = 'default';
    selStrokeIdx = -1; selImageIdx = -1;
    shapeStartPoint = null; currentShapePreview = null; handleDrag = null;
    document.querySelectorAll('#bottom .tb, #fhColorBall, #fhColorBallL').forEach(b => b.classList.remove('on'));
    document.querySelectorAll('#right-bar .tbtn').forEach(b => b.classList.remove('on'));
    document.querySelectorAll('.quick-shape').forEach(b => b.classList.remove('on'));
    const btns = { pen: 'bpen', fh: 'fhColorBall' };
    if (t === 'fh' && $('fhColorBallL')) $('fhColorBallL').classList.add('on');
    if (btns[t] && $(btns[t])) $(btns[t]).classList.add('on');
    const rightBtns = { select: 'lb-select', eraser: 'lb-eraser', 'eraser-fine': 'lb-eraser-fine', text: 'lb-text' };
    if (rightBtns[t] && $(rightBtns[t])) $(rightBtns[t]).classList.add('on');
    if (t !== 'select') hideDimensions();
    rdr();
}

function showFlyout(id, trigger) {
    closeAllMenus();
    const m = $(id); if (!m) return;
    m.classList.add('visible');
    const r = trigger.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
    let left = r.left - mw - 6; if (left < 8) left = r.right + 6;
    const top = Math.min(Math.max(8, r.top), Math.max(8, window.innerHeight - mh - 8));
    m.style.left = left + 'px'; m.style.top = top + 'px';
}

function activateShape(shpCode, element) {
    shp = shpCode;
    tool = 'shape';
    document.querySelectorAll('.quick-shape').forEach(i => i.classList.remove('on'));
    document.querySelectorAll('#right-bar .tbtn').forEach(i => i.classList.remove('on'));
    if (element) element.classList.add('on');
    const grp = element && element.closest ? element.closest('.flyout') : null;
    if (grp) {
        const ids = grp.id === 'shapes-flyout' ? ['lb-shapes-menu', 'lb-shapes-menuL'] : ['lb-physics-menu'];
        const src = element.querySelector('svg');
        const accent = SHAPE_ACCENTS[shpCode] || '#38bdf8';
        ids.forEach(id => {
            const gb = $(id);
            if (gb) {
                gb.classList.add('on', 'has-shape-pick');
                gb.style.setProperty('--shape-accent', accent);
                gb.style.boxShadow = 'inset 0 -4px 0 ' + accent;
                const dst = gb.querySelector('svg');
                if (src && dst) dst.innerHTML = src.innerHTML;
            }
        });
    }
    closeAllMenus();
    st('🎨 ' + shpCode);
}

function showMenuAbove(menuId, triggerElement) {
    closeAllMenus();
    const menu = $(menuId); if (!menu) return;
    menu.classList.add('visible');
    const rect = triggerElement.getBoundingClientRect();
    const mh = menu.offsetHeight || 200, mw = menu.offsetWidth || 240;
    let top = rect.top - mh - 5, left = rect.right - mw;
    if (top < 10) top = rect.bottom + 5;
    if (left < 10) left = 10;
    if (left + mw > window.innerWidth - 10) left = window.innerWidth - mw - 10;
    menu.style.top = top + 'px'; menu.style.left = left + 'px';
}

function closeAllMenus() {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('visible'));
    const p = $('color-picker-popup'); if (p) p.classList.remove('visible');
    const f = $('fh-popup'); if (f) f.classList.remove('visible');
}

function showFhPopup(el) {
    closeAllMenus();
    const pop = $('fh-popup'); if (!pop) return;
    const s = $('fh-thickness-slider'), o = $('fh-opacity-slider');
    const curSz = pickerRegion === 'file' ? fhSzF : fhSzB;
    const curOp = pickerRegion === 'file' ? fhOpacityF : fhOpacityB;
    if (s) { s.value = curSz; const v = $('fh-thickness-val'); if (v) v.textContent = curSz; }
    if (o) { o.value = Math.round((1 - curOp) * 100); const v = $('fh-opacity-val'); if (v) v.textContent = o.value + '%'; }
    pop.classList.add('visible');
    const rect = el.getBoundingClientRect();
    const ph = pop.offsetHeight || 160, pw = pop.offsetWidth || 210;
    let top = rect.top - ph - 5; if (top < 10) top = rect.bottom + 5;
    let left = rect.left + rect.width / 2 - pw / 2;
    if (left < 10) left = 10;
    if (left + pw > window.innerWidth - 10) left = window.innerWidth - pw - 10;
    pop.style.top = top + 'px'; pop.style.left = left + 'px';
}

function applyColorToText(c) {
    let s = null;
    if (textEdit) s = getStrokes()[textEdit.idx];
    else if (selStrokeIdx !== -1) {
        const a = getStrokes()[selStrokeIdx];
        if (a && a.type === 'text') s = a;
    }
    if (s && s.type === 'text') {
        su(); s.color = c;
        if (textEdit) positionTextEditor();
        rdr();
        broadcastBoardState();
    }
}

function setRegionColor(region, c) {
    if (region === 'file') colF = c; else colB = c;
    col = colB;
    updateColorUI();
    applyColorToText(c);
}

function updateColorUI() {
    const fd = $('fillDot');
    if (fd) { fd.style.background = fillEnabled ? colB : 'transparent'; }
    document.querySelectorAll('.quick-color-btn').forEach(b => {
        const cur = b.closest('#bottom-left') ? colF : colB;
        b.classList.toggle('active', (b.dataset.color || '').toLowerCase() === String(cur).toLowerCase());
    });
    const pb = $('paletteBtn'), pl = $('paletteBtnL');
    if (pb) pb.style.boxShadow = 'inset 0 -3px 0 ' + colB;
    if (pl) pl.style.boxShadow = 'inset 0 -3px 0 ' + colF;
}

function buildColorPicker() {
    const colors = ['#ffffff', '#000000', '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#3b82f6', '#a78bfa', '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#fb7185', '#fbbf24', '#34d399', '#60a5fa', '#c084fc', '#f472b6', '#14b8a6', '#64748b'];
    const grid = $('cp-grid');
    if (grid) {
        grid.innerHTML = '';
        colors.forEach(c => {
            const sw = document.createElement('div'); sw.className = 'cp-swatch'; sw.style.background = c;
            sw.onclick = () => { setRegionColor(pickerRegion, c); closeAllMenus(); };
            grid.appendChild(sw);
        });
    }
    const ci = $('custom-color-input');
    if (ci) ci.addEventListener('input', e => { setRegionColor(pickerRegion, e.target.value); });
    const cs = $('cp-thickness-slider');
    if (cs) {
        cs.value = sz; const cvl = $('cp-thickness-val'); if (cvl) cvl.textContent = sz;
        cs.oninput = () => { sz = parseInt(cs.value); if (cvl) cvl.textContent = sz; };
    }
    document.querySelectorAll('.ls-btn').forEach(b => {
        b.onclick = () => { document.querySelectorAll('.ls-btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); lineStyle = b.dataset.style; };
    });
}

function buildFhPopup() {
    const colors = ['#fbbf24', '#84cc16', '#ec4899', '#f97316', '#3b82f6', '#a78bfa', '#22d3ee', '#f43f5e'];
    const grid = $('fh-color-grid'); if (!grid) return;
    grid.innerHTML = '';
    colors.forEach(c => {
        const sw = document.createElement('div'); sw.className = 'cp-swatch'; sw.style.background = c;
        sw.onclick = () => { setRegionColor(pickerRegion, c); };
        grid.appendChild(sw);
    });
    const s = $('fh-thickness-slider');
    if (s) {
        s.value = fhSzB;
        s.oninput = () => {
            const v = parseInt(s.value);
            if (pickerRegion === 'file') fhSzF = v; else fhSzB = v;
            const el = $('fh-thickness-val'); if (el) el.textContent = v;
        };
    }
    const o = $('fh-opacity-slider');
    if (o) {
        o.value = Math.round((1 - fhOpacityB) * 100);
        o.oninput = () => {
            const v = parseFloat(o.value);
            const op = 1 - v / 100;
            if (pickerRegion === 'file') fhOpacityF = op; else fhOpacityB = op;
            const el = $('fh-opacity-val'); if (el) el.textContent = v + '%';
        };
    }
}

// ============================================================
// ===== [14] — المايك والسماعة =====
// ============================================================
async function toggleMic() {
    const btn = $('lb-mic');
    if (micActive) {
        if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
        if (micAnimFrame) { cancelAnimationFrame(micAnimFrame); micAnimFrame = null; }
        if (audioContext) { audioContext.close(); audioContext = null; }
        micActive = false; if (btn) btn.classList.remove('mic-on');
        const bar = $('micLevelBar'); if (bar) bar.style.width = '0%';
        syncRecAudio();
        st('🎤 المايك: متوقف');
    } else {
        try {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const src = audioContext.createMediaStreamSource(micStream);
            analyser = audioContext.createAnalyser(); analyser.fftSize = 256; src.connect(analyser);
            micActive = true; if (btn) btn.classList.add('mic-on');
            function upd() {
                if (!micActive || !analyser) return;
                const d = new Uint8Array(analyser.frequencyBinCount); analyser.getByteFrequencyData(d);
                let sum = 0; for (let i = 0; i < d.length; i++) sum += d[i];
                const level = Math.min(100, (sum / d.length / 128) * 100);
                const bar = $('micLevelBar');
                if (bar) bar.style.width = level + '%';
                micAnimFrame = requestAnimationFrame(upd);
            }
            upd();
            syncRecAudio();
            st('🎤 المايك: يعمل');
        } catch (e) { st('❌ فشل المايك — اسمح للمتصفح باستخدام الميكروفون', 4000); }
    }
}

let speakerStream = null;
function stopSpeaker() {
    if (speakerStream) { speakerStream.getTracks().forEach(t => { try { t.onended = null; t.stop(); } catch (e) {} }); speakerStream = null; }
    speakerActive = false;
    const btn = $('lb-speaker'); if (btn) btn.classList.remove('spk-on');
    syncRecAudio();
}
async function toggleSpeaker() {
    const btn = $('lb-speaker');
    if (speakerActive) { stopSpeaker(); st('🔈 السماعة: متوقفة'); return; }
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) throw new Error('unsupported');
        const ds = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const at = ds.getAudioTracks();
        ds.getVideoTracks().forEach(t => t.stop());
        if (!at.length) { st('⚠️ لم يُشارَك الصوت — اختر تبويباً وفعّل «مشاركة صوت التبويب»', 6000); return; }
        speakerStream = new MediaStream(at);
        at[0].onended = () => { if (speakerStream) { stopSpeaker(); st('🔈 السماعة: توقفت المشاركة'); } };
        speakerActive = true; if (btn) btn.classList.add('spk-on');
        syncRecAudio();
        st('🔊 السماعة: تعمل (صوت الجهاز يُسجَّل)');
    } catch (e) { st('❌ تعذّر تشغيل السماعة (يلزم Chrome/Edge)', 4000); }
}

// ============================================================
// ===== [15] — التسجيل (MediaRecorder) =====
// ============================================================
let rec = null;
let lastRec = null;
let savingRec = false;
let recMode = 'board';
let recStarting = false;

function syncRecAudio() {
    if (!rec || !rec.ctx) return;

    if (micActive && micStream && !rec.micConnected) {
        try {
            rec.micSrc = rec.ctx.createMediaStreamSource(micStream);
            rec.micSrc.connect(rec.dest);
            rec.micConnected = true;
        } catch (e) { console.warn('mic connect failed', e); }
    } else if (!micActive && rec.micConnected) {
        try { rec.micSrc.disconnect(); } catch (e) {}
        rec.micSrc = null;
        rec.micConnected = false;
    }

    if (speakerActive && speakerStream && !rec.spkConnected) {
        try {
            rec.spkSrc = rec.ctx.createMediaStreamSource(speakerStream);
            rec.spkSrc.connect(rec.dest);
            rec.spkConnected = true;
        } catch (e) { console.warn('speaker connect failed', e); }
    } else if (!speakerActive && rec.spkConnected) {
        try { rec.spkSrc.disconnect(); } catch (e) {}
        rec.spkSrc = null;
        rec.spkConnected = false;
    }

    const audioTracks = rec.dest.stream.getAudioTracks();
    audioTracks.forEach(t => {
        if (!rec.stream.getAudioTracks().includes(t)) {
            try { rec.stream.addTrack(t); } catch (e) {}
        }
    });
}

const REC_CONTRAST = 1.2;
const REC_CONTRAST_WHOLE = false;
const REC_A4_W = 794, REC_A4_H = 1123;
const REC_QUALITY = 1.5;
const REC_MAX_PIXELS = 4000000;

function recPlanFrame() {
    const pg = document.querySelector('.a4-page');
    if (pg) {
        const p = pg.getBoundingClientRect();
        if (p.width > 50 && p.height >= (REC_A4_H * p.width / REC_A4_W) - 2) return { a4: true };
    }
    return { a4: false };
}

function recFrameRect(plan) {
    if (plan && plan.a4) {
        const pgA = document.querySelector('.a4-page');
        if (pgA) {
            const pa = pgA.getBoundingClientRect();
            return { x: pa.left, y: pa.top, w: pa.width, h: REC_A4_H * pa.width / REC_A4_W };
        }
    }
    const wrEl = boardWrapper;
    const wr = wrEl.getBoundingClientRect();
    const wl = wr.left + wrEl.clientLeft, wt = wr.top + wrEl.clientTop;
    const full = { x: wl, y: wt, w: wrEl.clientWidth, h: wrEl.clientHeight };
    const pg = document.querySelector('.a4-page');
    if (!pg) return full;
    const p = pg.getBoundingClientRect();
    const x = Math.max(wl, p.left), y = Math.max(wt, p.top);
    const r = Math.min(wl + full.w, p.right), b = Math.min(wt + full.h, p.bottom);
    if (r - x < 10 || b - y < 10) return full;
    return { x, y, w: r - x, h: b - y };
}

let _recGridCache = { key: '', layers: [] };
function recGridLayers() {
    const g = $('grid');
    if (!g) return [];
    const cs = getComputedStyle(g);
    if (cs.display === 'none') return [];
    const img = cs.backgroundImage || '', sz = cs.backgroundSize || '';
    const key = img + '|' + sz;
    if (_recGridCache.key === key) return _recGridCache.layers;

    const splitTop = str => {
        const out = []; let d = 0, cur = '';
        for (const ch of str) {
            if (ch === '(') d++;
            if (ch === ')') d--;
            if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
        }
        if (cur.trim()) out.push(cur.trim());
        return out;
    };

    const imgs = splitTop(img), sizes = splitTop(sz), layers = [];
    imgs.forEach((im, i) => {
        if (!/gradient/.test(im)) return;
        const szs = (sizes[i % Math.max(1, sizes.length)] || '20px 20px').split(/\s+/);
        const sw = parseFloat(szs[0]) || 20;
        const sh = parseFloat(szs[1] || szs[0]) || sw;
        const vertical = /to\s+(right|left)|(^|[^\d])(90|270)deg/.test(im);
        const cols = im.match(/rgba?\([^)]*\)/g) || [];
        let col = null;
        for (const cstr of cols) {
            const n = cstr.match(/[\d.]+/g).map(Number);
            const a = n.length > 3 ? n[3] : 1;
            if (a > 0.005) { col = [n[0], n[1], n[2], a]; break; }
        }
        if (col) layers.push({ vertical, period: vertical ? sw : sh, color: col });
    });
    _recGridCache = { key, layers };
    return layers;
}

function recDrawFrame() {
    if (!rec || !cv || !boardWrapper || !rec.canvas) return;
    const c = rec.canvas, o = rec.ctx2d;
    const F = recFrameRect(rec.plan);
    if (F.w < 10 || F.h < 10) return;

    o.imageSmoothingEnabled = true;
    o.imageSmoothingQuality = 'high';

    const R = c.width / F.w;
    const baseX = F.x, baseY = F.y;

    const bgNow = (getPage() && getPage().bg) || boardClr || '#0a101d';
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.globalAlpha = 1;
    o.fillStyle = bgNow;
    o.fillRect(0, 0, c.width, c.height);

    if (gridOn) {
        let hex = String(bgNow).replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('');
        const br = parseInt(hex.slice(0, 2), 16) || 0;
        const bgc = parseInt(hex.slice(2, 4), 16) || 0;
        const bb = parseInt(hex.slice(4, 6), 16) || 0;

        const gEl = $('grid');
        let layers = recGridLayers();
        let gx = 0, gy = 0, gw = c.width, gh = c.height, sg = 1;
        if (gEl) {
            const gr = gEl.getBoundingClientRect();
            if (gr.width > 10 && gr.height > 10) {
                gx = (gr.left - baseX) * R; gy = (gr.top - baseY) * R;
                gw = gr.width * R; gh = gr.height * R;
                sg = gEl.offsetWidth ? gr.width / gEl.offsetWidth : 1;
            }
        }
        const elOpacity = gEl ? (parseFloat(getComputedStyle(gEl).opacity) || 1) : 1;
        if (!layers.length) layers = [
            { vertical: true,  period: 20, color: [56, 189, 248, 0.18] },
            { vertical: false, period: 20, color: [56, 189, 248, 0.18] }
        ];

        const lw = Math.max(1, Math.round(sg * R));
        o.save();
        o.setTransform(1, 0, 0, 1, 0, 0);
        o.globalAlpha = 1;
        layers.forEach(L => {
            const a = Math.min(1, L.color[3] * elOpacity);
            const mix = (b, gv) => Math.round(b * (1 - a) + gv * a);
            o.fillStyle = 'rgb(' + mix(br, L.color[0]) + ',' + mix(bgc, L.color[1]) + ',' + mix(bb, L.color[2]) + ')';
            const p = Math.max(4, L.period * sg * R);
            if (L.vertical) {
                for (let x = gx; x < gx + gw - 1; x += p) o.fillRect(Math.round(x), Math.round(gy), lw, Math.round(gh));
                o.fillRect(Math.round(gx + gw - lw), Math.round(gy), lw, Math.round(gh));
            } else {
                for (let y = gy; y < gy + gh - 1; y += p) o.fillRect(Math.round(gx), Math.round(y), Math.round(gw), lw);
                o.fillRect(Math.round(gx), Math.round(gy + gh - lw), Math.round(gw), lw);
            }
        });
        o.restore();
    }

    const cr = cv.getBoundingClientRect();
    const sx = (cr.width / cv.width) * R, sy = (cr.height / cv.height) * R;
    const ox = (cr.left - baseX) * R, oy = (cr.top - baseY) * R;
    try {
        const L = rec.layer || (rec.layer = document.createElement('canvas'));
        if (L.width !== c.width || L.height !== c.height) { L.width = c.width; L.height = c.height; }
        const lx = L.getContext('2d');
        lx.setTransform(1, 0, 0, 1, 0, 0);
        lx.clearRect(0, 0, L.width, L.height);
        lx.imageSmoothingEnabled = true;
        lx.imageSmoothingQuality = 'high';
        lx.setTransform(sx, 0, 0, sy, ox, oy);

        const oldImgSel = selImageIdx;
        selImageIdx = -1;
        try {
            drawImagesOnCtx(lx, getImages());
            drawStrokesOnCtx(lx, getStrokes());
            if (currentShapePreview) drawShape(lx, currentShapePreview);

            if (typeof textEdit !== 'undefined' && textEdit) {
                const st0 = getStrokes()[textEdit.idx];
                if (st0 && st0.editing) {
                    st0.editing = false;
                    try { drawStrokesOnCtx(lx, [st0]); } finally { st0.editing = true; }
                }
            }
        } finally { selImageIdx = oldImgSel; }

        o.save();
        o.setTransform(1, 0, 0, 1, 0, 0);
        if (REC_CONTRAST !== 1 && !REC_CONTRAST_WHOLE) o.filter = 'contrast(' + REC_CONTRAST + ')';
        o.drawImage(L, 0, 0);
        o.restore();
    } catch (e) { console.warn('draw content failed:', e); }

    if (REC_CONTRAST !== 1 && REC_CONTRAST_WHOLE) {
        const t = rec.tmp || (rec.tmp = document.createElement('canvas'));
        if (t.width !== c.width || t.height !== c.height) { t.width = c.width; t.height = c.height; }
        const tx = t.getContext('2d');
        tx.setTransform(1, 0, 0, 1, 0, 0);
        tx.drawImage(c, 0, 0);
        o.save();
        o.setTransform(1, 0, 0, 1, 0, 0);
        o.filter = 'contrast(' + REC_CONTRAST + ')';
        o.drawImage(t, 0, 0);
        o.restore();
    }
}

function recPickMime() {
    const list = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    return list.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
}

function fmtRecTime(ms) {
    const t = Math.floor(ms / 1000), m = Math.floor(t / 60), s = t % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

async function startRecording() {
    if (rec || recStarting) return;
    if (lastRec && !lastRec.saved && !confirmTwice('rec', 'التسجيل السابق لم يُحفظ وسيُستبدل')) return;
    if (!window.MediaRecorder) { st('❌ المتصفح لا يدعم التسجيل', 4000); return; }
    recStarting = true;

    if (!micActive) {
        st('🎤 جاري تفعيل المايك...', 3000);
        try {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const src = audioContext.createMediaStreamSource(micStream);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            src.connect(analyser);
            micActive = true;
            const btn = $('lb-mic');
            if (btn) btn.classList.add('mic-on');
            (function upd() {
                if (!micActive || !analyser) return;
                const d = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(d);
                let sum = 0;
                for (let i = 0; i < d.length; i++) sum += d[i];
                const level = Math.min(100, (sum / d.length / 128) * 100);
                const bar = $('micLevelBar');
                if (bar) bar.style.width = level + '%';
                micAnimFrame = requestAnimationFrame(upd);
            })();
            st('🎤 المايك يعمل — بدء التسجيل', 2000);
        } catch (e) {
            st('❌ فشل تفعيل المايك: ' + e.message + ' — التسجيل سيكون بدون صوت', 5000);
        }
    }

    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC(), dest = ctx.createMediaStreamDestination();
    try { ctx.resume && ctx.resume(); } catch (e) {}
    try {
        const osc = ctx.createOscillator(), g = ctx.createGain();
        g.gain.value = 0;
        osc.connect(g); g.connect(dest);
        osc.start();
    } catch (e) {}

    let handedOver = false;
    try {
        let ds = null, vtrack = null, c = null, stream, plan = { a4: false };

        if (recMode === 'screen') {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                st('❌ تسجيل الشاشة يحتاج Chrome أو Edge', 5000);
                try { ctx.close(); } catch (e) {}
                return;
            }
            try {
                ds = await navigator.mediaDevices.getDisplayMedia({
                    video: { frameRate: 30 },
                    audio: true,
                    preferCurrentTab: true,
                    selfBrowserSurface: 'include',
                    systemAudio: 'include'
                });
            } catch (e) {
                st(e && e.name === 'NotAllowedError' ? 'تم إلغاء مشاركة الشاشة' : '❌ تعذّر تسجيل الشاشة', 3000);
                try { ctx.close(); } catch (e2) {}
                return;
            }
            vtrack = ds.getVideoTracks()[0];
            stream = new MediaStream([vtrack]);
        } else {
            if (!cv || !cv.captureStream) {
                st('❌ المتصفح لا يدعم التسجيل', 4000);
                try { ctx.close(); } catch (e) {}
                return;
            }
            c = document.createElement('canvas');
            plan = recPlanFrame();
            const F0 = recFrameRect(plan);
            let S = Math.max(1, window.devicePixelRatio || 1) * REC_QUALITY;
            const mp = F0.w * F0.h * S * S;
            if (mp > REC_MAX_PIXELS) S *= Math.sqrt(REC_MAX_PIXELS / mp);
            c.width  = Math.max(2, Math.round(F0.w * S) & ~1);
            c.height = Math.max(2, Math.round(F0.h * S) & ~1);
            c.getContext('2d', { alpha: false });
            stream = c.captureStream(0);
            vtrack = stream.getVideoTracks()[0];
        }

        try { if (vtrack && 'contentHint' in vtrack) vtrack.contentHint = 'detail'; } catch (e) {}
        try { ctx.resume && ctx.resume(); } catch (e) {}

        let dsSrc = null;
        if (ds && ds.getAudioTracks().length) {
            try {
                dsSrc = ctx.createMediaStreamSource(new MediaStream(ds.getAudioTracks()));
                dsSrc.connect(dest);
            } catch (e) {}
        }

        dest.stream.getAudioTracks().forEach(t => {
            try { stream.addTrack(t); } catch (e) {}
        });

        rec = {
            recorder: null, chunks: [], canvas: c, ctx2d: c ? c.getContext('2d') : null,
            ctx, dest, ds, hasTabAudio: !!dsSrc,
            micSrc: null, spkSrc: null, micConnected: false, spkConnected: false,
            stream: stream, t0: Date.now(), mime: '', bg: boardClr || '#0a101d', plan
        };

        syncRecAudio();

        const mime = recPickMime();
        let recorder;
        try {
            recorder = new MediaRecorder(stream, mime ? {
                mimeType: mime,
                videoBitsPerSecond: recMode === 'screen' ? 25000000 : 20000000,
                audioBitsPerSecond: 128000
            } : undefined);
        } catch (e) {
            try { ctx.close(); } catch (e2) {}
            if (ds) ds.getTracks().forEach(t => t.stop());
            rec = null;
            st('❌ تعذّر بدء التسجيل', 4000);
            return;
        }

        rec.recorder = recorder;
        rec.mime = recorder.mimeType || mime || 'video/webm';
        recorder.ondataavailable = e => { if (e.data && e.data.size && rec) rec.chunks.push(e.data); };
        recorder.onstop = () => finishRecording();
        if (ds) vtrack.onended = () => { if (rec) stopRecording(); };

        if (c) {
            recDrawFrame();
            rec.tick = setInterval(() => {
                recDrawFrame();
                if (rec && vtrack && vtrack.requestFrame && boardWrapper.clientWidth >= 10) {
                    try { vtrack.requestFrame(); } catch (e) {}
                }
            }, 1000 / 30);
        }

        rec.timer = setInterval(() => {
            if (!rec) return;
            const hasAudio = micActive || speakerActive || rec.hasTabAudio;
            st('⏺ تسجيل ' + fmtRecTime(Date.now() - rec.t0) +
               (micActive ? ' 🎤' : '') +
               (speakerActive || rec.hasTabAudio ? ' 🔊' : '') +
               (hasAudio ? '' : ' 🔇 بلا صوت'), 1500);
        }, 500);

        recorder.start(1000);
        const b = $('lb-record');
        if (b) { b.classList.add('rec-on'); b.title = 'إيقاف التسجيل'; }
        handedOver = true;
        updateRecModeBtn();

        if (ctx.state !== 'running') setTimeout(() => { try { ctx.resume(); } catch (e) {} }, 0);

        st('⏺ بدء التسجيل — ' + (recMode === 'board' ? 'السبورة' : 'الشاشة') + ' + 🎤 المايك', 3000);
    } finally {
        recStarting = false;
        if (!handedOver) { try { ctx.close(); } catch (e) {} }
    }
}

function stopRecording() {
    if (!rec) return;
    clearInterval(rec.tick); clearInterval(rec.timer);
    try {
        if (rec.recorder.state !== 'inactive') {
            try { rec.recorder.requestData(); } catch (e) {}
            rec.recorder.stop();
        }
    } catch (e) { finishRecording(); }
}

function finishRecording() {
    const r = rec; if (!r) return;
    rec = null;
    clearInterval(r.tick); clearInterval(r.timer);
    try { r.ctx.close(); } catch (e) {}
    if (r.ds) { r.ds.getTracks().forEach(t => { try { t.onended = null; t.stop(); } catch (e) {} }); }
    const b = $('lb-record'); if (b) { b.classList.remove('rec-on'); b.title = 'تسجيل السبورة'; }
    updateRecModeBtn();
    if (!r.chunks.length) { st('⚠️ التسجيل فارغ', 3000); return; }
    const blob = new Blob(r.chunks, { type: r.mime });
    const ext = /mp4/.test(r.mime) ? 'mp4' : 'webm';
    const name = 'record_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.' + ext;
    lastRec = { blob, name, ext, dur: Date.now() - r.t0, saved: false };
    updateSaveRecBtn();
    st('⏹ توقف التسجيل (' + fmtRecTime(lastRec.dur) + ') — اضغط زر «حفظ الفيديو» 💾', 8000);
}

function updateRecModeBtn() {
    const b = $('lb-rec-mode'); if (!b) return;
    b.classList.toggle('on', recMode === 'screen');
    b.style.opacity = (rec || recStarting) ? '0.4' : '1';
    b.title = recMode === 'screen'
        ? 'وضع التسجيل: الشاشة كاملة'
        : 'وضع التسجيل: منطقة الرسم فقط';
}

function updateSaveRecBtn() {
    const b = $('lb-save-rec'); if (!b) return;
    b.disabled = false;
    b.style.opacity = lastRec ? '1' : '0.45';
    b.classList.toggle('rec-unsaved', !!lastRec && !lastRec.saved);
    b.title = lastRec ? 'حفظ الفيديو: ' + lastRec.name + (lastRec.saved ? ' (محفوظ)' : '') : 'حفظ الفيديو (سجّل أولاً)';
}

async function saveRecording() {
    if (savingRec) return;
    if (!lastRec) { st('⚠️ سجّل فيديو أولاً', 3000); return; }
    savingRec = true;
    try {
        await saveRecordingInner();
    } finally {
        savingRec = false;
    }
}

async function saveRecordingInner() {
    const r = lastRec;
    const blobToSave = r.blob;

    try {
        if (window.showSaveFilePicker) {
            const h = await window.showSaveFilePicker({
                suggestedName: r.name,
                types: [{ description: 'WebM Video', accept: { 'video/webm': ['.webm'] } }]
            });
            const w = await h.createWritable();
            await w.write(blobToSave);
            await w.close();
            r.saved = true;
            updateSaveRecBtn();
            st('💾 تم الحفظ: ' + h.name, 5000);
            return;
        }
    } catch (e) {
        if (e && e.name === 'AbortError') { st('تم إلغاء الحفظ', 2000); return; }
        console.warn('showSaveFilePicker failed:', e);
    }

    const url = URL.createObjectURL(blobToSave);
    const a = document.createElement('a');
    a.href = url;
    a.download = r.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    r.saved = true;
    updateSaveRecBtn();
    st('💾 حُفظ الفيديو: ' + r.name, 5000);
}

function toggleRecording() { if (rec) stopRecording(); else startRecording(); }
// ============================================================
// ===== [16] — المؤشر والضغط والسحب =====
// ============================================================
const RESIZE_CURSORS = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'];
const HANDLE_DIRS = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];

function cursorForAngle(rad) {
    let d = rad * 180 / Math.PI;
    d = ((d % 180) + 180) % 180;
    return RESIZE_CURSORS[Math.round(d / 45) % 4];
}

function handleCursor(idx, shape) {
    if (idx === 8) return 'grab';
    const d = HANDLE_DIRS[idx]; if (!d) return 'move';
    return cursorForAngle(Math.atan2(d[1], d[0]) + (shape.rotation || 0));
}

function lineCursor(sh) {
    const a = sh.points[0], b = sh.points[1];
    return cursorForAngle(Math.atan2(b.y - a.y, b.x - a.x));
}

function updateCursor(e) {
    if (isResizing || !cv) return;
    let cur = '';
    if (drw && handleDrag && selStrokeIdx !== -1) {
        const sh = getStrokes()[selStrokeIdx];
        if (sh) {
            if (handleDrag.type === 'rotate' || handleDrag.type === 'tilt') cur = 'grabbing';
            else if (handleDrag.type === 'resize') cur = handleCursor(handleDrag.handleIdx, sh);
            else cur = 'none';
        }
    } else if (isDraggingImg) { cur = 'move'; }
    else if (isResizingImg) { cur = 'nwse-resize'; }
    else if (!drw && (tool === 'select' || tool === 'shape')) {
        const p = gp(e);
        const ii = hitTestImage(p.x, p.y);
        if (ii !== -1) {
            const img = getImages()[ii];
            cur = (Math.abs(p.x - (img.x + img.w)) < 15 && Math.abs(p.y - (img.y + img.h)) < 15) ? 'nwse-resize' : 'move';
        }
        if (!cur && selStrokeIdx !== -1 && (tool === 'select' || handlesOn)) {
            const sh = getStrokes()[selStrokeIdx];
            if (sh && ['arrow', 'double-arrow', 'line'].includes(sh.shape)) {
                const hs = getShapeHandles(sh);
                if (hs) for (let i = 0; i < hs.length; i++) {
                    if (Math.hypot(p.x - hs[i].x, p.y - hs[i].y) < 9) { cur = lineCursor(sh); break; }
                }
            } else if (sh && (sh.type === 'shape' || sh.type === 'text' || isFreeStroke(sh))) {
                const hi = hitTestHandle(p.x, p.y, sh);
                if (hi !== -1) cur = handleCursor(hi, sh);
            }
        }
        if (!cur && tool === 'shape' && handlesOn) {
            const arr = getStrokes();
            const selSh = selStrokeIdx !== -1 ? arr[selStrokeIdx] : null;
            if (selSh && hitShapeBody(p.x, p.y, selSh)) cur = isLineShape(selSh) ? MOVE_CURSOR : 'move';
        }
        if (!cur && tool === 'select') {
            const hi2 = hitTestStroke(p.x, p.y);
            if (hi2 !== -1) cur = isLineShape(getStrokes()[hi2]) ? MOVE_CURSOR : 'move';
        }
    }
    cv.style.cursor = cur || 'default';
}

function sDr(e) {
    if (e.target.closest('#bottom') || e.target.closest('#right-bar') || e.target.closest('#left-bar') ||
        e.target.closest('#info-strip') || e.target.closest('.dropdown-menu') ||
        e.target.closest('#color-picker-popup') || e.target.closest('#fh-popup') ||
        e.target.closest('#shape-dimensions') || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (!e.target.closest('#board-wrapper')) return;
    if (isResizing) return;
    closeAllMenus();

    const p = gp(e);
    if (isAreaMode) { areaSelection = { x1: p.x, y1: p.y, x2: p.x, y2: p.y }; drw = true; rdr(); return; }
    if (tool === 'eraser' || tool === 'eraser-fine') { su(); lastErasePt = null; eraseAlong(p.x, p.y, tool === 'eraser-fine'); drw = true; return; }

    if (tool === 'select') {
        const ii = hitTestImage(p.x, p.y);
        if (ii !== -1) {
            selImageIdx = ii; selStrokeIdx = -1;
            const img = getImages()[ii];
            su(); startImgAttach(img);
            if (Math.abs(p.x - (img.x + img.w)) < 15 && Math.abs(p.y - (img.y + img.h)) < 15) isResizingImg = true;
            else { isDraggingImg = true; imgDragOffsetX = p.x - img.x; imgDragOffsetY = p.y - img.y; }
            rdr(); return;
        }
        if (selStrokeIdx !== -1) {
            const sh = getStrokes()[selStrokeIdx];
            if (sh && ['arrow', 'double-arrow', 'line'].includes(sh.shape)) {
                const hs = getShapeHandles(sh);
                if (hs) for (let i = 0; i < hs.length; i++) {
                    if (Math.hypot(p.x - hs[i].x, p.y - hs[i].y) < 9) {
                        su();
                        handleDrag = { type: 'move', anchorType: hs[i].anchorType, startX: p.x, startY: p.y, origPoints: JSON.parse(JSON.stringify(sh.points)), origRotation: sh.rotation || 0 };
                        drw = true; rdr(); return;
                    }
                }
            }
        }
        if (selStrokeIdx !== -1) {
            const sh = getStrokes()[selStrokeIdx];
            if (sh && (sh.type === 'shape' || sh.type === 'text' || isFreeStroke(sh)) && !['arrow', 'double-arrow', 'line'].includes(sh.shape)) {
                const hi = hitTestHandle(p.x, p.y, sh);
                if (hi !== -1) {
                    su();
                    handleDrag = { type: hi === 8 ? (e.shiftKey ? 'tilt' : 'rotate') : 'resize', handleIdx: hi, startX: p.x, startY: p.y, origPoints: sh.points ? JSON.parse(JSON.stringify(sh.points)) : null, origX: sh.x, origY: sh.y, origRotation: sh.rotation || 0, origSz: sh.sz };
                    drw = true; return;
                }
            }
        }
        const si = hitTestStroke(p.x, p.y);
        if (si !== -1) {
            const wasSel = (si === selStrokeIdx);
            su(); selStrokeIdx = si; selImageIdx = -1;
            const sh = getStrokes()[si];
            if (sh) handleDrag = { type: 'move', wasSel: wasSel, moved: false, startX: p.x, startY: p.y, origPoints: sh.points ? JSON.parse(JSON.stringify(sh.points)) : null, origX: sh.x, origY: sh.y, origRotation: sh.rotation || 0 };
            drw = true; rdr(); return;
        }
        selStrokeIdx = -1; selImageIdx = -1; hideDimensions(); setTool('pen'); rdr(); return;
    }

    if (tool === 'text') {
        e.preventDefault();
        const arr = getStrokes(), hi = hitTestStroke(p.x, p.y);
        if (hi !== -1 && arr[hi].type === 'text') { startTextEdit(hi, false); return; }
        su();
        const fs = sz * 4;
        arr.push({ type: 'text', text: '', x: p.x, y: p.y, w: 220, h: fs * TEXT_LH + 10, color: col, sz: fs, rotation: 0 });
        selStrokeIdx = arr.length - 1;
        if (handlesOn) tool = 'select';
        startTextEdit(selStrokeIdx, true);
        return;
    }

    if (tool === 'shape' && shp) {
        if (handlesOn) {
            const arr = getStrokes();
            const selSh = selStrokeIdx !== -1 ? arr[selStrokeIdx] : null;
            if (selSh && selSh.type === 'shape') {
                const snap = () => ({ startX: p.x, startY: p.y, origPoints: JSON.parse(JSON.stringify(selSh.points)), origX: selSh.x, origY: selSh.y, origRotation: selSh.rotation || 0, origSz: selSh.sz });
                if (isLineShape(selSh)) {
                    const hs = getShapeHandles(selSh);
                    for (let i = 0; i < hs.length; i++) if (Math.hypot(p.x - hs[i].x, p.y - hs[i].y) < 9) {
                        su(); handleDrag = { type: 'move', anchorType: hs[i].anchorType, ...snap() };
                        drw = true; showDimensions(); rdr(); return;
                    }
                } else {
                    const hi = hitTestHandle(p.x, p.y, selSh);
                    if (hi !== -1) {
                        su(); handleDrag = { type: hi === 8 ? (e.shiftKey ? 'tilt' : 'rotate') : 'resize', handleIdx: hi, ...snap() };
                        drw = true; showDimensions(); rdr(); return;
                    }
                }
            }
            let hitIdx = -1;
            if (selSh && (hitShapeNear(p.x, p.y, selSh) || hitShapeBody(p.x, p.y, selSh))) hitIdx = selStrokeIdx;
            if (hitIdx !== -1) {
                su(); selStrokeIdx = hitIdx; selImageIdx = -1;
                const sh = arr[hitIdx];
                handleDrag = { type: 'move', startX: p.x, startY: p.y, origPoints: JSON.parse(JSON.stringify(sh.points)), origX: sh.x, origY: sh.y, origRotation: sh.rotation || 0 };
                drw = true; showDimensions(); rdr(); return;
            }
        }
        selStrokeIdx = -1;
        drw = true; su();
        shapeStartPoint = { x: p.x, y: p.y };
        currentShapePreview = { type: 'shape', shape: shp, hlAlpha: hlAlphaDefault, points: [{ x: p.x, y: p.y }, { x: p.x, y: p.y }], color: col, sz: sz, lineStyle: lineStyle, opacity: opacity, fill: fillEnabled ? col : null, rotation: 0 };
        showDimensions();
        rdr(); return;
    }

    drw = true; su();
    const arr = getStrokes();
    let ns = { color: col, sz: sz, lineStyle: lineStyle, opacity: opacity };
    if (tool === 'fh') ns = { ...ns, type: 'fh', sz: fhSzB, fhOpacity: fhOpacityB, points: [{ x: p.x, y: p.y }] };
    else ns = { ...ns, type: 'free', points: [{ x: p.x, y: p.y }] };
    arr.push(ns); rdr();
}

function mDr(e) {
    if (isResizing) return;
    if (isDraggingImg && selImageIdx !== -1) {
        const p = gpBoard(e); const img = getImages()[selImageIdx];
        img.x = p.x - imgDragOffsetX; img.y = p.y - imgDragOffsetY; applyImgAttach(img, 'move'); rdr(); return;
    }
    if (isResizingImg && selImageIdx !== -1) {
        const p = gpBoard(e); const img = getImages()[selImageIdx];
        img.w = Math.max(50, p.x - img.x); img.h = Math.max(50, p.y - img.y); applyImgAttach(img, 'scale'); rdr(); return;
    }
    if (!drw) return;
    if (isAreaMode) { const p = gp(e); areaSelection.x2 = p.x; areaSelection.y2 = p.y; rdr(); return; }

    const p = gp(e);
    if (handleDrag && selStrokeIdx !== -1) {
        const sh = getStrokes()[selStrokeIdx]; if (!sh) return;
        if (handleDrag.type === 'tilt') {
            if (handleDrag.origTx === undefined) { handleDrag.origTx = sh.tiltX || 0; handleDrag.origTy = sh.tiltY || 0; }
            setTilt(sh, handleDrag.origTx - (p.y - handleDrag.startY) * 0.5, handleDrag.origTy + (p.x - handleDrag.startX) * 0.5, handleDrag);
        } else if (handleDrag.type === 'rotate') {
            if (isFreeStroke(sh)) rotateFree(sh, handleDrag, p); else rotateShape(sh, p);
        } else if (handleDrag.type === 'resize') {
            if (isFreeStroke(sh)) resizeFree(sh, handleDrag, p);
            else if (sh.type === 'text') resizeText(sh, handleDrag, p);
            else if (sh.type === 'shape' && sh.points) resizeShape(sh, handleDrag, p);
        } else if (handleDrag.type === 'move') {
            const dx = p.x - handleDrag.startX, dy = p.y - handleDrag.startY;
            if (Math.abs(dx) + Math.abs(dy) > 3) handleDrag.moved = true;
            if (['arrow', 'double-arrow', 'line'].includes(sh.shape)) {
                if (handleDrag.anchorType === 'start') sh.points[0] = { x: handleDrag.origPoints[0].x + dx, y: handleDrag.origPoints[0].y + dy };
                else if (handleDrag.anchorType === 'end') sh.points[1] = { x: handleDrag.origPoints[1].x + dx, y: handleDrag.origPoints[1].y + dy };
                else sh.points = handleDrag.origPoints.map(pt => ({ x: pt.x + dx, y: pt.y + dy }));
            } else {
                if (sh.points) sh.points = handleDrag.origPoints.map(pt => ({ x: pt.x + dx, y: pt.y + dy }));
                else if (sh.x !== undefined) { sh.x = handleDrag.origX + dx; sh.y = handleDrag.origY + dy; }
            }
        }
        rdr(); return;
    }

    if (tool === 'eraser' || tool === 'eraser-fine') { eraseAlong(p.x, p.y, tool === 'eraser-fine'); rdr(); return; }
    if (tool === 'shape' && shapeStartPoint) {
        currentShapePreview.points[1] = currentShapePreview.shape === 'sq' ? constrainSquare(shapeStartPoint, p) : { x: p.x, y: p.y };
        updateDimensions(currentShapePreview);
        rdr(); return;
    }

    const arr = getStrokes(), cur = arr[arr.length - 1];
    if (cur && cur.points) { cur.points.push({ x: p.x, y: p.y }); rdr(); }
}

function finishAreaCopy(a) {
    if (!a) return;
    const x1 = Math.min(a.x1, a.x2), y1 = Math.min(a.y1, a.y2);
    const w = Math.abs(a.x2 - a.x1), h = Math.abs(a.y2 - a.y1);
    if (w < 6 || h < 6) { st('⚠️ المنطقة صغيرة جداً', 2000); return; }
    const out = document.createElement('canvas'), o = out.getContext('2d');
    try {
        out.width = Math.max(1, Math.round(w)); out.height = Math.max(1, Math.round(h));
        o.fillStyle = boardClr || '#0a101d'; o.fillRect(0, 0, out.width, out.height);
        o.drawImage(cv, x1, y1, w, h, 0, 0, out.width, out.height);
    } catch (err) { console.error(err); st('❌ تعذّر نسخ المنطقة'); return; }
    const src = out.toDataURL('image/png');
    let dw = w, dh = h;
    if (dw > 600) { dh = dh * 600 / dw; dw = 600; }
    _clipboard = { type: 'image', data: { src, x: Math.max(0, x1), y: Math.max(0, y1), w: dw, h: dh, rotation: 0 }, n: 0 };
    try {
        if (navigator.clipboard && window.ClipboardItem) out.toBlob(b => {
            if (!b) return;
            if (_clipboard) _clipboard.sz = b.size;
            navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]).catch(() => {});
        }, 'image/png');
    } catch (e) {}
    st('📋 تم نسخ المنطقة — اضغط لصق', 3000);
}

function eDr() {
    if (isAreaMode && drw) { const a = areaSelection; drw = false; isAreaMode = false; areaSelection = null; rdr(); finishAreaCopy(a); return; }
    const hd = handleDrag;
    if (drw && (tool === 'pen' || tool === 'fh')) {
        const arr = getStrokes(), last = arr[arr.length - 1];
        if (last && last.points && last.points.length > 0) {
            let md = 0; const first = last.points[0];
            for (let i = 1; i < last.points.length; i++) { const d = Math.hypot(last.points[i].x - first.x, last.points[i].y - first.y); if (d > md) md = d; }
            if (md < 4) {
                last.points = [first];
                if (tool === 'pen') last.type = 'dot';
                else if (tool === 'fh') last.type = 'fh-dot';
            }
        }
    }
    if (tool === 'shape' && shapeStartPoint && currentShapePreview) {
        const end = currentShapePreview.points[1];
        if (Math.abs(end.x - shapeStartPoint.x) > 3 || Math.abs(end.y - shapeStartPoint.y) > 3) {
            getStrokes().push({ ...currentShapePreview });
            selStrokeIdx = handlesOn ? getStrokes().length - 1 : -1;
            if (!handlesOn) hideDimensions();
            updateDimensions(currentShapePreview);
        }
    }
    const wasDrw = drw;
    shapeStartPoint = null; currentShapePreview = null; handleDrag = null;
    drw = false; isDraggingImg = false; isResizingImg = false; imgAttach = null;
    lastErasePt = null; rdr();
    if (wasDrw) broadcastBoardState();
    if (hd && hd.type === 'move' && hd.wasSel && !hd.moved && selStrokeIdx !== -1) {
        const ts = getStrokes()[selStrokeIdx];
        if (ts && ts.type === 'text') startTextEdit(selStrokeIdx, false);
    }
}

function resizeText(sh, hd, p) {
    if (hd.ow === undefined) { const b = textBox(sh); hd.ow = b.w; hd.oh = b.h; }
    const c0 = { x: hd.origX, y: hd.origY }, rot = hd.origRotation || 0, idx = hd.handleIdx;
    const loc = q => rotatePoint(q.x, q.y, c0.x, c0.y, -rot);
    const lp = loc(p), ls = loc({ x: hd.startX, y: hd.startY }), dx = lp.x - ls.x, dy = lp.y - ls.y;
    let x0 = c0.x - hd.ow / 2, x1 = c0.x + hd.ow / 2, y0 = c0.y - hd.oh / 2, y1 = c0.y + hd.oh / 2;
    const L = [0, 6, 7].includes(idx), R = [2, 3, 4].includes(idx), T = [0, 1, 2].includes(idx), B = [4, 5, 6].includes(idx);
    if (L) x0 += dx; if (R) x1 += dx; if (T) y0 += dy; if (B) y1 += dy;
    const minW = 40, minH = (sh.sz || 16) * 1.5;
    let w = Math.max(minW, Math.abs(x1 - x0)), h = Math.max(minH, Math.abs(y1 - y0));
    const nx0 = L ? Math.max(x0, x1) - w : Math.min(x0, x1), ny0 = T ? Math.max(y0, y1) - h : Math.min(y0, y1);
    const cl = { x: nx0 + w / 2, y: ny0 + h / 2 }, cw = rotatePoint(cl.x, cl.y, c0.x, c0.y, rot);
    sh.x = cw.x; sh.y = cw.y; sh.w = w; sh.h = h;
}

function resizeCircle(shape, hd, p) {
    const o = hd.origPoints, c = o[0], r = Math.max(Math.hypot(o[1].x - c.x, o[1].y - c.y), 1), idx = hd.handleIdx;
    const t = tiltScale(shape);
    const loc = q => ({ x: c.x + (q.x - c.x) / t.sx, y: c.y + (q.y - c.y) / t.sy });
    const lp = loc(p), ls = loc({ x: hd.startX, y: hd.startY });
    const dx = lp.x - ls.x, dy = lp.y - ls.y;
    let x0 = c.x - r, x1 = c.x + r, y0 = c.y - r, y1 = c.y + r;
    if ([0, 6, 7].includes(idx)) x0 += dx;
    if ([2, 3, 4].includes(idx)) x1 += dx;
    if ([0, 1, 2].includes(idx)) y0 += dy;
    if ([4, 5, 6].includes(idx)) y1 += dy;
    const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0), lx = Math.min(x0, x1), ly = Math.min(y0, y1);
    const D = Math.max(([3, 7].includes(idx) ? w : [1, 5].includes(idx) ? h : Math.max(w, h)), 2);
    const L = [0, 6, 7].includes(idx), R = [2, 3, 4].includes(idx), T = [0, 1, 2].includes(idx), B = [4, 5, 6].includes(idx);
    const rx1 = lx + w, ry1 = ly + h;
    const nx = L ? rx1 - D : (R ? lx : lx + (w - D) / 2), ny = T ? ry1 - D : (B ? ly : ly + (h - D) / 2);
    const nc = { x: c.x + (nx + D / 2 - c.x) * t.sx, y: c.y + (ny + D / 2 - c.y) * t.sy };
    shape.points = [nc, { x: nc.x + D / 2, y: nc.y }];
}

function resizeShape(shape, hd, p) {
    if (shape.shape === 'cr') { resizeCircle(shape, hd, p); return; }
    const orig = hd.origPoints, idx = hd.handleIdx;
    const ox0 = Math.min(orig[0].x, orig[1].x), ox1 = Math.max(orig[0].x, orig[1].x);
    const oy0 = Math.min(orig[0].y, orig[1].y), oy1 = Math.max(orig[0].y, orig[1].y);
    const cx = (ox0 + ox1) / 2, cy = (oy0 + oy1) / 2;
    const tl = tiltScale(shape);
    const loc = q => rotatePoint(cx + (q.x - cx) / tl.sx, cy + (q.y - cy) / tl.sy, cx, cy, -hd.origRotation);
    const lp = loc(p), ls = loc({ x: hd.startX, y: hd.startY });
    const ldx = lp.x - ls.x, ldy = lp.y - ls.y;
    let x0 = ox0, x1 = ox1, y0 = oy0, y1 = oy1;
    if ([0, 6, 7].includes(idx)) x0 += ldx;
    if ([2, 3, 4].includes(idx)) x1 += ldx;
    if ([0, 1, 2].includes(idx)) y0 += ldy;
    if ([4, 5, 6].includes(idx)) y1 += ldy;
    const nx0 = Math.min(x0, x1), nx1 = Math.max(x0, x1), ny0 = Math.min(y0, y1), ny1 = Math.max(y0, y1);
    let fx0 = nx0, fx1 = nx1, fy0 = ny0, fy1 = ny1;
    if (shape.shape === 'sq') {
        const w = nx1 - nx0, h = ny1 - ny0;
        const side = Math.max(([3, 7].includes(idx) ? w : [1, 5].includes(idx) ? h : Math.max(w, h)), 1);
        const L = [0, 6, 7].includes(idx), R = [2, 3, 4].includes(idx), T = [0, 1, 2].includes(idx), B = [4, 5, 6].includes(idx);
        fx0 = L ? nx1 - side : (R ? nx0 : nx0 + (w - side) / 2);
        fy0 = T ? ny1 - side : (B ? ny0 : ny0 + (h - side) / 2);
        fx1 = fx0 + side; fy1 = fy0 + side;
    }
    const flipX = orig[0].x > orig[1].x, flipY = orig[0].y > orig[1].y;
    shape.points = [
        { x: flipX ? fx1 : fx0, y: flipY ? fy1 : fy0 },
        { x: flipX ? fx0 : fx1, y: flipY ? fy0 : fy1 }
    ];
}

function rotateFree(sh, hd, p) {
    const r = rawBBox(hd.origPoints), c = { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 };
    const d = Math.atan2(p.y - c.y, p.x - c.x) - Math.atan2(hd.startY - c.y, hd.startX - c.x);
    if (hd.origVrot === undefined) hd.origVrot = sh.vrot || 0;
    sh.vrot = hd.origVrot + d;
    sh.points = hd.origPoints.map(pt => rotatePoint(pt.x, pt.y, c.x, c.y, d));
}

function resizeFree(sh, hd, p) {
    const o = hd.origPoints, r = rawBBox(o), idx = hd.handleIdx;
    const dx = p.x - hd.startX, dy = p.y - hd.startY;
    let x0 = r.x0, y0 = r.y0, x1 = r.x1, y1 = r.y1;
    if ([0, 6, 7].includes(idx)) x0 += dx;
    if ([2, 3, 4].includes(idx)) x1 += dx;
    if ([0, 1, 2].includes(idx)) y0 += dy;
    if ([4, 5, 6].includes(idx)) y1 += dy;
    const ow = r.x1 - r.x0, oh = r.y1 - r.y0;
    sh.points = o.map(pt => ({
        x: ow > 0 ? x0 + (pt.x - r.x0) / ow * (x1 - x0) : pt.x + (x0 - r.x0) + (x1 - r.x1),
        y: oh > 0 ? y0 + (pt.y - r.y0) / oh * (y1 - y0) : pt.y + (y0 - r.y0) + (y1 - r.y1)
    }));
}

function rotateShape(shape, p) {
    const c = getShapeCenter(shape); if (!c) return;
    shape.rotation = Math.atan2(p.y - c.y, p.x - c.x) + Math.PI / 2;
}

// ============================================================
// ===== [17] — النسخ واللصق =====
// ============================================================
function copySelection() {
    endTextEdit();
    const strokes = getStrokes();
    if (selStrokeIdx !== -1 && strokes[selStrokeIdx]) {
        const c = JSON.parse(JSON.stringify(strokes[selStrokeIdx]));
        delete c.editing;
        _clipboard = { type: 'stroke', data: c, n: 0 };
    } else if (selImageIdx !== -1) {
        const img = getImages()[selImageIdx];
        if (img) _clipboard = { type: 'image', data: JSON.parse(JSON.stringify(img)), n: 0 };
    } else { st('⚠️ حدد عنصراً أولاً (أداة Select)', 2500); return false; }
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(CLIP_MARK).catch(() => {}); } catch (e) {}
    st('📋 تم النسخ', 2000);
    return true;
}

function createTextFromString(txt) {
    col = colB;
    const arr = getStrokes();
    su();
    const fs = sz * 4;
    arr.push({ type: 'text', text: txt, x: 200, y: 120, w: 300, h: fs * TEXT_LH + 10, color: col, sz: fs, rotation: 0 });
    setTool('select');
    selStrokeIdx = arr.length - 1;
    rdr();
    broadcastBoardState();
}

function pasteFromClipboard() {
    if (!_clipboard) { st('⚠️ لا يوجد شيء في الحافظة', 2500); return false; }
    endTextEdit();
    _clipboard.n = (_clipboard.n || 0) + 1;
    const off = 30 * _clipboard.n;
    if (_clipboard.type === 'stroke') {
        su();
        const s = JSON.parse(JSON.stringify(_clipboard.data));
        if (s.points) s.points = s.points.map(pt => ({ x: pt.x + off, y: pt.y + off }));
        else if (s.x !== undefined) { s.x += off; s.y += off; }
        getStrokes().push(s);
        setTool('select');
        selStrokeIdx = getStrokes().length - 1; selImageIdx = -1;
        st('📋 تم اللصق', 1500);
        rdr();
        broadcastBoardState();
        return true;
    }
    if (_clipboard.type === 'image') {
        su();
        const im = JSON.parse(JSON.stringify(_clipboard.data));
        im.x += off; im.y += off;
        if (!imageCache[im.src]) { const img = new Image(); img.src = im.src; img.onload = () => rdr(); imageCache[im.src] = img; }
        getImages().push(im);
        setTool('select');
        selImageIdx = getImages().length - 1; selStrokeIdx = -1;
        st('📋 تم لصق الصورة', 1500);
        rdr();
        broadcastBoardState();
        return true;
    }
    return false;
}

function insertIntoTextEditor(txt) {
    const ed = $('text-editor'); if (!textEdit || !ed || !txt) return false;
    let v = ed.value === ' ' ? '' : ed.value;
    const a = ed.value === ' ' ? 0 : ed.selectionStart, z = ed.value === ' ' ? 0 : ed.selectionEnd;
    ed.value = v.slice(0, a) + txt + v.slice(z);
    const pos = a + txt.length; ed.focus(); ed.setSelectionRange(pos, pos);
    ed.dispatchEvent(new Event('input'));
    return true;
}

async function pasteAny() {
    if (textEdit) {
        let txt = (_clipboard && _clipboard.type === 'stroke' && _clipboard.data.type === 'text') ? _clipboard.data.text : '';
        if (!txt) { try { txt = await navigator.clipboard.readText(); } catch (e) {} if (txt === CLIP_MARK) txt = ''; }
        if (txt && insertIntoTextEditor(txt)) return;
        st('⚠️ لا يوجد نص للصق', 2000); return;
    }
    let sysErr = false;
    try {
        const items = await navigator.clipboard.read();
        for (const it of items) {
            const t = it.types.find(x => x.startsWith('image/'));
            if (t) {
                const b = await it.getType(t);
                if (_clipboard && _clipboard.type === 'image' && _clipboard.sz && _clipboard.sz === b.size) { pasteFromClipboard(); return; }
                addImageToBoard(new File([b], 'p.png', { type: t }));
                return;
            }
        }
        for (const it of items) if (it.types.includes('text/plain')) {
            const txt = await (await it.getType('text/plain')).text();
            if (txt === CLIP_MARK) break;
            if (txt && txt.trim() && !_clipboard) { createTextFromString(txt); return; }
        }
    } catch (e) { sysErr = true; }
    if (_clipboard) { pasteFromClipboard(); return; }
    st(sysErr ? '⚠️ المتصفح منع قراءة الحافظة — اضغط Ctrl+V' : '⚠️ لا يوجد شيء للصق', 4000);
}

function addImageToBoard(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
        const nw = img.naturalWidth, nh = img.naturalHeight;
        const finish = (dataUrl) => {
            let w = nw, h = nh;
            if (w > 600) { const ra = 600 / w; w = 600; h = h * ra; }
            su();
            getImages().push({ src: dataUrl, x: 100, y: 100, w, h, rotation: 0 });
            selImageIdx = getImages().length - 1;
            selStrokeIdx = -1;
            tool = 'select'; rdr();
            URL.revokeObjectURL(url);
            broadcastBoardState();
        };
        const MAXD = 1600;
        const shrink = !/svg|gif/.test(file.type) && (file.size > 600 * 1024 || Math.max(nw, nh) > MAXD);
        if (shrink) {
            const k = Math.min(1, MAXD / Math.max(nw, nh));
            const c = document.createElement('canvas');
            c.width = Math.max(1, Math.round(nw * k)); c.height = Math.max(1, Math.round(nh * k));
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            let out = c.toDataURL('image/webp', 0.85);
            if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/png');
            finish(out);
        } else {
            const r = new FileReader();
            r.onload = e => finish(e.target.result);
            r.readAsDataURL(file);
        }
    };
    img.onerror = () => { URL.revokeObjectURL(url); st('❌ تعذّر فتح الصورة'); };
    img.src = url;
}

// مستمعو Ctrl+C/X/V
document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = (e.key || '').toLowerCase();
    if (k === 'c' && !window.getSelection().toString()) {
        if (selStrokeIdx !== -1 || selImageIdx !== -1) { e.preventDefault(); copySelection(); }
    }
    if (k === 'x') {
        if (selStrokeIdx !== -1 || selImageIdx !== -1) {
            e.preventDefault();
            if (copySelection()) {
                su();
                if (selImageIdx !== -1) { getImages().splice(selImageIdx, 1); selImageIdx = -1; }
                else { getStrokes().splice(selStrokeIdx, 1); selStrokeIdx = -1; }
                hideDimensions(); rdr(); broadcastBoardState();
            }
        }
    }
});

document.addEventListener('paste', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const cd = e.clipboardData;
    const txt = cd ? (cd.getData('text/plain') || '') : '';
    const items = cd && cd.items ? Array.from(cd.items) : [];
    if (txt === CLIP_MARK && _clipboard) { e.preventDefault(); pasteFromClipboard(); return; }
    const imgItem = items.find(i => i.type && i.type.startsWith('image/'));
    if (imgItem) {
        const f = imgItem.getAsFile();
        if (f && _clipboard && _clipboard.type === 'image' && _clipboard.sz && _clipboard.sz === f.size) { e.preventDefault(); pasteFromClipboard(); return; }
        if (f) { e.preventDefault(); addImageToBoard(f); return; }
    }
    if (txt && txt.trim() && txt !== CLIP_MARK) { e.preventDefault(); createTextFromString(txt); return; }
    if (_clipboard) { e.preventDefault(); pasteFromClipboard(); }
});

// ============================================================
// ===== [18] — الحفظ JSON =====
// ============================================================
async function saveAsJSON() {
    endTextEdit();
    _saveTitleNow();
    const data = {
        app: "Physics4U - غرفة السبورة",
        version: "9.0",
        timestamp: new Date().toISOString(),
        whiteboard: {
            currentPage,
            pages: pages.map(pg => ({
                title: pg.title || '',
                strokes: JSON.parse(JSON.stringify(pg.strokes || [])),
                images: (pg.images || []).map(im => ({ src: im.src, x: im.x, y: im.y, w: im.w, h: im.h, rotation: im.rotation || 0 })),
                bg: pg.bg || '#0a101d'
            })),
            boardClr
        }
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const title = (getPage() && getPage().title) || 'sabbora';
    a.href = url;
    a.download = title.replace(/[^\w\u0600-\u06FF\-]/g, '_') + '_' + Date.now() + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    const nb = pages.reduce((n, p) => n + (p.strokes ? p.strokes.length : 0) + (p.images ? p.images.length : 0), 0);
    st('💾 حُفظ الملف (' + pages.length + ' صفحة، ' + nb + ' عنصر)');
    dirty = false;
}

// ============================================================
// ===== [19] — Firebase: البث المباشر + الحضور =====
// ============================================================
function initFirebaseSession() {
    const user = auth.currentUser;
    if (!user) return;

    // 1) تسجيل المعلم كمتصل
    const presenceRef = dbRef(database, 'live_session/teacher');
    set(presenceRef, { online: true, since: Date.now() });
    onDisconnect(presenceRef).remove();

    // 2) الاستماع لقائمة الطلاب
    const studentsRef = dbRef(database, 'live_session/students');
    if (unsubStudents) unsubStudents();
    unsubStudents = onValue(studentsRef, (snap) => {
        const list = snap.val() || {};
        renderStudentList(list);
    });

    // 3) بث الحالة الحالية عند البدء
    setTimeout(() => broadcastBoardState(true), 800);
}

function broadcastBoardState(force) {
    if (!database) return;
    const user = auth.currentUser;
    if (!user) return;

    // نبث كل الصفحات (بما فيها الرسومات والصور)
    const payload = {
        currentPage: currentPage,
        pages: pages.map(p => ({
            strokes: p.strokes || [],
            images: (p.images || []).map(im => ({ src: im.src, x: im.x, y: im.y, w: im.w, h: im.h, rotation: im.rotation || 0 })),
            bg: p.bg || '#0a101d',
            title: p.title || ''
        })),
        ts: Date.now()
    };

    // حد أقصى 1 ميغا — لو تجاوز نقسم أو نتجاهل
    try {
        const s = JSON.stringify(payload);
        if (s.length > 5 * 1024 * 1024) {
            console.warn('board state too large to broadcast', s.length);
            return;
        }
    } catch (e) { return; }

    set(dbRef(database, 'live_session/board'), payload).catch(err => {
        console.warn('broadcast failed', err);
    });
}

function renderStudentList(list) {
    const ul = document.getElementById('studentList');
    const countEl = document.getElementById('studentCount');
    if (!ul) return;
    const arr = Object.entries(list).map(([uid, v]) => ({ uid, ...v }));
    if (countEl) countEl.textContent = arr.length;
    if (!arr.length) {
        ul.innerHTML = '<li class="empty">لا يوجد طلاب متصلون</li>';
        return;
    }
    ul.innerHTML = arr.map(s => `
        <li class="student">
            <span class="avatar">👤</span>
            <span>${escapeHtml(s.name || 'طالب')}</span>
            <span class="mic ${s.mic ? '' : 'muted'}">${s.mic ? '🎤' : '🔇'}</span>
        </li>
    `).join('');
}

function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// ============================================================
// ===== [20] — خطة الدرس التفاعلية =====
// ============================================================
function initLessonPlanInteractive() {
    const list = document.getElementById('lessonSteps');
    const addBtn = document.getElementById('addStepBtn');
    if (!list) return;

    const saved = localStorage.getItem('lesson_plan');
    if (saved) {
        try {
            const steps = JSON.parse(saved);
            list.innerHTML = '';
            steps.forEach(s => addStepToList(s.text, s.done, s.active));
        } catch (e) { /* ignore */ }
    }

    list.addEventListener('click', e => {
        if (e.target.classList.contains('del-step')) {
            e.target.closest('.step').remove();
            saveLessonPlan();
            return;
        }
        if (e.target.classList.contains('step-check') || e.target.tagName === 'SPAN') {
            const step = e.target.closest('.step');
            if (step) {
                if (e.target.classList.contains('step-check')) {
                    step.classList.toggle('done', e.target.checked);
                    saveLessonPlan();
                } else {
                    list.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
                    step.classList.add('active');
                    saveLessonPlan();
                }
            }
        }
    });

    list.addEventListener('blur', e => {
        if (e.target.tagName === 'SPAN' && e.target.hasAttribute('contenteditable')) {
            saveLessonPlan();
        }
    }, true);

    if (addBtn) {
        addBtn.onclick = () => {
            addStepToList('خطوة جديدة', false, false);
            saveLessonPlan();
        };
    }
}

function addStepToList(text, done, active) {
    const list = document.getElementById('lessonSteps');
    if (!list) return;
    const li = document.createElement('li');
    li.className = 'step' + (done ? ' done' : '') + (active ? ' active' : '');
    li.innerHTML = `
        <input type="checkbox" class="step-check" ${done ? 'checked' : ''}>
        <span contenteditable="true">${escapeHtml(text)}</span>
        <button class="del-step" title="حذف">✕</button>
    `;
    list.appendChild(li);
}

function saveLessonPlan() {
    const list = document.getElementById('lessonSteps');
    if (!list) return;
    const steps = Array.from(list.querySelectorAll('.step')).map(li => ({
        text: (li.querySelector('span') || {}).textContent || '',
        done: !!(li.querySelector('.step-check') || {}).checked,
        active: li.classList.contains('active')
    }));
    localStorage.setItem('lesson_plan', JSON.stringify(steps));
}

// ============================================================
// ===== [22] — منطقة الملفات: PDF + صور + رسم فوقها =====
// ============================================================
let fileKind = null;            // 'pdf' | 'img' | null
let pdfDoc = null, pdfPageNum = 1, pdfTask = null, pdfRenderId = 0;
let imgUrl = null;
const fileStrokes = {};         // مفتاح الصفحة -> خطوط
let fileDrawing = false, fileCur = null, fileLastErase = null;
let fileResizeT = null;

function fileKey() { return fileKind === 'pdf' ? 'pdf:' + pdfPageNum : (fileKind === 'img' ? 'img' : ''); }
function fileDrawCanvas() { return fileKind === 'pdf' ? $('pdf-canvas') && $('file-draw-canvas') : (fileKind === 'img' ? $('file-image-canvas') : null); }
function fileStrokeList() { const k = fileKey(); if (!k) return null; return fileStrokes[k] || (fileStrokes[k] = []); }

function setFileUI(open) {
    const v = $('file-viewer'); if (!v) return;
    v.classList.toggle('has-file', open);
    v.classList.toggle('pdf-mode', open && fileKind === 'pdf');
    const cb = $('closeFileBtn'); if (cb) cb.style.display = open ? 'flex' : 'none';
    $('pdf-container').style.display = (open && fileKind === 'pdf') ? 'inline-block' : 'none';
    $('file-image-wrap').style.display = (open && fileKind === 'img') ? 'inline-block' : 'none';
}

function closeFile() {
    pdfRenderId++;
    if (pdfTask) { try { pdfTask.cancel(); } catch (e) {} pdfTask = null; }
    if (pdfDoc) { try { pdfDoc.destroy(); } catch (e) {} pdfDoc = null; }
    if (imgUrl) { URL.revokeObjectURL(imgUrl); imgUrl = null; }
    fileKind = null; pdfPageNum = 1;
    Object.keys(fileStrokes).forEach(k => delete fileStrokes[k]);
    const img = $('file-image-el'); if (img) img.removeAttribute('src');
    setFileUI(false);
    st('✖ تم إغلاق الملف');
}

function setFileTitleFromName(name) {
    const ti = $('fileTitleInput'); if (!ti) return;
    ti.value = String(name || '').replace(/\.[^.]+$/, '');
    ti.dispatchEvent(new Event('input'));
}

function updatePvBar() {
    if (fileKind !== 'pdf' || !pdfDoc) return;
    const track = $('pvTrack'), thumb = $('pvThumb'), tip = $('pvTip');
    const n = pdfDoc.numPages;
    if (tip) tip.textContent = pdfPageNum + ' / ' + n;
    if (track && thumb) {
        const room = Math.max(0, track.clientHeight - thumb.offsetHeight);
        const top = n > 1 ? (pdfPageNum - 1) / (n - 1) * room : 0;
        thumb.style.top = top + 'px';
        if (tip) tip.style.top = Math.max(0, top - 2) + 'px';
    }
}

async function renderPdfPage() {
    if (!pdfDoc) return;
    const myId = ++pdfRenderId;
    if (pdfTask) { try { pdfTask.cancel(); } catch (e) {} pdfTask = null; }
    const page = await pdfDoc.getPage(pdfPageNum);
    if (myId !== pdfRenderId) return;
    const scroll = $('file-scroll');
    const availW = Math.max(200, scroll.clientWidth - 24);
    const base = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: availW / base.width });
    const dpr = window.devicePixelRatio || 1;
    const c = $('pdf-canvas'), d = $('file-draw-canvas');
    c.width = Math.round(vp.width * dpr); c.height = Math.round(vp.height * dpr);
    c.style.width = Math.round(vp.width) + 'px'; c.style.height = Math.round(vp.height) + 'px';
    d.width = Math.round(vp.width); d.height = Math.round(vp.height);
    d.style.width = c.style.width; d.style.height = c.style.height;
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    pdfTask = page.render({ canvasContext: g, viewport: vp });
    try { await pdfTask.promise; } catch (e) { if (e && e.name === 'RenderingCancelledException') return; console.warn(e); }
    if (myId !== pdfRenderId) return;
    pdfTask = null;
    renderFileStrokes();
    updatePvBar();
}

function goPdfPage(n) {
    if (!pdfDoc) return;
    n = Math.max(1, Math.min(pdfDoc.numPages, n));
    if (n === pdfPageNum) return;
    pdfPageNum = n;
    $('file-scroll').scrollTop = 0;
    renderPdfPage();
}

async function openPdf(file) {
    if (typeof pdfjsLib === 'undefined') { st('❌ مكتبة PDF لم تُحمَّل — تأكد من الاتصال بالإنترنت', 5000); return; }
    try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        st('⏳ جاري فتح PDF...', 4000);
        const buf = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        closeFileQuiet();
        pdfDoc = doc; fileKind = 'pdf'; pdfPageNum = 1;
        setFileUI(true);
        setFileTitleFromName(file.name);
        await renderPdfPage();
        st('📄 تم فتح الملف (' + doc.numPages + ' صفحة)', 4000);
    } catch (e) {
        console.error('openPdf', e);
        st('❌ تعذّر فتح الـ PDF: ' + (e && e.message ? e.message : e), 6000);
    }
}

function closeFileQuiet() {
    pdfRenderId++;
    if (pdfTask) { try { pdfTask.cancel(); } catch (e) {} pdfTask = null; }
    if (pdfDoc) { try { pdfDoc.destroy(); } catch (e) {} pdfDoc = null; }
    if (imgUrl) { URL.revokeObjectURL(imgUrl); imgUrl = null; }
    Object.keys(fileStrokes).forEach(k => delete fileStrokes[k]);
}

function openFileImage(file) {
    closeFileQuiet();
    fileKind = 'img';
    imgUrl = URL.createObjectURL(file);
    const img = $('file-image-el');
    img.onload = () => { layoutFileImage(); renderFileStrokes(); };
    img.onerror = () => { st('❌ تعذّر فتح الصورة'); closeFile(); };
    img.src = imgUrl;
    setFileUI(true);
    setFileTitleFromName(file.name);
    st('🖼 تم فتح الصورة في منطقة الملفات', 3000);
}

function layoutFileImage() {
    const img = $('file-image-el'), c = $('file-image-canvas'), scroll = $('file-scroll');
    if (!img || !img.naturalWidth) return;
    const w = Math.min(img.naturalWidth, Math.max(200, scroll.clientWidth - 24));
    img.style.width = w + 'px';
    img.style.height = (img.naturalHeight * w / img.naturalWidth) + 'px';
    c.width = Math.round(w); c.height = Math.round(img.naturalHeight * w / img.naturalWidth);
    c.style.width = img.style.width; c.style.height = img.style.height;
}

function refreshFileView() {
    clearTimeout(fileResizeT);
    fileResizeT = setTimeout(() => {
        if (fileKind === 'pdf') renderPdfPage();
        else if (fileKind === 'img') { layoutFileImage(); renderFileStrokes(); }
    }, 120);
}

function renderFileStrokes() {
    const c = fileDrawCanvas(); if (!c) return;
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    (fileStrokeList() || []).forEach(s => {
        g.save();
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.strokeStyle = s.color; g.fillStyle = s.color; g.lineWidth = s.sz; g.globalAlpha = s.op;
        if (s.fh) { g.shadowBlur = 12; g.shadowColor = s.color; }
        if (s.points.length === 1) {
            g.beginPath(); g.arc(s.points[0].x, s.points[0].y, s.sz / 2, 0, Math.PI * 2); g.fill();
        } else {
            g.beginPath(); g.moveTo(s.points[0].x, s.points[0].y);
            s.points.forEach((p, i) => { if (i) g.lineTo(p.x, p.y); });
            g.stroke();
        }
        g.restore();
    });
}

function fileEraseAt(x, y, fine) {
    const list = fileStrokeList(); if (!list) return;
    const r = fine ? 8 : 18;
    for (let i = list.length - 1; i >= 0; i--) {
        const pts = list[i].points;
        let hit = false;
        if (pts.length === 1) hit = Math.hypot(pts[0].x - x, pts[0].y - y) <= r;
        else for (let k = 1; k < pts.length && !hit; k++) hit = distToSegment(x, y, pts[k - 1], pts[k]) <= r;
        if (hit) list.splice(i, 1);
    }
}

function bindFileCanvas(c) {
    if (!c) return;
    const pos = e => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) }; };
    c.addEventListener('mousedown', e => {
        if (e.button !== 0 || !fileKind) return;
        if (!['pen', 'fh', 'eraser', 'eraser-fine'].includes(tool)) return;
        e.preventDefault(); e.stopPropagation();
        const p = pos(e), list = fileStrokeList(); if (!list) return;
        fileDrawing = true;
        if (tool === 'eraser' || tool === 'eraser-fine') { fileEraseAt(p.x, p.y, tool === 'eraser-fine'); renderFileStrokes(); return; }
        const fh = tool === 'fh';
        fileCur = { color: colF, sz: fh ? fhSzF : sz, op: fh ? fhOpacityF : 1, fh, points: [p] };
        list.push(fileCur);
        renderFileStrokes();
    });
    c.addEventListener('mousemove', e => {
        if (!fileDrawing) return;
        const p = pos(e);
        if (tool === 'eraser' || tool === 'eraser-fine') { fileEraseAt(p.x, p.y, tool === 'eraser-fine'); renderFileStrokes(); return; }
        if (fileCur) { fileCur.points.push(p); renderFileStrokes(); }
    });
    const end = () => { fileDrawing = false; fileCur = null; };
    c.addEventListener('mouseup', end);
    c.addEventListener('mouseleave', end);
    c.style.cursor = 'crosshair';
}

function handleFileDrop(file) {
    if (!file) return;
    const name = file.name || '';
    if (file.type === 'application/pdf' || /\.pdf$/i.test(name)) openPdf(file);
    else if (file.type.startsWith('image/')) openFileImage(file);
    else if (file.type === 'application/json' || /\.(json|sbm)$/i.test(name)) loadBoardJSON(file);
    else st('⚠️ نوع الملف غير مدعوم (PDF / صور / JSON)', 4000);
}

function loadBoardJSON(file) {
    const r = new FileReader();
    r.onload = ev => {
        try {
            const d = JSON.parse(ev.target.result);
            if (d.whiteboard && Array.isArray(d.whiteboard.pages)) {
                pages = d.whiteboard.pages;
                currentPage = d.whiteboard.currentPage || 0;
                if (currentPage >= pages.length) currentPage = 0;
                imageCache = {};
                boardClr = getPage().bg || '#0a101d';
                if (board) board.style.background = boardClr;
                syncPageTitleInput();
                rdr(); updatePageNumDisplay();
                broadcastBoardState();
                st('✅ تم تحميل ملف السبورة');
            } else st('⚠️ ملف JSON ليس ملف سبورة');
        } catch (err) { st('❌ خطأ في الملف'); }
    };
    r.readAsText(file);
}

function initFileViewer() {
    setFileUI(false);
    bindFileCanvas($('file-draw-canvas'));
    bindFileCanvas($('file-image-canvas'));

    const bc = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
    bc('closeFileBtn', () => closeFile());
    bc('pvUp', () => goPdfPage(pdfPageNum - 1));
    bc('pvDown', () => goPdfPage(pdfPageNum + 1));
    const track = $('pvTrack');
    if (track) track.addEventListener('click', e => {
        if (!pdfDoc) return;
        const r = track.getBoundingClientRect();
        goPdfPage(1 + Math.round((e.clientY - r.top) / r.height * (pdfDoc.numPages - 1)));
    });

    const sc = $('file-scroll');
    if (sc) sc.addEventListener('wheel', e => {
        if (fileKind !== 'pdf' || !pdfDoc || e.ctrlKey) return;
        const atBottom = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2;
        const atTop = sc.scrollTop <= 0;
        if (e.deltaY > 0 && atBottom && pdfPageNum < pdfDoc.numPages) { e.preventDefault(); goPdfPage(pdfPageNum + 1); }
        else if (e.deltaY < 0 && atTop && pdfPageNum > 1) { e.preventDefault(); goPdfPage(pdfPageNum - 1); sc.scrollTop = sc.scrollHeight; }
    }, { passive: false });

    const lh = $('left-half');
    if (lh) {
        ['dragenter', 'dragover'].forEach(t => lh.addEventListener(t, e => { e.preventDefault(); lh.classList.add('drag-over'); }));
        ['dragleave', 'drop'].forEach(t => lh.addEventListener(t, e => { e.preventDefault(); lh.classList.remove('drag-over'); }));
        lh.addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files[0]; handleFileDrop(f); });
    }
    window.addEventListener('resize', refreshFileView);
}

// ============================================================
// ===== الفاصل بين السبورة ومنطقة الملفات =====
// ============================================================
function initSplitter() {
    const splitter  = $('splitter');
    const container = $('main-split-container');
    const rightHalf = $('right-half');
    if (!splitter || !container || !rightHalf) return;

    const MIN_RIGHT = 380, MIN_LEFT = 300;
    let active = false, grabOffset = 0;

    splitter.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        try { splitter.setPointerCapture(e.pointerId); } catch (_) {}
        active = true;
        splitter.classList.add('active');
        document.body.style.cursor = 'col-resize';
        const r = container.getBoundingClientRect();
        grabOffset = (r.right - e.clientX) - rightHalf.getBoundingClientRect().width;
        e.preventDefault();
        e.stopPropagation();
    });

    splitter.addEventListener('pointermove', e => {
        if (!active) return;
        const r = container.getBoundingClientRect();
        let w = (r.right - e.clientX) - grabOffset;
        w = Math.max(MIN_RIGHT, Math.min(w, r.width - MIN_LEFT));
        document.documentElement.style.setProperty('--rw', w + 'px');
    });

    const stop = e => {
        if (!active) return;
        active = false;
        splitter.classList.remove('active');
        document.body.style.cursor = '';
        try { splitter.releasePointerCapture(e.pointerId); } catch (_) {}
        resizeCanvas();
        refreshFileView();
    };
    splitter.addEventListener('pointerup', stop);
    splitter.addEventListener('pointercancel', stop);
}

// ============================================================
// ===== [21] — Init =====
// ============================================================
function init() {
    try {
        cv = $('cvs'); cx = cv.getContext('2d');
        board = $('board'); boardWrapper = $('board-wrapper');
        cv.style.cursor = 'default';
        resizeCanvas();
        initSplitter();
        initFileViewer();
        buildColorPicker(); buildFhPopup(); updateColorUI(); updatePageNumDisplay();

        document.addEventListener('contextmenu', e => { if (!e.target.closest('input')) e.preventDefault(); });
        document.addEventListener('mousedown', sDr);
        document.addEventListener('mousemove', mDr);
        document.addEventListener('mouseup', eDr);
        document.addEventListener('mousemove', updateCursor);
        document.addEventListener('mouseup', updateCursor);

        window.addEventListener('resize', () => { resizeCanvas(); });
        if (window.ResizeObserver) {
            const bodyEl = document.querySelector('.a4-body');
            if (bodyEl) { const roA4 = new ResizeObserver(() => requestAnimationFrame(resizeCanvas)); roA4.observe(bodyEl); }
        }

        const bc = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };

        // أدوات الشريط الأيمن
        bc('lb-text', () => { setTool('text'); st('✏️ انقر على السبورة لكتابة نص'); });
        bc('lb-select', () => setTool('select'));
        bc('lb-eraser', () => setTool('eraser'));
        bc('lb-eraser-fine', () => setTool('eraser-fine'));
        bc('lb-shapes-menu', e => { e.stopPropagation(); showFlyout('shapes-flyout', e.currentTarget); });
        bc('lb-physics-menu', e => { e.stopPropagation(); showFlyout('physics-flyout', e.currentTarget); });
        bc('lb-fill', () => { fillEnabled = !fillEnabled; $('lb-fill').classList.toggle('on', fillEnabled); updateColorUI(); });
        bc('lb-grid', () => {
            gridOn = !gridOn;
            const g = $('grid'); if (g) g.style.display = gridOn ? 'block' : 'none';
            $('lb-grid').classList.toggle('on', gridOn);
        });
        bc('lb-fullscreen', () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); });
        bc('lb-record', () => toggleRecording());
        bc('lb-rec-mode', () => {
            if (rec || recStarting) { st('⚠️ لا يمكن تغيير الوضع أثناء التسجيل', 2500); return; }
            recMode = recMode === 'screen' ? 'board' : 'screen';
            updateRecModeBtn();
            st(recMode === 'screen' ? '🖥 الشاشة كاملة' : '📄 منطقة الرسم فقط', 4000);
        });
        bc('lb-save-rec', () => saveRecording());
        bc('lb-mic', () => toggleMic());
        bc('lb-speaker', () => toggleSpeaker());
        bc('lb-save-file', () => saveAsJSON());
        bc('lb-clear', () => {
            if (!confirmTwice('clear', 'مسح الصفحة')) return;
            su(); getPage().strokes = []; getPage().images = [];
            selStrokeIdx = -1; selImageIdx = -1; hideDimensions(); rdr();
            broadcastBoardState();
            st('🧹 تم مسح الصفحة', 3000);
        });
        bc('lb-undo', () => un());
        bc('lb-redo', () => re());
        bc('lb-copy', () => copySelection());
        bc('lb-paste', () => pasteAny());

        // أدوات الشريط الأيسر
        bc('btn-open', () => { $('f-unified').value = ''; $('f-unified').click(); });
        bc('btn-upload-img', () => { $('f-image-only').value = ''; $('f-image-only').click(); });
        bc('nwf', () => {
            if (!dirty || confirmTwice('new', 'مشروع جديد (تغييرات غير محفوظة)')) {
                pages = [{ strokes: [], images: [], bg: '#0a101d', title: '' }];
                currentPage = 0; selStrokeIdx = -1; selImageIdx = -1;
                hideDimensions(); und = []; red = []; dirty = false;
                rdr(); updatePageNumDisplay();
                broadcastBoardState();
            }
        });
        bc('bgClrRight', e => { e.stopPropagation(); showMenuAbove('bg-menu', e.currentTarget); });
        document.querySelectorAll('#bg-menu .tb').forEach(b => b.onclick = () => {
            boardClr = b.dataset.bc; getPage().bg = boardClr;
            if (board) board.style.background = boardClr;
            closeAllMenus();
            broadcastBoardState();
        });

        bc('copyAreaBtn', () => { isAreaMode = true; selStrokeIdx = -1; selImageIdx = -1; hideDimensions(); rdr(); });
        bc('pasteBtn', () => pasteAny());
        bc('dupShape', () => {
            if (selStrokeIdx !== -1) {
                su(); const arr = getStrokes(), o = arr[selStrokeIdx], c = JSON.parse(JSON.stringify(o));
                delete c.editing;
                if (c.points) c.points = c.points.map(p => ({ x: p.x + 20, y: p.y + 20 }));
                else if (c.x !== undefined) { c.x += 20; c.y += 20; }
                arr.push(c); selStrokeIdx = arr.length - 1; rdr(); broadcastBoardState();
            }
        });
        bc('delShape', () => {
            if (selImageIdx !== -1) { su(); getImages().splice(selImageIdx, 1); selImageIdx = -1; rdr(); broadcastBoardState(); }
            else if (selStrokeIdx !== -1) { su(); getStrokes().splice(selStrokeIdx, 1); selStrokeIdx = -1; hideDimensions(); rdr(); broadcastBoardState(); }
        });
        bc('lb-undoL', () => un());
        bc('lb-redoL', () => re());
        bc('flipH', () => {
            if (selStrokeIdx !== -1) {
                su(); const s = getStrokes()[selStrokeIdx];
                if (s.points && s.points.length >= 2) {
                    const cx0 = (s.points[0].x + s.points[1].x) / 2;
                    s.points = s.points.map(p => ({ x: 2 * cx0 - p.x, y: p.y }));
                    rdr(); broadcastBoardState();
                }
            }
        });
        bc('flipV', () => {
            if (selStrokeIdx !== -1) {
                su(); const s = getStrokes()[selStrokeIdx];
                if (s.points && s.points.length >= 2) {
                    const cy0 = (s.points[0].y + s.points[1].y) / 2;
                    s.points = s.points.map(p => ({ x: p.x, y: 2 * cy0 - p.y }));
                    rdr(); broadcastBoardState();
                }
            }
        });
        bc('screenshotBtnBar', () => {
            const f = $('screenshot-flash'); if (f) { f.style.opacity = '0.6'; setTimeout(() => f.style.opacity = '0', 300); }
            const a = document.createElement('a'); a.download = 'shot_' + Date.now() + '.png';
            a.href = cv.toDataURL('image/png'); document.body.appendChild(a); a.click(); document.body.removeChild(a);
        });
        bc('end', () => { if (!dirty || confirmTwice('end', 'إنهاء (تغييرات غير محفوظة)')) { dirty = false; location.href = '../index.html'; } });

        // الشريط السفلي
        bc('bpen', () => setTool('pen'));
        bc('bpenL', () => setTool('pen'));
        bc('fhColorBall', e => { e.stopPropagation(); pickerRegion = 'board'; setTool('fh'); showFhPopup(e.currentTarget); });
        bc('fhColorBallL', e => { e.stopPropagation(); pickerRegion = 'file'; setTool('fh'); showFhPopup(e.currentTarget); });
        bc('paletteBtn', e => { e.stopPropagation(); pickerRegion = 'board'; showMenuAbove('color-picker-popup', e.currentTarget); });
        bc('paletteBtnL', e => { e.stopPropagation(); pickerRegion = 'file'; showMenuAbove('color-picker-popup', e.currentTarget); });
        document.querySelectorAll('.quick-color-btn').forEach(b => b.onclick = () => setRegionColor(b.closest('#bottom-left') ? 'file' : 'board', b.dataset.color));

        // أشكال
        document.querySelectorAll('.quick-shape').forEach(b => {
            b.onclick = (e) => { e.stopPropagation(); activateShape(b.dataset.shp, b); };
        });

        // أزرار النص
        bc('lb-textL', () => { setTool('text'); st('✏️ انقر على السبورة'); });

        // الملفات
        $('f-unified').onchange = e => { handleFileDrop(e.target.files[0]); e.target.value = ''; };
        $('f-image-only').onchange = e => { if (e.target.files[0]) openFileImage(e.target.files[0]); e.target.value = ''; };

        // لوحة الأبعاد
        ['dim-width', 'dim-height', 'dim-theta'].forEach(id => { const el = $(id); if (el) el.addEventListener('change', applyDimensionsFromPanel); });
        const alEl = $('dim-alpha');
        if (alEl) {
            alEl.addEventListener('change', () => {
                if (selStrokeIdx === -1) return;
                const s = getStrokes()[selStrokeIdx];
                if (!s || s.shape !== 'hl') return;
                const t = Math.min(95, Math.max(0, parseFloat(alEl.value) || 0));
                su(); s.hlAlpha = 1 - t / 100; hlAlphaDefault = s.hlAlpha;
                alEl.blur(); rdr(); broadcastBoardState();
            });
        }
        ['dim-tilt-h', 'dim-tilt-v'].forEach(id => { const el = $(id); if (el) el.addEventListener('change', applyDimensionsFromPanel); });
        const hb = $('lb-handles');
        if (hb) {
            hb.classList.add('tog-on');
            hb.addEventListener('click', e => {
                e.stopPropagation();
                handlesOn = !handlesOn;
                hb.classList.toggle('tog-on', handlesOn);
                if (!handlesOn && tool !== 'select') { selStrokeIdx = -1; hideDimensions(); }
                st(handlesOn ? '🔵 نقاط التحكم: تعمل' : '⚪ نقاط التحكم: متوقفة');
                rdr();
            });
        }
        const applyFor = k => {
            const s = selStrokeIdx !== -1 ? getStrokes()[selStrokeIdx] : null;
            if (k === 'theta' && s && !isLineShape(s)) applyDimensionsFromPanel(); else applyVectorFromPanel(k);
        };
        [['dim-theta', 'theta'], ['dim-r', 'r'], ['dim-x', 'x'], ['dim-y', 'y']].forEach(([id, k]) => {
            const el = $(id); if (!el) return;
            el.addEventListener('change', () => applyFor(k));
            el.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') { ev.preventDefault(); applyFor(k); } });
        });

        // إغلاق القوائم
        document.addEventListener('click', e => {
            if (!e.target.closest('#bgClrRight') && !e.target.closest('#bg-menu') && !e.target.closest('#color-picker-popup') &&
                !e.target.closest('#paletteBtn') && !e.target.closest('#paletteBtnL') && !e.target.closest('#fh-popup') &&
                !e.target.closest('#fhColorBall') && !e.target.closest('#fhColorBallL') && !e.target.closest('#shape-dimensions')) closeAllMenus();
        });

        // اختصارات
        document.addEventListener('keydown', e => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.ctrlKey || e.metaKey) {
                const k = (e.key || '').toLowerCase();
                if (k === 'z' && !e.shiftKey) { e.preventDefault(); un(); }
                else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); re(); }
                else if (k === 's') { e.preventDefault(); saveAsJSON(); }
            }
            if (e.key === 'Escape') {
                selStrokeIdx = -1; selImageIdx = -1; setTool('pen');
                isAreaMode = false; areaSelection = null;
                hideDimensions(); closeAllMenus(); rdr();
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selImageIdx !== -1) { su(); getImages().splice(selImageIdx, 1); selImageIdx = -1; rdr(); broadcastBoardState(); }
                else if (selStrokeIdx !== -1) { su(); getStrokes().splice(selStrokeIdx, 1); selStrokeIdx = -1; hideDimensions(); rdr(); broadcastBoardState(); }
            }
        });

        // عنوان الصفحة
        const pti = $('pageTitleInput');
        if (pti) {
            pti.addEventListener('input', () => {
                if (pages[currentPage]) pages[currentPage].title = pti.value || '';
                dirty = true;
                // بث عند التوقف
                clearTimeout(pti._bcTimer);
                pti._bcTimer = setTimeout(broadcastBoardState, 500);
            });
            const savedTitle = pages[currentPage] && pages[currentPage].title;
            if (savedTitle) pti.value = savedTitle;
        }

        if (board) board.style.background = boardClr;
        hideDimensions();
        setupTextEditor();

        // Firebase: ننتظر اكتمال استرجاع الجلسة، ومن غير المسجّل يعود للمنصة
        let sessionStarted = false;
        onAuthStateChanged(auth, (u) => {
            if (!u) { location.href = '../index.html'; return; }
            if (sessionStarted) return;
            sessionStarted = true;
            initFirebaseSession();
        });
        initLessonPlanInteractive();

        // قبل الخروج
        window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

                        



        st('✅ جاهز');
    } catch (err) {
        console.error('Init:', err);
        st('❌ خطأ: ' + err.message);
    }
}

// تشغيل
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
