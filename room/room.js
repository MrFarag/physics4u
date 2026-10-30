// ============================================================
// Physics4U | room.js — النسخة المتكاملة (السبورة + الصوت + الاستئذان)
// ============================================================

import { auth, database } from "../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { ref as dbRef, set, push, onValue, onDisconnect, remove, get } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

const DEFAULT_PEN_COLOR = '#15803d';
const MOVE_CURSOR = (() => {
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24'><path d='M12 2l2.9 6.6 7.1.7-5.3 4.8 1.5 7-6.2-3.6-6.2 3.6 1.5-7L2 9.3l7.1-.7z' fill='#fbbf24' stroke='#111827' stroke-width='1.4' stroke-linejoin='round'/></svg>";
    return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '") 14 14, move';
})();

const SHAPE_ACCENTS = { hl: '#f97316', arrow: '#ef4444', line: '#fbbf24', cr: '#22c55e', rc: '#3b82f6', sq: '#a855f7', el: '#06b6d4', resistor: '#f59e0b', battery: '#10b981', lamp: '#eab308', capacitor: '#6366f1', inductor: '#ec4899' };

const isFreeStroke = s => !!s && ['free', 'fh', 'dot', 'fh-dot'].includes(s.type) && Array.isArray(s.points) && s.points.length > 0;
function rawBBox(pts) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; pts.forEach(p => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }); return { x0, y0, x1, y1 }; }

const TILT_MAX = 85;
const clampTilt = v => Math.max(-TILT_MAX, Math.min(TILT_MAX, isNaN(v) ? 0 : v));
function tiltScale(s) { if (!s || s.type !== 'shape' || isLineShape(s)) return { sx: 1, sy: 1 }; return { sx: Math.cos(clampTilt(s.tiltY || 0) * Math.PI / 180), sy: Math.cos(clampTilt(s.tiltX || 0) * Math.PI / 180) }; }
function shapeToScreen(s, pt, c) { const r = rotatePoint(pt.x, pt.y, c.x, c.y, s.rotation || 0), t = tiltScale(s); return { x: c.x + (r.x - c.x) * t.sx, y: c.y + (r.y - c.y) * t.sy }; }
function screenToLocal(s, pt, c) { const t = tiltScale(s); return rotatePoint(c.x + (pt.x - c.x) / t.sx, c.y + (pt.y - c.y) / t.sy, c.x, c.y, -(s.rotation || 0)); }

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
function strokeCenter(s) { if (s.points && s.points.length) { const r = rawBBox(s.points); return { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }; } if (s.x !== undefined) return { x: s.x, y: s.y }; return null; }
function startImgAttach(img) { const list = []; getStrokes().forEach((s, i) => { const c = strokeCenter(s); if (!c) return; if (c.x >= img.x && c.x <= img.x + img.w && c.y >= img.y && c.y <= img.y + img.h) list.push({ i, pts: s.points ? JSON.parse(JSON.stringify(s.points)) : null, x: s.x, y: s.y }); }); imgAttach = { list, ox: img.x, oy: img.y, ow: img.w, oh: img.h }; }
function applyImgAttach(img, mode) { if (!imgAttach || !imgAttach.list.length) return; const a = imgAttach, arr = getStrokes(); const fx = img.w / a.ow, fy = img.h / a.oh, dx = img.x - a.ox, dy = img.y - a.oy; const T = mode === 'scale' ? (x, y) => ({ x: a.ox + (x - a.ox) * fx, y: a.oy + (y - a.oy) * fy }) : (x, y) => ({ x: x + dx, y: y + dy }); a.list.forEach(it => { const s = arr[it.i]; if (!s) return; if (it.pts) s.points = it.pts.map(p => T(p.x, p.y)); if (it.x !== undefined) { const q = T(it.x, it.y); s.x = q.x; s.y = q.y; } }); }

let hlAlphaDefault = 0.4;
const TEXT_LH = 1.35;
function textLines(s) { const c = cx; if (!c) return [String(s.text || '')]; c.save(); c.font = 'bold ' + (s.sz || 16) + 'px Cairo'; const maxW = Math.max(20, textBaseW(s) - 12), out = []; String(s.text || '').split('\n').forEach(par => { let line = ''; par.split(' ').forEach(w => { const t = line ? line + ' ' + w : w; if (!line || c.measureText(t).width <= maxW) line = t; else { out.push(line); line = w; } }); out.push(line); }); c.restore(); return out; }
function textBaseW(s) { return s.w || Math.max(80, String(s.text || '').length * (s.sz || 16) * 0.65 + 16); }
function textBox(s) { const need = textLines(s).length * (s.sz || 16) * TEXT_LH + 10; return { w: textBaseW(s), h: Math.max(s.h || 0, need) }; }

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

