/* ════════════════════════════════════════════════════════════════════ *
 *  student.js — الطالب (مشاهدة فقط)                                    *
 *  يستقبل: session {order, current} + slideImgs/{id} من المدرس.          *
 *  يُرسل: joinRequests / onlineStudents / handRaised.                     *
 *  لا يرسم ولا يعدّل على الشرائح. (الصوت والملفات: مراحل لاحقة)           *
 * ════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const SECRET = '135';   /* تنبيه: يُفحص هنا فقط — الحماية الحقيقية في قواعد Firebase */

    /* ── Firebase + الغرفة التجريبية (?room=test) ── */
    const CFG = window.MC_CONFIG || {};
    /* وضع محلي: إن فشل مفتاح Firebase API أو لم يُحمَّل، يبقى التطبيق يعمل بواجهة محدودة (غرفة تجريبية) */
    let LOCAL_MODE = false;
    let db = null;
    try {
        firebase.initializeApp(CFG.firebase || {
            apiKey: 'AIzaSyB7E4NsGQbCehVSQ3Kj97yExRZwpHzTOl8',
            databaseURL: 'https://myclaive-default-rtdb.firebaseio.com'
        });
        db = firebase.database();
    } catch (e) {
        console.warn('Firebase.initialize فشل — وضع محلي:', e && e.code || e);
        LOCAL_MODE = true;
    }
    const isApiKeyErr = c => /api-key-not-valid|api-key|invalid-api-key|INTERNAL_NOT_FOUND|admin-restricted-operation/.test(String(c));
    const LIVE_ROOM = CFG.liveRoom || 'live';
    const ROOM = (new URLSearchParams(location.search).get('room') || LIVE_ROOM).replace(/[.#$\[\]\/]/g, '_');
    const IS_TEST = ROOM === 'test';          /* التجريبية: بلا حساب ولا أكواد */
    /* في الوضع المحلي: نُجبر الغرفة لتجريبي حتى لا ينتظر الطالب اتصالاً مستحيلًا */
    const EFF_ROOM = LOCAL_MODE ? 'test' : ROOM;
    const BASE = 'rooms/' + EFF_ROOM + '/';
    const ref = p => db ? db.ref(BASE + p) : { once: () => Promise.resolve({ exists: () => false, val: () => null }), on: () => {}, set: () => Promise.resolve(), update: () => Promise.resolve(), remove: () => Promise.resolve() };
    /* [IX2] تحقق مُشفَّر من الكود + رقم الواتس: المعلم ينشر codeIndex/{sha('c|'+كود)} = sha(كود+'|'+آخر9أرقام) (الكود المفعَّل فقط) */
    function sha(m){var K=[],H=[],p=2,i,j;function f(x){return((x-Math.floor(x))*4294967296)|0;}function r(x,n){return(x>>>n)|(x<<(32-n));}
    for(;K.length<64;p++){for(j=2;j*j<=p&&p%j;j++);if(j*j>p){if(H.length<8)H.push(f(Math.pow(p,.5)));K.push(f(Math.pow(p,1/3)));}}
    var b=unescape(encodeURIComponent(m)),l=b.length,w=[],N=(((l+8)>>6)+1)*16;for(i=0;i<N;i++)w[i]=0;
    for(i=0;i<l;i++)w[i>>2]|=b.charCodeAt(i)<<(24-(i%4)*8);w[l>>2]|=0x80<<(24-(l%4)*8);w[N-1]=l*8;
    for(i=0;i<N;i+=16){var a=H.slice(0),W=w.slice(i,i+16);for(j=0;j<64;j++){if(j>=16){var s0=r(W[j-15],7)^r(W[j-15],18)^(W[j-15]>>>3),s1=r(W[j-2],17)^r(W[j-2],19)^(W[j-2]>>>10);W[j]=(W[j-16]+s0+W[j-7]+s1)|0;}
    var e=a[4],t1=(a[7]+(r(e,6)^r(e,11)^r(e,25))+((e&a[5])^(~e&a[6]))+K[j]+W[j])|0,A=a[0],t2=((r(A,2)^r(A,13)^r(A,22))+((A&a[1])^(A&a[2])^(a[1]&a[2])))|0;a=[(t1+t2)|0,a[0],a[1],a[2],(a[3]+t1)|0,a[4],a[5],a[6]];}
    for(j=0;j<8;j++)H[j]=(H[j]+a[j])|0;}
    return H.map(function(x){return('00000000'+(x>>>0).toString(16)).slice(-8);}).join('');}
    const l9 = x => String(x || '').replace(/\D/g, '').slice(-9);
    async function idxCheck(code, phone) {   /* 'ok' | 'phone' (الكود موجود لرقم آخر) | 'none' */
        try { const v = (await ref('codeIndex/' + sha('c|' + code)).once('value')).val(); if (!v) return 'none'; return v === sha(code + '|' + l9(phone)) ? 'ok' : 'phone'; } catch (e) { console.warn('[codeIndex]', e); return 'err'; }
    }
    const $ = id => document.getElementById(id);
    const toArr = o => Array.isArray(o) ? o.filter(Boolean) : Object.values(o || {});

    if (EFF_ROOM !== LIVE_ROOM) $('brandName').textContent = 'تجريبي: ' + EFF_ROOM;
    if (LOCAL_MODE) {
        const bar = document.createElement('div');
        bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99997;background:#7c2d12;color:#fff;text-align:center;font:12px Cairo,sans-serif;padding:5px;direction:rtl';
        bar.innerHTML = '⚠️ وضع محلي — مفتاح Firebase غير صالح. يعمل التطبيق بواجهة تجريبية محدودة. أبلغ المدرس. (auth/api-key-not-valid)';
        document.body.appendChild(bar);
    }

    /* ── حالة الطالب ── */
    let myId = 's' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);   /* في الغرفة الحقيقية يصبح معرّف حسابي (uid) */
    let authReady = IS_TEST || LOCAL_MODE || !firebase.auth;
    let myName = '', myPhone = '';
    let myGrade = '', myCountry = '', myGov = '', myDistr = '';
    let approved = false, entered = false;
    let order = [];            /* ترتيب الشرائح من المدرس */
    const pagesData = {};      /* id → { bg, g, s:strokes, i:images, w, h, ts } */
    const imgSrc = {};         /* مفتاح الصورة → dataURL */
    let teacherCur = null;     /* شريحة المدرس الحالية */
    let active = null;         /* الشريحة المعروضة عندي */
    let fitMode = 'one', scale = 1;   /* one = 100% مثل المدرس (الافتراضي) | width | page | free */
    let segs = [];             /* رسم القلم المباشر الذي لم تصل صفحته بعد */
    let shapePrev = null;      /* معاينة الشكل أثناء سحبه */
    let shownSlide = null;
    const SESS = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const DEV = (function () { const u = navigator.userAgent; const os = /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? (/Mobile/.test(u) ? 'موبايل Android' : 'تابلت Android') : /Windows/.test(u) ? 'كمبيوتر Windows' : /Macintosh/.test(u) ? 'Mac' : /Linux/.test(u) ? 'Linux' : 'جهاز'; const br = /Edg\//.test(u) ? 'Edge' : /OPR\//.test(u) ? 'Opera' : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : /Firefox\//.test(u) ? 'Firefox' : ''; return os + (br ? ' · ' + br : ''); })();

    /* [TB1] كل التنبيهات والترحيب والتعليمات تظهر داخل حدود الشريط العلوي فقط ولا تصل للسبورة (حتى أثناء الاختبار) */
    (function () {
        const st = document.createElement('style'); st.id = 'tbToastCss';
        st.textContent = '#toastBox{position:fixed!important;top:0!important;left:50%!important;right:auto!important;bottom:auto!important;transform:translateX(-50%)!important;width:auto!important;max-width:44vw;height:var(--tbh,40px);display:flex!important;align-items:center;justify-content:center;overflow:hidden;z-index:99996;pointer-events:none;margin:0!important;padding:0!important;background:transparent!important}' +
            '#toastBox .toast{position:static!important;margin:0!important;max-width:100%;padding:3px 14px!important;font-size:12px!important;line-height:1.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-radius:999px!important;transform:none!important}' +
            '#cbToast{top:calc((var(--tbh,40px) - 26px) / 2)!important;bottom:auto!important;max-width:44vw!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:3px 14px!important;font-size:12px!important;border-radius:999px!important}';
        document.head.appendChild(st);
        const fit = () => { const tb = document.querySelector('.top-bar'); if (tb) document.documentElement.style.setProperty('--tbh', Math.round(tb.getBoundingClientRect().height) + 'px'); };
        fit(); window.addEventListener('resize', fit); setTimeout(fit, 600);
    })();
    function toast(msg, cls) {
        const bx = $('toastBox'); if (bx) bx.innerHTML = '';   /* تنبيه واحد فقط داخل الشريط */
        const t = document.createElement('div');
        t.className = 'toast ' + (cls || '');
        t.textContent = msg;
        $('toastBox').appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3500);
    }
    const store = {
        get: k => { try { return localStorage.getItem(k) || ''; } catch (_) { return ''; } },
        set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) { } }
    };

    /* ════════ الدخول ════════
       واجهة جديدة: الاسم + رقم الواتس + الصف (قائمة) + البلد + المحافظة + القطر + الكود.
       زر واحد فقط ينقلب بين «دخول» و«طلب كود» حسب حالة الطالب.
       البيانات تُحفظ في: localStorage + Firebase (students/<uid>) — فلا تضيع. */

    /* استرجاع البيانات المحفوظة محليًا وتعبئة الحقول تلقائيًا */
    function fillFormFromStorage() {
        $('studentName').value = store.get('mc_name') || '';
        $('studentPhone').value = store.get('mc_phone') || '';
        const grade = store.get('mc_grade') || '';
        if (grade && $('studentGrade')) $('studentGrade').value = grade;
        $('studentCountry').value = store.get('mc_country') || '';
        $('studentGov').value = store.get('mc_gov') || '';
        $('studentDistr').value = store.get('mc_distr') || '';
    }
    fillFormFromStorage();

    /* حفظ كل البيانات محليًا + في Firebase عند كل تغيير (حتى لا تضيع) */
    function saveStudentProfile(silent) {
        const name = $('studentName').value.trim();
        const phone = $('studentPhone').value.trim();
        const grade = $('studentGrade') ? $('studentGrade').value : '';
        const country = $('studentCountry').value.trim();
        const gov = $('studentGov').value.trim();
        const distr = $('studentDistr').value.trim();
        /* 1) localStorage فوري */
        store.set('mc_name', name);
        store.set('mc_phone', phone);
        store.set('mc_grade', grade);
        store.set('mc_country', country);
        store.set('mc_gov', gov);
        store.set('mc_distr', distr);
        /* 2) لا نكتب في Firebase هنا — قد تمنع القواعد ذلك.
           البيانات تُحفظ في joinRequests/<uid> عند الدخول (مسموح به). */
        if (!silent && name) toast('✅ تم حفظ بياناتك');
    }
    /* حفظ تلقائي عند كل تغيير في أي حقل */
    ['studentName','studentPhone','studentGrade','studentCountry','studentGov','studentDistr'].forEach(id => {
        const el = $(id); if (el) el.addEventListener('change', () => saveStudentProfile(true));
    });

    const TEMP_QUICK = true;
    if (!IS_TEST && !LOCAL_MODE) {
        $('studentSecret').type = 'text'; $('studentSecret').placeholder = 'كود الاشتراك (إن وُجد)'; $('studentSecret').autocomplete = 'off';
        $('secretErr').textContent = '';
        if (firebase.auth) firebase.auth().signInAnonymously().then(async c => {
            myId = c.user.uid; authReady = true;
            /* بعد المصادقة: نسترجع الكود المحفوظ محليًا (localStorage)
               لكن نتأكد من صحته في Firebase قبل ملء الحقل */
            try {
                const savedCode = store.get('mc_code');
                if (savedCode && savedCode.length > 2) {
                    /* نتأكد إن كان الكود لا يزال صالحاً في Firebase */
                    try {
                        const c = (await db.ref('codes/' + savedCode).once('value').catch(() => ({ val: () => null }))).val();
                        const ix = (c && c.item === 'live') ? 'ok' : await idxCheck(savedCode, $('studentPhone').value);
                        if (ix === 'ok') {
                            $('studentSecret').value = savedCode;
                            updateEntryButton();
                            toast('✅ مرحبًا بعودتك — كودك محفوظ');
                        } else {
                            /* الكود لم يعد صالحاً → نحذفه محليًا */
                            store.set('mc_code', '');
                        }
                    } catch (e) {
                        /* تعذرت القراءة → نترك الحقل فارغاً ليُدخل الطالب الكود يدويًا */
                        console.warn('تعذرت قراءة الكود المحفوظ من Firebase:', e);
                    }
                }
            } catch (e) { /* لا بأس */ }
        })
        .catch(e => {
            const c = e && e.code || String(e);
            if (isApiKeyErr(c)) {
                LOCAL_MODE = true; authReady = true;
                $('secretErr').style.display = 'block';
                $('secretErr').style.color = '#fde68a';
                $('secretErr').textContent = '⚠️ مفتاح Firebase غير صالح — الدخول بوضع محلي محدود. اكتب الكود 135 للمتابعة.';
                $('studentSecret').placeholder = 'الكود التجريبي: 135';
            } else {
                $('secretErr').style.display = 'block';
                $('secretErr').textContent = '❌ تعذر الاتصال بالخادم، حدّث الصفحة';
            }
        });
        setTimeout(function () {
            if (authReady || LOCAL_MODE) return;
            LOCAL_MODE = true; authReady = true;
            $('secretErr').style.display = 'block';
            $('secretErr').style.color = '#fde68a';
            $('secretErr').textContent = '⚠️ مفتاح Firebase غير صالح — الدخول بوضع محلي محدود. اكتب الكود 135 للمتابعة.';
            $('studentSecret').placeholder = 'الكود التجريبي: 135';
        }, 7000);
    }

    /* تحديث نص الزر حسب حالة الطالب: «دخول» إن وُجد كود، «طلب كود» إن لم يُسجّل */
    function updateEntryButton() {
        const btn = $('entryBtn');
        const code = ($('studentSecret').value || '').trim();
        if (!code) {
            btn.textContent = '🔑 طلب كود';
            btn.dataset.mode = 'request';
            btn.classList.add('btn-request');
        } else {
            btn.textContent = '🚪 دخول';
            btn.dataset.mode = 'enter';
            btn.classList.remove('btn-request');
        }
    }
    ['studentName','studentPhone','studentSecret'].forEach(id => {
        const el = $(id); if (el) el.addEventListener('input', updateEntryButton);
    });

    async function checkAccess() {
        if (LOCAL_MODE) return true;
        const code = $('studentSecret').value.trim();
        if (!code) throw new Error('اكتب كود الاشتراك الذي أرسله لك المدرس');
        const k = code.replace(/[.#$\[\]\/]/g, '_');
        /* 1) الفهرس المُشفَّر (كود + رقم الواتس المسجَّلان عند المعلم، والمفعَّلان فقط) */
        let valid = false, st = await idxCheck(code, $('studentPhone').value);
        if (st === 'ok') valid = true;
        /* 2) اشتراكات الجذر codes/ (النظام القديم) */
        if (!valid && st !== 'phone') {
            try {
                const c = (await db.ref('codes/' + code).once('value')).val();
                if (c && c.item === 'live') valid = true;
            } catch (e) { /* قد تمنع القواعد */ }
        }
        if (!valid) throw new Error(st === 'phone' ? 'هذا الكود مسجَّل لرقم واتس آخر' : st === 'err' ? 'تعذّر التحقق من الكود الآن (إعدادات الخادم) — أبلغ المدرس' : 'الكود غير صحيح أو غير مفعّل — تأكد من الكود ومن رقم الواتس المسجَّل');
        /* الكود صحيح → نحفظه محليًا للزيارات القادمة */
        store.set('mc_code', code);
        return true;
    }

    /* إرسال طلب كود جديد:
       - نحذف أي كود قديم مرتبط برقم الواتس هذا (حتى لا يظهر "هذا الرقم مسجل بكود آخر")
       - نكتب الطلب في codeRequests/<uid> */
    async function requestCode() {
        const name = $('studentName').value.trim();
        const phone = $('studentPhone').value.trim();
        const grade = $('studentGrade') ? $('studentGrade').value : '';
        const country = $('studentCountry').value.trim();
        const gov = $('studentGov').value.trim();
        const distr = $('studentDistr').value.trim();

        if (!name) { $('studentName').focus(); toast('الرجاء إدخال الاسم', 'a'); return; }
        if (name.split(/\s+/).length < 2) { $('studentName').focus(); toast('اكتب اسمك الثنائي على الأقل', 'a'); return; }
        if (!phone) { $('studentPhone').focus(); toast('الرجاء إدخال رقم الواتس', 'a'); return; }
        if (phone.replace(/\D/g, '').length < 8) { $('studentPhone').focus(); toast('رقم الواتس غير صحيح', 'a'); return; }
        if (!grade) { $('studentGrade').focus(); toast('اختر الصف الدراسي', 'a'); return; }

        saveStudentProfile(true);

        /* [WS1] يرسل الطالب بياناته إلى واتساب المدرس مباشرة (يُفتح فورًا ضمن ضغطة الزر حتى لا يحجبه المتصفح) */
        try {
            const wa = document.querySelector('.wa-btn'), tn = ((wa && wa.href.match(/wa\.me\/(\d+)/)) || [])[1] || '201011418992';
            const gradeTxt = $('studentGrade').selectedOptions && $('studentGrade').selectedOptions[0] ? $('studentGrade').selectedOptions[0].textContent.trim() : grade;
            const txt = ['السلام عليكم يا مستر، أرجو إرسال كود الدخول لي:', '', 'الاسم: ' + name, 'رقم الواتس: ' + phone, 'الصف: ' + gradeTxt,
                'البلد: ' + (country || '-'), 'المحافظة: ' + (gov || '-'), 'القطر/المنطقة: ' + (distr || '-')].join('\n');
            const w = window.open('https://wa.me/' + tn + '?text=' + encodeURIComponent(txt), '_blank');
            if (!w) { toast('⚠ اسمح للصفحة بفتح واتساب (النوافذ المنبثقة) ثم اضغط «طلب كود» مرة أخرى', 'a'); return; }   /* لا يُسجَّل الطلب في الصفحة إلا بعد فتح واتساب فعلًا */
            try { w.opener = null; } catch (e2) { }
        } catch (e) { console.warn('[WS1]', e); return; }

        if (LOCAL_MODE || IS_TEST) {
            toast('✅ تم تسجيل طلبك (وضع تجريبي) — الكود التجريبي: 135');
            $('studentSecret').value = SECRET;
            updateEntryButton();
            return;
        }

        if (!db) { toast('تعذّر الاتصال بقاعدة البيانات', 'a'); return; }

        /* نحصل على UID حقيقي من Firebase Auth */
        let uid = myId;
        try {
            if (firebase.auth && firebase.auth().currentUser) {
                uid = firebase.auth().currentUser.uid;
                myId = uid;
            } else if (firebase.auth) {
                toast('جارٍ الاتصال بالخادم… انتظر لحظة', 'a');
                try {
                    const cred = await firebase.auth().signInAnonymously();
                    uid = cred.user.uid;
                    myId = uid;
                    authReady = true;
                } catch (e) {
                    toast('تعذّر الاتصال بالخادم', 'a');
                    return;
                }
            }
        } catch (e) { }

        const btn = $('entryBtn');
        if (btn) { btn.disabled = true; btn.textContent = '⏳ جارٍ الإرسال…'; }

        /* نحذف أي كود قديم مرتبط برقم الواتس هذا في codesByPhone/<phone> */
        try {
            const oldCodeSnap = await db.ref('codesByPhone/' + phone).once('value');
            if (oldCodeSnap.exists()) {
                const oldCode = oldCodeSnap.val();
                if (oldCode && typeof oldCode === 'string') {
                    /* نحذف الربط القديم */
                    await db.ref('codesByPhone/' + phone).remove();
                    /* نحذف الكود القديم نفسه إن لم يعد مرتبطاً بأحد */
                    await db.ref('codes/' + oldCode).remove();
                }
            }
        } catch (e) { console.warn('[requestCode] تعذّر حذف الكود القديم:', e); }

        /* نكتب الطلب في rooms/live/codeRequests/<uid> */
        const reqData = {
            id: uid, name: name, phone: phone, grade: grade,
            country: country, gov: gov, distr: distr,
            dev: DEV, sess: SESS, ts: Date.now()
        };

        try {
            await ref('codeRequests/' + uid).set(reqData);
            toast('✅ وصل طلبك للمدرس — أرسل رسالة واتساب التي فُتحت لك، وسيصلك الكود على واتس');
            if (btn) { btn.disabled = false; btn.textContent = '🔑 طلب كود'; btn.classList.add('btn-request'); }
        } catch (e) {
            console.error('[requestCode] فشل:', e);
            if (btn) { btn.disabled = false; btn.textContent = '🔑 طلب كود'; btn.classList.add('btn-request'); }
            const ecode = e && e.code || '';
            const emsg = e && e.message || String(e);
            if (ecode === 'PERMISSION_DENIED' || /permission/i.test(emsg)) {
                toast('تعذّر الإرسال — قواعد Firebase تمنع الكتابة', 'a');
            } else {
                toast('تعذّر الإرسال: ' + (ecode || emsg).slice(0, 80), 'a');
            }
        }
    }

    async function submitEntry(quick) {
        const name = $('studentName').value.trim();
        const phone = $('studentPhone').value.trim();
        const grade = $('studentGrade') ? $('studentGrade').value : '';
        const country = $('studentCountry').value.trim();
        const gov = $('studentGov').value.trim();
        const distr = $('studentDistr').value.trim();
        const sec = $('studentSecret').value.trim();
        const mode = $('entryBtn').dataset.mode || 'enter';

        /* إن كان وضع «طلب كود» ولا يوجد كود → ننفّذ requestCode بدل الدخول */
        if (mode === 'request' && !sec) { return requestCode(); }

        if (!name) { $('studentName').focus(); toast('الرجاء إدخال الاسم', 'a'); return; }
        if (name.split(/\s+/).length < 2) { $('studentName').focus(); toast('اكتب اسمك الثنائي على الأقل', 'a'); return; }
        if (!phone) { $('studentPhone').focus(); toast('الرجاء إدخال رقم الواتس', 'a'); return; }
        if (phone.replace(/\D/g, '').length < 8) { $('studentPhone').focus(); toast('رقم الواتس غير صحيح', 'a'); return; }
        if (!grade) { $('studentGrade').focus(); toast('اختر الصف الدراسي', 'a'); return; }

        if (IS_TEST || LOCAL_MODE) {
            if (sec !== SECRET) {
                $('secretErr').style.display = 'block';
                $('secretErr').textContent = '❌ الكود التجريبي هو 135';
                return;
            }
        } else {
            /* لا نمنع الدخول إذا فشل authReady — نحاول التحقق على أي حال */
            try { if (!(quick && TEMP_QUICK)) await checkAccess(); }
            catch (e) {
                $('secretErr').style.display = 'block';
                $('secretErr').textContent = '❌ ' + (e.message || 'تعذر التحقق من الكود');
                return;
            }
        }
        $('secretErr').style.display = 'none';
        myName = name; myPhone = phone;
        myGrade = grade; myCountry = country; myGov = gov; myDistr = distr;
        saveStudentProfile(true);
        if (sec) store.set('mc_code', sec);

        /* نتأكد من وجود UID حقيقي */
        if (firebase.auth && firebase.auth().currentUser) {
            myId = firebase.auth().currentUser.uid;
        }

        $('formPart').style.display = 'none';
        $('waitPart').style.display = 'block';

        /* نكتب طلب الدخول في rooms/live/joinRequests/<uid> */
        ref('joinRequests/' + myId).set({
            id: myId, name: myName, phone: myPhone,
            grade: myGrade, country: myCountry, gov: myGov, distr: myDistr,
            code: sec || '',
            dev: DEV, sess: SESS, ts: Date.now()
        });
        ref('joinRequests/' + myId).onDisconnect().remove();

        /* لا نكتب في rooms/live/students/ — قد تمنع القواعد ذلك.
           البيانات محفوظة في localStorage فقط. */

        ref('approvedStudents/' + myId).on('value', snap => {
            if (snap.exists() && !approved && snap.val().sess === SESS) { approved = true; enter(); setTimeout(showMicHint, 600); }
            else if (!snap.exists() && approved) {
                approved = false;
                /* [NB1] رسالة داخلية بدل نافذة المتصفح */
                const kd = document.createElement('div'); kd.textContent = 'تم إخراجك من الحصة من قِبل المدرس'; kd.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(2,6,23,.88);color:#fbbf24;font:700 18px Cairo,Tahoma,sans-serif;direction:rtl';
                document.body.appendChild(kd); setTimeout(() => location.reload(), 2200);
            }
        });
    }
    /* زر واحد فقط: ينقلب بين «دخول» و«طلب كود» حسب الحالة */
    $('entryBtn').addEventListener('click', () => submitEntry(false));
    $('studentSecret').addEventListener('keydown', e => { if (e.key === 'Enter') submitEntry(false); });
    updateEntryButton();

    function enter() {
        if (entered) return; entered = true;
        $('entryScreen').classList.add('hidden');
        toast('✅ مرحبًا ' + myName);
        $('welcome').textContent = 'مرحبًا بك يا ' + myName + ' في حصة Mr. Farag Physics 🌟';
        ref('joinRequests/' + myId).remove();

        /* الحضور: يُعاد تسجيله عند كل إعادة اتصال */
        db.ref('.info/connected').on('value', s => {
            if (!s.val()) return;
            const p = ref('onlineStudents/' + myId);
            p.onDisconnect().remove();
            p.set({ name: myName, online: true, dev: DEV });
        });
        const beat = () => { try { if (approved) { const q = ref('onlineStudents/' + myId); q.onDisconnect().remove(); q.set({ name: myName, online: true, dev: DEV }); } } catch (e) {} };
        document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });
        window.addEventListener('online', beat); window.addEventListener('focus', beat);
        ref('onlineStudents').on('value', s => { $('cnt').textContent = Object.keys(s.val() || {}).length; });
        /* المدرس قد ينزل يدي */

        connectAudio(); watchMicPermission(); listenShare();
        listen();
        let sec = 0;
        setInterval(() => {
            sec++;
            $('sessionTimer').textContent = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
        }, 1000);
    }


    /* ════════ الصوت (WebRTC) ════════ */
    const ICE = (window.CUSTOM_ICE && window.CUSTOM_ICE.length) ? window.CUSTOM_ICE : [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turns:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
    ];
    function addCand(pc, c) { if (!pc || !c) return; if (pc.remoteDescription && pc.remoteDescription.type) pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}); else (pc._q = pc._q || []).push(c); }
    function flushCand(pc) { (pc._q || []).splice(0).forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})); }
    let tPc = null, sPc = null, sStream = null, micOn = false, micAllowed = false;

    /* استقبال صوت المدرس */
    function connectAudio() {
        ref('rtc/t2s_offer/' + myId).on('value', async snap => {
            const off = snap.val(); if (!off || !off.sdp) return;
            if (tPc) { try { tPc.close(); } catch (e) {} }
            const pc = tPc = new RTCPeerConnection({ iceServers: ICE });
            pc.ontrack = e => { try { e.receiver.jitterBufferTarget = 200; } catch (er) {} const a = $('audioEl'); a.srcObject = e.streams[0]; a.play().catch(() => toast('اضغط على الشاشة لتشغيل صوت المدرس', 'a')); };
            pc.onicecandidate = e => { if (e.candidate) ref('rtc/s2t_ice/' + myId).push(e.candidate.toJSON()); };
            pc.onconnectionstatechange = () => {
                if (tPc === pc && ['failed', 'disconnected'].includes(pc.connectionState)) setTimeout(() => { if (tPc === pc) ref('rtc/join_notify').push(myId); }, 3000);
            };
            ref('rtc/t2s_ice/' + myId).off();
            ref('rtc/t2s_ice/' + myId).on('child_added', s => {
                const c = s.val(); s.ref.remove();
                if (c && tPc === pc) addCand(pc, c);
            });
            await pc.setRemoteDescription(new RTCSessionDescription(off)); flushCand(pc);
            const ans = await pc.createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
            await pc.setLocalDescription(ans);
            ref('rtc/s2t_answer/' + myId).set({ sdp: ans.sdp, type: ans.type, ts: Date.now(), for: off.ts });
        });
        document.addEventListener('click', () => { const a = $('audioEl'); if (a.srcObject && a.paused) a.play().catch(() => {}); });
    }

    /* مايك الطالب: طلب ← سماح المدرس ← إرسال */
    let lvAn = null, lvCtx = null, selfMuted = false, wasAllowed = false;
    function setMicState(st) {
        const b = $('micBtn');
        b.classList.toggle('on', st === 'requesting');
        b.classList.toggle('live', st === 'allowed');
        b.classList.toggle('muted', st === 'muted');
        b.classList.toggle('tmuted', st === 'tmuted');
        const txt = 'مايك';
        const HAND = '<svg viewBox="0 0 24 24" class="mic-svg hand-svg"><rect x="6.2" y="4.5" width="2.8" height="10" rx="1.4"/><rect x="9.6" y="2" width="2.8" height="12" rx="1.4"/><rect x="13" y="2.6" width="2.8" height="12" rx="1.4"/><rect x="16.4" y="5.2" width="2.8" height="9.6" rx="1.4"/><path d="M5 13.5c0 5 3.2 8.5 7.4 8.5 3.9 0 6.8-3 6.8-7.2V12.5H5z"/><rect x="1.8" y="10.6" width="2.8" height="8.4" rx="1.4" transform="rotate(-28 3.2 14.8)"/></svg>';
        const MIC = '<svg viewBox="0 0 24 24" class="mic-svg"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>';
        b.innerHTML = MIC + '<b class="mic-dots"><i></i><i></i><i></i><i></i></b><span class="bl">' + txt + '</span><b class="mic-dots-x" style="display:none"><i></i><i></i><i></i><i></i></b>';
        if (st === 'allowed' && sStream && !lvAn) {
            try {
                lvCtx = new (window.AudioContext || window.webkitAudioContext)();
                lvAn = lvCtx.createAnalyser(); lvAn.fftSize = 256;
                lvCtx.createMediaStreamSource(sStream).connect(lvAn);
                (function lp() {
                    if (!lvAn) return;
                    const d = new Uint8Array(lvAn.frequencyBinCount); lvAn.getByteFrequencyData(d);
                    let sum = 0; for (let i = 0; i < d.length; i++) sum += d[i];
                    const lv = Math.min(4, Math.round(sum / d.length / 14));
                    document.querySelectorAll('#micBtn .mic-dots i').forEach((el, k) => el.classList.toggle('lit', k < lv));
                    requestAnimationFrame(lp);
                })();
            } catch (e) {}
        }
        if (st !== 'allowed' && lvAn) { lvAn = null; try { lvCtx.close(); } catch (e) {} lvCtx = null; }
    }
    /* المايك يُلتقط مرة واحدة (طلب إذن واحد من المتصفح) ويبقى مغلقًا صامتًا حتى يسمح المدرس؛ لا إعادة طلب في كل مرة */
    let micPromise = null, micWarned = false;
    function ensureMic() {
        if (sStream && sStream.getAudioTracks().some(x => x.readyState === 'live')) return Promise.resolve(sStream);
        if (!micPromise) micPromise = navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000, channelCount: 1 }, video: false })
            .then(s => { sStream = s; s.getAudioTracks().forEach(x => { x.enabled = false; }); return s; })
            .finally(() => { micPromise = null; });
        return micPromise;
    }
    async function openMic() {
        await ensureMic();
        sStream.getAudioTracks().forEach(x => { x.enabled = !selfMuted; });
        micOn = true;
    }
    function stopMic() {                         /* إيقاف الإرسال (المايك يبقى مفتوحًا صامتًا لتفادي تكرار الإذن) */
        micOn = false; selfMuted = false; wasAllowed = false; reqPending = false;
        if (sStream) sStream.getAudioTracks().forEach(x => { x.enabled = false; });
        if (sPc) { try { sPc.close(); } catch (e) {} sPc = null; }
        ref('micRequests/' + myId).remove(); ref('micSelf/' + myId).remove();
        ref('rtc/s2t_stu_offer/' + myId).remove(); ref('rtc/s2t_stu_ice/' + myId).remove();
        setMicState('idle');
    }
    function watchMicPermission() {
        ref('micPermissions/' + myId).on('value', async snap => {
            const prevAllowed = micAllowed;
            micAllowed = !!(snap.val() && snap.val().allowed);
            if (micAllowed) {
                if (!prevAllowed && selfMuted) { selfMuted = false; ref('micSelf/' + myId).remove(); }   /* إذن جديد من المدرس بعد كتمي لنفسي */
                wasAllowed = true;
                reqPending = false;
                if (!micOn && !selfMuted) {                          /* أول سماح: يعمل المايك فورًا */
                    if (opening) return; opening = true;
                    try { await openMic(); } catch (e) { opening = false; setMicState('idle'); if (!micWarned) { micWarned = true; toast('لم يُسمح بالمايك: فعّله من إعدادات المتصفح ثم اضغط زر المايك', 'a'); } return; }
                    opening = false;
                }
                if (!micOn) return;
                setMicState(selfMuted ? 'muted' : 'allowed');
                ref('micRequests/' + myId).remove();
                if (!sPc) await startMicRTC();
            } else {
                if (wasAllowed) { stopMic(); setMicState('tmuted'); }   /* المدرس كتمه: رمادي فاتح، وضغطة منه تعيد الطلب */
                else setMicState(reqPending ? 'requesting' : (micOn ? 'requesting' : 'idle'));
            }
        });
    }
    async function startMicRTC() {
        if (sPc) return;
        const pc = sPc = new RTCPeerConnection({ iceServers: ICE });
        sStream.getTracks().forEach(t => pc.addTrack(t, sStream));
        pc.getSenders().forEach(sn => { try { const pr = sn.getParameters(); if (!pr.encodings || !pr.encodings.length) pr.encodings = [{}]; pr.encodings[0].maxBitrate = 64000; pr.encodings[0].priority = 'high'; sn.setParameters(pr).catch(() => {}); } catch (e) {} });
        pc.onicecandidate = e => { if (e.candidate) ref('rtc/s2t_stu_ice/' + myId).push(e.candidate.toJSON()); };
        pc.onconnectionstatechange = () => {
            if (sPc === pc && ['failed', 'disconnected'].includes(pc.connectionState)) {
                try { pc.close(); } catch (e) {} sPc = null;
                if (micAllowed && micOn) setTimeout(startMicRTC, 3000);
            }
        };
        ref('rtc/t2s_stu_ice/' + myId).off();
        ref('rtc/t2s_stu_ice/' + myId).on('child_added', s => {
            const c = s.val(); s.ref.remove();
            if (c && sPc === pc) addCand(pc, c);
        });
        const oTs = Date.now();
        ref('rtc/t2s_stu_answer/' + myId).off();
        ref('rtc/t2s_stu_answer/' + myId).on('value', s => {
            const a = s.val();
            if (a && a.sdp && (a.for == null || a.for === oTs) && sPc === pc && pc.signalingState === 'have-local-offer') pc.setRemoteDescription(new RTCSessionDescription(a)).then(() => flushCand(pc)).catch(() => {});
        });
        const off = await pc.createOffer({ offerToReceiveAudio: false });
        await pc.setLocalDescription(off);
        ref('rtc/s2t_stu_offer/' + myId).set({ sdp: off.sdp, type: off.type, ts: oTs });
    }
    let reqPending = false, opening = false;
    /* بعد قبول الدخول: المايك ينبض وتظهر رسالة صغيرة تطلب الضغط عليه (الضغطة تمنح المتصفح إذن المايك) */
    function showMicHint() {
        if (micOn || micAllowed || reqPending) return;
        const b = $('micBtn'); if (!b) return; b.classList.add('hint');
        let h = document.getElementById('micHint');
        if (!h) { h = document.createElement('div'); h.id = 'micHint'; h.textContent = 'اضغط على المايك لتفعيله'; document.body.appendChild(h); clearTimeout(window.__mhT); window.__mhT = setTimeout(hideMicHint, 15000); }
        const r = b.getBoundingClientRect(); h.style.left = Math.max(8, Math.min(innerWidth - 168, r.left + r.width / 2 - 80)) + 'px'; h.style.bottom = (innerHeight - r.top + 10) + 'px';
        h.style.setProperty('--ax', (r.left + r.width / 2 - parseFloat(h.style.left)) + 'px');
    }
    function hideMicHint() { const b = $('micBtn'); if (b) b.classList.remove('hint'); const h = document.getElementById('micHint'); if (h) h.remove(); }
    window.addEventListener('resize', () => { if (document.getElementById('micHint')) showMicHint(); });
    async function toggleMic() {
        if (!approved) return;
        hideMicHint();
        if (!micOn && !micAllowed) {                    /* طلب الكلام: بدون تشغيل المايك قبل إذن المدرس */
            if (reqPending) { reqPending = false; ref('micRequests/' + myId).remove(); setMicState('idle'); return; }
            try { await ensureMic(); } catch (e) { toast('لم يُسمح بالمايك — فعّله من إعدادات المتصفح ثم اضغط المايك', 'a'); }
            reqPending = true; setMicState('requesting');
            ref('micRequests/' + myId).set({ studentId: myId, studentName: myName, ts: Date.now() });
            ref('micRequests/' + myId).onDisconnect().remove();
        } else if (!micOn && micAllowed) {              /* مأذون له لكن المايك لم يُفتح (لم يسمح المتصفح تلقائيًا) */
            try { await openMic(); } catch (e) { toast('تعذر تشغيل الميكروفون: ' + (e.message || ''), 'a'); return; }
            setMicState('allowed'); if (!sPc) await startMicRTC();
        } else if (!micAllowed) {                       /* ألغى */
            stopMic();
        } else {                                        /* كتم/إلغاء كتم من عندي — له الأولوية على المدرس */
            selfMuted = !selfMuted;
            if (sStream) sStream.getAudioTracks().forEach(t => { t.enabled = !selfMuted; });
            if (selfMuted) ref('micSelf/' + myId).set(true); else ref('micSelf/' + myId).remove();
            setMicState(selfMuted ? 'muted' : 'allowed');
        }
    }
    $('micBtn').addEventListener('click', toggleMic);
    window.__stuRef = ref; window.__stuMe = () => ({ id: myId, name: myName, phone: myPhone });
    (function () {                                   /* رسائل المدرس + صلاحية التقاط الشاشة */
        const t0 = Date.now();
        const go = () => {
            ChatBox.init({
                role: 's', ref: ref, me: { name: myName }, convKey: () => myId + '_' + SESS,
                diag: () => { let au = ''; try { au = firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'no-auth'; } catch (e) {} return 'auth=' + au.slice(0, 8) + ' myId=' + String(myId).slice(0, 8) + ' room=' + BASE; },
                say: m => toast(m, 'a'),
                onUnread: tot => { const bd = document.getElementById('msgBadge'); if (bd) { bd.textContent = tot; bd.classList.toggle('on', tot > 0); } }
            });
            ref('capture').on('value', s => { window.__capOK = !!s.val(); });
            ref('widget').on('value', s => { try { window.MCWidgetStudent && window.MCWidgetStudent(s.val()); } catch (e) {} });
            ref('exam').on('value', s => { try { window.MCExamStudent && window.MCExamStudent(s.val()); } catch (e) {} });
            ref('videoData').on('value', s => { try { window.MCVideoData && window.MCVideoData(s.val()); } catch (e) {} });
            ref('video').on('value', s => { try { window.MCVideoState && window.MCVideoState(s.val()); } catch (e) {} });
        };
        const w = setInterval(() => { if (typeof approved !== 'undefined' && approved) { clearInterval(w); go(); } }, 800);
    })();
    /* سماعة الطالب: يُبلَّغ المدرس، وكتمها يكتم المايك تلقائيًا */
    window.__stuSpk = function (muted) {
        if (!approved) return;
        if (muted) { ref('spkMuted/' + myId).set(true); ref('spkMuted/' + myId).onDisconnect().remove(); } else ref('spkMuted/' + myId).remove();
        if (muted && micOn && micAllowed && !selfMuted) {
            selfMuted = true;
            if (sStream) sStream.getAudioTracks().forEach(t => { t.enabled = false; });
            ref('micSelf/' + myId).set(true); setMicState('muted');
        }
    };

    /* ── رسالة للمدرس ── */
    let lastMsg = 0;
    $('msgBtn').addEventListener('click', () => { if (window.ChatBox) ChatBox.toggle(); });
    const hb2 = $('hwBtn2'); if (hb2) hb2.addEventListener('click', () => { if (window.ChatBox) ChatBox.attach(); });
    $('msgCancel').addEventListener('click', () => { $('msgModal').style.display = 'none'; });
    $('msgText').addEventListener('input', () => { $('msgCnt').textContent = $('msgText').value.length + '/300'; });
    $('msgSend').addEventListener('click', () => {
        const t = $('msgText').value.trim(); if (!t || !approved) return;
        if (Date.now() - lastMsg < 5000) { toast('انتظر قليلًا قبل إرسال رسالة أخرى', 'a'); return; }
        lastMsg = Date.now();
        ref('messages').push({ id: myId, name: myName, text: t.slice(0, 300), ts: Date.now() });
        $('msgText').value = ''; $('msgCnt').textContent = '0/300'; $('msgModal').style.display = 'none';
        toast('✅ تم إرسال رسالتك للمدرس');
    });


    /* ════════ ما يُظهره المدرس: vis + الملف + الحفظ ════════ */
    let tools = {};
    let vis = { board: true, file: false, save: false, slides: false }, fileMeta = null, viewMode = 'board', fileShown = false;
    const fileBg = {}, fileStr = {};
    function buildFile(n) {
        const im = fileBg[n]; if (!fileMeta || !im) return;
        const st = fileStr[n] || { s: [], ts: 0 };
        pagesData['F' + n] = { bg: '#ffffff', g: 0, s: st.s, i: [], w: fileMeta.bw, h: fileMeta.bh, ts: st.ts, zoom: fileMeta.zoom || 1, bgImg: im };
        if (viewMode === 'file' && String(fileMeta.cur) === String(n)) renderMain();
        else if (vis.file && viewMode === 'board' && !fileShown && String(fileMeta.cur) === String(n)) { fileShown = true; viewMode = 'file'; applyVis(); }
    }
    let penOn = false, penCv = null, penDown = false;
    function setPen(on) {
        penOn = on; const b = $('penBtn'); if (b) b.classList.toggle('pen-on', on);
        if (on && !penCv) {
            penCv = document.createElement('canvas'); penCv.id = 'penCv'; const host = $('slideBox') || document.body; host.appendChild(penCv);
            const pos = e => { const r = penCv.getBoundingClientRect(); return { x: (e.clientX - r.left) * penCv.width / r.width, y: (e.clientY - r.top) * penCv.height / r.height }; };
            penCv.addEventListener('pointerdown', e => { penDown = true; penCv.setPointerCapture(e.pointerId); const c = penCv.getContext('2d'), p = pos(e); c.strokeStyle = '#7dd3fc'; c.lineWidth = 3 * penCv.width / penCv.getBoundingClientRect().width; c.lineCap = c.lineJoin = 'round'; c.beginPath(); c.moveTo(p.x, p.y); });
            penCv.addEventListener('pointermove', e => { if (!penDown) return; const c = penCv.getContext('2d'), p = pos(e); c.lineTo(p.x, p.y); c.stroke(); });
            penCv.addEventListener('pointerup', () => { penDown = false; });
        }
        if (penCv) { if (!on) { const c = penCv.getContext('2d'); c.clearRect(0, 0, penCv.width, penCv.height); } penCv.style.display = on ? 'block' : 'none'; if (on) { const r = penCv.parentNode.getBoundingClientRect(); penCv.width = Math.round(r.width); penCv.height = Math.round(r.height); } }
    }
    function applyVis() {
        const fileOk = !!(vis.file && fileMeta && fileMeta.n);
        const fileReady = fileOk && !!pagesData['F' + fileMeta.cur];
        if (viewMode === 'file' && !fileReady) viewMode = 'board';   /* لا تُخفِ السبورة قبل جاهزية الملف */
        if (!fileOk && viewMode === 'file') viewMode = 'board';
        $('fileBtn').style.display = 'none';
        viewMode = fileReady ? 'file' : 'board';
        $('penBtn').style.display = tools.pen ? '' : 'none'; if (!tools.pen) setPen(false);
        $('saveBtn').style.display = tools.save ? '' : 'none';
        if (!tools.save) $('saveMenu').style.display = 'none';
        const hide = viewMode === 'board' && !vis.board;
        $('hiddenMsg').style.display = hide ? 'flex' : 'none';
        wrap.style.visibility = hide ? 'hidden' : '';
        $('fileView').style.display = 'none';
        renderMain();
    }
    function listenShare() {
        ref('studentTools/' + myId).on('value', sn => { tools = sn.val() || {}; try { applyVis(); } catch (e) {} }, () => {});
        ref('vis').on('value', snap => {
            const v = snap.val() || { board: true, file: false, save: false, slides: false };
            if (v.file && !vis.file) fileShown = false;          /* أظهر المدرس الملف → ينتقل إليه عند جاهزيته */
            if (!v.file) { viewMode = 'board'; fileShown = false; }
            vis = { board: v.board !== false, file: !!v.file, save: !!v.save, slides: v.slides === true };
            { const pn = $('slidesPanel'); if (pn) { pn.classList.toggle('hide', !vis.slides); requestAnimationFrame(() => { try { renderMain(); } catch (e) {} }); } }
            applyVis();
        });
        ref('fileShare/meta').on('value', snap => {
            const m = snap.val(), was = !!(fileMeta && fileMeta.n);
            fileMeta = m;
            if (!m) { for (const k in fileBg) { delete fileBg[k]; delete fileStr[k]; delete pagesData['F' + k]; } }
            else { Object.keys(fileBg).forEach(buildFile); if (vis.file && !was) fileShown = false; }
            applyVis();
        });
        ref('fileShare/pages').on('value', snap => {                 /* خلفيات الصفحات */
            const v = snap.val() || {};
            Object.keys(v).forEach(n => {
                if (fileBg[n] && fileBg[n]._ts === v[n].ts) return;
                const im = new Image(); im._ts = v[n].ts; fileBg[n] = im;
                im.onload = () => buildFile(n); im.src = v[n].d;
            });
        });
        const strk = s => { try { const o = unpack(s.val().j); fileStr[s.key] = { s: o.s || [], ts: s.val().ts || 0 }; } catch (e) { return; }
            segs = segs.filter(g => g.sl !== 'F' + s.key || g.t > fileStr[s.key].ts);
            if (shapePrev && shapePrev.sl === 'F' + s.key && shapePrev.t <= fileStr[s.key].ts) shapePrev = null;
            buildFile(s.key); };
        ref('fileShare/strokes').on('child_added', strk);
        ref('fileShare/strokes').on('child_changed', strk);
        $('fileBtn').addEventListener('click', () => { viewMode = viewMode === 'file' ? 'board' : 'file'; applyVis(); });
    }

    /* ── الحفظ (بإذن المدرس) ── */
    function b64bytes(d) { const b = atob(d.split(',')[1]), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
    function makePdf(pages) {            /* pages: [{d: jpegDataURL, w, h}] */
        const enc = new TextEncoder(), parts = [], off = []; let len = 0;
        const add = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
        const obj = (id, fn) => { off[id] = len; add(id + ' 0 obj\n'); fn(); add('\nendobj\n'); };
        add('%PDF-1.4\n');
        const n = pages.length, kids = pages.map((_, i) => (3 + 3 * i) + ' 0 R').join(' ');
        obj(1, () => add('<< /Type /Catalog /Pages 2 0 R >>'));
        obj(2, () => add('<< /Type /Pages /Kids [' + kids + '] /Count ' + n + ' >>'));
        pages.forEach((p, i) => {
            const pid = 3 + 3 * i, cid = pid + 1, iid = pid + 2, W = Math.round(p.w * 0.75), H = Math.round(p.h * 0.75);
            const content = 'q ' + W + ' 0 0 ' + H + ' 0 0 cm /Im0 Do Q';
            obj(pid, () => add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /XObject << /Im0 ' + iid + ' 0 R >> >> /Contents ' + cid + ' 0 R >>'));
            obj(cid, () => add('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream'));
            const jb = b64bytes(p.d);
            obj(iid, () => { add('<< /Type /XObject /Subtype /Image /Width ' + p.w + ' /Height ' + p.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jb.length + ' >>\nstream\n'); add(jb); add('\nendstream'); });
        });
        const total = 3 + 3 * n, xref = len;
        let x = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
        for (let i = 1; i < total; i++) x += String(off[i]).padStart(10, '0') + ' 00000 n \n';
        add(x + 'trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
        return new Blob(parts, { type: 'application/pdf' });
    }
    function download(blob, name) {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 30000);
    }
    const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    function slideJpeg(id, k) {
        const pg = pagesData[id]; if (!pg) return null;
        const cv = document.createElement('canvas'); cv.width = Math.round(pg.w * k); cv.height = Math.round(pg.h * k);
        paintPage(cv.getContext('2d'), pg, k);
        return { d: cv.toDataURL('image/jpeg', 0.92), w: cv.width, h: cv.height, cv };
    }
    const SAVE = {
        slide() { const r = slideJpeg(active, 2); if (!r) return; r.cv.toBlob(b => download(b, 'slide-' + stamp() + '.png'), 'image/png'); },
        slides() { const pgs = order.map(id => slideJpeg(id, 1.5)).filter(Boolean); if (!pgs.length) return toast('لا توجد شرائح', 'a'); download(makePdf(pgs), 'slides-' + stamp() + '.pdf'); },
        file() {
            const ks = Object.keys(fileBg).map(Number).filter(k => pagesData['F' + k]).sort((x, y) => x - y); if (!ks.length) return toast('لا توجد صفحات ملف', 'a');
            const pgs = ks.map(k => slideJpeg('F' + k, 1500 / pagesData['F' + k].w)).filter(Boolean);
            download(makePdf(pgs), ((fileMeta && fileMeta.name) || 'file').replace(/\.[^.]+$/, '') + '-' + stamp() + '.pdf');
            if (fileMeta && ks.length < (fileMeta.n || 0)) toast('تم حفظ الصفحات التي فتحها المدرس فقط (' + ks.length + ' من ' + fileMeta.n + ')', 'a');
        }
    };
    $('saveBtn').addEventListener('click', e => {
        e.stopPropagation(); const m = $('saveMenu');
        if (m.style.display !== 'none') { m.style.display = 'none'; return; }
        const items = [];
        if (vis.board) items.push(['slide', '🖼 حفظ الشريحة الحالية (صورة)'], ['slides', '📑 حفظ كل الشرائح (PDF)']);
        if (vis.file && Object.keys(fileBg).length) items.push(['file', '📄 حفظ الملف (PDF)']);
        if (!items.length) { toast('لا يوجد ما يُحفظ الآن', 'a'); return; }
        m.innerHTML = items.map(i => '<button data-k="' + i[0] + '">' + i[1] + '</button>').join('');
        const r = $('saveBtn').getBoundingClientRect();
        m.style.display = 'flex'; m.style.left = Math.max(6, r.left) + 'px'; m.style.bottom = (window.innerHeight - r.top + 6) + 'px';
    });
    $('saveMenu').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; $('saveMenu').style.display = 'none'; SAVE[b.dataset.k](); });
    document.addEventListener('click', () => { $('saveMenu').style.display = 'none'; });

    /* ════════ استقبال الشرائح (متجهات) ════════ */
    function listen() {
        ref('session').on('value', snap => {
            const d = snap.val();
            order = d ? toArr(d.order) : [];
            const cur = d ? d.current : null;
            if (cur && cur !== teacherCur) { teacherCur = cur; active = cur; }   /* المدرس انتقل → أتبعه */
            if (active && order.indexOf(active) === -1) active = (teacherCur && order.indexOf(teacherCur) !== -1) ? teacherCur : (order[0] || null);
            renderList(); renderMain();
        });
        ref('slidesData').on('child_added', onPage);
        ref('slidesData').on('child_changed', onPage);
        ref('slidesData').on('child_removed', s => { delete pagesData[s.key]; renderList(); renderMain(); });
        ref('slideImages').on('child_added', onImgData);
        ref('slideImages').on('child_changed', onImgData);
        ref('live').on('child_added', onLive);
        ref('liveShape').on('value', onLiveShape);
        ref('view').on('value', snap => { tView = snap.val(); applyView(); });
    }

    /* تمرير المدرس → أحاكيه (ما دمت على شريحته). الإحداثيات بوحدات الصفحة */
    let tView = null;
    function applyView() {
        const id = curId(), pg = pagesData[id];
        if (!tView || !pg || (viewMode !== 'file' && active !== teacherCur) || tView.sl !== id) return;
        wrap.scrollTop = Math.round(tView.y * scale);
        const maxX = box.offsetWidth - wrap.clientWidth;      /* RTL: scrollLeft بين -maxX و0 */
        if (maxX > 0) wrap.scrollLeft = Math.max(-maxX, Math.min(0, Math.round(tView.x * scale - maxX)));
    }

    /* فك ضغط النقاط (f:[x,y,...] → [{x,y}]) */
    function unpack(str) {
        return JSON.parse(str, (k, v) => {
            if (k === 'points' && v && Array.isArray(v.f)) {
                const out = [];
                for (let i = 0; i + 1 < v.f.length; i += 2) out.push({ x: v.f[i], y: v.f[i + 1] });
                return out;
            }
            return v;
        });
    }

    function onPage(snap) {
        const v = snap.val();
        if (!v || !v.j) return;
        let pg;
        try { pg = unpack(v.j); } catch (e) { console.warn('صفحة تالفة', e); return; }
        pg.w = v.w || 794; pg.h = v.h || 1123; pg.ts = v.ts || 0;
        pagesData[snap.key] = pg;
        /* الصفحة الجديدة تشمل كل ما رُسم قبل وقتها */
        segs = segs.filter(g => g.sl !== snap.key || g.t > pg.ts);
        if (shapePrev && shapePrev.sl === snap.key && shapePrev.t <= pg.ts) shapePrev = null;
        paintThumb(snap.key);
        if (snap.key === active) renderMain();
        renderList();
    }
    function onImgData(snap) {
        const v = snap.val();
        if (v && v.d) { imgSrc[snap.key] = v.d; repaintAll(); }
    }
    function onLive(snap) {
        const d = snap.val();
        if (!d || !d.p || !d.p.length) return;
        const pg = pagesData[d.sl];
        if (pg && d.t <= pg.ts) return;                  /* دخل سابقًا في الصفحة */
        segs.push(d);
        if (segs.length > 3000) segs.shift();
        if (d.sl === curId() && pagesData[d.sl]) { setLiveTransform(); drawSeg(d, lastPt); }
    }
    function onLiveShape(snap) {
        const d = snap.val();
        if (!d) { shapePrev = null; redrawLive(); return; }
        const pg = pagesData[d.sl];
        if (pg && d.t <= pg.ts) return;
        try { shapePrev = { sl: d.sl, t: d.t, shape: JSON.parse(d.s) }; } catch (_) { return; }
        if (d.sl === curId()) redrawLive();
    }

    /* ════════ الرسم ════════ */
    const wrap = $('viewWrap'), box = $('slideBox');
    const baseCv = $('baseCv'), baseCx = baseCv.getContext('2d');
    const liveCv = $('liveCv'), liveCx = liveCv.getContext('2d');
    const dpr = () => Math.min(2, window.devicePixelRatio || 1);
    let curK = 1, lastPt = {};

    /* صفحة كاملة على سياق معيّن: الخلفية + الشبكة + الصور + الرسم (نفس كود المدرس) */
    function paintPage(ctx, pg, k) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.setTransform(k, 0, 0, k, 0, 0);
        ctx.fillStyle = pg.bg || '#0a101d';
        ctx.fillRect(0, 0, pg.w, pg.h);
        if (pg.bgImg && pg.bgImg.complete && pg.bgImg.naturalWidth) ctx.drawImage(pg.bgImg, 0, 0, pg.w, pg.h);
        if (pg.g) {
            ctx.fillStyle = 'rgba(56,189,248,0.08)';
            for (let x = 0; x < pg.w; x += 20) ctx.fillRect(x, 0, 1, pg.h);
            for (let y = 0; y < pg.h; y += 20) ctx.fillRect(0, y, pg.w, 1);
        }
        const imgs = (pg.i || []).map(im => ({ src: imgSrc[im.k], x: im.x, y: im.y, w: im.w, h: im.h, rotation: im.rotation })).filter(im => im.src);
        if (imgs.length) MCR.drawImagesOnCtx(ctx, imgs);
        MCR.drawStrokesOnCtx(ctx, pg.s || []);
    }

    /* رسم قطعة قلم مباشرة فوق الصفحة */
    function drawSeg(d, last) {
        const p = d.p, n = p.length / 2;
        liveCx.save();
        liveCx.lineCap = 'round'; liveCx.lineJoin = 'round';
        liveCx.strokeStyle = d.c; liveCx.fillStyle = d.c; liveCx.lineWidth = d.w || 4;
        if (d.k === 'fh') { liveCx.shadowBlur = 15; liveCx.shadowColor = d.c; liveCx.globalAlpha = (d.o != null ? d.o : 0.1); }
        else liveCx.globalAlpha = (d.o != null ? d.o : 1);
        const prev = last[d.id];
        if (n === 1 && !prev) {
            liveCx.beginPath(); liveCx.arc(p[0], p[1], Math.max(1, (d.w || 4) / 2), 0, Math.PI * 2); liveCx.fill();
        } else {
            liveCx.beginPath();
            let i = 0;
            if (prev) liveCx.moveTo(prev.x, prev.y); else { liveCx.moveTo(p[0], p[1]); i = 1; }
            for (; i < n; i++) liveCx.lineTo(p[2 * i], p[2 * i + 1]);
            liveCx.stroke();
        }
        last[d.id] = { x: p[p.length - 2], y: p[p.length - 1] };
        liveCx.restore();
    }
    function setLiveTransform() { liveCx.setTransform(curK, 0, 0, curK, 0, 0); }
    function redrawLive() {
        const id = curId(), pg = pagesData[id];
        liveCx.setTransform(1, 0, 0, 1, 0, 0);
        liveCx.clearRect(0, 0, liveCv.width, liveCv.height);
        lastPt = {};
        if (!pg) return;
        setLiveTransform();
        segs.forEach(d => { if (d.sl === id && d.t > pg.ts) drawSeg(d, lastPt); });
        if (shapePrev && shapePrev.sl === id && shapePrev.t > pg.ts) {
            liveCx.save(); MCR.drawShape(liveCx, shapePrev.shape); liveCx.restore();
        }
    }

    function computeScale(pg) {
        const W = wrap.offsetWidth, H = wrap.clientHeight, sb = (wrap.offsetWidth - wrap.clientWidth) || 9;
        let mode = fitMode;
        wrap.classList.toggle('fit-width', mode === 'width');
        wrap.style.overflowX = (mode === 'width') ? 'hidden' : 'auto';
        wrap.style.background = (mode === 'width') ? (pg.bg || '') : '';   /* عند ملاءمة العرض تمتد خلفية السبورة */
        if (mode === 'one') scale = 1;
        else if (mode === 'width') { scale = (W - 38) / pg.w; if (pg.h * scale > H) scale = (W - 38 - sb) / pg.w; }
        else if (mode === 'page') scale = Math.min((wrap.clientWidth - 38) / pg.w, (H - 38) / pg.h);
        if (pg.zoom) { mode = 'one'; scale = pg.zoom; wrap.style.overflowX = 'auto'; wrap.classList.remove('fit-width'); wrap.style.background = ''; }
        scale = Math.max(0.1, Math.min(5, scale));
        const next = { one: 'Fit', width: '100%', page: '100%', free: '100%', auto: 'Fit' };
        $('fitBtn').querySelector('.bl').textContent = next[mode] || '100%';
        $('fitBtn').dataset.mode = mode;
    }

    const curId = () => (viewMode === 'file' && fileMeta) ? 'F' + fileMeta.cur : active;
    function renderMain() {
        const empty = $('viewEmpty'), id = curId();
        const pg = id && pagesData[id];
        if (!pg) {
            box.style.display = 'none'; empty.style.display = '';
            empty.textContent = order.length ? '⏳ جاري تحميل الشريحة...' : '⏳ بانتظار المدرس لبدء الشرح...';
            return;
        }
        empty.style.display = 'none';
        const changed = shownSlide !== id;
        if (changed) { shownSlide = id; wrap.scrollTop = 0; wrap.scrollLeft = 0; }
        computeScale(pg);
        box.style.display = 'block';
        box.style.width = Math.round(pg.w * scale) + 'px';
        box.style.height = Math.round(pg.h * scale) + 'px';
        /* دقة الكانفس = حجم العرض × دقة الشاشة (بحد أقصى 4096) فيبقى الرسم حادًّا */
        curK = Math.min(scale * dpr(), 4096 / Math.max(pg.w, pg.h));
        const cw = Math.round(pg.w * curK), ch = Math.round(pg.h * curK);
        if (baseCv.width !== cw) baseCv.width = cw;
        if (baseCv.height !== ch) baseCv.height = ch;
        if (liveCv.width !== cw) liveCv.width = cw;
        if (liveCv.height !== ch) liveCv.height = ch;
        paintPage(baseCx, pg, curK);
        redrawLive();
        $('zoomVal').textContent = Math.round(scale * 100) + '%';
        if (viewMode !== 'file') $('curNum').textContent = order.indexOf(active) + 1;
        if (changed) applyView();
    }

    /* ════════ قائمة الشرائح (مصغّرات من نفس الرسم) ════════ */
    const thumbs = {};   /* id → { cv, ts } */
    const THUMB_W = 232;
    function thumbOf(id) {
        if (!thumbs[id]) {
            const cv = document.createElement('canvas');
            cv.width = THUMB_W; cv.height = Math.round(THUMB_W * 1123 / 794);
            thumbs[id] = { cv: cv, ts: -1 };
        }
        return thumbs[id];
    }
    function paintThumb(id, force) {
        const pg = pagesData[id]; if (!pg) return;
        const t = thumbOf(id);
        if (!force && t.ts === pg.ts) return;
        t.ts = pg.ts;
        t.cv.height = Math.round(THUMB_W * pg.h / pg.w);
        paintPage(t.cv.getContext('2d'), pg, THUMB_W / pg.w);
    }
    function renderList() {
        const list = $('slidesList');
        list.innerHTML = '';
        order.forEach((id, i) => {
            const c = document.createElement('div');
            c.className = 'slide-card' + (id === active ? ' active' : '');
            if (pagesData[id]) { paintThumb(id); c.appendChild(thumbOf(id).cv); }
            else { const ph = document.createElement('div'); ph.className = 'ph'; ph.textContent = '...'; c.appendChild(ph); }
            const n = document.createElement('span'); n.className = 'slide-num'; n.textContent = i + 1; c.appendChild(n);
            if (id === teacherCur) { const t = document.createElement('span'); t.className = 'slide-teacher'; t.textContent = 'المدرس'; c.appendChild(t); }
            c.addEventListener('click', () => { active = id; if (viewMode === 'file') { viewMode = 'board'; applyVis(); } renderList(); renderMain(); });
            list.appendChild(c);
        });
        $('slidesCount').textContent = order.length;
        $('totNum').textContent = order.length;
        $('curNum').textContent = order.indexOf(active) + 1;
        $('followBtn').style.display = (active && teacherCur && active !== teacherCur && order.indexOf(teacherCur) !== -1) ? '' : 'none';
        const act = list.querySelector('.slide-card.active');
        if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest' });
    }

    /* إعادة رسم الكل (عند اكتمال صورة/خط) */
    let rafId = 0;
    function repaintAll() {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
            rafId = 0;
            Object.keys(pagesData).forEach(id => paintThumb(id, true));
            renderMain();
        });
    }
    MCR.onImageLoad = repaintAll;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(repaintAll);
    window.addEventListener('resize', () => requestAnimationFrame(renderMain));

    /* ════════ الأزرار ════════ */
    function step(d) {
        const i = order.indexOf(active) + d;
        if (i < 0 || i >= order.length) return;
        active = order[i]; renderList(); renderMain();
    }
    $('prevBtn').addEventListener('click', () => step(-1));
    $('nextBtn').addEventListener('click', () => step(1));
    $('penBtn').addEventListener('click', () => setPen(!penOn));
    $('zoomIn').addEventListener('click', () => { fitMode = 'free'; scale *= 1.15; renderMainFree(); });
    $('zoomOut').addEventListener('click', () => { fitMode = 'free'; scale /= 1.15; renderMainFree(); });
    function renderMainFree() {            /* تكبير يدوي: نحفظ المقياس ثم نرسم */
        const keep = scale; renderMainWithScale(keep);
    }
    function renderMainWithScale(sc) {
        const pg = pagesData[active]; if (!pg) return;
        scale = Math.max(0.1, Math.min(5, sc));
        box.style.width = Math.round(pg.w * scale) + 'px';
        box.style.height = Math.round(pg.h * scale) + 'px';
        wrap.classList.remove('fit-width'); wrap.style.overflowX = 'auto';
        curK = Math.min(scale * dpr(), 4096 / Math.max(pg.w, pg.h));
        baseCv.width = liveCv.width = Math.round(pg.w * curK);
        baseCv.height = liveCv.height = Math.round(pg.h * curK);
        paintPage(baseCx, pg, curK); redrawLive();
        $('zoomVal').textContent = Math.round(scale * 100) + '%';
        $('fitBtn').querySelector('.bl').textContent = '100%'; $('fitBtn').dataset.mode = 'free';
    }
    $('fitBtn').addEventListener('click', () => {
        const m = $('fitBtn').dataset.mode || 'one';
        fitMode = (m === 'one') ? 'width' : 'one';
        renderMain();
    });
    $('followBtn').addEventListener('click', () => { if (teacherCur) { active = teacherCur; renderList(); renderMain(); } });
    $('fsBtn').addEventListener('click', () => {
        document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => { });
    });

    const panel = $('slidesPanel');
