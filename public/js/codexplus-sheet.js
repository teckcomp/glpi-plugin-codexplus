/* =========================================================================
   Codex+ — Planilha no corpo do documento (bloco PL1, Claudio 26/09/2026)
   -------------------------------------------------------------------------
   Botão "Planilha" no editor (codexplus-editor.js) e duplo clique numa
   planilha já inserida abrem esta janela. O bloco gravado no corpo é:

     <div class="cx-sheet" contenteditable="false" data-cx-sheet='{json}'>
       <table>…valores já calculados…</table>
     </div>

   O JSON (cols, rows, total) serve só para editar de novo; a leitura, o
   PDF e o Word usam a <table> (o sanitizador do GLPI tira data-*, achado 57
   — não faz falta). Fórmulas simples, sem eval:
     - numa célula: =A1*C1, =SOMA(D1:D5), =MÉDIA(B1:B3), + − * / e ( );
     - "fórmula da coluna": =A*C vale para cada linha (A = coluna A da
       mesma linha).
   Números em pt-BR ("1.890,50"). Tipos de coluna: texto, número, moeda.

   3c-1 (Claudio, 04/10/2026) — EDIÇÃO NO LUGAR. No editor, as células de
   texto, número e moeda são editáveis direto no documento (ilhas
   contenteditable=true dentro do bloco travado, TinyMCE 7.9 do GLPI
   11.0.6). Coluna calculada, Total e célula com fórmula própria ficam
   travadas (só pelos Parâmetros). A janela abre pelo botão "Parâmetros"
   do bloco; o duplo clique ficou para selecionar palavra na célula.
   Marcação de edição (contenteditable, classes cx-sheet-edit/lock, data-cx-r/c)
   e os botões (data-mce-bogus="all") existem só no editor: o PreProcess
   tira tudo antes de gravar, então o HTML salvo é o mesmo de antes.
   ========================================================================= */
