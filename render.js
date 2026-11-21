/* ════════════════════════════════════════════════════════════════════ *
 *  render.js — رسم صفحة السبورة عند الطالب                             *
 *  الدوال أدناه منسوخة حرفيًا من board.js (المدرس) ليكون الرسم مطابقًا  *
 *  تمامًا: القلم والنيون والأشكال ورموز الفيزياء والنص والصور.          *
 *  ⚠ إذا غيّرتَ طريقة رسم شيء في board.js فانسخ التغيير هنا أيضًا.      *
 * ════════════════════════════════════════════════════════════════════ */
(function () {
'use strict';
/* قيم افتراضية كانت عامة في board.js */
let col = '#15803d', sz = 4, opacity = 1, hlAlphaDefault = 0.4, fhOpacityB = 0.1, fhSzB = 18;
let selImageIdx = -1, tool = 'pen';
const imageCache = {};
const cx = document.createElement('canvas').getContext('2d');   /* لقياس النص فقط */
function rdr() { if (window.MCR && MCR.onImageLoad) MCR.onImageLoad(); }   /* تُستدعى حين تكتمل صورة */

const isLineShape = s => !!s && s.type === 'shape' && ['line', 'arrow', 'double-arrow'].includes(s.shape);

function rotatePoint(px, py, cx, cy, angle) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const dx = px - cx, dy = py - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

const TILT_MAX = 85;

const clampTilt = v => Math.max(-TILT_MAX, Math.min(TILT_MAX, isNaN(v) ? 0 : v));

function tiltScale(s) {
    if (!s || s.type !== 'shape' || isLineShape(s)) return { sx: 1, sy: 1 };
    return { sx: Math.cos(clampTilt(s.tiltY || 0) * Math.PI / 180), sy: Math.cos(clampTilt(s.tiltX || 0) * Math.PI / 180) };
}

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
    if (shape.imgSrc) {
        window.__imgC = window.__imgC || {};
        let im = window.__imgC[shape.imgSrc]; if (!im) { im = new Image(); im.onload = () => { if (window.MCR && MCR.redraw) MCR.redraw(); else if (window.render) window.render(); }; im.src = shape.imgSrc; window.__imgC[shape.imgSrc] = im; }
        if (im.complete && im.naturalWidth) tCtx.drawImage(im, x1, y1, w, h);
        tCtx.restore(); return;
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
        case 'tri': tCtx.moveTo(x1 + w / 2, y1); tCtx.lineTo(x1 + w, y1 + h); tCtx.lineTo(x1, y1 + h); tCtx.closePath(); break;
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

window.MCR = window.MCR || {};
MCR.drawStrokesOnCtx = drawStrokesOnCtx;
MCR.drawImagesOnCtx = drawImagesOnCtx;
MCR.drawShape = drawShape;
})();