/* إرسال الواجب (صورة أو PDF) للمدرس */
(function () {
    const b = document.getElementById('hwBtn'), f = document.getElementById('hwFile'); if (!b || !f) return;
    let last = 0;
    b.addEventListener('click', () => { if (typeof approved !== 'undefined' && !approved) return; f.value = ''; f.click(); });
    const MAXPDF = 2.5 * 1024 * 1024;
    function readAsData(file) { return new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(file); }); }
    async function shrink(file) {
        const url = await readAsData(file);
        return new Promise((ok, no) => {
            const im = new Image(); im.onerror = no;
            im.onload = () => {
                const k = Math.min(1, 1600 / Math.max(im.width, im.height));
                const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
                const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
                ok(c.toDataURL('image/jpeg', 0.82));
            };
            im.src = url;
        });
    }
    f.addEventListener('change', async () => {
        const file = f.files && f.files[0]; if (!file) return;
        if (Date.now() - last < 8000) { toast('انتظر قليلًا قبل إرسال واجب آخر', 'a'); return; }
        try {
            let data, type;
            if (/^image\//.test(file.type)) { data = await shrink(file); type = 'image/jpeg'; }
            else if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
                if (file.size > MAXPDF) { toast('ملف PDF كبير (الحد 2.5MB) — صوّره كصورة أو صغّر حجمه', 'a'); return; }
                data = await readAsData(file); type = 'application/pdf';
            } else { toast('أرسل صورة أو ملف PDF فقط', 'a'); return; }
            last = Date.now();
            await ref('homework').push({ id: myId, name: myName, fname: String(file.name).slice(0, 80), type: type, data: data, ts: Date.now() });
            toast('✅ تم إرسال الواجب للمدرس');
        } catch (e) { toast('تعذر إرسال الواجب: ' + ((e && (e.code || e.message)) || ''), 'a'); }
    });
})();

})();


