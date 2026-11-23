
/* عرض الاختبار (A4) — نافذة عائمة بنمط ويندوز: قابلة للسحب وتغيير الحجم من 8 اتجاهات وفوق كل شيء */
(function () {
    'use strict';

    const CSS =
        /* ════ النافذة الأساسية ════ */
        '.xw{position:fixed;z-index:2147483647;display:flex;flex-direction:column;background:#0b1424;border:1px solid #5c1a1a;border-radius:10px;box-shadow:0 24px 80px rgba(0,0,0,.85),0 0 0 1px rgba(212,175,55,.2),0 0 0 4px rgba(0,0,0,.3);overflow:hidden;min-width:340px;min-height:220px;direction:rtl;font:12px system-ui,"Segoe UI",Tahoma,Cairo,sans-serif;color:#e2e8f0}' +
        '.xw *{box-sizing:border-box}' +

        /* ════ الشريط العلوي ════ */
        '.xw-bar{display:flex;align-items:center;gap:6px;padding:2px 8px;height:28px;min-height:28px;background:linear-gradient(135deg,#4a0808,#7f1d1d);border-bottom:1px solid #ea580c;cursor:move;flex-shrink:0;user-select:none;touch-action:none;direction:ltr;padding-right:0}' +
        '.xw-bar .xw-min{margin-left:auto}' +
        '.xw-ico{font-size:12px;flex-shrink:0;line-height:1}' +
        '.xw-bar .xw-title{color:#fee2e2;font-size:12px;font-weight:700;white-space:nowrap;flex:1;overflow:hidden;text-overflow:ellipsis;line-height:1}' +
        '.xw-btn{background:transparent;border:0;margin:0 0 0 -6px;color:#fff;width:42px;height:28px;border-radius:0;cursor:pointer;font:800 14px/1 inherit;text-shadow:0 1px 2px rgba(0,0,0,.6);padding:0;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}' +
        '.xw-btn:hover{background:rgba(255,255,255,.18)}' +
        '.xw-btn.xw-x{background:transparent;color:#fff}' +
        '.xw-btn.xw-x:hover{background:#e81123}' +

        /* ════ الأزرار العامة ════ */
        '.xw-b{background:#ea580c;color:#fff;border:0;border-radius:6px;padding:6px 12px;font:700 12px inherit;cursor:pointer;white-space:nowrap}.xw-b.g{background:#1f3a63}.xw-b:disabled{opacity:.5}' +

        /* ════ الجسم ════ */
        '.xw-main{flex:1;display:flex;min-height:0;overflow:hidden}' +
        '.xw-side{width:150px;flex-shrink:0;overflow:auto;padding:6px;background:#0d1a30;border-left:1px solid #1f3a63;display:flex;flex-direction:column;gap:4px}' +
        '.xw-sc{flex:1;overflow:auto;background:#1a1a1a;direction:ltr;position:relative}' +
        '.xw-sc::-webkit-scrollbar{width:15px;height:15px}' +
        '.xw-sc::-webkit-scrollbar-track{background:#111}' +
        '.xw-sc::-webkit-scrollbar-thumb{background:rgba(230,199,90,.55);border-radius:0;border:1px solid #111}' +
        '.xw-sc::-webkit-scrollbar-thumb:hover{background:rgba(230,199,90,.85)}' +
        '.xw-pgw{position:relative;padding:0;display:inline-block;min-width:100%}' +

        /* ════ الشريط السفلي ════ */
        '.xw-foot{display:flex;align-items:center;gap:6px;padding:4px 10px;background:linear-gradient(135deg,#4a0808,#7f1d1d);border-top:2px solid #ea580c;flex-shrink:0;min-height:40px;overflow-x:auto;overflow-y:hidden;white-space:nowrap;scrollbar-width:thin;scrollbar-color:rgba(230,199,90,.5) transparent;direction:ltr;flex-direction:row}' +
        '.xw-foot::-webkit-scrollbar{height:4px}' +
        '.xw-foot::-webkit-scrollbar-track{background:transparent}' +
        '.xw-foot::-webkit-scrollbar-thumb{background:rgba(230,199,90,.5);border-radius:2px}' +
        '.xw-foot-btns{display:flex;gap:6px;flex-shrink:0;align-items:center;flex-direction:row;direction:ltr}' +
        '.xw-foot-info{display:none !important}' +
        '.xw-foot .xw-b{padding:5px 10px;font-size:11px;border-radius:6px;transition:all .15s}' +
        '.xw-foot .xw-b:hover{filter:brightness(1.15)}' +
        '.ft-l{font-size:13px;color:#fff;font-weight:800;flex-shrink:0;padding:0 2px;font-family:"Cairo",system-ui,sans-serif;text-shadow:0 1px 2px rgba(0,0,0,.6)}' +
        '.ft-sep{flex:0 0 1px;width:1px;height:20px;background:rgba(212,175,55,.5);margin:0 4px}' +
        '.ft-sel{height:22px;background:rgba(156,163,175,.5);border:1px solid #38bdf8;color:#fff;border-radius:4px;padding:0 3px;font:inherit;font-size:12px;font-weight:700;text-shadow:0 1px 2px rgba(0,0,0,.6);cursor:pointer;outline:none;min-width:48px;max-width:90px;flex-shrink:0;font-family:"Cairo",system-ui,sans-serif}' +
        '.ft-sel:hover{border-color:#0ea5e9}' +
        '.ft-sel:focus{border-color:#0284c7;box-shadow:0 0 0 2px rgba(56,189,248,.45)}' +
        '.ft-sel option{background:#f1f5f9;color:#0f172a;padding:4px}' +
        '.ft-num{width:42px;height:22px;background:rgba(156,163,175,.5);border:1px solid #38bdf8;color:#fff;border-radius:4px;padding:0 2px;font:800 12px "Cairo",system-ui,sans-serif;text-align:center;outline:none;flex-shrink:0;-moz-appearance:textfield}' +
        '.ft-num::-webkit-inner-spin-button,.ft-num::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}' +
        '.ft-num:focus{border-color:#0284c7;box-shadow:0 0 0 2px rgba(56,189,248,.45)}' +
        '.ft-st{width:20px;height:22px;padding:0;background:rgba(156,163,175,.5);border:1px solid #38bdf8;color:#fff;border-radius:4px;font:800 10px/1 system-ui,sans-serif;cursor:pointer;flex-shrink:0}' +
        '.ft-st:hover{border-color:#0284c7;filter:brightness(.95)}.ft-st:active{transform:scale(.94)}' +
        '.ft-b{height:28px;padding:0 12px;border-radius:5px;font:800 13px "Cairo",system-ui,sans-serif;text-shadow:0 1px 2px rgba(0,0,0,.55);cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:4px;flex-shrink:0;border:1px solid;transition:all .15s}' +
        '.ft-b:hover{filter:brightness(1.15)}' +
        '.ft-b:active{transform:scale(.97)}' +
        '.ft-b.gen{background:linear-gradient(180deg,#1d4ed8,#1e3a8a);color:#fff;border-color:#60a5fa}' +
        '.ft-b.bank{background:linear-gradient(180deg,#0369a1,#1e3a8a);color:#fff;border-color:#38bdf8}' +
        '.ft-b.send{background:linear-gradient(180deg,#15803d,#14532d);color:#fff;border-color:#22c55e}' +

        /* ════ أزرار الشريط الأحمر (أقصى اليسار) + أيقونات ════ */
        '.ft-b svg{width:14px;height:14px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 1px 1px rgba(0,0,0,.45))}' +
        '.ft-b.t-exam{background:linear-gradient(180deg,#1d4ed8,#1e3a8a);color:#fff;border-color:#60a5fa}' +
        '.ft-b.t-bank{background:linear-gradient(180deg,#0369a1,#1e3a8a);color:#fff;border-color:#38bdf8}' +
        '.ft-b.t-subs{background:linear-gradient(180deg,#7e22ce,#581c87);color:#fff;border-color:#c084fc}' +
        '.ft-b.t-gen,.ft-b.paste{background:linear-gradient(180deg,#ea580c,#9a3412);color:#fff;border-color:#fdba74}' +
        '.ft-b.figb{background:linear-gradient(180deg,#0f766e,#134e4a);color:#fff;border-color:#2dd4bf}' +
        '.xw-bl{display:flex;align-items:center;gap:6px;flex-shrink:0;margin-right:6px}' +
        '.xw-bl .ft-b{height:22px;padding:0 10px 0 9px;font-size:12px;border-radius:6px;gap:5px;box-shadow:0 1px 3px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.22)}' +
        '.xw-bl .xw-tab:not(.on):not(.t-gen){opacity:.75}' +
        '.xw-bl .xw-tab.on{opacity:1;box-shadow:0 0 0 2px #fde68a,0 2px 8px rgba(0,0,0,.55)}' +

        /* ════ شريط البنك (صف أفقي واحد) ════ */
        '.ft-in{height:22px;width:48px;background:rgba(156,163,175,.5);border:1px solid #38bdf8;color:#fff;border-radius:4px;padding:0 5px;font:700 12px Cairo,system-ui,sans-serif;outline:none;flex-shrink:0;direction:rtl;unicode-bidi:plaintext;text-align:start}' +
        '.ft-in.w{width:130px}.ft-in.w2{width:190px}' +
        '.ft-in:focus{border-color:#0284c7;box-shadow:0 0 0 2px rgba(56,189,248,.45)}' +
        '.ft-in::placeholder{color:rgba(255,255,255,.55);font-weight:600}' +
        '.ft-fg{height:22px;width:22px;border-radius:4px;object-fit:cover;border:1px solid #38bdf8;flex-shrink:0;background:#fff}' +
        '[data-bfig]{display:inline-flex;align-items:center;gap:4px}' +

        /* ════ البنك / الإجابات داخل النافذة ════ */
        '.xw-bank{flex:1;display:none;flex-direction:column;min-height:0;min-width:0;background:#0e1b2e;direction:rtl;color:#e2e8f0;font-family:Cairo,system-ui,sans-serif}' +
        '.xw.xw-tab-bank .xw-sc,.xw.xw-tab-subs .xw-sc{display:none}' +
        '.xw.xw-tab-bank .xw-bank,.xw.xw-tab-subs .xw-bank{display:flex}' +
        '.xb-sub{display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid #1f3a63;flex-shrink:0;flex-wrap:wrap}' +
        '.xb-chip{height:24px;padding:0 12px;border-radius:999px;border:1px solid #38bdf8;background:transparent;color:#bae6fd;font:800 12px Cairo,system-ui,sans-serif;cursor:pointer}' +
        '.xb-chip.on{background:#0369a1;color:#fff}' +
        '.xb-q{height:24px;flex:1 1 140px;min-width:100px;border:1px solid #38bdf8;border-radius:5px;background:rgba(255,255,255,.08);color:#fff;padding:0 8px;font:12px Cairo,system-ui,sans-serif;direction:rtl;unicode-bidi:plaintext;text-align:start;outline:none}' +
        '.xb-info{font:700 11px Cairo,system-ui,sans-serif;color:#94a3b8;direction:ltr}' +
        '.xb-list{flex:1;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:8px}' +
        '.xb-list::-webkit-scrollbar{width:15px;height:15px}.xb-list::-webkit-scrollbar-track{background:#111}.xb-list::-webkit-scrollbar-thumb{background:rgba(230,199,90,.55);border:1px solid #111}' +
        '.xb-card{background:#fff;color:#111;border-radius:8px;padding:8px 10px;border-right:4px solid #0284c7;flex-shrink:0}' +
        '.xb-card.in{border-right-color:#16a34a;background:#f0fdf4}' +
        '.xb-h{display:flex;gap:8px;align-items:center;font:700 11px Cairo,system-ui,sans-serif;margin-bottom:4px;flex-wrap:wrap}' +
        '.xb-ty{padding:1px 8px;border-radius:999px;color:#fff}.xb-ty.m{background:#0369a1}.xb-ty.e{background:#b45309}' +
        '.xb-meta{color:#64748b;direction:ltr;unicode-bidi:plaintext}.xb-in{color:#15803d}' +
        '.xb-t{font:15px/1.6 Cairo,system-ui,sans-serif;direction:rtl}' +
        '.xb-o{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:6px}' +
        '.xb-o>div{border:1px solid #cbd5e1;border-radius:6px;padding:2px 8px;font-size:13px;display:flex;gap:6px;align-items:baseline}' +
        '.xb-o>div.ok{border-color:#16a34a;background:#dcfce7}.xb-o b{color:#7f1d1d}' +
        '.xb-a{display:flex;gap:6px;margin-top:8px}' +
        '.xb-a button,.xb-more button,.xb-row button{height:24px;padding:0 10px;border-radius:5px;border:1px solid;font:800 12px Cairo,system-ui,sans-serif;cursor:pointer}' +
        '.xb-a .add,.xb-row button{background:#0369a1;color:#fff;border-color:#0369a1}.xb-a .rm,.xb-row button.del{background:#fff;color:#b91c1c;border-color:#fca5a5}.xb-a .ed{background:#fff;color:#0f766e;border-color:#14b8a6}' +
        '.xb-fil{direction:ltr;background:#0b1626}.xb-fil .ft-l{font-size:12px}' +
        '.xb-sel{max-width:150px;min-width:56px}' +
        '.xb-add{height:24px;padding:0 14px;border-radius:5px;border:1px solid #22c55e;background:linear-gradient(180deg,#15803d,#14532d);color:#fff;font:800 12px Cairo,system-ui,sans-serif;cursor:pointer;margin-inline-start:auto}.xb-add:hover{filter:brightness(1.15)}' +
        '.xb-new{background:linear-gradient(180deg,#e0f2fe,#bae6fd);border:2px solid #0284c7;border-radius:12px;padding:12px;color:#0f172a;flex-shrink:0;box-shadow:0 4px 14px rgba(2,132,199,.25)}' +
        '.xb-nt{font:800 13px Cairo,system-ui,sans-serif;color:#075985;margin-bottom:6px}' +
        '.xb-nm{display:flex;flex-wrap:wrap;gap:6px;direction:ltr;margin-bottom:6px}.xb-nm span{display:flex;align-items:center;gap:4px}.xb-nm span.wide{flex:1 1 200px}' +
        '.xb-nm i{font-style:normal;font:800 11px Cairo,system-ui,sans-serif;color:#075985;white-space:nowrap}' +
        '.xb-nm input{width:64px;height:26px;border:1px solid #94a3b8;border-radius:6px;padding:0 6px;background:#fff;color:#111;font:13px Cairo,system-ui,sans-serif}.xb-nm span.wide input{width:100%;min-width:0;direction:rtl;unicode-bidi:plaintext;text-align:start}' +
        '.xb-nm input.ov{border-color:#ea580c;background:#fff7ed}' +
        '.xb-nty{display:flex;gap:6px;margin-bottom:6px}.xb-nty button,.xb-na button{height:24px;padding:0 12px;border-radius:5px;border:1px solid #0284c7;background:#fff;color:#075985;font:800 12px Cairo,system-ui,sans-serif;cursor:pointer}.xb-nty button.on{background:#0284c7;color:#fff}' +
        '.xb-new textarea{width:100%;min-height:80px;border:1px solid #94a3b8;border-radius:6px;padding:6px;background:#fff;color:#111;font:14px/1.6 Consolas,Cairo,monospace;direction:rtl;unicode-bidi:plaintext;text-align:start;resize:vertical;box-sizing:border-box}' +
        '.xb-new textarea.xb-sol-t{min-height:48px}' +
        '.xb-ng{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:6px 0}.xb-ng div{display:flex;gap:4px;align-items:center}' +
        '.xb-ng button{flex:0 0 auto;width:28px;height:28px;border:1.5px solid #16a34a;background:#fff;color:#16a34a;border-radius:6px;font:800 13px/1 Cairo,system-ui,sans-serif;cursor:pointer;padding:0}.xb-ng button.on{background:#16a34a;color:#fff}' +
        '.xb-ng input{flex:1;min-width:0;height:28px;border:1px solid #94a3b8;border-radius:6px;padding:0 6px;background:#fff;color:#111;font:13px Cairo,system-ui,sans-serif;direction:rtl;unicode-bidi:plaintext;text-align:start}' +
        '.xb-na{display:flex;gap:6px;margin-top:8px}.xb-na .save{background:#16a34a;color:#fff;border-color:#16a34a}.xb-na .cancel{color:#7f1d1d;border-color:#dc2626}' +
        '.xb-na button{display:inline-flex;align-items:center;gap:5px}.xb-na svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}' +
        '.xb-more{text-align:center}.xb-more button{background:#12213a;color:#bae6fd;border-color:#38bdf8}' +
        '.xb-empty{color:#94a3b8;text-align:center;padding:40px;font:700 14px Cairo,system-ui,sans-serif}' +
        '.xb-row{display:flex;align-items:center;gap:8px;background:#12213a;border:1px solid #1f3a63;border-radius:8px;padding:8px 10px;flex-shrink:0}.xb-row b{flex:1;color:#fde68a}.xb-row .xb-score{font:800 13px monospace;color:#86efac;direction:ltr}' +

        /* ════ بطاقات البنك: رسم + إجابة + حل ════ */
        '.xb-r{display:flex;gap:10px;align-items:center}.xb-r .xb-t{flex:1;min-width:0}' +
        '.xb-fg{flex:0 0 190px;text-align:center}.xb-fg:empty{display:none}.xb-fg img{max-width:190px;max-height:120px}' +
        '.xb-ans{color:#15803d;font-weight:800}' +
        '.xb-sol{margin-top:6px;border:1px solid #fbbf24;background:#fffbeb;border-radius:6px;padding:4px 8px;font-size:13px}.xb-sol i{font-style:normal;font-weight:800;color:#92400e;display:block;font-size:11px}' +
        '.xb-hint{font:600 11.5px/1.7 Cairo,system-ui,sans-serif;color:#075985;margin:2px 0 6px}' +
        '.xb-nfg{display:flex;align-items:center;gap:8px;margin:6px 0}.xb-nfg img{max-height:90px;max-width:200px;border:1px solid #94a3b8;border-radius:6px;background:#fff}' +
        '.xb-nfg button{height:24px;padding:0 10px;border-radius:5px;border:1px solid #fca5a5;background:#fff;color:#b91c1c;font:800 12px Cairo,system-ui,sans-serif;cursor:pointer}' +

        /* ════ لصق مجموعة أسئلة ════ */
        '.xb-paste{background:linear-gradient(180deg,#fff7ed,#fed7aa);border:2px solid #ea580c;border-radius:12px;padding:12px;color:#431407;flex-shrink:0;box-shadow:0 4px 14px rgba(234,88,12,.25)}' +
        '.xb-paste .xb-nt{color:#9a3412}.xb-paste .xb-hint{color:#7c2d12}' +
        '.xb-spec{font:700 12px Cairo,system-ui,sans-serif;color:#7c2d12;margin-bottom:6px;direction:rtl}.xb-spec b{direction:ltr;unicode-bidi:plaintext;color:#111}' +
        '.xb-paste textarea.xb-pt{width:100%;min-height:150px;border:1px solid #fb923c;border-radius:6px;padding:6px;background:#fff;color:#111;font:14px/1.6 Consolas,Cairo,monospace;direction:rtl;unicode-bidi:plaintext;text-align:start;resize:vertical;box-sizing:border-box}' +
        '.xb-pv{margin-top:8px;display:flex;flex-direction:column;gap:4px;max-height:260px;overflow:auto}' +
        '.xb-pi{display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #fdba74;border-radius:6px;padding:3px 8px;font:12px Cairo,system-ui,sans-serif}' +
        '.xb-pn{flex:0 0 22px;height:22px;border-radius:50%;background:#7f1d1d;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:11px}' +
        '.xb-ptx{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;unicode-bidi:plaintext}' +
        '.xb-pa{display:inline-flex;gap:3px}.xb-pa button{width:22px;height:22px;border:1.5px solid #16a34a;background:#fff;color:#16a34a;border-radius:5px;font:800 12px/1 Cairo,system-ui,sans-serif;cursor:pointer;padding:0}.xb-pa button.on{background:#16a34a;color:#fff}' +
        '.xb-warn{color:#b91c1c;font-weight:800;font-size:11px;white-space:nowrap}' +
        '.xb-paste .xb-empty{color:#9a3412;padding:14px;font-size:12px}' +

        /* ════ 8 مقابض تغيير الحجم ════ */
        '.xw-rz{position:absolute;z-index:6;background:transparent}' +
        '.xw-rz:hover{background:rgba(212,175,55,.25)}' +
        '.xw-rz-n{top:0;left:8px;right:8px;height:6px;cursor:n-resize}' +
        '.xw-rz-s{bottom:0;left:8px;right:8px;height:6px;cursor:s-resize}' +
        '.xw-rz-e{right:0;top:8px;bottom:8px;width:6px;cursor:e-resize}' +
        '.xw-rz-w{left:0;top:8px;bottom:8px;width:6px;cursor:w-resize}' +
        '.xw-rz-ne{top:0;right:0;width:14px;height:14px;cursor:ne-resize;background:linear-gradient(225deg,transparent 11%,#d4af37 11%,#d4af37 17%,transparent 17%,transparent 22%,#d4af37 22%,#d4af37 28%,transparent 28%,transparent 33%,#d4af37 33%,#d4af37 39%,transparent 39%,transparent 45%,#d4af37 45%,#d4af37 55%,transparent 55%);opacity:.8}' +
        '.xw-rz-nw{top:0;left:0;width:14px;height:14px;cursor:nw-resize;background:linear-gradient(135deg,transparent 11%,#d4af37 11%,#d4af37 17%,transparent 17%,transparent 22%,#d4af37 22%,#d4af37 28%,transparent 28%,transparent 33%,#d4af37 33%,#d4af37 39%,transparent 39%,transparent 45%,#d4af37 45%,#d4af37 55%,transparent 55%);opacity:.8}' +
        '.xw-rz-se{bottom:0;right:0;width:14px;height:14px;cursor:se-resize;background:linear-gradient(315deg,transparent 11%,#d4af37 11%,#d4af37 17%,transparent 17%,transparent 22%,#d4af37 22%,#d4af37 28%,transparent 28%,transparent 33%,#d4af37 33%,#d4af37 39%,transparent 39%,transparent 45%,#d4af37 45%,#d4af37 55%,transparent 55%);opacity:.8}' +
        '.xw-rz-sw{bottom:0;left:0;width:14px;height:14px;cursor:sw-resize;background:linear-gradient(45deg,transparent 11%,#d4af37 11%,#d4af37 17%,transparent 17%,transparent 22%,#d4af37 22%,#d4af37 28%,transparent 28%,transparent 33%,#d4af37 33%,#d4af37 39%,transparent 39%,transparent 45%,#d4af37 45%,#d4af37 55%,transparent 55%);opacity:.8}' +
        '.xw-rz-ne:hover,.xw-rz-nw:hover,.xw-rz-se:hover,.xw-rz-sw:hover{opacity:1}' +

        /* ════ الحالات ════ */
        '.xw.xw-minimized{height:28px !important;min-height:28px !important}' +
        '.xw.xw-minimized .xw-main,.xw.xw-minimized .xw-foot,.xw.xw-minimized .xw-rz{display:none !important}' +
        '.xw.xw-maximized{border-radius:0}' +

        /* ════ صفحة A4 ════ */
        '.xw-pg{position:relative;width:794px;min-height:1123px;background:#fff;color:#111 !important;direction:rtl;text-align:right;padding:16px 30px;font:16px/1.6 Cairo,"Segoe UI",Tahoma,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,.4);border-radius:2px;vertical-align:top}' +
        '.xw-pg *{color:#111}' +
        '.xw-pg .xp-el{color:#075985 !important}' +
        '.xw-pg .xp-elt.on{color:#fff !important}' +
        '.xw-pg .xp-eact .save{color:#fff !important}' +
        '.xw-pg .xp-eact .upl{color:#fff !important}' +
        '.xw-pg .xp-eact .cancel,.xw-pg .xp-eact .del{color:#7f1d1d !important}' +
        '.xw-pg .xp-n{color:#7f1d1d !important}' +
        '.xw-pg textarea,.xw-pg input{color:#111 !important;background:#fff !important}' +
        '.xw-pg textarea:focus{outline:none;border-color:#b8860b;background:#fefce8 !important}' +
        '.xw-pg.xp-frame{border:3px double #7f1d1d;box-shadow:inset 0 0 0 1px #b8860b,0 4px 20px rgba(0,0,0,.4);padding:14px 24px}' +

        /* ════ رأس الاختبار ════ */
        '.xp-hd{display:flex;align-items:stretch;gap:0;height:36px;border:2px solid #111;border-radius:6px;padding:0;margin-bottom:14px;font-size:13px;white-space:nowrap;overflow:hidden}' +
        '.xp-hd span{display:flex;gap:4px;align-items:center;justify-content:center;padding:0 6px;border-left:1px solid #999;flex:1 1 0;width:0;min-width:0;overflow:hidden;text-overflow:ellipsis}.xp-hd span:first-child{border-left:0}.xp-hd i{font-style:normal;color:#666;font-size:11px;line-height:1;flex-shrink:0}.xp-hd b{font-weight:700;line-height:1;overflow:hidden;text-overflow:ellipsis}' +
        '.xp-hd .tm{font:700 15px/1 monospace;color:#b91c1c;direction:ltr}' +

        /* ════ السؤال ════ */
        '.xp-q{margin:0 0 8px;padding-bottom:6px;border-bottom:1px dashed #bbb}.xp-r{display:flex;gap:14px;align-items:center}.xp-t{flex:1;min-width:0}.xp-f{flex:0 0 250px;text-align:center}.xp-f img{max-height:120px;max-width:250px;width:auto;margin:0 auto}.xp-n{font-weight:900;color:#7f1d1d;font-size:14px;line-height:1.3}.xp-q img{display:block;max-width:100%}' +

        /* ════ الخيارات ════ */
        '.xp-o{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:4px}.xp-o label{display:flex;align-items:center;gap:6px;border:1.5px solid #cbd5e1;border-radius:999px;padding:4px 10px;cursor:pointer;min-height:34px;background:#fff;transition:all .15s;overflow:hidden;isolation:isolate}.xp-o label.ok{border-color:#16a34a;background:#d4f5d4}.xp-o label:hover{border-color:#64748b}' +
        '.xp-o b{flex-shrink:0;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:#fff;border:1.5px solid #7f1d1d;color:#7f1d1d;font:700 12px/1 inherit;box-sizing:border-box;transition:all .15s}.xp-o label.ok b{background:#16a34a;border-color:#16a34a;color:#fff;box-shadow:0 1px 3px rgba(22,163,74,.5)}' +
        '.xp-o label:has(input:checked) b, .xp-o label.selected b{background:#16a34a !important;border-color:#16a34a !important;color:#fff !important}' +
        '.xp-o input[type=radio]{appearance:none;-webkit-appearance:none;width:16px;height:16px;border:2px solid #94a3b8;border-radius:50%;background:#fff;flex-shrink:0;cursor:pointer;padding:0}.xp-o input[type=radio]:checked{background:#16a34a !important;border-color:#16a34a !important}' +
        '.xp-o img{max-width:100%;mix-blend-mode:multiply}' +

        /* ════ السؤال المقالي ════ */
        '.xp-e textarea{width:100%;min-height:110px;margin-top:4px;border:1.5px solid #b8a878;border-radius:8px;padding:10px;background:#fbf8ef;font:16px/1.7 Cairo,Tahoma,sans-serif;direction:rtl;resize:vertical;color:#1f2937}' +
        '.xp-e textarea:focus{outline:none;border-color:#b8860b;background:#fefce8}' +

        /* ════ البانل الرفيع ════ */
        '.xp-thd{display:flex;align-items:center;gap:8px;height:32px;padding:0 8px;margin:0 0 10px;border-bottom:1.5px solid #b8860b;border-top:1.5px solid #b8860b;background:linear-gradient(90deg,#fffbef,#fef9e7 50%,#fffbef);font-family:"Segoe Script","Bradley Hand","Lucida Handwriting","Comic Sans MS",cursive;font-size:14px;color:#7f1d1d;direction:rtl;white-space:nowrap;overflow:hidden;flex-shrink:0}' +
        '.xp-thd .nm{font-weight:700;color:#7f1d1d;flex-shrink:0;max-width:180px;overflow:hidden;text-overflow:ellipsis}' +
        '.xp-thd .sep{color:#b8860b;flex-shrink:0} .xp-thd .ti{color:#334155;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;font-weight:600}' +
        '.xp-thd .dt{color:#6b7280;flex-shrink:0} .xp-thd .tm{color:#b91c1c;flex-shrink:0;direction:ltr}' +

        /* ════ رفع الصورة (للمقالي عند الطالب) ════ */
        '.xp-e-row{display:flex;gap:8px;margin-top:6px;align-items:flex-start;flex-wrap:wrap}.xp-e-up{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:#fef3c7;border:1px solid #d6cbb6;border-radius:6px;cursor:pointer;font:600 12px inherit;color:#7f1d1d}.xp-e-up input{display:none}.xp-e-prev{position:relative;display:none}.xp-e-prev.on{display:inline-block}.xp-e-prev img{max-height:80px;max-width:160px;border:1.5px solid #b8860b;border-radius:6px}.xp-e-prev .rm{position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:#dc2626;color:#fff;border:0;font:700 12px/1 inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}' +

        /* ════ زر Edit ════ */
        '.xp-qed{float:left;margin-left:6px;width:22px;height:22px;border:1px solid #38bdf8;border-radius:5px;background:#e0f2fe;color:#0369a1;font:700 12px/1 inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0}.xp-qed:hover{background:#bae6fd;border-color:#0284c7}' +

        /* ════ صندوق التحرير ════ */
        '.xp-edrop{margin-top:8px;padding:10px;background:linear-gradient(180deg,#e0f2fe,#bae6fd);border:2px solid #0284c7;border-radius:12px;box-shadow:0 0 0 3px rgba(2,132,199,.15),0 4px 14px rgba(2,132,199,.25);direction:rtl;font-size:13px}' +
        '.xp-emeta{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 2px;direction:ltr}' +
        '.xp-emeta span{display:flex;align-items:center;gap:4px;flex:0 0 auto}' +
        '.xp-emeta span.wide{flex:1 1 200px}' +
        '.xp-emeta i{font-style:normal;font:700 11px/1 inherit;color:#075985 !important;white-space:nowrap}' +
        '.xp-emeta input{width:64px;height:28px;border:1px solid #cbd5e1;border-radius:6px;padding:0 6px;font:inherit;font-size:13px;direction:ltr;text-align:left}' +
        '.xp-emeta span.wide input{width:100%;min-width:0;direction:rtl;unicode-bidi:plaintext;text-align:start}' +

        /* ════ محرّر السؤال — الترتيب: مواصفات ← نص ← كود ← خيارات ← رسم ← حل ← كود الحل ════ */
        '.xp-sec{margin-top:8px;padding:8px;border-radius:10px;border:1px solid #7dd3fc;background:#fff;direction:rtl}' +
        '.xp-sec-spec{background:linear-gradient(180deg,#7e22ce,#581c87);border:1px solid #c084fc;box-shadow:0 2px 8px rgba(88,28,135,.35)}' +
        '.xp-sh{display:flex;align-items:center;gap:6px;font:800 12px Cairo,Tahoma,sans-serif;color:#075985;margin:0 0 6px}' +
        '.xp-sec-spec .xp-sh{color:#fff !important}' +
        '.xp-num{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:#0284c7;color:#fff !important;font:800 11px/1 Cairo,Tahoma,sans-serif;flex-shrink:0}' +
        '.xp-sec-spec .xp-num{background:#fff;color:#7e22ce !important}' +
        '.xp-sec-spec .xp-emeta i{color:#fff !important}' +
        '.xp-sec-spec .xp-emeta input{background:#fff !important;border-color:#c084fc}' +
        '.xp-rich{border:1px solid #94a3b8;border-radius:8px;overflow:hidden;background:#fff}' +
        '.xp-tb{display:flex;flex-wrap:wrap;gap:4px;align-items:center;padding:4px 6px;background:linear-gradient(180deg,#f8fafc,#e2e8f0);border-bottom:1px solid #cbd5e1}' +
        '.xp-tb select{height:26px;border:1px solid #94a3b8;border-radius:5px;background:#fff !important;color:#111 !important;font:12px Cairo,Tahoma,sans-serif;padding:0 4px;max-width:130px}' +
        '.xp-tb input[type=color]{width:30px;height:26px;padding:1px;border:1px solid #94a3b8;border-radius:5px;background:#fff !important;cursor:pointer}' +
        '.xp-tb button{min-width:28px;height:26px;border:1px solid #94a3b8;border-radius:5px;background:#fff !important;color:#111 !important;cursor:pointer;font:700 13px/1 Cairo,Tahoma,sans-serif;padding:0 6px}' +
        '.xp-tb button:hover{background:#e0f2fe !important;border-color:#0284c7}' +
        '.xp-rv{min-height:70px;padding:10px;font:16px/1.75 Cairo,Tahoma,sans-serif;direction:rtl;text-align:right;color:#111 !important;outline:none;background:#fff !important}' +
        '.xp-rv:focus{box-shadow:inset 0 0 0 2px #0284c7;background:#fefce8 !important}' +
        '.xp-sec textarea{width:100%;min-height:70px;border:1px solid #cbd5e1;border-radius:6px;padding:6px;background:#fff !important;font:13px/1.6 Consolas,monospace;direction:ltr;text-align:left;resize:vertical;box-sizing:border-box;color:#111 !important}' +
        '.xp-egrid{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:4px 0}' +
        '.xp-eopt{display:flex;gap:4px;align-items:center}.xp-eopt .xp-elt{flex:0 0 auto;width:28px;height:28px;border:1.5px solid #16a34a;background:#fff;color:#16a34a;border-radius:6px;font:700 13px/1 inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0}.xp-eopt .xp-elt.on{background:#16a34a;color:#fff}.xp-eopt input{flex:1;direction:rtl;unicode-bidi:plaintext;text-align:start;height:28px;border:1px solid #cbd5e1;border-radius:6px;padding:0 6px;background:#fff;font:inherit;font-size:13px;color:#111 !important}' +
        '.xp-efig{margin:6px 0;border:1px solid #cbd5e1;border-radius:6px;padding:6px;background:#fff;min-height:60px;text-align:center}.xp-efig img{max-height:120px;max-width:100%}.xp-efig .xp-efn{color:#64748b;font-size:11px;margin-top:4px}' +
        '.xp-eact{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}.xp-eact button{padding:5px 12px;border-radius:6px;font:700 12px/1 inherit;cursor:pointer;border:1px solid}.xp-eact .save{background:#16a34a;color:#fff;border-color:#16a34a}.xp-eact .cancel{background:#fff;color:#7f1d1d;border-color:#dc2626}.xp-eact .del{background:#fff;color:#dc2626;border-color:#fca5a5}.xp-eact .upl{background:#1e293b;color:#fff;border-color:#1e293b}' +
        '.xp-eact-end{justify-content:flex-start}' +

        /* ════ الشرط (التنبيه) ════ */
        '.xw-warn{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);background:rgba(254,243,199,.96);color:#92400e;border:1px solid #f59e0b;border-radius:999px;padding:8px 24px;font:700 14px Cairo,system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.35);z-index:5;display:flex;flex-direction:column;align-items:center;gap:4px;pointer-events:none;text-align:center;direction:rtl}' +
        '.xw-warn b{font:700 20px/1 monospace;color:#b91c1c;direction:ltr}' +
        '.xw-warn i{font-style:normal;font-size:12px;color:#92400e}' +
        '.xw-warn small{font-size:10px;color:#92400e;opacity:.8}' +

        /* ════ زر الطالب ════ */
        '.xs-btn{position:static;margin:0 8px;max-width:46vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0;background:#ea580c;color:#fff;border:0;border-radius:999px;padding:3px 12px;font:700 11px Cairo,system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.5);cursor:pointer}';

    function css() {
        const old = document.getElementById('xwCss');
        if (old) old.remove();
        const s = document.createElement('style');
        s.id = 'xwCss';
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    const LT = ['أ', 'ب', 'ج', 'د'], KD = { lesson: 'Lesson', sec: 'Section', ch: 'Ch' };
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fmt = s => { s = Math.max(0, Math.round(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

    /* ═════════════════════════════════════════════════════════════════
       أيقونات SVG
       ═════════════════════════════════════════════════════════════════ */
    const ico = p => '<svg viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>';
    const ICO = {
        exam: ico('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>'),
        bank: ico('<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>'),
        subs: ico('<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.2a2 2 0 0 0-1.7 1.1z"/>'),
        gen: ico('<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>'),
        send: ico('<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'),
        plus: ico('<circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>'),
        paste: ico('<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 13h6M9 17h4"/>'),
        img: ico('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
        all: ico('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
        save: ico('<path d="M20 6 9 17l-5-5"/>')
    };

    /* ═════════════════════════════════════════════════════════════════
       نافذة عائمة — سحب + تغيير حجم من 8 اتجاهات + فوق كل شيء
       ═════════════════════════════════════════════════════════════════ */
    function win(o) {
        css();
        const w = document.createElement('div');
        w.className = 'xw';
        const W = Math.min(innerWidth - 40, o.w || 820);
        const H = Math.min(innerHeight - 40, o.h || Math.max(400, innerHeight - 60));
        const L = Math.max(20, Math.round((innerWidth - W) / 2));
        const T = Math.max(20, Math.round((innerHeight - H) / 2));
        w.style.left = L + 'px';
        w.style.top = T + 'px';
        w.style.width = W + 'px';
        w.style.height = H + 'px';

        const onK = o.tabs ? (o.tabs.find(t => t.on) || o.tabs.find(t => !t.act) || {}).k : '';
        const blHtml = o.tabs ? '<div class="xw-bl">' + o.tabs.map(t =>
            '<button class="xw-tab ft-b t-' + esc(t.k) + (t.k === onK ? ' on' : '') + '" data-tab="' + esc(t.k) + '"' + (t.act ? ' data-act="1"' : '') + ' title="' + esc(t.t) + '">' + (ICO[t.k] || '') + '<span>' + esc(t.t) + '</span></button>').join('') + '</div>' : '';
        w.innerHTML =
            '<div class="xw-bar">' + blHtml +
                '<span class="xw-ico">📋</span>' +
                '<b class="xw-title">' + esc(o.title || '') + '</b>' +
                '<span class="xw-ex"></span>' +
                '<button class="xw-btn xw-min" title="طي">−</button>' +
                '<button class="xw-btn xw-max" title="تكبير">□</button>' +
                '<button class="xw-btn xw-x" title="إغلاق">✕</button>' +
            '</div>' +
            '<div class="xw-main">' +
                '<div class="xw-side" style="display:' + (o.side ? '' : 'none') + '"></div>' +
                '<div class="xw-sc"><div class="xw-pgw"></div></div>' +
                (o.tabs ? '<div class="xw-bank"></div>' : '') +
            '</div>' +
            '<div class="xw-foot"' + (o.tabs ? '' : ' style="display:none"') + '>' +
                '<span class="xw-foot-info"></span>' +
                '<span class="xw-foot-btns"></span>' +
            '</div>' +
            /* 8 مقابض تغيير الحجم */
            '<div class="xw-rz xw-rz-n"  data-rz="n"></div>' +
            '<div class="xw-rz xw-rz-s"  data-rz="s"></div>' +
            '<div class="xw-rz xw-rz-e"  data-rz="e"></div>' +
            '<div class="xw-rz xw-rz-w"  data-rz="w"></div>' +
            '<div class="xw-rz xw-rz-ne" data-rz="ne"></div>' +
            '<div class="xw-rz xw-rz-nw" data-rz="nw"></div>' +
            '<div class="xw-rz xw-rz-se" data-rz="se"></div>' +
            '<div class="xw-rz xw-rz-sw" data-rz="sw"></div>';

        document.body.appendChild(w);

        w.querySelector('.xw-x').onclick = () => {
            try { w.remove(); } catch (e) {}
            try { w.dispatchEvent(new CustomEvent('xw-close')); } catch (e) {}
        };
        const minBtn = w.querySelector('.xw-min'), maxBtn = w.querySelector('.xw-max');
        let minned = false, maxed = false, saved = null;
        minBtn.onclick = () => {
            minned = !minned;
            w.classList.toggle('xw-minimized', minned);
            minBtn.textContent = minned ? '□' : '−';
            minBtn.title = minned ? 'استعادة' : 'طي';
        };
        maxBtn.onclick = () => {
            if (!maxed) {
                saved = { l: w.style.left, t: w.style.top, w: w.style.width, h: w.style.height };
                w.style.left = '0px'; w.style.top = '0px';
                w.style.width = innerWidth + 'px'; w.style.height = innerHeight + 'px';
                w.classList.add('xw-maximized');
                maxBtn.textContent = '❐'; maxBtn.title = 'استعادة';
                maxed = true;
            } else {
                if (saved) { w.style.left = saved.l; w.style.top = saved.t; w.style.width = saved.w; w.style.height = saved.h; }
                w.classList.remove('xw-maximized');
                maxBtn.textContent = '□'; maxBtn.title = 'تكبير';
                maxed = false;
            }
        };

        const DRAG_END = { mouseup: 1, pointerup: 1, pointercancel: 1 };
        ['mousedown','mousemove','mouseup','pointerdown','pointermove','pointerup','touchstart','touchmove','touchend','click','dblclick','contextmenu','wheel','keydown']
            .forEach(ev => w.addEventListener(ev, e => {
                if (DRAG_END[ev]) return;
                if (window.__mcSplitDragging) { e.stopPropagation(); return; }
                e.stopPropagation();
            }));

        const bar = w.querySelector('.xw-bar');
        let d = null;
        bar.addEventListener('pointerdown', e => {
            if (e.target.closest('button,input,.xw-ex')) return;
            if (maxed) return;
            d = { x: e.clientX - w.offsetLeft, y: e.clientY - w.offsetTop };
            bar.setPointerCapture(e.pointerId);
            e.preventDefault();
        });
        bar.addEventListener('pointermove', e => {
            if (!d) return;
            const nx = Math.max(-w.offsetWidth + 100, Math.min(innerWidth - 100, e.clientX - d.x));
            const ny = Math.max(0, Math.min(innerHeight - 40, e.clientY - d.y));
            w.style.left = nx + 'px'; w.style.top = ny + 'px';
        });
        bar.addEventListener('pointerup', () => { d = null; });
        bar.addEventListener('pointercancel', () => { d = null; });

        const RZ_MIN_W = 340, RZ_MIN_H = 220;
        w.querySelectorAll('[data-rz]').forEach(rz => {
            const dir = rz.dataset.rz;
            let rs = null;
            rz.addEventListener('pointerdown', e => {
                if (maxed) return;
                rs = {
                    x: e.clientX, y: e.clientY,
                    l: w.offsetLeft, t: w.offsetTop,
                    w: w.offsetWidth, h: w.offsetHeight
                };
                rz.setPointerCapture(e.pointerId);
                e.preventDefault(); e.stopPropagation();
            });
            rz.addEventListener('pointermove', e => {
                if (!rs) return;
                const dx = e.clientX - rs.x, dy = e.clientY - rs.y;
                let nl = rs.l, nt = rs.t, nw = rs.w, nh = rs.h;
                if (dir.indexOf('e') >= 0) nw = Math.max(RZ_MIN_W, rs.w + dx);
                if (dir.indexOf('w') >= 0) { nw = Math.max(RZ_MIN_W, rs.w - dx); nl = rs.l + (rs.w - nw); }
                if (dir.indexOf('s') >= 0) nh = Math.max(RZ_MIN_H, rs.h + dy);
                if (dir.indexOf('n') >= 0) { nh = Math.max(RZ_MIN_H, rs.h - dy); nt = rs.t + (rs.h - nh); }
                w.style.width = nw + 'px'; w.style.height = nh + 'px';
                w.style.left = nl + 'px'; w.style.top = nt + 'px';
            });
            rz.addEventListener('pointerup', () => { rs = null; });
            rz.addEventListener('pointercancel', () => { rs = null; });
        });

        const sc = w.querySelector('.xw-sc');
        const pgw = w.querySelector('.xw-pgw');
        const fit = () => {
            const pg = pgw.firstElementChild;
            if (!pg) return;
            pg.style.width = '794px';
            pg.style.minHeight = '1123px';
        };
        if (window.ResizeObserver) new ResizeObserver(fit).observe(sc);

        let pn = null;
        sc.addEventListener('pointerdown', e => {
            if (e.button !== 1 && e.button !== 0) return;
            if (e.target.closest('input,textarea,label,button,select,[contenteditable="true"]')) return;
            pn = { x: e.clientX, y: e.clientY, l: sc.scrollLeft, t: sc.scrollTop };
            sc.setPointerCapture(e.pointerId);
        });
        sc.addEventListener('pointermove', e => {
            if (!pn) return;
            sc.scrollLeft = pn.l - (e.clientX - pn.x);
            sc.scrollTop = pn.t - (e.clientY - pn.y);
        });
        const pe = () => { pn = null; };
        sc.addEventListener('pointerup', pe);
        sc.addEventListener('pointercancel', pe);

        const api = {
            el: w,
            bank: w.querySelector('.xw-bank'),
            tab: 'exam',
            ex: w.querySelector('.xw-ex'),
            side: w.querySelector('.xw-side'),
            foot: w.querySelector('.xw-foot'),
            footBtns: w.querySelector('.xw-foot-btns'),
            footInfo: w.querySelector('.xw-foot-info'),
            pgw, fit,
            set(pg) {
                pgw.innerHTML = '';
                pgw.appendChild(pg);
                fit();
                const imgs = pg.querySelectorAll('img');
                let pending = 0;
                const redo = () => { fit(); sc.scrollLeft = 0; sc.scrollTop = 0; };
                imgs.forEach(im => {
                    if (!im.complete || !im.naturalWidth) {
                        pending++;
                        const done = () => { pending--; if (pending === 0) redo(); };
                        im.addEventListener('load', done, { once: true });
                        im.addEventListener('error', done, { once: true });
                    }
                });
                if (pending === 0) setTimeout(redo, 0);
            },
            close() { try { w.remove(); } catch (e) {} },
            setTab(k) {
                this.tab = k;
                w.classList.remove('xw-tab-bank', 'xw-tab-subs');
                if (k !== 'exam') w.classList.add('xw-tab-' + k);
                w.querySelectorAll('.xw-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === k));
            }
        };
        w.querySelectorAll('.xw-tab').forEach(b => b.addEventListener('click', () => {
            if (b.dataset.act) { if (api.onAct) api.onAct(b.dataset.tab); return; }
            api.setTab(b.dataset.tab); if (api.onTab) api.onTab(b.dataset.tab);
        }));
        return api;
    }

    /* ═════════════════════════════════════════════════════════════════
       صفحة A4 — عرض الاختبار
       ═════════════════════════════════════════════════════════════════ */
    function cells(m, dur) {
        m = m || {};
        const c = (l, v) => '<span><i>' + l + '</i><b>' + esc(v || '—') + '</b></span>';
        return '<div class="xw-cells">' +
            '<span><i>Ch</i><select><option>' + esc(m.ch || '—') + '</option></select></span>' +
            '<span><i>Sec</i><select><option>' + esc(m.sec || '—') + '</option></select></span>' +
            c('Lesson No.', m.lessonNo) +
            c('Lesson Title', m.title) +
            '<span><i>Test Kind</i><select><option>' + esc(KD[m.kind] || m.kind || '—') + '</option></select></span>' +
            '<span><i>⏱</i><b class="tm">' + fmt((dur || 0) * 60) + '</b></span>' +
        '</div>';
    }
    function nowParts() {
        const d = new Date();
        return { dt: d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }), tm: d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) };
    }

    /* ═════════════════════════════════════════════════════════════════
       محرّر السؤال — الترتيب: مواصفات ← نص ← كود ← خيارات ← رسم ← حل ← كود الحل
       ═════════════════════════════════════════════════════════════════ */
    const FONTS = ['Cairo', 'Tahoma', 'Arial', 'Times New Roman', 'Georgia', 'Courier New', 'Consolas', 'Segoe UI'];
    const SIZES = [12, 14, 16, 18, 20, 22, 24, 28, 32];
    const bodyH = s => { try { return window.MCQBank ? MCQBank.body(s || '') : esc(s || ''); } catch (e) { return esc(s || ''); } };
    const figPrev = src => src ? '<img src="' + src + '"/>' : '<div class="xp-efn">لا يوجد رسم — ارفع صورة</div>';
    const TOOLS = '<div class="xp-tb">' +
        '<select data-vf="font" title="الخط">' + FONTS.map(f => '<option value="' + f + '">' + f + '</option>').join('') + '</select>' +
        '<select data-vf="size" title="الحجم">' + SIZES.map(s => '<option value="' + s + '"' + (s === 16 ? ' selected' : '') + '>' + s + 'px</option>').join('') + '</select>' +
        '<input type="color" data-vf="color" value="#111111" title="اللون"/>' +
        '<button type="button" data-vf="bold" title="عريض"><b>B</b></button>' +
        '<button type="button" data-vf="italic" title="مائل"><i>I</i></button>' +
        '<button type="button" data-vf="underline" title="تحته خط"><u>U</u></button>' +
        '<button type="button" data-vf="clear" title="إزالة التنسيق">⌫</button>' +
        '</div>';

    function editorBox(it, i) {
        const q = it.q, opts = q.opts || ['', '', '', ''], ans = q.ans == null ? -1 : q.ans;
        const sec = (n, t, body) => '<div class="xp-sec"><div class="xp-sh"><span class="xp-num">' + n + '</span>' + t + '</div>' + body + '</div>';
        const richBlk = (key, html, dirty) => '<div class="xp-rich">' + TOOLS +
            '<div class="xp-rv" contenteditable="true" data-rv="' + key + '" data-dirty="' + (dirty ? '1' : '0') + '">' + html + '</div></div>';

        let h = '<div class="xp-edrop" data-edrop="' + i + '" data-ans="' + ans + '">';
        /* 1 — مواصفات السؤال (خلفية بنفسجية مثل زر الإجابات) */
        h += '<div class="xp-sec xp-sec-spec"><div class="xp-sh"><span class="xp-num">1</span>مواصفات السؤال</div><div class="xp-emeta">' +
            '<span><i>Ch</i><input data-ef="ch" value="' + esc(q.ch) + '"/></span>' +
            '<span><i>Sec</i><input data-ef="chNo" value="' + esc(q.chNo) + '"/></span>' +
            '<span><i>Lesson_No</i><input data-ef="lessonNo" value="' + esc(q.lessonNo) + '"/></span>' +
            '<span class="wide"><i>Lesson_Title</i><input data-ef="lesson" value="' + esc(q.lesson) + '"/></span>' +
            '</div></div>';
        /* 2 — نص السؤال كما يراه الطالب */
        h += sec(2, 'نص السؤال كما يراه الطالب', richBlk('text', q.rich || bodyH(q.text), !!q.rich));
        /* 3 — كود LaTeX للسؤال */
        h += sec(3, 'كود LaTeX للسؤال', '<textarea data-ef="text">' + esc(q.text || '') + '</textarea>');
        /* 4 — الخيارات */
        if (it.t === 'm') h += sec(4, 'الخيارات — اضغط الحرف لتحديد الإجابة الصحيحة',
            '<div class="xp-egrid">' + [0, 1, 2, 3].map(j =>
                '<div class="xp-eopt"><button type="button" class="xp-elt' + (ans === j ? ' on' : '') + '" data-elt="' + j + '">' + LT[j] + '</button>' +
                '<input data-ef="opt' + j + '" value="' + esc(opts[j] || '') + '" placeholder="خيار ' + LT[j] + '"/></div>').join('') +
            '</div>');
        /* 5 — الرسم / الصورة */
        h += sec(5, 'الرسم / الصورة', '<div class="xp-efig">' + figPrev(it.fig) + '</div>' +
            '<div class="xp-eact"><button class="upl" data-eact="upload" data-i="' + i + '" type="button">رفع صورة/SVG</button>' +
            '<button class="del" data-eact="delfig" data-i="' + i + '" type="button">حذف الرسم</button></div>');
        /* 6 — الحل كما يراه الطالب */
        h += sec(6, 'الحل كما يراه الطالب', richBlk('sol', q.solRich || bodyH(q.sol), !!q.solRich));
        /* 7 — كود الحل */
        h += sec(7, 'كود الحل', '<textarea data-ef="sol">' + esc(q.sol || '') + '</textarea>');
        /* أزرار الحفظ والإلغاء */
        h += '<div class="xp-eact xp-eact-end"><button class="cancel" data-eact="cancel" data-i="' + i + '" type="button">إلغاء</button>' +
            '<button class="save" data-eact="save" data-i="' + i + '" type="button">حفظ في البنك</button></div>';
        return h + '</div>';
    }

    function page(ex, o) {
        o = o || {};
        const m = ex.meta || {};
        const pg = document.createElement('div');
        pg.className = 'xw-pg' + (o.frame ? ' xp-frame' : '');
        const cell = (l, v) => '<span><i>' + l + '</i><b>' + esc(v || '—') + '</b></span>';
        let h = o.nohd ? '' : '<div class="xp-hd">' + cell('Ch', m.ch) + cell('Sec', m.sec) + cell('Lesson No.', m.lessonNo) + cell('Lesson Title', m.title) + cell('Test Kind', KD[m.kind] || m.kind) + '<span><i>⏱</i><b class="tm">' + fmt((ex.dur || 0) * 60) + '</b></span></div>';
        const np = nowParts();
        const titleTx = esc(m.title || (m.ch ? 'Chapter ' + m.ch : '') || 'اختبار');
        h += '<div class="xp-thd" data-thd="1"><span class="nm">' + esc(o.name || '') + '</span>' + (o.name ? '<span class="sep">·</span>' : '') + '<span class="ti">' + titleTx + '</span><span class="sep">·</span><span class="dt">' + np.dt + '</span><span class="sep">·</span><span class="tm" data-clock="1">' + np.tm + '</span></div>';
        let n = 0;
        (ex.items || []).forEach((it, i) => {
            n++;
            const editBtn = (o.editPerQ && it.q && it.q.id) ? '<button class="xp-qed" data-qe="edit" data-i="' + i + '" title="تعديل هذا السؤال">✎</button>' : '';
            const row = '<div class="xp-r"><div class="xp-t"><img src="' + it.img + '"/></div>' + (it.fig ? '<div class="xp-f"><img src="' + it.fig + '"/></div>' : '') + '</div>';
            const edrop = (o.editing === i && it.q) ? editorBox(it, i) : '';
            if (it.t === 'm') h += '<div class="xp-q" data-i="' + i + '"><div class="xp-n">السؤال ' + n + ' — اختياري' + editBtn + '</div>' + row + '<div class="xp-o">' + it.o.map((src, j) => '<label class="' + (o.key && o.key[i] === j ? 'ok' : '') + '"><b>' + LT[j] + '</b><img src="' + src + '"/><input type="radio" name="xq' + i + '" value="' + j + '"' + (o.ro ? ' disabled' : '') + '/></label>').join('') + '</div>' + edrop + '</div>';
            else h += '<div class="xp-q xp-e" data-i="' + i + '"><div class="xp-n">السؤال ' + n + ' — مقالي (اكتب الحل وأرفق صورة إن لزم)' + editBtn + '</div>' + row + '<textarea placeholder="اكتب إجابتك هنا…"' + (o.ro ? ' disabled' : '') + '></textarea><div class="xp-e-row"><label class="xp-e-up"' + (o.ro ? ' style="opacity:.5;pointer-events:none"' : '') + '>📎 صورة<input type="file" accept="image/*" data-eimg="' + i + '"' + (o.ro ? ' disabled' : '') + '/></label><div class="xp-e-prev" data-prev="' + i + '"><img/><button class="rm" type="button" title="حذف الصورة">×</button></div></div>' + edrop + '</div>';
        });
        pg.innerHTML = h;
        return pg;
    }

    function compressImg(file, maxW) {
        return new Promise(res => {
            const r = new FileReader();
            r.onload = () => {
                const im = new Image();
                im.onload = () => {
                    const w = Math.min(maxW || 800, im.naturalWidth), k = w / im.naturalWidth;
                    const c = document.createElement('canvas');
                    c.width = w; c.height = Math.round(im.naturalHeight * k);
                    const x = c.getContext('2d');
                    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
                    x.drawImage(im, 0, 0, c.width, c.height);
                    res(c.toDataURL('image/jpeg', 0.82));
                };
                im.onerror = () => res('');
                im.src = r.result;
            };
            r.onerror = () => res('');
            r.readAsDataURL(file);
        });
    }
    function collect(pg, ex) {
        const m = [], out = { m: m, e: '', img: '' };
        (ex.items || []).forEach((it, i) => {
            if (it.t === 'm') { const c = pg.querySelector('input[name="xq' + i + '"]:checked'); m.push(c ? +c.value : -1); }
            else {
                out.e = (pg.querySelector('textarea').value || '').slice(0, 5000);
                const pv = pg.querySelector('[data-prev="' + i + '"]');
                const fi = pg.querySelector('input[data-eimg="' + i + '"]'); if (pv && pv.classList.contains('on')) { const im = pv.querySelector('img'); if (im && im.src) out.img = im.src; } if (!out.img && fi && fi._d) out.img = fi._d;
            }
        });
        return out;
    }
    function wireImg(pg) {
        pg.querySelectorAll('input[data-eimg]').forEach(inp => {
            inp.addEventListener('change', async e => {
                const f = e.target.files[0]; if (!f) return;
                const data = await compressImg(f, 800); inp._d = data || '';   /* [ST2] نحتفظ بالصورة المضغوطة لإرسالها */
                if (!data) { let er = pg.querySelector('.xw-imgerr'); if (!er) { er = document.createElement('div'); er.className = 'xw-imgerr'; er.style.cssText = 'color:#fca5a5;font:700 12px Cairo,system-ui,sans-serif;margin:4px 0'; inp.parentNode.appendChild(er); } er.textContent = '⚠ تعذّر قراءة الصورة — استخدم صورة JPG أو PNG'; inp.value = ''; return; }
                const pv = pg.querySelector('[data-prev="' + inp.dataset.eimg + '"]');
                if (pv && data) {
                    pv.querySelector('img').src = data;
                    pv.classList.add('on');
                    pv.querySelector('.rm').onclick = () => { pv.classList.remove('on'); pv.querySelector('img').src = ''; inp.value = ''; };
                }
            });
        });
    }
    function wireClock(pg) {
        const ck = pg.querySelector('[data-clock]'); if (!ck) return null;
        return setInterval(() => { const np = nowParts(); ck.textContent = np.tm; }, 1000);
    }

    /* ═════════════════════════════════════════════════════════════════
       جهة الطالب
       ═════════════════════════════════════════════════════════════════ */
    let sBtn = null, sWin = null, sTimer = 0;
    /* [X2] بوّابة الزر: يُحفظ الاختبار الوارد معلّقًا ويُضاء زر «اختبار» فقط؛ لا تظهر رسالة/زر البدء إلا بعد ضغط الطالب عليه */
    let pend = null, opened = false;
    function gate() {
        const b = document.getElementById('examBtn'), bg = document.getElementById('examBadge'); if (!b) return;
        let done = false; try { done = !!(pend && localStorage.getItem('mc_exam_' + pend.id)); } catch (e) { }
        let mine = true; try { const me = window.__stuMe && window.__stuMe(); if (pend && pend.to && me && !pend.to[me.id]) mine = false; } catch (e) { }
        const has = !!(pend && pend.items && pend.id && !done && mine);
        if (bg) bg.style.display = has ? '' : 'none';
        b.style.borderColor = has ? '#f59e0b' : 'rgba(255,255,255,.25)'; b.style.color = has ? '#fde68a' : '#cbd5e1';
        if (!b._w) { b._w = 1; b.addEventListener('click', () => { if (!pend || !pend.items) { const t = document.createElement('div'); t.textContent = 'لا يوجد اختبار الآن'; t.style.cssText = 'position:fixed;top:calc((var(--tbh,40px) - 26px) / 2);left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:3px 14px;border-radius:999px;z-index:2147483000;font:700 13px sans-serif'; document.body.appendChild(t); setTimeout(() => t.remove(), 1800); return; } opened = true; window.MCExamStudent(pend); }); }
    }
    window.MCExamStudent = function (v) {
        css();
        if (sBtn) { sBtn.remove(); sBtn = null; }
        if (!v || !v.items || !v.id) { pend = null; opened = false; gate(); }
        else { pend = v; gate(); }   /* [ST1] لا زر «اختبار»: يظهر زر البدء في الشريط العلوي مباشرة */
        if (!v || !v.items || !v.id) { if (sWin && !sWin.done) { sWin.close(); sWin = null; clearInterval(sTimer); } return; }
        let done = false; try { done = !!localStorage.getItem('mc_exam_' + v.id); } catch (e) { }
        if (done || sWin) return;
        try { const me = window.__stuMe && window.__stuMe(); if (v.to && me && !v.to[me.id]) return; } catch (e) { }
        sBtn = document.createElement('button'); sBtn.className = 'xs-btn'; sBtn.textContent = '📝 تحميل الاختبار وبدء الحل — ' + v.dur + ' دقيقة';
        sBtn.onclick = () => { sBtn.remove(); sBtn = null; start(v); };
        (document.querySelector('.top-bar') || document.body).appendChild(sBtn);   /* [ST1] داخل الشريط العلوي */
    };
    function start(v) {
        const w = win({ title: 'اختبار — ' + v.dur + ' دقيقة', side: false, w: Math.min(innerWidth - 20, 820), h: Math.min(innerHeight - 20, 900) });
        const me = window.__stuMe ? window.__stuMe() : { id: 'x', name: '' };
        const pg = page(v, { nohd: true, frame: true, name: me.name || '' });
        w.ex.innerHTML = '<div class="xw-cells"><span><i>⏱</i><b class="tm">' + fmt((v.dur || 0) * 60) + '</b></span></div>';   /* [ST1] مواصفات الاختبار لا تظهر للطالب: المؤقت فقط */
        const tm = w.ex.querySelector('.tm');
        const sub = document.createElement('button');
        sub.className = 'xw-b';
        sub.textContent = 'إنهاء وإرسال';
        w.el.querySelector('.xw-bar').insertBefore(sub, w.el.querySelector('.xw-x'));
        w.set(pg);
        wireImg(pg); const ck = wireClock(pg);
        sWin = w;
        const t0 = Date.now();   /* [E1] وقت بدء الحل: يُرسل مع الإجابة (st) فيظهر الزمن المستغرق عند المعلم */
        let left = v.dur * 60, sent = false, arm = 0;
        const send = async () => {
            if (sent) return; sent = true; clearInterval(sTimer); if (ck) clearInterval(ck);
            const a = collect(pg, v);
            pg.querySelectorAll('input,textarea').forEach(x => x.disabled = true);
            try {
                await window.__stuRef('examSub/' + v.id + '/' + me.id).set({ id: me.id, name: me.name || '', phone: me.phone || '', m: a.m, e: a.e, img: a.img || '', st: t0, ts: Date.now() });
                try { localStorage.setItem('mc_exam_' + v.id, '1'); } catch (e) { }
                sub.textContent = 'تم الإرسال ✓'; sub.disabled = true; w.done = true;
                setTimeout(() => { w.close(); sWin = null; }, 1800);
            } catch (e) { sent = false; sub.textContent = 'تعذّر الإرسال — أعد المحاولة'; sub.disabled = false; }
        };
        sub.onclick = () => { if (!arm) { arm = 1; sub.textContent = 'تأكيد الإرسال'; setTimeout(() => { if (!sent) { arm = 0; sub.textContent = 'إنهاء وإرسال'; } }, 3000); return; } send(); };
        let wn = null;
        sTimer = setInterval(() => {
            left--; tm.textContent = fmt(left);
            if (left <= 30 && left > 0 && !sent) { if (!wn) { wn = document.createElement('div'); wn.className = 'xw-warn'; w.el.appendChild(wn); } wn.innerHTML = '<b>' + fmt(left) + '</b><i>⏳ باقي من الوقت</i><small>سيُغلق الاختبار ويُرسَل تلقائيًا</small>'; }
            if (left <= 0) { if (wn) wn.remove(); send(); }
        }, 1000);
    }

    window.MCExamView = {
        cells: cells, win: win, page: page, collect: collect, ico: ICO,
        fmt: fmt, wireImg: wireImg, wireClock: wireClock,
        nowParts: nowParts, compressImg: compressImg
    };
})();