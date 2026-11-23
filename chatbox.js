/* ════════════════════════════════════════════════════════════════════ *
 *  chatbox.js — صندوق الرسائل العائم (نسخة محسنة ومصححة)             *
 * ════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';
    const CB = window.ChatBox = {};
    const MAXFILE = 2.5 * 1024 * 1024, MAXVOICE = 120;
    let cfg = null, role = 'a', win = null, ui = {}, cur = null, shown = false, collapsed = false;
    const msgs = {}, attached = {}, seen = {}, unread = {}, ack = {}, got = {};
    const t0 = Date.now();
    let actx = null, rec = null, recTick = null, recStart = 0, lastSend = 0;

    const CSS = `
#cbx{position:fixed;z-index:99990;display:none;flex-direction:column;background:#0b1424;border:1px solid #5c1a1a;border-radius:16px;box-shadow:0 18px 60px rgba(0,0,0,.6),0 0 0 1px rgba(56,189,248,.08);color:#e2e8f0;font-family:inherit;direction:rtl;overflow:hidden;min-width:200px;min-height:230px;width:200px;height:333px;user-select:none;-webkit-user-select:none;pointer-events:auto;}
#cbx.show{display:flex}
#cbx.col{height:auto!important;min-height:0}
#cbx.col .cb-body,#cbx.col .cb-chips,#cbx.col .cb-grip{display:none}
#cbx *{box-sizing:border-box}
.cb-head{display:flex;align-items:center;gap:8px;padding:2px 10px;min-height:26px;background:linear-gradient(135deg,#4a0808,#7f1d1d);color:#fee2e2;cursor:grab;touch-action:none;flex-shrink:0;border-bottom:2px solid #ea580c;}
.cb-head:active{cursor:grabbing}
.cb-av{width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.cb-av svg{width:11px;height:11px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.cb-ti{flex:1;min-width:0;display:flex;flex-direction:row;align-items:center;gap:10px;white-space:nowrap;overflow:hidden;}
.cb-ti b{font-size:11.5px;color:#fff;text-shadow:0 1px 2px #000;overflow:hidden;text-overflow:ellipsis;}
.cb-ti small{font-size:12px;color:#fca5a5;display:none;} 
.cb-hb{background:transparent;border:0;color:#fca5a5;border-radius:5px;padding:0 5px;height:20px;cursor:pointer;font-family:inherit;font-size:11px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .2s}.cb-btns{display:flex;align-items:center;gap:0;flex-shrink:0}
.cb-hb:hover{background:rgba(255,255,255,.14);color:#fff}
.cb-hb.danger:hover{background:#ef4444;}
.cb-hb svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.cb-chips{display:flex;gap:6px;padding:8px 10px;overflow-x:auto;background:#091020;border-bottom:1px solid #1a2d4d;flex-shrink:0;scrollbar-width:thin;scrollbar-color:#24406a transparent}
.cb-chip{flex-shrink:0;display:inline-flex;align-items:center;gap:5px;background:#12213a;border:1px solid #1f3a63;color:#cbd5e1;border-radius:14px;padding:5px 12px;font-size:13px;cursor:pointer;font-family:inherit;transition:.2s;}
.cb-chip:hover{background:#1a2d4d;}
.cb-chip.on{background:#c2410c;border-color:#ea580c;color:#fff7ed}.cb-chip i{width:8px;height:8px;border-radius:50%;background:#475569}.cb-chip i.on{background:#22c55e}
.cb-chip em{font-style:normal;background:#38bdf8;color:#06202e;border-radius:9px;padding:0 6px;font-size:11px;font-weight:800}
.cb-body{flex:1;min-height:0;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:10px;background:radial-gradient(circle at 20% 0,#0f1c33,#0a111f 60%);user-select:text;-webkit-user-select:text}
.cb-empty{margin:auto;text-align:center;color:#64748b;font-size:13.5px;line-height:1.9;padding:20px}.cb-empty svg{width:48px;height:48px;fill:none;stroke:#334e7a;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;margin-bottom:8px}
.cb-m{max-width:85%;width:fit-content;padding:5px 10px 3px;border-radius:12px;font-size:14px;line-height:1.45;word-break:break-word;display:flex;flex-direction:column;gap:3px;position:relative}
.cb-dl2{background:none;border:0;color:inherit;opacity:.55;cursor:pointer;font:inherit;font-size:11px;padding:0 4px}.cb-dl2:hover{opacity:1}.cb-dl2.arm{color:#ef4444;opacity:1;font-weight:700}
.cb-ed{background:none;border:none;color:inherit;opacity:.7;cursor:pointer;font:inherit;font-size:11px;padding:0 4px}.cb-ed:hover{opacity:1;text-decoration:underline}.cb-ted{font-size:10px;opacity:.7}
.cb-m.me{align-self:flex-start;background:#7f1d1d;color:#ffe4e4;border-top-right-radius:4px}
.cb-m.ot{align-self:flex-end;background:#14532d;color:#dcfce7;border-top-left-radius:4px}
.cb-m.all{border:1px dashed rgba(251,191,36,.55)}
.cb-tag{font-size:11px;color:#fbbf24;font-weight:700}
.cb-tx{white-space:pre-wrap}
.cb-ts{font-size:10.5px;opacity:.6;align-self:flex-end}
.cb-img{max-width:100%;max-height:250px;border-radius:9px;cursor:zoom-in;display:block;background:#000}
.cb-file{display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.25);border-radius:10px;padding:8px 10px}
.cb-fi{width:38px;height:42px;border-radius:7px;background:#c2410c;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.cb-fn{flex:1;min-width:0;font-size:13px}.cb-fn b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}.cb-fn small{opacity:.6;font-size:11px}
.cb-act{display:flex;gap:6px;flex-wrap:wrap}
.cb-a{background:rgba(255,255,255,.12);border:0;color:#fff;border-radius:7px;padding:5px 12px;font-size:12px;cursor:pointer;text-decoration:none;font-family:inherit;display:inline-flex;align-items:center;gap:5px;transition:.2s;}
.cb-a:hover{background:rgba(255,255,255,.25)}.cb-a svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.cb-au{width:100%;min-width:230px;height:38px;filter:invert(.9) hue-rotate(160deg)}
.cb-comp{display:flex;align-items:flex-end;gap:8px;padding:10px;background:#091020;border-top:1px solid #1a2d4d;flex-shrink:0}
.cb-ib{width:40px;height:40px;border-radius:50%;border:0;background:#13294a;color:#7dd3fc;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.2s;}
.cb-ib:hover{background:#1b3c6e;transform:scale(1.05);}
.cb-ib#cbAttach{background:#1e3a8a;color:#93c5fd;}
.cb-ib#cbMic{background:#7c2d12;color:#fdba74;}
.cb-ib.send{background:#16a34a;color:#fff;}
.cb-ib.send:hover{background:#15803d;}
.cb-ib.rec{background:#dc2626;color:#fff;animation:cbPulse 1s infinite;}
@keyframes cbPulse{50%{box-shadow:0 0 0 6px rgba(239,68,68,.3)}}
.cb-ib svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.cb-ta{flex:1;min-width:0;resize:none;border:1px solid #1f3a63;background:#060d18;color:#e8eef8;border-radius:20px;padding:10px 14px;font-family:inherit;font-size:14px;line-height:1.5;max-height:120px;height:40px;outline:none;overflow-y:auto;scrollbar-width:none;user-select:text;-webkit-user-select:text;transition:.2s;}
.cb-ta:focus{border-color:#ea580c;box-shadow:0 0 0 2px rgba(234,88,12,.2);}
.cb-recbar{flex:1;display:none;align-items:center;gap:8px;color:#fca5a5;font-size:14px;min-width:0}
.cb-comp.recing .cb-ta,.cb-comp.recing #cbAttach{display:none}.cb-comp.recing .cb-recbar{display:flex}
.cb-dot{width:10px;height:10px;border-radius:50%;background:#ef4444;animation:cbPulse 1s infinite}
.cb-cancel{background:transparent;border:0;color:#94a3b8;cursor:pointer;font-family:inherit;font-size:13px;margin-inline-start:auto;transition:.2s;}
.cb-cancel:hover{color:#fff;}
.cb-grip{position:absolute;right:0;bottom:0;width:28px;height:28px;cursor:nwse-resize;touch-action:none;opacity:.8;z-index:10}
.cb-grip:before{content:"";position:absolute;right:6px;bottom:6px;width:12px;height:12px;border-right:2px solid #5a7bb0;border-bottom:2px solid #5a7bb0;border-radius:0 0 3px 0}
#cbLight{position:fixed;inset:0;z-index:99995;background:rgba(2,6,14,.92);display:none;flex-direction:column;align-items:center;justify-content:center;gap:10px;direction:rtl}
#cbLight.show{display:flex}
#cbLight .lw{flex:1;min-height:0;width:100%;overflow:auto;display:flex;touch-action:pan-x pan-y pinch-zoom}
#cbLight img{margin:auto;max-width:96vw;max-height:84vh;cursor:zoom-in;display:block}
#cbLight.z img{max-width:none;max-height:none;width:200%;cursor:zoom-out}
#cbLight .lb{display:flex;gap:10px;padding-bottom:12px}
.cb-err{background:#7f1d1d;color:#fee2e2;font-size:12px;line-height:1.6;padding:8px 12px;flex-shrink:0;display:none}.cb-err.on{display:block}
.cb-badge{position:absolute;top:-5px;inset-inline-end:-5px;min-width:18px;height:18px;border-radius:9px;background:#ef4444;color:#fff;font-size:11px;font-weight:800;line-height:18px;text-align:center;padding:0 5px;pointer-events:none;display:none}
.cb-badge.on{display:block;animation:cbPulse 1.4s 3}
.stu-row .eb-msg.hasf{color:#fbbf24;filter:drop-shadow(0 0 3px rgba(251,191,36,.8))}
.cb-m.ex{align-self:stretch;max-width:100%;background:#1e3a8a;color:#dbeafe;border:1px solid #3b82f6}
.cb-m.hwm{border:1px solid rgba(251,191,36,.55)}
.cb-hwt{font-size:11px;color:#fbbf24;font-weight:700}
`;
    /* [M6] أنماط الشريط الجانبي لملفات الطالب + مقبض تغيير الحجم الأيسر */
    const CSS2 = '.cb-hb.sd{gap:3px;font-weight:700;padding:0 6px}.cb-hb.sd b{background:#f59e0b;color:#1a1405;border-radius:8px;padding:0 5px;font-size:10px;line-height:14px;min-width:14px;text-align:center}.cb-hb.sd.on{background:rgba(255,255,255,.22);color:#fff}.cb-hb.sd.z{opacity:.55}' +
        '#cbSide{position:fixed;z-index:99989;display:none;flex-direction:column;width:250px;min-height:200px;background:#0b1424;border:1px solid #5c1a1a;border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.6);direction:rtl;overflow:hidden;color:#e2e8f0;font-family:inherit}#cbSide.show{display:flex}#cbSide *{box-sizing:border-box}' +
        '#cbSide .sd-h{padding:5px 10px;min-height:26px;background:linear-gradient(135deg,#4a0808,#7f1d1d);color:#fee2e2;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #ea580c;flex-shrink:0}#cbSide .sd-h button{background:none;border:0;color:#fca5a5;font-size:16px;cursor:pointer;line-height:1}' +
        '#cbSide .sd-b{flex:1;min-height:0;overflow:auto;padding:8px;display:flex;flex-direction:column;gap:8px}#cbSide .sd-e{margin:auto;color:#64748b;font-size:12px;text-align:center;padding:16px}' +
        '#cbSide .sd-i{border:1px solid rgba(255,255,255,.13);border-radius:10px;padding:6px;background:#111b30}#cbSide .sd-i img{display:block;width:100%;max-height:130px;object-fit:cover;border-radius:6px;cursor:zoom-in;margin-bottom:5px}' +
        '#cbSide .sd-t{display:flex;align-items:center;gap:6px;font-size:11px;color:#cbd5e1;margin-bottom:5px}#cbSide .sd-x{flex:0 0 34px;height:34px;border-radius:6px;background:#1e293b;color:#7dd3fc;font:800 10px system-ui;display:flex;align-items:center;justify-content:center}#cbSide .sd-n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}#cbSide .sd-n small{display:block;color:#64748b;font-weight:400}' +
        '#cbSide .sd-a{display:flex;flex-wrap:wrap;gap:4px}#cbSide .sd-a>*{flex:1 1 auto;border:1px solid rgba(255,255,255,.18);background:#1e293b;color:#e2e8f0;border-radius:6px;padding:4px 7px;font:700 11px inherit;font-family:inherit;cursor:pointer;text-decoration:none;text-align:center}#cbSide .sd-a>*:hover{background:#7f1d1d;border-color:#ef4444}' +
        '#cbSide svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}#cbSide .sd-a>*{display:inline-flex;align-items:center;justify-content:center;gap:4px}.cb-hb.sd{font-size:10px;padding:0 4px}.cb-ti{min-width:0}' +
        '.cb-gripL{right:auto!important;left:0;cursor:nesw-resize!important}' +
        '.cb-ed{position:absolute;z-index:9;touch-action:none;display:block}.cb-ed:hover{background:rgba(255,255,255,.14)}.cb-ed-e{right:0;top:30px;bottom:30px;width:10px;cursor:ew-resize}.cb-ed-w{left:0;top:30px;bottom:30px;width:10px;cursor:ew-resize}.cb-ed-s{left:30px;right:30px;bottom:0;height:9px;cursor:ns-resize}#cbx.col .cb-ed,#cbx.col .cb-gripL{display:none}' +
        '.cb-split{flex:1;min-height:0;display:flex;flex-direction:row}.cb-mn{flex:1;min-width:0;display:flex;flex-direction:column;position:relative}#cbx.col .cb-split{display:none}' +
        '.cb-fp{width:214px;flex:0 0 214px;display:flex;flex-direction:column;background:#0a1220;border-left:1px solid #5c1a1a;min-height:0}#cbx.nofp .cb-fp{display:none}' +
        '.fp-tabs{display:flex;gap:2px;padding:4px 6px 0;flex-shrink:0;background:#0a1220}.fp-tabs button{flex:1;border:1px solid transparent;border-bottom:0;border-radius:6px 6px 0 0;background:transparent;color:#7f90aa;font:600 11px inherit;font-family:inherit;padding:3px 2px;cursor:pointer;line-height:1.3}.fp-tabs button.on{background:#0e182b;color:#e2e8f0;border-color:rgba(148,163,184,.28)}.fp-tabs b{background:rgba(148,163,184,.18);color:#cbd5e1;border-radius:7px;padding:0 5px;font-size:10px;font-weight:600;margin-right:2px}' +
        '.fp-list{flex:1;min-height:0;overflow:auto;padding:6px;display:flex;flex-direction:column;gap:3px;background:#0e182b;border-top:1px solid rgba(148,163,184,.22)}.fp-e{margin:auto;color:#64748b;font-size:12px;text-align:center;padding:14px}' +
        '.fp-i{display:flex;gap:8px;align-items:center;padding:5px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:#111b30;cursor:pointer}.fp-i:hover{border-color:#ea580c}.fp-i.on{background:#3b0d0d;border-color:#ef4444}' +
        '.fp-th{flex:0 0 40px;height:40px;border-radius:6px;overflow:hidden;background:#1e293b;color:#7dd3fc;font:800 10px system-ui;display:flex;align-items:center;justify-content:center;font-size:16px}.fp-th img{width:100%;height:100%;object-fit:cover}' +
        '.fp-n{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.fp-n b{font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e2e8f0}.fp-n small{font-size:10px;color:#94a3b8;line-height:1.3}' +
        '.fp-act{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:6px;border-top:1px solid #24324d;background:#0a1220;flex-shrink:0}.fp-act button{display:inline-flex;align-items:center;justify-content:center;gap:4px;border:1px solid rgba(255,255,255,.16);background:#1e293b;color:#e2e8f0;border-radius:7px;padding:6px 2px;font:700 11px inherit;font-family:inherit;cursor:pointer}.fp-act button:hover:not(:disabled){background:#7f1d1d;border-color:#ef4444}.fp-act button:disabled{opacity:.35;cursor:default}.fp-act .w2{grid-column:1/3}' +
        '.fp-act svg,.cb-vw svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}' +
        '.cb-vw{position:absolute;inset:0;z-index:7;display:none;flex-direction:column;background:#060b15}.cb-vw.show{display:flex}.vw-h{display:flex;align-items:center;gap:10px;padding:6px 10px;background:#13213a;border-bottom:2px solid #7f1d1d;flex-shrink:0}.vw-h button{border:1px solid rgba(255,255,255,.2);background:#1e293b;color:#e2e8f0;border-radius:7px;padding:4px 10px;font:700 11px inherit;font-family:inherit;cursor:pointer}.vw-h b{flex:1;min-width:0;font-size:12px;color:#cbd5e1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '.vw-c{flex:1;min-height:0;overflow:auto;display:flex;align-items:center;justify-content:center}.vw-c img{max-width:100%;max-height:100%;object-fit:contain;cursor:zoom-in}.vw-c.z{display:block}.vw-c.z img{max-width:none;max-height:none;cursor:zoom-out}.vw-c iframe{width:100%;height:100%;border:0;background:#fff}.vw-i{text-align:center;color:#cbd5e1;font-size:13px;display:flex;flex-direction:column;gap:10px;align-items:center}.vw-big{font-size:46px;font-weight:800;color:#7dd3fc}' +
        '#cbx.exm .cb-fp{width:262px;flex-basis:262px}.cb-fp.exm .fp-act{display:none}.cb-fp.exm .fp-i{cursor:pointer}' +
        '.fp-tabs .fp-x{flex:0 0 22px;background:transparent;color:#8a9bb5;padding:0;font-size:11px;border-color:transparent}.fp-tabs .fp-x:hover{background:rgba(239,68,68,.25);color:#fff}' +
        '.fp-i.fp-ex{display:block;padding:2px 2px 4px;border:0;border-bottom:1px solid rgba(148,163,184,.1);background:transparent;border-radius:0}.fp-i.fp-ex:hover,.fp-i.fp-ex.on{background:rgba(148,163,184,.07)}.fx-g{display:grid;grid-template-columns:54px 42px 62px 68px;justify-content:start;gap:4px;direction:ltr}.fx-c{min-width:0;text-align:center}.fx-c i{display:block;font:normal 600 11px "Caveat","Aref Ruqaa","Segoe Print",cursive;color:#64748b;line-height:1;margin-bottom:1px}.fx-c b{display:flex;align-items:center;justify-content:center;gap:3px;height:19px;padding:0 4px;border-radius:5px;background:transparent;border:1px solid rgba(148,163,184,.28);color:#cbd5e1;font:600 11px "Caveat","Aref Ruqaa",system-ui,sans-serif;white-space:nowrap;overflow:hidden}.fx-s{font:500 8px Cairo,system-ui;opacity:.7}' +
        '.fx-c b.g-r{color:#f87171;border-color:rgba(248,113,113,.4)}.fx-c b.g-o{color:#fb923c;border-color:rgba(251,146,60,.4)}.fx-c b.g-g{color:#4ade80;border-color:rgba(74,222,128,.4)}' +
        '.fp-list,.cb-body{scrollbar-width:auto}.fp-list::-webkit-scrollbar,.cb-body::-webkit-scrollbar{width:7px}.fp-list::-webkit-scrollbar-track,.cb-body::-webkit-scrollbar-track{background:#0a1220}.fp-list::-webkit-scrollbar-thumb,.cb-body::-webkit-scrollbar-thumb{background:#5a7bb0;border-radius:4px}' +
        '.fp-list::-webkit-scrollbar-button:single-button,.cb-body::-webkit-scrollbar-button:single-button{display:block;height:10px;width:7px;background-color:#16233b;background-repeat:no-repeat;background-position:center;background-size:7px 7px}' +
        '.fp-list::-webkit-scrollbar-button:vertical:decrement,.cb-body::-webkit-scrollbar-button:vertical:decrement{background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 8 8%27%3E%3Cpath d=%27M4 1.5 7.5 6.5h-7z%27 fill=%27%23cbd5e1%27/%3E%3C/svg%3E")}' +
        '.fp-list::-webkit-scrollbar-button:vertical:increment,.cb-body::-webkit-scrollbar-button:vertical:increment{background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 8 8%27%3E%3Cpath d=%27M4 6.5 .5 1.5h7z%27 fill=%27%23cbd5e1%27/%3E%3C/svg%3E")}' +
        '#cbToast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:2147483000;background:#7f1d1d;color:#fff;padding:8px 16px;border-radius:18px;font:700 13px system-ui,Cairo,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.5);max-width:80vw;direction:rtl}';
    const IC = {
        fix: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
        chat: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        clip: '<svg viewBox="0 0 24 24"><path d="M21.4 11.6 12.2 20.8a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/></svg>',
        mic: '<svg viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>',
        stop: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>',
        send: '<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
        down: '<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>',
        close: '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        dl: '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        open: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
    };

    let work = null;   /* [SB6] نافذة المشتركين التي انتقل إليها الجزء الأيمن (ملفات الطالب) */
    const $ = s => win.querySelector(s) || (work && work.querySelector(s));
    const esc = s => { const d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; };
    const fmt = ts => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    const fsize = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
    const fail = e => { if (!ui.err) return; const c = (e && (e.code || '')) + ' ' + ((e && e.message) || ''); let u = ''; try { u = cfg.diag ? cfg.diag() : ''; } catch (x) {} ui.err.textContent = 'تعذّر الوصول للرسائل — ' + c.trim() + (u ? ' | ' + u : ''); ui.err.classList.add('on'); ui.err.style.userSelect = 'text'; };
    const say = m => {
        let ok = false; try { if (cfg.say) { cfg.say(m); ok = true; } } catch (e) {}
        try { let t = document.getElementById('cbToast'); if (!t) { t = document.createElement('div'); t.id = 'cbToast'; document.body.appendChild(t); } t.textContent = m; t.style.display = 'block'; clearTimeout(t._h); t._h = setTimeout(() => { t.style.display = 'none'; }, 3200); } catch (e) {}
    };


    /* [SL1] الشريط الأيسر (بحث بالاسم + بالكود + قائمة الطلاب) وحيّز التصحيح داخل النافذة */
    const CSS3 =
        '.cb-sl{width:176px;flex:0 0 176px;display:flex;flex-direction:column;background:#0a1220;border-right:1px solid #5c1a1a;min-height:0}#cbx:not(.sl) .cb-sl{display:none}' +
        '.sl-s{display:flex;gap:4px;padding:6px;flex-shrink:0}.sl-s input{min-width:0;height:24px;border:1px solid rgba(148,163,184,.28);border-radius:6px;background:#0e182b;color:#e2e8f0;font-weight:600;font-size:11px;font-family:inherit;padding:0 6px;outline:0;user-select:text;-webkit-user-select:text}.sl-s input:focus{border-color:#d4af37}#slN{flex:1}#slC{flex:0 0 46px;width:46px;text-align:center}' +
        '.sl-l{flex:1;min-height:0;overflow:auto;padding:0 5px 5px;display:flex;flex-direction:column;gap:2px}.sl-r{display:flex;align-items:center;gap:5px;padding:4px 6px;border-radius:6px;border:1px solid transparent;cursor:pointer;font-weight:600;font-size:11px;font-family:inherit;color:#cbd5e1}.sl-r:hover{background:#111b30}.sl-r.on{background:#16233b;border-color:rgba(212,175,55,.5);color:#fff}.sl-r.off{opacity:.55}' +
        '.sl-r i{flex:0 0 7px;height:7px;border-radius:50%;background:#475569}.sl-r i.on{background:#22c55e}.sl-r b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}.sl-r small{font-size:9px;color:#94a3b8}.sl-r em{background:#dc2626;color:#fff;border-radius:8px;font-weight:700;font-size:9px;font-family:inherit;padding:0 5px;font-style:normal}.sl-r input{margin:0;width:13px;height:13px;accent-color:#16a34a;cursor:pointer}' +
        '.sl-f{display:flex;flex-direction:column;gap:4px;padding:5px 6px;flex-shrink:0}.sl-f div{display:flex;gap:4px}.sl-f>input{flex:none}.sl-f div input{flex:1}.sl-f input{min-width:0;height:24px;border:1px solid rgba(148,163,184,.28);border-radius:6px;background:rgba(0,0,0,.28);color:#e2e8f0;font-size:11px;font-family:inherit;padding:0 6px;outline:0;user-select:text;-webkit-user-select:text}.sl-f div input{width:50%}.sl-r small{background:rgba(0,0,0,.3);border:1px solid rgba(148,163,184,.25);border-radius:5px;padding:1px 5px;direction:ltr;color:#cbd5e1}.sl-p{border:0;background:transparent;cursor:pointer;font-size:11px;padding:0 2px;opacity:.75}.sl-p:hover{opacity:1}.sl-add.dirty{background:#16a34a;color:#fff;border-style:solid}.sl-q{flex-shrink:0;padding:0 5px}.sl-q .q-h{font-size:10px;color:#fbbf24;padding:2px 4px}.sl-q .q-r{display:flex;align-items:center;gap:4px;padding:4px 6px;margin-bottom:3px;border:1px solid rgba(251,191,36,.45);border-radius:6px;background:rgba(251,191,36,.08);color:#fde68a;font-size:11px;font-weight:700}.sl-q .q-r b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sl-q .q-r button{border:1px solid rgba(255,255,255,.25);background:#15803d;color:#fff;border-radius:5px;font-size:10px;font-family:inherit;cursor:pointer;padding:1px 6px}.sl-q .q-r button.x{background:transparent;color:#fca5a5}.sl-e{margin:auto;color:#64748b;font-size:11px;text-align:center;padding:10px}.sl-add{margin:0 6px 6px;height:24px;border:1px dashed rgba(148,163,184,.4);border-radius:6px;background:transparent;color:#94a3b8;font-weight:700;font-size:11px;font-family:inherit;cursor:pointer}.sl-add:hover{color:#fff;border-color:#d4af37}' +
        '.cb-sl,.cb-fp{background:linear-gradient(180deg,#0f3a2a,#082219)!important}.cb-fp .fp-tabs,.cb-fp .fp-list{background:transparent!important}.sl-s input{background:rgba(0,0,0,.28)!important}.sl-r:hover{background:rgba(255,255,255,.07)!important}.sl-r.on{background:rgba(255,255,255,.12)!important}' +
        '#cbx .sl-f,#cbx #slAdd,#cbx .sl-r small,#cbx .sl-r .sl-p,#cbx .sl-r input{display:none!important}.cb-fp.exm{width:262px;flex-basis:262px}#cbGh{display:none;position:absolute;left:0;right:0;top:0;bottom:0;z-index:25;background:#0b1424}#cbx.gr #cbGh{display:block}';

    /* [SB1] شريط تمرير موحّد لكل النوافذ: أنحف، لون مختلف (تركوازي هادئ)، سهمان في أول وآخر الشريط */
    const SBS = ['#cbx *'];
    const ARW = d => 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 8 8%27%3E%3Cpath d=%27' + d + '%27 fill=%27%2399d5dc%27/%3E%3C/svg%3E")';
    const SB_CSS = SBS.map(q =>
        q + '::-webkit-scrollbar{width:9px;height:9px}' + q + '::-webkit-scrollbar-track{background:#08101d}' +
        q + '::-webkit-scrollbar-thumb{background:#2f7f8a;border-radius:3px}' + q + '::-webkit-scrollbar-thumb:hover{background:#43a3b0}' +
        q + '::-webkit-scrollbar-button:single-button{display:block;height:11px;width:11px;background-color:#0e1c2c;background-repeat:no-repeat;background-position:center;background-size:6px 6px}' +
        q + '::-webkit-scrollbar-button:vertical:start:increment,' + q + '::-webkit-scrollbar-button:vertical:end:decrement,' + q + '::-webkit-scrollbar-button:horizontal:start:increment,' + q + '::-webkit-scrollbar-button:horizontal:end:decrement{display:none}' +
        q + '::-webkit-scrollbar-button:vertical:decrement{background-image:' + ARW('M4 1.5 7.5 6.5h-7z') + '}' +
        q + '::-webkit-scrollbar-button:vertical:increment{background-image:' + ARW('M4 6.5 .5 1.5h7z') + '}' +
        q + '::-webkit-scrollbar-button:horizontal:decrement{background-image:' + ARW('M1.5 4 6.5 .5v7z') + '}' +
        q + '::-webkit-scrollbar-button:horizontal:increment{background-image:' + ARW('M6.5 4 1.5 .5v7z') + '}').join('') +
        '@supports not selector(::-webkit-scrollbar){#cbx *{scrollbar-width:thin;scrollbar-color:#2f7f8a #08101d}}';
    window.__mcSB = SB_CSS;
    const CSS4 =
        '.cb-ed-n{left:30px;right:30px;top:0;height:6px;cursor:ns-resize}.cb-ed-nw,.cb-ed-ne{top:0;width:14px;height:14px;z-index:10}.cb-ed-nw{left:0;cursor:nwse-resize}.cb-ed-ne{right:0;cursor:nesw-resize}#cbx.col .cb-ed-n,#cbx.col .cb-ed-nw,#cbx.col .cb-ed-ne{display:none}' +
        '';
    function build() {
        const st = document.createElement('style'); st.textContent = CSS + CSS2 + CSS3 + CSS4 + SB_CSS + '.cb-sl{order:-1;background:linear-gradient(180deg,#2e1065,#1e0a45)!important;border-right:0!important;border-left:1px solid #5c1a1a!important}.cb-sl .sl-s input{background:rgba(0,0,0,.3)!important}';   /* [CB-DEL3] قائمة الطلاب يمينًا بخلفية بنفسجية داكنة */ document.head.appendChild(st);
        win = document.createElement('div'); win.id = 'cbx';
        win.innerHTML =
            '<div class="cb-head" id="cbHead"><div class="cb-av">' + IC.chat + '</div><div class="cb-ti"><b id="cbTitle"></b><small id="cbSub"></small></div>' +
            '<div class="cb-btns">' + '<button class="cb-hb" id="cbClear" style="display:none" title="مسح المحادثة">مسح</button>' +
            '<button class="cb-hb" id="cbCol" title="تصغير/تكبير">' + IC.down + '</button>' +
            '<button class="cb-hb danger" id="cbClose" title="إغلاق">' + IC.close + '</button></div></div>' +
            '<div class="cb-split">' + '<div class="cb-mn">' +
            '<div class="cb-err" id="cbErr"></div><div class="cb-chips" id="cbChips" style="display:none"></div>' +
            '<div class="cb-body" id="cbBody"></div>' +
            '<div class="cb-comp" id="cbComp">' +
            '<button class="cb-ib" id="cbAttach" title="إرسال ملف أو صورة">' + IC.clip + '</button>' +
            '<textarea class="cb-ta" id="cbTa" rows="1" placeholder="اكتب رسالة…"></textarea>' +
            '<div class="cb-recbar"><span class="cb-dot"></span><span id="cbRt">0:00</span><span>جارٍ التسجيل…</span><button class="cb-cancel" id="cbCancel">إلغاء</button></div>' +
            '<button class="cb-ib" id="cbMic" title="رسالة صوتية">' + IC.mic + '</button>' +
            '<button class="cb-ib send" id="cbSend" title="إرسال">' + IC.send + '</button>' +
            '<input type="file" id="cbFile" style="display:none" accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip">' +
            '</div>' + (role === 't' ? '<div class="cb-vw" id="cbVw"><div class="vw-h"><button id="vwBack">→ رجوع للمحادثة</button><b id="vwT"></b></div><div class="vw-c" id="vwC"></div></div><div id="cbGh"></div>' : '') + '</div>' + (role === 't' ? '<div class="cb-sl" id="cbSl"><div class="sl-s"><input id="slN" placeholder="بحث باسم الطالب" autocomplete="off"><input id="slC" placeholder="كود" autocomplete="off"></div><div class="sl-l" id="slL"></div><div class="sl-f"><input id="sfN" placeholder="اسم الطالب" autocomplete="off"><div><input id="sfC" placeholder="الكود" autocomplete="off"><input id="sfP" placeholder="رقم الواتس" autocomplete="off" inputmode="tel"></div></div><button class="sl-add" id="slAdd" title="يحفظ الاسم والكود والرقم وتفعيل الدخول">💾 حفظ</button></div>' : '') + '</div><div class="cb-grip" id="cbGrip" title="تغيير الحجم"></div><div class="cb-grip cb-gripL" id="cbGripL" title="تغيير الحجم"></div><i class="cb-ed cb-ed-e" data-d="e"></i><i class="cb-ed cb-ed-w" data-d="w"></i><i class="cb-ed cb-ed-s" data-d="s"></i><i class="cb-ed cb-ed-n" data-d="n"></i><i class="cb-ed cb-ed-nw" data-d="nw"></i><i class="cb-ed cb-ed-ne" data-d="ne"></i>';
        document.body.appendChild(win);
        const lb = document.createElement('div'); lb.id = 'cbLight';
        lb.innerHTML = '<div class="lw"><img id="cbLimg" alt=""></div><div class="lb"><a class="cb-a" id="cbLdl">' + IC.dl + ' تحميل</a><button class="cb-a" id="cbLcl">إغلاق</button></div>';
        document.body.appendChild(lb);
        ui = { err: $('#cbErr'), body: $('#cbBody'), chips: $('#cbChips'), ta: $('#cbTa'), title: $('#cbTitle'), sub: $('#cbSub'), comp: $('#cbComp'), light: lb };
        initGeom(); bindDrag(); bindUI(); bindFiles();
    }

    function initGeom() {
        const vw = innerWidth, vh = innerHeight, small = vw < 640;
        let g = null; try { g = JSON.parse(localStorage.getItem('cbx4_' + role) || 'null'); } catch (e) {}
        const w = small ? Math.min(vw - 12, 340) : Math.min((g && g.w) || (role === 's' ? 400 : 600), vw - 20), h = small ? Math.round(vh * .5) : Math.min((g && g.h) || (role === 's' ? 500 : 420), vh - 20);
        const l = small ? Math.round((vw - w) / 2) : Math.max(0, Math.min((g && g.l != null ? g.l : 220), vw - w)), t = small ? vh - h - 64 : Math.max(0, Math.min((g && g.t != null ? g.t : vh - h - 70), vh - 60));
        Object.assign(win.style, { width: w + 'px', height: h + 'px', left: l + 'px', top: t + 'px' });
    }
    function saveGeom() { try { localStorage.setItem('cbx4_' + role, JSON.stringify({ l: win.offsetLeft, t: win.offsetTop, w: win.offsetWidth, h: win.offsetHeight })); } catch (e) {} }
    
    function bindDrag() {
        const head = $('#cbHead');
        head.addEventListener('pointerdown', e => {
            if (e.target.closest('button')) return;
            e.preventDefault(); e.stopPropagation(); 
            const sx = e.clientX, sy = e.clientY, sl = win.offsetLeft, st = win.offsetTop;
            head.setPointerCapture(e.pointerId);
            const mv = ev => { win.style.left = Math.max(-win.offsetWidth + 80, Math.min(innerWidth - 80, sl + ev.clientX - sx)) + 'px'; win.style.top = Math.max(0, Math.min(innerHeight - 40, st + ev.clientY - sy)) + 'px'; };
            const up = () => { head.removeEventListener('pointermove', mv); head.removeEventListener('pointerup', up); saveGeom(); };
            head.addEventListener('pointermove', mv); head.addEventListener('pointerup', up);
        });
        /* [M6.1] مقابض تغيير الحجم من كل الجهات (يمين/يسار/أسفل + الزاويتان): الحافة تتبع المؤشر مباشرة وتُثبَّت left/top/width/height صراحةً */
        const bindRz = (el, dir) => {
            el.addEventListener('pointerdown', e => {
                e.preventDefault(); e.stopPropagation();
                const r = win.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, sl = r.left, sw = r.width, sh = r.height, stp = r.top; win.style.top = stp + 'px';
                win.style.left = sl + 'px'; win.style.right = 'auto';
                el.setPointerCapture(e.pointerId);
                const mv = ev => {
                    const dx = ev.clientX - sx, dy = ev.clientY - sy; let nw = sw, nl = sl, nh = sh;
                    if (dir.indexOf('e') >= 0) nw = Math.max(role === 't' ? 380 : 260, Math.min(innerWidth - sl, sw + dx));
                    if (dir.indexOf('w') >= 0) { nw = Math.max(role === 't' ? 380 : 260, Math.min(sl + sw, sw - dx)); nl = sl + sw - nw; }
                    if (dir.indexOf('s') >= 0) nh = Math.max(180, Math.min(innerHeight - win.offsetTop, sh + dy));
                    if (dir.indexOf('n') >= 0) { nh = Math.max(180, Math.min(stp + sh, sh - dy)); win.style.top = (stp + sh - nh) + 'px'; }
                    win.style.width = nw + 'px'; win.style.left = nl + 'px'; win.style.height = nh + 'px';
                };
                const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); saveGeom(); };
                el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
            });
        };
        bindRz($('#cbGrip'), 'se'); bindRz($('#cbGripL'), 'sw');
        win.querySelectorAll('.cb-ed').forEach(h => bindRz(h, h.dataset.d));
    }

    function bindUI() {
        $('#cbCol').addEventListener('click', () => { collapsed = !collapsed; win.classList.toggle('col', collapsed); });
        $('#cbClose').addEventListener('click', () => { CB.toggle(); }); 
        $('#cbSend').addEventListener('click', sendText);
        ui.ta.addEventListener('keydown', e => { if (e.key !== 'Enter') return; e.preventDefault(); if (e.altKey || e.shiftKey) { const a = ui.ta, s = a.selectionStart, n = a.selectionEnd; a.value = a.value.slice(0, s) + '\n' + a.value.slice(n); a.selectionStart = a.selectionEnd = s + 1; a.dispatchEvent(new Event('input')); } else sendText(); });
        ui.ta.addEventListener('input', () => { ui.ta.style.height = '40px'; ui.ta.style.height = Math.min(120, ui.ta.scrollHeight) + 'px'; });
        $('#cbAttach').addEventListener('click', () => $('#cbFile').click());
        $('#cbFile').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) sendFile(f); });
        $('#cbMic').addEventListener('click', () => rec ? stopRec(true) : startRec());
        $('#cbCancel').addEventListener('click', () => stopRec(false));
        let armed = 0;
        $('#cbClear').addEventListener('click', e => {
            if (!armed) { e.target.textContent = 'تأكيد'; armed = setTimeout(() => { armed = 0; $('#cbClear').textContent = 'مسح'; }, 3000); return; }
            clearTimeout(armed); armed = 0; $('#cbClear').textContent = 'مسح'; clearConv();
        });
        ui.chips.addEventListener('click', e => { const c = e.target.closest('.cb-chip'); if (c) switchTo(c.dataset.k); });
        ui.body.addEventListener('click', e => {
            const im = e.target.closest('img.cb-img'); if (im) return lightbox(im.src, im.dataset.name);
            const fx = e.target.closest('[data-fix]'); if (fx) { const m = find(fx.dataset.fix); if (m && m.file) fixFile(m.file); return; }
            const dl = e.target.closest('[data-del]');   /* [CB-DEL4] حذف رسالة واحدة (بتأكيد) */
            if (dl) { if (!dl.dataset.arm) { dl.dataset.arm = 1; dl.classList.add('arm'); dl.textContent = 'تأكيد؟'; setTimeout(() => { if (dl.isConnected) { delete dl.dataset.arm; dl.classList.remove('arm'); dl.textContent = '🗑 حذف'; } }, 3000); return; }
                const m = find(dl.dataset.del); if (m) { try { cfg.ref(pathOf(m.conv) + '/' + m.k).remove(); } catch (er) { } } return; }
            const ed = e.target.closest('[data-ed]'); if (ed) { const m = find(ed.dataset.ed); if (m) { editKey = ed.dataset.ed; ui.ta.value = m.text || ''; ui.ta.focus(); ui.ta.dispatchEvent(new Event('input')); ui.ta.placeholder = 'تعديل الرسالة… (Enter للحفظ)'; } return; }
            const b = e.target.closest('[data-open]'); if (b) { const m = find(b.dataset.open); if (m && m.file) openFile(m.file); }
        });
        ui.light.addEventListener('click', e => { if (e.target.id === 'cbLimg') ui.light.classList.toggle('z'); else if (e.target === ui.light || e.target.id === 'cbLcl' || e.target.classList.contains('lw')) ui.light.classList.remove('show', 'z'); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') ui.light.classList.remove('show', 'z'); });
    }
    function lightbox(src, name) { const dl = document.getElementById('cbLdl'); dl.href = src; dl.download = name || 'image.jpg'; document.getElementById('cbLimg').src = src; ui.light.classList.add('show'); ui.light.classList.remove('z'); }

    function pathOf(conv) { return conv === 'all' ? 'chatAll' : 'chat/' + conv; }
    function store(conv) { return msgs[conv] || (msgs[conv] = {}); }
    function find(k) { for (const c in msgs) if (msgs[c][k]) return msgs[c][k]; return null; }
    function listFor(conv) {
        let a = Object.keys(store(conv)).map(k => Object.assign({ k, conv }, msgs[conv][k]));
        if (role === 's') a = a.concat(Object.keys(store('all')).map(k => Object.assign({ k, conv: 'all' }, msgs.all[k])));
        /* [CB-DEL4] ملفات الطالب تظهر الآن في المحادثة نفسها (الشريط الجانبي حُذف) */
        if (role === 's') a = a.filter(x => !x.hw);      /* [M2] ملفات الواجب/الاختبار تصل للمدرس فقط ولا تظهر في رسائل الطالب */
        return a.sort((x, y) => (x.ts || 0) - (y.ts || 0));
    }
    function attach(conv) {
        if (attached[conv]) return; attached[conv] = true;
        const r = cfg.ref(pathOf(conv));
        r.on('child_added', s => { store(conv)[s.key] = s.val() || {}; got[conv] = (got[conv] || 0) + 1; onMsg(conv, s.key); updFlags(); if (shown && conv === cur) head(); }, fail);
        r.on('child_changed', s => { store(conv)[s.key] = s.val() || {}; updFlags(); if (visible(role === 's' ? cur : conv)) render(); }, fail);
        r.on('child_removed', s => { delete store(conv)[s.key]; updFlags(); recount(conv); if (visible(conv)) render(); });
    }
    function visible(conv) { return shown && !collapsed && (role === 's' || cur === conv); }
    function recount(conv) {
        const s = seen[conv] || 0; let n = 0;
        const arr = role === 's' ? listFor(cur) : Object.keys(store(conv)).map(k => msgs[conv][k]);
        arr.forEach(m => { if (m.from !== role && (m.ts || 0) > s) n++; });
        unread[conv] = n; fire();
    }
    function onMsg(conv, k) {
        const m = msgs[conv][k];
        if (role === 't' && m.from === 's' && cfg.onLast) cfg.onLast(m);
        if (role === 's' && m.hw) { fire(); return; }     /* [M2] */
        if (visible(role === 's' ? cur : conv)) { appendOne(Object.assign({ k, conv }, m)); markSeen(conv); }
        else {
            if (m.from !== role && (m.ts || 0) > (seen[conv] || 0)) { unread[conv] = (unread[conv] || 0) + 1; if ((m.ts || 0) > t0 - 2000) beep(); }
            if (shown && role === 't') drawChips();
        }
        fire();
    }
    function markSeen(conv) {
        let mx = 0; const arr = role === 's' ? listFor(cur) : Object.keys(store(conv)).map(k => msgs[conv][k]);
        arr.forEach(m => { if ((m.ts || 0) > mx) mx = m.ts; });
        seen[conv] = mx; unread[conv] = 0; if (role === 's') { seen.all = mx; unread.all = 0; } fire();
    }
    function fire() {
        let tot = 0; Object.keys(unread).forEach(k => { tot += unread[k] || 0; });
        if (cfg.onUnread) cfg.onUnread(tot, unread);
    }
    function beep() {
        try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 880; g.gain.value = .04; o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + .12); } catch (e) {}
    }

    function node(m) {
        const mine = m.from === role, d = document.createElement('div');
        d.className = 'cb-m ' + (mine ? 'me' : 'ot') + (m.conv === 'all' ? ' all' : '') + (m.hw ? ' hwm' : ''); d.dataset.k = m.k;
        let h = m.hw ? '<div class="cb-hwt">📎 واجب / ملف للتصحيح</div>' : '';

        if (m.text) h += '<div class="cb-tx">' + esc(m.text) + (m.edited ? ' <span class="cb-ted">(معدّلة)</span>' : '') + '</div>';
        if (m.file) {
            const f = m.file;
            if (/^image\//.test(f.type)) h += '<img class="cb-img" src="' + f.data + '" data-name="' + esc(f.name) + '" alt="">' +
                '<div class="cb-act"><a class="cb-a" href="' + f.data + '" download="' + esc(f.name) + '">' + IC.dl + ' تحميل</a>' + (role === 't' ? '<button class="cb-a" data-open="' + m.k + '">' + IC.open + ' فتح في الملفات</button>' + (m.from === 's' ? '<button class="cb-a" data-fix="' + m.k + '">' + IC.fix + ' تصحيح</button>' : '') : '') + '</div>';
            else h += '<div class="cb-file"><div class="cb-fi">' + esc((f.name.split('.').pop() || 'FILE').slice(0, 4).toUpperCase()) + '</div><div class="cb-fn"><b>' + esc(f.name) + '</b><small>' + fsize(f.size || 0) + '</small></div></div>' +
                '<div class="cb-act"><a class="cb-a" href="' + f.data + '" download="' + esc(f.name) + '">' + IC.dl + ' تحميل</a>' + (role === 't' && /pdf/.test(f.type) ? '<button class="cb-a" data-open="' + m.k + '">' + IC.open + ' فتح في الملفات</button>' + (m.from === 's' ? '<button class="cb-a" data-fix="' + m.k + '">' + IC.fix + ' تصحيح</button>' : '') : '') + '</div>';
        }
        if (m.voice) h += '<audio class="cb-au" controls preload="metadata" src="' + m.voice.data + '"></audio>';
        h += '<span class="cb-ts">' + fmt(m.ts || Date.now()) + (role === 't' ? '<button class="cb-dl2" data-del="' + m.k + '" title="حذف الرسالة">🗑 حذف</button>' : '') + (mine && m.text && !m.file && !m.voice && m.conv !== 'all' ? '<button class="cb-ed" data-ed="' + m.k + '">تعديل</button>' : '') + (mine ? '<b class="cb-st">' + (ack[m.k] === 'ok' ? ' ✓' : ack[m.k] === 'err' ? ' ✗ لم تُرسل' : ack[m.k] === 'wait' ? ' …' : '') + '</b>' : '') + '</span>';
        d.innerHTML = h; return d;
    }
    function emptyEl() {
        const e = document.createElement('div'); e.className = 'cb-empty';
        e.innerHTML = IC.chat + '<br>' + (role === 's' ? 'اكتب سؤالك للمدرس،<br>أو أرسل صورة / ملفًا / رسالة صوتية' : (!cur ? 'اضغط على ظرف أي طالب<br>في لوحة الطلاب لفتح محادثته' : 'لا توجد رسائل بعد.<br>اكتب ردك أو أرسل ملفًا'));
        return e;
    }
    function render() {
        const arr = cur ? listFor(cur) : []; ui.body.innerHTML = '';
        if (!arr.length) ui.body.appendChild(emptyEl()); else arr.forEach(m => ui.body.appendChild(node(m)));
        ui.body.scrollTop = ui.body.scrollHeight; updSide();
    }
    function appendOne(m) {
        const em = ui.body.querySelector('.cb-empty'); if (em) em.remove();
        const near = ui.body.scrollHeight - ui.body.scrollTop - ui.body.clientHeight < 160 || m.from === role;
        ui.body.appendChild(node(m)); if (near) ui.body.scrollTop = ui.body.scrollHeight;
    }
    function peers() { return (cfg.getPeers ? cfg.getPeers() : []); }
    function convOf(p) { return p.id + '_' + (p.sess || ''); }
    function drawChips() {
        return;   /* الاسم يظهر في الشريط الأحمر فقط */
        const ps = peers(); let h = '';
        ps.forEach(p => { const k = convOf(p), n = unread[k] || 0; h += '<button class="cb-chip' + (cur === k ? ' on' : '') + '" data-k="' + k + '"><i class="' + (p.on ? 'on' : '') + '"></i>' + esc(p.name || 'طالب') + (n ? '<em>' + n + '</em>' : '') + '</button>'; });
        ui.chips.innerHTML = h;
    }
    function head() {
        if (role === 's') { ui.title.textContent = 'Mr. Farag Physics4u'; ui.sub.textContent = 'رمز ' + String(cur || '').slice(-5) + ' · وصل ' + (got[cur] || 0); return; }
        if (!cur) { ui.title.textContent = 'الرسائل'; ui.sub.textContent = 'اختر طالبًا'; $('#cbClear').style.display = 'none'; return; }
        const p = peers().find(x => convOf(x) === cur); ui.title.textContent = p ? p.name : 'طالب'; ui.sub.textContent = (p && p.on ? 'متصل' : 'غير متصل') + ' · رمز ' + String(cur).slice(-5) + ' · وصل ' + (got[cur] || 0); $('#cbClear').style.display = '';
    }
    /* [SL2] قائمة الطلاب في الشريط الأيسر: من سجل الأكواد (MC.students.roster) أو من المتصلين فقط */
    function roster() {
        try { if (window.MC && MC.students && MC.students.roster) return MC.students.roster(); } catch (e) { }
        return peers().map(p => ({ name: p.name || 'طالب', code: '', auto: false, on: !!p.on, conv: convOf(p) }));
    }
    const pend = {};   /* [SL3] تغييرات التفعيل بانتظار زر حفظ */
    /* [CQ2] طلبات الكود: «إرسال الكود» يسجّل كودًا للطالب ويفتح واتساب على رقمه بالرسالة جاهزة */
    function drawSl() {
        if (role !== 't') return; const L = document.getElementById('slL'); if (!L) return;
        const qn = ($('#slN').value || '').trim().toLowerCase(), qc = ($('#slC').value || '').trim().toLowerCase();
        const rs = roster().filter(r => (!qn || String(r.name || '').toLowerCase().includes(qn)) && (!qc || String(r.code || '').toLowerCase().includes(qc)));
        rs.sort((a, b) => (b.on ? 1 : 0) - (a.on ? 1 : 0) || String(a.name).localeCompare(String(b.name), 'ar'));
        const sig = JSON.stringify([rs.map(r => [r.name, r.code, r.auto, r.on, r.conv, r.conv ? unread[r.conv] || 0 : 0]), cur]);
        if (sig === L._sig) return; L._sig = sig;
        L.innerHTML = '';
        if (!rs.length) { L.innerHTML = '<div class="sl-e">لا يوجد طلاب</div>'; return; }
        rs.forEach(r => {
            const d = document.createElement('div'); d.className = 'sl-r' + (r.conv && r.conv === cur ? ' on' : '') + (r.on ? '' : ' off');
            const n = r.conv ? unread[r.conv] || 0 : 0;
            d.innerHTML = '<i class="' + (r.on ? 'on' : '') + '"></i><b title="' + esc(r.name) + '">' + esc(r.name) + '</b>' + (n ? '<em>' + n + '</em>' : '') + (r.code ? '<small>' + esc(r.code) + '</small><button class="sl-p sl-k" title="بطاقة الكود (عرض/تعديل/إرسال)">🔑</button><button class="sl-p" title="نسخ رابط ولي الأمر (يطّلع على درجات ابنه)">🔗</button><input type="checkbox" title="دخول تلقائي بالكود دون إذن"' + (r.auto ? ' checked' : '') + '>' : '');
            d.addEventListener('click', e => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                if (r.conv) { switchTo(r.conv); drawSl(); } else say('الطالب غير متصل الآن');
            });
            const kb = d.querySelector('.sl-k'); if (kb) kb.addEventListener('click', e => { e.stopPropagation(); try { MC.students.openCodeCard({ code: r.code, name: r.name, phone: r.phone }, e.currentTarget); } catch (er) { } });
            const pb = d.querySelector('.sl-p:not(.sl-k)'); if (pb) pb.addEventListener('click', e => { e.stopPropagation(); try { const u = MC.students.parentLink(r.code); if (!u) { say('تعذّر إنشاء الرابط'); return; } navigator.clipboard.writeText(u).then(() => say('نُسخ رابط ولي الأمر — الصقه له في واتساب'), () => prompt('انسخ الرابط:', u)); } catch (er) { say('تعذّر إنشاء الرابط'); } });
            const ck = d.querySelector('input'); if (ck) ck.addEventListener('change', () => { pend[r.code] = { code: r.code, name: r.name, phone: r.phone || '', auto: ck.checked }; const sb = $('#slAdd'); if (sb) sb.classList.add('dirty'); });   /* يُحفظ بزر حفظ */
            L.appendChild(d);
        });
    }
    function wireSl() {
        if (role !== 't') return;
        win.classList.add('sl'); win.style.width = Math.min(innerWidth - 20, 800) + 'px';
        ['slN', 'slC'].forEach(id => $('#' + id).addEventListener('input', () => { const L = $('#slL'); L._sig = ''; drawSl(); }));
        $('#slAdd').addEventListener('click', () => {
            const M = window.MC && MC.students; if (!M || !M.saveEntry) return;
            const nm = $('#sfN').value.trim(), cd = $('#sfC').value.trim(), ph = $('#sfP').value.trim();
            let n = 0;
            if (cd) { if (!nm || !ph) { say('اكتب الاسم والكود ورقم الواتس'); return; } M.saveEntry({ code: cd, name: nm, phone: ph, auto: true }); n++; $('#sfN').value = $('#sfC').value = $('#sfP').value = ''; }
            Object.keys(pend).forEach(k => { const e = pend[k]; M.saveEntry(e); delete pend[k]; n++; });
            $('#slAdd').classList.remove('dirty'); $('#slL')._sig = ''; setTimeout(drawSl, 300);
            say(n ? 'تم الحفظ' : 'لا توجد تغييرات');
        });
        drawSl(); setInterval(drawSl, 1500);
    }
    /* [IN3] تصحيح الاختبار داخل نافذة الرسائل: تتسع النافذة لتحتضن الورقة ثم تعود لحجمها عند الإغلاق */
    let gSave = null;
    CB.gradeHost = function () { return window.__exGH ? window.__exGH() : null; };   /* [G8] داخل نافذة الاختبار إن وُجد مضيف، وإلا نافذة مستقلة */   /* [G7] التصحيح نافذة مستقلة بكامل أدواتها (لا داخل نافذة الرسائل) */
    CB.gradeDone = function () {
        if (window.__exGD) { try { window.__exGD(); } catch (e) { } }
        if (work) work.classList.remove('gr');
        win.classList.remove('gr'); if (!gSave) return;
        win.classList.toggle('nofp', gSave.nofp); gSave = null;
    };
    /* [SB6] نقل الجزء الأيمن + العارض + مضيف التصحيح إلى نافذة المشتركين */
    CB.adoptWork = function (o) {
        if (!cfg || role !== 't' || work || !o || !o.root) return false;
        const fp = $('#cbFp'), vw = $('#cbVw'), gh = $('#cbGh'); if (!fp || !vw || !gh) return false;
        o.fp.appendChild(fp); o.ov.appendChild(vw); o.ov.appendChild(gh); work = o.root; fpSig = ''; updSide(); return true;
    };
    CB.select = function (conv) { if (!cfg || role !== 't') return; hideViewer(); fpSel = null; switchTo(conv || null); fpSig = ''; updSide(); };
    function switchTo(conv) {
        cur = conv; if (role === 't') { if (conv) attach(conv); drawChips(); } head(); render(); if (conv) markSeen(conv); if (role === 't') { const L = document.getElementById('slL'); if (L) L._sig = ''; drawSl(); }
    }

    function post(obj) {
        const now = Date.now(); if (now - lastSend < 700) { say('انتظر لحظة…'); return false; } lastSend = now;
        obj.from = role; obj.nm = (cfg.me && cfg.me.name) || (role === 't' ? 'المدرس' : 'طالب'); obj.ts = now;
        const conv = role === 's' ? cfg.convKey() : cur; if (!conv) return false;
        const pr = cfg.ref(pathOf(conv)).push(obj);
        if (pr && pr.then) { const k = pr.key; ack[k] = 'wait'; pr.then(() => { ack[k] = 'ok'; stamp(k); }, e => { ack[k] = 'err'; stamp(k); fail(e); }); }
        return true;
    }
    CB.sendTo = function (conv, obj) {
        obj.from = role; obj.nm = (cfg.me && cfg.me.name) || 'المدرس'; obj.ts = Date.now();
        const pr = cfg.ref(pathOf(conv)).push(obj);
        return (pr && pr.then) ? pr : Promise.resolve();
    };
    function stamp(k) { const n = ui.body && ui.body.querySelector('[data-k="' + k + '"] .cb-st'); if (n) n.textContent = ack[k] === 'ok' ? ' ✓' : ack[k] === 'err' ? ' ✗ لم تُرسل' : ' …'; }
    let editKey = null;
    function sendText() {
        const v = ui.ta.value.trim(); if (!v) return;
        if (editKey) {
            const conv = role === 's' ? cfg.convKey() : cur, k = editKey; editKey = null; ui.ta.placeholder = '';
            const pr = cfg.ref(pathOf(conv)).child(k).update({ text: v.slice(0, 1000), edited: true });
            if (pr && pr.catch) pr.catch(fail); ui.ta.value = ''; ui.ta.style.height = '40px'; return;
        } if (post({ text: v.slice(0, 1000) })) { ui.ta.value = ''; ui.ta.style.height = '40px'; } }
    function readAsData(f) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); }); }
    async function shrink(f) {
        const url = await readAsData(f);
        return new Promise(res => {
            const im = new Image(); im.onload = () => {
                let w = im.width, h = im.height, M = 1400; if (Math.max(w, h) > M) { const k = M / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
                const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h);
                res(c.toDataURL('image/jpeg', .82));
            }; im.onerror = () => res(url); im.src = url;
        });
    }
    async function sendFile(f, hw) {
        try {
            let data, type = f.type || 'application/octet-stream', name = f.name || 'file', size = f.size;
            if (/^image\//.test(type) && type !== 'image/gif') { data = await shrink(f); type = 'image/jpeg'; size = Math.round(data.length * .75); name = name.replace(/\.[^.]+$/, '') + '.jpg'; }
            else { if (f.size > MAXFILE) { say('الملف كبير — الحد الأقصى 2.5 ميجا'); return; } data = await readAsData(f); }
            if (data.length > 3400000) { say('الملف كبير — الحد الأقصى 2.5 ميجا'); return; }
            return post(hw ? { file: { name: name.slice(0, 80), type, size, data }, hw: hw === 2 ? 2 : 1 } : { file: { name: name.slice(0, 80), type, size, data } });
        } catch (e) { say('تعذر قراءة الملف'); }
    }
    async function startRec() {
        if (!navigator.mediaDevices || !window.MediaRecorder) { say('المتصفح لا يدعم التسجيل الصوتي'); return; }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
            const mt = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported(t)) || '';
            const chunks = []; const mr = new MediaRecorder(stream, mt ? { mimeType: mt, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 });
            rec = { mr, stream, chunks, send: false };
            mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
            mr.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                if (!rec || !rec.send || !chunks.length) { rec = null; return; }
                const blob = new Blob(chunks, { type: mr.mimeType || mt || 'audio/webm' }); const dur = Math.round((Date.now() - recStart) / 1000); rec = null;
                if (blob.size > 1800000) { say('التسجيل طويل جدًا'); return; }
                const data = await readAsData(blob); post({ voice: { data, type: blob.type, dur } });
            };
            recStart = Date.now(); mr.start(); ui.comp.classList.add('recing'); const mb = $('#cbMic'); mb.classList.add('rec'); mb.innerHTML = IC.stop;
            recTick = setInterval(() => { const s = Math.round((Date.now() - recStart) / 1000); $('#cbRt').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); if (s >= MAXVOICE) stopRec(true); }, 250);
        } catch (e) { say('لم يُسمح باستخدام المايك — فعّله من إعدادات المتصفح'); }
    }
    function stopRec(send) {
        if (!rec) return; rec.send = !!send; clearInterval(recTick); try { rec.mr.stop(); } catch (e) {}
        ui.comp.classList.remove('recing'); const mb = $('#cbMic'); mb.classList.remove('rec'); mb.innerHTML = IC.mic; $('#cbRt').textContent = '0:00';
    }
    function clearConv() { if (role !== 't' || !cur || cur === 'all') return; cfg.ref(pathOf(cur)).remove(); msgs[cur] = {}; unread[cur] = 0; render(); fire(); }

    /* [M5] فتح ملف الواجب مباشرة في حيّز الملفات (processFile في board.js) وتصحيحه بالمصحّح؛ مع الرجوع لدوال الإعداد إن وُجدت */
    function toFile(f) { const bs = atob(f.data.split(',')[1] || ''), u = new Uint8Array(bs.length); for (let i = 0; i < bs.length; i++) u[i] = bs.charCodeAt(i); return new File([u], f.name || 'file', { type: f.type || 'application/octet-stream' }); }
    function openFile(f) {
        /* يُفتح في حيّز الملفات؛ إن أخفقت processFile نعرض السبب ونفتح الملف في تبويب جديد كحلٍّ بديل */
        let file; try { file = toFile(f); } catch (e) { say('تعذّر قراءة الملف: ' + (e && e.message || e)); return; }
        try { document.body.classList.remove('hidefile'); } catch (e) {}
        try {
            if (typeof window.processFile === 'function' || typeof processFile === 'function') { (window.processFile || processFile)(file); say('فُتح «' + (f.name || '') + '» في حيّز الملفات'); return; }
        } catch (e) { console.error('openFile', e); say('تعذّر الفتح: ' + (e && e.message || e)); }
        try { if (cfg.onOpenFile) { cfg.onOpenFile(f); return; } } catch (e) {}
        try { window.open(URL.createObjectURL(file), '_blank'); say('فُتح الملف في تبويب جديد'); } catch (e) { say('تعذّر فتح الملف'); }
    }
    function fixFile(f) {
        const p = peers().find(x => convOf(x) === cur);
        try { document.body.classList.remove('hidefile'); } catch (e) {}
        if (/^image\//.test(f.type) && window.MCGrader && MCGrader.open) { try { MCGrader.open({ conv: cur, nm: p ? p.name : 'طالب', src: f.data }); return; } catch (e) { console.error('fixFile', e); say('تعذّر فتح المصحّح: ' + (e && e.message || e)); } }
        if (cfg.onCorrect) { try { cfg.onCorrect(f, cur); return; } catch (e) {} }
        openFile(f);
    }
    /* [M3] إجابات الاختبار تظهر للمدرس داخل نافذة الرسائل كبطاقة مع زر «فتح وتصحيح» */
    const sidOf = conv => String(conv || '').split('_')[0];
    function examSubs(conv) { return []; /* [CB-DEL2] بيانات الاختبار حُذفت من نافذة الرسائل */ try { return role === 't' && window.MCExam && MCExam.subsOf ? (MCExam.subsOf(sidOf(conv)) || []) : []; } catch (e) { return []; } }
    /* [M6.2] لوحة الملفات داخل نافذة الرسائل (المعلم): شريط أيمن فيه ملفات الطالب ومواصفاتها (واجب / اختبار / ملفات)،
       وتحته الأزرار، والعرض يتم داخل شاشة الرسائل نفسها وتبقى الملفات حتى نهاية الجلسة */
    let fpKind = 'hw', fpSel = null, fpSig = '';   /* [M9] تبويب «اختبار» هو الافتراضي */
    const blobs = {};
    function sideItems(kind) {
        if (role !== 't' || !cur) return [];
        if (kind === 'ex') return examSubs(cur).map((s, i) => ({ ex: s, i, key: 'ex' + i, ts: s.ts || 0 }));
        const m = msgs[cur] || {}, out = [];
        for (const k in m) { const x = m[k]; if (x && x.from === 's' && x.file) { const isHw = !!x.hw && x.hw !== 2; if ((kind === 'hw') === isHw) out.push(Object.assign({ k, key: k }, x)); } }
        return out.sort((a, b) => (a.ts || 0) - (b.ts || 0));
    }
    const typeLbl = f => /^image\//.test(f.type) ? 'صورة' : /pdf/.test(f.type) ? 'PDF' : (f.name.split('.').pop() || 'ملف').toUpperCase().slice(0, 5);
    const whenS = ts => new Date(ts || 0).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' });
    function selItem() { if (!fpSel) return null; return sideItems(fpKind).find(x => x.key === fpSel) || null; }
    function blobOf(it) { if (!blobs[it.key]) { try { blobs[it.key] = URL.createObjectURL(toFile(it.file)); } catch (e) { return null; } } return blobs[it.key]; }
    function hideViewer() { const v = $('#cbVw'); if (v) { v.classList.remove('show'); v.querySelector('#vwC').innerHTML = ''; } }
    function showViewer(it) {
        const v = $('#cbVw'), c = v.querySelector('#vwC'); if (!v || !it) return;
        v.classList.add('show'); c.innerHTML = '';
        if (it.ex) { v.querySelector('#vwT').textContent = 'إجابة اختبار · ' + whenS(it.ts); c.innerHTML = '<div class="vw-i"><div class="vw-big">📝</div><div>إجابة اختبار مرسلة من الطالب</div><button class="cb-a" data-a="fix">' + IC.fix + ' فتح وتصحيح</button></div>'; return; }
        const f = it.file; v.querySelector('#vwT').textContent = f.name + ' · ' + typeLbl(f) + ' · ' + fsize(f.size || 0);
        if (/^image\//.test(f.type)) { const im = document.createElement('img'); im.src = f.data; im.alt = ''; im.title = 'اضغط للتكبير/التصغير'; im.onclick = () => c.classList.toggle('z'); c.classList.remove('z'); c.appendChild(im); }
        else if (/pdf/.test(f.type)) { const u = blobOf(it); if (u) { const fr = document.createElement('iframe'); fr.src = u; c.appendChild(fr); } else c.innerHTML = '<div class="vw-i">تعذّر عرض الملف</div>'; }
        else c.innerHTML = '<div class="vw-i"><div class="vw-big">' + esc(typeLbl(f)) + '</div><div>لا يمكن عرض هذا النوع هنا — يمكنك تحميله</div><button class="cb-a" data-a="dl">' + IC.dl + ' تحميل</button></div>';
    }
    /* [M8] صف واحد لكل اختبار: اختبار (n) الدرجة x/y الزمن t د من T د + اليوم الموافق التاريخ؛ المؤشر عليه = اسم الاختبار؛ نقرتان = فتح وتصحيح */
    const exInfo = {}; let exVer = 0;
    const nfmt = n => (Math.round(n * 10) / 10).toString();
    function exLoad(it) {
        const k = it.ex.eid + '|' + it.ex.id, c = exInfo[k];
        if (!c || (!c.ld && Date.now() - c.at > 5000)) {
            const keep = c; exInfo[k] = Object.assign({ at: Date.now(), ld: 1 }, keep || {}); exInfo[k].at = Date.now();
            if (window.MCExam && MCExam.rowInfo) MCExam.rowInfo(it.ex).then(r => { exInfo[k] = r; exVer++; fpSig = ''; updSide(); }, () => { exInfo[k].ld = 0; });
        }
        return exInfo[k] && exInfo[k].name ? exInfo[k] : null;
    }
    /* [M9] تصميم الصف: أربع خلايا ملوّنة وعناوينها فوقها — Date | Time | Deg | Test(n)؛ الدرجة: أحمر < النصف، برتقالي داكن = النصف، أخضر داكن > النصف */
    function exCells(c, it) {
        const d = new Date(it.ts || 0), L = 'ar-EG-u-nu-latn';
        const day = d.toLocaleDateString(L, { weekday: 'long' }), dt = d.getDate() + '/' + (d.getMonth() + 1);
        const ok = c && c.tot != null && c.mx, r = ok ? c.tot / c.mx : null;
        const gc = !ok ? '' : (r < 0.5 - 1e-9 ? 'g-r' : (Math.abs(r - 0.5) < 1e-9 ? 'g-o' : 'g-g'));
        const tm = ':' + (c && c.el != null ? c.el : '—') + '/:' + (c && c.dur ? c.dur : '—');
        const cell = (lab, cls, html, ttl) => '<div class="fx-c"><i>' + lab + '</i><b class="' + cls + '"' + (ttl ? ' title="' + esc(ttl) + '"' : '') + '>' + html + '</b></div>';
        /* الترتيب (يسار→يمين): Test | Deg | Time | Date */
        return '<div class="fx-g">' + cell('Test(' + (it.i + 1) + ')', '', esc((c && c.short) || '—')) + cell('Deg', gc, ok ? esc(nfmt(c.tot) + '/' + nfmt(c.mx)) : '—') +
            cell('Time', '', esc(tm), c && c.ap ? 'الزمن تقديري (من وقت نشر الاختبار)' : '') + cell('Date', '', '<span class="fx-s">' + esc(day.replace('ال', '')) + '</span>' + esc(dt)) + '</div>';
    }
    function exLine(c, it) {
        const d = new Date(it.ts || 0), L = 'ar-EG-u-nu-latn';
        const day = d.toLocaleDateString(L, { weekday: 'long' }), dt = d.toLocaleDateString(L, { day: 'numeric', month: 'numeric', year: 'numeric' });
        return 'اختبار (' + (it.i + 1) + ')  الدرجة ' + (c && c.tot != null ? nfmt(c.tot) + '/' + c.mx : '—') + '  الزمن ' + (c && c.el != null ? c.el : '—') + ' د من ' + (c && c.dur ? c.dur : '—') + ' د  ' + day + ' الموافق ' + dt;
    }
    function drawFiles() {
        const fp = $('#cbFp'); if (!fp) return;
        fp.classList.toggle('exm', fpKind === 'ex'); win.classList.toggle('exm', fpKind === 'ex');
        const n = { hw: sideItems('hw'), ex: sideItems('ex'), fl: sideItems('fl') };
        fp.querySelectorAll('[data-sd]').forEach(b => { const k = b.dataset.sd; b.querySelector('b').textContent = n[k].length; b.classList.toggle('on', k === fpKind); });
        const tot = n.hw.length + n.ex.length + n.fl.length, tb = $('#cbFpT'); if (tb) { tb.querySelector('b').textContent = tot; tb.classList.toggle('z', !tot); }
        const list = fp.querySelector('#fpList'); list.innerHTML = '';
        const items = n[fpKind];
        if (!items.length) list.innerHTML = '<div class="fp-e">لا يوجد شيء بعد من هذا الطالب</div>';
        items.forEach(it => {
            const d = document.createElement('div'); d.className = 'fp-i' + (it.key === fpSel ? ' on' : ''); d.dataset.key = it.key;
            if (it.ex) { const c = exLoad(it); d.classList.add('fp-ex'); d.innerHTML = exCells(c, it); d.title = (c && c.name) || 'اختبار'; }
            else { const f = it.file, im = /^image\//.test(f.type); d.innerHTML = '<span class="fp-th">' + (im ? '<img src="' + f.data + '" alt="">' : esc(typeLbl(f))) + '</span><span class="fp-n"><b>' + esc(f.name) + '</b><small>' + esc(typeLbl(f)) + ' · ' + fsize(f.size || 0) + ' · ' + esc(whenS(it.ts)) + '</small></span>'; }
            list.appendChild(d);
        });
        list.scrollTop = 0;   /* [M9] السكرول يبدأ من الصفر أعلى القائمة */
        fpActs(n);
    }
    function fpActs(n) {
        const fp = $('#cbFp'); if (!fp) return; n = n || { hw: sideItems('hw'), ex: sideItems('ex'), fl: sideItems('fl') };
        const has = !!selItem(), isEx = has && selItem().ex, isImg = has && !isEx && /^image\//.test(selItem().file.type);
        fp.querySelectorAll('.fp-act [data-a]').forEach(b => { const a = b.dataset.a; let off = false; if (a === 'saveall') off = !(n.hw.length + n.fl.length); else if (!has) off = true; else if (isEx && (a === 'dl' || a === 'board' || a === 'view') && a !== 'view') off = true; else if (a === 'fix' && !isEx && !isImg) off = true; b.disabled = off; });
    }
    function curSig() { return cur + '|' + fpKind + '|' + exVer + '|' + ['hw', 'ex', 'fl'].map(k => sideItems(k).map(x => x.key).join(',')).join('/'); }
    function updSide() {
        if (role !== 't' || !win) return;
        const sig = curSig();
        if (sig !== fpSig) { fpSig = sig; drawFiles(); }
    }
    function dl(it) { if (!it || !it.file) return; const a = document.createElement('a'); a.href = it.file.data; a.download = it.file.name || 'file'; document.body.appendChild(a); a.click(); a.remove(); }
    function bindFiles() {
        const fp = $('#cbFp'); if (!fp) return;
        const act = a => {
            const it = selItem(); if (a === 'saveall') { const all = sideItems('hw').concat(sideItems('fl')); all.forEach((x, i) => setTimeout(() => dl(x), i * 350)); say('جارٍ حفظ ' + all.length + ' ملف'); return; }
            if (!it) return;
            if (a === 'view') showViewer(it);
            else if (a === 'fix') { if (it.ex) { const p = peers().find(z => convOf(z) === cur); if (window.MCExam && MCExam.grade) MCExam.grade(it.ex, p ? p.name : 'طالب'); } else fixFile(it.file); }
            else if (a === 'board') openFile(it.file);
            else if (a === 'dl') dl(it);
        };
        fp.addEventListener('click', e => {
            const t = e.target.closest('[data-sd]'); if (t) { fpKind = t.dataset.sd; fpSel = null; hideViewer(); fpSig = ''; updSide(); return; }
            const i = e.target.closest('.fp-i'); if (i) { fpSel = i.dataset.key; fp.querySelectorAll('.fp-i').forEach(x => x.classList.toggle('on', x === i)); fpActs(); const si = selItem(); if (si && !si.ex) showViewer(si); return; }
            const b = e.target.closest('[data-a]'); if (b && !b.disabled) act(b.dataset.a);
        });
        fp.addEventListener('dblclick', e => { const i = e.target.closest('.fp-i'); if (!i) return; const it = sideItems(fpKind).find(x => x.key === i.dataset.key); if (it && it.ex) { const p = peers().find(z => convOf(z) === cur); if (window.MCExam && MCExam.grade) MCExam.grade(it.ex, p ? p.name : 'طالب'); } });
        $('#cbVw').addEventListener('click', e => { if (e.target.closest('#vwBack')) { hideViewer(); return; } const b = e.target.closest('[data-a]'); if (b) act(b.dataset.a); });
        if ($('#cbFpT')) $('#cbFpT').addEventListener('click', () => { if (work) { try { MC.students.openSubs(true); } catch (e) { } } else win.classList.toggle('nofp'); });
        $('#fpX').addEventListener('click', () => { if (work) work.classList.remove('show'); else win.classList.add('nofp'); });   /* [M10] إغلاق الجزء الأيمن */
    }
    let exN = {};
    setInterval(() => {      /* إعادة الرسم عند وصول/تغيّر إجابات اختبار الطالب المفتوحة محادثته + إضاءة الظرف */
        if (role !== 't') return;
        updSide();
        updFlags();
    }, 2000);
    CB.init = function (c) {
        if (cfg) return; cfg = c; role = c.role; build();
        if (role === 's') { cur = cfg.convKey(); attach(cur); attach('all'); head(); render(); $('#cbClear').style.display = 'none'; }
        else { cur = null; ui.chips.style.display = 'none'; head(); render(); }
        wireSl();
        if (role === 't') { const tm = setInterval(() => { if (window.MC && MC.students && MC.students.mountSubs) { clearInterval(tm); try { MC.students.mountSubs(); } catch (e) { } } }, 400); }
    };
    CB.refresh = function () { if (!cfg || role !== 't') return; peers().forEach(p => attach(convOf(p))); if (shown) { drawChips(); head(); } };
    /* [DK1] تثبيت النافذة في أصل الصفحة: بين شريطي الأدوات الجانبيين (#left-bar و #right-bar) وفوق الشريط السفلي (#bottom) */
    function dockWin(el) {
        el = el && el.style ? el : win;
        const rc = id => { const el = document.getElementById(id); if (!el || getComputedStyle(el).display === 'none') return null; const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 ? r : null; };
        const l = rc('left-bar'), r = rc('right-bar'), b = rc('bottom'), t = rc('top');
        if (!l || !r || !b) return;
        const a = l.left < r.left ? l : r, z = l.left < r.left ? r : l;
        const x1 = a.right, x2 = z.left, y1 = t && t.height < 90 ? t.bottom : 0, y2 = b.top;
        if (x2 - x1 < 320 || y2 - y1 < 260) return;
        el.style.left = Math.round(x1) + 'px'; el.style.top = Math.round(y1) + 'px'; el.style.width = Math.round(x2 - x1) + 'px'; el.style.height = Math.round(y2 - y1) + 'px';
    }
    CB.dock = dockWin; CB.dockEl = dockWin;
    CB.open = function (conv, anchor) {
        if (!cfg) return; const wasShown = shown; shown = true; win.classList.add('show'); collapsed = false; win.classList.remove('col');
        if (role === 't') { if (conv) cur = conv; else if (!cur && peers().length) cur = convOf(peers()[0]); peers().forEach(p => attach(convOf(p))); switchTo(cur); } else switchTo(cur);
        if (anchor && anchor.getBoundingClientRect) {     /* تتدلى النافذة أسفل إطار الطالب */
            const r = anchor.getBoundingClientRect(), w = win.offsetWidth, h = win.offsetHeight, vw = innerWidth, vh = innerHeight;
            let t = r.bottom + 4; if (t + h > vh - 6) t = Math.max(6, vh - h - 6);
            win.style.left = Math.max(6, Math.min(r.left, vw - w - 6)) + 'px'; win.style.top = t + 'px';
        }
        if (role === 't' && !wasShown) dockWin();   /* عند أول فتح فقط، فلا يُلغى تغيير المعلم للحجم */
        setTimeout(() => ui.ta.focus(), 50); fpSig = ''; updSide();
    };
    CB.toggle = function (conv) { if (!cfg) return; if (shown && !collapsed && (!conv || conv === cur)) { shown = false; win.classList.remove('show'); } else CB.open(conv); };
    CB.attach = function () {      /* رفع الواجب مباشرة بدون فتح نافذة الرسائل */
        if (role === 's') { cur = cfg.convKey(); attach(cur); }
        const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*,application/pdf';
        i.onchange = async () => { if (i.files && i.files[0]) { await sendFile(i.files[0], true); say('تم رفع الواجب ✓'); } };
        i.click();
    };
    CB.sendFile = function (f, hw) { if (!cfg) return Promise.resolve(false); if (role === 's') { cur = cfg.convKey(); attach(cur); } return sendFile(f, hw); };
    CB.convFor = convOf;
    CB.unread = k => unread[k] || 0;
    CB.flags = function (conv) { const o = { v: 0, f: 0 }, m = msgs[conv] || {}; for (const k in m) { const x = m[k]; if (x && x.from === 's') { if (x.voice) o.v++; if (x.file && x.hw) o.f++; } } return o; };
    function updFlags() {
        document.querySelectorAll('.stu-flags[data-conv]').forEach(e => { const f = CB.flags(e.dataset.conv), v = e.querySelector('.fl-v'); if (v) v.classList.toggle('on', !!f.v); });
        /* [M4] الظرف يُضاء إن وُجد واجب/ملف أو إجابات اختبار من الطالب */
        document.querySelectorAll('.eb-msg[data-conv]').forEach(b => { const f = CB.flags(b.dataset.conv); b.classList.toggle('hasf', !!f.f); });
    }
    CB.updFlags = updFlags;
    CB.lastVoice = function (conv) { const m = msgs[conv] || {}; let best = null; for (const k in m) { const x = m[k]; if (x && x.from === 's' && x.voice && (!best || (x.ts || 0) >= (best.ts || 0))) best = x; } return best ? best.voice.data : null; };
    CB.files = function (conv) { const m = msgs[conv] || {}, out = []; for (const k in m) { const x = m[k]; if (x && x.from === 's' && x.file && x.hw) out.push({ k, ts: x.ts || 0, name: x.file.name, type: x.file.type, data: x.file.data }); } return out.sort((a, b) => a.ts - b.ts); };
    CB.isOpen = () => shown;
})();