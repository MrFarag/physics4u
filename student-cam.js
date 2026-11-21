window.__stuCamBuild = 'panel-v19';   /* علامة النسخة: اكتب __stuCamBuild في Console للتأكد من النسخة العاملة */

/* [3] أنماط: أزرار الكاميرا/السماعة/المايك باهتة عند عدم التفعيل + نافذة إشعار الخصوصية (≈5×3 سم) */
(function () {
  var st = document.createElement('style'); st.id = 'stuCamCss';
  st.textContent =
    '#camBtn:not(.on),#micBtn:not(.on):not(.live):not(.hint),#spkBtn.off,#msgBtn:not(.on):not(:has(.cb-badge.on)){opacity:.42;filter:grayscale(.65)}' +
    '#camBtn:not(.on):hover,#micBtn:hover,#spkBtn.off:hover,#msgBtn:hover{opacity:.85}' +
    '#camBtn.on{color:#4ade80}#camBtn.on svg{stroke:#4ade80}' +
    '#stuCamNote{position:fixed;left:10px;bottom:64px;width:190px;height:113px;min-width:120px;min-height:80px;z-index:99990;border-radius:10px;overflow:hidden;background:#000;border:2px solid #ef4444;box-shadow:0 6px 20px rgba(0,0,0,.6);direction:rtl;font-family:Cairo,system-ui,sans-serif}' +
    '#stuCamNote video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}' +
    '#stuCamNote.back video{transform:none}' +
    '#stuCamNote .sn-t{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;gap:5px;padding:3px 7px;background:linear-gradient(180deg,rgba(0,0,0,.75),transparent);color:#fff;font-size:10px;font-weight:700}' +
    '#stuCamNote .sn-t{cursor:move;touch-action:none;z-index:3}#stuCamNote .sn-t span{flex:1}' +
    '#stuCamNote .sn-mx{background:rgba(15,23,42,.8);color:#fff;border:0;border-radius:4px;width:20px;height:16px;font-size:11px;line-height:1;cursor:pointer;padding:0}' +
    '#stuCamNote .sn-rz{position:absolute;bottom:0;width:12px;height:12px;z-index:5;touch-action:none}' +
    '#stuCamNote .sn-rz-se{right:0;cursor:se-resize;background:linear-gradient(135deg,transparent 55%,#cdbf9a 55%,#cdbf9a 68%,transparent 68%,transparent 78%,#cdbf9a 78%,#cdbf9a 90%,transparent 90%)}' +
    '#stuCamNote .sn-rz-sw{left:0;cursor:sw-resize;background:linear-gradient(225deg,transparent 55%,#cdbf9a 55%,#cdbf9a 68%,transparent 68%,transparent 78%,#cdbf9a 78%,#cdbf9a 90%,transparent 90%)}' +
    '#stuCamNote .sn-rz-e,#stuCamNote .sn-rz-w{top:26px;bottom:22px;width:12px;height:auto;background:none}#stuCamNote .sn-rz-e{right:0;cursor:ew-resize}#stuCamNote .sn-rz-w{left:0;cursor:ew-resize}#stuCamNote .sn-rz-s{left:22px;right:22px;bottom:0;width:auto;height:10px;background:none;cursor:ns-resize}#stuCamNote .sn-rz:hover{background:rgba(255,255,255,.18)}' +
    '#stuCamNote.cap .sn-rz{display:none}' +
    '#stuCamNote .sn-b{z-index:4;bottom:5px}#stuCamNote .sn-b button{flex:1 1 0;min-width:0;height:34px;font-size:12px;padding:0 2px;white-space:nowrap;display:flex;align-items:center;justify-content:center;gap:4px}#stuCamNote .sn-em{font-size:22px;line-height:1;display:inline-block;transform:translateY(2px)}' +
    '#stuCamNote .sn-cap{display:none}' +
    '#stuCamNote.cap{left:0 !important;top:0 !important;right:0 !important;bottom:0 !important;width:100vw !important;height:100vh !important;border-radius:0;border-width:0;z-index:2147483000}' +
    '#stuCamNote.cap video{object-fit:cover;background:#000;width:100%;height:100%}#stuCamNote.cap .sn-b,#stuCamNote.cap .sn-rz,#stuCamNote.cap .sn-mx{display:none}' +
    '#stuCamNote.cap .sn-cap{display:flex;position:absolute;left:0;right:0;bottom:0;height:120px;align-items:center;justify-content:center;gap:30px;background:linear-gradient(0deg,rgba(0,0,0,.65),transparent);z-index:9}' +
    '#stuCamNote .sn-shot{width:84px;height:84px;border-radius:50%;border:5px solid #fff;background:#ef4444;cursor:pointer;padding:0;box-shadow:0 0 0 3px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;margin-top:18px}#stuCamNote .sn-shot svg{width:40px;height:40px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}#stuCamNote .sn-shot:active{transform:scale(.93)}' +
    '#stuCamNote .sn-cf{border:0;border-radius:50%;width:52px;height:52px;background:rgba(15,23,42,.7);color:#fff;font-size:22px;cursor:pointer;padding:0}#stuCamNote .sn-cx{border:0;border-radius:50%;width:52px;height:52px;padding:0;background:rgba(15,23,42,.7);color:#fff;font:700 22px Cairo,system-ui,sans-serif;cursor:pointer}' +
    '#stuCamNote .sn-ok{position:absolute;top:-70px;color:#fff;background:#16a34a;border-radius:18px;padding:6px 16px;font:700 14px Cairo,system-ui,sans-serif;display:none}' +
    '#stuCamNote .sn-d{width:8px;height:8px;border-radius:50%;background:#ef4444;animation:snp 1.2s infinite}@keyframes snp{50%{opacity:.25}}' +
    '#stuCamNote .sn-b{position:absolute;bottom:4px;left:4px;right:4px;display:flex;gap:4px}' +
    '#stuCamNote .sn-b button{flex:1;border:0;border-radius:6px;padding:3px 0;font:700 10px Cairo,system-ui,sans-serif;cursor:pointer;color:#fff;background:rgba(15,23,42,.78)}' +
    '#stuCamNote .sn-b button.sn-x{background:rgba(220,38,38,.85)}' +

    /* [S1] تخطيط جديد: الصورة يسارًا + شريط جانبي أيمن مستقل عنها (كاميرا / تدوير / استيراد صور / إيقاف) */
    '#stuCamNote{direction:ltr;display:flex;flex-direction:column;width:232px;height:178px;min-width:150px;min-height:130px}' +
    '#stuCamNote .sn-v{position:relative;flex:1 1 auto;min-height:0;width:100%;overflow:hidden;background:#000}' +
    '#stuCamNote .sn-v video{position:absolute;left:0;top:0;width:100%;height:100%}' +
    /* [S4] لوحة سفلية رمادية مجسّمة؛ أزرارها أقراص بنفس الحجم والشكل بخلفيات داكنة (أحمر/أخضر/برتقالي) ونص يدوي أبيض ورسم أبيض */
    '#stuCamNote{container-type:inline-size;direction:ltr;display:flex;flex-direction:column;width:260px;height:170px;min-width:150px;min-height:120px}' +
    '#stuCamNote .sn-v{position:relative;flex:1 1 auto;min-height:0;width:100%;overflow:hidden;background:#000}' +
    '#stuCamNote .sn-v video{position:absolute;left:0;top:0;width:100%;height:100%}' +
    '#stuCamNote .sn-sb{flex:0 0 34px;position:relative;z-index:4;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:5px;padding:0 0 2px;background:linear-gradient(180deg,#6b7280 0%,#4b5563 45%,#2b323d 100%);border-top:1px solid #9ca3af;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),inset 0 -2px 3px rgba(0,0,0,.35)}' +
    '#stuCamNote .sn-sb button{box-sizing:border-box;flex:0 0 56px;width:56px;height:24px;border-radius:12px;padding:0 4px;margin:0;border:1px solid rgba(0,0,0,.55);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px;color:#fff;font-family:"Aref Ruqaa","Katibeh","Reem Kufi",Cairo,cursive;font-size:12px;font-weight:700;line-height:1;white-space:nowrap;text-shadow:0 1px 1px rgba(0,0,0,.5);box-shadow:0 2px 3px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.28)}' +
    '#stuCamNote .sn-sb button svg{flex:0 0 auto;width:14px;height:14px;fill:none;stroke:#fff;stroke-width:2.3;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}' +
    '#stuCamNote .sn-sb button:hover{filter:brightness(1.15)}#stuCamNote .sn-sb button:active{transform:translateY(1px)}' +
    '#stuCamNote .sn-sb .sn-sh,#stuCamNote .sn-sb .sn-x{background:linear-gradient(135deg,#9a1b1b 0%,#7f1d1d 50%,#450a0a 100%)}' +
    '#stuCamNote .sn-sb .sn-g{background:linear-gradient(135deg,#16a34a 0%,#15803d 50%,#14532d 100%)}' +
    '#stuCamNote .sn-sb .sn-f,#stuCamNote .sn-sb .sn-cx{background:linear-gradient(135deg,#c2410c 0%,#9a3412 50%,#7c2d12 100%)}' +
    '#stuCamNote:not(.cap) .sn-sb .sn-cx{display:none}' +
    '@container (max-width:250px){#stuCamNote .sn-sb button{flex-basis:28px;width:28px;padding:0}#stuCamNote .sn-sb .sn-lb{display:none}}' +
    '#stuCamNote.cap .sn-sb{flex-basis:50px;gap:12px}#stuCamNote.cap .sn-sb button{flex-basis:78px;width:78px;height:34px;border-radius:17px;font-size:15px}#stuCamNote.cap .sn-sb button svg{width:18px;height:18px}#stuCamNote.cap .sn-sb .sn-x{display:none}' +
    '#stuCamNote .sn-ok{position:absolute;top:30px;left:50%;transform:translateX(-50%);max-width:92%;white-space:normal;text-align:center;z-index:12;font-size:12px;padding:5px 12px}';
  document.head.appendChild(st);
})();
/* student-cam.js — كاميرا + صوت الطالب إلى المعلم (WebRTC) مع لقطات احتياطية
   زر #camBtn: ضغطة = تشغيل (فيديو + صوت)، ضغطة ثانية = إيقاف.
   المسارات (مسموحة في القواعد): camOn/<id> ، s2t_cam_offer/<id> ، s2t_cam_ice/<id> (يكتبها الطالب)
                                  t2s_cam_answer/<id> ، t2s_cam_ice/<id> (يكتبها المعلم)
   اللقطات camShot/<id> احتياطي إلى أن يتصل البث الحي (تتوقف حين يتصل). */
