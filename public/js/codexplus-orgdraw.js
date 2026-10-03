/* =========================================================================
   Codex+ — desenho do organograma em SVG (bloco Q6a-1, Claudio 03/10/2026; -2: ajuste à tela, zoom, tela cheia e busca;
   Q6b-1: partes do desenho para o motor de quadro e o botão de teste;
   Q6c: modelos e níveis para o motor de quadro)
   -------------------------------------------------------------------------
   Primeiro passo do Q6 (organograma no motor de quadro). Desenha o JSON
   gravado do organograma (o MESMO formato de sempre: nodes, edges, levels,
   esc, elements — decisão de Claudio, 03/10) como SVG, com as regras do
   motor antigo (codexplus-org.js):
     - um chefe por elemento (ligação `boss`); as demais são reporte;
     - quem não tem equipe vira LINHA no cartão do chefe; quem tem equipe,
       não tem chefe ou foi posicionado à mão (x/y) é cartão próprio;
     - arranjo em árvore (HGAP 14, VGAP 48); o solto fica onde foi largado
       e leva a equipe junto.
   Diferença decidida por Claudio (03/10): as dobras feitas à mão
   (`waypoints`) saem — eram testes; a ligação é traçada sempre pelo
   cotovelo automático.

   Neste bloco só a LEITURA do documento usa este desenho (legenda, SVG,
   matriz e PDF); a edição continua no motor antigo até o Q6b.

   Uso: <div data-cx-orgview data-source="id-do-json" data-title data-code>
   API: window.CodexplusOrgDraw = { normalize, layout, svg, legendHtml,
        escHtml, mount, measure }  (funções puras testáveis em jsdom).
   ========================================================================= */
