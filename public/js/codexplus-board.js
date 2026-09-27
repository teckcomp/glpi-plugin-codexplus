/* =========================================================================
   Codex+ — motor de quadro (bloco Q1, Claudio 26/09/2026)
   -------------------------------------------------------------------------
   Um motor, várias paletas (decisão de 26/09/2026). Neste bloco: PLANTA
   (fundo com a planta do cliente) e TOPOLOGIA (quadro em branco, zonas de
   VLAN/site), abertos pelos botões do editor (codexplus-editor.js).

   Gravado no corpo do documento:
     <span class="cx-board" data-cx-board='{json}'>
       <img class="cx-board-bg" src="…planta…">   (só na planta com fundo)
       <img src="…PNG do quadro…">
     </span>
   O PNG é o que a leitura, o PDF e o Word mostram; o JSON (data-*, que o
   sanitizador tira na leitura, achado 57) serve para editar de novo. As
   imagens sobem como imagem colada (uploadFile do GLPI, achado 60), com
   nomes cx-quadro-*.png, que a lista de Anexos ignora.

   Itens: icon {x,y,size,icon,label,f:{modelo,ip,vlan,obs},cat,cone},
          zone {x,y,w,h,label,color}, text {x,y,text,color,size}.
          link {a:{id,side}, b:{id,side}, kind, route, wp:[{x,y}], ends,
                label, cable, pa, pb, vel, vlan, poe, showId, fs,
                len:{mode:'auto'|'manual', m, extra}, showM} (Q2d: metros)
          duct {pts:[{x,y}], kind:'eletrocalha'|'canaleta', label, showM, fs}
                (Q2e: polilinha desenhada por cliques, com metragem própria).
                (Q2a/Q2b; side = n/l/s/o, borda do ícone; cable = P-001…).
   Todos com id, lock (travado) e g (grupo). Ligação não tem x/y: a
   posição vem dos dois ícones, e ela acompanha quando eles se movem.
   Q2b tipos e painel; Q2c traçado, dobras e religar a ponta; Q2d metragem
   e eletrocalha. Q3 legenda e lista de materiais; Q4 "+ Ícone".
   ========================================================================= */
