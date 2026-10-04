/* =========================================================================
   Codex+ — cronograma e matriz RACI (bloco D1, Claudio, 26/09/2026)
   -------------------------------------------------------------------------
   Subtipos de diagrama (DIA) que são GRADES, não grafo. Mesmo contrato do
   motor do organograma (codexplus-org.js):
     - [data-cx-grid] com data-source (JSON), data-editable, data-input
       (hidden _diagram que vai no Salvar), data-doc e data-save (salvamento
       automático em ajax/diagram.save.php, 2,5 s depois da última mudança);
     - o servidor valida tudo de novo (Diagram::validateGrid).
   Cronograma: periods[] nas colunas; rows[] {name, owner, cells[]} com
   célula '' (vazio), 'b' (período) ou 'm' (marco).
   RACI: roles[] nas colunas; rows[] {name, cells[]} com '', R, A, C ou I.
   PDF: iframe fora da tela, A4 paisagem, estilos embutidos (achado 24 para
   o nome sugerido).
   Q7b-1 (Claudio, 03/10/2026): cronograma COM DATAS, gravado ao lado do
   formato antigo: { kind: 'cronograma', mode: 'datas', scale: 'S'|'M',
   rows: [{ name, owner, start, end }] } (AAAA-MM-DD). Colunas por semana ou
   por mês com a data no cabeçalho; barra pelas datas; edição na tabela
   (início, fim, dias corridos) e arrastando a barra (mover; alças nas
   pontas). Sem `mode`, o cronograma antigo abre exatamente como antes; o
   botão "Usar datas" converte (Desfazer volta).
   ========================================================================= */
