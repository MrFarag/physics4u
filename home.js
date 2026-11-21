(function () {
    'use strict';
    const H = window.HOME, $ = id => document.getElementById(id);
    const q = new URLSearchParams(location.search), CFG = window.MC_CONFIG || {}, ROOM = (q.get('room') || CFG.liveRoom || 'live').replace(/[.#$\[\]\/]/g, '_');
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const waLink = t => 'https://wa.me/' + H.whatsapp + '?text=' + encodeURIComponent(t);
    try { firebase.initializeApp(CFG.firebase || { apiKey: 'AIzaSyB7E4NsGQbCehVSQ3Kj97yExRZwpHzTOl8', databaseURL: 'https://myclaive-default-rtdb.firebaseio.com' }); } catch (e) {}
    $('tName').textContent = H.teacher; { const f = document.getElementById('fabLive'); if (f && ROOM !== (CFG.liveRoom || 'live')) f.href = 'live.html?room=' + encodeURIComponent(ROOM); }
    if (ROOM !== (CFG.liveRoom || 'live')) { $('roomTag').textContent = 'تجريبي: ' + ROOM; $('joinBtn').href = 'live.html?room=' + encodeURIComponent(ROOM); }

    $('sched').innerHTML = '<b>مواعيد الحصص</b>' + H.schedule.map(s => '<div><span>' + esc(s.day) + ' ' + esc(s.time) + '</span><span>' + esc(s.title) + '</span></div>').join('');

    function openVideo(v) {
        $('mbody').innerHTML = '<h3 style="margin-bottom:10px">' + esc(v.title) + '</h3>' + (v.video
            ? '<iframe src="https://www.youtube.com/embed/' + encodeURIComponent(v.video) + '?rel=0&origin=' + encodeURIComponent(location.origin) + '" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe><p style="margin-top:8px;font-size:12px"><a style="color:#7dd3fc" target="_blank" rel="noopener" href="https://youtu.be/' + encodeURIComponent(v.video) + '">إن لم يعمل الفيديو: شاهده على يوتيوب ↗</a></p>'
            : '<div class="soon"><big>🎬</big>هذا الفيديو عيّنة تجريبية — سيُضاف المحتوى الحقيقي قريبًا</div>');
        $('modal').classList.add('on');
    }
    function media(list, grid, tint) {
        list.forEach((v, i) => {
            const d = document.createElement('div'); d.className = 'card'; d.style.cursor = 'pointer';
            d.innerHTML = '<div class="thumb" style="background:linear-gradient(135deg,hsl(' + ((i * 47 + tint) % 360) + ',55%,32%),#0a101d)"><div class="play">▶</div><span class="dur">' + v.mins + ' د</span></div><div class="cbody"><h3>' + esc(v.title) + '</h3>' + (v.level ? '<div class="meta">' + esc(v.level) + '</div>' : '') + '</div>';
            d.onclick = () => openVideo(v);
            $(grid).appendChild(d);
        });
    }
    media(H.freeLessons, 'freeGrid', 200); media(H.videos, 'vidGrid', 30);

    /* ════ المحتوى المدفوع (catalog) + الأكواد ════ */
    const KIND = { course: ['كورس', '🎓'], lesson: ['درس', '📘'], video: ['فيديو', '🎬'] };
    let uid = null, mine = {}, catalog = null;
    const COLORS = ['#1565c0', '#7c3aed', '#0f766e', '#b45309', '#be123c', '#0369a1'];
    function drawCourses() {
        const grid = $('courseGrid'); grid.innerHTML = '';
        const real = catalog && Object.keys(catalog).filter(k => k !== 'live' && KIND[catalog[k].kind]);
        const sample = !real || !real.length;
        $('sampleNote').style.display = sample ? '' : 'none';
        const list = sample ? H.courses.map(c => ({ id: c.id, title: c.title, level: c.level, price: c.price, color: c.color, icon: c.icon, extra: c.lessons + ' حصة · ' + c.hours + ' ساعة', sample: true }))
            : real.map((k, i) => ({ id: k, title: catalog[k].title, level: catalog[k].level || '', price: catalog[k].price || 0, color: COLORS[i % COLORS.length], icon: KIND[catalog[k].kind][1], extra: KIND[catalog[k].kind][0] }));
        list.forEach(c => {
            const open = !c.sample && (mine[c.id] || !c.price);
            const d = document.createElement('div'); d.className = 'card';
            d.innerHTML = '<div class="thumb" style="background:linear-gradient(135deg,' + c.color + ',#0a101d)">' + c.icon + (open || c.sample ? '' : '<span class="badge-lock">🔒 مقفل</span>') + '</div><div class="cbody"><h3>' + esc(c.title) + '</h3><div class="meta">' + esc(c.level) + (c.level && c.extra ? ' · ' : '') + esc(c.extra) + '</div><div class="row"><span class="price">' + (c.price ? c.price + ' ج.م' : 'مجاني') + '</span><span class="bt"></span></div></div>';
            const bt = d.querySelector('.bt');
            if (open) { const b = document.createElement('button'); b.className = 'btn green small'; b.textContent = '▶ مشاهدة'; b.onclick = () => watchPaid(c); bt.appendChild(b); }
            else {
                const b = document.createElement('button'); b.className = 'btn blue small'; b.textContent = 'اشترك';
                b.onclick = () => window.open(waLink('السلام عليكم، أريد الاشتراك في: ' + c.title + ' (' + c.price + ' ج.م)\nاسمي الثلاثي: '), '_blank'); bt.appendChild(b);
            }
            grid.appendChild(d);
        });
    }
    async function watchPaid(c) {
        $('mbody').innerHTML = '<div class="soon">جارٍ التحميل…</div>'; $('modal').classList.add('on');
        try {
            const v = (await firebase.database().ref('paid/' + c.id).once('value')).val();
            openVideo({ title: c.title, video: v && v.video });
        } catch (e) { openVideo({ title: c.title, video: '' }); }
    }
    function loadMine() { return firebase.database().ref('access/' + uid).once('value').then(s => { mine = s.val() || {}; }); }
    function initPaid() {
        drawCourses();
        if (!firebase.auth) return;
        firebase.auth().signInAnonymously().then(c => {
            uid = c.user.uid;
            firebase.database().ref('catalog').on('value', s => { catalog = s.val(); drawCourses(); liveInfo(); });
            firebase.database().ref('access/' + uid).on('value', s => { mine = s.val() || {}; drawCourses(); liveInfo(); });
        }).catch(e => console.warn('paid init', e && e.message));
    }
    function liveInfo() {
        const l = catalog && catalog.live; if (!l) return;
        $('liveSub').textContent = mine.live ? 'أنت مشترك — ادخل الحصة عند بدء البث.' : 'البث المباشر بمقابل ' + (l.price || 0) + ' ج.م — اشترك ثم اكتب الكود عند الدخول.';
        const old = $('liveSubBtn'); if (old) old.remove();
        if (!mine.live) {
            const a = document.createElement('a'); a.id = 'liveSubBtn'; a.className = 'btn blue'; a.style.cssText = 'display:block;text-align:center;margin-top:8px'; a.textContent = 'اشترك في البث المباشر';
            a.href = waLink('السلام عليكم، أريد الاشتراك في البث المباشر (' + (l.price || 0) + ' ج.م)\nاسمي الثلاثي: '); a.target = '_blank'; $('liveCard').insertBefore(a, $('sched'));
        }
    }
    /* تفعيل كود */
    $('codeBtn').onclick = () => { $('codeMsg').textContent = ''; $('codeIn').value = ''; $('codeModal').classList.add('on'); };
    $('cmx').onclick = () => $('codeModal').classList.remove('on');
    $('codeGo').onclick = async () => {
        const m = $('codeMsg'), code = $('codeIn').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const say = (t, ok) => { m.style.color = ok ? '#22c55e' : '#ff8a8a'; m.textContent = t; };
        if (!uid) return say('جارٍ الاتصال… حاول بعد لحظة');
        if (!code) return say('اكتب الكود');
        try {
            const db = firebase.database(), c = (await db.ref('codes/' + code).once('value')).val();
            if (!c) return say('الكود غير صحيح');
            if (c.uid && c.uid !== uid) return say('هذا الكود مستخدم من طالب آخر');
            if (!c.uid) await db.ref('codes/' + code + '/uid').set(uid);
            await db.ref('access/' + uid + '/' + c.item).set(code);
            await loadMine(); drawCourses(); liveInfo();
            say('✅ تم التفعيل' + (catalog && catalog[c.item] ? ': ' + catalog[c.item].title : ''), true);
        } catch (e) { say('تعذر التفعيل، حاول لاحقًا'); }
    };
    initPaid();
    $('mx').onclick = () => { $('modal').classList.remove('on'); $('mbody').innerHTML = ''; };
    $('modal').onclick = e => { if (e.target === $('modal')) $('mx').onclick(); };

    /* حالة البث: المدرس يكتب ping_t كل 6 ثوانٍ — إن تغيّرت القيمة خلال 15 ثانية فهو متصل الآن */
    let liveTimer = null, first = true;
    function setLive(on) {
        $('liveDot').classList.toggle('on', on);
        $('liveTxt').textContent = on ? 'المدرس في بث مباشر الآن' : 'لا يوجد بث حاليًا';
        $('liveSub').textContent = on ? 'اضغط للدخول — سيقبلك المدرس بعد التسجيل.' : 'راجع مواعيد الحصص أدناه، وتابع الدروس المجانية.';
    }
    setLive(false);
    try {
        firebase.database().ref((ROOM ? 'rooms/' + ROOM + '/' : '') + 'ping_t').on('value', () => {
            if (first) { first = false; return; }   /* القيمة الأولى قديمة محفوظة، لا تعني بثًا */
            setLive(true); clearTimeout(liveTimer); liveTimer = setTimeout(() => setLive(false), 15000);
        });
    } catch (e) { /* بدون اتصال: يبقى "لا يوجد بث" */ }
})();