(function () {
    'use strict';

    var NS = 'http://www.w3.org/2000/svg';
    var GRID = 10;
    var SNAP = 6;
    var COLORS = ['#185FA5', '#1D9E75', '#D85A30', '#534AB7', '#A32D2D', '#5F5E5A'];
    var MODES = { topologia: 'Topologia', planta: 'Planta de execução' };
    var PXM_DEFAULT = 20;   // sem escala definida: 1 m = 20 px (aproximado)
    var PXM = PXM_DEFAULT;  // escala do quadro em uso (render e PNG)
    var SIDES = ['n', 'l', 's', 'o'];   // bordas do ícone: norte, leste, sul, oeste
    // Tipos de cabo (Q2b): cor, espessura e traço. Tipo novo = uma linha aqui.
    // UTP em azul com a espessura crescendo; lógica/VPN nasce com seta.
    var LINK_KINDS = {
        cat5e:  { label: 'UTP Cat5e',        c: '#378ADD', w: 2,   d: '' },
        cat6:   { label: 'UTP Cat6',         c: '#378ADD', w: 2.6, d: '' },
        cat6a:  { label: 'UTP Cat6A',        c: '#185FA5', w: 3.4, d: '' },
        fibra:  { label: 'Fibra óptica',     c: '#7F77DD', w: 2.6, d: '' },
        coax:   { label: 'Coaxial / vídeo',  c: '#D85A30', w: 2.6, d: '' },
        eletr:  { label: 'Elétrica',         c: '#E24B4A', w: 2.6, d: '' },
        semfio: { label: 'Sem fio',          c: '#888780', w: 2,   d: '8 6' },
        logica: { label: 'Lógica / VPN',     c: '#5F5E5A', w: 2,   d: '1 6', arrow: true },
        outro:  { label: 'Outros',           c: '#888780', w: 2,   d: '' }
    };
    var LINK_FS = { p: 0.8, m: 1, g: 1.3 };   // tamanho do nome do cabo
    // Eletrocalha e canaleta (Q2e): faixa larga e translúcida, embaixo dos cabos.
    var DUCT_KINDS = {
        eletrocalha: { label: 'Eletrocalha', c: '#888780', w: 12, o: 0.35, mid: '#5F5E5A' },
        canaleta:    { label: 'Canaleta',    c: '#B4B2A9', w: 7,  o: 0.6,  mid: '' }
    };
    var LINK_DEFAULT = 'cat6';

    function esc(t) {
        return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function uid() { return 'n' + Math.random().toString(36).slice(2, 9); }
    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    function Icons() { return window.CodexplusIcons; }

    /* Q4a — ícones criados na instalação. Carregados uma vez por página
       (ajax/icons.php); a lista chega junto com "pode criar?" (só o
       Super-Admin). Falha de rede não impede abrir o quadro. */
    var BASE = (function () {
        var sc = document.currentScript;
        return sc && sc.src ? sc.src.replace(/\/js\/codexplus-board\.js.*$/, '') : '';
    })();
    var LIB = { canCreate: false, promise: null };
    function loadLibrary() {
        if (LIB.promise) { return LIB.promise; }
        if (typeof fetch !== 'function' || !BASE) { LIB.promise = Promise.resolve(); return LIB.promise; }
        LIB.promise = fetch(BASE + '/ajax/icons.php', { credentials: 'same-origin' })
            .then(function (r) { return r.ok ? r.json() : {}; })
            .then(function (j) {
                if (j && Array.isArray(j.icons)) { Icons().addCustom(j.icons); }
                LIB.canCreate = !!(j && j.can_create);
            })
            .catch(function () {});
        return LIB.promise;
    }
    /* Q4b — tratamento do PNG do ícone novo, sobre os pixels (RGBA) do
       recorte de 256 px. Funções puras: testáveis sem canvas.
       removeBg: a cor do fundo é a dos cantos (a que mais se repete entre os
         quatro); some tudo o que, LIGADO À BORDA, estiver perto dessa cor —
         o branco de dentro do desenho (uma porta, um visor) fica. tol 0..100.
         A borda do desenho ganha transparência parcial (sem serrilhado).
       tint: silhueta — todo pixel visível vira a cor da categoria, com a
         mesma transparência; o que é quase branco fica branco. */
    function fxDist(p, i, c) { var r = p[i] - c[0], g = p[i + 1] - c[1], b = p[i + 2] - c[2]; return Math.sqrt(r * r + g * g + b * b); }
    function removeBg(p, w, h, tol) {
        var corners = [0, w - 1, (h - 1) * w, h * w - 1].map(function (k) { return k * 4; });
        // Imagem que já tem fundo transparente (um canto transparente basta): não mexe.
        if (corners.some(function (i) { return p[i + 3] < 16; })) { return 0; }
        var best = corners[0], bestN = -1;
        corners.forEach(function (i) {
            var n = corners.filter(function (j) { return fxDist(p, j, [p[i], p[i + 1], p[i + 2]]) < 24; }).length;
            if (n > bestN) { bestN = n; best = i; }
        });
        var key = [p[best], p[best + 1], p[best + 2]], max = Math.max(1, tol * 2.2);
        var seen = new Uint8Array(w * h), stack = [], gone = 0;
        var push = function (x, y) { if (x >= 0 && y >= 0 && x < w && y < h && !seen[y * w + x]) { seen[y * w + x] = 1; stack.push(y * w + x); } };
        for (var x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
        for (var y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
        var fringe = [];
        while (stack.length) {
            var k = stack.pop(), i = k * 4;
            if (p[i + 3] >= 16 && fxDist(p, i, key) > max) { fringe.push(k); continue; }
            p[i + 3] = 0; gone++;
            var kx = k % w, ky = (k - kx) / w;
            push(kx + 1, ky); push(kx - 1, ky); push(kx, ky + 1); push(kx, ky - 1);
        }
        fringe.forEach(function (k) {
            var i = k * 4, d = fxDist(p, i, key);
            if (d < max * 1.6) { p[i + 3] = Math.round(p[i + 3] * Math.min(1, (d - max) / (max * 0.6))); }
        });
        return gone;
    }
    function tint(p, hex) {
        var c = [parseInt(hex.substr(1, 2), 16), parseInt(hex.substr(3, 2), 16), parseInt(hex.substr(5, 2), 16)];
        for (var i = 0; i < p.length; i += 4) {
            if (p[i + 3] === 0) { continue; }
            // Branco de dentro do desenho (porta, visor) fica branco: o ícone
            // lembra os da paleta (miolo claro, traço na cor da categoria).
            if (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2] > 225) { p[i] = 255; p[i + 1] = 255; p[i + 2] = 255; continue; }
            p[i] = c[0]; p[i + 1] = c[1]; p[i + 2] = c[2];
        }
    }

    // Cópia, no quadro, dos ícones da instalação que ele usa (campo lib).
    function libOf(items) {
        var out = {};
        (items || []).forEach(function (i) {
            if (i.t !== 'icon' || !/^u\d+$/.test(i.icon) || out[i.icon]) { return; }
            var ic = Icons().get(i.icon);
            if (ic && ic.custom) { out[i.icon] = { name: ic.name, cat: ic.cat, search: ic.search, mode: ic.mode, image: ic.img }; }
        });
        return out;
    }

    function starter(mode) {
        return { v: 1, mode: MODES[mode] ? mode : 'topologia', w: 1400, h: 900, bgOpacity: 0.6, pxm: 0, legend: true, items: [] };
    }

    function clean(d, mode) {
        var out = starter(d && d.mode || mode);
        if (!d || typeof d !== 'object') { return out; }
        // Q4a: ícones da instalação guardados no quadro entram antes da
        // conferência dos itens (ícone desconhecido vira genérico).
        if (d.lib && typeof d.lib === 'object') {
            Icons().addCustom(Object.keys(d.lib).map(function (k) { return Object.assign({ key: k }, d.lib[k]); }), true);
        }
        out.w = Math.max(400, Math.min(6000, +d.w || out.w));
        out.h = Math.max(300, Math.min(6000, +d.h || out.h));
        out.bgOpacity = Math.max(0.1, Math.min(1, +d.bgOpacity || out.bgOpacity));
        out.pxm = Math.max(0, Math.min(1000, +d.pxm || 0));
        // Q3b: legenda abaixo do quadro. Quadro novo nasce com ela; quadro
        // gravado antes do Q3b (sem o campo) fica sem, até marcar.
        out.legend = !!d.legend;
        var pxm = out.pxm || PXM_DEFAULT;
        var src = Array.isArray(d.items) ? d.items : [];
        src.forEach(function (it) {
            if (it && it.t === 'duct') {
                var pts = (Array.isArray(it.pts) ? it.pts : []).slice(0, 200).filter(function (q) { return q && isFinite(+q.x) && isFinite(+q.y); })
                    .map(function (q) { return { x: Math.round(+q.x * 10) / 10, y: Math.round(+q.y * 10) / 10 }; });
                if (pts.length < 2) { return; }
                out.items.push({ id: String(it.id || uid()), t: 'duct', pts: pts, kind: DUCT_KINDS[it.kind] ? it.kind : 'eletrocalha',
                    label: String(it.label || '').slice(0, 80), showM: it.showM === undefined ? true : !!it.showM,
                    fs: LINK_FS[it.fs] ? it.fs : 'm', lock: !!it.lock, g: it.g ? String(it.g) : '' });
                return;
            }
            if (!it || ['icon', 'zone', 'text'].indexOf(it.t) < 0) { return; }
            var n = { id: String(it.id || uid()), t: it.t, x: +it.x || 0, y: +it.y || 0, lock: !!it.lock, g: it.g ? String(it.g) : '' };
            if (it.t === 'icon') {
                n.icon = Icons().get(it.icon) ? it.icon : 'generico';
                n.size = Math.max(24, Math.min(160, +it.size || 48));
                n.label = String(it.label || '').slice(0, 80);
                n.cat = Icons().CATS[it.cat] ? it.cat : '';
                n.rot = ((Math.round(+it.rot || 0) % 360) + 360) % 360;
                n.f = {};
                ['modelo', 'ip', 'vlan', 'obs'].forEach(function (k) { n.f[k] = String((it.f || {})[k] || '').slice(0, 200); });
                if (Icons().get(n.icon).cone) {
                    var c = it.cone || {};
                    // Alcance em METROS (Claudio, 26/09/2026); dado antigo vinha em px.
                    var m = +c.m || (c.range ? c.range / pxm : 8);
                    n.cone = { on: !!c.on, dir: (+c.dir || 0) % 360, fov: Math.max(10, Math.min(180, +c.fov || 70)), m: Math.max(0.5, Math.min(200, Math.round(m * 2) / 2)) };
                }
            } else if (it.t === 'zone') {
                n.w = Math.max(20, +it.w || 200); n.h = Math.max(20, +it.h || 120);
                n.label = String(it.label || '').slice(0, 80);
                n.color = COLORS.indexOf(it.color) >= 0 ? it.color : COLORS[1];
            } else {
                n.text = String(it.text || '').slice(0, 300);
                n.color = COLORS.indexOf(it.color) >= 0 ? it.color : '#1d2330';
                n.size = ['p', 'm', 'g'].indexOf(it.size) >= 0 ? it.size : 'm';
            }
            out.items.push(n);
        });
        // Ligações: só entre dois ícones que existem (ícone apagado leva a ligação junto).
        var icons = {};
        out.items.forEach(function (i) { if (i.t === 'icon') { icons[i.id] = true; } });
        var seen = {};
        out.items.forEach(function (i) { seen[i.id] = true; });
        src.forEach(function (it) {
            if (!it || it.t !== 'link' || !it.a || !it.b) { return; }
            var a = String(it.a.id || ''), b = String(it.b.id || '');
            if (!icons[a] || !icons[b] || a === b) { return; }
            var id = String(it.id || uid());
            if (seen[id]) { id = uid(); }
            seen[id] = true;
            out.items.push({
                id: id, t: 'link', lock: !!it.lock, g: it.g ? String(it.g) : '',
                a: { id: a, side: SIDES.indexOf(it.a.side) >= 0 ? it.a.side : 'l' },
                b: { id: b, side: SIDES.indexOf(it.b.side) >= 0 ? it.b.side : 'o' },
                kind: LINK_KINDS[it.kind] ? it.kind : LINK_DEFAULT,
                route: ['straight', 'elbow', 'curve'].indexOf(it.route) >= 0 ? it.route : 'straight',
                wp: (Array.isArray(it.wp) ? it.wp : []).slice(0, 50).filter(function (p) { return p && isFinite(+p.x) && isFinite(+p.y); })
                    .map(function (p) { return { x: Math.round(+p.x * 10) / 10, y: Math.round(+p.y * 10) / 10 }; }),
                ends: ['none', 'arrow', 'both'].indexOf(it.ends) >= 0 ? it.ends : 'none',
                label: String(it.label || '').slice(0, 80),
                cable: String(it.cable || '').slice(0, 20),
                pa: String(it.pa || '').slice(0, 40), pb: String(it.pb || '').slice(0, 40),
                vel: String(it.vel || '').slice(0, 40), vlan: String(it.vlan || '').slice(0, 40),
                poe: !!it.poe,
                showId: it.showId === undefined ? true : !!it.showId,
                fs: LINK_FS[it.fs] ? it.fs : 'm',
                // Metragem (Q2d): automática pelo traçado e pela escala, com sobra; ou manual.
                len: {
                    mode: it.len && it.len.mode === 'manual' ? 'manual' : 'auto',
                    m: Math.max(0, Math.min(10000, Math.round((+(it.len || {}).m || 0) * 10) / 10)),
                    extra: it.len && isFinite(+it.len.extra) && it.len.extra !== '' && it.len.extra !== null ? Math.max(0, Math.min(100, Math.round(+it.len.extra))) : 10
                },
                showM: it.showM === undefined ? true : !!it.showM
            });
        });
        return out;
    }

    /* ---------------- ligações (Q2a) ---------------- */
    // Ponto de encaixe na borda do ícone. O sul fica abaixo do nome e do IP,
    // para o cabo não passar por cima do texto.
    function anchor(ic, side) {
        var s = ic.size, cx = ic.x + s / 2, cy = ic.y + s / 2;
        if (side === 'n') { return { x: cx, y: ic.y }; }
        if (side === 's') { var b = bbox(ic); return { x: cx, y: b.y + b.h }; }
        if (side === 'o') { return { x: ic.x, y: cy }; }
        return { x: ic.x + s, y: cy };
    }
    function nearestSide(ic, p) {
        var best = 'n', bd = Infinity;
        SIDES.forEach(function (sd) {
            var a = anchor(ic, sd), d = Math.pow(a.x - p.x, 2) + Math.pow(a.y - p.y, 2);
            if (d < bd) { bd = d; best = sd; }
        });
        return best;
    }
    // Pontos do traçado: origem, dobras, destino (null se faltar um ícone).
    function linkPts(L, find) {
        var a = find(L.a.id), b = find(L.b.id);
        if (!a || !b || a.t !== 'icon' || b.t !== 'icon') { return null; }
        return [anchor(a, L.a.side)].concat(L.wp || [], [anchor(b, L.b.side)]);
    }
    // Próximo número livre de cabo (P-001, P-002…); reaproveita buraco.
    function nextCable(items) {
        var used = {};
        items.forEach(function (i) { var m = i.t === 'link' && /^P-(\d+)$/.exec(i.cable || ''); if (m) { used[+m[1]] = true; } });
        var n = 1; while (used[n]) { n++; }
        return 'P-' + (n < 10 ? '00' : n < 100 ? '0' : '') + n;
    }
    // Comprimento desenhado, em metros, pela escala em uso (PXM).
    function polyLen(o) {
        var t = 0;
        for (var i = 1; i < o.length; i++) { t += Math.sqrt(Math.pow(o[i].x - o[i - 1].x, 2) + Math.pow(o[i].y - o[i - 1].y, 2)); }
        return t;
    }
    // {measured, total}: medido no desenho; total = medido + sobra, ou o manual.
    function linkMeters(L, find) {
        var r = routePts(L, find), med = r ? polyLen(r) / PXM : 0;
        var len = L.len || { mode: 'auto', m: 0, extra: 10 };
        var tot = len.mode === 'manual' ? (+len.m || 0) : med * (1 + (+len.extra || 0) / 100);
        return { measured: Math.round(med * 10) / 10, total: Math.round(tot * 10) / 10 };
    }
    // Texto que aparece no cabo: identificação, rótulo, metros e PoE.
    function linkText(L, find) {
        var parts = [];
        if (L.showId && L.cable) { parts.push(L.cable); }
        if (L.label) { parts.push(L.label); }
        if (L.showM && find) { var mt = linkMeters(L, find).total; if (mt > 0) { parts.push(fmtM(mt)); } }
        if (L.poe) { parts.push('PoE'); }
        return parts.join(' · ');
    }
    // Ponta de seta desenhada como triângulo (o PNG não depende de <marker>).
    function arrowHead(tip, from, k) {
        var ang = Math.atan2(tip.y - from.y, tip.x - from.x), len = 6 + k.w * 2.5, hw = 3 + k.w * 1.2;
        var bx = tip.x - len * Math.cos(ang), by = tip.y - len * Math.sin(ang);
        var px = -Math.sin(ang) * hw, py = Math.cos(ang) * hw;
        return '<path d="M' + tip.x.toFixed(1) + ' ' + tip.y.toFixed(1) + 'L' + (bx + px).toFixed(1) + ' ' + (by + py).toFixed(1)
            + 'L' + (bx - px).toFixed(1) + ' ' + (by - py).toFixed(1) + 'Z" fill="' + k.c + '"/>';
    }
    function linkD(pts) {
        return 'M' + pts.map(function (q) { return (+q.x).toFixed(1) + ' ' + (+q.y).toFixed(1); }).join('L');
    }

    /* ---------------- traçado (Q2c): reto, cotovelo, curvo ---------------- */
    var STUB = 14;   // o cotovelo sai reto da borda antes de dobrar
    function out(p, side, d) {
        return side === 'n' ? { x: p.x, y: p.y - d } : side === 's' ? { x: p.x, y: p.y + d } : side === 'o' ? { x: p.x - d, y: p.y } : { x: p.x + d, y: p.y };
    }
    // Liga os pontos só com trechos horizontais e verticais. A cada ponto,
    // vira perpendicular ao trecho anterior (Claudio, 27/09/2026: o cotovelo
    // fazia ganchos perto das pontas) e junta trechos alinhados.
    function orth(q) {
        var o = [q[0]], dir = '';
        for (var i = 1; i < q.length; i++) {
            var p = o[o.length - 1], c = q[i];
            if (Math.abs(p.x - c.x) > 0.5 && Math.abs(p.y - c.y) > 0.5) {
                o.push(dir === 'h' ? { x: p.x, y: c.y } : { x: c.x, y: p.y });
            }
            o.push(c);
            var a = o[o.length - 2], b = o[o.length - 1];
            if (Math.abs(a.x - b.x) > 0.5) { dir = 'h'; } else if (Math.abs(a.y - b.y) > 0.5) { dir = 'v'; }
        }
        return simplify(o);
    }
    function simplify(o) {
        var r = [];
        o.forEach(function (c) {
            var p = r[r.length - 1];
            if (p && Math.abs(p.x - c.x) < 0.5 && Math.abs(p.y - c.y) < 0.5) { return; }
            var q = r[r.length - 2];
            if (q && ((Math.abs(q.x - p.x) < 0.5 && Math.abs(p.x - c.x) < 0.5) || (Math.abs(q.y - p.y) < 0.5 && Math.abs(p.y - c.y) < 0.5))) { r[r.length - 1] = c; return; }
            r.push(c);
        });
        return r;
    }
    // Distância de um ponto a uma polilinha.
    function distPoly(pt, o) {
        var best = Infinity;
        for (var i = 1; i < o.length; i++) {
            var a = o[i - 1], b = o[i], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
            var t = l2 ? Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / l2)) : 0;
            var x = a.x + t * dx - pt.x, y = a.y + t * dy - pt.y;
            best = Math.min(best, x * x + y * y);
        }
        return best;
    }
    // Curva suave pelas dobras; nas pontas, sai perpendicular à borda.
    function curveSegs(L, P) {
        var segs = [], n = P.length;
        for (var i = 0; i < n - 1; i++) {
            var a = P[i], b = P[i + 1], len = Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2)) / 3;
            var c1 = i === 0 ? out(a, L.a.side, Math.max(20, len)) : { x: a.x + (b.x - P[i - 1].x) / 6, y: a.y + (b.y - P[i - 1].y) / 6 };
            var c2 = i === n - 2 ? out(b, L.b.side, Math.max(20, len)) : { x: b.x - (P[i + 2].x - a.x) / 6, y: b.y - (P[i + 2].y - a.y) / 6 };
            segs.push([a, c1, c2, b]);
        }
        return segs;
    }
    function bez(s, t) {
        var u = 1 - t;
        return { x: u * u * u * s[0].x + 3 * u * u * t * s[1].x + 3 * u * t * t * s[2].x + t * t * t * s[3].x,
                 y: u * u * u * s[0].y + 3 * u * u * t * s[1].y + 3 * u * t * t * s[2].y + t * t * t * s[3].y };
    }
    // Pontos do desenho (polilinha): serve para o rótulo, as setas e o PNG.
    function routePts(L, find) {
        var P = linkPts(L, find);
        if (!P) { return null; }
        var n = P.length;
        if (L.route === 'elbow') {
            return orth([P[0], out(P[0], L.a.side, STUB)].concat(P.slice(1, n - 1), [out(P[n - 1], L.b.side, STUB), P[n - 1]]));
        }
        if (L.route === 'curve') {
            var o = [P[0]];
            curveSegs(L, P).forEach(function (sg) { for (var k = 1; k <= 16; k++) { o.push(bez(sg, k / 16)); } });
            return o;
        }
        return P;
    }
    function routeD(L, find) {
        if (L.route === 'curve') {
            var P = linkPts(L, find);
            if (!P) { return ''; }
            var f = function (q) { return q.x.toFixed(1) + ' ' + q.y.toFixed(1); };
            return 'M' + f(P[0]) + curveSegs(L, P).map(function (sg) { return 'C' + f(sg[1]) + ' ' + f(sg[2]) + ' ' + f(sg[3]); }).join('');
        }
        var r = routePts(L, find);
        return r ? linkD(r) : '';
    }
    // Ponto a uma fração do traçado (0,5 = meio, onde fica o nome do cabo).
    function midPoint(pts, frac) {
        var tot = 0, i, seg = [];
        for (i = 1; i < pts.length; i++) { var l = Math.sqrt(Math.pow(pts[i].x - pts[i - 1].x, 2) + Math.pow(pts[i].y - pts[i - 1].y, 2)); seg.push(l); tot += l; }
        var half = tot * (frac === undefined ? 0.5 : frac);
        for (i = 0; i < seg.length; i++) {
            if (half <= seg[i] || i === seg.length - 1) {
                var k = seg[i] ? half / seg[i] : 0;
                return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * k, y: pts[i].y + (pts[i + 1].y - pts[i].y) * k };
            }
            half -= seg[i];
        }
        return pts[0];
    }
    function linkSvg(L, find, forExport) {
        var pts = routePts(L, find);
        if (!pts) { return ''; }
        var k = LINK_KINDS[L.kind] || LINK_KINDS[LINK_DEFAULT], d = routeD(L, find), h = '<g data-id="' + L.id + '">';
        // Faixa larga e invisível: facilita clicar no cabo (não vai para o PNG).
        // 14 px NA TELA em qualquer zoom (Claudio, 27/09/2026: com a planta
        // inteira à vista o cabo ficava com 3 a 4 px clicáveis).
        if (!forExport) { h += '<path d="' + d + '" fill="none" stroke="transparent" stroke-width="14" vector-effect="non-scaling-stroke"/>'; }
        h += '<path class="cx-board-link" d="' + d + '" fill="none" stroke="' + k.c + '" stroke-width="' + k.w
            + '" stroke-linecap="round" stroke-linejoin="round"' + (k.d ? ' stroke-dasharray="' + k.d + '"' : '') + '/>';
        var n = pts.length;
        if (L.ends === 'arrow' || L.ends === 'both') { h += arrowHead(pts[n - 1], pts[n - 2], k); }
        if (L.ends === 'both') { h += arrowHead(pts[0], pts[1], k); }
        var txt = linkText(L, find);
        if (txt) {
            // O nome do cabo acompanha os ícones das pontas, como o nome do
            // ícone (Claudio, 27/09/2026), com Pequeno/Médio/Grande no painel.
            var a = find(L.a.id), b = find(L.b.id);
            var fs = Math.max(7, Math.round(labelPx(Math.min(a.size, b.size)) * (LINK_FS[L.fs] || 1) * 2) / 2);
            var m = midPoint(pts), w = txt.length * fs * 0.56 + fs, bh = fs + 6;
            h += '<rect x="' + (m.x - w / 2).toFixed(1) + '" y="' + (m.y - bh / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + bh + '" rx="' + (bh / 4).toFixed(1)
                + '" fill="#ffffff" stroke="' + k.c + '" stroke-width="0.8"/>'
                + '<text x="' + m.x.toFixed(1) + '" y="' + (m.y + fs * 0.36).toFixed(1) + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="' + fs + '" fill="#1d2330">' + esc(txt) + '</text>';
        }
        return h + '</g>';
    }
    function ductMeters(d) { return Math.round(polyLen(d.pts) / PXM * 10) / 10; }
    function ductSvg(d, items, forExport) {
        var k = DUCT_KINDS[d.kind] || DUCT_KINDS.eletrocalha, pts = d.pts, dd = linkD(pts), h = '<g data-id="' + d.id + '">';
        if (!forExport) { h += '<path d="' + dd + '" fill="none" stroke="transparent" stroke-width="16" vector-effect="non-scaling-stroke"/>'; }
        h += '<path class="cx-board-duct" d="' + dd + '" fill="none" stroke="' + k.c + '" stroke-opacity="' + k.o + '" stroke-width="' + k.w + '" stroke-linejoin="miter" stroke-linecap="square"/>';
        if (k.mid) { h += '<path d="' + dd + '" fill="none" stroke="' + k.mid + '" stroke-opacity="0.6" stroke-width="1" stroke-dasharray="6 4"/>'; }
        var parts = [k.label];
        if (d.label) { parts.push(d.label); }
        if (d.showM) { parts.push(fmtM(ductMeters(d))); }
        var txt = parts.join(' · ');
        // Mesmo tamanho do nome dos cabos: segue o menor ícone do quadro.
        var sz = 48; (items || []).forEach(function (i) { if (i.t === 'icon') { sz = Math.min(sz, i.size); } });
        var fs = Math.max(7, Math.round(labelPx(sz) * (LINK_FS[d.fs] || 1) * 2) / 2);
        // A 1/4 do caminho: o cabo que passa por dentro põe o nome no meio.
        var m = midPoint(pts, 0.25), w = txt.length * fs * 0.56 + fs, bh = fs + 6, oy = k.w / 2 + bh / 2 + 2;
        h += '<rect x="' + (m.x - w / 2).toFixed(1) + '" y="' + (m.y - oy - bh / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + bh + '" rx="' + (bh / 4).toFixed(1)
            + '" fill="#ffffff" fill-opacity="0.9" stroke="#5F5E5A" stroke-width="0.6"/>'
            + '<text x="' + m.x.toFixed(1) + '" y="' + (m.y - oy + fs * 0.36).toFixed(1) + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="' + fs + '" fill="#444441">' + esc(txt) + '</text>';
        return h + '</g>';
    }
    function finder(items) {
        var map = {};
        items.forEach(function (i) { map[i.id] = i; });
        return function (id) { return map[id] || null; };
    }

    var TEXT_PX = { p: 12, m: 15, g: 20 };

    /* ---------------- desenho de um item (tela e PNG) ---------------- */
    function itemSvg(it, forExport) {
        if (it.t === 'zone') {
            return '<g data-id="' + it.id + '"><rect x="' + it.x + '" y="' + it.y + '" width="' + it.w + '" height="' + it.h
                + '" rx="10" fill="' + it.color + '" fill-opacity="0.05" stroke="' + it.color + '" stroke-width="2" stroke-dasharray="8 5"/>'
                + '<text x="' + (it.x + 12) + '" y="' + (it.y + 20) + '" font-family="Arial,sans-serif" font-size="13" fill="' + it.color + '">'
                + esc(it.label) + '</text></g>';
        }
        if (it.t === 'text') {
            var fs = TEXT_PX[it.size] || 15;
            var lines = String(it.text || (forExport ? '' : 'Texto')).split('\n');
            return '<g data-id="' + it.id + '"><text x="' + it.x + '" y="' + (it.y + fs) + '" font-family="Arial,sans-serif" font-size="' + fs + '" fill="' + it.color + '">'
                + lines.map(function (l, i) { return '<tspan x="' + it.x + '" dy="' + (i ? fs * 1.25 : 0) + '">' + esc(l) + '</tspan>'; }).join('')
                + '</text></g>';
        }
        var s = it.size, cx = it.x + s / 2, cy = it.y + s / 2, h = '';
        var cat = Icons().CATS[it.cat || (Icons().get(it.icon) || {}).cat] || Icons().CATS.infra;
        if (it.cone && it.cone.on) {
            var a1 = (it.cone.dir - it.cone.fov / 2) * Math.PI / 180, a2 = (it.cone.dir + it.cone.fov / 2) * Math.PI / 180, r = it.cone.m * PXM;
            h += '<path d="M' + cx + ' ' + cy + 'L' + (cx + r * Math.cos(a1)).toFixed(1) + ' ' + (cy + r * Math.sin(a1)).toFixed(1)
                + 'A' + r + ' ' + r + ' 0 ' + (it.cone.fov > 180 ? 1 : 0) + ' 1 ' + (cx + r * Math.cos(a2)).toFixed(1) + ' ' + (cy + r * Math.sin(a2)).toFixed(1)
                + 'Z" fill="' + cat.S + '" fill-opacity="0.12" stroke="' + cat.S + '" stroke-opacity="0.5" stroke-width="1"/>'
                + '<text x="' + (cx + (r + 10) * Math.cos(it.cone.dir * Math.PI / 180)).toFixed(1) + '" y="' + (cy + (r + 10) * Math.sin(it.cone.dir * Math.PI / 180) + 4).toFixed(1)
                + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="' + Math.max(9, labelPx(it.size) - 1) + '" fill="' + cat.S + '">' + fmtM(it.cone.m) + '</text>';
        }
        // Câmera: gira com a direção da visão (o ícone aponta para a direita).
        // Demais ícones: giro próprio. O nome embaixo não gira.
        var ang = it.cone ? it.cone.dir : (it.rot || 0);
        var rot = ang ? ' transform="rotate(' + ang + ' ' + cx + ' ' + cy + ')"' : '';
        h += '<g' + rot + '><svg x="' + it.x + '" y="' + it.y + '" width="' + s + '" height="' + s + '" viewBox="0 0 48 48">'
            + Icons().body(it.icon, it.cat) + '</svg></g>';
        // O nome acompanha o tamanho do ícone (Claudio, 26/09/2026).
        var fs = labelPx(s), ty = it.y + s + fs + 1;
        if (it.label) {
            h += '<text x="' + cx + '" y="' + ty + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="' + fs + '" fill="#1d2330">' + esc(it.label) + '</text>';
            ty += fs + 1;
        }
        if (it.f && it.f.ip) {
            h += '<text x="' + cx + '" y="' + ty + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="' + Math.max(8, fs - 1) + '" fill="#6b7280">' + esc(it.f.ip) + '</text>';
        }
        return '<g data-id="' + it.id + '">' + h + '</g>';
    }

    function labelPx(size) { return Math.max(8, Math.round(size / 4)); }
    function fmtM(m) { return String(m).replace('.', ',') + ' m'; }

    /* Q3a — lista de materiais do quadro (Claudio, 27/09/2026). Só leitura.
         Equipamentos: um por ícone, pelo nome do ícone (Equipamento genérico:
           pelo rótulo); com Modelo preenchido, "Nome · Modelo".
         Cabos: metragem que o cabo já mostra (automática com sobra, ou
           manual), arredondada PARA CIMA em cada lance e somada por tipo.
           Sem fio e Lógica/VPN não entram (não são cabo comprado).
         Eletrocalha e canaleta: metros de cada trecho, para cima, sem sobra.
         Áreas, zonas e textos não contam.
       only (lista de ids): só a seleção; entra também a ligação entre dois
       ícones selecionados, porque a seleção em área não pega cabo. */
    var MAT_SKIP = ['semfio', 'logica'];
    function materials(D, only) {
        PXM = D.pxm || PXM_DEFAULT;
        var I = Icons(), all = D.items || [], find = finder(all);
        var has = function (id) { return !only || only.indexOf(id) >= 0; };
        var eq = {}, cab = {}, duc = {}, eqN = 0;
        all.forEach(function (it) {
            if (it.t === 'icon' && has(it.id)) {
                var ic = I.get(it.icon) || {}, base = ic.name || 'Ícone';
                if (it.icon === 'generico' && String(it.label || '').trim()) { base = String(it.label).trim(); }
                var mod = String((it.f && it.f.modelo) || '').trim(), nm = mod ? base + ' · ' + mod : base;
                eq[nm] = (eq[nm] || 0) + 1; eqN++;
            } else if (it.t === 'link' && (has(it.id) || (only && has(it.a.id) && has(it.b.id)))) {
                var k = LINK_KINDS[it.kind] ? it.kind : LINK_DEFAULT;
                if (MAT_SKIP.indexOf(k) >= 0) { return; }
                var c = cab[k] || (cab[k] = { n: 0, m: 0 });
                c.n++; c.m += Math.ceil(linkMeters(it, find).total);
            } else if (it.t === 'duct' && has(it.id)) {
                var dk = DUCT_KINDS[it.kind] ? it.kind : 'eletrocalha';
                var d = duc[dk] || (duc[dk] = { n: 0, m: 0 });
                d.n++; d.m += Math.ceil(ductMeters(it));
            }
        });
        return {
            eqN: eqN,
            eq: Object.keys(eq).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); }).map(function (k) { return { name: k, n: eq[k] }; }),
            cables: Object.keys(LINK_KINDS).filter(function (k) { return cab[k]; }).map(function (k) { return { kind: k, label: LINK_KINDS[k].label, color: LINK_KINDS[k].c, n: cab[k].n, m: cab[k].m }; }),
            ducts: Object.keys(DUCT_KINDS).filter(function (k) { return duc[k]; }).map(function (k) { return { kind: k, label: DUCT_KINDS[k].label, n: duc[k].n, m: duc[k].m }; }),
            approx: !D.pxm
        };
    }
    function materialsHtml(M, title) {
        var row = function (a, b) { return '<div class="cx-mat-row"><span>' + a + '</span><span>' + b + '</span></div>'; };
        var h = '<div class="cx-mat"><p class="cx-mat-title">' + esc(title) + '</p>';
        if (!M.eq.length && !M.cables.length && !M.ducts.length) {
            return h + '<p class="cx-board-none">Nada para contar ainda: coloque ícones, cabos ou eletrocalha.</p></div>';
        }
        if (M.eq.length) {
            h += '<p class="cx-mat-sec">Equipamentos · ' + M.eqN + '</p>'
                + M.eq.map(function (e) { return row(esc(e.name), String(e.n)); }).join('');
        }
        if (M.cables.length) {
            h += '<p class="cx-mat-sec">Cabos · metro inteiro por lance</p>'
                + M.cables.map(function (c) {
                    return row('<i class="cx-mat-sw" style="background:' + c.color + '"></i>' + esc(c.label)
                        + ' <span class="cx-mat-n">· ' + c.n + (c.n === 1 ? ' lance' : ' lances') + '</span>', c.m + ' m');
                }).join('');
        }
        if (M.ducts.length) {
            h += '<p class="cx-mat-sec">Infraestrutura</p>'
                + M.ducts.map(function (d) { return row(esc(d.label), d.m + ' m'); }).join('');
        }
        if (M.approx && (M.cables.length || M.ducts.length)) {
            h += '<p class="cx-mat-warn">Sem escala: metros aproximados (1 m = ' + PXM_DEFAULT + ' px). Use "Escala" na barra para medir pela planta.</p>';
        }
        return h + '<p class="cx-board-none">Sem fio e Lógica/VPN não entram. Áreas e textos não contam.</p></div>';
    }

    function bbox(it) {
        if (it.t === 'zone') { return { x: it.x, y: it.y, w: it.w, h: it.h }; }
        if (it.t === 'duct') {
            var xs = it.pts.map(function (q) { return q.x; }), ys = it.pts.map(function (q) { return q.y; }), pd = (DUCT_KINDS[it.kind] || DUCT_KINDS.eletrocalha).w / 2 + 2;
            var bx = Math.min.apply(null, xs) - pd, by = Math.min.apply(null, ys) - pd;
            return { x: bx, y: by, w: Math.max.apply(null, xs) + pd - bx, h: Math.max.apply(null, ys) + pd - by };
        }
        if (it.t === 'text') {
            var fs = TEXT_PX[it.size] || 15, lines = String(it.text || 'Texto').split('\n');
            var w = Math.max.apply(null, lines.map(function (l) { return l.length; })) * fs * 0.55;
            return { x: it.x, y: it.y, w: Math.max(30, w), h: lines.length * fs * 1.25 + 4 };
        }
        var lp = labelPx(it.size) + 1;
        var extra = (it.label ? lp : 0) + (it.f && it.f.ip ? lp : 0);
        return { x: it.x, y: it.y, w: it.size, h: it.size + extra + (extra ? 4 : 0) };
    }

    /* ---------------- PNG do quadro ---------------- */
    function toPng(data, bgImg) {
        PXM = data.pxm || PXM_DEFAULT;
        var box;
        if (bgImg) {
            box = { x: 0, y: 0, w: data.w, h: data.h };
        } else {
            var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
            var fnd = finder(data.items);
            data.items.forEach(function (it) {
                if (it.t === 'link') {
                    (routePts(it, fnd) || []).forEach(function (q) { x1 = Math.min(x1, q.x); y1 = Math.min(y1, q.y); x2 = Math.max(x2, q.x); y2 = Math.max(y2, q.y); });
                    return;
                }
                var b = bbox(it);
                if (it.cone && it.cone.on) {
                    var c = { x: it.x + it.size / 2, y: it.y + it.size / 2 }, r = it.cone.m * PXM + 30;
                    x1 = Math.min(x1, c.x - r); y1 = Math.min(y1, c.y - r); x2 = Math.max(x2, c.x + r); y2 = Math.max(y2, c.y + r);
                }
                x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.w); y2 = Math.max(y2, b.y + b.h);
            });
            if (!isFinite(x1)) { x1 = 0; y1 = 0; x2 = 400; y2 = 200; }
            box = { x: x1 - 24, y: y1 - 24, w: x2 - x1 + 48, h: y2 - y1 + 48 };
        }
        var find = finder(data.items);
        var k = Math.min(2, 2400 / Math.max(box.w, box.h));
        var W = Math.round(box.w * k), H = Math.round(box.h * k);
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="' + box.x + ' ' + box.y + ' ' + box.w + ' ' + box.h + '">'
            + '<rect x="' + box.x + '" y="' + box.y + '" width="' + box.w + '" height="' + box.h + '" fill="#ffffff"/>'
            + (bgImg ? '<image href="' + bgImg + '" x="0" y="0" width="' + data.w + '" height="' + data.h + '" opacity="' + data.bgOpacity + '"/>' : '')
            + data.items.filter(function (i) { return i.t === 'zone'; }).map(function (i) { return itemSvg(i, true); }).join('')
            + data.items.filter(function (i) { return i.t === 'duct'; }).map(function (i) { return ductSvg(i, data.items, true); }).join('')
            + data.items.filter(function (i) { return i.t === 'link'; }).map(function (i) { return linkSvg(i, find, true); }).join('')
            + data.items.filter(function (i) { return ['zone', 'link', 'duct'].indexOf(i.t) < 0; }).map(function (i) { return itemSvg(i, true); }).join('')
            + '</svg>';
        return rasterize(svg, W, H);
    }

    function rasterize(svg, W, H) {
        return new Promise(function (ok, fail) {
            var img = new Image();
            img.onload = function () {
                var cv = document.createElement('canvas');
                cv.width = W; cv.height = H;
                cv.getContext('2d').drawImage(img, 0, 0, W, H);
                cv.toBlob(function (b) { if (b) { ok(b); } else { fail(new Error('png')); } }, 'image/png');
            };
            img.onerror = function () { fail(new Error('svg')); };
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        });
    }

    /* ---------------- legenda (Q3b, Claudio 27/09/2026) ----------------
       Imagem própria, gravada logo abaixo do quadro (span.cx-board-legend,
       arquivo cx-quadro-legenda-*.png). Um item por tipo USADO: cabos (Sem
       fio e Lógica também: aparecem no desenho), eletrocalha/canaleta e
       ícones com o desenho da paleta. Zonas e textos não entram. */
    function legendEntries(D) {
        var I = Icons(), items = D.items || [], out = [], seen = {};
        Object.keys(LINK_KINDS).forEach(function (k) {
            if (items.some(function (i) { return i.t === 'link' && (LINK_KINDS[i.kind] ? i.kind : LINK_DEFAULT) === k; })) {
                out.push({ t: 'link', k: k, name: LINK_KINDS[k].label });
            }
        });
        Object.keys(DUCT_KINDS).forEach(function (k) {
            if (items.some(function (i) { return i.t === 'duct' && (DUCT_KINDS[i.kind] ? i.kind : 'eletrocalha') === k; })) {
                out.push({ t: 'duct', k: k, name: DUCT_KINDS[k].label });
            }
        });
        var cats = Object.keys(I.CATS), icons = [];
        items.forEach(function (i) {
            if (i.t !== 'icon') { return; }
            var ic = I.get(i.icon) || I.get('generico') || { name: 'Ícone', cat: 'infra' };
            var gen = i.icon === 'generico', cat = (gen && i.cat) || ic.cat;
            var name = gen ? (String(i.label || '').trim() || ic.name + ' (' + ((I.CATS[cat] || {}).label || cat) + ')') : ic.name;
            var key = gen ? 'generico|' + cat + '|' + name : i.icon;
            if (seen[key]) { return; }
            seen[key] = true;
            icons.push({ t: 'icon', icon: i.icon, cat: gen ? cat : '', name: name, ord: cats.indexOf(cat) });
        });
        icons.sort(function (a, b) { return (a.ord - b.ord) || a.name.localeCompare(b.name, 'pt-BR'); });
        return out.concat(icons);
    }
    function legendSvg(D) {
        var E = legendEntries(D);
        if (!E.length) { return null; }
        var cols = E.length > 16 ? 3 : (E.length > 6 ? 2 : 1), rows = Math.ceil(E.length / cols);
        var PAD = 12, CW = 250, RH = 28, TOP = 34;
        var w = PAD * 2 + cols * CW, h = TOP + rows * RH + 8;
        var cut = function (t) { t = String(t); return t.length > 32 ? t.slice(0, 31) + '…' : t; };
        var body = E.map(function (e, n) {
            var x = PAD + Math.floor(n / rows) * CW, y = TOP + (n % rows) * RH, cy = y + RH / 2, g = '';
            if (e.t === 'link') {
                var L = LINK_KINDS[e.k];
                g += '<line x1="' + (x + 2) + '" y1="' + cy + '" x2="' + (x + 32) + '" y2="' + cy + '" stroke="' + L.c + '" stroke-width="' + (L.w + 0.6) + '"'
                    + (L.d ? ' stroke-dasharray="' + L.d + '"' : '') + ' stroke-linecap="round"/>';
                if (L.arrow) { g += '<path d="M' + (x + 34) + ' ' + cy + ' l-7 -4 v8 z" fill="' + L.c + '"/>'; }
            } else if (e.t === 'duct') {
                var K = DUCT_KINDS[e.k];
                g += '<line x1="' + (x + 2) + '" y1="' + cy + '" x2="' + (x + 34) + '" y2="' + cy + '" stroke="' + K.c + '" stroke-opacity="' + K.o + '" stroke-width="' + K.w + '"/>';
                if (K.mid) { g += '<line x1="' + (x + 2) + '" y1="' + cy + '" x2="' + (x + 34) + '" y2="' + cy + '" stroke="' + K.mid + '" stroke-opacity="0.6" stroke-width="1" stroke-dasharray="6 4"/>'; }
            } else {
                g += '<svg x="' + (x + 6) + '" y="' + (y + 2) + '" width="24" height="24" viewBox="0 0 48 48">' + Icons().body(e.icon, e.cat || undefined) + '</svg>';
            }
            return g + '<text x="' + (x + 44) + '" y="' + (cy + 4.5) + '" font-family="Arial,sans-serif" font-size="13" fill="#1d2330">' + esc(cut(e.name)) + '</text>';
        }).join('');
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + (w * 2) + '" height="' + (h * 2) + '" viewBox="0 0 ' + w + ' ' + h + '">'
            + '<rect x="0.5" y="0.5" width="' + (w - 1) + '" height="' + (h - 1) + '" rx="4" fill="#ffffff" stroke="#c9d1db"/>'
            + '<text x="' + PAD + '" y="22" font-family="Arial,sans-serif" font-size="14" font-weight="bold" fill="#1d2330">Legenda</text>'
            + body + '</svg>';
        return { svg: svg, W: w * 2, H: h * 2, n: E.length };
    }
    function legendPng(D) {
        var L = legendSvg(D);
        // PNG em 2x; no documento a imagem leva width/height de 1x (o GLPI
        // mantém esses dois atributos ao trocar a tag, achado 56).
        return L ? rasterize(L.svg, L.W, L.H).then(function (b) { return { blob: b, w: L.W / 2, h: L.H / 2 }; }) : Promise.resolve(null);
    }

    /* ---------------- imagem: carregar e converter ---------------- */
    function fileToDataUrl(file, max) {
        return new Promise(function (ok, fail) {
            var rd = new FileReader();
            rd.onload = function () {
                var im = new Image();
                im.onload = function () {
                    var k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
                    var cv = document.createElement('canvas');
                    cv.width = Math.round(im.naturalWidth * k); cv.height = Math.round(im.naturalHeight * k);
                    var g = cv.getContext('2d');
                    g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
                    g.drawImage(im, 0, 0, cv.width, cv.height);
                    ok({ url: cv.toDataURL('image/jpeg', 0.85), w: cv.width, h: cv.height });
                };
                im.onerror = function () { fail(new Error('img')); };
                im.src = rd.result;
            };
            rd.onerror = function () { fail(new Error('file')); };
            rd.readAsDataURL(file);
        });
    }
    function urlToDataUrl(url) {
        return fetch(url, { credentials: 'same-origin' }).then(function (r) {
            if (!r.ok) { throw new Error('img'); }
            return r.blob();
        }).then(function (b) {
            return new Promise(function (ok) { var rd = new FileReader(); rd.onload = function () { ok(rd.result); }; rd.readAsDataURL(b); });
        });
    }
    function dataUrlToBlob(u) {
        var p = u.split(','), mime = (p[0].match(/:(.*?);/) || [])[1] || 'image/png';
        var bin = atob(p[1]), arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) { arr[i] = bin.charCodeAt(i); }
        return new Blob([arr], { type: mime });
    }

    /* A planta de fundo é a PRIMEIRA de duas imagens do quadro: ao salvar, o
       GLPI troca a <img> e perde a classe cx-board-bg (achado 56). */
    function bgOf(wrap) {
        var imgs = wrap.querySelectorAll('img');
        return wrap.querySelector('img.cx-board-bg') || (imgs.length > 1 ? imgs[0] : null);
    }

    /* ---------------- gravar no editor ---------------- */
    function uploadImg(editor, imgEl, blob, name) {
        var up = new Blob([blob], { type: blob.type || 'image/png' });
        up.name = name;
        var id = Math.random().toString();
        var url = URL.createObjectURL(up);
        editor.dom.setAttribs(imgEl, { src: url, 'data-mce-src': url, 'data-upload_id': id, width: null, height: null, id: null });
        if (Array.isArray(window.uploaded_images) && typeof window.uploadFile === 'function') {
            window.uploaded_images.push({ upload_id: id, filename: name });
            window.uploadFile(up, editor);
            return true;
        }
        return false;
    }

    /* Legenda: bloco logo depois do quadro. No mesmo parágrafo (irmão do
       invólucro) ou no parágrafo seguinte, que é onde apply() a cria. */
    function blockOf(el, body) {
        var n = el;
        while (n && n.parentNode && n.parentNode !== body) { n = n.parentNode; }
        return n && n.parentNode === body ? n : null;
    }
    function legendOf(wrap, body) {
        var sib = wrap.nextElementSibling;
        if (sib && sib.matches && sib.matches('span.cx-board-legend')) { return sib; }
        var b = blockOf(wrap, body), nx = b && b !== wrap ? b.nextElementSibling : null;
        var first = nx && nx.firstElementChild;
        return first && first.matches('span.cx-board-legend') ? first : null;
    }
    function boardOfLegend(lg, body) {
        var sib = lg.previousElementSibling;
        if (sib && sib.matches && sib.matches('span.cx-board')) { return sib; }
        var b = blockOf(lg, body), pv = b && b !== lg ? b.previousElementSibling : null;
        if (!pv) { return null; }
        if (pv.matches('span.cx-board')) { return pv; }
        var all = pv.querySelectorAll('span.cx-board');
        return all.length ? all[all.length - 1] : null;
    }

    function apply(editor, node, data, png, bg, legend) {
        var dom = editor.dom, ok = true, stamp = Date.now();
        editor.undoManager.transact(function () {
            var wrap = node;
            if (!wrap) {
                editor.focus();
                // Marcador só de texto: uma <img data:> aqui seria enviada pelo
                // glpi_upload_doc (achado 60) e trocada no meio do caminho.
                editor.insertContent('<span class="cx-board" data-cx-new="1">\u200b</span><p><br></p>');
                wrap = editor.getBody().querySelector('span.cx-board[data-cx-new]');
                wrap.removeAttribute('data-cx-new');
                wrap.textContent = '';
            }
            dom.setAttrib(wrap, 'data-cx-board', JSON.stringify(data));
            var bgEl = bgOf(wrap);
            var imgs = Array.prototype.filter.call(wrap.querySelectorAll('img'), function (i) { return i !== bgEl; });
            var main = imgs[imgs.length - 1];
            if (!main) { main = dom.create('img', { alt: '' }); wrap.appendChild(main); }
            main.setAttribute('style', 'max-width:100%;height:auto;');
            if (bg && bg.changed) {
                if (!bgEl) { bgEl = dom.create('img', { 'class': 'cx-board-bg', alt: '' }); wrap.insertBefore(bgEl, main); }
                ok = uploadImg(editor, bgEl, dataUrlToBlob(bg.url), 'cx-quadro-fundo-' + stamp + '.jpg') && ok;
            } else if (!bg && bgEl) {
                bgEl.parentNode.removeChild(bgEl);
            }
            ok = uploadImg(editor, main, png, 'cx-quadro-' + stamp + '.png') && ok;
            // Q3b: legenda abaixo do quadro (cria, troca a imagem ou tira).
            var body = editor.getBody(), lg = legendOf(wrap, body);
            if (legend) {
                if (!lg) {
                    lg = dom.create('span', { 'class': 'cx-board-legend', contenteditable: 'false' });
                    var b = blockOf(wrap, body);
                    if (b && b !== wrap) {
                        var p = dom.create('p');
                        p.appendChild(lg);
                        dom.insertAfter(p, b);
                    } else {
                        dom.insertAfter(lg, wrap);
                    }
                }
                var li = lg.querySelector('img');
                if (!li) { li = dom.create('img', { alt: 'Legenda' }); lg.appendChild(li); }
                li.setAttribute('style', 'max-width:100%;height:auto;');
                ok = uploadImg(editor, li, legend.blob, 'cx-quadro-legenda-' + stamp + '.png') && ok;
                dom.setAttribs(li, { width: legend.w, height: legend.h });
            } else if (lg) {
                var pp = lg.parentNode;
                pp.removeChild(lg);
                if (pp !== body && pp.nodeName === 'P' && !pp.querySelector('img,span.cx-board') && !(pp.textContent || '').replace(/[\s\u200b\u00a0]/g, '')) {
                    pp.parentNode.removeChild(pp);
                }
            }
        });
        editor.nodeChanged();
        editor.setDirty(true);
        return ok;
    }

    /* ======================================================================
       Janela do quadro
       ====================================================================== */
    function open(editor, node, mode) {
        var raw = null, bgUrl = '', bgChanged = false;
        if (node) {
            try { raw = JSON.parse(node.getAttribute('data-cx-board') || 'null'); } catch (e) { raw = null; }
            var bgEl = bgOf(node);
            bgUrl = bgEl ? (bgEl.getAttribute('src') || '') : '';
        }
        var ready = loadLibrary();
        if (bgUrl) {
            if (/^blob:|^data:/.test(bgUrl) && !/docid=/.test(bgUrl)) {
                notify(editor, 'Salve o documento antes de editar este quadro de novo: a planta ainda está sendo enviada.', 'error');
                return;
            }
            ready = ready.then(function () { return urlToDataUrl(bgUrl); }).then(function (u) { bgUrl = u; }).catch(function () { bgUrl = ''; });
        }
        ready.then(function () { build(editor, node, clean(raw, mode), bgUrl, bgChanged); });
    }

    function pngName(mode, now) {
        var t = document.querySelector('input[name="name"]');
        var slug = String(t && t.value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
        var d = now || new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
        return (mode === 'topologia' ? 'topologia' : 'planta') + (slug ? '-' + slug : '')
            + '-' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '.png';
    }

    function notify(editor, text, type) {
        if (editor && editor.notificationManager) {
            editor.notificationManager.open({ text: text, type: type || 'info', timeout: type === 'error' ? 0 : 4000 });
        } else { window.alert(text); }
    }

    function build(editor, node, D, bgUrl, bgChanged) {
        var hist = [], redo = [], sel = [], tool = 'select', clip = null;
        var view = { z: 1, x: 40, y: 40 };
        var I = Icons();

        var root = document.createElement('div');
        root.className = 'cx-board-modal';
        root.innerHTML =
            '<div class="cx-board-top">'
            + '<strong class="cx-board-title">' + esc(MODES[D.mode]) + '</strong>'
            + '<div class="cx-board-tools">'
            + '<button type="button" data-tool="select" title="Selecionar e mover (V)">Selecionar</button>'
            + '<button type="button" data-tool="zone" title="Desenhar zona / área (Z)">' + (D.mode === 'planta' ? 'Área' : 'Zona') + '</button>'
            + '<button type="button" data-tool="text" title="Texto (T)">Texto</button>'
            + '<button type="button" data-tool="duct" title="Eletrocalha / canaleta: clique os pontos; duplo clique ou Enter termina; Esc cancela (E)">Eletrocalha</button>'
            + '<button type="button" data-tool="scale" title="Escala: clique em dois pontos da planta e informe a distância real">Escala</button>'
            + '<span class="cx-board-scale"></span>'
            + '<span class="cx-board-sep"></span>'
            + '<button type="button" data-act="group" title="Agrupar (Ctrl+G)">Agrupar</button>'
            + '<button type="button" data-act="ungroup" title="Desagrupar (Ctrl+Shift+G)">Desagrupar</button>'
            + '<button type="button" data-act="lock" title="Travar / destravar">Travar</button>'
            + '<button type="button" data-act="del" title="Excluir (Delete)">Excluir</button>'
            + '<span class="cx-board-sep"></span>'
            + '<button type="button" data-act="smaller" title="Diminuir ícones (os selecionados; sem seleção, todos)">Ícone −</button>'
            + '<button type="button" data-act="bigger" title="Aumentar ícones (os selecionados; sem seleção, todos)">Ícone +</button>'
            + '<button type="button" data-act="rotate" title="Girar os ícones selecionados 90° (R)">Girar 90°</button>'
            + '<span class="cx-board-sep"></span>'
            + '<button type="button" data-act="undo" title="Desfazer (Ctrl+Z)">↶</button>'
            + '<button type="button" data-act="redo" title="Refazer (Ctrl+Y)">↷</button>'
            + '<span class="cx-board-sep"></span>'
            + '<button type="button" data-act="zout" title="Afastar">−</button><span class="cx-board-zoom">100%</span>'
            + '<button type="button" data-act="zin" title="Aproximar">+</button>'
            + '<button type="button" data-act="fit" title="Ajustar à tela">Ajustar</button>'
            + (D.mode === 'planta'
                ? '<span class="cx-board-sep"></span><button type="button" data-act="bg">' + (bgUrl ? 'Trocar planta' : 'Enviar planta') + '</button>'
                  + '<label class="cx-board-op" title="Transparência da planta">Planta <input type="range" min="10" max="100" step="5" data-act="op" value="' + Math.round(D.bgOpacity * 100) + '"></label>'
                  + '<button type="button" data-act="rot" title="Girar a planta 90° (os itens giram junto)"' + (bgUrl ? '' : ' hidden') + '>Girar planta</button>'
                  + '<button type="button" data-act="bgdel"' + (bgUrl ? '' : ' hidden') + '>Tirar planta</button>'
                : '')
            + '</div>'
            + '<span class="cx-board-spacer"></span>'
            + '<label class="cx-board-op" title="Gera, ao salvar, uma imagem com os símbolos usados, logo abaixo do quadro no documento"><input type="checkbox" data-act="legend"' + (D.legend ? ' checked' : '') + '> Legenda abaixo do quadro</label>'
            + '<button type="button" data-act="png" title="Baixar o quadro como imagem PNG (como está agora, mesmo sem salvar)">Baixar PNG</button>'
            + '<button type="button" data-act="cancel">Cancelar</button>'
            + '<button type="button" data-act="save" class="cx-board-ok">' + (node ? 'Salvar quadro' : 'Inserir no documento') + '</button>'
            + '</div>'
            + '<div class="cx-board-body">'
            + '<aside class="cx-board-pal"><div class="cx-board-pal-top"><input type="search" class="cx-board-q" placeholder="Buscar ícone">'
            + (LIB.canCreate ? '<button type="button" class="cx-board-newic" title="Criar um ícone a partir de uma imagem (Super-Admin)">+ Ícone</button>' : '')
            + '</div><div class="cx-board-icons"></div></aside>'
            + '<div class="cx-board-stage"><svg class="cx-board-svg" xmlns="' + NS + '"><g class="vp">'
            + '<rect class="cx-board-paper"/><image class="cx-board-bgimg" preserveAspectRatio="none"/>'
            + '<g class="cx-board-zones"></g><g class="cx-board-ducts"></g><g class="cx-board-links"></g><g class="cx-board-items"></g><g class="cx-board-sel"></g><g class="cx-board-guides"></g>'
            + '<rect class="cx-board-marq" hidden/></g></svg>'
            + '<div class="cx-board-hint">Arraste um ícone da paleta para o quadro. Segure e arraste o fundo para mover a vista; roda do mouse dá zoom; Shift + arrastar seleciona em área. Com um ícone selecionado, puxe uma das alças azuis até outro ícone para ligar.</div></div>'
            + '<aside class="cx-board-props"></aside>'
            + '</div>';
        document.body.appendChild(root);
        document.documentElement.classList.add('cx-board-open');

        var svg = root.querySelector('.cx-board-svg'), vp = root.querySelector('.vp');
        var paper = root.querySelector('.cx-board-paper'), bgImgEl = root.querySelector('.cx-board-bgimg');
        var gZones = root.querySelector('.cx-board-zones'), gItems = root.querySelector('.cx-board-items');
        var gLinks = root.querySelector('.cx-board-links'), gDucts = root.querySelector('.cx-board-ducts');
        var ductDraft = null;   // pontos da eletrocalha em desenho
        var gSel = root.querySelector('.cx-board-sel'), gGuides = root.querySelector('.cx-board-guides');
        var marq = root.querySelector('.cx-board-marq'), props = root.querySelector('.cx-board-props');

        /* ---------- paleta ---------- */
        function paleta() {
            var q = (root.querySelector('.cx-board-q').value || '').trim().toLowerCase();
            var h = '';
            Object.keys(I.CATS).forEach(function (ck) {
                var ls = I.LIST.filter(function (r) { return r[2] === ck && (!q || (r[1] + ' ' + r[3]).toLowerCase().indexOf(q) >= 0); });
                if (!ls.length) { return; }
                h += '<div class="cx-board-cat">' + esc(I.CATS[ck].label) + '</div><div class="cx-board-grid">';
                ls.forEach(function (r) {
                    h += '<button type="button" class="cx-board-ic" data-icon="' + r[0] + '" title="' + esc(r[1]) + '">'
                        + '<svg viewBox="0 0 48 48" width="34" height="34">' + I.body(r[0]) + '</svg><span>' + esc(r[1]) + '</span>'
                        + ((I.get(r[0]) || {}).custom ? '<i class="cx-board-own" title="Criado na instalação"></i>' : '') + '</button>';
                });
                h += '</div>';
            });
            root.querySelector('.cx-board-icons').innerHTML = (h || '<p class="cx-board-none">Nenhum ícone. Use o Equipamento genérico.</p>')
                + (LIB.canCreate && I.customs().length ? '<button type="button" class="cx-board-mgic">Gerenciar ícones criados (' + I.customs().length + ')</button>' : '');
        }
        root.querySelector('.cx-board-q').addEventListener('input', paleta);

        /* ---------- Q4a: novo ícone a partir de imagem (Super-Admin) ----------
           Recorte quadrado arrastável sobre a imagem; sai um PNG de 256 px
           (nada do arquivo original é guardado). Grava em ajax/icons.php. */
        var ni = null;   // janela aberta
        // Q4b-2: 256 px (antes 96, pixelava com zoom, ícone grande e PNG em 2x).
        var NI_BOX = 240, NI_OUT = 256, NI_MAX = 2 * 1024 * 1024;
        function niClose() { if (ni) { ni.el.remove(); ni = null; } }
        function niOpen() {
            if (ni) { return; }
            var cats = Object.keys(I.CATS).map(function (k) { return '<option value="' + k + '">' + esc(I.CATS[k].label) + '</option>'; }).join('');
            var el = document.createElement('div');
            el.className = 'cx-ni-back';
            el.innerHTML = '<div class="cx-ni" role="dialog" aria-label="Novo ícone">'
                + '<div class="cx-ni-main">'
                + '<label class="cx-ni-file"><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"> <span>Escolher imagem</span></label>'
                + '<div class="cx-ni-stage"><canvas width="' + NI_BOX + '" height="' + NI_BOX + '"></canvas><div class="cx-ni-crop" hidden></div></div>'
                + '<label class="cx-board-f"><span>Tamanho do recorte</span><input type="range" min="10" max="100" step="1" value="100" data-ni="size"></label>'
                + '<p class="cx-board-none">Arraste o quadrado para escolher a parte da imagem. PNG, JPG, WebP ou SVG, até 2 MB.</p>'
                + '<label class="cx-board-chk"><input type="checkbox" data-ni="bg" checked> Tirar o fundo <span class="cx-ni-muted">(cor dos cantos)</span></label>'
                + '<label class="cx-board-f cx-ni-tol"><span>Tolerância</span><input type="range" min="0" max="100" step="1" value="30" data-ni="tol"></label>'
                + '<div class="cx-ni-mode" role="group" aria-label="Cor do ícone">'
                + '<button type="button" data-ni-mode="color" class="is-on">Cor original</button>'
                + '<button type="button" data-ni-mode="mask">Silhueta na cor da categoria</button></div>'
                + '</div><div class="cx-ni-side">'
                + '<p class="cx-ni-title">Novo ícone</p>'
                + '<label class="cx-board-f"><span>Nome</span><input type="text" maxlength="60" data-ni="name" placeholder="Guarita"></label>'
                + '<label class="cx-board-f"><span>Categoria (cor)</span><select data-ni="cat">' + cats + '</select></label>'
                + '<label class="cx-board-f"><span>Busca (palavras)</span><input type="text" maxlength="200" data-ni="search" placeholder="portaria cabine vigia"></label>'
                + '<p class="cx-board-sub">Prévia</p><div class="cx-ni-prev"><img alt="" width="48" height="48"><img alt="" width="32" height="32"><img alt="" width="22" height="22"></div>'
                + '<p class="cx-ni-err" hidden></p>'
                + '<div class="cx-ni-btns"><button type="button" data-ni="cancel">Cancelar</button><button type="button" data-ni="save" class="cx-board-ok">Salvar ícone</button></div>'
                + '</div></div>';
            root.appendChild(el);
            ni = { el: el, img: null, s: 1, ox: 0, oy: 0, iw: 0, ih: 0, cx: 0, cy: 0, cs: 0, out: '', mode: 'color' };
            var cv = el.querySelector('canvas'), crop = el.querySelector('.cx-ni-crop');
            var q = function (k) { return el.querySelector('[data-ni="' + k + '"]'); };
            var err = el.querySelector('.cx-ni-err');
            var fail = function (t) { err.textContent = t; err.hidden = !t; };
            var draw = function () {
                var g = cv.getContext && cv.getContext('2d');
                if (!g || !ni.img) { return; }
                g.clearRect(0, 0, NI_BOX, NI_BOX);
                g.drawImage(ni.img, ni.ox, ni.oy, ni.iw * ni.s, ni.ih * ni.s);
                crop.hidden = false;
                crop.style.left = ni.cx + 'px'; crop.style.top = ni.cy + 'px';
                crop.style.width = ni.cs + 'px'; crop.style.height = ni.cs + 'px';
                var o = document.createElement('canvas');
                o.width = NI_OUT; o.height = NI_OUT;
                var og = o.getContext && o.getContext('2d');
                if (!og) { return; }
                og.imageSmoothingEnabled = true;
                og.imageSmoothingQuality = 'high';
                og.drawImage(ni.img, (ni.cx - ni.ox) / ni.s, (ni.cy - ni.oy) / ni.s, ni.cs / ni.s, ni.cs / ni.s, 0, 0, NI_OUT, NI_OUT);
                // Q4b: fundo e silhueta, sobre os pixels do recorte.
                if (typeof og.getImageData === 'function' && (q('bg').checked || ni.mode === 'mask')) {
                    var px = og.getImageData(0, 0, NI_OUT, NI_OUT);
                    if (q('bg').checked) { removeBg(px.data, NI_OUT, NI_OUT, +q('tol').value); }
                    if (ni.mode === 'mask') { tint(px.data, (I.CATS[q('cat').value] || I.CATS.infra).S); }
                    og.putImageData(px, 0, 0);
                }
                ni.out = o.toDataURL('image/png');
                el.querySelectorAll('.cx-ni-prev img').forEach(function (im) { im.src = ni.out; });
            };
            // Mantém o quadrado dentro da imagem desenhada.
            var fitCrop = function () {
                var dw = ni.iw * ni.s, dh = ni.ih * ni.s, full = Math.min(dw, dh);
                ni.cs = Math.max(8, full * (+q('size').value || 100) / 100);
                ni.cx = Math.min(Math.max(ni.cx, ni.ox), ni.ox + dw - ni.cs);
                ni.cy = Math.min(Math.max(ni.cy, ni.oy), ni.oy + dh - ni.cs);
            };
            el.querySelector('input[type=file]').addEventListener('change', function (e) {
                var f = e.target.files && e.target.files[0];
                fail('');
                if (!f) { return; }
                if (f.size > NI_MAX) { fail('Arquivo maior que 2 MB.'); return; }
                if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(f.type)) { fail('Use PNG, JPG, WebP ou SVG.'); return; }
                var rd = new FileReader();
                rd.onload = function () {
                    var im = new Image();
                    im.onload = function () {
                        // SVG sem tamanho próprio: desenha no tamanho da caixa.
                        var w = im.naturalWidth || NI_BOX, h = im.naturalHeight || NI_BOX;
                        ni.img = im; ni.iw = w; ni.ih = h;
                        ni.s = Math.min(NI_BOX / w, NI_BOX / h);
                        ni.ox = (NI_BOX - w * ni.s) / 2; ni.oy = (NI_BOX - h * ni.s) / 2;
                        q('size').value = 100; ni.cx = 0; ni.cy = 0;
                        fitCrop();
                        ni.cx = ni.ox + (w * ni.s - ni.cs) / 2; ni.cy = ni.oy + (h * ni.s - ni.cs) / 2;
                        draw();
                        if (!q('name').value) { q('name').value = f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').slice(0, 60); }
                    };
                    im.onerror = function () { fail('Não foi possível abrir essa imagem.'); };
                    im.src = rd.result;
                };
                rd.readAsDataURL(f);
            });
            q('size').addEventListener('input', function () {
                if (!ni.img) { return; }
                var mx = ni.cx + ni.cs / 2, my = ni.cy + ni.cs / 2;   // redimensiona pelo centro
                fitCrop(); ni.cx = mx - ni.cs / 2; ni.cy = my - ni.cs / 2; fitCrop(); draw();
            });
            crop.addEventListener('pointerdown', function (e) {
                e.preventDefault();
                var sx = e.clientX, sy = e.clientY, bx = ni.cx, by = ni.cy;
                var mv = function (ev) { ni.cx = bx + ev.clientX - sx; ni.cy = by + ev.clientY - sy; fitCrop(); draw(); };
                var up = function () { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); };
                document.addEventListener('pointermove', mv);
                document.addEventListener('pointerup', up);
            });
            q('bg').addEventListener('change', function () { el.querySelector('.cx-ni-tol').hidden = !q('bg').checked; draw(); });
            q('tol').addEventListener('input', draw);
            q('cat').addEventListener('change', function () { if (ni.mode === 'mask') { draw(); } });
            el.querySelectorAll('[data-ni-mode]').forEach(function (b) {
                b.addEventListener('click', function () {
                    ni.mode = b.getAttribute('data-ni-mode');
                    el.querySelectorAll('[data-ni-mode]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
                    draw();
                });
            });
            q('cancel').addEventListener('click', niClose);
            q('save').addEventListener('click', function () {
                var name = q('name').value.trim();
                if (!ni.out) { fail('Escolha uma imagem.'); return; }
                if (!name) { fail('Informe o nome do ícone.'); q('name').focus(); return; }
                fail('');
                var tk = document.querySelector('[name="_glpi_csrf_token"]');
                var fd = new FormData();
                fd.append('action', 'add'); fd.append('name', name); fd.append('cat', q('cat').value);
                fd.append('search', q('search').value.trim()); fd.append('mode', ni.mode); fd.append('image', ni.out);
                if (tk) { fd.append('_glpi_csrf_token', tk.value); }
                var btn = q('save'); btn.disabled = true; btn.textContent = 'Salvando…';
                fetch(BASE + '/ajax/icons.php', { method: 'POST', body: fd, credentials: 'same-origin' })
                    .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
                    .then(function (res) {
                        // O token é consumido a cada POST: o novo vai para todos os formulários.
                        if (res.j.csrf) { document.querySelectorAll('[name="_glpi_csrf_token"]').forEach(function (i) { i.value = res.j.csrf; }); }
                        if (!res.ok || !res.j.icon) { throw new Error(res.j.erro || 'Não foi possível gravar o ícone.'); }
                        I.addCustom([res.j.icon]);
                        paleta();
                        niClose();
                        notify(editor, 'Ícone "' + res.j.icon.name + '" criado: já está na paleta.', 'success');
                    })
                    .catch(function (e2) {
                        btn.disabled = false; btn.textContent = 'Salvar ícone';
                        fail(e2 && e2.message && !/fetch|network/i.test(e2.message) ? e2.message : 'Não foi possível gravar o ícone.');
                    });
            });
        }
        var niBtn = root.querySelector('.cx-board-newic');
        if (niBtn) { niBtn.addEventListener('click', niOpen); }

        /* ---------- Q4c: gerenciar ícones criados (Super-Admin) ----------
           Lista com editar (nome, categoria, busca; a silhueta é repintada
           na cor nova) e excluir. Excluir tira da paleta; quadros que usam
           o ícone guardam uma cópia e continuam iguais. Mesma janela (ni). */
        function post(fields) {
            var tk = document.querySelector('[name="_glpi_csrf_token"]'), fd = new FormData();
            Object.keys(fields).forEach(function (k) { fd.append(k, fields[k]); });
            if (tk) { fd.append('_glpi_csrf_token', tk.value); }
            return fetch(BASE + '/ajax/icons.php', { method: 'POST', body: fd, credentials: 'same-origin' })
                .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
                .then(function (res) {
                    if (res.j.csrf) { document.querySelectorAll('[name="_glpi_csrf_token"]').forEach(function (i) { i.value = res.j.csrf; }); }
                    if (!res.ok || res.j.erro) { throw new Error(res.j.erro || 'Não foi possível gravar.'); }
                    return res.j;
                });
        }
        // Silhueta: repinta o PNG gravado na cor da categoria nova.
        function recolor(img, hex) {
            return new Promise(function (ok, fail) {
                var im = new Image();
                im.onload = function () {
                    var c = document.createElement('canvas'), w = im.naturalWidth || NI_OUT, h = im.naturalHeight || NI_OUT;
                    c.width = w; c.height = h;
                    var g = c.getContext && c.getContext('2d');
                    if (!g || typeof g.getImageData !== 'function') { ok(''); return; }
                    g.drawImage(im, 0, 0, w, h);
                    var px = g.getImageData(0, 0, w, h);
                    tint(px.data, hex);
                    g.putImageData(px, 0, 0);
                    ok(c.toDataURL('image/png'));
                };
                im.onerror = function () { fail(new Error('img')); };
                im.src = img;
            });
        }
        function mgOpen() {
            if (ni) { return; }
            var el = document.createElement('div');
            el.className = 'cx-ni-back';
            el.innerHTML = '<div class="cx-ni cx-mg" role="dialog" aria-label="Ícones criados">'
                + '<div class="cx-mg-head"><p class="cx-ni-title">Ícones criados na instalação</p>'
                + '<p class="cx-board-none">Excluir tira da paleta. Quadros que já usam o ícone continuam com ele.</p></div>'
                + '<div class="cx-mg-list"></div><p class="cx-ni-err" hidden></p>'
                + '<div class="cx-ni-btns"><button type="button" data-mg="close">Fechar</button></div></div>';
            root.appendChild(el);
            ni = { el: el, mg: true };
            var list = el.querySelector('.cx-mg-list'), err = el.querySelector('.cx-ni-err');
            var fail = function (t) { err.textContent = t || ''; err.hidden = !t; };
            var cats = function (v) { return Object.keys(I.CATS).map(function (k) { return '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + esc(I.CATS[k].label) + '</option>'; }).join(''); };
            var draw = function (editing) {
                var all = I.customs().slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'pt-BR'); });
                list.innerHTML = all.length ? all.map(function (ic) {
                    var th = '<img src="' + ic.img + '" alt="" width="32" height="32">';
                    if (editing === ic.id) {
                        return '<div class="cx-mg-row is-edit" data-key="' + ic.id + '">' + th
                            + '<input type="text" maxlength="60" data-mg="name" value="' + esc(ic.name) + '" aria-label="Nome">'
                            + '<select data-mg="cat" aria-label="Categoria">' + cats(ic.cat) + '</select>'
                            + '<input type="text" maxlength="200" data-mg="search" value="' + esc(ic.search) + '" placeholder="busca" aria-label="Busca">'
                            + '<span class="cx-mg-act"><button type="button" data-mg="save">Salvar</button><button type="button" data-mg="back">Voltar</button></span></div>';
                    }
                    return '<div class="cx-mg-row" data-key="' + ic.id + '">' + th
                        + '<span class="cx-mg-name">' + esc(ic.name) + (ic.mode === 'mask' ? ' <em>· silhueta</em>' : '') + '</span>'
                        + '<span class="cx-mg-cat">' + esc((I.CATS[ic.cat] || {}).label || ic.cat) + '</span>'
                        + '<span class="cx-mg-by">' + esc(ic.author || '') + '</span>'
                        + '<span class="cx-mg-act"><button type="button" data-mg="edit">Editar</button><button type="button" data-mg="del" class="is-danger">Excluir</button></span></div>';
                }).join('') : '<p class="cx-board-none">Nenhum ícone criado.</p>';
            };
            draw('');
            el.addEventListener('click', function (e) {
                var b = e.target.closest('[data-mg]');
                if (!b) { return; }
                var a = b.getAttribute('data-mg'), row = b.closest('.cx-mg-row'), key = row ? row.getAttribute('data-key') : '';
                var ic = key ? I.get(key) : null, id = key.replace(/^u/, '');
                if (a === 'close') { niClose(); paleta(); return; }
                if (a === 'edit') { fail(''); draw(key); var nm = list.querySelector('[data-mg="name"]'); if (nm) { nm.focus(); } return; }
                if (a === 'back') { fail(''); draw(''); return; }
                if (a === 'del') {
                    var usado = D.items.some(function (i) { return i.t === 'icon' && i.icon === key; });
                    if (!window.confirm('Excluir o ícone "' + ic.name + '" da paleta?' + (usado ? ' Este quadro usa o ícone: ele continua aqui (e nos outros quadros que já o usam).' : ''))) { return; }
                    b.disabled = true; fail('');
                    post({ action: 'delete', id: id }).then(function () {
                        I.removeCustom(key); draw(''); paleta();
                    }).catch(function (e2) { b.disabled = false; fail(e2.message); });
                    return;
                }
                if (a === 'save') {
                    var name = row.querySelector('[data-mg="name"]').value.trim(), cat = row.querySelector('[data-mg="cat"]').value;
                    if (!name) { fail('Informe o nome do ícone.'); return; }
                    b.disabled = true; fail('');
                    var img = (ic.mode === 'mask' && cat !== ic.cat) ? recolor(ic.img, (I.CATS[cat] || I.CATS.infra).S) : Promise.resolve('');
                    img.then(function (novo) {
                        return post({ action: 'update', id: id, name: name, cat: cat, search: row.querySelector('[data-mg="search"]').value.trim(), image: novo || '' });
                    }).then(function (j) {
                        I.addCustom([j.icon]); draw(''); paleta(); render();
                    }).catch(function (e2) { b.disabled = false; fail(e2.message); });
                }
            });
        }
        root.querySelector('.cx-board-icons').addEventListener('click', function (e) {
            if (e.target.closest('.cx-board-mgic')) { mgOpen(); }
        });

        /* ---------- histórico ---------- */
        function snap() { hist.push(JSON.stringify(D)); if (hist.length > 80) { hist.shift(); } redo = []; }
        function undo() { if (!hist.length) { return; } redo.push(JSON.stringify(D)); D = JSON.parse(hist.pop()); sel = sel.filter(byId); render(); }
        function redoIt() { if (!redo.length) { return; } hist.push(JSON.stringify(D)); D = JSON.parse(redo.pop()); sel = sel.filter(byId); render(); }
        function byId(id) { return D.items.some(function (i) { return i.id === id; }); }
        function get(id) { for (var i = 0; i < D.items.length; i++) { if (D.items[i].id === id) { return D.items[i]; } } return null; }

        /* ---------- vista ---------- */
        function applyView() {
            vp.setAttribute('transform', 'translate(' + view.x + ' ' + view.y + ') scale(' + view.z + ')');
            root.querySelector('.cx-board-zoom').textContent = Math.round(view.z * 100) + '%';
        }
        function toBoard(e) {
            var r = svg.getBoundingClientRect();
            return { x: (e.clientX - r.left - view.x) / view.z, y: (e.clientY - r.top - view.y) / view.z };
        }
        function fit() {
            var r = svg.getBoundingClientRect();
            var w = D.w, h = D.h, x = 0, y = 0;
            if (!bgUrl && D.items.some(function (i) { return i.t !== 'link'; })) {
                var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
                D.items.forEach(function (it) { if (it.t === 'link') { return; } var b = bbox(it); x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.w); y2 = Math.max(y2, b.y + b.h); });
                x = x1 - 60; y = y1 - 60; w = x2 - x1 + 120; h = y2 - y1 + 120;
            }
            view.z = Math.max(0.1, Math.min(1, Math.min((r.width || 800) / w, (r.height || 600) / h)));
            view.x = ((r.width || 800) - w * view.z) / 2 - x * view.z;
            view.y = ((r.height || 600) - h * view.z) / 2 - y * view.z;
            applyView();
        }
        function zoomAt(k, cx, cy) {
            var z = Math.max(0.1, Math.min(4, view.z * k));
            view.x = cx - (cx - view.x) * (z / view.z);
            view.y = cy - (cy - view.y) * (z / view.z);
            view.z = z;
            applyView();
        }

        /* ---------- desenho ---------- */
        // Zonas embaixo, ligações no meio, ícones e textos por cima.
        function paint() {
            gZones.innerHTML = D.items.filter(function (i) { return i.t === 'zone'; }).map(function (i) { return itemSvg(i); }).join('');
            gDucts.innerHTML = D.items.filter(function (i) { return i.t === 'duct'; }).map(function (i) { return ductSvg(i, D.items); }).join('');
            gLinks.innerHTML = D.items.filter(function (i) { return i.t === 'link'; }).map(function (i) { return linkSvg(i, get); }).join('');
            gItems.innerHTML = D.items.filter(function (i) { return ['zone', 'link', 'duct'].indexOf(i.t) < 0; }).map(function (i) { return itemSvg(i); }).join('');
        }
        function render() {
            PXM = D.pxm || PXM_DEFAULT;
            var sc = root.querySelector('.cx-board-scale');
            if (sc) { sc.textContent = D.pxm ? '1 m = ' + (Math.round(D.pxm * 10) / 10).toString().replace('.', ',') + ' px' : 'sem escala'; }
            paper.setAttribute('x', 0); paper.setAttribute('y', 0);
            paper.setAttribute('width', D.w); paper.setAttribute('height', D.h);
            if (bgUrl) {
                bgImgEl.setAttribute('href', bgUrl);
                bgImgEl.setAttribute('width', D.w); bgImgEl.setAttribute('height', D.h);
                bgImgEl.setAttribute('opacity', D.bgOpacity);
                bgImgEl.removeAttribute('display');
            } else {
                bgImgEl.setAttribute('display', 'none');
            }
            paint();
            drawSel();
            drawProps();
            root.querySelector('[data-act="undo"]').disabled = !hist.length;
            root.querySelector('[data-act="redo"]').disabled = !redo.length;
            root.querySelectorAll('[data-tool]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-tool') === tool); });
        }
        function drawSel() {
            gSel.innerHTML = sel.map(function (id) {
                var it = get(id); if (!it) { return ''; }
                if (it.t === 'duct') {
                    var dh = '<path d="' + linkD(it.pts) + '" fill="none" stroke="#378ADD" stroke-opacity="0.35" stroke-width="' + ((DUCT_KINDS[it.kind] || DUCT_KINDS.eletrocalha).w + 6 / view.z)
                        + '" stroke-linejoin="miter" pointer-events="none"/>';
                    if (sel.length === 1 && !it.lock) {
                        var r0 = 5 / view.z;
                        it.pts.forEach(function (q, i) {
                            dh += '<rect class="cx-board-dv" data-dv="' + i + '" x="' + (q.x - r0) + '" y="' + (q.y - r0) + '" width="' + (2 * r0) + '" height="' + (2 * r0)
                                + '" fill="#fff" stroke="#378ADD" stroke-width="' + (1.5 / view.z) + '"><title>Arraste para mover; Ctrl + duplo clique apaga o ponto</title></rect>';
                        });
                    }
                    return dh;
                }
                if (it.t === 'link') {
                    var ld = routeD(it, get);
                    return ld ? '<path d="' + ld + '" fill="none" stroke="#378ADD" stroke-opacity="0.35" stroke-width="' + (9 / view.z)
                        + '" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>'
                        + (sel.length === 1 && !it.lock ? linkHandles(it) : '') : '';
                }
                var b = bbox(it);
                return '<rect x="' + (b.x - 4) + '" y="' + (b.y - 4) + '" width="' + (b.w + 8) + '" height="' + (b.h + 8)
                    + '" fill="none" stroke="#378ADD" stroke-width="' + (1.5 / view.z) + '" stroke-dasharray="' + (5 / view.z) + ' ' + (3 / view.z) + '"/>'
                    + (it.lock ? '<text x="' + (b.x + b.w + 6) + '" y="' + (b.y + 4) + '" font-size="' + (12 / view.z) + '" fill="#378ADD">🔒</text>' : '')
                    + (it.t === 'icon' && sel.length === 1 && !it.lock ? '<rect class="cx-board-rz" data-rzi="' + it.id + '" x="' + (it.x + it.size - 4 / view.z) + '" y="' + (it.y + it.size - 4 / view.z)
                        + '" width="' + (9 / view.z) + '" height="' + (9 / view.z) + '" fill="#fff" stroke="#378ADD" stroke-width="' + (1.5 / view.z) + '"/>' : '')
                    + (it.t === 'icon' && sel.length === 1 ? handles(it) : '')
                    + (it.t === 'zone' && sel.length === 1 && !it.lock ? '<rect class="cx-board-rz" data-rz="' + it.id + '" x="' + (b.x + b.w - 5 / view.z) + '" y="' + (b.y + b.h - 5 / view.z)
                        + '" width="' + (10 / view.z) + '" height="' + (10 / view.z) + '" fill="#fff" stroke="#378ADD" stroke-width="' + (1.5 / view.z) + '"/>' : '');
            }).join('');
        }

        // Alças de ligação nas quatro bordas (um pouco para fora, longe da alça de tamanho).
        function handles(it) {
            var o = 10 / view.z, r = 5 / view.z;
            return SIDES.map(function (sd) {
                var a = anchor(it, sd);
                var x = a.x + (sd === 'l' ? o : sd === 'o' ? -o : 0), y = a.y + (sd === 's' ? o : sd === 'n' ? -o : 0);
                return '<circle class="cx-board-lh" data-lh="' + sd + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r
                    + '" fill="#378ADD" stroke="#fff" stroke-width="' + (1.5 / view.z) + '"><title>Puxe até outro ícone para ligar</title></circle>';
            }).join('');
        }
        // Alças da ligação selecionada: pontas (religar) e dobras (mover).
        // Dobra nasce com duplo clique no cabo e sai com Ctrl + duplo clique
        // (Claudio, 27/09/2026: o ponto no meio de cada trecho criava dobras
        // a cada arraste).
        function linkHandles(L) {
            var P = linkPts(L, get); if (!P) { return ''; }
            var r = 5 / view.z, sw = 1.5 / view.z, h = '', n = P.length;
            (L.wp || []).forEach(function (q, i) {
                h += '<rect class="cx-board-lw" data-lw="' + i + '" x="' + (q.x - r) + '" y="' + (q.y - r) + '" width="' + (2 * r) + '" height="' + (2 * r)
                    + '" fill="#378ADD" stroke="#fff" stroke-width="' + sw + '"><title>Arraste para mover; Ctrl + duplo clique apaga a dobra</title></rect>';
            });
            [['a', P[0]], ['b', P[n - 1]]].forEach(function (e) {
                h += '<circle class="cx-board-le" data-le="' + e[0] + '" cx="' + e[1].x.toFixed(1) + '" cy="' + e[1].y.toFixed(1) + '" r="' + r
                    + '" fill="#fff" stroke="#378ADD" stroke-width="' + (2 / view.z) + '"><title>Arraste para outra borda ou outro ícone</title></circle>';
            });
            return h;
        }
        // Bloco de metragem do painel da ligação (Q2d).
        function metersPanel(it) {
            if (!it.len) { it.len = { mode: 'auto', m: 0, extra: 10 }; }
            var mt = linkMeters(it, get), manual = it.len.mode === 'manual';
            return '<p class="cx-board-sub">Comprimento</p>'
                + '<label class="cx-board-f"><select data-k="len.mode"><option value="auto"' + (manual ? '' : ' selected') + '>Automático, pelo desenho</option>'
                + '<option value="manual"' + (manual ? ' selected' : '') + '>Manual</option></select></label>'
                + (manual
                    ? '<label class="cx-board-f"><span>Metros</span><input type="text" inputmode="decimal" data-k="len.m" value="' + (it.len.m ? String(it.len.m).replace('.', ',') : '') + '" placeholder="25"></label>'
                    : '<div class="cx-board-row"><label class="cx-board-f"><span>Sobra (%)</span><input type="text" inputmode="numeric" data-k="len.extra" value="' + it.len.extra + '"></label>'
                      + '<p class="cx-board-none cx-board-meters">Medido ' + fmtM(mt.measured) + '<br><strong>Total ' + fmtM(mt.total) + '</strong></p></div>'
                      + (D.pxm ? '' : '<p class="cx-board-none">Sem escala: metros aproximados (1 m = ' + PXM_DEFAULT + ' px). Use "Escala" na barra para medir pela planta.</p>'))
                + '<label class="cx-board-chk"><input type="checkbox" data-k="showM"' + (it.showM ? ' checked' : '') + '> Mostrar os metros no cabo</label>';
        }
        // Em qual trecho (entre o ponto j e o j+1) caiu o duplo clique.
        function segPiece(L, P, j) {
            if (L.route === 'elbow') {
                var n = P.length, q = [P[j]];
                if (j === 0) { q.push(out(P[0], L.a.side, STUB)); }
                if (j === n - 2) { q.push(out(P[n - 1], L.b.side, STUB)); }
                q.push(P[j + 1]);
                return orth(q);
            }
            if (L.route === 'curve') {
                var sg = curveSegs(L, P)[j], o = [];
                for (var k = 0; k <= 16; k++) { o.push(bez(sg, k / 16)); }
                return o;
            }
            return [P[j], P[j + 1]];
        }
        function addBend(L, p) {
            var P = linkPts(L, get); if (!P) { return; }
            var best = 0, bd = Infinity;
            for (var j = 0; j < P.length - 1; j++) { var d = distPoly(p, segPiece(L, P, j)); if (d < bd) { bd = d; best = j; } }
            snap();
            // Ponto exato do clique, sem grade (Claudio, 27/09/2026: a grade não deixava encostar o cabo na parede).
            L.wp.splice(best, 0, { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 });
        }
        // Encaixa na linha/coluna de pontos vizinhos (6 px na tela); Alt solta.
        function alignTo(p, nb, alt) {
            var tol = 6 / view.z, gx = null, gy = null;
            if (!alt) {
                nb.forEach(function (q) {
                    if (!q) { return; }
                    if (gx === null && Math.abs(q.x - p.x) < tol) { gx = q.x; }
                    if (gy === null && Math.abs(q.y - p.y) < tol) { gy = q.y; }
                });
            }
            gGuides.innerHTML = (gx !== null ? '<line x1="' + gx + '" y1="-5000" x2="' + gx + '" y2="5000" stroke="#D4537E" stroke-width="' + (1 / view.z) + '"/>' : '')
                + (gy !== null ? '<line x1="-5000" y1="' + gy + '" x2="5000" y2="' + gy + '" stroke="#D4537E" stroke-width="' + (1 / view.z) + '"/>' : '');
            return { x: Math.round((gx !== null ? gx : p.x) * 10) / 10, y: Math.round((gy !== null ? gy : p.y) * 10) / 10 };
        }
        function draftPreview(cur) {
            if (!ductDraft) { return; }
            var pts = ductDraft.concat(cur ? [cur] : []);
            gGuides.innerHTML += '<path d="' + linkD(pts) + '" fill="none" stroke="#888780" stroke-opacity="0.45" stroke-width="12" stroke-linejoin="miter" pointer-events="none"/>'
                + '<text x="' + (pts[pts.length - 1].x + 10 / view.z) + '" y="' + (pts[pts.length - 1].y - 10 / view.z) + '" font-family="Arial,sans-serif" font-size="' + (12 / view.z) + '" fill="#444441">'
                + fmtM(Math.round(polyLen(pts) / PXM * 10) / 10) + '</text>';
        }
        function finishDuct() {
            var pts = ductDraft || [];
            ductDraft = null; gGuides.innerHTML = '';
            if (pts.length >= 2) {
                snap();
                var dct = { id: uid(), t: 'duct', pts: pts, kind: 'eletrocalha', label: '', showM: true, fs: 'm', lock: false, g: '' };
                D.items.push(dct); sel = [dct.id];
            }
            tool = 'select'; render();
        }
        function iconAt(p) {
            for (var i = D.items.length - 1; i >= 0; i--) {
                var it = D.items[i];
                if (it.t !== 'icon') { continue; }
                var b = bbox(it);
                if (p.x >= b.x - 4 && p.x <= b.x + b.w + 4 && p.y >= b.y - 4 && p.y <= b.y + b.h + 4) { return it; }
            }
            return null;
        }
        function iconName(it) { return it ? (it.label || (I.get(it.icon) || {}).name || 'Ícone') : '?'; }

        /* ---------- painel de propriedades ---------- */
        function field(label, key, val, ph) {
            return '<label class="cx-board-f"><span>' + label + '</span><input type="text" data-k="' + key + '" value="' + esc(val) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '></label>';
        }
        function drawProps() {
            if (!sel.length) {
                props.innerHTML = materialsHtml(materials(D, null), 'Materiais deste quadro')
                    + '<p class="cx-board-none">Selecione um item para editar rótulo e dados.</p>'
                    + '<p class="cx-board-none">Atalhos: Delete exclui · Ctrl+C / Ctrl+V · Ctrl+D duplica · Ctrl+G agrupa · setas movem.</p>';
                return;
            }
            if (sel.length > 1) {
                props.innerHTML = '<p><strong>' + sel.length + ' itens selecionados</strong></p><p class="cx-board-none">Use Agrupar para mover como um conjunto.</p>'
                    + materialsHtml(materials(D, sel), 'Materiais da seleção');
                return;
            }
            var it = get(sel[0]), h = '';
            if (it.t === 'icon') {
                var ic = I.get(it.icon);
                h += '<p><strong>' + esc(ic.name) + '</strong></p>' + field('Rótulo', 'label', it.label, 'CAM-01 Entrada');
                if (it.icon === 'generico') {
                    h += '<label class="cx-board-f"><span>Categoria (cor)</span><select data-k="cat">'
                        + Object.keys(I.CATS).map(function (k) { return '<option value="' + k + '"' + ((it.cat || 'infra') === k ? ' selected' : '') + '>' + esc(I.CATS[k].label) + '</option>'; }).join('')
                        + '</select></label>';
                }
                h += field('Modelo', 'f.modelo', it.f.modelo) + field('IP', 'f.ip', it.f.ip, '10.0.0.10') + field('VLAN', 'f.vlan', it.f.vlan)
                    + '<label class="cx-board-f"><span>Observação</span><textarea data-k="f.obs" rows="2">' + esc(it.f.obs) + '</textarea></label>'
                    + '<label class="cx-board-f"><span>Tamanho</span><input type="range" min="24" max="120" step="4" data-k="size" value="' + it.size + '"></label>'
                    + (it.cone ? '' : '<label class="cx-board-f"><span>Girar (' + (it.rot || 0) + '°)</span><input type="range" min="0" max="345" step="15" data-k="rot" value="' + (it.rot || 0) + '"></label>');
                if (it.cone) {
                    h += '<p class="cx-board-sub">Visão da câmera</p>'
                        + '<label class="cx-board-chk"><input type="checkbox" data-k="cone.on"' + (it.cone.on ? ' checked' : '') + '> Mostrar o cone</label>'
                        + '<label class="cx-board-f"><span>Direção (' + it.cone.dir + '°)</span><input type="range" min="0" max="355" step="5" data-k="cone.dir" value="' + it.cone.dir + '"></label>'
                        + '<label class="cx-board-f"><span>Abertura (' + it.cone.fov + '°)</span><input type="range" min="10" max="180" step="5" data-k="cone.fov" value="' + it.cone.fov + '"></label>'
                        + '<label class="cx-board-f"><span>Alcance (' + fmtM(it.cone.m) + ')</span><input type="range" min="0.5" max="60" step="0.5" data-k="cone.m" value="' + it.cone.m + '"></label>'
                        + '<p class="cx-board-none">' + (D.pxm ? 'Metros pela escala da planta.' : 'Escala aproximada (1 m = ' + PXM_DEFAULT + ' px): use "Escala" na barra para medir pela planta.') + '</p>';
                }
            } else if (it.t === 'link') {
                var opts = function (o, v) { return Object.keys(o).map(function (k) { return '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + esc(o[k]) + '</option>'; }).join(''); };
                var kinds = {}; Object.keys(LINK_KINDS).forEach(function (k) { kinds[k] = LINK_KINDS[k].label; });
                h += '<p><strong>Ligação ' + esc(it.cable) + '</strong></p><p class="cx-board-none">' + esc(iconName(get(it.a.id))) + ' → ' + esc(iconName(get(it.b.id))) + '</p>'
                    + '<label class="cx-board-f"><span>Tipo de cabo</span><select data-k="kind">' + opts(kinds, it.kind) + '</select></label>'
                    + '<label class="cx-board-f"><span>Traçado</span><select data-k="route">' + opts({ straight: 'Reto', elbow: 'Cotovelo', curve: 'Curvo' }, it.route) + '</select></label>'
                    + '<label class="cx-board-f"><span>Pontas</span><select data-k="ends">' + opts({ none: 'Sem seta', arrow: 'Seta no destino', both: 'Seta nas duas pontas' }, it.ends) + '</select></label>'
                    + '<div class="cx-board-row">' + field('Cabo', 'cable', it.cable, 'P-001') + field('Rótulo', 'label', it.label, 'Uplink') + '</div>'
                    + '<div class="cx-board-row">' + field('Porta origem', 'pa', it.pa, 'Gi0/1') + field('Porta destino', 'pb', it.pb, 'eth0') + '</div>'
                    + '<div class="cx-board-row">' + field('Velocidade', 'vel', it.vel, '1 Gbps') + field('VLAN', 'vlan', it.vlan, '20') + '</div>'
                    + metersPanel(it)
                    + '<label class="cx-board-chk"><input type="checkbox" data-k="poe"' + (it.poe ? ' checked' : '') + '> PoE</label>'
                    + '<label class="cx-board-chk"><input type="checkbox" data-k="showId"' + (it.showId ? ' checked' : '') + '> Mostrar a identificação no cabo</label>'
                    + '<label class="cx-board-f"><span>Tamanho do nome</span><select data-k="fs">' + opts({ p: 'Pequeno', m: 'Médio', g: 'Grande' }, it.fs) + '</select></label>'
                    + '<p><button type="button" class="cx-board-btn" data-la="straighten"' + (it.wp.length ? '' : ' disabled') + '>Endireitar (tirar as dobras)</button></p>'
                    + '<p class="cx-board-none">Para desenhar a passagem: duplo clique no cabo cria uma dobra ali; arraste a dobra (quadrado azul) para mover, ela alinha com a vizinha (segure Alt para posição livre); Ctrl + duplo clique na dobra apaga. Arraste a bolinha da ponta para outra borda ou outro ícone. O nome acompanha o tamanho dos ícones.</p>';
            } else if (it.t === 'duct') {
                var dk = {}; Object.keys(DUCT_KINDS).forEach(function (k) { dk[k] = DUCT_KINDS[k].label; });
                var dopt = function (o, v) { return Object.keys(o).map(function (k) { return '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + esc(o[k]) + '</option>'; }).join(''); };
                h += '<p><strong>' + esc(DUCT_KINDS[it.kind].label) + '</strong></p>'
                    + '<label class="cx-board-f"><span>Tipo</span><select data-k="kind">' + dopt(dk, it.kind) + '</select></label>'
                    + field('Rótulo', 'label', it.label, '100 × 50 mm')
                    + '<p class="cx-board-none cx-board-meters">Comprimento <strong>' + fmtM(ductMeters(it)) + '</strong>' + (D.pxm ? '' : ' (aproximado: sem escala)') + '</p>'
                    + '<label class="cx-board-chk"><input type="checkbox" data-k="showM"' + (it.showM ? ' checked' : '') + '> Mostrar os metros</label>'
                    + '<label class="cx-board-f"><span>Tamanho do nome</span><select data-k="fs">' + dopt({ p: 'Pequeno', m: 'Médio', g: 'Grande' }, it.fs) + '</select></label>'
                    + '<p class="cx-board-none">Arraste o quadrado branco para mover um ponto (alinha com o vizinho; Alt solta). Duplo clique na faixa cria um ponto; Ctrl + duplo clique no ponto apaga. Arraste a faixa para mover tudo.</p>';
            } else if (it.t === 'zone') {
                h += '<p><strong>' + (D.mode === 'planta' ? 'Área' : 'Zona') + '</strong></p>' + field('Nome', 'label', it.label, D.mode === 'planta' ? 'Estoque' : 'VLAN 10 · Administrativo');
            } else {
                h += '<p><strong>Texto</strong></p><label class="cx-board-f"><span>Texto</span><textarea data-k="text" rows="3">' + esc(it.text) + '</textarea></label>'
                    + '<label class="cx-board-f"><span>Tamanho</span><select data-k="size"><option value="p"' + (it.size === 'p' ? ' selected' : '') + '>Pequeno</option>'
                    + '<option value="m"' + (it.size === 'm' ? ' selected' : '') + '>Médio</option><option value="g"' + (it.size === 'g' ? ' selected' : '') + '>Grande</option></select></label>';
            }
            if (it.t !== 'icon' || true) {
                h += '<div class="cx-board-sw">' + COLORS.map(function (c) {
                    return it.t === 'icon' || it.t === 'link' || it.t === 'duct' ? '' : '<button type="button" data-color="' + c + '" style="background:' + c + '" title="Cor" aria-label="Cor"' + (it.color === c ? ' class="is-on"' : '') + '></button>';
                }).join('') + '</div>';
            }
            h += '<p class="cx-board-none">' + (it.lock ? 'Travado: destrave para mover.' : '') + (it.g ? ' Em grupo.' : '') + '</p>';
            props.innerHTML = h;
        }
        props.addEventListener('input', function (e) {
            var k = e.target.getAttribute('data-k'); if (!k || sel.length !== 1) { return; }
            var it = get(sel[0]);
            if (!props.__snap) { snap(); props.__snap = true; }
            var v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
            if (/^(size|rot|cone\.dir|cone\.fov|cone\.m)$/.test(k) && it.t === 'icon') { v = +v; }
            if (it.t === 'link' && (k === 'len.m' || k === 'len.extra')) {
                v = parseFloat(String(v).replace(',', '.')) || 0;
                v = k === 'len.extra' ? Math.max(0, Math.min(100, Math.round(v))) : Math.max(0, Math.min(10000, Math.round(v * 10) / 10));
            }
            var p = k.split('.');
            if (p.length === 2) { it[p[0]][p[1]] = v; } else { it[k] = v; }
            if (it.t === 'link' && k === 'kind' && LINK_KINDS[v] && LINK_KINDS[v].arrow && it.ends === 'none') { it.ends = 'arrow'; }
            paint();
            drawSel();
            if (/^cone\.|^cat$|^size$|^rot$/.test(k) && e.type === 'change') { drawProps(); }
            if (it.t === 'link' && k === 'cable') { var tt = props.querySelector('strong'); if (tt) { tt.textContent = 'Ligação ' + v; } }
            if (it.t === 'link' && k === 'len.extra') {
                var mm = props.querySelector('.cx-board-meters'), lm = linkMeters(it, get);
                if (mm) { mm.innerHTML = 'Medido ' + fmtM(lm.measured) + '<br><strong>Total ' + fmtM(lm.total) + '</strong>'; }
            }
        });
        props.addEventListener('change', function (e) {
            props.__snap = false;
            if (e.target.matches('select,[type=checkbox],[type=range]')) { drawProps(); }
        });
        props.addEventListener('click', function (e) {
            var la = e.target.closest('[data-la]');
            if (la && sel.length === 1 && la.getAttribute('data-la') === 'straighten') {
                var lk = get(sel[0]); if (lk && lk.wp && lk.wp.length) { snap(); lk.wp = []; render(); }
                return;
            }
            var b = e.target.closest('[data-color]'); if (!b || sel.length !== 1) { return; }
            snap(); get(sel[0]).color = b.getAttribute('data-color'); render();
        });

        /* ---------- seleção e grupos ---------- */
        function expand(ids) {
            var out = [];
            ids.forEach(function (id) {
                var it = get(id); if (!it) { return; }
                if (it.g) { D.items.forEach(function (o) { if (o.g === it.g && out.indexOf(o.id) < 0) { out.push(o.id); } }); }
                else if (out.indexOf(id) < 0) { out.push(id); }
            });
            return out;
        }
        function hit(target) {
            var g = target && target.closest && target.closest('[data-id]');
            return g && svg.contains(g) ? g.getAttribute('data-id') : null;
        }

        function addIcon(icon, x, y) {
            snap();
            var s = 48;
            var it = { id: uid(), t: 'icon', icon: icon, x: Math.round((x - s / 2) / GRID) * GRID, y: Math.round((y - s / 2) / GRID) * GRID,
                size: s, label: '', cat: '', f: { modelo: '', ip: '', vlan: '', obs: '' }, lock: false, g: '' };
            // Câmera nasce sem o cone; liga-se no painel depois de posicionar.
            if (I.get(icon).cone) { it.cone = { on: false, dir: 0, fov: 70, m: 8 }; }
            D.items.push(it);
            sel = [it.id];
            render();
        }

        /* ---------- arraste da paleta ---------- */
        root.querySelector('.cx-board-icons').addEventListener('pointerdown', function (e) {
            var b = e.target.closest('[data-icon]'); if (!b) { return; }
            e.preventDefault();
            var icon = b.getAttribute('data-icon'), moved = false, sx = e.clientX, sy = e.clientY;
            var ghost = document.createElement('div');
            ghost.className = 'cx-board-ghost';
            ghost.innerHTML = '<svg viewBox="0 0 48 48" width="48" height="48">' + I.body(icon) + '</svg>';
            function mv(ev) {
                if (!moved && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 5) { return; }
                if (!moved) { moved = true; document.body.appendChild(ghost); }
                ghost.style.left = (ev.clientX - 24) + 'px'; ghost.style.top = (ev.clientY - 24) + 'px';
            }
            function up(ev) {
                document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
                if (ghost.parentNode) { ghost.remove(); }
                var r = svg.getBoundingClientRect();
                if (!moved) {
                    var c = toBoard({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
                    addIcon(icon, c.x, c.y);
                } else if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
                    var p = toBoard(ev); addIcon(icon, p.x, p.y);
                }
            }
            document.addEventListener('pointermove', mv);
            document.addEventListener('pointerup', up);
        });

        /* ---------- quadro: ponteiro ---------- */
        var space = false, drag = null, scaleA = null, lastDown = { t: 0, x: 0, y: 0 };
        svg.addEventListener('pointerdown', function (e) {
            var p = toBoard(e);
            // Duplo clique detectado aqui: com a captura do ponteiro, o dblclick
            // do navegador chega no quadro e não na dobra (achado do Q2c).
            var now = Date.now(), dbl = now - lastDown.t < 400 && Math.abs(e.clientX - lastDown.x) + Math.abs(e.clientY - lastDown.y) < 8;
            lastDown = dbl ? { t: 0, x: 0, y: 0 } : { t: now, x: e.clientX, y: e.clientY };
            if (dbl && tool === 'select') {
                var lwAttr = e.target.getAttribute && e.target.getAttribute('data-lw');
                if (lwAttr !== null && lwAttr !== undefined && (e.ctrlKey || e.metaKey) && sel.length === 1) {
                    var lk0 = get(sel[0]); snap(); lk0.wp.splice(+lwAttr, 1); drag = null; render(); return;
                }
                var dvAttr = e.target.getAttribute && e.target.getAttribute('data-dv');
                if (dvAttr !== null && dvAttr !== undefined && (e.ctrlKey || e.metaKey) && sel.length === 1) {
                    var dd0 = get(sel[0]);
                    if (dd0.pts.length > 2) { snap(); dd0.pts.splice(+dvAttr, 1); }
                    drag = null; render(); return;
                }
                var hid = hit(e.target), hl = hid && get(hid);
                if (hl && hl.t === 'link' && !hl.lock && !(e.ctrlKey || e.metaKey)) {
                    addBend(hl, p); sel = [hl.id]; drag = null; render(); return;
                }
                if (hl && hl.t === 'duct' && !hl.lock && !(e.ctrlKey || e.metaKey)) {
                    var bj = 0, bdd = Infinity;
                    for (var sj = 0; sj < hl.pts.length - 1; sj++) { var dq = distPoly(p, [hl.pts[sj], hl.pts[sj + 1]]); if (dq < bdd) { bdd = dq; bj = sj; } }
                    snap(); hl.pts.splice(bj + 1, 0, { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 });
                    sel = [hl.id]; drag = null; render(); return;
                }
            }
            // Escala: o segundo clique fecha a medida.
            if (tool === 'scale' && scaleA) {
                var dist = Math.sqrt(Math.pow(p.x - scaleA.x, 2) + Math.pow(p.y - scaleA.y, 2));
                gGuides.innerHTML = '<line x1="' + scaleA.x + '" y1="' + scaleA.y + '" x2="' + p.x + '" y2="' + p.y + '" stroke="#D4537E" stroke-width="' + (2 / view.z) + '"/>';
                var txt = window.prompt('Distância real entre os dois pontos, em metros (ex.: 8,5):', '');
                var m = parseFloat(String(txt || '').replace(',', '.'));
                scaleA = null; tool = 'select'; gGuides.innerHTML = '';
                if (m > 0 && dist > 2) { snap(); D.pxm = dist / m; }
                render();
                return;
            }
            if (e.button === 1 || space) {
                drag = { k: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
            } else if (e.target.getAttribute('data-le') && sel.length === 1) {
                drag = { k: 'end', id: sel[0], end: e.target.getAttribute('data-le') };
            } else if (tool === 'duct') {
                // Eletrocalha: cada clique é um ponto; duplo clique termina.
                if (dbl && ductDraft) { finishDuct(); return; }
                var dq0 = alignTo(p, [ductDraft && ductDraft[ductDraft.length - 1]], e.altKey);
                if (!ductDraft) { ductDraft = [dq0]; } else { ductDraft.push(dq0); }
                gGuides.innerHTML = ''; draftPreview(null);
                return;
            } else if (e.target.getAttribute('data-dv') && sel.length === 1) {
                drag = { k: 'dv', id: sel[0], j: +e.target.getAttribute('data-dv'), moved: false };
            } else if (e.target.getAttribute('data-lw') && sel.length === 1) {
                drag = { k: 'wp', id: sel[0], j: +e.target.getAttribute('data-lw'), moved: false };
            } else if (e.target.getAttribute('data-lh') && sel.length === 1) {
                var from = get(sel[0]), sd = e.target.getAttribute('data-lh');
                drag = { k: 'link', from: from.id, side: sd, a: anchor(from, sd) };
            } else if (e.target.getAttribute('data-rzi')) {
                snap();
                drag = { k: 'rzi', id: e.target.getAttribute('data-rzi') };
            } else if (e.target.getAttribute('data-rz')) {
                snap();
                drag = { k: 'rz', id: e.target.getAttribute('data-rz'), p: p };
            } else if (tool === 'scale') {
                // Escala: primeiro ponto (o segundo fecha a medida, acima).
                scaleA = p;
                gGuides.innerHTML = '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (5 / view.z) + '" fill="#D4537E"/>';
                return;
            } else if (tool === 'zone') {
                snap();
                var z = { id: uid(), t: 'zone', x: Math.round(p.x / GRID) * GRID, y: Math.round(p.y / GRID) * GRID, w: 20, h: 20,
                    label: D.mode === 'planta' ? 'Área' : 'Zona', color: COLORS[D.items.filter(function (i) { return i.t === 'zone'; }).length % COLORS.length], lock: false, g: '' };
                D.items.push(z); sel = [z.id];
                drag = { k: 'zone', id: z.id, ox: z.x, oy: z.y };
            } else if (tool === 'text') {
                snap();
                var t = { id: uid(), t: 'text', x: Math.round(p.x / GRID) * GRID, y: Math.round(p.y / GRID) * GRID, text: 'Texto', color: '#1d2330', size: 'm', lock: false, g: '' };
                D.items.push(t); sel = [t.id]; tool = 'select'; render();
                var ta = props.querySelector('[data-k="text"]'); if (ta) { ta.focus(); ta.select(); }
                return;
            } else {
                var id = hit(e.target);
                if (id) {
                    var grp = expand([id]);
                    if (e.shiftKey) {
                        var tem = grp.every(function (g) { return sel.indexOf(g) >= 0; });
                        sel = tem ? sel.filter(function (s) { return grp.indexOf(s) < 0; }) : sel.concat(grp.filter(function (g) { return sel.indexOf(g) < 0; }));
                    } else if (sel.indexOf(id) < 0) {
                        sel = grp;
                    }
                    var movable = sel.filter(function (s) { var it = get(s); return it && !it.lock && it.t !== 'link'; });
                    drag = { k: 'move', p: p, start: movable.map(function (s) {
                            var it = get(s);
                            if (it.t === 'duct') { var bb = bbox(it); return { id: s, x: bb.x, y: bb.y, pts: clone(it.pts) }; }
                            return { id: s, x: it.x, y: it.y };
                        }), moved: false,
                        // Ligação com os dois ícones no conjunto: as dobras andam junto.
                        lw: D.items.filter(function (l) { return l.t === 'link' && l.wp.length && movable.indexOf(l.a.id) >= 0 && movable.indexOf(l.b.id) >= 0; })
                            .map(function (l) { return { id: l.id, wp: clone(l.wp) }; }) };
                } else if (e.shiftKey) {
                    drag = { k: 'marq', p: p, base: sel.slice() };
                } else {
                    // Fundo: segurar e arrastar move a vista (Claudio, 26/09/2026).
                    sel = [];
                    drag = { k: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
                    svg.classList.add('is-panning');
                }
            }
            try { svg.setPointerCapture(e.pointerId); } catch (err) { /* navegador sem captura */ }
            render();
        });
        svg.addEventListener('pointermove', function (e) {
            if (tool === 'duct' && ductDraft && !drag) {
                var pc = toBoard(e), qc = alignTo(pc, [ductDraft[ductDraft.length - 1]], e.altKey);
                draftPreview(qc);
                return;
            }
            if (!drag) { return; }
            var p = toBoard(e);
            if (drag.k === 'dv') {
                if (!drag.moved) { snap(); drag.moved = true; }
                var dv = get(drag.id);
                dv.pts[drag.j] = alignTo(p, [dv.pts[drag.j - 1], dv.pts[drag.j + 1]], e.altKey);
                paint(); drawSel(); return;
            }
            if (drag.k === 'pan') {
                view.x = drag.vx + e.clientX - drag.sx; view.y = drag.vy + e.clientY - drag.sy; applyView(); return;
            }
            if (drag.k === 'wp') {
                if (!drag.moved) { snap(); drag.moved = true; }
                // Livre, sem grade; gruda na mesma linha/coluna da dobra ou ponta
                // vizinha (6 px na tela), com guia rosa. Alt desliga o encaixe.
                var lw = get(drag.id), P = linkPts(lw, get), nb = [P[drag.j], P[drag.j + 2]], tol = 6 / view.z;
                var wx = p.x, wy = p.y, gx = null, gy = null;
                if (!e.altKey) {
                    nb.forEach(function (q) {
                        if (!q) { return; }
                        if (gx === null && Math.abs(q.x - p.x) < tol) { gx = q.x; }
                        if (gy === null && Math.abs(q.y - p.y) < tol) { gy = q.y; }
                    });
                }
                if (gx !== null) { wx = gx; }
                if (gy !== null) { wy = gy; }
                lw.wp[drag.j] = { x: Math.round(wx * 10) / 10, y: Math.round(wy * 10) / 10 };
                gGuides.innerHTML = (gx !== null ? '<line x1="' + gx + '" y1="-5000" x2="' + gx + '" y2="5000" stroke="#D4537E" stroke-width="' + (1 / view.z) + '"/>' : '')
                    + (gy !== null ? '<line x1="-5000" y1="' + gy + '" x2="5000" y2="' + gy + '" stroke="#D4537E" stroke-width="' + (1 / view.z) + '"/>' : '');
                paint(); drawSel(); return;
            }
            if (drag.k === 'end') {
                var le = get(drag.id), other = le[drag.end === 'a' ? 'b' : 'a'].id, al = iconAt(p), gl = '';
                if (al && al.id !== other) {
                    var alb = bbox(al), aa = anchor(al, nearestSide(al, p));
                    gl = '<rect x="' + (alb.x - 4) + '" y="' + (alb.y - 4) + '" width="' + (alb.w + 8) + '" height="' + (alb.h + 8) + '" fill="none" stroke="#378ADD" stroke-width="' + (2 / view.z) + '"/>'
                        + '<circle cx="' + aa.x + '" cy="' + aa.y + '" r="' + (5 / view.z) + '" fill="#378ADD"/>';
                }
                gGuides.innerHTML = gl + '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (4 / view.z) + '" fill="none" stroke="#378ADD" stroke-width="' + (1.5 / view.z) + '"/>';
                return;
            }
            if (drag.k === 'link') {
                var alvo = iconAt(p), gh = '';
                if (alvo && alvo.id !== drag.from) {
                    var ab = bbox(alvo), na = anchor(alvo, nearestSide(alvo, p));
                    gh = '<rect x="' + (ab.x - 4) + '" y="' + (ab.y - 4) + '" width="' + (ab.w + 8) + '" height="' + (ab.h + 8) + '" fill="none" stroke="#378ADD" stroke-width="' + (2 / view.z) + '"/>'
                        + '<circle cx="' + na.x + '" cy="' + na.y + '" r="' + (5 / view.z) + '" fill="#378ADD"/>';
                    p = na;
                }
                gGuides.innerHTML = gh + '<line x1="' + drag.a.x + '" y1="' + drag.a.y + '" x2="' + p.x + '" y2="' + p.y
                    + '" stroke="#378ADD" stroke-width="' + (2 / view.z) + '" stroke-dasharray="' + (6 / view.z) + ' ' + (4 / view.z) + '"/>';
                return;
            }
            if (drag.k === 'rzi') {
                var ic = get(drag.id);
                ic.size = Math.max(24, Math.min(160, Math.round(Math.max(p.x - ic.x, p.y - ic.y) / 4) * 4));
                paint();
                drawSel(); return;
            }
            if (drag.k === 'zone' || drag.k === 'rz') {
                var z = get(drag.id);
                if (drag.k === 'zone') {
                    z.x = Math.min(drag.ox, Math.round(p.x / GRID) * GRID); z.y = Math.min(drag.oy, Math.round(p.y / GRID) * GRID);
                    z.w = Math.max(20, Math.abs(Math.round(p.x / GRID) * GRID - drag.ox)); z.h = Math.max(20, Math.abs(Math.round(p.y / GRID) * GRID - drag.oy));
                } else {
                    z.w = Math.max(20, Math.round((p.x - z.x) / GRID) * GRID); z.h = Math.max(20, Math.round((p.y - z.y) / GRID) * GRID);
                }
                paint();
                drawSel(); return;
            }
            if (drag.k === 'marq') {
                var x = Math.min(p.x, drag.p.x), y = Math.min(p.y, drag.p.y), w = Math.abs(p.x - drag.p.x), h = Math.abs(p.y - drag.p.y);
                marq.removeAttribute('hidden');
                marq.setAttribute('x', x); marq.setAttribute('y', y); marq.setAttribute('width', w); marq.setAttribute('height', h);
                var dentro = D.items.filter(function (it) { if (it.t === 'link') { return false; } var b = bbox(it); return b.x >= x && b.y >= y && b.x + b.w <= x + w && b.y + b.h <= y + h; })
                    .map(function (it) { return it.id; });
                sel = drag.base.concat(expand(dentro).filter(function (i) { return drag.base.indexOf(i) < 0; }));
                drawSel(); return;
            }
            if (drag.k === 'move' && drag.start.length) {
                if (!drag.moved) { snap(); drag.moved = true; }
                var dx = p.x - drag.p.x, dy = p.y - drag.p.y;
                // Guias: o centro do primeiro item gruda no centro de outro item (6 px).
                var first = get(drag.start[0].id), b0 = bbox(first);
                var cx = drag.start[0].x + dx + b0.w / 2, cy = drag.start[0].y + dy + b0.h / 2;
                var gx = null, gy = null;
                D.items.forEach(function (o) {
                    if (drag.start.some(function (s) { return s.id === o.id; }) || o.t === 'zone' || o.t === 'link' || o.t === 'duct') { return; }
                    var b = bbox(o), ox = b.x + b.w / 2, oy = b.y + b.h / 2;
                    if (gx === null && Math.abs(ox - cx) < SNAP / view.z) { gx = ox; }
                    if (gy === null && Math.abs(oy - cy) < SNAP / view.z) { gy = oy; }
                });
                var ddx = gx !== null ? dx + (gx - cx) : Math.round((drag.start[0].x + dx) / GRID) * GRID - drag.start[0].x;
                var ddy = gy !== null ? dy + (gy - cy) : Math.round((drag.start[0].y + dy) / GRID) * GRID - drag.start[0].y;
                drag.start.forEach(function (s) {
                    var it = get(s.id);
                    if (s.pts) { it.pts = s.pts.map(function (q) { return { x: Math.round((q.x + ddx) * 10) / 10, y: Math.round((q.y + ddy) * 10) / 10 }; }); return; }
                    it.x = s.x + ddx; it.y = s.y + ddy;
                });
                (drag.lw || []).forEach(function (s) { get(s.id).wp = s.wp.map(function (q) { return { x: q.x + ddx, y: q.y + ddy }; }); });
                gGuides.innerHTML = (gx !== null ? '<line x1="' + gx + '" y1="-5000" x2="' + gx + '" y2="5000" stroke="#D4537E" stroke-width="' + (1 / view.z) + '"/>' : '')
                    + (gy !== null ? '<line x1="-5000" y1="' + gy + '" x2="5000" y2="' + gy + '" stroke="#D4537E" stroke-width="' + (1 / view.z) + '"/>' : '');
                paint();
                drawSel();
            }
        });
        svg.addEventListener('pointerup', function (e) {
            svg.classList.remove('is-panning');
            if (drag && drag.k === 'end') {
                // Religar: outra borda do mesmo ícone ou outro ícone; no vazio, nada muda.
                var pe = toBoard(e), Le = get(drag.id), oth = Le[drag.end === 'a' ? 'b' : 'a'].id, ti = iconAt(pe);
                if (ti && ti.id !== oth) {
                    var ns = nearestSide(ti, pe);
                    if (ti.id !== Le[drag.end].id || ns !== Le[drag.end].side) { snap(); Le[drag.end] = { id: ti.id, side: ns }; }
                }
            }
            if (drag && drag.k === 'link') {
                // Soltar no vazio não cria nada (forma ligada é do Fluxograma, Q5).
                var tgt = iconAt(toBoard(e));
                if (tgt && tgt.id !== drag.from) {
                    snap();
                    var L = { id: uid(), t: 'link', a: { id: drag.from, side: drag.side }, b: { id: tgt.id, side: nearestSide(tgt, toBoard(e)) },
                        kind: LINK_DEFAULT, route: 'elbow', wp: [], ends: 'none', label: '', cable: nextCable(D.items),
                        pa: '', pb: '', vel: '', vlan: '', poe: false, showId: true, fs: 'm',
                        len: { mode: 'auto', m: 0, extra: 10 }, showM: true, lock: false, g: '' };
                    D.items.push(L);
                    sel = [L.id];
                }
            }
            if (drag && drag.k === 'zone') { tool = 'select'; }
            if (drag && drag.k === 'move' && !drag.moved) { /* só seleção */ }
            drag = null;
            marq.setAttribute('hidden', '');
            gGuides.innerHTML = '';
            render();
        });
        svg.addEventListener('wheel', function (e) {
            e.preventDefault();
            var r = svg.getBoundingClientRect();
            if (e.shiftKey) { view.x -= e.deltaY || e.deltaX; applyView(); }
            else { zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top); }
            drawSel();
        }, { passive: false });
        svg.addEventListener('dblclick', function (e) {
            var id = hit(e.target); if (!id || ['link', 'duct'].indexOf((get(id) || {}).t) >= 0) { return; }
            sel = [id]; render();
            var f = props.querySelector('[data-k="label"],[data-k="text"]'); if (f) { f.focus(); f.select(); }
        });

        /* ---------- teclado ---------- */
        function typing() { var a = document.activeElement; return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && root.contains(a); }
        function onKey(e) {
            if (ni) { if (e.key === 'Escape') { e.preventDefault(); niClose(); } return; }
            if (e.key === ' ' && !typing()) { space = true; e.preventDefault(); return; }
            if (typing()) { if (e.key === 'Escape') { document.activeElement.blur(); } return; }
            if (tool === 'duct') {
                if (e.key === 'Enter') { e.preventDefault(); finishDuct(); return; }
                if (e.key === 'Escape') { e.preventDefault(); ductDraft = null; gGuides.innerHTML = ''; tool = 'select'; render(); return; }
            }
            var ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
            if (k === 'escape') { if (sel.length) { sel = []; render(); } else { close(); } e.preventDefault(); return; }
            if (ctrl && k === 'z') { e.preventDefault(); if (e.shiftKey) { redoIt(); } else { undo(); } return; }
            if (ctrl && k === 'y') { e.preventDefault(); redoIt(); return; }
            if (ctrl && k === 'g') { e.preventDefault(); act(e.shiftKey ? 'ungroup' : 'group'); return; }
            if (ctrl && k === 'c') { clip = withLinks(sel); e.preventDefault(); return; }
            if (ctrl && (k === 'v' || k === 'd')) {
                e.preventDefault();
                var src = k === 'd' ? withLinks(sel) : clip;
                if (!src || !src.length) { return; }
                snap();
                var mapa = {}, ids = {}, novos = [];
                src.filter(function (o) { return o.t !== 'link'; }).forEach(function (o) {
                    var n = clone(o); n.id = uid(); ids[o.id] = n.id;
                    if (n.t === 'duct') { n.pts.forEach(function (q) { q.x += 20; q.y += 20; }); } else { n.x += 20; n.y += 20; }
                    if (n.g) { mapa[n.g] = mapa[n.g] || uid(); n.g = mapa[n.g]; }
                    D.items.push(n); novos.push(n.id);
                });
                // Ligação só vai junto se os dois ícones foram copiados.
                src.filter(function (o) { return o.t === 'link' && ids[o.a.id] && ids[o.b.id]; }).forEach(function (o) {
                    var n = clone(o); n.id = uid(); n.a.id = ids[o.a.id]; n.b.id = ids[o.b.id];
                    if (/^P-\d+$/.test(n.cable || '')) { n.cable = nextCable(D.items); }
                    n.wp = (n.wp || []).map(function (q) { return { x: q.x + 20, y: q.y + 20 }; });
                    if (n.g) { mapa[n.g] = mapa[n.g] || uid(); n.g = mapa[n.g]; }
                    D.items.push(n); novos.push(n.id);
                });
                sel = novos;
                if (k === 'v') { clip = withLinks(sel); }
                render(); return;
            }
            if (k === 'delete' || k === 'backspace') { e.preventDefault(); act('del'); return; }
            if (k === 'v') { tool = 'select'; render(); return; }
            if (k === 'z') { tool = 'zone'; render(); return; }
            if (k === 't') { tool = 'text'; render(); return; }
            if (k === 'e') { tool = 'duct'; ductDraft = null; render(); return; }
            if (k === 'r') { act('rotate'); return; }
            var mv = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[k];
            if (mv && sel.length) {
                e.preventDefault(); snap();
                var step = e.shiftKey ? GRID : 1;
                sel.forEach(function (id) {
                    var it = get(id); if (it.lock || it.t === 'link') { return; }
                    if (it.t === 'duct') { it.pts.forEach(function (q) { q.x += mv[0] * step; q.y += mv[1] * step; }); return; }
                    it.x += mv[0] * step; it.y += mv[1] * step;
                });
                render();
            }
        }
        // Selecionados + ligações cujos dois ícones estão na seleção.
        function withLinks(ids) {
            var out = ids.map(get).filter(Boolean);
            D.items.forEach(function (i) {
                if (i.t === 'link' && ids.indexOf(i.id) < 0 && ids.indexOf(i.a.id) >= 0 && ids.indexOf(i.b.id) >= 0) { out.push(i); }
            });
            return out.map(clone);
        }
        function onKeyUp(e) { if (e.key === ' ') { space = false; } }
        document.addEventListener('keydown', onKey, true);
        document.addEventListener('keyup', onKeyUp, true);

        /* ---------- ações da barra ---------- */
        function act(a) {
            if (a === 'group' && sel.length > 1) { snap(); var g = uid(); sel.forEach(function (id) { get(id).g = g; }); render(); }
            else if (a === 'ungroup' && sel.length) { snap(); sel.forEach(function (id) { get(id).g = ''; }); render(); }
            else if (a === 'lock' && sel.length) {
                snap(); var trava = !sel.every(function (id) { return get(id).lock; });
                sel.forEach(function (id) { get(id).lock = trava; }); render();
            }
            else if (a === 'rotate') {
                var gi = sel.map(get).filter(function (i) { return i && i.t === 'icon' && !i.lock; });
                if (!gi.length) { return; }
                snap();
                gi.forEach(function (i) {
                    if (i.cone) { i.cone.dir = (i.cone.dir + 90) % 360; } else { i.rot = ((i.rot || 0) + 90) % 360; }
                });
                render();
            }
            else if (a === 'smaller' || a === 'bigger') {
                var alvo = (sel.length ? sel.map(get) : D.items).filter(function (i) { return i && i.t === 'icon'; });
                if (!alvo.length) { return; }
                snap();
                alvo.forEach(function (i) {
                    var n = Math.max(24, Math.min(160, i.size + (a === 'bigger' ? 8 : -8)));
                    i.x -= (n - i.size) / 2; i.y -= (n - i.size) / 2; i.size = n;
                });
                render();
            }
            else if (a === 'del' && sel.length) {
                snap();
                D.items = D.items.filter(function (i) { return sel.indexOf(i.id) < 0; });
                // Ligação sem um dos ícones sai junto.
                D.items = D.items.filter(function (i) { return i.t !== 'link' || (get(i.a.id) && get(i.b.id)); });
                sel = []; render();
            }
            else if (a === 'undo') { undo(); }
            else if (a === 'redo') { redoIt(); }
            else if (a === 'zin' || a === 'zout') { var r = svg.getBoundingClientRect(); zoomAt(a === 'zin' ? 1.2 : 1 / 1.2, r.width / 2, r.height / 2); drawSel(); }
            else if (a === 'fit') { fit(); drawSel(); }
            else if (a === 'bg') { pickBg(); }
            else if (a === 'rot') { rotate(); }
            else if (a === 'bgdel') { snap(); bgUrl = ''; bgChanged = false; root.querySelector('[data-act="bgdel"]').hidden = true; root.querySelector('[data-act="rot"]').hidden = true; render(); }
            else if (a === 'png') { downloadPng(); }
            else if (a === 'cancel') { close(); }
            else if (a === 'save') { save(); }
        }
        root.querySelector('.cx-board-top').addEventListener('click', function (e) {
            var t = e.target.closest('[data-tool]');
            if (t) { tool = t.getAttribute('data-tool'); ductDraft = null; gGuides.innerHTML = ''; render(); return; }
            var b = e.target.closest('button[data-act]');
            if (b) { act(b.getAttribute('data-act')); }
        });
        var op = root.querySelector('[data-act="op"]');
        if (op) { op.addEventListener('input', function () { D.bgOpacity = +op.value / 100; render(); }); }
        var lgChk = root.querySelector('[data-act="legend"]');
        lgChk.addEventListener('change', function () { D.legend = lgChk.checked; });

        /* Gira a planta 90° no sentido horário, com os itens junto. */
        function rotate() {
            if (!bgUrl) { return; }
            var im = new Image();
            im.onload = function () {
                var cv = document.createElement('canvas');
                cv.width = im.naturalHeight; cv.height = im.naturalWidth;
                var g = cv.getContext('2d');
                g.translate(cv.width, 0); g.rotate(Math.PI / 2); g.drawImage(im, 0, 0);
                snap();
                var H = D.h;
                var ROT = { n: 'l', l: 's', s: 'o', o: 'n' };
                D.items.forEach(function (it) {
                    if (it.t === 'duct') {
                        it.pts = it.pts.map(function (q) { return { x: H - q.y, y: q.x }; });
                        return;
                    }
                    if (it.t === 'link') {
                        it.a.side = ROT[it.a.side]; it.b.side = ROT[it.b.side];
                        it.wp = (it.wp || []).map(function (q) { return { x: H - q.y, y: q.x }; });
                        return;
                    }
                    var b = bbox(it);
                    var w = it.t === 'icon' ? it.size : (it.t === 'zone' ? it.w : b.w);
                    var h = it.t === 'icon' ? it.size : (it.t === 'zone' ? it.h : b.h);
                    var nx = H - (it.y + h), ny = it.x;
                    it.x = nx; it.y = ny;
                    if (it.t === 'zone') { var t = it.w; it.w = it.h; it.h = t; }
                    if (it.cone) { it.cone.dir = (it.cone.dir + 90) % 360; }
                    else if (it.t === 'icon') { it.rot = ((it.rot || 0) + 90) % 360; }
                    void w;
                });
                var t = D.w; D.w = D.h; D.h = t;
                bgUrl = cv.toDataURL('image/jpeg', 0.85); bgChanged = true;
                render(); fit();
            };
            im.src = bgUrl;
        }

        function pickBg() {
            var input = document.createElement('input');
            input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp,image/gif';
            input.addEventListener('change', function () {
                var f = input.files && input.files[0]; if (!f) { return; }
                fileToDataUrl(f, 2400).then(function (r) {
                    snap();
                    bgUrl = r.url; bgChanged = true;
                    D.w = r.w; D.h = r.h;
                    D.pxm = 0; // planta nova: a escala tem que ser medida de novo
                    root.querySelector('[data-act="bg"]').textContent = 'Trocar planta';
                    root.querySelector('[data-act="bgdel"]').hidden = false;
                    root.querySelector('[data-act="rot"]').hidden = false;
                    render(); fit();
                }).catch(function () { notify(editor, 'Não foi possível abrir essa imagem. Use PNG ou JPG (um PDF precisa ser salvo como imagem antes).', 'error'); });
            });
            input.click();
        }

        function save() {
            var btn = root.querySelector('[data-act="save"]');
            btn.disabled = true; btn.textContent = 'Gerando…';
            D.lib = libOf(D.items);
            toPng(D, bgUrl || null).then(function (png) {
                return (D.legend ? legendPng(D) : Promise.resolve(null)).then(function (lp) { return [png, lp]; });
            }).then(function (r) {
                var png = r[0];
                var ok = apply(editor, node, D, png, bgUrl ? { url: bgUrl, changed: bgChanged } : null, r[1]);
                if (!ok) { notify(editor, 'Área de envio de arquivos não encontrada: o quadro não será gravado.', 'error'); }
                close();
            }).catch(function () {
                btn.disabled = false; btn.textContent = node ? 'Salvar quadro' : 'Inserir no documento';
                notify(editor, 'Não foi possível gerar a imagem do quadro.', 'error');
            });
        }

        /* Q2f (Claudio, 27/09/2026): o PNG do quadro em arquivo, para mandar
           por WhatsApp ou e-mail sem exportar o documento. Mesmo toPng() do
           Salvar, com o estado atual (inclusive o que ainda não foi salvo).
           Nome: planta|topologia-<título do documento>-AAAA-MM-DD.png. */
        function downloadPng() {
            var btn = root.querySelector('[data-act="png"]');
            if (btn.disabled) { return; }
            btn.disabled = true; btn.textContent = 'Gerando…';
            var done = function () { btn.disabled = false; btn.textContent = 'Baixar PNG'; };
            toPng(D, bgUrl || null).then(function (blob) {
                var a = document.createElement('a');
                var url = URL.createObjectURL(blob);
                a.href = url;
                a.download = pngName(D.mode);
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
                done();
            }).catch(function () {
                done();
                notify(editor, 'Não foi possível gerar a imagem do quadro.', 'error');
            });
        }

        function close() {
            document.removeEventListener('keydown', onKey, true);
            document.removeEventListener('keyup', onKeyUp, true);
            document.documentElement.classList.remove('cx-board-open');
            root.remove();
        }

        // Ligações feitas no Q2a nasceram sem número: numera ao abrir.
        D.items.forEach(function (i) { if (i.t === 'link' && !i.cable) { i.cable = nextCable(D.items); } });

        paleta();
        render();
        setTimeout(fit, 0);

        // Exposto para os testes (jsdom).
        root.__cx = { data: function () { return D; }, sel: function () { return sel; }, act: act, addIcon: addIcon, setTool: function (t) { tool = t; },
            setSel: function (ids) { sel = ids; render(); }, onKey: onKey, niOpen: niOpen, mgOpen: mgOpen, ni: function () { return ni; } };
    }

    window.CodexplusBoard = { open: open, _clean: clean, _itemSvg: itemSvg, _linkSvg: linkSvg, _finder: finder, _nextCable: nextCable, _routePts: routePts, _routeD: routeD, _linkMeters: linkMeters, _linkText: linkText, _ductSvg: ductSvg, _ductMeters: ductMeters, _setPxm: function (v) { PXM = v || PXM_DEFAULT; }, _toPng: toPng, _starter: starter, _apply: apply, _pngName: pngName, _materials: materials, _materialsHtml: materialsHtml, _legendEntries: legendEntries, _legendSvg: legendSvg, _legendOf: legendOf, _boardOfLegend: boardOfLegend, _libOf: libOf, _lib: LIB, _loadLibrary: loadLibrary, _removeBg: removeBg, _tint: tint };
})();