/* [1] ننتظر جاهزية Firebase وزر الكاميرا (حتى 40 ثانية) بدل الاستسلام بعد 3 ثوانٍ */
(function waitReady(n) {
  if (window.firebase && firebase.apps && firebase.apps.length && document.getElementById('camBtn')) { init(); return; }
  if (n > 80) return; setTimeout(function () { waitReady(n + 1); }, 500);
})(0);
function init() {
  (function () {
    var db = firebase.database(), RTC = db.ref('rooms/live/rtc'), btn = document.getElementById('camBtn');
    var stream = null, pc = null, shotT = 0, offs = [], warned = false, live = false, facing = 'user', note = null;
    var video = document.createElement('video'); video.muted = true; video.playsInline = true; video.autoplay = true;
    var cv = document.createElement('canvas');
    var spk = document.getElementById('spkBtn'); if (spk && spk.parentNode && btn.previousElementSibling !== spk) spk.parentNode.insertBefore(btn, spk.nextSibling);   /* زر الكاميرا بجوار السماعة */
    function sid() { return window.__stuMe ? window.__stuMe().id : ''; }
    function err(e) { console.error('[cam]', e); if (!warned) { warned = true; alert('تعذّر إرسال الكاميرا للمعلم: ' + (e && e.code || e && e.message || e)); } }


    /* [4] نافذة الخصوصية: تُظهر للطالب أن كاميرته تعمل وما يراه المعلم، مع تبديل الأمامية/الخلفية وإيقاف فوري */
    function showNote() {
      hideNote();
      note = document.createElement('div'); note.id = 'stuCamNote';
      note.innerHTML = '<div class="sn-v"><video autoplay playsinline muted></video><div class="sn-t"><i class="sn-d"></i><span></span><button class="sn-mx" type="button" title="تكبير / استعادة">▢</button></div><b class="sn-ok"></b></div>' +
        '<div class="sn-sb"><button class="sn-sh" type="button" title="التقاط صورة وإرسالها للمدرس"><svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></button><button class="sn-f" type="button" title="تبديل الكاميرا الأمامية/الخلفية"><svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 0-15-6.7L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/><path d="M16 16h5v5"/></svg></button><button class="sn-g" type="button" title="استيراد صورة أو عدة صور من الهاتف وإرسالها للمدرس"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></button><button class="sn-cx" type="button" title="رجوع"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button><button class="sn-x" type="button" title="إيقاف الكاميرا"><svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="#fff" stroke="none"/></svg></button></div>' +
        '<input class="sn-fi" type="file" accept="image/*" multiple style="display:none">' +
        '<i class="sn-rz sn-rz-se" data-rz="se"></i><i class="sn-rz sn-rz-sw" data-rz="sw"></i><i class="sn-rz sn-rz-e" data-rz="e"></i><i class="sn-rz sn-rz-w" data-rz="w"></i><i class="sn-rz sn-rz-s" data-rz="s"></i>';
      note.querySelector('video').srcObject = stream;
      /* [S5] علامة × يدوية بيضاء + نصوص يدوية بيضاء على الأزرار */
      var HX = '<svg viewBox="0 0 24 24"><path d="M6.4 6.1c3.7 3.3 7.3 7.7 11.2 11.8"/><path d="M17.5 5.7c-3.8 4.1-7.7 8-11.1 12.6"/></svg>';
      note.querySelector('.sn-x').innerHTML = HX; note.querySelector('.sn-cx').innerHTML = HX;
      [['.sn-sh', 'صورة'], ['.sn-f', 'تدوير'], ['.sn-g', 'ألبوم'], ['.sn-x', 'إيقاف'], ['.sn-cx', 'رجوع']].forEach(function (q) { var b = note.querySelector(q[0]); if (b) { var t = document.createElement('span'); t.className = 'sn-lb'; t.textContent = q[1]; b.appendChild(t); } });
      note.querySelector('.sn-x').onclick = function () { stop(); };
      note.querySelector('.sn-f').onclick = flip;
      note.querySelector('.sn-sh').onclick = function () {
        if (note.classList.contains('cap')) { takePhoto(); return; }
        note.classList.add('cap'); try { var vt = stream && stream.getVideoTracks()[0]; if (vt && vt.applyConstraints) vt.applyConstraints({ width: { ideal: 1920 }, height: { ideal: 1080 }, aspectRatio: { ideal: innerWidth / innerHeight } }).catch(function () { }); } catch (e) { }
      };
      note.querySelector('.sn-cx').onclick = function () { note.classList.remove('cap'); };
      /* [S2] استيراد صورة أو عدة صور من الهاتف: تُرسل للمدرس واحدة تلو الأخرى (فاصل لأن الإرسال محدود بسرعة) */
      var fi = note.querySelector('.sn-fi');
      note.querySelector('.sn-g').onclick = function () { fi.value = ''; fi.click(); };
      fi.onchange = function () { var fl = Array.prototype.slice.call(fi.files || []); fi.value = ''; if (fl.length) sendMany(fl); };
      document.body.appendChild(note); floatify(note);
    }
    async function sendMany(fl) {
      var ok = note && note.querySelector('.sn-ok'), n = 0, bad = 0;
      function say(t, red) { if (!ok) return; ok.textContent = t; ok.style.background = red ? '#dc2626' : ''; ok.style.display = 'block'; }
      for (var i = 0; i < fl.length; i++) {
        say('جارٍ إرسال الصورة ' + (i + 1) + ' من ' + fl.length + '…');
        var r = false;
        for (var t = 0; t < 2 && !r; t++) { try { r = (window.ChatBox && ChatBox.sendFile) ? await ChatBox.sendFile(fl[i], 2) : false; } catch (e) { r = false; } if (!r) await new Promise(function (z) { setTimeout(z, 900); }); }
        if (r) n++; else bad++;
        await new Promise(function (z) { setTimeout(z, 800); });
      }
      say(bad ? 'أُرسلت ' + n + ' وتعذّرت ' + bad + (window.ChatBox && ChatBox.sendFile ? '' : ' — حدّث chatbox.js') : 'تم إرسال ' + n + (n === 1 ? ' صورة' : ' صور') + ' للمدرس ✓', !!bad);
      setTimeout(function () { if (ok) { ok.style.display = 'none'; ok.style.background = ''; } }, 2600);
    }
    /* [6] التقاط صورة: المعاينة تملأ الشاشة (وضع cap) ثم نرسل الإطار الحالي للمدرس كملف في نافذة الرسائل */
    function takePhoto() {
      var v = note && note.querySelector('video'); if (!v || !v.videoWidth) return;
      /* نلتقط بالضبط ما يظهر على الشاشة (object-fit:cover): نقصّ الإطار بنفس نسبة العرض */
      var vr = v.getBoundingClientRect(), ar = vr.width / Math.max(1, vr.height), vw = v.videoWidth, vh = v.videoHeight, sw = vw, sh = vh;
      if (vw / vh > ar) sw = Math.round(vh * ar); else sh = Math.round(vw / ar);
      var sx = Math.round((vw - sw) / 2), sy = Math.round((vh - sh) / 2), k = Math.min(1, 1600 / Math.max(sw, sh));
      var c = document.createElement('canvas'); c.width = Math.round(sw * k); c.height = Math.round(sh * k); c.getContext('2d').drawImage(v, sx, sy, sw, sh, 0, 0, c.width, c.height);
      var ok = note.querySelector('.sn-ok');
      c.toBlob(function (b) {
        if (!b) return;
        var f = new File([b], 'صورة_' + Date.now().toString(36) + '.jpg', { type: 'image/jpeg' });
        try { note.style.filter = 'brightness(2)'; setTimeout(function () { if (note) note.style.filter = ''; }, 120); } catch (e) { }
        var p = (window.ChatBox && ChatBox.sendFile) ? ChatBox.sendFile(f, 2) : Promise.reject(new Error('حدّث chatbox.js في صفحة الطالب (v=26)'));
        Promise.resolve(p).then(function (r) { if (!r) throw new Error('انتظر لحظة وأعد المحاولة'); ok.textContent = 'تم إرسال الصورة للمدرس ✓'; }, function (er) { ok.textContent = 'تعذّر الإرسال: ' + (er && er.message || ''); ok.style.background = '#dc2626'; })
          .then(function () { ok.style.display = 'block'; setTimeout(function () { ok.style.display = 'none'; ok.style.background = ''; if (note) note.classList.remove('cap'); }, 1300); });
      }, 'image/jpeg', 0.9);
    }
    /* [5] سحب + تغيير حجم + تكبير للنافذة: الحافة تتبع المؤشر مباشرة، ويُثبَّت المؤشر على المقبض فلا يصل لأي لوحة رسم */
    function floatify(n) {
      var MINW = 150, MINH = 130, saved = null;
      function toLT() { var r = n.getBoundingClientRect(); n.style.left = r.left + 'px'; n.style.top = r.top + 'px'; n.style.bottom = 'auto'; n.style.right = 'auto'; }
      var hd = n.querySelector('.sn-t'), dr = null;
      hd.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; toLT(); var r = n.getBoundingClientRect(); dr = { x: e.clientX, y: e.clientY, l: r.left, t: r.top }; try { hd.setPointerCapture(e.pointerId); } catch (x) { } e.preventDefault(); e.stopPropagation(); });
      hd.addEventListener('pointermove', function (e) { if (!dr) return; var l = dr.l + e.clientX - dr.x, t = dr.t + e.clientY - dr.y; n.style.left = Math.max(0, Math.min(innerWidth - 60, l)) + 'px'; n.style.top = Math.max(0, Math.min(innerHeight - 40, t)) + 'px'; saved = null; });
      ['pointerup', 'pointercancel'].forEach(function (ev) { hd.addEventListener(ev, function () { dr = null; }); });
      n.querySelectorAll('[data-rz]').forEach(function (h) {
        var rs = null, dir = h.dataset.rz;
        h.addEventListener('pointerdown', function (e) { toLT(); var r = n.getBoundingClientRect(); rs = { x: e.clientX, y: e.clientY, l: r.left, w: r.width, h: r.height }; try { h.setPointerCapture(e.pointerId); } catch (x) { } e.preventDefault(); e.stopPropagation(); });
        h.addEventListener('pointermove', function (e) {
          if (!rs) return; var dx = e.clientX - rs.x, dy = e.clientY - rs.y, nh = rs.h, nw = rs.w, nl = rs.l;
          if (dir.indexOf('s') >= 0) nh = Math.max(MINH, rs.h + dy);
          if (dir.indexOf('e') >= 0) nw = Math.max(MINW, rs.w + dx);
          if (dir.indexOf('w') >= 0) { nw = Math.max(MINW, rs.w - dx); nl = rs.l + (rs.w - nw); }
          n.style.width = nw + 'px'; n.style.height = nh + 'px'; n.style.left = nl + 'px'; saved = null;
        });
        ['pointerup', 'pointercancel'].forEach(function (ev) { h.addEventListener(ev, function () { rs = null; }); });
      });
      var mx = n.querySelector('.sn-mx');
      mx.onclick = function () {
        if (saved) { n.style.left = saved.l; n.style.top = saved.t; n.style.width = saved.w; n.style.height = saved.h; saved = null; mx.textContent = '▢'; return; }
        toLT(); saved = { l: n.style.left, t: n.style.top, w: n.style.width, h: n.style.height };
        var W = Math.min(innerWidth - 16, 640), H = Math.min(innerHeight - 70, Math.round(W * 0.75));
        n.style.left = Math.round((innerWidth - W) / 2) + 'px'; n.style.top = '8px'; n.style.width = W + 'px'; n.style.height = H + 'px'; mx.textContent = '❐';
      };
    }
    function hideNote() { if (note) { note.remove(); note = null; } var o = document.getElementById('stuCamNote'); if (o) o.remove(); }
    /* تبديل الكاميرا الأمامية/الخلفية دون قطع البث: نستبدل مسار الفيديو في الاتصال */
    async function flip() {
      var want = facing === 'user' ? 'environment' : 'user';
      try {
        var ns = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: want }, width: 640, height: 480 } });
        var nt = ns.getVideoTracks()[0];
        stream.getVideoTracks().forEach(function (t) { stream.removeTrack(t); t.stop(); });
        stream.addTrack(nt); facing = want;
        video.srcObject = stream;
        if (pc) pc.getSenders().forEach(function (sn) { if (sn.track && sn.track.kind === 'video') { try { sn.replaceTrack(nt); } catch (e) { } } });
        if (note) { note.classList.toggle('back', facing === 'environment'); note.querySelector('video').srcObject = stream; }
      } catch (e) { alert('تعذّر تبديل الكاميرا: ' + (e && e.message || e)); }
    }

    async function start() {
      var id = sid(); if (!id) { alert('لم يكتمل دخولك بعد — انتظر قليلًا ثم أعد المحاولة'); return; }
      /* [2] الفيديو أولًا (فوري) ثم نحاول إضافة الصوت بمهلة 8 ثوانٍ حتى لا يعلق الزر عند نافذة إذن المايك */
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: 640, height: 480, frameRate: { max: 24 } } }); }
      catch (e2) { stream = null; alert('خطأ الكاميرا: ' + (e2 && e2.message || e2)); return; }
      try {
        var au = await Promise.race([navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }), new Promise(function (_, rj) { setTimeout(function () { rj(new Error('timeout')); }, 8000); })]);
        au.getAudioTracks().forEach(function (t) { stream.addTrack(t); });
      } catch (e3) { console.warn('[cam] بدون صوت:', e3 && e3.message); }
      video.srcObject = stream; try { await video.play(); } catch (e) { }
      btn.classList.add('on'); live = false; warned = false; showNote();

      /* لقطات احتياطية كل ثانيتين إلى أن يتصل البث الحي */
      /* [3.1] لقطات احتياطية: لقطة كل 2ث أول 6 ثوانٍ؛ إن لم يتصل البث المباشر (شبكة/جدار ناري) تتسارع لنحو 3 لقطات/ث فيبقى للمعلم صورة متحركة (بدون صوت) */
      var t0 = Date.now(), lastShot = 0;
      shotT = setInterval(function () {
        if (live || !video.videoWidth) return;
        var now = Date.now(), fast = now - t0 > 6000;
        if (now - lastShot < (fast ? 330 : 2000)) return; lastShot = now;
        var w = fast ? 256 : 320, h = fast ? 192 : 240; cv.width = w; cv.height = h; cv.getContext('2d').drawImage(video, 0, 0, w, h);
        RTC.child('camShot/' + id).set({ d: cv.toDataURL('image/jpeg', fast ? 0.45 : 0.5), ts: now }).catch(err);
      }, 330);

      /* البث الحي */
      try {
        await RTC.child('s2t_cam_ice/' + id).remove();
        pc = new RTCPeerConnection({ iceServers: (window.CUSTOM_ICE && window.CUSTOM_ICE.length) ? window.CUSTOM_ICE : [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }, { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' }, { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }, { urls: 'turns:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }] });
        stream.getTracks().forEach(function (t) { pc.addTrack(t, stream); });
        pc.onicecandidate = function (e) { if (e.candidate) RTC.child('s2t_cam_ice/' + id).push(e.candidate.toJSON()).catch(err); };
        pc.onconnectionstatechange = function () { live = pc && pc.connectionState === 'connected'; if (live) RTC.child('camShot/' + id).remove().catch(function () { }); };
        var offer = await pc.createOffer(); await pc.setLocalDescription(offer);
        var mark = offer.sdp.length;
        await RTC.child('s2t_cam_offer/' + id).set({ type: offer.type, sdp: offer.sdp, m: mark });
        await RTC.child('camOn/' + id).set({ on: true, ts: Date.now() });
        var aR = RTC.child('t2s_cam_answer/' + id), iR = RTC.child('t2s_cam_ice/' + id), got = false, myPc = pc;
        var acb = async function (sn) {
          var a = sn.val(); if (!a || !a.sdp || a.m !== mark || got || myPc !== pc) return;
          got = true;
          try { await myPc.setRemoteDescription(new RTCSessionDescription({ type: a.type, sdp: a.sdp })); } catch (e) { got = false; return; }
          var icb = function (s) { var c = s.val(); if (c) myPc.addIceCandidate(new RTCIceCandidate(c)).catch(function () { }); };
          iR.on('child_added', icb); offs.push(function () { iR.off('child_added', icb); });
        };
        aR.on('value', acb); offs.push(function () { aR.off('value', acb); });
      } catch (e) { err(e); }
    }

    function stop() {
      clearInterval(shotT); shotT = 0; live = false;
      offs.forEach(function (f) { try { f(); } catch (e) { } }); offs = [];
      try { pc && pc.close(); } catch (e) { } pc = null;
      if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
      hideNote(); var id = sid(); btn.classList.remove('on');
      if (id) { RTC.child('camOn/' + id).set({ on: false, ts: Date.now() }).catch(function () { }); RTC.child('s2t_cam_offer/' + id).remove().catch(function () { }); RTC.child('camShot/' + id).remove().catch(function () { }); }
    }

    btn.addEventListener('click', function () { (stream ? Promise.resolve(stop()) : start()).catch(function (e) { err(e); try { stop(); } catch (x) { } }); });
    window.addEventListener('beforeunload', function () { try { stop(); } catch (e) { } });
  })();
}

/* [S3] زر «خروج» في شريط الطالب السفلي: تأكيد ثم إغلاق الصفحة (أو مغادرتها إن منع المتصفح الإغلاق) فيُنظَّف حضور الطالب عبر beforeunload */
(function () {
  function wire() {
    var b = document.getElementById('exitBtn'); if (!b) { return; }
    b.addEventListener('click', function () {
      if (!confirm('الخروج من الحصة؟')) return;
      try { var cb = document.getElementById('camBtn'); if (cb && cb.classList.contains('on')) cb.click(); } catch (e) { }
      try { window.close(); } catch (e) { }
      setTimeout(function () { try { location.replace('about:blank'); } catch (e) { } }, 250);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
