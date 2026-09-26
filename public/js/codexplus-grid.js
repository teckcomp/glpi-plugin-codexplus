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
        if (!Array.isArray(S[colKey])) { S[colKey] = []; }
        if (!Array.isArray(S.rows)) { S.rows = []; }
        if (!raci && !UNITS[S.unit]) { S.unit = 'S'; }
        var editable = root.getAttribute('data-editable') === '1';
        var input = document.getElementById(root.getAttribute('data-input') || '');
        var saveUrl = root.getAttribute('data-save') || '';
        var docId = root.getAttribute('data-doc') || '';
        var title = root.getAttribute('data-title') || '';
        var code = root.getAttribute('data-code') || '';
        var hist = [], autoTimer = null, salvando = false, denovo = false;

        function ser() { return JSON.stringify(S); }
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
                if (ok && inp.value !== atual) { snapshot(); grava(inp.value.trim()); changed(); } else { render(); }
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
            var bar = '<div class="cx-grid-bar"' + (editable ? '' : ' hidden') + '>';
            if (editable) {
                bar += '<button type="button" class="codexplus-btn" data-act="row"><i class="ti ti-row-insert-bottom"></i> ' + (raci ? 'Atividade' : 'Tarefa') + '</button>' +
                    '<button type="button" class="codexplus-btn" data-act="col"><i class="ti ti-column-insert-right"></i> ' + (raci ? 'Papel' : 'Período') + '</button>' +
                    (raci ? '' : '<select class="cx-grid-unit form-select" aria-label="Unidade dos períodos">' +
                        Object.keys(UNITS).map(function (u) { return '<option value="' + u + '"' + (S.unit === u ? ' selected' : '') + '>' + UNITS[u] + '</option>'; }).join('') +
                        '</select>') +
                    '<button type="button" class="codexplus-btn" data-act="undo"' + (hist.length ? '' : ' disabled') + '><i class="ti ti-arrow-back-up"></i> Desfazer</button>' +
                    '<span class="cx-grid-savestate"></span>';
            }
            // Na leitura o botão fica escondido: quem o aciona é o Exportar PDF
            // do topo da página (D1-4), no mesmo lugar dos outros documentos.
            bar += '<span class="cx-grid-spacer"></span><button type="button" class="codexplus-btn" data-act="pdf"' +
                (editable ? '' : ' hidden') + '><i class="ti ti-file-type-pdf"></i> Exportar PDF</button></div>';
            root.innerHTML = '<div class="cx-grid' + (raci ? ' cx-grid--raci' : ' cx-grid--sched') + '">' + bar +
                '<div class="cx-grid-wrap">' + tableHtml(false) + '</div><div class="cx-grid-legend">' + legendHtml() + '</div></div>';
        }

        /* ---------- unidade (cronograma) ---------- */
        root.addEventListener('change', function (e) {
            if (!e.target.classList.contains('cx-grid-unit') || !editable) { return; }
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
                snapshot();
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
            var cell = t.closest('.cx-grid-cell');
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
        function printGrid() {
            var plan = printPlan();
            var n = cols().length;
            var blocos = [];
            for (var i = 0; i < Math.max(n, 1); i += plan.per) { blocos.push([i, Math.min(n, i + plan.per)]); }
            var frame = document.createElement('iframe');
            frame.setAttribute('aria-hidden', 'true');
            var pw = plan.orient === 'portrait' ? 'width:794px;height:1123px' : 'width:1123px;height:794px';
            frame.style.cssText = 'position:fixed;left:-10000px;top:0;border:0;' + pw;
            document.body.appendChild(frame);
            var d = frame.contentDocument;
            var nome = (code ? code + ' - ' : '') + title;
            var corpo = blocos.map(function (bl, k) {
                var parte = blocos.length > 1 ? ' · colunas ' + (bl[0] + 1) + '–' + bl[1] + ' de ' + n : '';
                return '<section' + (k < blocos.length - 1 ? ' style="page-break-after:always"' : '') + '>' +
                    '<div class="h"><b>' + esc(title) + '</b><span>' + esc(code + parte) + '</span></div>' +
                    tableHtml(true, bl[0], bl[1]) + '<div class="l">' + legendHtml() + '</div></section>';
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
        root.__cxGrid = { ser: ser, plan: printPlan };
        return root.__cxGrid;
    }

    function boot() { document.querySelectorAll('[data-cx-grid]').forEach(mount); }
    window.CodexplusGrid = { mount: mount };
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