(function () {
    'use strict';

    var LEGACY_LEVELS = [
        { key: 'diretoria', label: 'Diretoria', color: '#22314f' },
        { key: 'gestao', label: 'Coordenação', color: '#3e6aa8' },
        { key: 'supervisao', label: 'Supervisão', color: '#c4860e' },
        { key: 'n3', label: 'Analista N3', color: '#7a4fb5' },
        { key: 'n2', label: 'Técnico N2', color: '#1f7f6c' },
        { key: 'n1', label: 'Técnico N1', color: '#2e86d1' },
        { key: 'noc', label: 'NOC (coringa)', color: '#cf4b66' }
    ];

    // Medidas do cartão: as mesmas do CSS do motor antigo (.cx-org-card).
    var C = {
        minW: 178, maxW: 230, bar: 6, padL: 12, padR: 12, bord: 1, radius: 8,
        padTop: 9, padBot: 8,
        nameFs: 15.5, nameLh: 18.6,
        roleFs: 12.5, roleLh: 16.25, roleGap: 2,
        tagFs: 11, tagH: 17, tagGap: 5,
        rowFs: 13.5, rowLh: 18.25, rowPadY: 3, rowsPadTop: 4, rowsPadBot: 5,
        dot: 7, dotGap: 8,
        HGAP: 14, VGAP: 48, pad: { t: 28, r: 24, b: 40, l: 24 }
    };
    var INK = '#17202d', MUTED = '#5a6575', BORDER = '#d3d9e0', SURF = '#ffffff', LINE = '#8e9aaa', WARN = '#8a5500';
    var F_NAME = '"IBM Plex Sans Condensed", "IBM Plex Sans", Arial, sans-serif';
    var F_TEXT = '"IBM Plex Sans", Arial, sans-serif';

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function r1(v) { return Math.round(v * 10) / 10; }

    /* ---------------- dados ---------------- */
    // Cópia normalizada (não mexe no objeto recebido). Mesmas regras do
    // normalize() do motor antigo; as dobras (waypoints) saem.
    function fromTree(tree) {
        var nodes = [], edges = [], k = 0;
        (function go(n, pid) {
            if (!n || typeof n !== 'object') { return; }
            var copy = {}, key;
            for (key in n) { if (key !== 'kids' && Object.prototype.hasOwnProperty.call(n, key)) { copy[key] = n[key]; } }
            if (!copy.id) { copy.id = 'n' + (++k + 100000); }
            nodes.push(copy);
            if (pid) { edges.push({ id: 'e' + edges.length, from: pid, to: copy.id }); }
            (n.kids || []).forEach(function (c) { go(c, copy.id); });
        })(tree, null);
        return { nodes: nodes, edges: edges };
    }
    function normalize(src) {
        var s = JSON.parse(JSON.stringify(src && typeof src === 'object' ? src : {}));
        if (!Array.isArray(s.nodes) && s.tree) { var g = fromTree(s.tree); s.nodes = g.nodes; s.edges = g.edges; }
        delete s.tree;
        s.kind = 'organograma';
        s.nodes = Array.isArray(s.nodes) ? s.nodes.filter(function (n) { return n && n.id; }) : [];
        s.edges = Array.isArray(s.edges) ? s.edges : [];
        if (!s.nodes.length) { s.nodes = [{ id: 'n1', name: '', role: 'Direção', lvl: '', note: '' }]; }
        var legacy = !Array.isArray(s.levels) || !s.levels.length;
        if (legacy) { s.levels = LEGACY_LEVELS.map(function (l) { return { key: l.key, label: l.label, color: l.color }; }); }
        s.levels = s.levels.filter(function (l) { return l && l.key; }).map(function (l) {
            return { key: String(l.key), label: String(l.label || l.key), color: /^#[0-9a-f]{6}$/i.test(l.color || '') ? l.color : '#5a6575' };
        });
        var keys = s.levels.map(function (l) { return l.key; }), last = keys[keys.length - 1], ids = {};
        s.elements = Array.isArray(s.elements) ? s.elements : [];
        s.nodes.forEach(function (n) {
            n.id = String(n.id);
            n.name = String(n.name || ''); n.role = String(n.role || ''); n.note = String(n.note || '');
            if (keys.indexOf(n.lvl) < 0) { n.lvl = last; }
            if (legacy && n.lvl === 'noc' && n.dashed === undefined) { n.dashed = true; }
            if (!(typeof n.x === 'number' && typeof n.y === 'number' && isFinite(n.x) && isFinite(n.y))) { delete n.x; delete n.y; }
            ids[n.id] = true;
        });
        var semMarca = !s.edges.some(function (e) { return e && e.boss; });
        var pai = {}, vistos = {};
        s.edges = s.edges.filter(function (e) {
            if (!e || !ids[e.from] || !ids[e.to] || e.from === e.to) { return false; }
            var par = e.from + '>' + e.to;
            if (vistos[par]) { return false; }
            vistos[par] = true;
            delete e.waypoints;                       // Q6: dobras à mão saem
            e.id = String(e.id || ('e' + Object.keys(vistos).length));
            e.style = e.style === 'tracejada' ? 'tracejada' : 'solida';
            e.label = String(e.label || '');
            e.boss = !!e.boss || semMarca;
            if (!e.boss) { return true; }
            if (pai[e.to]) { e.boss = false; return true; }
            var at = e.from, guard = 0;
            while (pai[at] && guard++ < 5000) { if (at === e.to) { break; } at = pai[at]; }
            if (at === e.to) { e.boss = false; return true; }
            pai[e.to] = e.from;
            return true;
        });
        if (!Array.isArray(s.esc)) { s.esc = []; }
        s.esc = s.esc.filter(function (r) { return r && Array.isArray(r.c); }).map(function (r) {
            return { lvl: keys.indexOf(r.lvl) < 0 ? last : r.lvl, c: [0, 1, 2, 3].map(function (i) { return String(r.c[i] == null ? '' : r.c[i]); }) };
        });
        return s;
    }

    // Árvore derivada: kids por nó, chefe de cada um, topo.
    function tree(S) {
        var byId = {}, parentOf = {}, kids = {};
        S.nodes.forEach(function (n) { byId[n.id] = n; kids[n.id] = []; });
        S.edges.forEach(function (e) {
            if (!e.boss || !byId[e.from] || !byId[e.to] || parentOf[e.to]) { return; }
            parentOf[e.to] = e.from;
            kids[e.from].push(byId[e.to]);
        });
        var top = null;
        for (var i = 0; i < S.nodes.length; i++) { if (!parentOf[S.nodes[i].id]) { top = S.nodes[i]; break; } }
        return { byId: byId, parentOf: parentOf, kids: kids, top: top || S.nodes[0] };
    }
    function isFree(n) { return typeof n.x === 'number' && typeof n.y === 'number'; }
    function label(n) { return n.name.trim() || (n.lvl === 'noc' ? 'Coringa a definir' : 'Vaga em aberto'); }

    /* ---------------- medida de texto ---------------- */
    // No navegador, mede com a fonte de verdade (canvas); sem canvas (jsdom),
    // estima pela quantidade de caracteres — o teste confere a coerência.
    var ctx = null;
    function textW(txt, font, fs) {
        if (ctx === null) {
            try { var cv = document.createElement('canvas'); ctx = (cv.getContext && cv.getContext('2d')) || false; } catch (e) { ctx = false; }
            if (ctx && typeof ctx.measureText !== 'function') { ctx = false; }
        }
        if (ctx) { ctx.font = font; var m = ctx.measureText(txt); if (m && m.width) { return m.width; } }
        return String(txt).length * fs * 0.52;
    }
    var FONTS = {
        name: function (it) { return (it ? 'italic ' : '') + '600 ' + C.nameFs + 'px ' + F_NAME; },
        role: function () { return '400 ' + C.roleFs + 'px ' + F_TEXT; },
        row: function (it) { return (it ? 'italic ' : '') + '400 ' + C.rowFs + 'px ' + F_TEXT; },
        tag: function () { return '500 ' + C.tagFs + 'px ' + F_TEXT; }
    };
    function wrap(txt, font, fs, max) {
        var out = [], line = '';
        String(txt).split(/\s+/).filter(Boolean).forEach(function (w) {
            var t = line ? line + ' ' + w : w;
            if (!line || textW(t, font, fs) <= max) { line = t; } else { out.push(line); line = w; }
        });
        if (line) { out.push(line); }
        return out.length ? out : [''];
    }
    function tagList(n) {
        var t = [];
        if (n.kind === 'assessoria') { t.push({ txt: 'assessoria', warn: false }); }
        if (n.kind === 'terceiro') { t.push({ txt: 'externo', warn: false }); }
        if (n.pend) { t.push({ txt: 'a confirmar', warn: true }); }
        return t;
    }
    function tagW(t) { return Math.ceil(textW(t.txt, FONTS.tag(), C.tagFs)) + 14; }

    // Mede um cartão: largura pelo conteúdo (178 a 230, como o CSS), linhas
    // quebradas na largura final, altura somada.
    function measureCard(n, leaves) {
        var vaga = !n.name.trim(), tags = tagList(n);
        var inner = 0;
        inner = Math.max(inner, textW(label(n), FONTS.name(vaga), C.nameFs));
        if (n.role) { inner = Math.max(inner, textW(n.role, FONTS.role(), C.roleFs)); }
        if (tags.length) { inner = Math.max(inner, tags.reduce(function (a, t) { return a + tagW(t) + 4; }, -4)); }
        leaves.forEach(function (k) {
            var tk = tagList(k), w = C.dot + C.dotGap + textW(label(k), FONTS.row(!k.name.trim()), C.rowFs);
            if (tk.length) { w += C.dotGap + tk.reduce(function (a, t) { return a + tagW(t) + 4; }, -4); }
            inner = Math.max(inner, w);
        });
        // min/max-width do CSS valem sem as bordas (box-sizing: content-box):
        // o cartão tem 178 a 230 de conteúdo + padding, mais 6 + 1 de borda.
        var pads = C.padL + C.padR, bords = C.bar + C.bord;
        var w = Math.min(C.maxW, Math.max(C.minW, Math.ceil(inner) + pads)) + bords;
        var max = w - pads - bords;
        var nameL = wrap(label(n), FONTS.name(vaga), C.nameFs, max);
        var roleL = n.role ? wrap(n.role, FONTS.role(), C.roleFs, max) : [];
        var h = C.bord + C.padTop + nameL.length * C.nameLh + C.roleGap + roleL.length * C.roleLh;
        if (tags.length) { h += C.tagGap + C.tagH; }
        h += C.padBot;
        var rows = leaves.map(function (k) {
            var tk = tagList(k), tw = tk.length ? C.dotGap + tk.reduce(function (a, t) { return a + tagW(t) + 4; }, -4) : 0;
            var lines = wrap(label(k), FONTS.row(!k.name.trim()), C.rowFs, max - C.dot - C.dotGap - tw);
            return { n: k, lines: lines, tags: tk, h: lines.length * C.rowLh + 2 * C.rowPadY };
        });
        if (rows.length) { h += 1 + C.rowsPadTop + rows.reduce(function (a, r) { return a + r.h; }, 0) + C.rowsPadBot; }
        h += C.bord;
        return { w: w, h: Math.ceil(h), nameL: nameL, roleL: roleL, tags: tags, rows: rows };
    }

    /* ---------------- arranjo ---------------- */
    function layout(S) {
        var t = tree(S), parentOf = t.parentOf, kids = t.kids;
        function isBox(n) { return !parentOf[n.id] || kids[n.id].length > 0 || isFree(n); }
        function leavesOf(n) { return kids[n.id].filter(function (k) { return !isBox(k); }); }
        function branchesOf(n) { return kids[n.id].filter(isBox); }
        function walk(n, f) { f(n); kids[n.id].forEach(function (k) { walk(k, f); }); }
        var list = S.nodes.filter(isBox), box = {}, wcache = {};
        list.forEach(function (n) {
            var m = measureCard(n, leavesOf(n));
            m.x = 0; m.y = 0; m.n = n;
            box[n.id] = m;
        });
        function blockW(n) {
            if (wcache[n.id] !== undefined) { return wcache[n.id]; }
            var br = branchesOf(n), sum = 0;
            br.forEach(function (k, j) { sum += blockW(k) + (j ? C.HGAP : 0); });
            return (wcache[n.id] = br.length ? Math.max(box[n.id].w, sum) : box[n.id].w);
        }
        function put(n, left, top) {
            var b = box[n.id], total = blockW(n), br = branchesOf(n), sum = 0, at;
            b.x = left + (total - b.w) / 2;
            b.y = top;
            br.forEach(function (k, j) { sum += blockW(k) + (j ? C.HGAP : 0); });
            at = left + (total - sum) / 2;
            br.forEach(function (k) { put(k, at, top + b.h + C.VGAP); at += blockW(k) + C.HGAP; });
        }
        var roots = S.nodes.filter(function (n) { return !parentOf[n.id]; });
        var at = 0;
        roots.forEach(function (r) { if (box[r.id]) { put(r, at, 0); at += blockW(r) + C.HGAP * 4; } });
        function livres(n) {
            var b = box[n.id];
            if (b && isFree(n)) {
                var dx = n.x - b.x, dy = n.y - b.y;
                walk(n, function (m) { if (box[m.id]) { box[m.id].x += dx; box[m.id].y += dy; } });
            }
            branchesOf(n).forEach(livres);
        }
        livres(t.top);
        roots.forEach(function (r) { if (r !== t.top) { livres(r); } });
        var minX = 0, minY = 0, W = 0, H = 0;
        list.forEach(function (n) { var b = box[n.id]; minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); });
        var origin = { x: Math.max(0, -minX), y: Math.max(0, -minY) };
        list.forEach(function (n) {
            var b = box[n.id];
            b.x += origin.x; b.y += origin.y;
            W = Math.max(W, b.x + b.w); H = Math.max(H, b.y + b.h);
        });
        function boxOf(id) {
            var a = id, g = 0;
            while (a && !box[a] && g++ < 100) { a = parentOf[a]; }
            return a ? box[a] : null;
        }
        return { box: box, list: list, w: W, h: H, origin: origin, boxOf: boxOf };
    }

    // Cotovelo entre duas caixas (o mesmo linkPath do motor antigo).
    function linkPath(b, c) {
        var R = Math.round, folga = 8;
        var bx = b.x + b.w / 2, by = b.y + b.h / 2, cx = c.x + c.w / 2, cy = c.y + c.h / 2;
        if (c.y >= b.y + b.h + folga) {
            var ym = R(b.y + b.h + (c.y - b.y - b.h) / 2);
            return { d: 'M' + R(bx) + ' ' + R(b.y + b.h) + 'V' + ym + 'H' + R(cx) + 'V' + R(c.y), mx: R((bx + cx) / 2), my: ym };
        }
        if (c.y + c.h + folga <= b.y) {
            var ya = R(c.y + c.h + (b.y - c.y - c.h) / 2);
            return { d: 'M' + R(bx) + ' ' + R(b.y) + 'V' + ya + 'H' + R(cx) + 'V' + R(c.y + c.h), mx: R((bx + cx) / 2), my: ya };
        }
        if (c.x >= b.x + b.w) {
            var xm = R(b.x + b.w + (c.x - b.x - b.w) / 2);
            return { d: 'M' + R(b.x + b.w) + ' ' + R(by) + 'H' + xm + 'V' + R(cy) + 'H' + R(c.x), mx: xm, my: R((by + cy) / 2) };
        }
        if (c.x + c.w <= b.x) {
            var xe = R(c.x + c.w + (b.x - c.x - c.w) / 2);
            return { d: 'M' + R(b.x) + ' ' + R(by) + 'H' + xe + 'V' + R(cy) + 'H' + R(c.x + c.w), mx: xe, my: R((by + cy) / 2) };
        }
        return { d: 'M' + R(bx) + ' ' + R(by) + 'L' + R(cx) + ' ' + R(cy), mx: R((bx + cx) / 2), my: R((by + cy) / 2) };
    }

    /* ---------------- SVG ---------------- */
    function mix(hex, pct) {   // color-mix(hex pct%, branco)
        var v = parseInt(hex.slice(1), 16), k = pct / 100;
        var ch = function (c) { return Math.round(c * k + 255 * (1 - k)); };
        return '#' + [(v >> 16) & 255, (v >> 8) & 255, v & 255].map(function (c) { var h = ch(c).toString(16); return h.length < 2 ? '0' + h : h; }).join('');
    }
    // Baseline de uma linha de texto: centro da caixa da linha + ~0,35 fs.
    function base(top, lh, fs) { return r1(top + lh / 2 + fs * 0.35); }
    function pill(x, top, t) {
        var w = tagW(t), col = t.warn ? WARN : MUTED, brd = t.warn ? WARN : BORDER;
        return '<rect x="' + r1(x + 0.5) + '" y="' + r1(top + 0.5) + '" width="' + (w - 1) + '" height="' + (C.tagH - 1) + '" rx="' + ((C.tagH - 1) / 2) + '" fill="none" stroke="' + brd + '"/>'
            + '<text x="' + r1(x + 7) + '" y="' + base(top, C.tagH, C.tagFs) + '" font-family=\'' + F_TEXT + '\' font-size="' + C.tagFs + '" font-weight="500" fill="' + col + '">' + esc(t.txt) + '</text>';
    }
    function cardSvg(b, colorOf) {
        var n = b.n, lc = colorOf(n.lvl), x = b.x, y = b.y, w = b.w, h = b.h, R = C.radius;
        var bg = n.group ? mix(lc, 8) : SURF, brd = n.dashed ? lc : BORDER;
        var g = '<g data-id="' + esc(n.id) + '">';
        // sombra de 1 px (box-shadow 0 1px 0), fundo na cor do nível (vira a
        // barra da esquerda) e, por cima, o corpo do cartão.
        g += '<rect x="' + r1(x) + '" y="' + r1(y + 1) + '" width="' + w + '" height="' + h + '" rx="' + R + '" fill="' + BORDER + '"/>';
        g += '<rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + w + '" height="' + h + '" rx="' + R + '" fill="' + lc + '"/>';
        var bx = x + C.bar, ir = 2;
        var body = 'M' + r1(bx + ir) + ' ' + r1(y) + 'H' + r1(x + w - R) + 'A' + R + ' ' + R + ' 0 0 1 ' + r1(x + w) + ' ' + r1(y + R)
            + 'V' + r1(y + h - R) + 'A' + R + ' ' + R + ' 0 0 1 ' + r1(x + w - R) + ' ' + r1(y + h) + 'H' + r1(bx + ir)
            + 'A' + ir + ' ' + ir + ' 0 0 1 ' + r1(bx) + ' ' + r1(y + h - ir) + 'V' + r1(y + ir) + 'A' + ir + ' ' + ir + ' 0 0 1 ' + r1(bx + ir) + ' ' + r1(y) + 'Z';
        g += '<path d="' + body + '" fill="' + bg + '"/>';
        var edge = 'M' + r1(bx) + ' ' + r1(y + 0.5) + 'H' + r1(x + w - R) + 'A' + (R - 0.5) + ' ' + (R - 0.5) + ' 0 0 1 ' + r1(x + w - 0.5) + ' ' + r1(y + R)
            + 'V' + r1(y + h - R) + 'A' + (R - 0.5) + ' ' + (R - 0.5) + ' 0 0 1 ' + r1(x + w - R) + ' ' + r1(y + h - 0.5) + 'H' + r1(bx);
        g += '<path d="' + edge + '" fill="none" stroke="' + brd + '"' + (n.dashed ? ' stroke-dasharray="4 3"' : '') + '/>';
        var tx = x + C.bar + C.padL, top = y + C.bord + C.padTop, vaga = !n.name.trim();
        b.nameL.forEach(function (l) {
            g += '<text x="' + r1(tx) + '" y="' + base(top, C.nameLh, C.nameFs) + '" font-family=\'' + F_NAME + '\' font-size="' + C.nameFs + '" font-weight="600"'
                + (vaga ? ' font-style="italic" fill="' + MUTED + '"' : ' fill="' + INK + '"') + '>' + esc(l) + '</text>';
            top += C.nameLh;
        });
        top += C.roleGap;
        b.roleL.forEach(function (l) {
            g += '<text x="' + r1(tx) + '" y="' + base(top, C.roleLh, C.roleFs) + '" font-family=\'' + F_TEXT + '\' font-size="' + C.roleFs + '" fill="' + MUTED + '">' + esc(l) + '</text>';
            top += C.roleLh;
        });
        if (b.tags.length) {
            top += C.tagGap;
            var px = tx;
            b.tags.forEach(function (t) { g += pill(px, top, t); px += tagW(t) + 4; });
            top += C.tagH;
        }
        top += C.padBot;
        if (b.rows.length) {
            g += '<path d="M' + r1(bx) + ' ' + r1(top + 0.5) + 'H' + r1(x + w - C.bord) + '" stroke="' + BORDER + '"/>';
            top += 1 + C.rowsPadTop;
            b.rowBoxes = [];
            b.rows.forEach(function (r) {
                var k = r.n, kc = colorOf(k.lvl), kv = !k.name.trim(), cy = top + C.rowPadY + C.rowLh / 2;
                // Q6b-1: cada pessoa da lista é clicável no quadro (data-id
                // próprio; a área transparente pega o clique na linha toda).
                var rb = { id: k.id, x: bx, y: top, w: x + w - C.bord - bx, h: r.h };
                b.rowBoxes.push(rb);
                g += '<g data-id="' + esc(k.id) + '"><rect x="' + r1(rb.x) + '" y="' + r1(rb.y) + '" width="' + r1(rb.w) + '" height="' + r1(rb.h) + '" fill="transparent"/>';
                g += (kv || k.dashed)
                    ? '<circle cx="' + r1(tx + C.dot / 2) + '" cy="' + r1(cy) + '" r="' + r1(C.dot / 2 - 0.75) + '" fill="none" stroke="' + kc + '" stroke-width="1.5" stroke-dasharray="2 1.6"/>'
                    : '<circle cx="' + r1(tx + C.dot / 2) + '" cy="' + r1(cy) + '" r="' + (C.dot / 2) + '" fill="' + kc + '"/>';
                var ly = top + C.rowPadY;
                r.lines.forEach(function (l) {
                    g += '<text x="' + r1(tx + C.dot + C.dotGap) + '" y="' + base(ly, C.rowLh, C.rowFs) + '" font-family=\'' + F_TEXT + '\' font-size="' + C.rowFs + '"'
                        + (kv ? ' font-style="italic" fill="' + MUTED + '"' : ' fill="' + INK + '"') + '>' + esc(l) + '</text>';
                    ly += C.rowLh;
                });
                if (r.tags.length) {
                    var tw = r.tags.reduce(function (a, t) { return a + tagW(t) + 4; }, -4), qx = x + w - C.bord - C.padR - tw;
                    r.tags.forEach(function (t) { g += pill(qx, cy - C.tagH / 2, t); qx += tagW(t) + 4; });
                }
                g += '</g>';
                top += r.h;
            });
        }
        return g + '</g>';
    }

    /* Partes do desenho, sem margem: ligações, cartões e as caixas (cartão e
       cada pessoa listada dentro dele). O motor de quadro (Q6b) pinta as
       partes e usa as caixas para clicar, selecionar e buscar. */
    function parts(src) {
        var S = src && src.__norm ? src : normalize(src);
        var L = layout(S);
        var lv = {};
        S.levels.forEach(function (l) { lv[l.key] = l.color; });
        var colorOf = function (k) { return lv[k] || S.levels[S.levels.length - 1].color; };
        var links = '';
        S.edges.forEach(function (e) {
            var b = L.boxOf(e.from), c = L.boxOf(e.to);
            if (!b || !c || b === c) { return; }
            var p = linkPath(b, c), dash = !e.boss || e.style === 'tracejada';
            links += '<path d="' + p.d + '" fill="none" stroke="' + LINE + '" stroke-width="2"' + (dash ? ' stroke-dasharray="6 4"' : '') + (!e.boss ? ' stroke-opacity=".75"' : '') + '/>';
            if (e.label) {
                links += '<text x="' + p.mx + '" y="' + (p.my - 4) + '" text-anchor="middle" font-family=\'' + F_TEXT + '\' font-size="11" fill="' + MUTED + '" paint-order="stroke" stroke="#fff" stroke-width="3">' + esc(e.label) + '</text>';
            }
        });
        var cards = L.list.map(function (n) { return cardSvg(L.box[n.id], colorOf); }).join('');
        var boxes = [];
        L.list.forEach(function (n) {
            var b = L.box[n.id];
            boxes.push({ id: n.id, t: 'card', x: b.x, y: b.y, w: b.w, h: b.h, color: colorOf(n.lvl) });
            (b.rowBoxes || []).forEach(function (r) { boxes.push({ id: r.id, t: 'row', card: n.id, x: r.x, y: r.y, w: r.w, h: r.h }); });
        });
        return { S: S, L: L, links: links, cards: cards, boxes: boxes, colorOf: colorOf };
    }

    // SVG completo. opts.pad = false tira a margem em volta (padrão: a do
    // motor antigo, 28/24/40/24).
    function svg(src, opts) {
        opts = opts || {};
        var pt = parts(src), L = pt.L, P = opts.pad === false ? { t: 0, r: 0, b: 0, l: 0 } : C.pad;
        var W = Math.ceil(L.w + P.l + P.r), H = Math.ceil(L.h + P.t + P.b);
        var links = pt.links, cards = pt.cards;
        var out = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">'
            + (opts.bg ? '<rect width="100%" height="100%" fill="' + opts.bg + '"/>' : '')
            + '<g transform="translate(' + P.l + ',' + P.t + ')">' + links + cards + '</g></svg>';
        return { svg: out, w: W, h: H, layout: L };
    }

    /* ---------------- legenda e matriz (HTML, classes do motor antigo) ---------------- */
    function legendHtml(src) {
        var S = src && src.__norm ? src : normalize(src), c = {}, vagas = 0, total = 0;
        S.nodes.forEach(function (n) {
            if (n.group) { return; }
            if (!n.name.trim()) { vagas++; return; }
            c[n.lvl] = (c[n.lvl] || 0) + 1; total++;
        });
        return S.levels.map(function (l) {
            return '<span style="--lc:' + l.color + '"><i></i>' + esc(l.label) + ' <b>' + (c[l.key] || 0) + '</b></span>';
        }).join('') + '<span><i class="is-dash"></i>Vagas em aberto <b>' + vagas + '</b></span><span>Pessoas nomeadas <b>' + total + '</b></span>';
    }
    function escTableHtml(src) {
        var S = src && src.__norm ? src : normalize(src), lv = {};
        S.levels.forEach(function (l) { lv[l.key] = l.color; });
        if (!S.esc.length) { return ''; }
        return '<section class="cx-org-esc"><h3>Matriz de escalonamento</h3><div class="cx-org-tablewrap"><table><thead><tr>'
            + '<th>Nível</th><th>Papel</th><th>Escala para o próximo nível quando</th><th>Tempo alvo</th></tr></thead><tbody>'
            + S.esc.map(function (r) {
                return '<tr style="--lc:' + (lv[r.lvl] || '#5a6575') + '">' + r.c.map(function (t) { return '<td>' + esc(t) + '</td>'; }).join('') + '</tr>';
            }).join('') + '</tbody></table></div></section>';
    }

    /* ---------------- Q6c: modelos e níveis (Claudio, 03/10/2026) ----------------
       Os mesmos do motor antigo (codexplus-org.js), que sai no Q6d; aqui ficam
       para o motor de quadro. Genéricos de propósito: sem nomes de pessoas
       (o repositório é público). */
    var STD_LEVELS = [
        { key: 'conselho', label: 'Conselho', color: '#22314f' },
        { key: 'diretoria', label: 'Diretoria', color: '#3e6aa8' },
        { key: 'gerencia', label: 'Gerência', color: '#1f5fbf' },
        { key: 'coordenacao', label: 'Coordenação', color: '#1f7f6c' },
        { key: 'supervisao', label: 'Supervisão', color: '#c4860e' },
        { key: 'especialista', label: 'Especialista', color: '#7a4fb5' },
        { key: 'operacional', label: 'Operacional', color: '#2e86d1' }
    ];
    var SWATCHES = ['#22314f', '#3e6aa8', '#1f5fbf', '#1f7f6c', '#c4860e', '#7a4fb5', '#2e86d1', '#cf4b66', '#5a6575', '#b3261e'];
    function copyLevels(a) { return a.map(function (l) { return { key: l.key, label: l.label, color: l.color }; }); }
    function T(name, role, lvl, kids, o) {
        var n = { name: name || '', role: role || '', lvl: lvl, kids: kids || [], note: '' };
        if (o) { for (var k in o) { n[k] = o[k]; } }
        return n;
    }
    function vagas(role, lvl, qt) { var a = []; for (var i = 0; i < qt; i++) { a.push(T('', role, lvl)); } return a; }
    var ESC_TI = [
        { lvl: 'noc', c: ['NOC (nível 0)', 'Monitora 24x7, detecta alertas, abre o chamado e executa o procedimento padrão (runbook).', 'Não existe runbook para o alerta ou o runbook não resolveu.', 'Abrir chamado em até 5 min do alerta; escalar em até 15 min.'] },
        { lvl: 'n1', c: ['Técnico N1', 'Porta de entrada: registra, classifica a prioridade e resolve o que está na base de conhecimento.', 'Sem solução em 30 min, exige competência de N2 ou prioridade P1.', 'Primeira resposta em até 15 min.'] },
        { lvl: 'n2', c: ['Técnico N2', 'Incidentes complexos, remoto avançado e campo; orienta os N1.', 'Sem solução em 2 h ou suspeita de causa raiz recorrente.', 'Assumir em até 30 min.'] },
        { lvl: 'n3', c: ['Analista N3', 'Causa raiz, mudanças planejadas e contato técnico com fabricantes.', 'Impacto em vários clientes ou decisão de risco.', 'Assumir em até 1 h; P1 imediato.'] },
        { lvl: 'supervisao', c: ['Supervisor', 'Dono da fila e do SLA; comunica o cliente em P1 e P2.', 'SLA acima de 80% ou P1 aberto há mais de 1 h.', 'Acompanha P1 desde a abertura.'] },
        { lvl: 'gestao', c: ['Coordenação', 'Gestão de crise, prioridade entre equipes e mudanças emergenciais.', 'Impacto contratual, cliente estratégico ou incidente de segurança.', 'Acionada em até 1 h de P1 sem previsão.'] }
    ];
    var TEMPLATES = [
        { key: 'funcional', name: 'Estrutura funcional', desc: 'Diretoria e departamentos clássicos (administrativo, comercial, operações, TI), cada um com coordenação e equipe.',
          make: function () {
              var dep = function (nome) { return T('', 'Gerente ' + nome, 'gerencia', [T('', 'Coordenador', 'coordenacao', vagas('Analista', 'operacional', 2))]); };
              return { levels: copyLevels(STD_LEVELS), tree: T('', 'Diretor-geral', 'diretoria', [dep('Administrativo e financeiro'), dep('Comercial'), dep('Operações'), dep('TI')]), esc: [] };
          } },
        { key: 'ti', name: 'Suporte de TI (N1, N2, N3 e NOC)', desc: 'Service desk em níveis, com squads, especialistas, NOC como coringa e matriz de escalonamento ITIL.',
          make: function () {
              var squad = function (n) { return T('', 'Técnico N2, líder do squad ' + n, 'n2', vagas('Técnico N1', 'n1', 4)); };
              return { tree: T('', 'Gerente de TI', 'diretoria', [T('', 'Coordenador técnico', 'gestao', [
                  T('', 'Supervisor dos squads', 'supervisao', [squad(1), squad(2)]),
                  T('', 'Supervisor de especialistas e NOC', 'supervisao', [
                      T('Analistas N3', 'Causa raiz e mudanças', 'n3', vagas('Analista', 'n3', 2), { group: true }),
                      T('NOC', 'Monitoramento 24x7, coringa entre squads', 'noc', vagas('Operador NOC', 'noc', 2), { group: true, dashed: true })
                  ])
              ])]), esc: ESC_TI.map(function (r) { return { lvl: r.lvl, c: r.c.slice() }; }),
                  levels: copyLevels(LEGACY_LEVELS).map(function (l) { if (l.key === 'noc') { l.label = 'NOC'; } return l; }) };
          } },
        { key: 'projetos', name: 'Escritório de projetos', desc: 'Sócios, coordenação de projetos, projetistas por disciplina e apoio administrativo (arquitetura, engenharia).',
          make: function () {
              return { levels: copyLevels(STD_LEVELS), tree: T('Sócios', 'Direção do escritório', 'conselho', [
                  T('', 'Coordenador de projetos', 'coordenacao', [
                      T('Arquitetura', 'Projetos e compatibilização', 'especialista', vagas('Projetista', 'especialista', 2).concat(vagas('Estagiário', 'operacional', 1)), { group: true }),
                      T('Engenharia', 'Estrutural e instalações', 'especialista', vagas('Projetista', 'especialista', 2), { group: true })
                  ]),
                  T('', 'Administrativo e financeiro', 'gerencia', vagas('Assistente', 'operacional', 1)),
                  T('', 'Consultoria jurídica', 'especialista', [], { kind: 'terceiro', dashed: true })
              ], { group: true }), esc: [] };
          } },
        { key: 'clinica', name: 'Clínica', desc: 'Direção, responsável técnico, corpo clínico, recepção e administrativo.',
          make: function () {
              return { levels: copyLevels(STD_LEVELS), tree: T('', 'Direção', 'diretoria', [
                  T('', 'Secretaria executiva', 'operacional', [], { kind: 'assessoria' }),
                  T('', 'Responsável técnico', 'gerencia', [T('Corpo clínico', 'Profissionais de saúde', 'especialista', vagas('Profissional', 'especialista', 3), { group: true })]),
                  T('', 'Gerente administrativo', 'gerencia', [
                      T('Recepção', 'Agenda e atendimento', 'supervisao', vagas('Recepcionista', 'operacional', 2), { group: true }),
                      T('', 'Financeiro e faturamento', 'coordenacao')
                  ])
              ]), esc: [] };
          } },
        { key: 'vazio', name: 'Em branco', desc: 'Só o topo, para montar do zero.',
          make: function () { return { levels: copyLevels(STD_LEVELS), tree: T('', 'Direção', 'diretoria'), esc: [] }; } }
    ];
    // Organograma pronto de um modelo, já normalizado, com ids n1, n2… e as
    // ligações de chefia na ordem da árvore.
    function fromTemplate(key) {
        var tp = TEMPLATES.filter(function (t) { return t.key === key; })[0];
        if (!tp) { return null; }
        var m = tp.make(), k = 0, nodes = [], edges = [];
        (function go(n, pid) {
            var c = {}, f;
            for (f in n) { if (f !== 'kids' && Object.prototype.hasOwnProperty.call(n, f)) { c[f] = n[f]; } }
            c.id = 'n' + (++k);
            nodes.push(c);
            if (pid) { edges.push({ id: 'e' + edges.length, from: pid, to: c.id, boss: true, style: 'solida', label: '' }); }
            (n.kids || []).forEach(function (x) { go(x, c.id); });
        })(m.tree, null);
        return normalize({ kind: 'organograma', levels: m.levels, nodes: nodes, edges: edges, esc: m.esc || [], elements: [] });
    }
    // Nível em uso (por alguém ou por uma linha da matriz) não pode sair.
    function levelUsed(S, key) {
        return S.nodes.some(function (n) { return n.lvl === key; }) || (S.esc || []).some(function (r) { return r.lvl === key; });
    }

    /* ---------------- leitura no documento ---------------- */
    function fontsReady() {
        if (!document.fonts || !document.fonts.load) { return Promise.resolve(); }
        return Promise.all([
            document.fonts.load(FONTS.name(false)), document.fonts.load(FONTS.name(true)),
            document.fonts.load(FONTS.role()), document.fonts.load(FONTS.tag()), document.fonts.load(FONTS.row(true))
        ]).then(function () {}, function () {});
    }

    function mount(root) {
        if (root.__cxOrgView) { return root.__cxOrgView; }
        var src = document.getElementById(root.getAttribute('data-source') || '');
        var raw;
        try { raw = JSON.parse(src ? src.textContent : 'null'); } catch (e) { raw = null; }
        var S = normalize(raw);
        S.__norm = true;
        var title = root.getAttribute('data-title') || '', code = root.getAttribute('data-code') || '';

        root.classList.add('cx-org', 'cx-orgview');
        // Barra da leitura: a mesma do motor antigo (classes cx-org-*), sem a
        // edição — tela cheia, zoom, ajustar à tela e busca. O botão de PDF
        // fica escondido: quem aciona é o "Exportar PDF" do topo da página.
        root.innerHTML = '<div class="cx-org-tools">'
            + '<button type="button" class="cx-org-btn cx-org-btn--full" data-act="full" data-el="fullBtn"><i class="ti ti-maximize"></i> Tela cheia</button>'
            + '<span class="cx-org-zoom"><button type="button" class="cx-org-btn" data-act="zout" aria-label="Diminuir zoom">−</button>'
            + '<output data-el="zlbl">100%</output>'
            + '<button type="button" class="cx-org-btn" data-act="zin" aria-label="Aumentar zoom">+</button></span>'
            + '<button type="button" class="cx-org-btn" data-act="fit">Ajustar à tela</button>'
            + '<label class="cx-org-search"><span class="cx-org-sr">Buscar pessoa</span>'
            + '<input type="search" data-el="q" placeholder="Buscar pessoa ou cargo…" autocomplete="off">'
            + '<span data-el="qcount" class="cx-org-qcount"></span></label>'
            + '<button type="button" class="codexplus-btn" data-act="pdf" hidden style="display:none"><i class="ti ti-file-type-pdf"></i> Exportar PDF</button>'
            + '</div>'
            + '<div class="cx-org-legend">' + legendHtml(S) + '</div>'
            + '<div class="cx-org-stagewrap"><div class="cx-org-stage cx-orgview-stage"></div>'
            + '<button type="button" class="cx-org-corner" data-act="full" data-el="fullCorner" title="Tela cheia" aria-label="Tela cheia"><i class="ti ti-maximize"></i></button></div>'
            + escTableHtml(S);
        var stage = root.querySelector('.cx-orgview-stage');
        function $(n) { return root.querySelector('[data-el="' + n + '"]'); }

        var z = 1, last = null, query = '';
        // Zoom pelo tamanho do SVG (vetorial: nítido em qualquer escala); a
        // área do desenho rola quando passa da largura.
        function applyZoom() {
            var el = stage.querySelector('svg');
            if (!el || !last) { return; }
            el.setAttribute('width', Math.round(last.w * z));
            el.setAttribute('height', Math.round(last.h * z));
            el.style.display = 'block';
            $('zlbl').textContent = Math.round(z * 100) + '%';
        }
        function setZ(v) { z = Math.min(2, Math.max(0.25, v)); applyZoom(); }
        function fit() {
            if (!last) { return; }
            var aw = (stage.clientWidth || 0) - 4;
            setZ(aw > 0 ? Math.min(1, aw / last.w) : 1);
        }
        // Busca: esmaece os cartões sem ninguém que bata (nome, cargo ou
        // observação, sem acento); conta as pessoas encontradas.
        function norm(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
        function applySearch() {
            var hits = 0, L = last && last.layout;
            if (!L) { return; }
            L.list.forEach(function (n) {
                var b = L.box[n.id], g = stage.querySelector('g[data-id="' + String(n.id).replace(/["\\]/g, '') + '"]');
                if (!g) { return; }
                var who = [n].concat(b.rows.map(function (r) { return r.n; }));
                var k = query ? who.filter(function (m) { return norm(m.name + ' ' + m.role + ' ' + m.note).indexOf(query) >= 0; }).length : 0;
                hits += k;
                g.style.opacity = query && !k ? '0.25' : '';
            });
            $('qcount').textContent = query ? (hits === 1 ? '1 encontrada' : hits + ' encontradas') : '';
        }

        function draw() {
            last = svg(S);
            stage.innerHTML = last.svg;
            var el = stage.querySelector('svg');
            if (el) { el.setAttribute('role', 'img'); el.setAttribute('aria-label', title || 'Organograma'); }
            applyZoom();
            applySearch();
            return last;
        }
        draw();
        fit();
        // A medida só vale com a fonte carregada: redesenha quando chegar.
        fontsReady().then(function () { ctxReset(); draw(); fit(); });

        function setFullUi(on) {
            root.classList.toggle('is-full', on);
            $('fullBtn').innerHTML = on ? '<i class="ti ti-minimize"></i> Sair da tela cheia' : '<i class="ti ti-maximize"></i> Tela cheia';
            $('fullCorner').innerHTML = on ? '<i class="ti ti-minimize"></i>' : '<i class="ti ti-maximize"></i>';
            $('fullCorner').title = on ? 'Sair da tela cheia' : 'Tela cheia';
            setTimeout(fit, 60);
        }
        function toggleFull() {
            var on = !root.classList.contains('is-full');
            if (root.requestFullscreen) {
                if (on) { root.requestFullscreen().catch(function () { setFullUi(true); }); }
                else if (document.fullscreenElement) { document.exitFullscreen(); }
                else { setFullUi(false); }
            } else { setFullUi(on); }
        }
        document.addEventListener('fullscreenchange', function () {
            if (document.fullscreenElement === root || root.classList.contains('is-full')) { setFullUi(document.fullscreenElement === root); }
        });
        $('q').addEventListener('input', function () { query = norm($('q').value.trim()); applySearch(); });

        /* PDF: A4 com orientação pelo formato do desenho (como o fluxograma),
           legenda no topo, matriz na página seguinte. */
        var MM = 96 / 25.4;
        function pdf() {
            var r = svg(S, { pad: false });
            var land = r.w > r.h * 0.9;
            var aw = (land ? 277 : 190) * MM, ah = ((land ? 190 : 277) - 24) * MM;
            var k = Math.min(aw / r.w, ah / r.h, 1.5);
            var w = Math.floor(r.w * k), h = Math.floor(r.h * k);
            var s = r.svg.replace(/^<svg([^>]*?) width="[^"]*" height="[^"]*"/, '<svg$1 width="' + w + '" height="' + h + '"');
            var cssLink = document.querySelector('link[href*="codexplus.css"]');
            var frame = document.createElement('iframe');
            frame.setAttribute('aria-hidden', 'true');
            frame.style.cssText = 'position:fixed;left:-10000px;top:0;border:0;' + (land ? 'width:1123px;height:794px' : 'width:794px;height:1123px');
            document.body.appendChild(frame);
            var d = frame.contentDocument, nome = (code ? code + ' - ' : '') + title;
            d.open();
            d.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>' + esc(nome) + '</title>'
                + (cssLink ? '<link rel="stylesheet" href="' + esc(cssLink.href) + '">' : '')
                + '<style>@page{size:A4 ' + (land ? 'landscape' : 'portrait') + ';margin:10mm}html,body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
                + '.h{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #1d2330;padding-bottom:4px;margin-bottom:6px;font:10px Arial,sans-serif;color:#1d2330}.h b{font-size:15px}'
                + '.cx-org-legend{margin:0 0 6px;font-size:11px}.d{text-align:center}.d svg{display:inline-block}'
                + '.cx-org-esc{break-before:page;margin-top:0}.cx-org-esc table{min-width:0}'
                + '</style></head><body class="cx-org"><div class="h"><b>' + esc(title) + '</b><span>' + esc(code) + '</span></div>'
                + '<div class="cx-org-legend">' + legendHtml(S) + '</div><div class="d">' + s + '</div>' + escTableHtml(S) + '</body></html>');
            d.close();
            var go = function () {
                var old = document.title;
                document.title = nome; // achado 24
                setTimeout(function () {
                    try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (_) { /* bloqueado */ }
                    document.title = old;
                    setTimeout(function () { frame.remove(); }, 1000);
                }, 80);
            };
            var link = d.querySelector('link[rel="stylesheet"]');
            var ready = function () { if (d.fonts && d.fonts.ready) { d.fonts.ready.then(go, go); } else { go(); } };
            if (link && !link.sheet) { link.addEventListener('load', ready); link.addEventListener('error', go); } else { ready(); }
        }

        root.addEventListener('click', function (e) {
            var b = e.target.closest('button[data-act]');
            if (!b || !root.contains(b)) { return; }
            var a = b.getAttribute('data-act');
            if (a === 'pdf') { pdf(); }
            else if (a === 'full') { toggleFull(); }
            else if (a === 'zin') { setZ(z + 0.1); }
            else if (a === 'zout') { setZ(z - 0.1); }
            else if (a === 'fit') { fit(); }
        });
        root.__cxOrgView = { draw: draw, pdf: pdf, fit: fit, setZoom: setZ, zoom: function () { return z; }, data: function () { return S; } };
        return root.__cxOrgView;
    }
    function ctxReset() { ctx = null; }

    /* ---------------- Q6b-1: abrir no motor de quadro (teste) ----------------
       Botão "Abrir no motor novo (teste)" na edição do documento, ao lado do
       organograma antigo. Abre com o estado atual do editor antigo (a API
       dele) e grava pelo mesmo ajax/diagram.save.php; depois de gravar, a
       página recarrega para o editor antigo não sobrescrever o que foi salvo. */
    function openBoard(box) {
        var B = window.CodexplusBoard;
        if (!B) { return; }
        var oldRoot = document.querySelector('[data-cx-org]'), api = oldRoot && oldRoot.__cxOrg, raw = null;
        try { raw = api && api.getData ? api.getData() : null; } catch (e) { raw = null; }
        if (!raw) {
            var src = document.getElementById(box.getAttribute('data-source') || '');
            try { raw = JSON.parse(src ? src.textContent : 'null'); } catch (e) { raw = null; }
        }
        var saveUrl = box.getAttribute('data-save') || '', docId = box.getAttribute('data-doc') || '';
        function post(D) {
            var f = box.closest('form'), tk = (f && f.querySelector('[name="_glpi_csrf_token"]')) || document.querySelector('[name="_glpi_csrf_token"]');
            if (!tk || !saveUrl || !docId) { return Promise.reject(new Error('sem token')); }
            var o = JSON.parse(JSON.stringify(D.org || {}));
            delete o.__norm;
            var corpo = new FormData();
            corpo.append('id', docId);
            corpo.append('_diagram', JSON.stringify(o));
            corpo.append('_glpi_csrf_token', tk.value);
            return fetch(saveUrl, { method: 'POST', body: corpo, credentials: 'same-origin' }).then(function (r) {
                return r.json().catch(function () { return {}; }).then(function (j) {
                    if (!r.ok || !j.ok) { throw new Error(j.erro || ('HTTP ' + r.status)); }
                    if (j.csrf) { document.querySelectorAll('[name="_glpi_csrf_token"]').forEach(function (i) { i.value = j.csrf; }); }
                    setTimeout(function () { window.location.reload(); }, 50);
                    return j;
                });
            });
        }
        B.open(null, null, 'organograma', { data: { mode: 'organograma', org: raw }, title: box.getAttribute('data-title') || '', save: post, self: docId });
    }

    function boot() {
        document.querySelectorAll('[data-cx-orgview]').forEach(mount);
        document.querySelectorAll('[data-cx-orgtest]').forEach(function (box) {
            if (box.__cxOrgTest) { return; }
            box.__cxOrgTest = true;
            box.addEventListener('click', function (e) { if (e.target.closest('[data-act="orgboard"]')) { openBoard(box); } });
        });
    }

    window.CodexplusOrgDraw = {
        normalize: normalize, layout: function (s) { return layout(normalize(s)); }, svg: svg,
        legendHtml: legendHtml, escHtml: escTableHtml, mount: mount, boot: boot, openBoard: openBoard, parts: parts, tree: tree, label: label,
        templates: function () { return TEMPLATES.map(function (t) { return { key: t.key, name: t.name, desc: t.desc }; }); },
        fromTemplate: fromTemplate, levelUsed: levelUsed, SWATCHES: SWATCHES,
        measure: function (s) { var S = normalize(s), L = layout(S), o = {}; L.list.forEach(function (n) { var b = L.box[n.id]; o[n.id] = { x: b.x, y: b.y, w: b.w, h: b.h }; }); return o; },
        _reset: ctxReset, C: C
    };
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