(function () {
    'use strict';

    var RACI = ['', 'R', 'A', 'C', 'I'];
    var SCHED = ['', 'b', 'm'];
    var RACI_LABEL = { R: 'Executa', A: 'Responde (aprova)', C: 'É consultado', I: 'É informado' };
    var AUTO_MS = 2500;
    // D1-2: unidade dos períodos do cronograma (sempre relativos: S1, M1…).
    var UNITS = { S: 'Semanas', M: 'Meses', T: 'Trimestres', A: 'Anos' };
    // Larguras (px): tela e PDF. A tela rola na horizontal; o PDF escolhe a
    // orientação e divide as colunas em folhas (printGrid).
    var W = {
        name: 260, owner: 130, sched: 48, raci: 96,
        pName: 200, pOwner: 100, pSched: 34, pRaci: 72,
        portrait: 718, landscape: 1047 // área útil do A4 com 10 mm de margem
    };

    /* ---------- Q7b-1: datas (dia = número de dias desde 01/01/1970, UTC) ---------- */
    var DIA = 86400000;
    var MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    var ESCALAS = { S: 'Semanas', M: 'Meses' };
    // Larguras (px) do cronograma com datas: tela e PDF; px por dia na escala.
    var GD = {
        name: 260, owner: 130, date: 96, days: 60, pxS: 8, pxM: 3,
        pName: 180, pOwner: 92, pDate: 60, pDays: 32, pxSp: 5, pxMp: 2
    };
    function p2(n) { return (n < 10 ? '0' : '') + n; }
    function dn(iso) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
        if (!m || +m[1] < 1990 || +m[1] > 2100) { return null; }
        var t = Date.UTC(+m[1], +m[2] - 1, +m[3]), d = new Date(t);
        if (d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) { return null; }
        return Math.round(t / DIA);
    }
    function ymd(n) { var d = new Date(n * DIA); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }; }
    function iso(n) { var d = ymd(n); return d.y + '-' + p2(d.m + 1) + '-' + p2(d.d); }
    function br(n) { if (n == null) { return ''; } var d = ymd(n); return p2(d.d) + '/' + p2(d.m + 1) + '/' + d.y; }
    function brCurto(n) { var d = ymd(n); return p2(d.d) + '/' + p2(d.m + 1); }
    /** dd/mm/aaaa (também d/m/aa, com . ou -) ou AAAA-MM-DD; null se não existir. */
    function parseBr(t) {
        t = String(t == null ? '' : t).trim();
        var m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/.exec(t);
        if (m) {
            var y = +m[3];
            if (y < 100) { y += 2000; }
            return dn(y + '-' + p2(+m[2]) + '-' + p2(+m[1]));
        }
        return dn(t);
    }
    function hoje() { var d = new Date(); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DIA); }
    function diaSemana(n) { return (new Date(n * DIA).getUTCDay() + 6) % 7; } // 0 = segunda
    function inicioMes(y, m) { return Math.round(Date.UTC(y, m, 1) / DIA); }
    function dias(n) { return n + (n === 1 ? ' dia' : ' dias'); }

    function esc(t) {
        return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function mount(root) {
        if (root.__cxGrid) { return root.__cxGrid; }
        var src = document.getElementById(root.getAttribute('data-source') || '');
        var S;
        try { S = JSON.parse(src ? src.textContent : '{}'); } catch (e) { S = {}; }
        var raci = S.kind === 'raci';
        var colKey = raci ? 'roles' : 'periods';
        // Q7b-1: com datas, nada de periods/unit no JSON (o servidor também tira).
        var dated = !raci && S.mode === 'datas';
        if (dated) {
            normDated();
        } else {
            if (!Array.isArray(S[colKey])) { S[colKey] = []; }
            if (!Array.isArray(S.rows)) { S.rows = []; }
            if (!raci && !UNITS[S.unit]) { S.unit = 'S'; }
        }
        var editable = root.getAttribute('data-editable') === '1';
        var input = document.getElementById(root.getAttribute('data-input') || '');
        var saveUrl = root.getAttribute('data-save') || '';
        var docId = root.getAttribute('data-doc') || '';
        var title = root.getAttribute('data-title') || '';
        var code = root.getAttribute('data-code') || '';
        var hist = [], autoTimer = null, salvando = false, denovo = false;

        function ser() { return JSON.stringify(S); }
        function normDated() {
            if (!ESCALAS[S.scale]) { S.scale = 'S'; }
            if (!Array.isArray(S.rows)) { S.rows = []; }
            S.rows = S.rows.filter(function (r) { return r && typeof r === 'object'; }).map(function (r) {
                var a = dn(r.start), b = dn(r.end);
                if (a == null || b == null) { a = b = (a == null ? b : a); }
                if (a != null && b < a) { var t = a; a = b; b = t; }
                return { name: String(r.name || ''), owner: String(r.owner || ''), start: a == null ? '' : iso(a), end: b == null ? '' : iso(b) };
            });
        }
        function snapshot() { hist.push(ser()); if (hist.length > 50) { hist.shift(); } }
        function cols() { return S[colKey]; }

        function changed() {
            if (input) { input.value = ser(); }
            render();
            agenda();
        }

        /* ---------- salvamento automático (mesmo do organograma) ---------- */
        function estado(t, cls) {
            var el = root.querySelector('.cx-grid-savestate');
            if (el) { el.textContent = t; el.className = 'cx-grid-savestate' + (cls ? ' is-' + cls : ''); }
        }
        function tokenEl() {
            var f = root.closest('form');
            return f ? f.querySelector('[name="_glpi_csrf_token"]') : null;
        }
        function agenda() {
            if (!editable || !saveUrl || !docId) { return; }
            if (autoTimer) { clearTimeout(autoTimer); }
            estado('alterações não salvas', 'pendente');
            autoTimer = setTimeout(salva, AUTO_MS);
        }
        function salva() {
            autoTimer = null;
            if (salvando) { denovo = true; return; }
            var tk = tokenEl();
            if (!tk) { return; }
            salvando = true;
            estado('salvando…', 'salvando');
            var corpo = new FormData();
            corpo.append('id', docId);
            corpo.append('_diagram', ser());
            corpo.append('_glpi_csrf_token', tk.value);
            fetch(saveUrl, { method: 'POST', body: corpo, credentials: 'same-origin' })
                .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { throw new Error(j.erro || r.status); } return j; }); })
                .then(function (j) {
                    salvando = false;
                    // Token consumido a cada POST (achado 43): o novo vai para todos.
                    if (j.csrf) { document.querySelectorAll('[name="_glpi_csrf_token"]').forEach(function (i) { i.value = j.csrf; }); }
                    estado('salvo às ' + (j.hora || ''), 'ok');
                    if (denovo) { denovo = false; agenda(); }
                })
                .catch(function () {
                    salvando = false;
                    estado('não foi possível salvar sozinho: use o Salvar', 'erro');
                });
        }

        /* ---------- edição de texto no lugar ---------- */
        function editText(el, atual, grava) {
            var inp = document.createElement('input');
            inp.type = 'text';
            inp.className = 'cx-grid-input';
            inp.value = atual;
            el.textContent = '';
            el.appendChild(inp);
            inp.focus();
            inp.select();
            var feito = false;
            function fim(ok) {
                if (feito) { return; }
                feito = true;
                if (ok && inp.value !== atual) {
                    snapshot();
                    var msg = grava(inp.value.trim());
                    // Q7b-1: data inválida volta ao que era, com o motivo na barra.
                    if (typeof msg === 'string') { hist.pop(); render(); avisa(msg); return; }
                    changed();
                } else { render(); }
            }
            inp.addEventListener('keydown', function (e) {
                // O editor vive dentro do formulário do documento: Enter não envia.
                if (e.key === 'Enter') { e.preventDefault(); fim(true); }
                if (e.key === 'Escape') { e.preventDefault(); fim(false); }
            });
            inp.addEventListener('blur', function () { fim(true); });
        }

        /* ---------- desenho ---------- */
        function cellHtml(v, r, c) {
            if (raci) {
                return '<td class="cx-grid-cell cx-raci-' + (v || 'x') + '" data-r="' + r + '" data-c="' + c + '">' + esc(v) + '</td>';
            }
            return '<td class="cx-grid-cell cx-sched-' + (v || 'x') + '" data-r="' + r + '" data-c="' + c + '"' +
                (v === 'm' ? ' title="Marco"' : '') + '>' + (v === 'm' ? '<i class="ti ti-flag"></i>' : '') + '</td>';
        }
        function aviso(row) {
            if (!raci) { return ''; }
            var n = row.cells.filter(function (v) { return v === 'A'; }).length;
            if (n === 1) { return ''; }
            return ' <i class="ti ti-alert-triangle cx-grid-warn" title="' +
                (n ? 'Mais de um A: só um papel deve responder pela atividade' : 'Sem A: falta quem responde pela atividade') + '"></i>';
        }
        function tableHtml(forPrint, from, to) {
            var ed = editable && !forPrint;
            from = from || 0;
            to = to == null ? cols().length : to;
            var idx = [];
            for (var k = from; k < to; k++) { idx.push(k); }
            var wn = forPrint ? W.pName : W.name, wo = forPrint ? W.pOwner : W.owner;
            var wc = raci ? (forPrint ? W.pRaci : W.raci) : (forPrint ? W.pSched : W.sched);
            var h = '<table class="cx-grid-table" style="width:' + (wn + (raci ? 0 : wo) + wc * idx.length) + 'px"><colgroup>' +
                '<col style="width:' + wn + 'px">' + (raci ? '' : '<col style="width:' + wo + 'px">') +
                idx.map(function () { return '<col style="width:' + wc + 'px">'; }).join('') + '</colgroup>' +
                '<thead><tr><th class="cx-grid-name">' + (raci ? 'Atividade' : 'Tarefa') + '</th>' +
                (raci ? '' : '<th class="cx-grid-owner">Responsável</th>');
            idx.forEach(function (i) {
                var c = cols()[i];
                h += '<th class="cx-grid-col" title="' + esc(c) + '"><span' + (ed ? ' data-edit-col="' + i + '"' : '') + '>' + esc(c || '—') + '</span>' +
                    (ed ? '<button type="button" class="cx-grid-del" data-del-col="' + i + '" title="Tirar coluna" aria-label="Tirar coluna"><i class="ti ti-x"></i></button>' : '') + '</th>';
            });
            h += '</tr></thead><tbody>';
            S.rows.forEach(function (row, r) {
                h += '<tr><td class="cx-grid-name"><span' + (ed ? ' data-edit-name="' + r + '"' : '') + '>' +
                    (row.name ? esc(row.name) : (ed ? '<em>clique para nomear</em>' : '')) + '</span>' + aviso(row) +
                    (ed ? '<button type="button" class="cx-grid-del" data-del-row="' + r + '" title="Tirar linha" aria-label="Tirar linha"><i class="ti ti-x"></i></button>' : '') + '</td>';
                if (!raci) {
                    h += '<td class="cx-grid-owner"><span' + (ed ? ' data-edit-owner="' + r + '"' : '') + '>' + esc(row.owner || (ed ? '—' : '')) + '</span></td>';
                }
                idx.forEach(function (c) { h += cellHtml(row.cells[c] || '', r, c); });
                h += '</tr>';
            });
            h += '</tbody></table>';
            return h;
        }
        function legendHtml() {
            if (raci) {
                return Object.keys(RACI_LABEL).map(function (k) {
                    return '<span><b class="cx-raci-' + k + '">' + k + '</b>' + RACI_LABEL[k] + '</span>';
                }).join('');
            }
            return '<span><b class="cx-sched-b"></b>Período</span><span><b class="cx-sched-m"><i class="ti ti-flag"></i></b>Marco (entrega)</span>';
        }
        function render() {
            dated = !raci && S.mode === 'datas';
            dica();
            if (dated) { renderDated(); return; }
            var bar = '<div class="cx-grid-bar"' + (editable ? '' : ' hidden') + '>';
            if (editable) {
                bar += '<button type="button" class="codexplus-btn" data-act="row"><i class="ti ti-row-insert-bottom"></i> ' + (raci ? 'Atividade' : 'Tarefa') + '</button>' +
                    '<button type="button" class="codexplus-btn" data-act="col"><i class="ti ti-column-insert-right"></i> ' + (raci ? 'Papel' : 'Período') + '</button>' +
                    (raci ? '' : '<select class="cx-grid-unit form-select" aria-label="Unidade dos períodos">' +
                        Object.keys(UNITS).map(function (u) { return '<option value="' + u + '"' + (S.unit === u ? ' selected' : '') + '>' + UNITS[u] + '</option>'; }).join('') +
                        '</select>') +
                    '<button type="button" class="codexplus-btn" data-act="undo"' + (hist.length ? '' : ' disabled') + '><i class="ti ti-arrow-back-up"></i> Desfazer</button>' +
                    (raci ? '' : '<button type="button" class="codexplus-btn" data-act="datas" title="Passar para datas reais (Desfazer volta)"><i class="ti ti-calendar-event"></i> Usar datas</button>') +
                    '<span class="cx-grid-savestate"></span>';
            }
            // Na leitura o botão fica escondido: quem o aciona é o Exportar PDF
            // do topo da página (D1-4), no mesmo lugar dos outros documentos.
            bar += '<span class="cx-grid-spacer"></span><button type="button" class="codexplus-btn" data-act="pdf"' +
                (editable ? '' : ' hidden') + '><i class="ti ti-file-type-pdf"></i> Exportar PDF</button></div>';
            root.innerHTML = '<div class="cx-grid' + (raci ? ' cx-grid--raci' : ' cx-grid--sched') + '">' + bar +
                '<div class="cx-grid-wrap">' + tableHtml(false) + '</div><div class="cx-grid-legend">' + legendHtml() + '</div></div>';
        }

        /* =================== Q7b-1: cronograma com datas =================== */
        function avisa(t) {
            var el = root.querySelector('.cx-gd-msg');
            if (!el) { return; }
            el.textContent = t;
            el.hidden = false;
            clearTimeout(el.__t);
            el.__t = setTimeout(function () { el.hidden = true; }, 6000);
        }
        /** Texto de ajuda abaixo da grade (o template deixa o lugar marcado). */
        function dica() {
            var h = root.parentNode && root.parentNode.querySelector('[data-cx-grid-hint]');
            if (!h || raci) { return; }
            h.textContent = dated
                ? 'Arraste a barra para mover a tarefa e puxe as pontas para mudar o início ou o fim. Numa tarefa sem datas, clique ou arraste na linha do tempo para criar a barra. Clique em tarefa, responsável, início, fim ou dias para editar (datas em dd/mm/aaaa; mudar o início mantém a duração).'
                : 'Clique na célula para trocar entre vazio, período (barra) e marco. Clique no nome de uma tarefa, responsável ou período para editar. "Usar datas" passa o cronograma para datas reais.';
        }
        /** Colunas da linha do tempo: semanas (segunda a domingo) ou meses, com folga no fim. */
        function gdUnits() {
            var lo = null, hi = null;
            S.rows.forEach(function (r) {
                var a = dn(r.start), b = dn(r.end);
                if (a != null) { lo = lo == null ? a : Math.min(lo, a); }
                if (b != null) { hi = hi == null ? b : Math.max(hi, b); }
            });
            if (lo == null) { lo = hoje(); }
            if (hi == null || hi < lo) { hi = lo; }
            var u = [], i, n, s0;
            if (S.scale === 'M') {
                var a0 = ymd(lo), b0 = ymd(hi);
                n = Math.max(4, (b0.y - a0.y) * 12 + (b0.m - a0.m) + 2);
                for (i = 0; i < n; i++) {
                    s0 = inicioMes(a0.y, a0.m + i);
                    var md = ymd(s0);
                    u.push({ s: s0, n: inicioMes(a0.y, a0.m + i + 1) - s0, label: MES[md.m] + '/' + String(md.y).slice(2), tip: MES[md.m] + ' de ' + md.y });
                }
            } else {
                s0 = lo - diaSemana(lo);
                n = Math.max(8, Math.floor((hi - s0) / 7) + 2);
                for (i = 0; i < n; i++) {
                    u.push({ s: s0 + 7 * i, n: 7, label: brCurto(s0 + 7 * i), tip: 'Semana de ' + br(s0 + 7 * i) + ' a ' + br(s0 + 7 * i + 6) });
                }
            }
            return u;
        }
        /** Faixa de cima do cabeçalho: meses (escala semanas) ou anos (escala meses). */
        function gdBands(t0, t1, px) {
            var out = [], s0 = t0;
            while (s0 < t1) {
                var c = ymd(s0);
                var nx = S.scale === 'M' ? inicioMes(c.y + 1, 0) : inicioMes(c.y, c.m + 1);
                var e = Math.min(nx, t1);
                out.push('<span class="cx-gd-band" style="left:' + ((s0 - t0) * px) + 'px;width:' + ((e - s0) * px) + 'px">' +
                    (S.scale === 'M' ? c.y : MES[c.m].charAt(0).toUpperCase() + MES[c.m].slice(1) + ' ' + c.y) + '</span>');
                s0 = e;
            }
            return out.join('');
        }
        function gdPx(forPrint) {
            return forPrint ? (S.scale === 'M' ? GD.pxMp : GD.pxSp) : (S.scale === 'M' ? GD.pxM : GD.pxS);
        }
        function gdFixed(forPrint) {
            return forPrint ? GD.pName + GD.pOwner + 2 * GD.pDate + GD.pDays : GD.name + GD.owner + 2 * GD.date + GD.days;
        }
        function gdTable(forPrint, uFrom, uTo) {
            var units = gdUnits();
            uFrom = uFrom || 0;
            uTo = uTo == null ? units.length : uTo;
            var ed = editable && !forPrint;
            var px = gdPx(forPrint);
            var t0 = units[uFrom].s, t1 = units[uTo - 1].s + units[uTo - 1].n, tw = (t1 - t0) * px;
            var wn = forPrint ? GD.pName : GD.name, wo = forPrint ? GD.pOwner : GD.owner;
            var wd = forPrint ? GD.pDate : GD.date, wy = forPrint ? GD.pDays : GD.days;
            var seps = '', heads = '';
            for (var k = uFrom; k < uTo; k++) {
                var l = (units[k].s - t0) * px;
                if (k > uFrom) { seps += '<i class="cx-gd-sep" style="left:' + l + 'px"></i>'; }
                heads += '<span class="cx-gd-unit" title="' + esc(units[k].tip) + '" style="left:' + l + 'px;width:' + (units[k].n * px) + 'px">' + esc(units[k].label) + '</span>';
            }
            var h = '<table class="cx-grid-table cx-gd-table" data-t0="' + t0 + '" data-px="' + px + '" style="width:' + (wn + wo + 2 * wd + wy + tw) + 'px"><colgroup>' +
                '<col style="width:' + wn + 'px"><col style="width:' + wo + 'px"><col style="width:' + wd + 'px"><col style="width:' + wd + 'px">' +
                '<col style="width:' + wy + 'px"><col style="width:' + tw + 'px"></colgroup>' +
                '<thead><tr><th class="cx-grid-name">Tarefa</th><th class="cx-grid-owner">Responsável</th><th class="cx-gd-date">Início</th>' +
                '<th class="cx-gd-date">Fim</th><th class="cx-gd-days" title="Dias corridos, do início ao fim">Dias</th>' +
                '<th class="cx-gd-head"><div class="cx-gd-scale" style="width:' + tw + 'px">' + gdBands(t0, t1, px) + heads + seps + '</div></th></tr></thead><tbody>';
            S.rows.forEach(function (row, r) {
                var a = dn(row.start), b = dn(row.end);
                var tem = a != null && b != null;
                h += '<tr><td class="cx-grid-name"><span' + (ed ? ' data-edit-name="' + r + '"' : '') + '>' +
                    (row.name ? esc(row.name) : (ed ? '<em>clique para nomear</em>' : '')) + '</span>' +
                    (ed ? '<button type="button" class="cx-grid-del" data-del-row="' + r + '" title="Tirar tarefa" aria-label="Tirar tarefa"><i class="ti ti-x"></i></button>' : '') + '</td>' +
                    '<td class="cx-grid-owner"><span' + (ed ? ' data-edit-owner="' + r + '"' : '') + '>' + esc(row.owner || (ed ? '—' : '')) + '</span></td>' +
                    '<td class="cx-gd-date"><span' + (ed ? ' data-edit-start="' + r + '"' : '') + '>' + (tem ? br(a) : (ed ? '—' : '')) + '</span></td>' +
                    '<td class="cx-gd-date"><span' + (ed ? ' data-edit-end="' + r + '"' : '') + '>' + (tem ? br(b) : (ed ? '—' : '')) + '</span></td>' +
                    '<td class="cx-gd-days"><span' + (ed ? ' data-edit-days="' + r + '"' : '') + '>' + (tem ? (b - a + 1) : (ed ? '—' : '')) + '</span></td>' +
                    '<td class="cx-gd-track' + (tem ? '' : ' is-vazia') + '" data-r="' + r + '"><div class="cx-gd-lane" style="width:' + tw + 'px">' + seps;
                if (tem) {
                    var s0 = Math.max(a, t0), e0 = Math.min(b + 1, t1);
                    if (e0 > s0) {
                        h += '<div class="cx-gd-barra' + (a < t0 ? ' is-corta-i' : '') + (b + 1 > t1 ? ' is-corta-f' : '') + '" data-r="' + r + '"' +
                            ' title="' + esc((row.name ? row.name + ': ' : '') + br(a) + ' a ' + br(b) + ' (' + dias(b - a + 1) + ')') + '"' +
                            ' style="left:' + ((s0 - t0) * px) + 'px;width:' + ((e0 - s0) * px) + 'px">' +
                            (ed ? '<span class="cx-gd-alca is-i" data-h="i" title="Mudar o início"></span><span class="cx-gd-alca is-f" data-h="f" title="Mudar o fim"></span>' : '') +
                            '</div>';
                    }
                }
                h += '</div></td></tr>';
            });
            h += '</tbody></table>';
            return h;
        }
        function gdResumo() {
            var lo = null, hi = null, n = 0;
            S.rows.forEach(function (r) {
                var a = dn(r.start), b = dn(r.end);
                if (a == null || b == null) { return; }
                n++;
                lo = lo == null ? a : Math.min(lo, a);
                hi = hi == null ? b : Math.max(hi, b);
            });
            if (!n) { return 'Nenhuma tarefa com datas ainda.'; }
            return n + (n === 1 ? ' tarefa' : ' tarefas') + ' de ' + br(lo) + ' a ' + br(hi) + ' (' + dias(hi - lo + 1) + ')';
        }
        function gdLegend() {
            return '<span><b class="cx-sched-b"></b>Tarefa, do início ao fim (dias corridos)</span><span class="cx-gd-resumo">' + esc(gdResumo()) + '</span>';
        }
        function renderDated() {
            var bar = '<div class="cx-grid-bar"' + (editable ? '' : ' hidden') + '>';
            if (editable) {
                bar += '<button type="button" class="codexplus-btn" data-act="row"><i class="ti ti-row-insert-bottom"></i> Tarefa</button>' +
                    '<select class="cx-gd-escala form-select" aria-label="Colunas da linha do tempo">' +
                    Object.keys(ESCALAS).map(function (u) { return '<option value="' + u + '"' + (S.scale === u ? ' selected' : '') + '>' + ESCALAS[u] + '</option>'; }).join('') +
                    '</select>' +
                    '<button type="button" class="codexplus-btn" data-act="undo"' + (hist.length ? '' : ' disabled') + '><i class="ti ti-arrow-back-up"></i> Desfazer</button>' +
                    '<span class="cx-grid-savestate"></span><span class="cx-gd-msg" role="status" hidden></span>';
            }
            bar += '<span class="cx-grid-spacer"></span><button type="button" class="codexplus-btn" data-act="pdf"' +
                (editable ? '' : ' hidden') + '><i class="ti ti-file-type-pdf"></i> Exportar PDF</button></div>';
            var wrapOld = root.querySelector('.cx-grid-wrap');
            var sx = wrapOld ? wrapOld.scrollLeft : 0;
            root.innerHTML = '<div class="cx-grid cx-grid--sched cx-grid--datas">' + bar +
                '<div class="cx-grid-wrap">' + gdTable(false) + '</div><div class="cx-grid-legend">' + gdLegend() + '</div></div>';
            // Redesenhar não pode jogar a linha do tempo de volta para o começo.
            if (sx) { root.querySelector('.cx-grid-wrap').scrollLeft = sx; }
        }
        function novaTarefa() {
            var ult = null;
            S.rows.forEach(function (r) { var b = dn(r.end); if (b != null) { ult = ult == null ? b : Math.max(ult, b); } });
            var a = ult == null ? hoje() : ult + 1;
            return { name: '', owner: '', start: iso(a), end: iso(a + 6) };
        }
        /** Edição da data na tabela. Devolve texto (motivo) quando recusa. */
        function gravaData(r, campo, v) {
            var row = S.rows[r], a = dn(row.start), b = dn(row.end);
            if (v === '') {
                if (campo === 'dias') { return 'Informe quantos dias a tarefa dura.'; }
                row.start = row.end = '';
                return;
            }
            if (campo === 'dias') {
                var n = parseInt(v, 10);
                if (!/^\d+$/.test(v) || n < 1 || n > 3660) { return 'Dias: um número inteiro de 1 em diante.'; }
                if (a == null) { a = hoje(); row.start = iso(a); }
                row.end = iso(a + n - 1);
                return;
            }
            var d = parseBr(v);
            if (d == null) { return 'Data inválida: use dd/mm/aaaa.'; }
            if (campo === 'start') {
                // Mudar o início leva a tarefa junto (a duração fica).
                var dur = (a != null && b != null) ? b - a : 0;
                row.start = iso(d);
                row.end = iso(d + dur);
                return;
            }
            if (a == null) { a = d; row.start = iso(d); }
            if (d < a) { return 'O fim não pode ser antes do início (' + br(a) + ').'; }
            row.end = iso(d);
        }
        /** Cronograma antigo -> datas: cada tarefa vira barra do 1º ao último período marcado. */
        function converte() {
            var seg = hoje() - diaSemana(hoje());
            var txt = window.prompt('Usar datas reais. Data de início da primeira coluna (' + (S.periods[0] || '') + '), em dd/mm/aaaa.\n' +
                'Cada tarefa vira uma barra do primeiro ao último período marcado. Desfazer volta ao formato atual.', br(seg));
            if (txt == null) { return; }
            var ini = parseBr(txt);
            if (ini == null) { window.alert('Data inválida: use dd/mm/aaaa.'); return; }
            var u = S.unit, i0 = ymd(ini);
            var meses = u === 'M' ? 1 : (u === 'T' ? 3 : 12);
            function inicio(k) {
                return u === 'S' ? ini + 7 * k : Math.round(Date.UTC(i0.y, i0.m + meses * k, i0.d) / DIA);
            }
            snapshot();
            S = {
                kind: 'cronograma', mode: 'datas', scale: u === 'S' ? 'S' : 'M',
                rows: S.rows.map(function (row) {
                    var i = -1, j = -1;
                    (row.cells || []).forEach(function (v, c) { if (v) { if (i < 0) { i = c; } j = c; } });
                    return {
                        name: row.name || '', owner: row.owner || '',
                        start: i < 0 ? '' : iso(inicio(i)), end: i < 0 ? '' : iso(inicio(j + 1) - 1)
                    };
                })
            };
            changed();
        }
        /** Arrastar: mover a barra, puxar as alças, ou desenhar a barra numa tarefa sem datas. */
        root.addEventListener('pointerdown', function (e) {
            if (!dated || !editable || e.button !== 0) { return; }
            var track = e.target.closest('.cx-gd-track');
            if (!track || !root.contains(track)) { return; }
            var tbl = track.closest('.cx-gd-table');
            var t0 = +tbl.getAttribute('data-t0'), px = +tbl.getAttribute('data-px');
            var r = +track.getAttribute('data-r'), row = S.rows[r];
            if (!row) { return; }
            var lane = track.querySelector('.cx-gd-lane');
            var bar = e.target.closest('.cx-gd-barra');
            var a = dn(row.start), b = dn(row.end), modo;
            if (bar) {
                var al = e.target.closest('[data-h]');
                modo = al ? al.getAttribute('data-h') : 'mover';
            } else if (a == null) {
                modo = 'novo';
            } else {
                return;
            }
            e.preventDefault();
            var rect = lane.getBoundingClientRect();
            var x0 = e.clientX;
            var diaX = function (cx) { return t0 + Math.floor((cx - rect.left) / px); };
            var d0 = diaX(x0), ns = a, ne = b, antes = ser();
            if (modo === 'novo') { ns = ne = d0; }
            if (!bar) {
                bar = document.createElement('div');
                bar.className = 'cx-gd-barra';
                lane.appendChild(bar);
            }
            bar.classList.add('is-arrastando');
            bar.classList.remove('is-corta-i', 'is-corta-f');
            var tip = document.createElement('div');
            tip.className = 'cx-gd-tip';
            lane.appendChild(tip);
            var tr = track.parentNode;
            function pinta() {
                bar.style.left = ((ns - t0) * px) + 'px';
                bar.style.width = ((ne - ns + 1) * px) + 'px';
                tip.style.left = ((ns - t0) * px) + 'px';
                tip.textContent = br(ns) + ' a ' + br(ne) + ' · ' + dias(ne - ns + 1);
                // A tabela acompanha o arrasto.
                var c;
                if ((c = tr.querySelector('[data-edit-start]'))) { c.textContent = br(ns); }
                if ((c = tr.querySelector('[data-edit-end]'))) { c.textContent = br(ne); }
                if ((c = tr.querySelector('[data-edit-days]'))) { c.textContent = ne - ns + 1; }
            }
            pinta();
            function move(ev) {
                var d = Math.round((ev.clientX - x0) / px);
                if (modo === 'mover') { ns = a + d; ne = b + d; }
                else if (modo === 'i') { ns = Math.min(a + d, b); ne = b; }
                else if (modo === 'f') { ne = Math.max(b + d, a); ns = a; }
                else { var dx = diaX(ev.clientX); ns = Math.min(d0, dx); ne = Math.max(d0, dx); }
                pinta();
            }
            function up() {
                document.removeEventListener('pointermove', move);
                document.removeEventListener('pointerup', up);
                document.removeEventListener('pointercancel', up);
                if (modo === 'novo' || ns !== a || ne !== b) {
                    hist.push(antes);
                    if (hist.length > 50) { hist.shift(); }
                    row.start = iso(ns);
                    row.end = iso(ne);
                    changed();
                } else {
                    render();
                }
            }
            document.addEventListener('pointermove', move);
            document.addEventListener('pointerup', up);
            document.addEventListener('pointercancel', up);
        });
        root.addEventListener('change', function (e) {
            if (!dated || !editable || !e.target.classList.contains('cx-gd-escala')) { return; }
            if (!ESCALAS[e.target.value] || e.target.value === S.scale) { return; }
            snapshot();
            S.scale = e.target.value;
            changed();
        });

        /* ---------- unidade (cronograma) ---------- */
        root.addEventListener('change', function (e) {
            if (dated || !e.target.classList.contains('cx-grid-unit') || !editable) { return; }
            var novo = e.target.value, velho = S.unit;
            if (!UNITS[novo] || novo === velho) { return; }
            snapshot();
            // Renomeia só o que ainda tem o nome padrão (S3 na 3ª coluna…);
            // o que foi renomeado à mão fica.
            S.periods = S.periods.map(function (p, i) { return p === velho + (i + 1) ? novo + (i + 1) : p; });
            S.unit = novo;
            changed();
        });

        /* ---------- ações ---------- */
        root.addEventListener('click', function (e) {
            var t = e.target;
            var act = t.closest('[data-act]');
            if (act) {
                e.preventDefault();
                var a = act.getAttribute('data-act');
                if (a === 'pdf') { printGrid(); return; }
                if (!editable) { return; }
                if (a === 'undo') { if (hist.length) { S = JSON.parse(hist.pop()); changed(); } return; }
                if (a === 'datas') { if (!raci && !dated) { converte(); } return; }
                snapshot();
                if (dated) {
                    if (a === 'row') { S.rows.push(novaTarefa()); }
                    changed();
                    return;
                }
                if (a === 'row') {
                    var novo = { name: '', cells: cols().map(function () { return ''; }) };
                    if (!raci) { novo.owner = ''; }
                    S.rows.push(novo);
                }
                if (a === 'col') {
                    cols().push(raci ? 'Papel ' + (cols().length + 1) : S.unit + (cols().length + 1));
                    S.rows.forEach(function (row) { row.cells.push(''); });
                }
                changed();
                return;
            }
            if (!editable) { return; }
            var del = t.closest('[data-del-row],[data-del-col]');
            if (del) {
                e.preventDefault();
                snapshot();
                if (del.hasAttribute('data-del-row')) {
                    S.rows.splice(+del.getAttribute('data-del-row'), 1);
                } else {
                    var ci = +del.getAttribute('data-del-col');
                    if (cols().length <= 1) { hist.pop(); return; }
                    cols().splice(ci, 1);
                    S.rows.forEach(function (row) { row.cells.splice(ci, 1); });
                }
                changed();
                return;
            }
            var dt = dated && t.closest('[data-edit-start],[data-edit-end],[data-edit-days]');
            if (dt) {
                var campo = dt.hasAttribute('data-edit-start') ? 'start' : (dt.hasAttribute('data-edit-end') ? 'end' : 'dias');
                var rd = +dt.getAttribute('data-edit-' + (campo === 'dias' ? 'days' : campo));
                var rw = S.rows[rd], va = dn(rw.start), vb = dn(rw.end);
                var atualD = campo === 'start' ? br(va) : (campo === 'end' ? br(vb) : (va != null && vb != null ? String(vb - va + 1) : ''));
                editText(dt, atualD, function (v) { return gravaData(rd, campo, v); });
                var inpD = dt.querySelector('input');
                if (inpD && campo !== 'dias') { inpD.placeholder = 'dd/mm/aaaa'; }
                return;
            }
            var cell = !dated && t.closest('.cx-grid-cell');
            if (cell) {
                snapshot();
                var r = +cell.getAttribute('data-r'), c = +cell.getAttribute('data-c');
                var seq = raci ? RACI : SCHED;
                var atual = S.rows[r].cells[c] || '';
                S.rows[r].cells[c] = seq[(seq.indexOf(atual) + 1) % seq.length];
                changed();
                return;
            }
            var n = t.closest('[data-edit-name]');
            if (n) { var ri = +n.getAttribute('data-edit-name'); editText(n, S.rows[ri].name || '', function (v) { S.rows[ri].name = v; }); return; }
            var o = t.closest('[data-edit-owner]');
            if (o) { var ro = +o.getAttribute('data-edit-owner'); editText(o, S.rows[ro].owner || '', function (v) { S.rows[ro].owner = v; }); return; }
            var h = t.closest('[data-edit-col]');
            if (h) { var hc = +h.getAttribute('data-edit-col'); editText(h, cols()[hc] || '', function (v) { cols()[hc] = v; }); }
        });

        /* ---------- PDF ---------- */
        /**
         * Orientação automática (Claudio, 26/09/2026): cabe em retrato, sai
         * retrato (mais linhas por folha); senão paisagem; se nem assim cabe,
         * as colunas vão em blocos, cada bloco em folha nova, repetindo a
         * coluna da tarefa/atividade e o responsável.
         */
        function printPlan() {
            var fixo = W.pName + (raci ? 0 : W.pOwner);
            var wc = raci ? W.pRaci : W.pSched;
            var n = cols().length;
            if (fixo + n * wc <= W.portrait) { return { orient: 'portrait', per: n || 1 }; }
            return { orient: 'landscape', per: Math.max(1, Math.floor((W.landscape - fixo) / wc)) };
        }
        /**
         * Q7b-1: mesma regra no cronograma com datas — cabe em retrato, sai
         * retrato; senão paisagem, e a linha do tempo vai em blocos de colunas
         * inteiras (semanas ou meses), cada bloco em folha nova.
         */
        function gdPrintPlan() {
            var units = gdUnits(), px = gdPx(true), fixo = gdFixed(true);
            var tot = units.reduce(function (t, u) { return t + u.n * px; }, 0);
            if (fixo + tot <= W.portrait) { return { orient: 'portrait', blocos: [[0, units.length]] }; }
            var cabe = W.landscape - fixo, blocos = [], ini = 0, larg = 0;
            units.forEach(function (u, k) {
                if (k > ini && larg + u.n * px > cabe) { blocos.push([ini, k]); ini = k; larg = 0; }
                larg += u.n * px;
            });
            blocos.push([ini, units.length]);
            return { orient: 'landscape', blocos: blocos };
        }
        function printGrid() {
            var plan, n, blocos = [], units = null;
            if (dated) {
                plan = gdPrintPlan();
                blocos = plan.blocos;
                units = gdUnits();
            } else {
                plan = printPlan();
                n = cols().length;
                for (var i = 0; i < Math.max(n, 1); i += plan.per) { blocos.push([i, Math.min(n, i + plan.per)]); }
            }
            var frame = document.createElement('iframe');
            frame.setAttribute('aria-hidden', 'true');
            var pw = plan.orient === 'portrait' ? 'width:794px;height:1123px' : 'width:1123px;height:794px';
            frame.style.cssText = 'position:fixed;left:-10000px;top:0;border:0;' + pw;
            document.body.appendChild(frame);
            var d = frame.contentDocument;
            var nome = (code ? code + ' - ' : '') + title;
            var corpo = blocos.map(function (bl, k) {
                var parte;
                if (dated) {
                    var ub = units[bl[1] - 1];
                    parte = blocos.length > 1 ? ' · ' + br(units[bl[0]].s) + ' a ' + br(ub.s + ub.n - 1) + ' (folha ' + (k + 1) + ' de ' + blocos.length + ')' : '';
                } else {
                    parte = blocos.length > 1 ? ' · colunas ' + (bl[0] + 1) + '–' + bl[1] + ' de ' + n : '';
                }
                return '<section' + (k < blocos.length - 1 ? ' style="page-break-after:always"' : '') + '>' +
                    '<div class="h"><b>' + esc(title) + '</b><span>' + esc(code + parte) + '</span></div>' +
                    (dated ? gdTable(true, bl[0], bl[1]) + '<div class="l">' + gdLegend() + '</div>'
                        : tableHtml(true, bl[0], bl[1]) + '<div class="l">' + legendHtml() + '</div>') + '</section>';
            }).join('');
            d.open();
            d.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>' + esc(nome) + '</title><style>' +
                '@page{size:A4 ' + plan.orient + ';margin:10mm}html,body{margin:0;background:#fff;font:10px Arial,sans-serif;color:#1d2330;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
                '.h{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #1d2330;padding-bottom:4px;margin-bottom:8px}.h b{font-size:15px}' +
                'table{border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}tr{page-break-inside:avoid}' +
                'th,td{border:1px solid #c9ced8;height:20px;text-align:center;padding:0 3px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}' +
                'th{background:#f1f3f6;font-weight:bold}td.cx-grid-name,th.cx-grid-name{text-align:left}' +
                '.cx-sched-b{background:#9fe1cb}.cx-sched-m{background:#1d9e75;color:#fff}.cx-raci-R{background:#cecbf6;color:#3c3489}.cx-raci-A{background:#f5c4b3;color:#712b13}' +
                '.cx-raci-C{background:#9fe1cb;color:#085041}.cx-raci-I{background:#f1efe8;color:#444441}td.cx-grid-cell{font-weight:bold}.cx-grid-warn{display:none}' +
                '.ti-flag::before{content:"\u2691"}.ti{font-style:normal}' +
                // Q7b-1: linha do tempo do cronograma com datas.
                'th.cx-gd-head,td.cx-gd-track{padding:0;text-align:left}th.cx-gd-head{height:30px}' +
                '.cx-gd-scale{position:relative;height:30px}.cx-gd-band,.cx-gd-unit{position:absolute;height:15px;line-height:15px;box-sizing:border-box;padding-left:2px;overflow:hidden;white-space:nowrap;text-align:left}' +
                '.cx-gd-band{top:0;border-left:1px solid #c9ced8;border-bottom:1px solid #c9ced8}.cx-gd-unit{top:15px;font-weight:normal;font-size:8px}' +
                '.cx-gd-lane{position:relative;height:20px}.cx-gd-sep{position:absolute;top:0;bottom:0;border-left:1px solid #e3e6eb}.cx-gd-scale .cx-gd-sep{top:15px}' +
                '.cx-gd-barra{position:absolute;top:4px;height:12px;background:#9fe1cb;border:1px solid #1d9e75;border-radius:3px;box-sizing:border-box}' +
                '.cx-gd-barra.is-corta-i{border-left-style:dashed;border-radius:0 3px 3px 0}.cx-gd-barra.is-corta-f{border-right-style:dashed;border-radius:3px 0 0 3px}' +
                '.cx-gd-resumo{margin-left:auto}' +
                '.l{margin-top:6px;display:flex;gap:14px}.l span{display:inline-flex;align-items:center}.l b{display:inline-block;min-width:16px;height:12px;line-height:12px;margin-right:4px;text-align:center;border-radius:2px}' +
                '</style></head><body>' + corpo + '</body></html>');
            d.close();
            var old = document.title;
            document.title = nome; // achado 24: o nome sugerido vem da página principal
            setTimeout(function () {
                try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (_) { /* bloqueado */ }
                document.title = old;
                setTimeout(function () { frame.remove(); }, 1000);
            }, 80);
        }

        if (input) { input.value = ser(); }
        render();
        root.__cxGrid = { ser: ser, plan: printPlan, gdPlan: gdPrintPlan, gdUnits: gdUnits };
        return root.__cxGrid;
    }

    function boot() { document.querySelectorAll('[data-cx-grid]').forEach(mount); }
    window.CodexplusGrid = { mount: mount };
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