// 🆕 متغيرات الصوت
let amTeacher = false;
let currentUserName = '';
let currentUserId = '';
let speakerStream = null;
let pc = null; // PeerConnection
let isSpeakingAllowed = false;

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

function gpBoard(e) { const r = board.getBoundingClientRect(); const x = e.touches ? e.touches[0].clientX : e.clientX; const y = e.touches ? e.touches[0].clientY : e.clientY; return { x: (x - r.left) / zoom, y: (y - r.top) / zoom }; }
function gp(e) { return gpBoard(e); }
function resizeCanvas() { if (!cv) return; const body = document.querySelector('.a4-body'); const host = body || boardWrapper; if (!host) return; const w = host.clientWidth; const h = host.clientHeight; if (w < 10 || h < 10) return; if (cv.width !== w) cv.width = w; if (cv.height !== h) cv.height = h; rdr(); }

// ============================================================
// ===== [19] — Firebase: الصوت + الحضور + الاستئذان =====
// ============================================================
async function initFirebaseSession() {
    const user = auth.currentUser;
    if (!user) return;

    currentUserId = user.uid;
    amTeacher = (user.email === 'mrfaragphysics@gmail.com'); // أو التحقق من admins
    const urlParams = new URLSearchParams(window.location.search);
    currentUserName = urlParams.get('name') || user.displayName || 'مستخدم';

    // 1) تسجيل الحضور
    const presenceRef = dbRef(database, amTeacher ? 'live_session/teacher' : `live_session/students/${user.uid}`);
    set(presenceRef, { online: true, name: currentUserName, mic: false, hand: false, since: Date.now() });
    onDisconnect(presenceRef).remove();

    // 2) استماع لقائمة الطلاب (للمدرس)
    if (amTeacher) {
        const studentsRef = dbRef(database, 'live_session/students');
        if (unsubStudents) unsubStudents();
        unsubStudents = onValue(studentsRef, (snap) => {
            const list = snap.val() || {};
            renderStudentList(list);
        });
    }

    // 3) إعداد المايك
    setupMic();

    // 4) بث الحالة
    setTimeout(() => broadcastBoardState(true), 800);

    // 🆕 بدء نظام WebRTC
    setupWebRTC();
}

// ============================================================
// ===== [20] — قائمة الطلاب والتحكم (للمدرس) =====
// ============================================================
function renderStudentList(list) {
    const ul = document.getElementById('studentList');
    if (!ul) return;
    const arr = Object.entries(list).map(([uid, v]) => ({ uid, ...v }));
    ul.innerHTML = arr.map(s => `
        <li class="student" style="border: ${s.hand ? '1px solid #22c55e' : '1px solid transparent'};">
            <span class="avatar">${s.hand ? '✋' : '👤'}</span>
            <span>${escapeHtml(s.name || 'طالب')}</span>
            <span class="mic ${s.mic ? 'on' : 'muted'}">${s.mic ? '🎤' : '🔇'}</span>
            ${amTeacher ? `
                <button class="tb" style="height:24px;padding:0 6px;font-size:10px" onclick="allowSpeak('${s.uid}')">سماح</button>
                <button class="tb" style="height:24px;padding:0 6px;font-size:10px" onclick="muteStudent('${s.uid}')">كتم</button>
            ` : ''}
        </li>
    `).join('');
}

window.allowSpeak = (uid) => {
    set(dbRef(database, `live_session/students/${uid}/allowed`), true);
    st('تم السماح للطالب بالكلام');
};

window.muteStudent = (uid) => {
    set(dbRef(database, `live_session/students/${uid}/allowed`), false);
    st('تم كتم الطالب');
};