/* ════════ حماية المحتوى (قدر المستطاع داخل المتصفح) ════════ */
(function () {
    const sh = document.createElement('div'); sh.id = 'shield';
    sh.style.cssText = 'position:fixed;inset:0;background:#000;z-index:99999;display:none';
    document.body.appendChild(sh);
    const flash = ms => { if (window.__capOK) return; sh.style.display = 'block'; setTimeout(() => sh.style.display = 'none', ms || 1500); };
    const st = document.createElement('style');
    st.textContent = '@media print{body{display:none!important}} body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none} textarea,input{-webkit-user-select:text;user-select:text}';
    document.head.appendChild(st);
    document.addEventListener('contextmenu', e => { if (!window.__capOK && !/INPUT|TEXTAREA/.test(e.target.tagName)) e.preventDefault(); });
    document.addEventListener('dragstart', e => e.preventDefault());
    document.addEventListener('keydown', e => {
        const k = e.key, c = e.ctrlKey || e.metaKey;
        if (window.__capOK) return;
        if (k === 'PrintScreen') { flash(); try { navigator.clipboard.writeText(''); } catch (x) {} e.preventDefault(); }
        if (c && /^[psu]$/i.test(k)) e.preventDefault();
        if (e.metaKey && e.shiftKey && /^[345]$/.test(k)) { flash(2500); e.preventDefault(); }
    });
    document.addEventListener('keyup', e => { if (e.key === 'PrintScreen') { flash(); try { navigator.clipboard.writeText(''); } catch (x) {} } });
    try { if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) { const og = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices); navigator.mediaDevices.getDisplayMedia = (...a) => window.__capOK ? og(...a) : Promise.reject(new DOMException('blocked', 'NotAllowedError')); } } catch (e) {}
})();