(function () {
    'use strict';

    var TYPES = { text: 'Texto', num: 'Número', money: 'Moeda (R$)' };
    var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    function esc(t) {
        return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    /* Modelo padrão da proposta: Qtd primeiro (Claudio, 26/09/2026). */
    function starter() {
        return {
            v: 1,
            cols: [
                { name: 'Qtd', type: 'num', formula: '' },
                { name: 'Item', type: 'text', formula: '' },
                { name: 'Unitário', type: 'money', formula: '' },
                { name: 'Total', type: 'money', formula: '=A*C' }
            ],
            rows: [['1', '', '', ''], ['1', '', '', '']],
            total: true,
            totalLabel: 'Total'
        };
    }

    /* ---------------- números ---------------- */
    function parseNum(v) {
        if (typeof v === 'number') { return v; }
        var s = String(v == null ? '' : v).replace(/R\$\s?/i, '').trim();
        if (s === '') { return 0; }
        if (s.indexOf(',') >= 0) { s = s.replace(/\./g, '').replace(',', '.'); }
        // 3c-1: "1.460" (ponto de milhar sem vírgula, como a coluna de número
        // mostra) é mil quatrocentos e sessenta, não 1,46.
        else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) { s = s.replace(/\./g, ''); }
        var n = parseFloat(s);
        return isNaN(n) ? 0 : n;
    }
    function fmt(n, type) {
        if (type === 'text') { return String(n); }
        if (typeof n !== 'number' || !isFinite(n)) { return '—'; }
        var o = { minimumFractionDigits: type === 'money' ? 2 : 0, maximumFractionDigits: 2 };
        return (type === 'money' ? 'R$ ' : '') + n.toLocaleString('pt-BR', o);
    }

    /* ---------------- fórmulas ---------------- */
    function evaluate(data) {
        var cols = data.cols, rows = data.rows;
        var cache = {};
        function cellValue(r, c, depth) {
            var key = r + ':' + c;
            if (key in cache) { return cache[key]; }
            if (depth > 50 || r < 0 || c < 0 || r >= rows.length || c >= cols.length) { return 0; }
            cache[key] = 0; // referência circular vira 0
            var raw = String((rows[r] || [])[c] == null ? '' : rows[r][c]).trim();
            var f = raw.charAt(0) === '=' ? raw : (cols[c].formula || '');
            var val;
            if (f && f.charAt(0) === '=') {
                val = calc(f.slice(1), r, depth + 1);
            } else if (cols[c].type === 'text') {
                val = raw;
            } else {
                val = parseNum(raw);
            }
            cache[key] = val;
            return val;
        }
        function calc(expr, row, depth) {
            var toks = expr.toUpperCase().replace(/MÉDIA/g, 'MEDIA').match(/\d+(?:[.,]\d+)?|[A-Z]+\d*(?::[A-Z]\d+)?|[+\-*/()]|;|,/g) || [];
            var i = 0;
            function peek() { return toks[i]; }
            function next() { return toks[i++]; }
            function ref(t) {
                var m = /^([A-Z])(\d*)$/.exec(t);
                if (!m) { return 0; }
                var c = LETTERS.indexOf(m[1]);
                var r = m[2] === '' ? row : parseInt(m[2], 10) - 1;
                var v = cellValue(r, c, depth);
                return typeof v === 'number' ? v : parseNum(v);
            }
            function range(t) {
                var m = /^([A-Z])(\d+):([A-Z])(\d+)$/.exec(t);
                var out = [];
                if (!m) { return out; }
                var c1 = LETTERS.indexOf(m[1]), c2 = LETTERS.indexOf(m[3]);
                var r1 = parseInt(m[2], 10) - 1, r2 = parseInt(m[4], 10) - 1;
                for (var r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
                    for (var c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
                        var v = cellValue(r, c, depth);
                        out.push(typeof v === 'number' ? v : parseNum(v));
                    }
                }
                return out;
            }
            function fn(name) {
                next(); // (
                var vals = [];
                while (peek() && peek() !== ')') {
                    var t = peek();
                    if (/^[A-Z]\d+:[A-Z]\d+$/.test(t)) { next(); vals = vals.concat(range(t)); } else { vals.push(add()); }
                    if (peek() === ';' || peek() === ',') { next(); }
                }
                next(); // )
                var s = vals.reduce(function (a, b) { return a + b; }, 0);
                if (name === 'SOMA' || name === 'SUM') { return s; }
                if (name === 'MEDIA' || name === 'AVG' || name === 'AVERAGE') { return vals.length ? s / vals.length : 0; }
                if (name === 'MIN') { return vals.length ? Math.min.apply(null, vals) : 0; }
                if (name === 'MAX') { return vals.length ? Math.max.apply(null, vals) : 0; }
                return 0;
            }
            function atom() {
                var t = next();
                if (t === undefined) { return 0; }
                if (t === '(') { var v = add(); next(); return v; }
                if (t === '-') { return -atom(); }
                if (t === '+') { return atom(); }
                if (/^\d/.test(t)) { return parseNum(t); }
                if (peek() === '(' && /^[A-Z]+$/.test(t) && t.length > 1) { return fn(t); }
                return ref(t);
            }
            function mul() {
                var v = atom();
                while (peek() === '*' || peek() === '/') {
                    var op = next(), w = atom();
                    v = op === '*' ? v * w : (w === 0 ? NaN : v / w);
                }
                return v;
            }
            function add() {
                var v = mul();
                while (peek() === '+' || peek() === '-') {
                    var op = next(), w = mul();
                    v = op === '+' ? v + w : v - w;
                }
                return v;
            }
            var res = add();
            return typeof res === 'number' ? res : 0;
        }
        var out = rows.map(function (row, r) {
            return cols.map(function (col, c) { return cellValue(r, c, 0); });
        });
        var totals = cols.map(function (col, c) {
            if (col.type === 'text') { return null; }
            return out.reduce(function (a, row) { return a + (typeof row[c] === 'number' ? row[c] : 0); }, 0);
        });
        return { values: out, totals: totals };
    }

    /* ---------------- HTML gravado no documento ---------------- */
    /* Colunas somadas na linha de total: as de moeda calculadas por fórmula
       (o Total da linha); sem nenhuma, a última de moeda. Somar o preço
       unitário não faz sentido. */
    function totalCols(data) {
        var comF = [], moeda = [];
        data.cols.forEach(function (c, i) {
            if (c.type === 'money') { moeda.push(i); if (c.formula) { comF.push(i); } }
        });
        return comF.length ? comF : moeda.slice(-1);
    }

    function tableHtml(data) {
        var ev = evaluate(data);
        var somar = totalCols(data);
        var h = '<table class="cx-sheet-table"><thead><tr>';
        data.cols.forEach(function (c) {
            h += '<th' + (c.type !== 'text' ? ' class="cx-sheet-num"' : '') + '>' + esc(c.name) + '</th>';
        });
        h += '</tr></thead><tbody>';
        ev.values.forEach(function (row, r) {
            // Linha sem nada digitado sai em branco (não "0" e "R$ 0,00").
            var vazia = (data.rows[r] || []).every(function (x) { return String(x == null ? '' : x).trim() === ''; });
            // Linhas alternadas com fundo azul claro, para facilitar a leitura.
            h += '<tr' + (r % 2 === 1 ? ' class="cx-sheet-alt"' : '') + '>';
            row.forEach(function (v, c) {
                var t = data.cols[c].type;
                // &nbsp; na linha vazia: sem ele a linha encolhe até sumir.
                h += '<td' + (t !== 'text' ? ' class="cx-sheet-num"' : '') + '>' + (vazia ? '&nbsp;' : esc(fmt(v, t))) + '</td>';
            });
            h += '</tr>';
        });
        h += '</tbody>';
        if (data.total) {
            // "Total" fica colado no valor: na coluna logo antes da primeira somada.
            var labelAt = somar.length ? Math.max(0, somar[0] - 1) : 0;
            h += '<tfoot><tr class="cx-sheet-total">';
            data.cols.forEach(function (c, i) {
                var show = somar.indexOf(i) >= 0;
                var txt = show ? fmt(ev.totals[i], c.type) : (i === labelAt ? (data.totalLabel || 'Total') : '');
                h += '<td class="cx-sheet-num">' + (txt ? '<strong>' + esc(txt) + '</strong>' : '&nbsp;') + '</td>';
            });
            h += '</tr></tfoot>';
        }
        return h + '</table>';
    }
    function blockHtml(data) {
        return '<div class="cx-sheet" contenteditable="false" data-cx-sheet="' + esc(JSON.stringify(data)) + '">'
            + tableHtml(data) + '</div>';
    }

    /* ---------------- janela de edição ---------------- */
    function open(editor, node) {
        var data;
        try { data = node ? JSON.parse(node.getAttribute('data-cx-sheet') || '') : null; } catch (e) { data = null; }
        if (!data || !Array.isArray(data.cols) || !Array.isArray(data.rows)) { data = starter(); }
        var hist = [];

        var back = document.createElement('div');
        back.className = 'cx-sheet-modal';
        document.body.appendChild(back);

        function snap() { hist.push(JSON.stringify(data)); if (hist.length > 50) { hist.shift(); } }
        function close() { back.remove(); document.removeEventListener('keydown', onKey, true); }
        function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(); } }
        document.addEventListener('keydown', onKey, true);

        function render() {
            var ev = evaluate(data);
            var h = '<div class="cx-sheet-box" role="dialog" aria-label="Planilha">'
                + '<div class="cx-sheet-head"><strong>Planilha</strong>'
                + '<span class="cx-sheet-help">Números em pt-BR (1.890,50). Fórmula na célula: =A1*C1, =SOMA(D1:D5). Fórmula da coluna: =A*C vale para cada linha.</span></div>'
                + '<div class="cx-sheet-scroll"><table class="cx-sheet-grid"><thead><tr><th></th>';
            data.cols.forEach(function (c, i) {
                h += '<th><div class="cx-sheet-colhead"><span class="cx-sheet-letter">' + LETTERS[i] + '</span>'
                    + '<button type="button" class="cx-sheet-x" data-delcol="' + i + '" title="Tirar coluna">×</button></div>'
                    + '<input type="text" data-colname="' + i + '" value="' + esc(c.name) + '" aria-label="Nome da coluna ' + LETTERS[i] + '">'
                    + '<select data-coltype="' + i + '" aria-label="Tipo da coluna ' + LETTERS[i] + '">'
                    + Object.keys(TYPES).map(function (k) { return '<option value="' + k + '"' + (c.type === k ? ' selected' : '') + '>' + TYPES[k] + '</option>'; }).join('')
                    + '</select>'
                    + '<input type="text" data-colformula="' + i + '" value="' + esc(c.formula || '') + '" placeholder="fórmula (=A*C)" aria-label="Fórmula da coluna ' + LETTERS[i] + '"></th>';
            });
            h += '<th></th></tr></thead><tbody>';
            data.rows.forEach(function (row, r) {
                h += '<tr><td class="cx-sheet-rown">' + (r + 1) + '</td>';
                data.cols.forEach(function (c, i) {
                    var raw = row[i] == null ? '' : String(row[i]);
                    var calc = c.formula && raw.trim() === '';
                    h += '<td>' + (calc
                        ? '<span class="cx-sheet-calc" title="Pela fórmula da coluna">' + esc(fmt(ev.values[r][i], c.type)) + '</span>'
                        : '<input type="text" data-r="' + r + '" data-c="' + i + '" value="' + esc(raw) + '"'
                            + (c.type !== 'text' ? ' class="cx-sheet-inum"' : '') + '>'
                            + (raw.charAt(0) === '=' ? '<small class="cx-sheet-res">' + esc(fmt(ev.values[r][i], c.type)) + '</small>' : ''))
                        + '</td>';
                });
                h += '<td><button type="button" class="cx-sheet-x" data-delrow="' + r + '" title="Tirar linha">×</button></td></tr>';
            });
            h += '</tbody>';
            if (data.total) {
                var somar = totalCols(data);
                h += '<tfoot><tr><td></td>';
                data.cols.forEach(function (c, i) {
                    h += '<td class="cx-sheet-tot">' + (somar.indexOf(i) >= 0 ? esc(fmt(ev.totals[i], c.type)) : '') + '</td>';
                });
                h += '<td></td></tr></tfoot>';
            }
            h += '</table></div>'
                + '<div class="cx-sheet-foot">'
                + '<button type="button" data-act="row">+ Linha</button>'
                + '<button type="button" data-act="col">+ Coluna</button>'
                + '<button type="button" data-act="undo"' + (hist.length ? '' : ' disabled') + '>Desfazer</button>'
                + '<label><input type="checkbox" data-act="total"' + (data.total ? ' checked' : '') + '> Linha de total (soma o total calculado)</label>'
                + '<span class="cx-sheet-spacer"></span>'
                + '<button type="button" data-act="cancel">Cancelar</button>'
                + '<button type="button" data-act="ok" class="cx-sheet-ok">' + (node ? 'Salvar planilha' : 'Inserir planilha') + '</button>'
                + '</div></div>';
            back.innerHTML = h;
        }

        back.addEventListener('change', function (e) {
            var t = e.target;
            if (t.hasAttribute('data-r')) {
                snap();
                data.rows[+t.getAttribute('data-r')][+t.getAttribute('data-c')] = t.value;
            } else if (t.hasAttribute('data-colname')) {
                snap(); data.cols[+t.getAttribute('data-colname')].name = t.value;
            } else if (t.hasAttribute('data-coltype')) {
                snap(); data.cols[+t.getAttribute('data-coltype')].type = t.value;
            } else if (t.hasAttribute('data-colformula')) {
                snap();
                var f = t.value.trim();
                data.cols[+t.getAttribute('data-colformula')].formula = f && f.charAt(0) !== '=' ? '=' + f : f;
            } else if (t.getAttribute('data-act') === 'total') {
                snap(); data.total = t.checked;
            } else {
                return;
            }
            render();
        });
        back.addEventListener('keydown', function (e) {
            // Enter confirma a célula e desce (não envia o formulário do documento).
            if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                e.preventDefault();
                var r = e.target.getAttribute('data-r'), c = e.target.getAttribute('data-c');
                e.target.blur();
                if (r !== null) {
                    var n = back.querySelector('input[data-r="' + (+r + 1) + '"][data-c="' + c + '"]');
                    if (n) { n.focus(); n.select(); }
                }
            }
        });
        back.addEventListener('click', function (e) {
            var t = e.target.closest('button,[data-act]');
            if (!t || t.tagName === 'LABEL' || t.type === 'checkbox') { return; }
            var a = t.getAttribute('data-act');
            if (t.hasAttribute('data-delrow')) {
                snap(); data.rows.splice(+t.getAttribute('data-delrow'), 1); render(); return;
            }
            if (t.hasAttribute('data-delcol')) {
                if (data.cols.length <= 1) { return; }
                snap();
                var ci = +t.getAttribute('data-delcol');
                data.cols.splice(ci, 1);
                data.rows.forEach(function (row) { row.splice(ci, 1); });
                render(); return;
            }
            if (a === 'row') { snap(); data.rows.push(data.cols.map(function () { return ''; })); render(); }
            else if (a === 'col') {
                if (data.cols.length >= LETTERS.length) { return; }
                snap(); data.cols.push({ name: 'Coluna ' + LETTERS[data.cols.length], type: 'text', formula: '' });
                data.rows.forEach(function (row) { row.push(''); }); render();
            }
            else if (a === 'undo') { if (hist.length) { data = JSON.parse(hist.pop()); render(); } }
            else if (a === 'cancel') { close(); }
            else if (a === 'ok') {
                // Grava o que estiver digitado e ainda sem "change".
                var ativo = document.activeElement;
                if (ativo && back.contains(ativo) && ativo.hasAttribute && ativo.hasAttribute('data-r')) {
                    data.rows[+ativo.getAttribute('data-r')][+ativo.getAttribute('data-c')] = ativo.value;
                }
                var html = blockHtml(data);
                editor.undoManager.transact(function () {
                    if (node && node.parentNode) {
                        editor.dom.setOuterHTML(node, html);
                    } else {
                        editor.focus();
                        editor.insertContent(html + '<p><br></p>');
                    }
                });
                decorateAll(editor);
                editor.nodeChanged();
                close();
            }
        });
        render();
        var first = back.querySelector('input[data-r]');
        if (first) { first.focus(); }
    }

    /* ---------------- 3c-1: edição no lugar (só no editor) ---------------- */
    var EDIT_CSS = ''
        + '.cx-sheet{position:relative;cursor:default;}'
        + '.cx-sheet td.cx-sheet-edit{cursor:text;}'
        + '.cx-sheet td.cx-sheet-edit:hover{box-shadow:inset 0 0 0 1px #85b7eb;}'
        + '.cx-sheet td.cx-sheet-edit:focus{outline:2px solid #378add;outline-offset:-2px;box-shadow:none;}'
        + '.cx-sheet tr td.cx-sheet-lock{background-color:#f1f3f5;color:#5f6b7a;cursor:not-allowed;}'
        + '.cx-sheet-ui{font:12px/1.4 system-ui,sans-serif;user-select:none;}'
        + '.cx-sheet-ui-top{position:absolute;top:-15px;right:6px;z-index:1;}'
        + '.cx-sheet-ui-add{margin-top:6px;}'
        + '.cx-sheet-ui button{font:inherit;padding:1px 10px;border:1px solid #85b7eb;border-radius:6px;'
        + 'background:#fff;color:#185fa5;cursor:pointer;}'
        + '.cx-sheet-ui button:hover{background:#e6f1fb;}'
        // 3c-2: Resumo do investimento (bloco travado, sem edição).
        + '.cx-sum{outline:1px dashed #85b7eb;outline-offset:3px;margin:0 0 12px;cursor:default;}';
    var LOCK_TIP = 'Calculada: muda em Parâmetros';
    var MARK_CLASSES = ['cx-sheet-edit', 'cx-sheet-lock'];

    function readData(node) {
        var d;
        try { d = JSON.parse(node.getAttribute('data-cx-sheet') || ''); } catch (e) { return null; }
        return d && Array.isArray(d.cols) && Array.isArray(d.rows) ? d : null;
    }
    function rawOf(data, r, c) {
        var v = (data.rows[r] || [])[c];
        return String(v == null ? '' : v).trim();
    }
    /* Célula com fórmula própria, ou vazia numa coluna com fórmula, é
       calculada: editar no lugar apagaria a fórmula sem aviso. */
    function cellEditable(data, r, c) {
        var raw = rawOf(data, r, c);
        if (raw.charAt(0) === '=') { return false; }
        return !(data.cols[c] && data.cols[c].formula && raw === '');
    }
    function sheetOf(el) {
        while (el && el.nodeType === 1) {
            if (el.classList && el.classList.contains('cx-sheet')) { return el; }
            el = el.parentNode;
        }
        return null;
    }
    function cellOf(el) {
        while (el && el.nodeType !== 1) { el = el.parentNode; }
        while (el) {
            if (el.nodeName === 'TD' && el.classList.contains('cx-sheet-edit')) { return el; }
            if (el.classList && el.classList.contains('cx-sheet')) { return null; }
            el = el.parentNode;
        }
        return null;
    }
    function bodyRows(node) {
        var t = node.querySelector('table');
        return t && t.tBodies[0] ? Array.prototype.slice.call(t.tBodies[0].rows) : [];
    }

    /* Marca as células e põe os botões. Pode rodar de novo à vontade. */
    function decorate(editor, node) {
        var data = readData(node);
        if (!data) { return; }
        bodyRows(node).forEach(function (tr, r) {
            Array.prototype.slice.call(tr.cells).forEach(function (td, c) {
                if (c >= data.cols.length) { return; }
                td.setAttribute('data-cx-r', r);
                td.setAttribute('data-cx-c', c);
                if (cellEditable(data, r, c)) {
                    td.setAttribute('contenteditable', 'true');
                    td.classList.add('cx-sheet-edit');
                    td.classList.remove('cx-sheet-lock');
                    td.removeAttribute('title');
                } else {
                    td.removeAttribute('contenteditable');
                    td.classList.add('cx-sheet-lock');
                    td.classList.remove('cx-sheet-edit');
                    td.setAttribute('title', LOCK_TIP);
                }
            });
        });
        var doc = node.ownerDocument;
        function ui(cls, act, label, tip) {
            if (node.querySelector('.' + cls)) { return; }
            var d = doc.createElement('div');
            d.className = 'cx-sheet-ui ' + cls;
            d.setAttribute('data-mce-bogus', 'all');
            d.setAttribute('contenteditable', 'false');
            d.innerHTML = '<button type="button" data-cx-act="' + act + '" title="' + esc(tip) + '">' + esc(label) + '</button>';
            if (cls === 'cx-sheet-ui-top') { node.insertBefore(d, node.firstChild); } else { node.appendChild(d); }
        }
        ui('cx-sheet-ui-top', 'params', '⚙ Parâmetros', 'Colunas, tipos, fórmulas, total e excluir linhas');
        ui('cx-sheet-ui-add', 'row', '+ Linha', 'Acrescentar uma linha vazia no fim');
    }
    function decorateAll(editor) {
        var body = editor && editor.getBody && editor.getBody();
        if (!body) { return; }
        Array.prototype.slice.call(body.querySelectorAll('div.cx-sheet')).forEach(function (n) { decorate(editor, n); });
        refreshSummaries(body); // 3c-2: planilha nova, apagada ou com Parâmetros mudados
    }

    /* Valores recalculados nas células (menos a que está em edição). */
    function refresh(node, data, skip) {
        var ev = evaluate(data);
        bodyRows(node).forEach(function (tr, r) {
            var vazia = (data.rows[r] || []).every(function (x) { return String(x == null ? '' : x).trim() === ''; });
            Array.prototype.slice.call(tr.cells).forEach(function (td, c) {
                if (td === skip || c >= data.cols.length || !ev.values[r]) { return; }
                var txt = vazia ? '\u00a0' : fmt(ev.values[r][c], data.cols[c].type);
                if (td.textContent !== txt) { td.textContent = txt; }
            });
        });
        var t = node.querySelector('table');
        var foot = t && t.tFoot && t.tFoot.rows[0];
        if (foot && data.total) {
            var somar = totalCols(data);
            Array.prototype.slice.call(foot.cells).forEach(function (td, i) {
                if (somar.indexOf(i) < 0 || !data.cols[i]) { return; }
                var txt = fmt(ev.totals[i], data.cols[i].type);
                if (td.textContent !== txt) { td.innerHTML = '<strong>' + esc(txt) + '</strong>'; }
            });
        }
    }

    /* Texto da célula vira o valor bruto da planilha. Devolve true se mudou. */
    function commit(td, keepText) {
        var node = sheetOf(td);
        var data = node && readData(node);
        if (!data) { return false; }
        var r = +td.getAttribute('data-cx-r'), c = +td.getAttribute('data-cx-c');
        if (!data.rows[r] || !data.cols[c]) { return false; }
        var txt = (td.textContent || '').replace(/[\u00a0\u200b\ufeff]/g, ' ').replace(/\s+/g, ' ').trim();
        var raw = rawOf(data, r, c);
        var mostrado = raw === '' ? '' : fmt(evaluate(data).values[r][c], data.cols[c].type);
        var mudou = txt !== raw && txt !== mostrado;
        if (mudou) {
            data.rows[r][c] = txt;
            node.setAttribute('data-cx-sheet', JSON.stringify(data));
        }
        refresh(node, data, keepText ? td : null);
        refreshSummaries(node.ownerDocument.body); // 3c-2
        return mudou;
    }

    function editableCells(node) {
        return Array.prototype.slice.call(node.querySelectorAll('td.cx-sheet-edit'));
    }
    function goTo(editor, td) {
        if (!td) { return; }
        editor.__cxCell = td;
        td.focus();
        editor.selection.select(td, true);
    }
    function leave(editor) {
        var td = editor.__cxCell;
        editor.__cxCell = null;
        if (td && td.isConnected && commit(td, false)) {
            editor.setDirty(true);
            editor.undoManager.add();
        }
    }
    function caretAt(editor, td, edge) {
        var rng = editor.selection.getRng();
        if (!rng || !rng.collapsed) { return false; }
        var probe = td.ownerDocument.createRange();
        probe.selectNodeContents(td);
        if (edge === 'start') { probe.setEnd(rng.startContainer, rng.startOffset); } else { probe.setStart(rng.endContainer, rng.endOffset); }
        return probe.toString().replace(/[\u00a0\u200b\ufeff]/g, '') === '';
    }
    function addRow(editor, node) {
        var data = readData(node);
        if (!data) { return; }
        leave(editor);
        data = readData(node);
        data.rows.push(data.cols.map(function () { return ''; }));
        node.setAttribute('data-cx-sheet', JSON.stringify(data));
        var old = node.querySelector('table');
        var box = node.ownerDocument.createElement('div');
        box.innerHTML = tableHtml(data);
        node.replaceChild(box.firstChild, old);
        decorate(editor, node);
        var rows = bodyRows(node);
        var last = rows[rows.length - 1];
        goTo(editor, last && last.querySelector('td.cx-sheet-edit'));
        editor.setDirty(true);
        editor.undoManager.add();
    }

    /* ---------------- 3c-2: Resumo do investimento ----------------
       Claudio, 04/10/2026 (mockup aprovado): bloco automático logo depois da
       última planilha, uma linha por planilha (nome = título ou parágrafo
       logo acima dela, sem os dois-pontos; sem título, "Planilha N") e o
       Total geral. Ninguém digita nele: refaz a cada tecla numa planilha,
       ao fechar Parâmetros, ao carregar e ao gravar (PreProcess, na cópia
       que vai para o banco). O gravado é uma tabela comum (.cx-sheet-table),
       então leitura, PDF e Word não mudam. */
    var SUM_CLASS = 'cx-sum';
    function sheetValue(data) {
        var ev = evaluate(data);
        var somar = totalCols(data);
        var col = somar.length ? somar[somar.length - 1] : -1;
        if (col < 0) { return { v: 0, type: 'money' }; }
        return { v: ev.totals[col] || 0, type: data.cols[col].type };
    }
    function sheetName(node, i) {
        var el = node.previousElementSibling;
        while (el && el.textContent.replace(/[\s\u00a0\u200b\ufeff]/g, '') === '' && !el.querySelector('table,img')) {
            el = el.previousElementSibling;
        }
        if (el && !el.classList.contains('cx-sheet') && !el.classList.contains(SUM_CLASS) && !el.querySelector('table')) {
            var t = lastLine(el).replace(/[\s:;.\-–—]+$/, '');
            if (t) { return t.length > 90 ? t.slice(0, 87) + '…' : t; }
        }
        return 'Planilha ' + (i + 1);
    }
    /* Só a ÚLTIMA linha do bloco acima da planilha (Claudio, 04/10/2026):
       documento colado de fora junta "AVALIAÇÃO; texto… <br> MATERIAIS…:"
       num parágrafo só, separado por <br>. Cada <br> e cada bloco filho é
       uma quebra de linha. */
    function lastLine(el) {
        var c = el.cloneNode(true);
        Array.prototype.slice.call(c.querySelectorAll('br')).forEach(function (br) {
            br.parentNode.replaceChild(c.ownerDocument.createTextNode('\n'), br);
        });
        Array.prototype.slice.call(c.querySelectorAll('p,div,li,h1,h2,h3,h4,h5,h6')).forEach(function (b) {
            b.appendChild(c.ownerDocument.createTextNode('\n'));
        });
        var linhas = (c.textContent || '').split('\n').map(function (l) {
            return l.replace(/[\u00a0\u200b\ufeff]/g, ' ').replace(/\s+/g, ' ').trim();
        }).filter(Boolean);
        return linhas.length ? linhas[linhas.length - 1] : '';
    }
    function summaryTable(root) {
        var linhas = [], total = 0, moeda = false;
        Array.prototype.slice.call(root.querySelectorAll('div.cx-sheet')).forEach(function (n) {
            var d = readData(n);
            if (!d) { return; }
            var sv = sheetValue(d);
            if (sv.type === 'money') { moeda = true; }
            total += sv.v;
            linhas.push({ name: sheetName(n, linhas.length), v: sv.v, type: sv.type });
        });
        var h = '<table class="cx-sheet-table"><thead><tr><th>RESUMO</th><th class="cx-sheet-num">Valor</th></tr></thead><tbody>';
        linhas.forEach(function (l, i) {
            h += '<tr' + (i % 2 === 1 ? ' class="cx-sheet-alt"' : '') + '><td>' + esc(l.name) + '</td><td class="cx-sheet-num">' + esc(fmt(l.v, l.type)) + '</td></tr>';
        });
        if (!linhas.length) {
            h += '<tr><td>Nenhuma planilha no documento.</td><td class="cx-sheet-num">&nbsp;</td></tr>';
        }
        h += '</tbody><tfoot><tr class="cx-sheet-total"><td class="cx-sheet-num"><strong>Total geral</strong></td>'
            + '<td class="cx-sheet-num"><strong>' + esc(fmt(total, moeda || !linhas.length ? 'money' : 'num')) + '</strong></td></tr></tfoot></table>';
        return h;
    }
    function refreshSummaries(root) {
        if (!root || !root.querySelectorAll) { return; }
        var sums = root.querySelectorAll('div.' + SUM_CLASS);
        if (!sums.length) { return; }
        var html = summaryTable(root);
        Array.prototype.slice.call(sums).forEach(function (s) {
            if (s.innerHTML !== html) { s.innerHTML = html; }
        });
    }
    /** Botão "Resumo": põe o bloco logo depois da última planilha (ou refaz o que já existe). */
    function insertSummary(editor) {
        var body = editor.getBody();
        var sheets = Array.prototype.slice.call(body.querySelectorAll('div.cx-sheet')).filter(function (n) { return !!readData(n); });
        var existente = body.querySelector('div.' + SUM_CLASS);
        if (existente) {
            refreshSummaries(body);
            existente.scrollIntoView({ block: 'center' });
            editor.notificationManager.open({ text: 'O documento já tem o Resumo do investimento: ele se atualiza sozinho.', type: 'info', timeout: 4000 });
            return;
        }
        if (!sheets.length) {
            editor.notificationManager.open({ text: 'Insira ao menos uma planilha antes do Resumo do investimento.', type: 'warning', timeout: 5000 });
            return;
        }
        var ultima = sheets[sheets.length - 1];
        var el = editor.dom.create('div', { 'class': SUM_CLASS, contenteditable: 'false' }, '');
        editor.dom.insertAfter(el, ultima);
        refreshSummaries(body);
        // Sem selecionar o bloco: a seleção falsa do TinyMCE num bloco
        // travado engolia o clique seguinte numa célula da planilha.
        el.scrollIntoView({ block: 'nearest' });
        editor.setDirty(true);
        editor.undoManager.add();
        editor.nodeChanged();
    }

    function attach(editor) {
        if (editor.__cxSheetInline) { return; }
        editor.__cxSheetInline = true;
        editor.on('init', function () {
            editor.dom.addStyle(EDIT_CSS);
            decorateAll(editor);
        });
        editor.on('SetContent', function () { decorateAll(editor); });

        // Cursor saiu de uma célula: grava e mostra formatado.
        editor.on('NodeChange', function () {
            var td = cellOf(editor.selection.getNode());
            if (td !== editor.__cxCell) {
                leave(editor);
                editor.__cxCell = td;
            }
        });
        // Cada tecla: valor no JSON e total/calculadas refeitos na hora.
        editor.on('input', function () {
            var td = cellOf(editor.selection.getNode());
            if (td) { editor.__cxCell = td; commit(td, true); return; }
            // 3c-2: o título acima de uma planilha é o nome dela no Resumo.
            refreshSummaries(editor.getBody());
        });
        // 3c-2: planilha apagada (Delete/Backspace no bloco, recortar, desfazer).
        editor.on('Undo Redo cut', function () { refreshSummaries(editor.getBody()); });
        editor.on('keyup', function (e) {
            if (e.key === 'Delete' || e.key === 'Backspace') { refreshSummaries(editor.getBody()); }
        });
        editor.on('keydown', function (e) {
            var td = cellOf(editor.selection.getNode());
            if (!td) { return; }
            var node = sheetOf(td);
            var stop = function () { e.preventDefault(); e.stopImmediatePropagation(); };
            if (e.key === 'Tab') {
                stop();
                var cells = editableCells(node);
                var i = cells.indexOf(td) + (e.shiftKey ? -1 : 1);
                if (cells[i]) { leave(editor); goTo(editor, cells[i]); }
            } else if (e.key === 'Enter') {
                stop();
                var r = +td.getAttribute('data-cx-r') + 1, c = td.getAttribute('data-cx-c');
                var below = node.querySelector('td.cx-sheet-edit[data-cx-r="' + r + '"][data-cx-c="' + c + '"]');
                leave(editor);
                if (below) { goTo(editor, below); } else { goTo(editor, td); }
            } else if ((e.key === 'Backspace' && caretAt(editor, td, 'start')) || (e.key === 'Delete' && caretAt(editor, td, 'end'))) {
                // Não apaga para fora da célula (levaria a planilha inteira).
                stop();
            }
        }, true);
        // Colar numa célula: só o texto, numa linha.
        editor.on('PastePreProcess', function (e) {
            if (!cellOf(editor.selection.getNode())) { return; }
            var tmp = document.createElement('div');
            // Fim de parágrafo, linha ou <br> vira espaço (senão "X" e "Y" grudam).
            tmp.innerHTML = String(e.content || '').replace(/<\/(p|div|li|tr|td|th|h[1-6])>|<br\s*\/?>/gi, ' $&');
            e.content = esc((tmp.textContent || '').replace(/\s+/g, ' ').trim());
        });
        editor.on('mousedown', function (e) {
            if (e.target && e.target.closest && e.target.closest('[data-cx-act]')) { e.preventDefault(); }
        });
        editor.on('click', function (e) {
            // 3c-2: com o bloco selecionado (clique antes numa parte travada,
            // como a coluna Total), o TinyMCE engolia o clique seguinte numa
            // célula: o cursor ia para fora da planilha. Põe o cursor onde
            // clicou.
            var alvo = e.target && e.target.closest ? e.target.closest('td.cx-sheet-edit') : null;
            if (alvo && cellOf(editor.selection.getNode()) !== alvo) {
                var d = alvo.ownerDocument;
                var rng = d.caretRangeFromPoint ? d.caretRangeFromPoint(e.clientX, e.clientY) : null;
                alvo.focus();
                if (rng && alvo.contains(rng.startContainer)) {
                    editor.selection.setRng(rng);
                } else {
                    editor.selection.select(alvo, true);
                    editor.selection.collapse(false);
                }
                editor.__cxCell = alvo;
                return;
            }
            var b = e.target && e.target.closest ? e.target.closest('[data-cx-act]') : null;
            var node = b && sheetOf(b);
            if (!node) { return; }
            e.preventDefault();
            if (b.getAttribute('data-cx-act') === 'row') { addRow(editor, node); return; }
            leave(editor);
            open(editor, node);
        });
        // Antes de gravar: a célula em edição entra no JSON.
        editor.on('BeforeGetContent', function () {
            var td = editor.__cxCell;
            if (td && td.isConnected) { commit(td, true); }
        });
        // O gravado é a tabela refeita pelo JSON: sem marcas de edição nem
        // botões, e sempre formatada (mesmo com uma célula ainda em edição).
        editor.on('PreProcess', function (e) {
            if (!e.node || !e.node.querySelectorAll) { return; }
            Array.prototype.slice.call(e.node.querySelectorAll('div.cx-sheet')).forEach(function (n) {
                var d = readData(n);
                if (d) {
                    n.innerHTML = tableHtml(d);
                    return;
                }
                Array.prototype.slice.call(n.querySelectorAll('.cx-sheet-ui')).forEach(function (u) { u.parentNode.removeChild(u); });
                Array.prototype.slice.call(n.querySelectorAll('td')).forEach(function (td) {
                    ['contenteditable', 'data-cx-r', 'data-cx-c', 'title'].forEach(function (a) { td.removeAttribute(a); });
                    MARK_CLASSES.forEach(function (k) { td.classList.remove(k); });
                    if (!td.className) { td.removeAttribute('class'); }
                });
            });
            // 3c-2: o Resumo gravado é refeito da cópia (nomes e totais atuais).
            refreshSummaries(e.node);
        });
    }

    window.CodexplusSheet = { open: open, render: tableHtml, block: blockHtml, evaluate: evaluate, starter: starter,
        attach: attach, decorateAll: decorateAll, parseNum: parseNum,
        insertSummary: insertSummary, summaryTable: summaryTable };
})();