// ============================================================
// ===== [21] — المايك والسماعة (الصوت) =====
// ============================================================
async function setupMic() {
    const btn = $('lb-mic');
    if (!btn) return;

    // مراقبة إذن المدرس للطالب
    if (!amTeacher) {
        onValue(dbRef(database, `live_session/students/${currentUserId}/allowed`), (snap) => {
            const allowed = snap.val() === true;
            isSpeakingAllowed = allowed;
            const micBtn = $('lb-mic');
            if (allowed) {
                micBtn.classList.add('mic-on');
                micBtn.innerHTML = '🎤 (تحدث الآن)';
                st('✅ سمح لك المعلم بالكلام');
            } else {
                micBtn.classList.remove('mic-on');
                micBtn.innerHTML = '🎤';
                if (micStream) {
                    micStream.getTracks().forEach(t => t.stop());
                    micStream = null;
                    micActive = false;
                }
            }
        });
    }

    btn.onclick = async () => {
        if (!amTeacher && !isSpeakingAllowed) {
            // طلب الاستئذان
            await set(dbRef(database, `live_session/students/${currentUserId}/hand`), true);
            st('✋ رفعت يدك، انتظر موافقة المعلم');
            return;
        }

        // تشغيل المايك
        if (micActive) {
            if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
            micActive = false; btn.classList.remove('mic-on');
            st('🎤 المايك: متوقف');
        } else {
            try {
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                micActive = true; btn.classList.add('mic-on');
                st('🎤 المايك: يعمل');
            } catch (e) { st('❌ فشل المايك'); }
        }
    };
}

async function toggleSpeaker() {
    // السماعة (تشغيل صوت الآخرين)
    const btn = $('lb-speaker');
    if (!btn) return;
    if (speakerActive) {
        if (speakerStream) { speakerStream.getTracks().forEach(t => t.stop()); speakerStream = null; }
        speakerActive = false; btn.classList.remove('spk-on');
        st('🔈 السماعة: متوقفة');
        return;
    }
    try {
        speakerStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        speakerActive = true; btn.classList.add('spk-on');
        st('🔊 السماعة: تعمل');
    } catch (e) { st('❌ فشل السماعة'); }
}

// ============================================================
// ===== WebRTC (تبادل الصوت) =====
// ============================================================
function setupWebRTC() {
    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    pc = new RTCPeerConnection(configuration);

    // إضافة مسارات المايك
    if (micStream) {
        micStream.getTracks().forEach(track => pc.addTrack(track, micStream));
    }

    // استقبال الصوت من الطرف الآخر
    pc.ontrack = (event) => {
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.play();
    };

    // للمدرس: إنشاء عرض (Offer)
    if (amTeacher) {
        pc.onicecandidate = (event) => {
            if (event.candidate) set(dbRef(database, 'live_session/webrtc/teacher_candidate'), event.candidate.toJSON());
        };
        pc.createOffer().then(offer => {
            pc.setLocalDescription(offer);
            set(dbRef(database, 'live_session/webrtc/offer'), { type: offer.type, sdp: offer.sdp });
        });

        // استقبال إجابة الطالب
        onValue(dbRef(database, 'live_session/webrtc/answer'), (snap) => {
            const answer = snap.val();
            if (answer && pc.signalingState === 'have-local-offer') {
                pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });
    } else {
        // للطالب: استقبال العرض وإنشاء إجابة
        onValue(dbRef(database, 'live_session/webrtc/offer'), (snap) => {
            const offer = snap.val();
            if (offer && pc.signalingState === 'stable') {
                pc.setRemoteDescription(new RTCSessionDescription(offer));
                pc.createAnswer().then(answer => {
                    pc.setLocalDescription(answer);
                    set(dbRef(database, 'live_session/webrtc/answer'), { type: answer.type, sdp: answer.sdp });
                });
            }
        });
    }
}

// ============================================================
// ===== المتبقي من كود السبورة (نفسه) =====
// ============================================================
// (هنا يجب أن تضع باقي دوال السبورة: rdr, drawShape, drawStrokesOnCtx, إلخ)
// ... (باقي الكود السابق للسبورة، بدون تغيير) ...

// ============================================================
// ===== Init =====
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

        document.addEventListener('mousedown', sDr);
        document.addEventListener('mousemove', mDr);
        document.addEventListener('mouseup', eDr);

        const bc = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
        bc('lb-mic', () => { /* يتم التعامل معه في setupMic */ });
        bc('lb-speaker', () => toggleSpeaker());

        // Firebase
        onAuthStateChanged(auth, (u) => {
            if (!u) { location.href = '../index.html'; return; }
            initFirebaseSession();
        });

        st('✅ جاهز');
    } catch (err) {
        console.error('Init:', err);
    }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