/* سماعة الطالب: كتم/تشغيل صوت المدرس */
(function () {
    const b = document.getElementById('spkBtn'); if (!b) return;
    b.addEventListener('click', e => {
        e.stopPropagation();
        const a = document.getElementById('audioEl'); if (!a) return;
        let p = document.getElementById('volPop'); if (p) { p.remove(); return; }
        p = document.createElement('div'); p.id = 'volPop'; p.className = 'vol-pop';
        const v = a.muted ? 0 : Math.round((a.volume == null ? 1 : a.volume) * 100);
        p.innerHTML = '<span>🔈</span><input type="range" min="0" max="100" value="' + v + '"><b id="volVal">' + v + '</b>';
        document.body.appendChild(p);
        const r = b.getBoundingClientRect(); p.style.left = Math.max(6, Math.min(innerWidth - p.offsetWidth - 6, r.left + r.width / 2 - p.offsetWidth / 2)) + 'px'; p.style.bottom = (innerHeight - r.top + 8) + 'px';
        const inp = p.querySelector('input');
        inp.oninput = () => {
            const x = +inp.value; a.volume = x / 100; a.muted = x === 0; p.querySelector('#volVal').textContent = x;
            b.classList.toggle('off', a.muted);
            if (!a.muted && a.srcObject && a.paused) a.play().catch(() => {});
            if (window.__stuSpk) window.__stuSpk(a.muted);
        };
        setTimeout(() => document.addEventListener('click', function f(ev) { if (!p.contains(ev.target)) { p.remove(); document.removeEventListener('click', f); } }), 0);
    });
})();


/* الشريط الجانبي: دورات + رسالة */
(function () {
    const sb = document.getElementById('sideBar'); if (!sb) return;
    const grid = document.getElementById('sbCourses'), H = window.HOME;
    const room = new URLSearchParams(location.search).get('room');
    if (H && H.courses) grid.innerHTML = H.courses.map(c => '<a class="sb-c" style="background:' + c.color + '" target="_blank" rel="noopener" href="index.html' + (room ? '?room=' + encodeURIComponent(room) : '') + '#courses"><i>' + c.icon + '</i><span>' + String(c.title).split(/\s*—\s*/)[0] + '</span></a>').join('');
    if (window.innerWidth < 700) sb.classList.add('hide');
    document.getElementById('sideBtn').addEventListener('click', () => { sb.classList.toggle('hide'); window.dispatchEvent(new Event('resize')); });
    document.getElementById('sideSend').addEventListener('click', () => {
        const t = document.getElementById('sideText'), m = document.getElementById('msgText');
        if (!t.value.trim()) return;
        m.value = t.value; document.getElementById('msgSend').click();
        if (!m.value) t.value = '';
    });
})();
